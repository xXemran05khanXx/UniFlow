const express = require('express');
const TimetableGenerator = require('../services/timetable/TimetableGenerator');
const Timetable = require('../models/Timetable');
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

    // Create new timetable
    const timetable = new Timetable({
      name,
      studentGroup: {
        department,
        year: Math.ceil(semester / 2), // Calculate year from semester
        division: 'A' // Default division
      },
      status: 'Draft',
      schedule: schedule.map(cls => ({
        course: cls.subject,
        teacher: cls.teacher,
        room: cls.room || null,
        dayOfWeek: getDayName(cls.day),
        startTime: cls.startTime,
        endTime: cls.endTime
      }))
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
      query['studentGroup.department'] = department;
    }
    
    if (semester) {
      query['studentGroup.year'] = Math.ceil(parseInt(semester) / 2);
    }
    
    if (status) {
      query.status = status;
    }

    const timetables = await Timetable.find(query)
      .populate('schedule.course')
      .populate('schedule.teacher')
      .populate('schedule.room')
      .sort({ createdAt: -1 });

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