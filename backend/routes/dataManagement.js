const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { auth } = require('../src/middleware/auth');

// Import MongoDB models
const Teacher = require('../src/models/Teacher');
const Course = require('../src/models/Course');
const Room = require('../src/models/Room');
const User = require('../src/models/User');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    // Allow CSV, JSON, and PDF files
    const allowedTypes = ['text/csv', 'application/json', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV, JSON, and PDF files are allowed.'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// ===== TEACHER ROUTES =====

// Get all teachers
router.get('/teachers', auth, async (req, res) => {
  try {
    const teachers = await Teacher.find()
      .populate('user', 'name email')
      .select('-__v')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: teachers,
      total: teachers.length
    });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch teachers'
    });
  }
});

// Add new teacher
router.post('/teachers', auth, async (req, res) => {
  try {
    const {
      name,
      email,
      department,
      title,
      employeeId,
      qualification,
      specialization,
      maxHours,
      experience
    } = req.body;

    // Validate required fields
    if (!name || !email || !department || !employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, department, and employee ID are required'
      });
    }

    // Check if user with this email already exists
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create new user for the teacher
      user = new User({
        name,
        email,
        role: 'teacher',
        password: 'temp123', // Teacher should change this on first login
        isActive: true
      });
      await user.save();
    }

    // Check if teacher with this employee ID already exists
    const existingTeacher = await Teacher.findOne({ employeeId });
    if (existingTeacher) {
      return res.status(400).json({
        success: false,
        error: 'Teacher with this employee ID already exists'
      });
    }

    const newTeacher = new Teacher({
      user: user._id,
      employeeId,
      title: title || 'lecturer',
      department: {
        name: department,
        code: department.substring(0, 3).toUpperCase()
      },
      qualifications: qualification ? [qualification] : ['MSc'],
      specializations: Array.isArray(specialization) ? specialization : [specialization || department],
      workload: {
        maxHoursPerWeek: parseInt(maxHours) || 20,
        currentHours: 0
      },
      experience: {
        totalYears: parseInt(experience) || 1,
        teachingYears: parseInt(experience) || 1
      },
      availability: {
        monday: { isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
        tuesday: { isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
        wednesday: { isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
        thursday: { isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
        friday: { isAvailable: true, timeSlots: [{ start: '09:00', end: '17:00' }] }
      }
    });

    await newTeacher.save();

    // Populate user data for response
    await newTeacher.populate('user', 'name email');

    res.json({
      success: true,
      message: 'Teacher added successfully',
      data: newTeacher
    });
  } catch (error) {
    console.error('Error adding teacher:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add teacher'
    });
  }
});

// ===== ROOM ROUTES =====

// Get all rooms
router.get('/rooms', auth, async (req, res) => {
  try {
    const rooms = await Room.find()
      .select('-__v')
      .sort({ 'building.name': 1, roomNumber: 1 });
    
    res.json({
      success: true,
      data: rooms,
      total: rooms.length
    });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rooms'
    });
  }
});

// Add new room
router.post('/rooms', auth, async (req, res) => {
  try {
    const {
      roomNumber,
      roomName,
      building,
      capacity,
      type,
      equipment,
      isLab,
      floor
    } = req.body;

    // Validate required fields
    if (!roomNumber || !building || !capacity) {
      return res.status(400).json({
        success: false,
        error: 'Room number, building, and capacity are required'
      });
    }

    // Check if room already exists
    const existingRoom = await Room.findOne({ roomNumber });
    if (existingRoom) {
      return res.status(400).json({
        success: false,
        error: 'Room with this number already exists'
      });
    }

    const newRoom = new Room({
      roomNumber,
      roomName: roomName || '',
      building: {
        name: building,
        code: building.substring(0, 3).toUpperCase()
      },
      capacity: parseInt(capacity),
      roomType: type || 'classroom',
      equipment: Array.isArray(equipment) ? equipment : (equipment ? [equipment] : []),
      isLab: Boolean(isLab),
      floor: parseInt(floor) || 1,
      accessibility: {
        wheelchairAccessible: false,
        hearingLoop: false,
        visualAids: false
      },
      availability: {
        monday: { isAvailable: true, timeSlots: [{ start: '08:00', end: '18:00' }], maintenanceScheduled: false },
        tuesday: { isAvailable: true, timeSlots: [{ start: '08:00', end: '18:00' }], maintenanceScheduled: false },
        wednesday: { isAvailable: true, timeSlots: [{ start: '08:00', end: '18:00' }], maintenanceScheduled: false },
        thursday: { isAvailable: true, timeSlots: [{ start: '08:00', end: '18:00' }], maintenanceScheduled: false },
        friday: { isAvailable: true, timeSlots: [{ start: '08:00', end: '18:00' }], maintenanceScheduled: false }
      }
    });

    await newRoom.save();

    res.json({
      success: true,
      message: 'Room added successfully',
      data: newRoom
    });
  } catch (error) {
    console.error('Error adding room:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add room'
    });
  }
});

// ===== COURSE ROUTES =====

// Get all courses
router.get('/courses', auth, async (req, res) => {
  try {
    const courses = await Course.find()
      .select('-__v')
      .sort({ department: 1, courseCode: 1 });
    
    res.json({
      success: true,
      data: courses,
      total: courses.length
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch courses'
    });
  }
});

