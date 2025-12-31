const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { auth } = require('../middleware/auth');

// Import MongoDB models
const Course = require('../models/Course');
const Room = require('../models/Room');
const User = require('../models/User');
const Department = require('../models/Department');

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

// Debug endpoint to check departments
router.get('/debug/departments', auth, async (req, res) => {
  try {
    const departments = await Department.find({});
    res.json({
      success: true,
      count: departments.length,
      departments: departments.map(d => ({ id: d._id, code: d.code, name: d.name }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== TEACHER ROUTES =====

// Get all teachers
router.get('/teachers', auth, async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' })
      .select('-password -resetPasswordToken -emailVerificationToken -__v')
      .populate('department', 'code name')
      .populate('allowedDepartments', 'code name')
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
      password = 'teacher123', // Default password
      department,
      designation,
      employeeId,
      qualifications,
      staffRoom,
      maxHoursPerWeek,
      minHoursPerWeek,
      allowedDepartments
    } = req.body;

    // Validate required fields
    if (!name || !email || !department || !employeeId || !designation) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, department, employee ID, and designation are required'
      });
    }

    // Check if user with this email or employeeId already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { employeeId }]
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email or employee ID already exists'
      });
    }

    // Convert department name to ObjectId
    let departmentId = department;
    if (!department.match(/^[0-9a-fA-F]{24}$/)) {
      // Debug: Log what we're searching for
      console.log('🔍 Searching for department:', department);
      
      // First try exact match on code (most common case: IT, CS, FE)
      let deptDoc = await Department.findOne({ code: department.toUpperCase() });
      
      // If not found by code, try by name
      if (!deptDoc) {
        deptDoc = await Department.findOne({ 
          name: { $regex: new RegExp(`^${department}$`, 'i') }
        });
      }
      
      // Debug: Log available departments
      if (!deptDoc) {
        const allDepts = await Department.find({});
        console.log('📋 All departments in DB:', allDepts.map(d => ({ code: d.code, name: d.name })));
        
        const deptList = allDepts.length > 0 
          ? allDepts.map(d => `${d.code} (${d.name})`).join(', ')
          : 'No departments found in database. Please run seed-departments.js script.';
        return res.status(400).json({
          success: false,
          error: `Invalid department: ${department}. Valid departments are: ${deptList}`
        });
      }
      
      console.log('✅ Found department:', deptDoc.code, deptDoc.name);
      departmentId = deptDoc._id;
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create teacher user
    const newTeacher = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'teacher',
      department: departmentId,
      employeeId,
      designation,
      qualifications: Array.isArray(qualifications) ? qualifications : (qualifications ? [qualifications] : []),
      staffRoom: staffRoom || '',
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
      ],
      allowedDepartments: allowedDepartments || [],
      isActive: true,
      isEmailVerified: true
    });

    await newTeacher.save();

    // Populate department for response
    await newTeacher.populate('department', 'code name');

    // Remove password from response
    const teacherResponse = newTeacher.toObject();
    delete teacherResponse.password;

    res.json({
      success: true,
      message: 'Teacher added successfully',
      data: teacherResponse
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
      .populate('department', 'code name')
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

    // Convert department code/name to ObjectId
    let departmentId = department;
    if (department && !department.match(/^[0-9a-fA-F]{24}$/)) {
      const escapedDept = department.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const deptDoc = await Department.findOne({
        $or: [
          { name: { $regex: new RegExp(`^${escapedDept}$`, 'i') } },
          { code: { $regex: new RegExp(`^${escapedDept}$`, 'i') } }
        ]
      });
      if (!deptDoc) {
        return res.status(400).json({
          success: false,
          error: `Invalid department: ${department}`
        });
      }
      departmentId = deptDoc._id;
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
      department: departmentId,
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

// Helper function to clean BOM and whitespace from CSV keys
const cleanCsvRow = (row) => {
  const cleaned = {};
  for (const key of Object.keys(row)) {
    // Remove BOM character (\ufeff) and trim whitespace from keys
    const cleanKey = key.replace(/^\ufeff/, '').trim().toLowerCase();
    cleaned[cleanKey] = row[key];
  }
  return cleaned;
};

// Upload teachers CSV
router.post('/teachers/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    console.log('📁 Processing uploaded file:', req.file.path);

    // Parse CSV file into array using Promise
    const results = await new Promise((resolve, reject) => {
      const data = [];
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => {
          // Clean BOM and whitespace from keys
          const cleanedRow = cleanCsvRow(row);
          console.log('📄 CSV Row (cleaned):', cleanedRow);
          data.push(cleanedRow);
        })
        .on('end', () => {
          console.log(`✅ CSV parsing complete. Found ${data.length} rows.`);
          resolve(data);
        })
        .on('error', (error) => {
          console.error('❌ CSV parsing error:', error);
          reject(error);
        });
    });

    const errors = [];
    let processed = 0;
    let successful = 0;

    // Process each teacher record
    for (const teacherData of results) {
      processed++;
      try {
        // All keys are now lowercase after cleaning
        const name = teacherData.name;
        const email = teacherData.email;
        const password = teacherData.password;
        const deptCode = teacherData.department;
        const semester = teacherData.semester;
        const employeeId = teacherData.employeeid; // lowercase after cleaning
        const designation = teacherData.designation;
        const qualifications = teacherData.qualifications;
        const staffRoom = teacherData.staffroom; // lowercase after cleaning
        const maxHoursPerWeek = teacherData.maxhoursperweek; // lowercase after cleaning
        const minHoursPerWeek = teacherData.minhoursperweek; // lowercase after cleaning

        console.log(`👤 Processing row ${processed}:`, { name, email, deptCode, semester, employeeId });

        if (!name || !email || !deptCode || !employeeId || !semester) {
          errors.push(`Row ${processed}: Missing required fields (name, email, department, semester, employeeId)`);
          console.log(`⚠️ Row ${processed}: Missing required fields`);
          continue;
        }

        // Find department by code or name
        const escapedDept = deptCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const department = await Department.findOne({
          $or: [
            { name: { $regex: new RegExp(`^${escapedDept}$`, 'i') } },
            { code: { $regex: new RegExp(`^${escapedDept}$`, 'i') } }
          ]
        });
        
        if (!department) {
          errors.push(`Row ${processed}: Department '${deptCode}' not found`);
          console.log(`⚠️ Row ${processed}: Department '${deptCode}' not found`);
          continue;
        }

        console.log(`✅ Found department: ${department.name} (${department._id})`);

        // Check if teacher user exists
        const existingTeacher = await User.findOne({ 
          $or: [{ email: email.toLowerCase() }, { employeeId }]
        });
        
        if (existingTeacher) {
          errors.push(`Row ${processed}: Teacher with email '${email}' or employee ID '${employeeId}' already exists`);
          console.log(`⚠️ Row ${processed}: Teacher already exists`);
          continue;
        }

        // Validate designation
        const validDesignations = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer'];
        const finalDesignation = validDesignations.includes(designation) ? designation : 'Lecturer';

        // Parse qualifications (semicolon separated)
        const qualsList = qualifications 
          ? qualifications.split(';').map(q => q.trim()).filter(q => q) 
          : [];

        // Create new teacher user (password will be hashed by pre-save hook)
        const newTeacher = new User({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password: password || 'teacher123',
          role: 'teacher',
          isActive: true,
          isEmailVerified: true,
          employeeId: employeeId.trim(),
          department: department._id,
          semester: parseInt(semester),
          designation: finalDesignation,
          qualifications: qualsList,
          staffRoom: staffRoom ? staffRoom.trim() : '',
          workload: {
            maxHoursPerWeek: parseInt(maxHoursPerWeek) || 18,
            minHoursPerWeek: parseInt(minHoursPerWeek) || 8
          }
        });

        await newTeacher.save();
        console.log(`✅ Row ${processed}: Teacher '${name}' created successfully`);
        successful++;
      } catch (error) {
        errors.push(`Row ${processed}: ${error.message}`);
        console.error(`❌ Row ${processed}: Error -`, error.message);
      }
    }

    // Clean up uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {
      console.warn('Could not delete temp file:', e.message);
    }

    console.log(`📊 Final result: ${successful}/${processed} teachers created`);
    if (errors.length > 0) {
      console.log('📋 Errors:', errors);
    }

    res.json({
      success: true,
      message: `Successfully processed ${successful}/${processed} teachers`,
      data: {
        processed,
        successful,
        errors
      }
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
  const template = 'name,email,password,department,semester,employeeId,designation,qualifications,staffRoom,maxHoursPerWeek,minHoursPerWeek\n' +
                   'Dr. Rajesh Kumar,rajesh.kumar@university.edu,password123,IT,1,EMP001,Professor,"PhD Computer Science; MTech Software Engineering",Room 101,18,8\n' +
                   'Prof. Priya Sharma,priya.sharma@university.edu,password123,CS,2,EMP002,Associate Professor,"MSc Information Technology; BTech IT",Room 102,20,10\n' +
                   'Dr. Amit Patel,amit.patel@university.edu,password123,FE,1,EMP003,Assistant Professor,"PhD Electronics; BE Electronics",Room 201,16,8\n' +
                   'Ms. Kavya Reddy,kavya.reddy@university.edu,password123,IT,3,EMP004,Lecturer,"MSc Data Science; BTech Computer Science",Room 401,16,8';
  
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
