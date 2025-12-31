/**
 * Migration: Convert Teacher string departments to ObjectId references
 * This updates the legacy 'department' field in Teacher model
 */

const mongoose = require('mongoose');
const Department = require('../src/models/Department');
require('dotenv').config({ path: '../.env' });

const DEPARTMENT_NAME_MAP = {
  'Computer Science': 'Computer Science',
  'Information Technology': 'Information Technology',
  'First Year Engineering': 'First Year Engineering',
  'First Year': 'First Year Engineering',
  'IT': 'Information Technology',
  'CS': 'Computer Science',
  'FE': 'First Year Engineering'
};

async function migrateTeachers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/uniflow', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Fetch all departments
    const departments = await Department.find({});
    console.log(`\n📋 Found ${departments.length} departments:`);
    const deptMap = {};
    departments.forEach(dept => {
      console.log(`   - ${dept.name} (${dept.code}) - ID: ${dept._id}`);
      deptMap[dept.name] = dept._id;
    });

    // Get teachers collection directly
    const db = mongoose.connection.db;
    const teachersCollection = db.collection('teachers');
    
    const teachersWithStringDept = await teachersCollection.find({
      department: { $type: 'string' }
    }).toArray();

    console.log(`\n🔍 Found ${teachersWithStringDept.length} teachers with string departments\n`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const teacher of teachersWithStringDept) {
      try {
        const normalizedName = DEPARTMENT_NAME_MAP[teacher.department] || teacher.department;
        const departmentId = deptMap[normalizedName];

        if (!departmentId) {
          console.log(`❌ Teacher ${teacher.name}: Could not find department for "${teacher.department}"`);
          errorCount++;
          continue;
        }

        // Update: remove the string 'department' field since we have primaryDepartment
        await teachersCollection.updateOne(
          { _id: teacher._id },
          { 
            $unset: { department: "" },  // Remove legacy field
            $set: { 
              primaryDepartment: departmentId,
              // Also add to allowedDepartments if not already there
              allowedDepartments: [departmentId]
            }
          }
        );

        console.log(`✅ Teacher ${teacher.name}: Removed legacy department field, set primaryDepartment to ${normalizedName}`);
        migratedCount++;
      } catch (error) {
        console.error(`❌ Error migrating teacher ${teacher.name}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Migrated: ${migratedCount} teachers`);
    console.log(`   ❌ Errors: ${errorCount} teachers`);
    console.log('='.repeat(60));

    // Verify
    const stillHaveStringDept = await teachersCollection.find({
      department: { $type: 'string' }
    }).toArray();

    if (stillHaveStringDept.length > 0) {
      console.log(`\n⚠️  Warning: ${stillHaveStringDept.length} teachers still have string departments`);
    } else {
      console.log('\n✅ All teachers migrated successfully!');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateTeachers();