// Add new course
router.post('/courses', auth, async (req, res) => {
  try {
    const {
      courseCode,
      title,
      description,
      department,
      credits,
      hoursPerWeek,
      semester,
      prerequisites,
      roomRequirements
    } = req.body;

    // Validate required fields
    if (!courseCode || !title || !department || !credits) {
      return res.status(400).json({
        success: false,
        error: 'Course code, title, department, and credits are required'
      });
    }

    // Check if course already exists
    const existingCourse = await Course.findOne({ courseCode: courseCode.toUpperCase() });
    if (existingCourse) {
      return res.status(400).json({
        success: false,
        error: 'Course with this code already exists'
      });
    }

    const newCourse = new Course({
      courseCode: courseCode.toUpperCase(),
      title,
      description: description || `${title} course`,
      department,
      faculty: department, // Assuming department and faculty are same for simplicity
      credits: parseInt(credits),
      duration: {
        hours: parseInt(hoursPerWeek) || parseInt(credits),
        weeks: 16 // Standard semester length
      },
      level: courseCode.match(/\d+/)?.[0] >= 300 ? 'advanced' : courseCode.match(/\d+/)?.[0] >= 200 ? 'intermediate' : 'beginner',
      semester: {
        term: semester || 'fall',
        year: new Date().getFullYear(),
        isActive: true
      },
      prerequisites: Array.isArray(prerequisites) ? prerequisites : (prerequisites ? [prerequisites] : []),
      roomRequirements: {
        type: roomRequirements || 'classroom',
        capacity: 30,
        equipment: []
      },
      assessment: {
        methods: ['exam', 'assignment'],
        weights: { exam: 70, assignment: 30 }
      }
    });

    await newCourse.save();

    res.json({
      success: true,
      message: 'Course added successfully',
      data: newCourse
    });
  } catch (error) {
    console.error('Error adding course:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add course'
    });
  }
});

// ===== CSV UPLOAD ROUTES =====

// Upload teachers CSV
router.post('/teachers/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const results = [];
    const errors = [];
    let processed = 0;
    let successful = 0;

    // Parse CSV
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', async () => {
        // Process each teacher record
        for (const teacherData of results) {
          processed++;
          try {
            const { name, email, department, employeeId, qualification, specialization, maxHours, experience } = teacherData;

            if (!name || !email || !department || !employeeId) {
              errors.push(`Row ${processed}: Missing required fields`);
              continue;
            }

            // Check if user exists
            let user = await User.findOne({ email });
            if (!user) {
              user = new User({
                name,
                email,
                role: 'teacher',
                password: 'temp123',
                isActive: true
              });
              await user.save();
            }

            // Check if teacher exists
            const existingTeacher = await Teacher.findOne({ employeeId });
            if (existingTeacher) {
              errors.push(`Row ${processed}: Teacher with employee ID ${employeeId} already exists`);
              continue;
            }

            const newTeacher = new Teacher({
              user: user._id,
              employeeId,
              title: 'lecturer',
              department: {
                name: department,
                code: department.substring(0, 3).toUpperCase()
              },
              qualifications: qualification ? [qualification] : ['MSc'],
              specializations: Array.isArray(specialization) ? specialization : [specialization || department],
              workload: {
                maxHoursPerWeek: parseInt(maxHours) || 20,
                currentHours: 0
              },
              experience: {
                totalYears: parseInt(experience) || 1,
                teachingYears: parseInt(experience) || 1
              }
            });

            await newTeacher.save();
            successful++;
          } catch (error) {
            errors.push(`Row ${processed}: ${error.message}`);
          }
        }

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
          success: true,
          message: `Successfully processed ${successful}/${processed} teachers`,
          data: {
            processed,
            successful,
            errors
          }
        });
      });
  } catch (error) {
    console.error('Error uploading teachers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload teachers'
    });
  }
});

// ===== TEMPLATE DOWNLOADS =====

// Download teacher template
router.get('/teachers/template', auth, (req, res) => {
  const template = 'name,email,department,employeeId,qualification,specialization,maxHours,experience\n' +
                   'Dr. John Smith,john.smith@university.edu,Computer Science,EMP001,PhD,Programming,20,5\n' +
                   'Prof. Sarah Johnson,sarah.johnson@university.edu,Mathematics,EMP002,PhD,Calculus,18,8';
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=teachers_template.csv');
  res.send(template);
});

// Download room template
router.get('/rooms/template', auth, (req, res) => {
  const template = 'roomNumber,roomName,building,capacity,type,equipment,isLab,floor\n' +
                   'A101,Lecture Hall A,Main Building,100,lecture_hall,Projector;Microphone,false,1\n' +
                   'B205,Computer Lab,Science Building,30,computer_lab,Computers;Projector,true,2';
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=rooms_template.csv');
  res.send(template);
});

// Download course template
router.get('/courses/template', auth, (req, res) => {
  const template = 'courseCode,title,description,department,credits,hoursPerWeek,semester,prerequisites,roomRequirements\n' +
                   'CS101,Programming Fundamentals,Introduction to programming concepts,Computer Science,4,4,fall,,computer_lab\n' +
                   'MATH201,Calculus I,Differential and integral calculus,Mathematics,3,3,fall,MATH101,classroom';
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=courses_template.csv');
  res.send(template);
});

module.exports = router;
