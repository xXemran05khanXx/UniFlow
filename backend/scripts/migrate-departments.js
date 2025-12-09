/**
 * Migration Script: Department Model Migration
 * 
 * This script:
 * 1. Seeds the 3 default departments (IT, CS, FE) if they don't exist
 * 2. Migrates existing string-based department fields to ObjectId references
 * 3. Updates Users, Teachers, Courses, Subjects, and Rooms
 * 
 * Run this script once after deploying the department model changes
 * 
 * Usage: node backend/scripts/migrate-departments.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Import models
const Department = require('../src/models/Department');
const User = require('../src/models/User');
const Teacher = require('../src/models/Teacher');
const Course = require('../src/models/Course');
const Subject = require('../src/models/Subject');
const Room = require('../src/models/Room');

// Department mapping
const DEPARTMENT_MAP = {
  'Computer Science': { code: 'CS', name: 'Computer Science' },
  'Information Technology': { code: 'IT', name: 'Information Technology' },
  'First Year': { code: 'FE', name: 'First Year Engineering' },
  'First Year Engineering': { code: 'FE', name: 'First Year Engineering' }
};

// Connect to database
async function connectDB() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/uniflow';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Seed departments
async function seedDepartments() {
  console.log('\n📦 Seeding departments...');
  
  const departments = [
    {
      code: 'IT',
      name: 'Information Technology',
      description: 'Information Technology department offering courses in software development, networking, and IT infrastructure.',
      isActive: true
    },
    {
      code: 'CS',
      name: 'Computer Science',
      description: 'Computer Science department focusing on algorithms, data structures, AI, and theoretical computer science.',
      isActive: true
    },
    {
      code: 'FE',
      name: 'First Year Engineering',
      description: 'Common department for first-year engineering students (Semester 1-2) from IT and CS branches.',
      isActive: true
    }
  ];

  const createdDepts = {};
  
  for (const dept of departments) {
    try {
      const existing = await Department.findOne({ code: dept.code });
      
      if (existing) {
        console.log(`   ⚠️  Department ${dept.code} already exists, skipping...`);
        createdDepts[dept.code] = existing;
      } else {
        const newDept = await Department.create(dept);
        console.log(`   ✅ Created department: ${dept.code} - ${dept.name}`);
        createdDepts[dept.code] = newDept;
      }
    } catch (error) {
      console.error(`   ❌ Error creating department ${dept.code}:`, error.message);
    }
  }
  
  return createdDepts;
}

// Migrate Users
async function migrateUsers(departments) {
  console.log('\n👥 Migrating Users...');
  
  const users = await User.find({ 
    role: { $in: ['student', 'teacher'] },
    department: { $exists: false }
  });
  
  console.log(`   Found ${users.length} users to migrate`);
  
  let migratedCount = 0;
  let skippedCount = 0;
  
  for (const user of users) {
    // Users don't have a legacy department field, so we'll skip for now
    // They will be assigned departments when teachers are migrated or manually updated
    skippedCount++;
  }
  
  console.log(`   ✅ Migrated: ${migratedCount}, Skipped: ${skippedCount}`);
  return { migratedCount, skippedCount };
}

// Migrate Teachers
async function migrateTeachers(departments) {
  console.log('\n👨‍🏫 Migrating Teachers...');
  
  const teachers = await Teacher.find({ 
    primaryDepartment: { $exists: false },
    department: { $exists: true }
  });
  
  console.log(`   Found ${teachers.length} teachers to migrate`);
  
  let migratedCount = 0;
  let errorCount = 0;
  
  for (const teacher of teachers) {
    try {
      const deptInfo = DEPARTMENT_MAP[teacher.department];
      
      if (deptInfo) {
        const dept = departments[deptInfo.code];
        
        if (dept) {
          teacher.primaryDepartment = dept._id;
          teacher.allowedDepartments = [];
          
          // FE teachers can also teach IT and CS (cross-teaching)
          if (deptInfo.code === 'FE') {
            teacher.allowedDepartments = [
              departments['IT']._id,
              departments['CS']._id
            ];
          }
          
          await teacher.save();
          migratedCount++;
          console.log(`   ✅ Migrated teacher ${teacher.name}: ${teacher.department} -> ${deptInfo.code}`);
        }
      } else {
        console.log(`   ⚠️  Unknown department for teacher ${teacher.name}: ${teacher.department}`);
        errorCount++;
      }
    } catch (error) {
      console.error(`   ❌ Error migrating teacher ${teacher._id}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`   ✅ Migrated: ${migratedCount}, Errors: ${errorCount}`);
  return { migratedCount, errorCount };
}

// Migrate Courses
async function migrateCourses(departments) {
  console.log('\n📚 Migrating Courses...');
  
  const courses = await Course.find({
    department: { $type: 'string' } // Only string-type departments
  });
  
  console.log(`   Found ${courses.length} courses to migrate`);
  
  let migratedCount = 0;
  let errorCount = 0;
  
  for (const course of courses) {
    try {
      const deptInfo = DEPARTMENT_MAP[course.department];
      
      if (deptInfo) {
        const dept = departments[deptInfo.code];
        
        if (dept) {
          course.departmentLegacy = course.department; // Save old value
          course.department = dept._id; // Set new ObjectId reference
          
          await course.save();
          migratedCount++;
          console.log(`   ✅ Migrated course ${course.courseCode}: ${course.departmentLegacy} -> ${deptInfo.code}`);
        }
      } else {
        console.log(`   ⚠️  Unknown department for course ${course.courseCode}: ${course.department}`);
        errorCount++;
      }
    } catch (error) {
      console.error(`   ❌ Error migrating course ${course._id}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`   ✅ Migrated: ${migratedCount}, Errors: ${errorCount}`);
  return { migratedCount, errorCount };
}

// Migrate Subjects
async function migrateSubjects(departments) {
  console.log('\n📖 Migrating Subjects...');
  
  const subjects = await Subject.find({
    department: { $type: 'string' } // Only string-type departments
  });
  
  console.log(`   Found ${subjects.length} subjects to migrate`);
  
  let migratedCount = 0;
  let errorCount = 0;
  
  for (const subject of subjects) {
    try {
      const deptInfo = DEPARTMENT_MAP[subject.department];
      
      if (deptInfo) {
        const dept = departments[deptInfo.code];
        
        if (dept) {
          subject.departmentLegacy = subject.department; // Save old value
          subject.department = dept._id; // Set new ObjectId reference
          
          await subject.save();
          migratedCount++;
          console.log(`   ✅ Migrated subject ${subject.code}: ${subject.departmentLegacy} -> ${deptInfo.code}`);
        }
      } else {
        console.log(`   ⚠️  Unknown department for subject ${subject.code}: ${subject.department}`);
        errorCount++;
      }
    } catch (error) {
      console.error(`   ❌ Error migrating subject ${subject._id}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`   ✅ Migrated: ${migratedCount}, Errors: ${errorCount}`);
  return { migratedCount, errorCount };
}

// Migrate Rooms
async function migrateRooms(departments) {
  console.log('\n🏫 Migrating Rooms...');
  
  const rooms = await Room.find({
    department: { $type: 'string', $in: Object.keys(DEPARTMENT_MAP) }
  });
  
  console.log(`   Found ${rooms.length} rooms to migrate`);
  
  let migratedCount = 0;
  let errorCount = 0;
  
  for (const room of rooms) {
    try {
      const deptInfo = DEPARTMENT_MAP[room.department];
      
      if (deptInfo) {
        const dept = departments[deptInfo.code];
        
        if (dept) {
          room.departmentLegacy = room.department; // Save old value
          room.department = dept._id; // Set new ObjectId reference
          
          await room.save();
          migratedCount++;
          console.log(`   ✅ Migrated room ${room.roomNumber}: ${room.departmentLegacy} -> ${deptInfo.code}`);
        }
      } else {
        console.log(`   ⚠️  Skipping room ${room.roomNumber}: ${room.department} (not in IT/CS/FE)`);
      }
    } catch (error) {
      console.error(`   ❌ Error migrating room ${room._id}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`   ✅ Migrated: ${migratedCount}, Errors: ${errorCount}`);
  return { migratedCount, errorCount };
}

// Main migration function
async function runMigration() {
  console.log('🚀 Starting Department Migration...\n');
  console.log('=' .repeat(60));
  
  try {
    await connectDB();
    
    // Step 1: Seed departments
    const departments = await seedDepartments();
    
    // Step 2: Migrate all models
    const userStats = await migrateUsers(departments);
    const teacherStats = await migrateTeachers(departments);
    const courseStats = await migrateCourses(departments);
    const subjectStats = await migrateSubjects(departments);
    const roomStats = await migrateRooms(departments);
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('=' .repeat(60));
    console.log(`   Departments created: ${Object.keys(departments).length}`);
    console.log(`   Users migrated: ${userStats.migratedCount}`);
    console.log(`   Teachers migrated: ${teacherStats.migratedCount}`);
    console.log(`   Courses migrated: ${courseStats.migratedCount}`);
    console.log(`   Subjects migrated: ${subjectStats.migratedCount}`);
    console.log(`   Rooms migrated: ${roomStats.migratedCount}`);
    console.log('=' .repeat(60));
    console.log('✅ Migration completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration, seedDepartments };
