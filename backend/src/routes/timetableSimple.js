const express = require('express');
const TimetableGenerator = require('../services/timetable/TimetableGenerator');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Middleware to ensure user is authenticated for all timetable operations
router.use(auth);

/**
 * @route   POST /api/timetable-simple/generate
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
 * @route   GET /api/timetable-simple/semesters
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
 * @route   GET /api/timetable-simple/status
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

module.exports = router;