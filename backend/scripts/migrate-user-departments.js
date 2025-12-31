/**
 * Migration Script: Convert User Department Strings to ObjectIds
 * This script converts existing user records that have department as a string
 * to use the new Department ObjectId reference
 */

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Department = require('../src/models/Department');
require('dotenv').config({ path: '../.env' });

// Department name mapping
const DEPARTMENT_NAME_MAP = {
  'Computer Science': 'Computer Science',
  'Information Technology': 'Information Technology',
  'First Year Engineering': 'First Year Engineering',
  'First Year': 'First Year Engineering',
  'IT': 'Information Technology',
  'CS': 'Computer Science',
  'FE': 'First Year Engineering'
};

async function migrateDepartments() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/uniflow', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Fetch all departments
    const departments = await Department.find({});
    console.log(`\n📋 Found ${departments.length} departments:`);
    departments.forEach(dept => {
      console.log(`   - ${dept.name} (${dept.code}) - ID: ${dept._id}`);
    });

    // Create a map of department names to ObjectIds
    const deptMap = {};
    departments.forEach(dept => {
      deptMap[dept.name] = dept._id;
    });

    // Find all users with department field
    const users = await User.find({ department: { $exists: true, $ne: null } }).lean();
    console.log(`\n🔍 Found ${users.length} users with department field`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        const currentDepartment = user.department;
        
        // Check if already an ObjectId
        if (mongoose.Types.ObjectId.isValid(currentDepartment) && 
            String(currentDepartment).match(/^[0-9a-fA-F]{24}$/)) {
          console.log(`⏭️  User ${user.email}: Department already an ObjectId, skipping...`);
          skippedCount++;
          continue;
        }

        // It's a string, convert it
        const normalizedName = DEPARTMENT_NAME_MAP[currentDepartment] || currentDepartment;
        const departmentId = deptMap[normalizedName];

        if (!departmentId) {
          console.log(`❌ User ${user.email}: Could not find department for "${currentDepartment}"`);
          errorCount++;
          continue;
        }

        // Update the user
        await User.updateOne(
          { _id: user._id },
          { $set: { department: departmentId } }
        );

        console.log(`✅ User ${user.email}: Converted "${currentDepartment}" → ${departmentId}`);
        migratedCount++;
      } catch (error) {
        console.error(`❌ Error migrating user ${user.email}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Migrated: ${migratedCount} users`);
    console.log(`   ⏭️  Skipped: ${skippedCount} users (already ObjectId)`);
    console.log(`   ❌ Errors: ${errorCount} users`);
    console.log('='.repeat(60));

    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const usersWithStringDept = await User.find({ 
      department: { $type: 'string' } 
    }).lean();
    
    if (usersWithStringDept.length > 0) {
      console.log(`⚠️  Warning: ${usersWithStringDept.length} users still have string departments:`);
      usersWithStringDept.forEach(u => {
        console.log(`   - ${u.email}: "${u.department}"`);
      });
    } else {
      console.log('✅ All users now have ObjectId departments!');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateDepartments();
