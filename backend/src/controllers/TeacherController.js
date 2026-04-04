const asyncHandler = require('../middleware/asyncHandler');
const Teacher      = require('../models/Teacher');
const Timetable    = require('../models/Timetable');
const User         = require('../models/User');
const mongoose     = require('mongoose');
const DailyOverride = require('../models/dailyOverride')
const AbsenceRequest = require('../models/AbsenceReq');
// ─────────────────────────────────────────────────────────────────────────────
// Create teacher profile
// ─────────────────────────────────────────────────────────────────────────────
const createTeacher = asyncHandler(async (req, res) => {
  const {
    user,
    employeeId,
    name,
    primaryDepartment,
    allowedDepartments = [],
    designation,
    qualifications     = [],
    contactInfo,
    workload,
    availability
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(user)) {
    return res.status(400).json({ success: false, error: 'Invalid user ID' });
  }

  const userDoc = await User.findById(user);
  if (!userDoc) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  if (userDoc.role !== 'teacher') {
    return res.status(400).json({ success: false, error: 'User role must be teacher' });
  }

  const existingByUser = await Teacher.findOne({ user });
  if (existingByUser) {
    return res.status(400).json({ success: false, error: 'Teacher profile already exists for this user' });
  }

  const existingTeacher = await Teacher.findOne({ employeeId });
  if (existingTeacher) {
    return res.status(400).json({ success: false, error: 'Employee ID already exists' });
  }

  const teacher = await Teacher.create({
    user, employeeId, name, primaryDepartment, allowedDepartments,
    designation, qualifications, contactInfo, workload, availability
  });

  res.status(201).json({ success: true, data: teacher });
});

// ─────────────────────────────────────────────────────────────────────────────
// Get all teachers
// ─────────────────────────────────────────────────────────────────────────────
const getTeachers = asyncHandler(async (req, res) => {
  const teachers = await Teacher.find()
    .populate('user',               'name email role')
    .populate('primaryDepartment',  'name coursecode')
    .populate('allowedDepartments', 'name coursecode');

  res.status(200).json({ success: true, data: teachers });
});

// ─────────────────────────────────────────────────────────────────────────────
// Get single teacher
// ─────────────────────────────────────────────────────────────────────────────
const getTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id)
    .populate('user',               'name email role')
    .populate('primaryDepartment',  'name coursecode')
    .populate('allowedDepartments', 'name coursecode');

  if (!teacher) {
    return res.status(404).json({ success: false, error: 'Teacher not found' });
  }
  res.status(200).json({ success: true, data: teacher });
});

