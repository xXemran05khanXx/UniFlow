const express = require('express');
const mongoose = require('mongoose');
const TimetableGenerator = require('../services/TimetableGenerator');
const Timetable = require('../models/Timetable');
const Course = require('../models/Course');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const Room = require('../models/Room');
const Department = require('../models/Department');
const { auth } = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();
router.use(auth);

const { computeFreeSlots } = require('../services/Freeslot');

const GEMINI_MODEL = 'gemini-1.5-flash-latest';
const LLM_TIMEOUT = 8000; // 8 seconds

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

// ── HELPERS ───────────────────────────────────────────────────────────────
const toMin = t => {
  const [h, m] = (t || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const overlaps = (s1, e1, s2, e2) =>
  toMin(s1) < toMin(e2) && toMin(s2) < toMin(e1);

// ── DETERMINISTIC VALIDATION ENGINE ───────────────────────────────────────
function runValidationEngine(schedule) {
  const conflicts = [];
  const teacherLoad = {};

  // Teacher load + simple clash detection
  schedule.forEach((e, i) => {
    const tid = `${e.teacher}_${e.dayOfWeek}`;
    const rid = `${e.room}_${e.dayOfWeek}`;

    teacherLoad[e.teacherName] = (teacherLoad[e.teacherName] || 0) + 1;

    for (let j = i + 1; j < schedule.length; j++) {
      const other = schedule[j];

      // Teacher clash
      if (
        e.teacher === other.teacher &&
        e.dayOfWeek === other.dayOfWeek &&
        overlaps(e.startTime, e.endTime, other.startTime, other.endTime)
      ) {
        conflicts.push({
          type: 'error',
          kind: 'teacher',
          message: `Teacher clash: ${e.teacherName} has overlapping sessions`,
        });
      }

      // Room clash
      if (
        e.room === other.room &&
        e.dayOfWeek === other.dayOfWeek &&
        overlaps(e.startTime, e.endTime, other.startTime, other.endTime)
      ) {
        conflicts.push({
          type: 'error',
          kind: 'room',
          message: `Room clash: ${e.roomNumber} double booked`,
        });
      }
    }
  });

  // Score calculation
  const errors = conflicts.filter(c => c.type === 'error').length;
  const qualityScore = Math.max(0, 100 - errors * 15);

  return { conflicts, qualityScore };
}
function getDayName(dayNumber) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber] || 'Monday';
}

