const express = require('express');
const auth = require('../middleware/auth');
const TimetableGenerator = require('../src/services/timetable/TimetableGenerator');

const router = express.Router();

// Generate timetable
router.post('/generate', auth, async (req, res) => {
  try {
    const {
      algorithm = 'greedy',
      maxIterations = 1000,
      semester = 'fall',
      academicYear = new Date().getFullYear(),
      courses,
      teachers,
      rooms
    } = req.body;

    console.log('🎯 Timetable generation request received');
    console.log('Algorithm:', algorithm);
    console.log('User Role:', req.user.role);

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to generate timetable'
      });
    }

    const generator = new TimetableGenerator();
    
    const result = await generator.generateTimetable({
      algorithm,
      maxIterations,
      semester,
      academicYear
    });

    res.json({
      success: true,
      message: 'Timetable generated successfully',
      data: result
    });

  } catch (error) {
    console.error('Timetable generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate timetable'
    });
  }
});

// Validate existing timetable
router.post('/validate', auth, async (req, res) => {
  try {
    const { timetable } = req.body;

    if (!timetable || !Array.isArray(timetable)) {
      return res.status(400).json({
        success: false,
        error: 'Timetable data is required'
      });
    }

    const generator = new TimetableGenerator();
    const conflicts = generator.validateTimetable(timetable);

    res.json({
      success: true,
      data: {
        isValid: conflicts.length === 0,
        conflicts,
        totalSessions: timetable.length,
        conflictCount: conflicts.length
      }
    });

  } catch (error) {
    console.error('Timetable validation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to validate timetable'
    });
  }
});

// Get timetable by role and filters
router.get('/view', auth, async (req, res) => {
  try {
    const { role, semester, department, teacherId, roomId } = req.query;
    
    // Mock timetable data - in real implementation, fetch from database
    const mockTimetable = [
      {
        id: 'cs101-monday-1',
        courseCode: 'CS101',
        courseName: 'Introduction to Computer Science',
        teacherId: 'T001',
        teacherName: 'Dr. John Smith',
        roomId: 'CS101',
        roomNumber: 'CS101',
        day: 'monday',
        timeSlot: { id: 1, startTime: '08:00', endTime: '09:00', label: '8:00 AM - 9:00 AM' },
        semester: 'fall',
        department: 'Computer Science',
        credits: 3,
        maxStudents: 50,
        sessionType: 'lecture'
      },
      {
        id: 'cs102-monday-2',
        courseCode: 'CS102',
        courseName: 'Programming Fundamentals',
        teacherId: 'T001',
        teacherName: 'Dr. John Smith',
        roomId: 'CS102',
        roomNumber: 'CS102',
        day: 'monday',
        timeSlot: { id: 2, startTime: '09:00', endTime: '10:00', label: '9:00 AM - 10:00 AM' },
        semester: 'fall',
        department: 'Computer Science',
        credits: 4,
        maxStudents: 40,
        sessionType: 'lecture'
      },
      {
        id: 'math101-tuesday-1',
        courseCode: 'MATH101',
        courseName: 'Calculus I',
        teacherId: 'T003',
        teacherName: 'Dr. Robert Johnson',
        roomId: 'MATH201',
        roomNumber: 'MATH201',
        day: 'tuesday',
        timeSlot: { id: 1, startTime: '08:00', endTime: '09:00', label: '8:00 AM - 9:00 AM' },
        semester: 'fall',
        department: 'Mathematics',
        credits: 4,
        maxStudents: 60,
        sessionType: 'lecture'
      }
    ];

    // Filter based on user role and parameters
    let filteredTimetable = mockTimetable;

    if (req.user.role === 'teacher') {
      // Teachers see only their classes
      filteredTimetable = mockTimetable.filter(session => 
        session.teacherId === req.user.userId || 
        session.teacherName.includes(req.user.name)
      );
    } else if (req.user.role === 'student') {
      // Students see their enrolled courses (mock filter by department for now)
      filteredTimetable = mockTimetable.filter(session => 
        session.department === req.user.department
      );
    }

    // Apply additional filters
    if (semester) {
      filteredTimetable = filteredTimetable.filter(session => session.semester === semester);
    }
    if (department) {
      filteredTimetable = filteredTimetable.filter(session => session.department === department);
    }
    if (teacherId) {
      filteredTimetable = filteredTimetable.filter(session => session.teacherId === teacherId);
    }
    if (roomId) {
      filteredTimetable = filteredTimetable.filter(session => session.roomId === roomId);
    }

    res.json({
      success: true,
      data: {
        timetable: filteredTimetable,
        totalSessions: filteredTimetable.length,
        userRole: req.user.role,
        filters: { role, semester, department, teacherId, roomId }
      }
    });

  } catch (error) {
    console.error('Timetable view error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch timetable'
    });
  }
});

// Export timetable
router.get('/export', auth, async (req, res) => {
  try {
    const { format = 'json', semester, department } = req.query;

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to export timetable'
      });
    }

    // Generate export data (mock for now)
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: req.user.name || req.user.email,
        semester: semester || 'fall',
        department: department || 'all',
        format
      },
      timetable: [
        // Mock timetable data
        {
          courseCode: 'CS101',
          courseName: 'Introduction to Computer Science',
          teacherName: 'Dr. John Smith',
          roomNumber: 'CS101',
          day: 'Monday',
          time: '8:00 AM - 9:00 AM',
          department: 'Computer Science'
        }
      ]
    };

    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(exportData.timetable);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=timetable.csv');
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: exportData
      });
    }

  } catch (error) {
    console.error('Timetable export error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export timetable'
    });
  }
});

// Get available time slots
router.get('/timeslots', auth, async (req, res) => {
  try {
    const timeSlots = [
      { id: 1, startTime: '08:00', endTime: '09:00', label: '8:00 AM - 9:00 AM' },
      { id: 2, startTime: '09:00', endTime: '10:00', label: '9:00 AM - 10:00 AM' },
      { id: 3, startTime: '10:00', endTime: '11:00', label: '10:00 AM - 11:00 AM' },
      { id: 4, startTime: '11:00', endTime: '12:00', label: '11:00 AM - 12:00 PM' },
      { id: 5, startTime: '12:00', endTime: '13:00', label: '12:00 PM - 1:00 PM' },
      { id: 6, startTime: '13:00', endTime: '14:00', label: '1:00 PM - 2:00 PM' },
      { id: 7, startTime: '14:00', endTime: '15:00', label: '2:00 PM - 3:00 PM' },
      { id: 8, startTime: '15:00', endTime: '16:00', label: '3:00 PM - 4:00 PM' },
      { id: 9, startTime: '16:00', endTime: '17:00', label: '4:00 PM - 5:00 PM' },
      { id: 10, startTime: '17:00', endTime: '18:00', label: '5:00 PM - 6:00 PM' }
    ];

    res.json({
      success: true,
      data: timeSlots
    });

  } catch (error) {
    console.error('Timeslots fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch time slots'
    });
  }
});

// Helper function to convert data to CSV
function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row).map(value => 
      typeof value === 'string' ? `"${value}"` : value
    ).join(',')
  );
  
  return [headers, ...rows].join('\n');
}

module.exports = router;