// ─────────────────────────────────────────────────────────────────────────────
// Shared helper — build a teacher's weekly schedule from saved timetables
// ─────────────────────────────────────────────────────────────────────────────
async function buildTeacherSchedule(teacherDoc, options = {}) {
  const { status = 'Published', academicYear } = options;

  // Find timetables that contain this teacher's sessions
  const query = {
    'schedule.teacher': teacherDoc._id,
  };

  // status: 'any' shows both Draft and Published (useful for admin preview)
  if (status === 'any') {
    query.status = { $in: ['Draft', 'Published'] };
  } else {
    query.status = status;
  }

  if (academicYear) query.academicYear = Number(academicYear);

  const timetables = await Timetable.find(query)
    .populate({
      path:     'schedule.Course',
      select:   'courseCode name courseType credits semester',
    })
    .populate({
      path:     'schedule.room',
      select:   'roomNumber floor type',
    })
    .populate({
      path:     'studentGroup.department',
      select:   'name code',
    })
    .lean();

  // ── Flatten sessions for this teacher, grouped by day ──────────────────────
  const DAYS      = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const byDay     = Object.fromEntries(DAYS.map(d => [d, []]));
  const teacherId = teacherDoc._id.toString();

  timetables.forEach(tt => {
    (tt.schedule || []).forEach(entry => {
      // Match teacher (handles both ObjectId and populated object)
      const entryTeacherId =
        entry.teacher?._id?.toString() ||
        entry.teacher?.toString();

      if (entryTeacherId !== teacherId) return;

      const course = entry.Course || {};
      const room   = entry.room   || {};

      const session = {
        // Identifiers
        timetableId:  tt._id,
        // Course
        courseId:     course._id,
        courseCode:   course.courseCode,
        courseName:   course.name,
        courseType:   course.courseType,
        credits:      course.credits,
        // Room
        roomId:       room._id,
        roomNumber:   room.roomNumber,
        floor:        room.floor,
        roomType:     room.type,
        // Timing
        dayOfWeek:    entry.dayOfWeek,
        startTime:    entry.startTime,
        endTime:      entry.endTime,
        // Session metadata
        type:         entry.type,
        semester:     entry.semester    || tt.studentGroup?.semester,
        division:     entry.division    || 'A',
        batch:        entry.batch       || null,
        department:   tt.studentGroup?.department?.name || null,
        academicYear: tt.academicYear,
        status:       tt.status,
      };

      if (byDay[entry.dayOfWeek]) {
        byDay[entry.dayOfWeek].push(session);
      }
    });
  });

  // Sort each day by startTime
  DAYS.forEach(day => {
    byDay[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  // ── Weekly stats ────────────────────────────────────────────────────────────
  const allSessions   = Object.values(byDay).flat();
  const theoryCount   = allSessions.filter(s => s.type === 'Theory').length;
  const labCount      = allSessions.filter(s => s.type === 'Lab').length;
  const workingDays   = new Set(allSessions.map(s => s.dayOfWeek)).size;
  const totalMinutes  = allSessions.reduce((acc, s) => {
    const [sh, sm] = s.startTime.split(':').map(Number);
    const [eh, em] = s.endTime.split(':').map(Number);
    return acc + (eh * 60 + em) - (sh * 60 + sm);
  }, 0);

  return {
    teacher: {
      id:         teacherDoc._id,
      name:       teacherDoc.user?.name,
      email:      teacherDoc.user?.email,
      employeeId: teacherDoc.employeeId,
      department: teacherDoc.primaryDepartment?.name || null,
    },
    weeklySchedule: byDay,   // { Monday: [...], Tuesday: [...], ... }
    allSessions,              // flat list — good for mobile/list view
    weeklyStats: {
      totalSessions: allSessions.length,
      theoryClasses: theoryCount,
      labClasses:    labCount,
      workingDays,
      totalHours:    Math.round(totalMinutes / 60 * 10) / 10,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/teachers/my-schedule
// Teacher sees their own personal weekly timetable.
//
// Query params:
//   status       = 'Published' (default) | 'Draft' | 'any'
//   academicYear = 2025 (optional)
// ─────────────────────────────────────────────────────────────────────────────
const getMySchedule = asyncHandler(async (req, res) => {
  // Find this user's Teacher profile
  const teacherDoc = await Teacher.findOne({ user: req.user._id })
    .populate('user',              'name email')
    .populate('primaryDepartment', 'name code');

  if (!teacherDoc) {
    return res.status(404).json({
      success: false,
      error:   'No teacher profile found for your account. Please contact admin.',
    });
  }

  const { status = 'Published', academicYear } = req.query;
  const data = await buildTeacherSchedule(teacherDoc, { status, academicYear });

  if (!data.allSessions.length) {
    return res.status(200).json({
      success: true,
      message: status === 'Published'
        ? 'No published timetable found yet. Ask admin to publish the timetable.'
        : 'No sessions found.',
      data,
    });
  }

  res.status(200).json({ success: true, data });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/teachers/:id/schedule
// Admin views any specific teacher's weekly timetable.
//
// Query params:
//   status       = 'Published' | 'Draft' | 'any'  (default: 'any' for admin)
//   academicYear = 2025 (optional)
// ─────────────────────────────────────────────────────────────────────────────
const getTeacherScheduleById = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const teacherDoc = await Teacher.findById(req.params.id)
    .populate('user',              'name email')
    .populate('primaryDepartment', 'name code');

  if (!teacherDoc) {
    return res.status(404).json({ success: false, error: 'Teacher not found' });
  }

  const { status = 'any', academicYear } = req.query;
  const data = await buildTeacherSchedule(teacherDoc, { status, academicYear });

  res.status(200).json({ success: true, data });
});
const getMyDailySchedule = asyncHandler(async (req, res) => {
  // Parse date explicitly to avoid timezone shifts (just like you did in Swaps!)
  const [year, month, day] = req.params.date.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const endOfDay   = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  
  const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dayOfWeek = DAY_NAMES[targetDate.getDay()];
  
  const teacher = await Teacher.findOne({ user: req.user._id });
  if (!teacher) return res.status(404).json({ success: false, error: 'Teacher not found' });

  // 1. GET REGULAR TIMETABLE
  const baseTimetables = await Timetable.find({ 
    status: 'Published', 
    'schedule.teacher': teacher._id 
  }).populate('schedule.Course', 'name courseCode').populate('schedule.room', 'roomNumber').lean();

  let dailyClasses = [];
  
  baseTimetables.forEach(tt => {
    tt.schedule.forEach(entry => {
      if (entry.dayOfWeek === dayOfWeek && entry.teacher?.toString() === teacher._id.toString()) {
        dailyClasses.push({
          startTime: entry.startTime,
          endTime: entry.endTime,
          course: entry.Course,
          room: entry.room,
          type: entry.type,
          division: entry.division,
          status: 'Regular' 
        });
      }
    });
  });

  // 2. APPLY SWAPS (Daily Overrides)
  const overrides = await DailyOverride.find({
    date: { $gte: startOfDay, $lte: endOfDay },
    $or: [{ originalTeacher: teacher._id }, { newTeacher: teacher._id }]
  }).populate('course room').lean();

  overrides.forEach(override => {
    // If teacher gave class away, remove it
    if (override.originalTeacher.toString() === teacher._id.toString()) {
      dailyClasses = dailyClasses.filter(c => c.startTime !== override.startTime);
    }
    // If teacher is covering, add it
    if (override.newTeacher.toString() === teacher._id.toString()) {
      dailyClasses.push({
        startTime: override.startTime,
        endTime: override.endTime,
        course: override.course,
        room: override.room,
        status: 'Swapped In'
      });
    }
  });

  // 3. APPLY ABSENCES & SUBSTITUTIONS
  // A. Is the teacher absent today?
  const myAbsence = await AbsenceRequest.findOne({
    absenceDate: { $gte: startOfDay, $lte: endOfDay },
    teacher: teacher._id,
    status: 'published'
  });
  
  if (myAbsence) {
    dailyClasses = dailyClasses.filter(c => c.status !== 'Regular'); // Remove normal classes
  }

  // B. Is the teacher subbing for someone else?
  const coveringAbsences = await AbsenceRequest.find({
    absenceDate: { $gte: startOfDay, $lte: endOfDay },
    status: 'published',
    'affectedClasses.substituteTeacher': teacher._id
  });

  coveringAbsences.forEach(abs => {
    abs.affectedClasses.forEach(cls => {
      if (cls.substituteTeacher?.toString() === teacher._id.toString()) {
        dailyClasses.push({
          startTime: cls.startTime,
          endTime: cls.endTime,
          course: { name: cls.courseName, courseCode: cls.courseCode },
          room: { roomNumber: cls.roomNumber },
          status: 'Substitute'
        });
      }
    });
  });

  // Sort by time
  dailyClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));

  res.status(200).json({ success: true, date: req.params.date, data: dailyClasses });
});

// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  createTeacher,
  getTeachers,
  getTeacher,
  getMySchedule,
  getTeacherScheduleById,
  getMyDailySchedule,
};