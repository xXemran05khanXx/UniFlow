const mongoose = require('mongoose');
const User = require('../src/models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/uniflow', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function fixTeacherDepartments() {
  try {
    console.log('🔧 Fixing teacher department assignments...\n');
    
    // Get all teacher users
    const teacherUsers = await User.find({ role: 'teacher' });
    console.log(`👥 Found ${teacherUsers.length} teacher users\n`);
    
    // Define department assignments based on email patterns or names
    const departmentAssignments = {
      // Computer Science teachers
      'anjali.mehta@apsit.edu.in': 'Computer Science',
      'rohan.deshpande@apsit.edu.in': 'Computer Science', 
      'amit.patil@apsit.edu.in': 'Computer Science',
      'kunal.sharma@apsit.edu.in': 'Computer Science',
      
      // Information Technology teachers
      'priya.nair@apsit.edu.in': 'Information Technology',
      'neha.kulkarni@apsit.edu.in': 'Information Technology',
      'shruti.joshi@apsit.edu.in': 'Information Technology',
      'vivek.reddy@apsit.edu.in': 'Information Technology',
      
      // First Year teachers
      'rahul.verma@apsit.edu.in': 'First Year',
      'sneha.iyer@apsit.edu.in': 'First Year',
      'divya.singh@apsit.edu.in': 'First Year',
      'suresh.gaikwad@apsit.edu.in': 'First Year'
    };
    
    // Update each teacher user with department
    for (const user of teacherUsers) {
      const assignedDepartment = departmentAssignments[user.email] || 'Computer Science'; // Default fallback
      
      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { 
          department: assignedDepartment,
          employeeId: user.employeeId || `EMP${user._id.toString().slice(-4)}` // Generate if missing
        },
        { new: true }
      );
      
      console.log(`✅ Updated ${user.name} (${user.email}) -> Department: ${assignedDepartment}`);
    }
    
    console.log('\n🎉 All teacher departments have been assigned!');
    
    // Verify the updates
    console.log('\n📋 Verification - Updated teacher users:');
    const updatedTeachers = await User.find({ role: 'teacher' });
    updatedTeachers.forEach(teacher => {
      console.log(`   - ${teacher.name} -> ${teacher.department || 'NOT SET'}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing teacher departments:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔚 Database connection closed');
  }
}

fixTeacherDepartments();