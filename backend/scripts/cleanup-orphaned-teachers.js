const mongoose = require('mongoose');
const User = require('../src/models/User');
const Teacher = require('../src/models/Teacher');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/uniflow', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function cleanupOrphanedTeachers() {
  try {
    console.log('🔍 Checking for orphaned Teacher records...');
    
    // Get all teachers
    const allTeachers = await Teacher.find({}).populate('user');
    console.log(`📊 Found ${allTeachers.length} teacher records`);
    
    // Find teachers with no associated user or deleted users
    const orphanedTeachers = [];
    
    for (const teacher of allTeachers) {
      if (!teacher.user) {
        orphanedTeachers.push(teacher);
        console.log(`🔴 Orphaned teacher found: ${teacher.name} (ID: ${teacher._id}) - No associated user`);
      }
    }
    
    if (orphanedTeachers.length > 0) {
      console.log(`\n🧹 Found ${orphanedTeachers.length} orphaned teacher record(s). Cleaning up...`);
      
      // Delete orphaned teachers
      const orphanedIds = orphanedTeachers.map(t => t._id);
      const result = await Teacher.deleteMany({ _id: { $in: orphanedIds } });
      
      console.log(`✅ Successfully deleted ${result.deletedCount} orphaned teacher record(s)`);
      
      // List the cleaned up teachers
      orphanedTeachers.forEach(teacher => {
        console.log(`   - Deleted: ${teacher.name} (Employee ID: ${teacher.employeeId})`);
      });
    } else {
      console.log('✅ No orphaned teacher records found');
    }
    
    // Show remaining valid teachers
    const remainingTeachers = await Teacher.find({}).populate('user');
    console.log(`\n📋 Remaining teacher records: ${remainingTeachers.length}`);
    
    remainingTeachers.forEach(teacher => {
      if (teacher.user) {
        console.log(`   - ${teacher.name} (${teacher.employeeId}) - Associated with user: ${teacher.user.email}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔚 Database connection closed');
  }
}

cleanupOrphanedTeachers();