function sessionToSchemaEntry(session) {
  const entryType = (
    session.courseType === 'Lab' ||
    session.courseType === 'Practical' ||
    session.type === 'lab'
  ) ? 'Lab' : 'Theory';

  return {
    Course:    session.course  || session.courseId,
    teacher:   session.teacher || session.teacherId,
    room:      session.room    || session.roomId,
    type:      entryType,
    dayOfWeek: session.dayOfWeek,
    startTime: session.startTime,
    endTime:   session.endTime,
    semester:  session.semester,
    division:  session.division || 'A',
    batch:     session.batch    || null,
    // ── Display fields (stored for fast reads, avoids extra populates) ──────
    courseCode:  session.courseCode  || null,
    courseName:  session.courseName  || null,
    teacherName: session.teacherName || null,
    roomNumber:  session.roomNumber  || null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/timetable/generate
// ─────────────────────────────────────────────────────────────────────────────
router.post('/generate', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const {
      algorithm       = 'genetic',
      semester        = null,
      semesters       = null,
      divisions       = ['A'],
      academicYear    = new Date().getFullYear(),
      departmentId    = null,
      autoSave        = true,
      name            = null,
      respectExisting = true,
    } = req.body;

    // Validate semesters
    const semList = semesters || (semester ? [semester] : null);
    if (semList) {
      for (const s of semList) {
        if (s < 1 || s > 8) {
          return res.status(400).json({ success: false, message: `Invalid semester: ${s}. Must be 1–8.` });
        }
      }
    }

    // Validate divisions
    const divList = Array.isArray(divisions) && divisions.length ? divisions : ['A'];
    const validDivs = ['A','B','C','D','E'];
    for (const d of divList) {
      if (!validDivs.includes(d)) {
        return res.status(400).json({ success: false, message: `Invalid division: "${d}". Must be one of ${validDivs.join(', ')}.` });
      }
    }

  
    let resolvedDeptId = null;

    if (departmentId) {
      if (mongoose.Types.ObjectId.isValid(departmentId)) {
        resolvedDeptId = departmentId;
      } else {
        // Try name or code lookup
        try {
          const dept = await Department.findOne({
            $or: [
              { name: { $regex: new RegExp(`^${departmentId.trim()}$`, 'i') } },
              { code: { $regex: new RegExp(`^${departmentId.trim()}$`, 'i') } },
            ],
          }).lean();

          if (dept) {
            resolvedDeptId = dept._id.toString();
            console.log(`✅ Dept resolved: "${departmentId}" → ${resolvedDeptId}`);
          } else {
            console.warn(`⚠️  Department "${departmentId}" not found — generating without dept filter`);
          }
        } catch (deptErr) {
          console.warn(`⚠️  Dept lookup error: ${deptErr.message} — continuing without dept filter`);
        }
      }
    }

    console.log(`\n📋 Generate request: Sems [${semList?.join(',') || 'all'}] | Divs [${divList.join(',')}] | Dept: ${resolvedDeptId || 'any'} | Algo: ${algorithm}`);

    // ── 1. Generate ──────────────────────────────────────────────────────────
    const generator = new TimetableGenerator();
    const result    = await generator.generateTimetable({
      algorithm,
      semesters:      semList,
      divisions:      divList,
      academicYear,
      departmentId:   resolvedDeptId,   // always ObjectId string or null
      respectExisting,
    });

    if (!result.success || !result.results?.length) {
      return res.status(422).json({
        success:   false,
        message:   'Timetable generation produced no sessions',
        conflicts: result.conflicts,
        metadata:  result.metadata,
      });
    }

    // ── 2. Auto-save — one Timetable doc per (semester × division) ───────────
    const savedDocs = [];

    if (autoSave) {
      const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const semLabel  = semList ? semList.map(s => `Sem ${s}`).join('+') : 'All Sems';
      const divLabel  = divList.join(',');
      const baseName  = name || `TT ${semLabel} Div ${divLabel} ${academicYear} (${timestamp})`;

      // ── FIX 2: deptId fallback also needs to be a valid ObjectId ────────────
      // The old code did: let deptId = departmentId
      // which could still be "Information Technology" when resolvedDeptId is null.
      // We use resolvedDeptId exclusively now.
      let deptId = resolvedDeptId;

      // If still null, try to infer from generated session data
      if (!deptId) {
        const firstDept = result.results[0]?.timetable?.[0]?.department;
        if (firstDept && mongoose.Types.ObjectId.isValid(String(firstDept))) {
          deptId = String(firstDept);
        }
        // If it's still not a valid ObjectId, leave as null — don't use it
      }

      for (const { semester: sem, division, batches, timetable: sessions, metrics } of result.results) {
        if (!sessions.length) {
          console.warn(`⚠️  Skipping save for Sem ${sem} Div ${division} — 0 sessions`);
          continue;
        }

        const docName = result.results.length === 1
          ? baseName
          : `TT Sem ${sem} Div ${division} ${academicYear} (${timestamp})`;

        // Build deleteMany filter — only include dept when it is a real ObjectId
        const deleteFilter = {
          status:                  'Draft',
          academicYear,
          'studentGroup.semester': Number(sem),
          'studentGroup.division': division,
        };
        if (deptId && mongoose.Types.ObjectId.isValid(deptId)) {
          deleteFilter['studentGroup.department'] = deptId;
        }

        await Timetable.deleteMany(deleteFilter);

        const scheduleEntries = sessions.map(sessionToSchemaEntry);

        // Build studentGroup — only set department when we have a valid ObjectId
        const studentGroup = {
          semester: Number(sem),
          division,
        };
        if (deptId && mongoose.Types.ObjectId.isValid(deptId)) {
          studentGroup.department = deptId;
        }

        const doc = await Timetable.create({
          name:         docName,
          studentGroup,
          academicYear,
          status:       'Draft',
          schedule:     scheduleEntries,
        });

        savedDocs.push({
          id:       doc._id,
          name:     doc.name,
          semester: sem,
          division,
          batches,
          sessions: sessions.length,
          metrics,
        });

        console.log(`💾 Saved: "${doc.name}" — ${sessions.length} sessions (${doc._id})`);
      }
    }

    // ── 3. Response ──────────────────────────────────────────────────────────
    const totalSaved = savedDocs.reduce((s, d) => s + d.sessions, 0);

    res.status(200).json({
      success: true,
      message: autoSave
        ? `Generated and saved ${savedDocs.length} timetable(s) with ${totalSaved} total sessions`
        : `Timetable generated (preview only — not saved)`,
      data: {
        results: result.results.map(r => ({
          semester:  r.semester,
          division:  r.division,
          batches:   r.batches,
          sessions:  r.timetable.length,
          metrics:   r.metrics,
          timetable: r.timetable,
        })),
        saved:     savedDocs,
        conflicts: result.conflicts,
        metadata:  result.metadata,
        timetable: result.timetable,
        metrics:   result.metrics,
      },
    });

  } catch (error) {
    console.error('❌ Timetable generation failed:', error);
    res.status(500).json({ success: false, message: 'Failed to generate timetable', error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/timetable/my-schedule
// ─────────────────────────────────────────────────────────────────────────────
router.get('/my-schedule', async (req, res) => {
  try {
    let teacherDoc;

    if (req.user.role === 'admin' && req.query.teacherId) {
      teacherDoc = await Teacher.findById(req.query.teacherId).populate('user', 'name email');
    } else {
      teacherDoc = await Teacher.findOne({ user: req.user._id }).populate('user', 'name email');
    }

    if (!teacherDoc) {
      return res.status(404).json({
        success: false,
        message: req.user.role === 'admin'
          ? 'Teacher not found'
          : 'No teacher profile found for your account. Contact admin.',
      });
    }

    const { status = 'Published', academicYear } = req.query;
    const timetableQuery = {
      status: status === 'any' ? { $in: ['Draft', 'Published'] } : status,
      'schedule.teacher': teacherDoc._id,
    };
    if (academicYear) timetableQuery.academicYear = Number(academicYear);

    const timetables = await Timetable.find(timetableQuery)
      .populate('schedule.Course', 'courseCode name courseType credits')
      .populate('schedule.teacher', 'user')
      .populate({ path: 'schedule.teacher', populate: { path: 'user', select: 'name' } })
      .populate('schedule.room', 'roomNumber floor type')
      .populate('studentGroup.department', 'name code')
      .lean();

    if (!timetables.length) {
      return res.status(200).json({
        success: true,
        message: 'No published timetable found. Ask admin to publish the timetable.',
        data: { teacher: { id: teacherDoc._id, name: teacherDoc.user?.name }, schedule: [], weeklyStats: {} }
      });
    }

    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const teacherIdStr = teacherDoc._id.toString();
    const byDay = Object.fromEntries(DAYS.map(d => [d, []]));

    timetables.forEach(tt => {
      (tt.schedule || []).forEach(entry => {
        if (entry.teacher?._id?.toString() !== teacherIdStr &&
            entry.teacher?.toString()       !== teacherIdStr) return;

        const course = entry.Course;
        const room   = entry.room;

        const session = {
          timetableId:  tt._id,
          entryId:      entry._id,
          courseId:     course?._id,
          courseCode:   course?.courseCode  || entry.courseCode,
          courseName:   course?.name        || entry.courseName,
          courseType:   course?.courseType,
          credits:      course?.credits,
          roomId:       room?._id,
          roomNumber:   room?.roomNumber    || entry.roomNumber,
          floor:        room?.floor,
          roomType:     room?.type,
          dayOfWeek:    entry.dayOfWeek,
          startTime:    entry.startTime,
          endTime:      entry.endTime,
          type:         entry.type,
          semester:     entry.semester     || tt.studentGroup?.semester,
          division:     entry.division     || 'A',
          batch:        entry.batch        || null,
          department:   tt.studentGroup?.department?.name || tt.studentGroup?.department,
          academicYear: tt.academicYear,
        };

        if (byDay[entry.dayOfWeek]) byDay[entry.dayOfWeek].push(session);
      });
    });

    DAYS.forEach(day => byDay[day].sort((a, b) => a.startTime.localeCompare(b.startTime)));

    const allSessions  = Object.values(byDay).flat();
    const totalMinutes = allSessions.reduce((acc, s) => {
      const [sh, sm] = s.startTime.split(':').map(Number);
      const [eh, em] = s.endTime.split(':').map(Number);
      return acc + (eh * 60 + em) - (sh * 60 + sm);
    }, 0);

    res.status(200).json({
      success: true,
      data: {
        teacher: { id: teacherDoc._id, name: teacherDoc.user?.name, email: teacherDoc.user?.email },
        weeklySchedule: byDay,
        allSessions,
        weeklyStats: {
          totalSessions: allSessions.length,
          theoryHours:   allSessions.filter(s => s.type === 'Theory').length,
          labHours:      allSessions.filter(s => s.type === 'Lab').length,
          workingDays:   new Set(allSessions.map(s => s.dayOfWeek)).size,
          totalHours:    Math.round(totalMinutes / 60 * 10) / 10,
        },
      }
    });

  } catch (error) {
    console.error('❌ Error fetching teacher schedule:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch schedule', error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/timetable/teachers
// ─────────────────────────────────────────────────────────────────────────────
router.get('/teachers', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { academicYear } = req.query;
    const query = { status: { $in: ['Draft', 'Published'] } };
    if (academicYear) query.academicYear = Number(academicYear);

    const timetables = await Timetable.find(query).lean();

    const teacherSessionCount = {};
    timetables.forEach(tt => {
      (tt.schedule || []).forEach(entry => {
        const tid = entry.teacher?.toString();
        if (!tid) return;
        if (!teacherSessionCount[tid]) teacherSessionCount[tid] = { theory: 0, lab: 0 };
        if (entry.type === 'Lab') teacherSessionCount[tid].lab++;
        else                      teacherSessionCount[tid].theory++;
      });
    });

    const teacherIds  = Object.keys(teacherSessionCount);
    const teacherDocs = await Teacher.find({ _id: { $in: teacherIds } })
      .populate('user', 'name email')
      .populate('primaryDepartment', 'name code')
      .lean();

    const result = teacherDocs.map(t => ({
      id:            t._id,
      name:          t.user?.name,
      email:         t.user?.email,
      department:    t.primaryDepartment?.name,
      theoryClasses: teacherSessionCount[t._id.toString()]?.theory || 0,
      labClasses:    teacherSessionCount[t._id.toString()]?.lab    || 0,
      totalClasses:  (teacherSessionCount[t._id.toString()]?.theory || 0) +
                     (teacherSessionCount[t._id.toString()]?.lab    || 0),
    })).sort((a, b) => b.totalClasses - a.totalClasses);

    res.status(200).json({ success: true, data: result });

  } catch (error) {
    console.error('❌ Error fetching teacher list:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch teachers', error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/timetable/semesters
// ─────────────────────────────────────────────────────────────────────────────
router.get('/semesters', async (req, res) => {
  try {
    const generator = new TimetableGenerator();
    const courses   = await generator.fetchCourses();

    const semesterData = {};
    courses.forEach(course => {
      const sem = course.semester;
      if (!semesterData[sem]) {
        semesterData[sem] = { semester: sem, courses: 0, departments: new Set(), totalHours: 0 };
      }
      semesterData[sem].courses++;
      semesterData[sem].departments.add(course.department?.toString());
      semesterData[sem].totalHours += course.hoursPerWeek || course.credits || 3;
    });

    const semesterList = Object.values(semesterData).map(data => ({
      semester:    data.semester,
      courses:     data.courses,
      departments: Array.from(data.departments),
      totalHours:  data.totalHours,
      canGenerate: data.courses > 0,
    })).sort((a, b) => a.semester - b.semester);

    res.status(200).json({
      success: true,
      data: { semesters: semesterList, totalSemesters: semesterList.length, totalCourses: courses.length }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch semester data', error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/timetable/status
// ─────────────────────────────────────────────────────────────────────────────
router.get('/status', async (req, res) => {
  try {
    const generator = new TimetableGenerator();
    const [courses, teachers, rooms] = await Promise.all([
      generator.fetchCourses(),
      generator.fetchTeachers(),
      generator.fetchRooms(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalCourses:  courses.length,
          totalTeachers: teachers.length,
          totalRooms:    rooms.length,
        },
        canGenerate: courses.length > 0 && teachers.length > 0 && rooms.length > 0,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch status', error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/timetable/dashboard-stats
// ─────────────────────────────────────────────────────────────────────────────
router.get('/dashboard-stats', async (req, res) => {
  try {
    const [totalTimetables, statusBreakdown] = await Promise.all([
      Timetable.countDocuments(),
      Timetable.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
    ]);

    const statusCounts = statusBreakdown.reduce((acc, item) => {
      acc[item._id] = item.count; return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        totalTimetables,
        activeTimetables: statusCounts.Published || 0,
        statusCounts: {
          Draft:     statusCounts.Draft     || 0,
          Published: statusCounts.Published || 0,
          Archived:  statusCounts.Archived  || 0,
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats', error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/timetable/list
// ─────────────────────────────────────────────────────────────────────────────



router.get('/free-slots', async (req, res) => {
  try {
    const ids = req.query.teacherIds.split(',');

    const data = await computeFreeSlots(ids);

    res.json({ success: true, data });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.get('/list', async (req, res) => {
  try {
    const { department, semester, division, academicYear, status } = req.query;
    const query = {};
 
    if (department) {
      const dept = department.toString();
      const orConditions = [
        { 'studentGroup.department': { $regex: new RegExp(`^${dept}$`, 'i') } }
      ];
      if (/^[a-f\d]{24}$/i.test(dept)) {
        orConditions.push({ 'studentGroup.department': new mongoose.Types.ObjectId(dept) });
      }
      query.$or = orConditions;
    }
    if (semester)     query['studentGroup.semester']  = Number(semester);
    if (division)     query['studentGroup.division']  = division;
    if (academicYear) query['academicYear']            = Number(academicYear);
    if (status)       query['status']                 = status;
 
    const timetables = await Timetable.find(query)
      // Populate department name/code
      .populate('studentGroup.department', 'name code')
      // Populate course info
      .populate('schedule.Course', 'courseCode name courseType credits semester')
      // Populate teacher → user (for name/email)
      .populate({
        path:     'schedule.teacher',
        populate: { path: 'user', select: 'name email' },
      })
      // Populate room info
      .populate('schedule.room', 'roomNumber floor type capacity')
      .sort({ 'studentGroup.semester': 1, 'studentGroup.division': 1, createdAt: -1 })
      .lean();
 
    // Flatten so every schedule entry has guaranteed display fields
    const result = timetables.map(tt => ({
      ...tt,
      studentGroup: {
        ...tt.studentGroup,
        departmentName:
          tt.studentGroup?.department?.name ||
          tt.studentGroup?.department?.code ||
          null,
      },
      schedule: (tt.schedule || []).map(entry => {
        const course  = entry.Course;
        const teacher = entry.teacher;
        const room    = entry.room;
 
        return {
          // Keep original ObjectId fields for reference
          Course:  entry.Course,
          teacher: entry.teacher,
          room:    entry.room,
 
          // ── Guaranteed display fields ────────────────────────────────────
          courseCode:  course?.courseCode  || '—',
          courseName:  course?.name        || 'Untitled Course',
          courseType:  course?.courseType  || entry.type,
          credits:     course?.credits     || null,
 
          teacherName: teacher?.user?.name  || teacher?.name || 'Unassigned',
          teacherEmail:teacher?.user?.email || null,
 
          roomNumber:  room?.roomNumber    || '—',
          roomType:    room?.type          || null,
 
          // Pass-through scheduling fields
          type:      entry.type,
          dayOfWeek: entry.dayOfWeek,
          startTime: entry.startTime,
          endTime:   entry.endTime,
          semester:  entry.semester  || tt.studentGroup?.semester,
          division:  entry.division  || tt.studentGroup?.division || 'A',
          batch:     entry.batch     || null,
        };
      }),
    }));
 
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('❌ /list error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch timetables', error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/timetable/:id
// ─────────────────────────────────────────────────────────────────────────────

router.get('/all-published', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
 
    const timetables = await Timetable.find({ status: 'Published' })
      .populate('studentGroup.department', 'name code')
      .populate('schedule.Course',  'courseCode name courseType')
      .populate('schedule.teacher', 'user')
      .populate('schedule.room',    'roomNumber')
      .sort({ 'studentGroup.semester': 1, 'studentGroup.division': 1 })
      .lean();
 
    // Flatten schedule to include display fields
    const result = timetables.map(tt => ({
      ...tt,
      schedule: (tt.schedule || []).map(entry => {
        const course  = entry.Course;
        const teacher = entry.teacher;
        const room    = entry.room;
 
        return {
          _id:         entry._id,
          courseCode:  entry.courseCode  || course?.courseCode  || '',
          courseName:  entry.courseName  || course?.name        || '',
          teacherName: entry.teacherName || teacher?.user?.name || '',
          roomNumber:  entry.roomNumber  || room?.roomNumber    || '',
          dayOfWeek:   entry.dayOfWeek,
          startTime:   entry.startTime,
          endTime:     entry.endTime,
          type:        entry.type,
          division:    entry.division,
          batch:       entry.batch,
        };
      }),
    }));
 
    res.status(200).json({ success: true, data: result });
 
  } catch (error) {
    console.error('❌ Error fetching all published timetables:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch timetables', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id)
      .populate('schedule.Course',  'courseCode name courseType credits semester')
      .populate({ path: 'schedule.teacher', populate: { path: 'user', select: 'name email' } })
      .populate('schedule.room',    'roomNumber floor type capacity')
      .populate('studentGroup.department', 'name code');

    if (!timetable) {
      return res.status(404).json({ success: false, message: 'Timetable not found' });
    }
    res.status(200).json({ success: true, data: timetable });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch timetable', error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/timetable/:id/publish
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/publish', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const timetable = await Timetable.findByIdAndUpdate(
      req.params.id,
      { status: 'Published', publishedAt: new Date() },
      { new: true }
    );
    if (!timetable) return res.status(404).json({ success: false, message: 'Timetable not found' });

    res.status(200).json({ success: true, message: 'Timetable published successfully', data: timetable });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to publish timetable', error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/timetable/:id
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const timetable = await Timetable.findByIdAndDelete(req.params.id);
    if (!timetable) return res.status(404).json({ success: false, message: 'Timetable not found' });

    res.status(200).json({ success: true, message: 'Timetable deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete timetable', error: error.message });
  }
});

 
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/timetable/teacher-detail/:teacherId
// Returns teacher's full schedule + computed FREE slots
// ─────────────────────────────────────────────────────────────────────────────
router.get('/teacher-detail/:teacherId', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
 
    const teacherDoc = await Teacher.findById(req.params.teacherId).populate('user', 'name email');
    if (!teacherDoc) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }
 
    // Fetch all published timetables where this teacher appears
    const timetables = await Timetable.find({
      status: 'Published',
      'schedule.teacher': teacherDoc._id,
    })
      .populate('schedule.Course', 'courseCode name courseType')
      .populate('schedule.room',   'roomNumber')
      .lean();
 
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const ALL_SLOTS = [
      { id: 1,  start: '08:10', end: '10:00', label: '8:10–10:00',  type: 'lab'    },
      { id: 3,  start: '10:20', end: '11:15', label: '10:20–11:15', type: 'theory' },
      { id: 4,  start: '11:15', end: '12:10', label: '11:15–12:10', type: 'theory' },
      { id: 5,  start: '12:10', end: '13:05', label: '12:10–13:05', type: 'theory' },
      { id: 6,  start: '13:50', end: '14:45', label: '13:50–14:45', type: 'theory' },
      { id: 7,  start: '14:45', end: '15:40', label: '14:45–15:40', type: 'theory' },
      { id: 8,  start: '15:40', end: '16:35', label: '15:40–16:35', type: 'theory' },
      { id: 9,  start: '12:50', end: '14:45', label: '12:50–14:45', type: 'lab'    },
    ];
 
    const teacherIdStr = teacherDoc._id.toString();
    const byDay = Object.fromEntries(DAYS.map(d => [d, []]));
 
    // Extract sessions for this teacher
    timetables.forEach(tt => {
      (tt.schedule || []).forEach(entry => {
        if (entry.teacher?._id?.toString() !== teacherIdStr &&
            entry.teacher?.toString()       !== teacherIdStr) return;
 
        const course = entry.Course;
        const room   = entry.room;
 
        const session = {
          courseCode:  entry.courseCode  || course?.courseCode  || '',
          courseName:  entry.courseName  || course?.name        || '',
          startTime:   entry.startTime,
          endTime:     entry.endTime,
          roomNumber:  entry.roomNumber  || room?.roomNumber    || '',
          division:    entry.division,
          batch:       entry.batch,
          type:        entry.type,
        };
 
        if (byDay[entry.dayOfWeek]) byDay[entry.dayOfWeek].push(session);
      });
    });
 
    // Sort each day by time
    DAYS.forEach(day => byDay[day].sort((a, b) => a.startTime.localeCompare(b.startTime)));
 
    // Compute FREE slots
    const toMin = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const overlaps = (s1, e1, s2, e2) => toMin(s1) < toMin(e2) && toMin(s2) < toMin(e1);
 
    const freeSlots = [];
    DAYS.forEach(day => {
      const sessions = byDay[day];
      ALL_SLOTS.forEach(slot => {
        const isBusy = sessions.some(s => overlaps(slot.start, slot.end, s.startTime, s.endTime));
        if (!isBusy) {
          freeSlots.push({ day, slot: { start: slot.start, end: slot.end, label: slot.label } });
        }
      });
    });
 
    // Stats
    const allSessions  = Object.values(byDay).flat();
    const totalMinutes = allSessions.reduce((acc, s) => {
      const [sh, sm] = s.startTime.split(':').map(Number);
      const [eh, em] = s.endTime.split(':').map(Number);
      return acc + (eh * 60 + em) - (sh * 60 + sm);
    }, 0);
 
    res.status(200).json({
      success: true,
      data: {
        teacher: {
          _id:   teacherDoc._id,
          name:  teacherDoc.user?.name,
          email: teacherDoc.user?.email,
        },
        weeklySchedule: byDay,
        freeSlots,
        weeklyStats: {
          totalSessions: allSessions.length,
          theoryClasses: allSessions.filter(s => s.type === 'Theory').length,
          labClasses:    allSessions.filter(s => s.type === 'Lab').length,
          totalHours:    Math.round(totalMinutes / 60 * 10) / 10,
          workingDays:   new Set(allSessions.map(s => DAYS.find(d => byDay[d].includes(s)))).size,
        },
      },
    });
 
  } catch (error) {
    console.error('❌ Error fetching teacher detail:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch teacher detail', error: error.message });
  }
});

router.patch('/:id/entry/:entryId', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
 
    const { dayOfWeek, startTime, endTime, teacher, room } = req.body;
 
    const timetable = await Timetable.findById(req.params.id);
    if (!timetable) return res.status(404).json({ success: false, message: 'Timetable not found' });
 
    // Find the entry — Mongoose subdoc _id
    const entry = timetable.schedule.id(req.params.entryId);
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
 
    // Apply patches
    if (dayOfWeek) entry.dayOfWeek = dayOfWeek;
    if (startTime) entry.startTime = startTime;
    if (endTime)   entry.endTime   = endTime;
 
    if (teacher && mongoose.Types.ObjectId.isValid(teacher)) {
      entry.teacher = teacher;
      // Re-populate teacherName for the denormalised field
      const teacherDoc = await Teacher.findById(teacher).populate('user', 'name');
      if (teacherDoc) entry.teacherName = teacherDoc.user?.name || null;
    }
 
    if (room && mongoose.Types.ObjectId.isValid(room)) {
      entry.room = room;
      const roomDoc = await Room.findById(room);
      if (roomDoc) entry.roomNumber = roomDoc.roomNumber || null;
    }
 
    await timetable.save();
 
    res.status(200).json({
      success: true,
      message: 'Entry updated',
      data: entry,
    });
 
  } catch (error) {
    console.error('❌ Patch entry error:', error);
    res.status(500).json({ success: false, message: 'Failed to update entry', error: error.message });
  }
});
 
// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/timetable/:id/bulk-update
// Replace the entire schedule array (used when drag-dropping saves everything)
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/bulk-update', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
 
    const { schedule } = req.body;
    if (!Array.isArray(schedule)) {
      return res.status(400).json({ success: false, message: 'schedule must be an array' });
    }
 
    // Validate each entry has required fields
    for (const entry of schedule) {
      if (!entry.Course && !entry.course) {
        return res.status(400).json({ success: false, message: 'Each entry must have a Course field' });
      }
    }
 
    const timetable = await Timetable.findByIdAndUpdate(
      req.params.id,
      { $set: { schedule } },
      { new: true, runValidators: true }
    )
      .populate('schedule.Course',  'courseCode name courseType credits')
      .populate({ path: 'schedule.teacher', populate: { path: 'user', select: 'name' } })
      .populate('schedule.room',    'roomNumber floor type');
 
    if (!timetable) return res.status(404).json({ success: false, message: 'Timetable not found' });
 
    res.status(200).json({
      success: true,
      message: 'Timetable updated',
      data: timetable,
    });
 
  } catch (error) {
    console.error('❌ Bulk update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update timetable', error: error.message });
  }
});
 
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/timetable/:id/validate
// Server-side conflict check for a timetable's schedule.
// Returns a list of conflicts with severity: 'error' | 'warning' | 'info'
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/validate', async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id).lean();
    if (!timetable) return res.status(404).json({ success: false, message: 'Timetable not found' });
 
    // Use schedule from body if provided (preview before save), else use stored
    const schedule = Array.isArray(req.body?.schedule)
      ? req.body.schedule
      : timetable.schedule;
 
    const conflicts = [];
 
    const toMin = hhmm => {
      const [h, m] = (hhmm || '0:0').split(':').map(Number);
      return h * 60 + m;
    };
    const overlaps = (s1, e1, s2, e2) =>
      toMin(s1) < toMin(e2) && toMin(s2) < toMin(e1);
 
    // ── 1. Teacher clashes ──────────────────────────────────────────────────
    const byTeacherDay = {};
    schedule.forEach((e, i) => {
      const tid = (e.teacher?._id || e.teacher)?.toString();
      if (!tid) return;
      const k = `${tid}_${e.dayOfWeek}`;
      if (!byTeacherDay[k]) byTeacherDay[k] = [];
      byTeacherDay[k].push({ ...e, _idx: i });
    });
 
    Object.values(byTeacherDay).forEach(slots => {
      for (let a = 0; a < slots.length; a++) {
        for (let b = a + 1; b < slots.length; b++) {
          if (overlaps(slots[a].startTime, slots[a].endTime, slots[b].startTime, slots[b].endTime)) {
            conflicts.push({
              type:     'error',
              kind:     'teacher',
              message:  `Teacher clash: ${slots[a].teacherName || 'Unknown'} is assigned to both ${slots[a].courseCode || '?'} and ${slots[b].courseCode || '?'} on ${slots[a].dayOfWeek} at the same time`,
              entryIds: [slots[a]._idx, slots[b]._idx],
            });
          }
        }
      }
    });
 
    // ── 2. Room clashes ─────────────────────────────────────────────────────
    const byRoomDay = {};
    schedule.forEach((e, i) => {
      const rid = (e.room?._id || e.room)?.toString();
      if (!rid) return;
      const k = `${rid}_${e.dayOfWeek}`;
      if (!byRoomDay[k]) byRoomDay[k] = [];
      byRoomDay[k].push({ ...e, _idx: i });
    });
 
    Object.values(byRoomDay).forEach(slots => {
      for (let a = 0; a < slots.length; a++) {
        for (let b = a + 1; b < slots.length; b++) {
          if (overlaps(slots[a].startTime, slots[a].endTime, slots[b].startTime, slots[b].endTime)) {
            conflicts.push({
              type:     'error',
              kind:     'room',
              message:  `Room clash: ${slots[a].roomNumber || 'Room'} is double-booked for ${slots[a].courseCode || '?'} and ${slots[b].courseCode || '?'} on ${slots[a].dayOfWeek}`,
              entryIds: [slots[a]._idx, slots[b]._idx],
            });
          }
        }
      }
    });
 
    // ── 3. Student (division) clashes ───────────────────────────────────────
    // Two theory sessions for same division at same time
    const byDivDay = {};
    schedule
      .filter(e => e.type === 'Theory')
      .forEach((e, i) => {
        const k = `${e.division}_${e.dayOfWeek}`;
        if (!byDivDay[k]) byDivDay[k] = [];
        byDivDay[k].push({ ...e, _idx: i });
      });
 
    Object.values(byDivDay).forEach(slots => {
      for (let a = 0; a < slots.length; a++) {
        for (let b = a + 1; b < slots.length; b++) {
          if (overlaps(slots[a].startTime, slots[a].endTime, slots[b].startTime, slots[b].endTime)) {
            conflicts.push({
              type:     'error',
              kind:     'student',
              message:  `Student clash: Division ${slots[a].division} has ${slots[a].courseCode || '?'} and ${slots[b].courseCode || '?'} scheduled at the same time on ${slots[a].dayOfWeek}`,
              entryIds: [slots[a]._idx, slots[b]._idx],
            });
          }
        }
      }
    });
 
    // ── 4. Teacher workload warnings ────────────────────────────────────────
    const teacherLoad = {};
    schedule.forEach(e => {
      const name = e.teacherName || 'Unknown';
      if (!teacherLoad[name]) teacherLoad[name] = 0;
      teacherLoad[name]++;
    });
    Object.entries(teacherLoad).forEach(([name, n]) => {
      if (n > 18) {
        conflicts.push({
          type:    'warning',
          kind:    'load',
          message: `${name} has ${n} sessions this week (recommended max: 18). Consider redistributing.`,
        });
      }
    });
 
    // ── 5. Back-to-back fatigue warnings ────────────────────────────────────
    const byTeacherDayArr = {};
    schedule.forEach(e => {
      const name = e.teacherName || 'Unknown';
      const k = `${name}_${e.dayOfWeek}`;
      if (!byTeacherDayArr[k]) byTeacherDayArr[k] = [];
      byTeacherDayArr[k].push(e);
    });
    Object.values(byTeacherDayArr).forEach(slots => {
      const sorted = [...slots].sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
      if (sorted.length >= 3) {
        // check if 3 consecutive slots with no gap ≥ 30 min
        for (let i = 0; i <= sorted.length - 3; i++) {
          const gap1 = toMin(sorted[i+1].startTime) - toMin(sorted[i].endTime);
          const gap2 = toMin(sorted[i+2].startTime) - toMin(sorted[i+1].endTime);
          if (gap1 < 30 && gap2 < 30) {
            conflicts.push({
              type:    'warning',
              kind:    'fatigue',
              message: `${sorted[i].teacherName} has 3+ consecutive sessions on ${sorted[i].dayOfWeek} with no meaningful break.`,
            });
            break; // one warning per teacher per day
          }
        }
      }
    });
 
    // ── 6. Missing teacher / room ────────────────────────────────────────────
    schedule.forEach((e, i) => {
      if (!e.teacher && !e.teacherName) {
        conflicts.push({ type:'warning', kind:'missing', message:`Session ${e.courseCode || i} has no teacher assigned`, entryIds:[i] });
      }
      if (!e.room && !e.roomNumber) {
        conflicts.push({ type:'warning', kind:'missing', message:`Session ${e.courseCode || i} has no room assigned`, entryIds:[i] });
      }
    });
 
    const summary = {
      errors:   conflicts.filter(c => c.type === 'error').length,
      warnings: conflicts.filter(c => c.type === 'warning').length,
      info:     conflicts.filter(c => c.type === 'info').length,
      valid:    conflicts.filter(c => c.type === 'error').length === 0,
    };
 
    res.status(200).json({ success: true, conflicts, summary });
 
  } catch (error) {
    console.error('❌ Validate error:', error);
    res.status(500).json({ success: false, message: 'Validation failed', error: error.message });
  }
});
 
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/timetable/:id/analyse
// LLM-powered timetable analysis using Claude API
// Returns: { summary, suggestions[], quality }
//
// Requires:  ANTHROPIC_API_KEY in your .env
//            npm install @anthropic-ai/sdk
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/analyse', async (req, res) => {
  try {
    const { schedule } = req.body;

    // Input validation
    if (!Array.isArray(schedule) || !schedule.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid schedule data',
      });
    }

    // STEP 1: Deterministic engine
    const { conflicts, qualityScore } = runValidationEngine(schedule);

    // STEP 2: Prepare prompt
    const sampleSize = 15;
    const scheduleSample = schedule.slice(0, sampleSize).map(e =>
      `- ${e.dayOfWeek} ${e.startTime}-${e.endTime}: ${e.courseCode} (${e.teacherName})`
    ).join('\n');

    const prompt = `
You are an expert academic timetable analyst.

QUALITY SCORE: ${qualityScore}/100
TOTAL SESSIONS: ${schedule.length}
CONFLICTS: ${conflicts.length}

SAMPLE:
${scheduleSample}

IMPORTANT:
- Return ONLY valid JSON
- No markdown
- No extra text

FORMAT:
{
  "summary": "2 sentences",
  "suggestions": ["💡 Suggestion", "⚠️ Suggestion", "👤 Suggestion"],
  "highlights": {
    "busiestDay": "Day",
    "mostLoadedTeacher": "Name",
    "riskLevel": "low|medium|high"
  }
}
`;

    // STEP 3: Gemini call with timeout + retry
    let analysis;
    let attempts = 0;

    while (attempts < 2) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), LLM_TIMEOUT)
        );

        const result = await Promise.race([
          model.generateContent(prompt),
          timeoutPromise,
        ]);

        const response = await result.response;
        const raw = response.text();

        const clean = raw.replace(/```json|```/g, '').trim();
        analysis = JSON.parse(clean);

        break;
      } catch (err) {
        attempts++;
        if (attempts === 2) throw err;
      }
    }

    // FINAL RESPONSE
    return res.json({
      success: true,
      quality: qualityScore,
      analysis,
      conflicts,
    });

  } catch (err) {
    console.error('❌ Gemini Analyse Error:', err.message);

    // Fallback
    const { conflicts, qualityScore } = runValidationEngine(req.body.schedule || []);

    return res.status(200).json({
      success: true,
      isAiFallback: true,
      quality: qualityScore,
      conflicts,
      analysis: {
        summary: "Static analysis only. AI unavailable.",
        suggestions: ["Fix conflicts manually."],
        highlights: {
          busiestDay: "N/A",
          mostLoadedTeacher: "N/A",
          riskLevel: "high",
        },
      },
    });
  }
});

 
// ─── fallback analysis (no LLM key) ─────────────────────────────────────────
function buildFallbackAnalysis(summary, schedule) {
  const tLoad = {};
  schedule.forEach(e => { tLoad[e.teacherName||'?'] = (tLoad[e.teacherName||'?']||0)+1; });
  const sorted   = Object.entries(tLoad).sort((a,b)=>b[1]-a[1]);
  const overloaded = sorted.filter(([,n]) => n > 16);
  const underloaded = sorted.filter(([,n]) => n < 6);
  const dayLoad = {};
  schedule.forEach(e => { dayLoad[e.dayOfWeek] = (dayLoad[e.dayOfWeek]||0)+1; });
  const maxDay = Object.entries(dayLoad).sort((a,b)=>b[1]-a[1])[0];
  const minDay = Object.entries(dayLoad).sort((a,b)=>a[1]-b[1])[0];
  const labs   = schedule.filter(s=>s.type==='Lab').length;
  const total  = schedule.length;
 
  const suggestions = [];
 
  if (overloaded.length) {
    suggestions.push(`⚠️ ${overloaded[0][0]} has ${overloaded[0][1]} sessions — consider redistributing 2-3 sessions to ${underloaded[0]?.[0] || 'a less-loaded teacher'}.`);
  } else {
    suggestions.push(`✓ Teacher workloads are well-balanced across ${sorted.length} faculty members.`);
  }
 
  if (maxDay && minDay && maxDay[1] - minDay[1] > 3) {
    suggestions.push(`📅 ${maxDay[0]} has ${maxDay[1]} sessions vs ${minDay[1]} on ${minDay[0]}. Moving 1-2 sessions to ${minDay[0]} would improve weekly spread.`);
  } else {
    suggestions.push(`✓ Sessions are evenly distributed across working days.`);
  }
 
  suggestions.push(labs < 3
    ? `🔬 Only ${labs} lab sessions detected. Confirm all practical/lab courses are accounted for.`
    : `✓ ${labs} lab sessions scheduled — lab coverage looks complete.`);
 
  suggestions.push(`📊 ${total} total sessions for this timetable. Verify UGC/university credit requirements are met.`);
 
  const quality = Math.min(100, Math.max(40,
    80 - overloaded.length * 10 - (maxDay?.[1]||0 > 8 ? 10 : 0)
  ));
 
  return {
    summary: `This timetable has ${total} sessions (${schedule.filter(s=>s.type==='Theory').length} theory, ${labs} lab). ${sorted[0]?.[0]||'Faculty'} carries the highest load at ${sorted[0]?.[1]||0} sessions/week.`,
    quality,
    suggestions,
  };
}
 
 

module.exports = router;