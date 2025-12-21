/**
 * Script to seed departments in the database
 * Run this script to create the three required departments: IT, CS, FE
 */

const mongoose = require('mongoose');
const Department = require('../src/models/Department');
require('dotenv').config({ path: '../.env' });

const departments = [
  {
    code: 'IT',
    name: 'Information Technology',
    description: 'Department of Information Technology - Focuses on software development, networking, and IT infrastructure',
    isActive: true
  },
  {
    code: 'CS',
    name: 'Computer Science',
    description: 'Department of Computer Science - Covers algorithms, data structures, AI, and theoretical computer science',
    isActive: true
  },
  {
    code: 'FE',
    name: 'First Year Engineering',
    description: 'First Year Engineering - Common foundation year for all engineering students',
    isActive: true
  }
];

async function seedDepartments() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/uniflow', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing departments (optional - comment out if you want to keep existing data)
    // await Department.deleteMany({});
    // console.log('🗑️  Cleared existing departments');

    // Insert departments
    for (const dept of departments) {
      const existing = await Department.findOne({ code: dept.code });
      if (existing) {
        console.log(`⏭️  Department ${dept.code} already exists, skipping...`);
      } else {
        await Department.create(dept);
        console.log(`✅ Created department: ${dept.name} (${dept.code})`);
      }
    }

    console.log('\n✅ Departments seeded successfully!');
    
    // Display all departments
    const allDepts = await Department.find({});
    console.log('\n📋 Current departments in database:');
    allDepts.forEach(dept => {
      console.log(`   - ${dept.name} (${dept.code}) - ID: ${dept._id}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding departments:', error);
    process.exit(1);
  }
}

seedDepartments();
