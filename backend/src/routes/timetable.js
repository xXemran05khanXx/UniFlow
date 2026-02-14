const express = require('express');
const mongoose = require('mongoose');
const TimetableGenerator = require('../services/timetable/TimetableGenerator');
const Timetable = require('../models/Timetable');
const Course = require('../models/Course');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const Room = require('../models/Room');
const Department = require('../models/Department');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Middleware to ensure user is authenticated for all timetable operations
router.use(auth);

/**
 * @route   POST /api/timetable/generate
 * @desc    Generate timetable using existing database data
 * @access  Private (Admin only)
 * @body    {
 *   algorithm: 'greedy' | 'genetic' | 'constraint',
 *   semester: number (1-8) | null (for all semesters),
 *   academicYear: number
 * }
 */
router.post('/generate', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required for timetable generation'
      });
    }

    const { 
      algorithm = 'greedy', 
      semester = null, // 1-8 or null for all
      academicYear = 2025 
    } = req.body;

    // Validate semester if provided
    if (semester !== null && (semester < 1 || semester > 8)) {
      return res.status(400).json({
        success: false,
        message: 'Semester must be between 1 and 8, or null for all semesters'
      });
    }

    const semesterText = semester ? `semester ${semester}` : 'all semesters';
    console.log(`🚀 Starting timetable generation for ${semesterText} by ${req.user.name}...`);
    
    // Initialize the generator
    const generator = new TimetableGenerator();
    
    // Generate timetable
    const result = await generator.generateTimetable({
      algorithm,
      semester,
      academicYear
    });
    
    console.log(`✅ Timetable generation completed for ${semesterText}: ${result.metadata.totalSessions} sessions`);
    
    // Return the result
    res.status(200).json({
      success: true,
      message: `Timetable generated successfully for ${semesterText}`,
      data: {
        timetable: result.timetable,
        metrics: result.metrics,
        conflicts: result.conflicts,
        metadata: result.metadata
      }
    });

  } catch (error) {
    console.error('❌ Timetable generation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate timetable',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/timetable/semesters
 * @desc    Get available semesters with course counts
 * @access  Private
 */
router.get('/semesters', async (req, res) => {
  try {
    const generator = new TimetableGenerator();
    const courses = await generator.fetchCourses();
    
    // Group courses by semester
    const semesterData = {};
    courses.forEach(course => {
      const sem = course.semester;
      if (!semesterData[sem]) {
        semesterData[sem] = {
          semester: sem,
          courses: 0,
          departments: new Set(),
          totalHours: 0
        };
      }
      semesterData[sem].courses++;
      semesterData[sem].departments.add(course.department);
      semesterData[sem].totalHours += course.hoursPerWeek || course.credits || 3;
    });

    // Convert to array and format
    const semesterList = Object.values(semesterData).map(data => ({
      semester: data.semester,
      courses: data.courses,
      departments: Array.from(data.departments),
      totalHours: data.totalHours,
      canGenerate: data.courses > 0
    })).sort((a, b) => a.semester - b.semester);

    res.status(200).json({
      success: true,
      data: {
        semesters: semesterList,
        totalSemesters: semesterList.length,
        totalCourses: courses.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching semester data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch semester data',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/timetable/status
 * @desc    Get timetable generation status and statistics
 * @access  Private
 */
router.get('/status', async (req, res) => {
  try {
    const generator = new TimetableGenerator();
    
    // Get basic statistics
    const courses = await generator.fetchCourses();
    const teachers = await generator.fetchTeachers();
    const rooms = await generator.fetchRooms();
    
    // Calculate basic metrics
    const departmentStats = {};
    courses.forEach(course => {
      if (!departmentStats[course.department]) {
        departmentStats[course.department] = { courses: 0, totalHours: 0 };
      }
      departmentStats[course.department].courses++;
      departmentStats[course.department].totalHours += course.hoursPerWeek;
    });

    const teacherStats = {};
    teachers.forEach(teacher => {
      if (!teacherStats[teacher.department]) {
        teacherStats[teacher.department] = 0;
      }
      teacherStats[teacher.department]++;
    });

    const roomStats = {};
    rooms.forEach(room => {
      if (!roomStats[room.type]) {
        roomStats[room.type] = 0;
      }
      roomStats[room.type]++;
    });

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalCourses: courses.length,
          totalTeachers: teachers.length,
          totalRooms: rooms.length,
          departments: Object.keys(departmentStats).length
        },
        departmentStats,
        teacherStats,
        roomStats,
        canGenerate: courses.length > 0 && teachers.length > 0 && rooms.length > 0
      }
    });

  } catch (error) {
    console.error('❌ Error fetching timetable status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch timetable status',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/timetable/dashboard-stats
 * @desc    Get timetable counts for admin dashboard cards
 * @access  Private
 */
router.get('/dashboard-stats', async (req, res) => {
  try {
    const [totalTimetables, statusBreakdown] = await Promise.all([
      Timetable.countDocuments(),
      Timetable.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const statusCounts = statusBreakdown.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // Production definition: only Published timetables are considered active.
    const activeTimetables = statusCounts.Published || 0;

    res.status(200).json({
      success: true,
      data: {
        totalTimetables,
        activeTimetables,
        statusCounts: {
          Draft: statusCounts.Draft || 0,
          Published: statusCounts.Published || 0,
          Archived: statusCounts.Archived || 0
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching timetable dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch timetable dashboard stats',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/timetable/departments/:department
 * @desc    Get timetable for a specific department
 * @access  Private
 */
router.get('/departments/:department', async (req, res) => {
  try {
    const { department } = req.params;
    
    // This would typically fetch from a saved timetable in the database
    // For now, we'll generate a fresh one and filter by department
    const generator = new TimetableGenerator();
    const result = await generator.generateTimetable({
      algorithm: 'greedy',
      semester: 'fall',
      academicYear: 2025
    });
    
    // Filter sessions by department
    const departmentSessions = result.timetable.filter(
      session => session.department === department
    );
    
    res.status(200).json({
      success: true,
      data: {
        department,
        sessions: departmentSessions,
        totalSessions: departmentSessions.length,
        metadata: {
          generatedAt: new Date().toISOString(),
          algorithm: 'greedy'
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching department timetable:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department timetable',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/timetable/save
 * @desc    Save generated timetable to database
 * @access  Private (Admin only)
 */
router.post('/save', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required to save timetables'
      });
    }

    const { 
      name, 
      department, 
      semester, 
      academicYear,
      schedule 
    } = req.body;

    // Validate required fields
    if (!name || !department || !semester || !schedule) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, department, semester, schedule'
      });
    }

    const normalizeDay = value => {
      if (!value) return null;
      const lower = value.toString().toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    };

    const extractObjectId = value => {
      if (!value) return null;

      if (typeof value === 'string') {
        const raw = value.trim();
        if (mongoose.isValidObjectId(raw)) return raw;
        const extracted = raw.match(/[a-f\d]{24}/i);
        return extracted && mongoose.isValidObjectId(extracted[0]) ? extracted[0] : null;
      }

      if (typeof value === 'object') {
        if (value.$oid) return extractObjectId(value.$oid);
        if (value._id && value._id !== value) return extractObjectId(value._id);
        if (value.id) return extractObjectId(value.id);
      }

      if (typeof value?.toString === 'function') {
        const asString = value.toString();
        if (mongoose.isValidObjectId(asString)) return asString;
      }

      return null;
    };

    const normalizedSchedule = schedule.map((cls, idx) => {
      const roomId = extractObjectId(
        cls.room?._id
        || cls.room?.id
        || cls.room?.roomId
        || cls.roomId
        || cls.timeSlot?.roomId
        || cls.timeSlot?.room?._id
        || cls.timeSlot?.room
        || cls.room
      );

      const courseId = extractObjectId(cls.subject || cls.course || cls.courseId);
      const teacherId = extractObjectId(cls.teacher || cls.teacherId || cls.instructor);
      const dayName = normalizeDay(cls.dayOfWeek) || getDayName(cls.day);

      if (!roomId) {
        throw new Error(`Schedule item ${idx} missing room id`);
      }
      if (!courseId) {
        throw new Error(`Schedule item ${idx} missing course/subject id`);
      }
      if (!teacherId) {
        throw new Error(`Schedule item ${idx} missing teacher id`);
      }

      return {
        course: courseId,
        teacher: teacherId,
        room: roomId,
        dayOfWeek: dayName,
        startTime: cls.startTime,
        endTime: cls.endTime
      };
    });

    // Validate that referenced entities exist (especially room to avoid TBD rendering)
    const uniqueRoomIds = [...new Set(normalizedSchedule.map(s => s.room))];
    const existingRooms = await Room.find({ _id: { $in: uniqueRoomIds } }).select('_id').lean();
    const existingRoomSet = new Set(existingRooms.map(r => r._id.toString()));
    const missingRoomIds = uniqueRoomIds.filter(id => !existingRoomSet.has(id.toString()));
    if (missingRoomIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid room reference(s) in schedule: ${missingRoomIds.join(', ')}`
      });
    }

    // Create new timetable
    const timetable = new Timetable({
      name,
      studentGroup: {
        department,
        year: Math.ceil(semester / 2), // Calculate year from semester
        division: 'A' // Default division
      },
      status: 'Draft',
      schedule: normalizedSchedule
    });

    await timetable.save();

    res.status(201).json({
      success: true,
      message: 'Timetable saved successfully',
      data: timetable
    });

  } catch (error) {
    console.error('❌ Error saving timetable:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save timetable',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/timetable/list
 * @desc    Get all saved timetables
 * @access  Private
 */
router.get('/list', async (req, res) => {
  try {
    const { department, semester, status } = req.query;
    
    let query = {};
    
    if (department) {
      const dept = department.toString();
      const orConditions = [
        { 'studentGroup.department': { $regex: new RegExp(`^${dept}$`, 'i') } }
      ];

      // If it looks like an ObjectId, allow direct string match
      const isHexObjectId = /^[a-f\d]{24}$/i.test(dept);
      if (isHexObjectId) {
        orConditions.push({ 'studentGroup.department': dept });
      }

      // Try to resolve department code/name to id
      try {
        const foundDept = await Department.findOne({
          $or: [
            { code: new RegExp(`^${dept}$`, 'i') },
            { name: new RegExp(`^${dept}$`, 'i') }
          ]
        }).select('_id');
        if (foundDept) {
          orConditions.push({ 'studentGroup.department': foundDept._id.toString() });
        }
      } catch (resolveErr) {
        console.warn('⚠️  Department lookup failed, continuing with regex only', resolveErr.message);
      }

      query.$or = orConditions;
    }
    
    if (semester) {
      query['studentGroup.year'] = Math.ceil(parseInt(semester) / 2);
    }
    
    if (status) {
      query.status = status;
    }

    const timetables = await Timetable.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Robust id extractor for ObjectId, {$oid}, strings like "ObjectId('...')", and embedded _id.
    const toIdString = value => {
      if (!value) return null;

      // Native/ObjectId-like values
      if (typeof value === 'object' && (value._bsontype === 'ObjectId' || value.constructor?.name === 'ObjectId')) {
        const str = value.toString();
        return /^[a-f\d]{24}$/i.test(str) ? str : null;
      }

      // Extended JSON ObjectId
      if (typeof value === 'object' && value.$oid) {
        const oid = String(value.$oid);
        return /^[a-f\d]{24}$/i.test(oid) ? oid : null;
      }

      // Embedded document _id (avoid self-recursive ObjectId._id getter)
      if (typeof value === 'object' && value._id && value._id !== value) {
        const nested = value._id;
        if (typeof nested === 'string' && /^[a-f\d]{24}$/i.test(nested)) return nested;
        if (typeof nested === 'object' && nested.$oid && /^[a-f\d]{24}$/i.test(String(nested.$oid))) return String(nested.$oid);
        if (typeof nested?.toString === 'function') {
          const nestedStr = nested.toString();
          if (/^[a-f\d]{24}$/i.test(nestedStr)) return nestedStr;
        }
      }

      const raw = typeof value === 'string' ? value : (typeof value.toString === 'function' ? value.toString() : '');
      const exact = raw.match(/^[a-f\d]{24}$/i);
      if (exact) return exact[0];
      const extracted = raw.match(/[a-f\d]{24}/i);
      return extracted ? extracted[0] : null;
    };

    const courseIds = new Set();
    const teacherIds = new Set();
    const roomIds = new Set();
    const roomRawKeys = new Set();

    timetables.forEach(tt => {
      (tt.schedule || []).forEach(entry => {
        const cId = toIdString(entry.course);
        const tId = toIdString(entry.teacher);
        const rId = toIdString(entry.room);
        if (cId) courseIds.add(cId);
        if (tId) teacherIds.add(tId);
        if (rId) roomIds.add(rId);

        if (!rId && typeof entry.room === 'string' && entry.room.trim()) {
          roomRawKeys.add(entry.room.trim().toLowerCase());
        }
        if (!rId && entry.room && typeof entry.room === 'object') {
          const possible = [entry.room.roomNumber, entry.room.name, entry.room.code].find(v => typeof v === 'string' && v.trim());
          if (possible) roomRawKeys.add(possible.trim().toLowerCase());
        }
      });
    });

    const [courses, subjects, teachers, users, rooms, roomsByText] = await Promise.all([
      courseIds.size ? Course.find({ _id: { $in: Array.from(courseIds) } }).select('courseName courseCode semester courseType').lean() : [],
      courseIds.size ? Subject.find({ _id: { $in: Array.from(courseIds) } }).select('name code semester type').lean() : [],
      teacherIds.size ? Teacher.find({ _id: { $in: Array.from(teacherIds) } }).select('name employeeId').lean() : [],
      teacherIds.size ? User.find({ _id: { $in: Array.from(teacherIds) } }).select('name employeeId').lean() : [],
      roomIds.size ? Room.find({ _id: { $in: Array.from(roomIds) } }).select('roomNumber name code').lean() : [],
      roomRawKeys.size
        ? Room.find({
            $or: Array.from(roomRawKeys).flatMap(key => ([
              { roomNumber: new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
              { name: new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
              { code: new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
            ]))
          }).select('roomNumber name code').lean()
        : []
    ]);

    const courseMap = new Map(courses.map(c => [c._id.toString(), c]));
    const subjectMap = new Map(subjects.map(s => [s._id.toString(), s]));
    const teacherMap = new Map(teachers.map(t => [t._id.toString(), t]));
    const userMap = new Map(users.map(u => [u._id.toString(), u]));
    const roomMap = new Map(rooms.map(r => [r._id.toString(), r]));
    const roomTextMap = new Map();
    roomsByText.forEach(r => {
      if (r.roomNumber) roomTextMap.set(String(r.roomNumber).trim().toLowerCase(), r);
      if (r.name) roomTextMap.set(String(r.name).trim().toLowerCase(), r);
      if (r.code) roomTextMap.set(String(r.code).trim().toLowerCase(), r);
    });

    timetables.forEach(tt => {
      tt.schedule = (tt.schedule || []).map(entry => {
        const next = { ...entry };

        const cId = toIdString(next.course);
        const tId = toIdString(next.teacher);
        const rId = toIdString(next.room);

        const c = cId ? courseMap.get(cId) : null;
        const s = cId ? subjectMap.get(cId) : null;
        const t = tId ? teacherMap.get(tId) : null;
        const u = tId ? userMap.get(tId) : null;
        const roomRawText = typeof next.room === 'string'
          ? next.room.trim().toLowerCase()
          : (next.room && typeof next.room === 'object'
              ? String(next.room.roomNumber || next.room.name || next.room.code || '').trim().toLowerCase()
              : '');
        const r = rId ? roomMap.get(rId) : (roomRawText ? roomTextMap.get(roomRawText) : null);

        next.course = (c || s)
          ? {
              _id: cId,
              courseName: c?.courseName || s?.name || null,
              courseCode: c?.courseCode || s?.code || null,
              semester: c?.semester || s?.semester || null,
              courseType: c?.courseType || s?.type || null
            }
          : (cId ? { _id: cId } : null);

        next.teacher = (t || u)
          ? {
              _id: tId,
              name: t?.name || u?.name || null,
              employeeId: t?.employeeId || u?.employeeId || null
            }
          : (tId ? { _id: tId } : null);

        const existingRoomObj = (next.room && typeof next.room === 'object') ? next.room : null;
        next.room = r
          ? {
              _id: rId,
              roomNumber: r.roomNumber || null,
              name: r.name || null,
              code: r.code || null
            }
          : (existingRoomObj || (rId ? { _id: rId } : null));

        // Flat fields for frontend safety
        next.courseName = c?.courseName || s?.name || null;
        next.courseCode = c?.courseCode || s?.code || null;
        next.courseType = c?.courseType || s?.type || null;
        next.courseSemester = c?.semester || s?.semester || null;

        next.teacherName = t?.name || u?.name || null;
        next.teacherEmployeeId = t?.employeeId || u?.employeeId || null;

        next.roomName = next.room?.name || next.room?.roomNumber || next.room?.code || r?.name || r?.roomNumber || r?.code || null;

        return next;
      });
    });

    res.status(200).json({
      success: true,
      data: timetables
    });

  } catch (error) {
    console.error('❌ Error fetching timetables:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch timetables',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/timetable/:id
 * @desc    Get specific timetable by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id)
      .populate('schedule.course')
      .populate('schedule.teacher')
      .populate('schedule.room');

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }

    res.status(200).json({
      success: true,
      data: timetable
    });

  } catch (error) {
    console.error('❌ Error fetching timetable:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch timetable',
      error: error.message
    });
  }
});

/**
 * @route   PATCH /api/timetable/:id/publish
 * @desc    Publish a timetable (change status from Draft to Published)
 * @access  Private (Admin only)
 */
router.patch('/:id/publish', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required to publish timetables'
      });
    }

    const timetable = await Timetable.findByIdAndUpdate(
      req.params.id,
      { status: 'Published' },
      { new: true }
    );

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Timetable published successfully',
      data: timetable
    });

  } catch (error) {
    console.error('❌ Error publishing timetable:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish timetable',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/timetable/:id
 * @desc    Delete a timetable
 * @access  Private (Admin only)
 */
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required to delete timetables'
      });
    }

    const timetable = await Timetable.findByIdAndDelete(req.params.id);

    if (!timetable) {
      return res.status(404).json({
        success: false,
        message: 'Timetable not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Timetable deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting timetable:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete timetable',
      error: error.message
    });
  }
});

// Helper function to convert day number to name
function getDayName(dayNumber) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber] || 'Monday';
}

module.exports = router;