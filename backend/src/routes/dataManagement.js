const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { auth } = require('../middleware/auth');

// Import MongoDB models
const Teacher = require('../models/Teacher');
const Course = require('../models/Course');
const Room = require('../models/Room');
const User = require('../models/User');

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
      designation,
      employeeId,
      qualifications,
      staffRoom,
      maxHoursPerWeek,
      minHoursPerWeek,
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
      name,
      department,
      designation: designation || 'Assistant Professor',
      qualifications: Array.isArray(qualifications) ? qualifications : (qualifications ? [qualifications] : []),
      contactInfo: {
        staffRoom: staffRoom || ''
      },
      workload: {
        maxHoursPerWeek: parseInt(maxHoursPerWeek) || 18,
        minHoursPerWeek: parseInt(minHoursPerWeek) || 8
      },
      availability: [
        { dayOfWeek: 'Monday', startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 'Tuesday', startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 'Thursday', startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 'Friday', startTime: '09:00', endTime: '17:00' }
      ]
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
      courseName,
      description,
      department,
      credits,
      hoursPerWeek,
      semester,
      courseType,
      syllabus,
      prerequisites,
      roomRequirements
    } = req.body;

    // Validate required fields
    if (!courseCode || !courseName || !department || !credits) {
      return res.status(400).json({
        success: false,
        error: 'Course code, course name, department, and credits are required'
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
      courseName,
      department,
      semester: parseInt(semester) || 1,
      courseType: courseType || 'Theory',
      credits: parseInt(credits),
      hoursPerWeek: parseInt(hoursPerWeek) || parseInt(credits),
      syllabus: syllabus || { topics: [], syllabusLink: '' }
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
  console.log('📁 Teacher CSV upload started');
  console.log('File received:', req.file ? 'Yes' : 'No');
  
  try {
    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    console.log('📄 File details:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: req.file.path,
      size: req.file.size
    });

    const results = [];
    const errors = [];
    let processed = 0;
    let successful = 0;

    // Parse CSV
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        console.log('📊 CSV row data:', data);
        results.push(data);
      })
      .on('end', async () => {
        console.log(`🔄 Processing ${results.length} CSV rows`);
        
        // Process each teacher record
        for (const teacherData of results) {
          processed++;
          console.log(`📝 Processing row ${processed}:`, teacherData);
          
          try {
            const { 
              name, 
              email, 
              department, 
              employeeId, 
              designation,
              qualifications, 
              staffRoom,
              maxHoursPerWeek,
              minHoursPerWeek
            } = teacherData;

            if (!name || !email || !department || !employeeId) {
              console.log(`❌ Row ${processed}: Missing required fields`);
              errors.push(`Row ${processed}: Missing required fields (name, email, department, employeeId)`);
              continue;
            }

            // Validate department
            const validDepartments = ['Computer', 'IT', 'EXTC', 'Mechanical', 'Civil', 'AI & DS', 'First Year'];
            if (!validDepartments.includes(department)) {
              errors.push(`Row ${processed}: Invalid department "${department}". Must be one of: ${validDepartments.join(', ')}`);
              continue;
            }

            // Validate designation
            const validDesignations = ['Professor', 'Associate Professor', 'Assistant Professor'];
            const teacherDesignation = designation || 'Assistant Professor';
            if (!validDesignations.includes(teacherDesignation)) {
              errors.push(`Row ${processed}: Invalid designation "${teacherDesignation}". Must be one of: ${validDesignations.join(', ')}`);
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

            // Parse qualifications (can be comma-separated string)
            let qualificationsArray = [];
            if (qualifications) {
              if (typeof qualifications === 'string') {
                qualificationsArray = qualifications.split(',').map(q => q.trim()).filter(q => q);
              } else if (Array.isArray(qualifications)) {
                qualificationsArray = qualifications;
              }
            }

            const newTeacher = new Teacher({
              user: user._id,
              employeeId,
              name,
              department,
              designation: teacherDesignation,
              qualifications: qualificationsArray,
              contactInfo: {
                staffRoom: staffRoom || ''
              },
              workload: {
                maxHoursPerWeek: parseInt(maxHoursPerWeek) || 18,
                minHoursPerWeek: parseInt(minHoursPerWeek) || 8
              },
              availability: [
                { dayOfWeek: 'Monday', startTime: '09:00', endTime: '17:00' },
                { dayOfWeek: 'Tuesday', startTime: '09:00', endTime: '17:00' },
                { dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '17:00' },
                { dayOfWeek: 'Thursday', startTime: '09:00', endTime: '17:00' },
                { dayOfWeek: 'Friday', startTime: '09:00', endTime: '17:00' }
              ]
            });

            console.log(`💾 Saving teacher: ${name} (${employeeId})`);
            await newTeacher.save();
            console.log(`✅ Successfully saved teacher: ${name}`);
            successful++;
          } catch (error) {
            console.log(`❌ Error saving teacher row ${processed}:`, error.message);
            errors.push(`Row ${processed}: ${error.message}`);
          }
        }

        console.log(`📈 Upload summary: ${successful}/${processed} teachers processed successfully`);
        console.log('🗂️ Errors:', errors);

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        const responseData = {
          success: true,
          message: `Successfully processed ${successful}/${processed} teachers`,
          data: {
            processed,
            successful,
            errors
          }
        };

        console.log('📤 Sending response:', responseData);
        res.json(responseData);
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
  const template = 'name,email,department,employeeId,designation,qualifications,staffRoom,maxHoursPerWeek,minHoursPerWeek\n' +
                   'Dr. Rajesh Kumar,rajesh.kumar@university.edu,Computer Science,CS001,Professor,"PhD Computer Science, MTech Software Engineering",Room 101,18,8\n' +
                   'Prof. Priya Sharma,priya.sharma@university.edu,Information Technology,IT002,Associate Professor,"MSc Information Technology, BTech IT",Room 102,20,10\n' +
                   'Dr. Amit Patel,amit.patel@university.edu,Computer Science,CS003,Assistant Professor,"PhD Computer Science, BE Computer Engineering",Room 201,16,8\n' +
                   'Prof. Sunita Verma,sunita.verma@university.edu,Information Technology,IT004,Associate Professor,"MTech Information Technology, BE IT",Room 202,18,10\n' +
                   'Dr. Vikram Singh,vikram.singh@university.edu,Computer Science,CS005,Professor,"PhD Computer Science, MTech Computer Engineering",Room 301,20,12\n' +
                   'Ms. Kavya Reddy,kavya.reddy@university.edu,Information Technology,IT006,Assistant Professor,"MSc Data Science, BTech Computer Science",Room 401,16,8\n' +
                   'Prof. Ramesh Gupta,ramesh.gupta@university.edu,First Year,FY007,Lecturer,"MSc Mathematics, BSc Mathematics",Room 501,22,14';
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=teachers_template.csv');
  res.send(template);
});

// Download room template
router.get('/rooms/template', auth, (req, res) => {
  const template = 'roomNumber,roomName,building,capacity,type,equipment,isLab,floor\n' +
                   'A101,Theory Classroom,Main Building,60,Theory Classroom,Projector;Microphone,false,1\n' +
                   'B201,Computer Lab,CS Building,30,Computer Lab,Computers;Projector,true,2\n' +
                   'C301,IT Lab,IT Building,35,IT Lab,Computers;Network Equipment,true,3\n' +
                   'D401,Seminar Hall,Main Building,80,Seminar Hall,Projector;Audio System,false,4';
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=rooms_template.csv');
  res.send(template);
});

// Download course template
router.get('/courses/template', auth, (req, res) => {
  const template = 'courseCode,title,description,department,credits,hoursPerWeek,semester,prerequisites,roomRequirements\n' +
                   'CS101,Programming Fundamentals,Introduction to programming concepts,Computer Science,4,4,1,,Computer Lab\n' +
                   'IT201,Database Management,Database design and implementation,Information Technology,3,3,3,CS101,IT Lab\n' +
                   'MATH101,Engineering Mathematics I,Calculus and linear algebra,First Year,4,4,1,,Theory Classroom\n' +
                   'CS301,Data Structures,Advanced data structures and algorithms,Computer Science,4,5,5,CS101,Computer Lab';
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=courses_template.csv');
  res.send(template);
});

module.exports = router;
