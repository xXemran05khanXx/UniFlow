const mongoose = require('mongoose');
const User = require('../src/models/User');
const Teacher = require('../src/models/Teacher');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/uniflow', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function createTeacherRecords() {
  try {
    console.log('👨‍🏫 Creating Teacher records from existing Users...\n');
    
    // Get all teacher users
    const teacherUsers = await User.find({ role: 'teacher' });
    console.log(`👥 Found ${teacherUsers.length} teacher users\n`);
    
    // Define teacher assignments with departments
    const teacherAssignments = {
      'anjali.mehta@apsit.edu.in': { 
        department: 'Computer Science', 
        designation: 'Professor',
        employeeId: 'CS001',
        qualifications: ['PhD Computer Science', 'MTech Software Engineering']
      },
      'rohan.deshpande@apsit.edu.in': { 
        department: 'Computer Science', 
        designation: 'Associate Professor',
        employeeId: 'CS002',
        qualifications: ['MTech Computer Science', 'BE Computer Engineering']
      },
      'amit.patil@apsit.edu.in': { 
        department: 'Computer Science', 
        designation: 'Assistant Professor',
        employeeId: 'CS003',
        qualifications: ['MTech Computer Science', 'BE Information Technology']
      },
      'kunal.sharma@apsit.edu.in': { 
        department: 'Computer Science', 
        designation: 'Assistant Professor',
        employeeId: 'CS004',
        qualifications: ['MTech Software Engineering', 'BE Computer Science']
      },
      
      'priya.nair@apsit.edu.in': { 
        department: 'Information Technology', 
        designation: 'Associate Professor',
        employeeId: 'IT001',
        qualifications: ['MTech Information Technology', 'BE IT']
      },
      'neha.kulkarni@apsit.edu.in': { 
        department: 'Information Technology', 
        designation: 'Professor',
        employeeId: 'IT002',
        qualifications: ['PhD Information Technology', 'MTech IT']
      },
      'shruti.joshi@apsit.edu.in': { 
        department: 'Information Technology', 
        designation: 'Assistant Professor',
        employeeId: 'IT003',
        qualifications: ['MTech Information Technology', 'BE Computer Science']
      },
      'vivek.reddy@apsit.edu.in': { 
        department: 'Information Technology', 
        designation: 'Assistant Professor',
        employeeId: 'IT004',
        qualifications: ['MTech Information Technology', 'BE IT']
      },
      
      'rahul.verma@apsit.edu.in': { 
        department: 'First Year', 
        designation: 'Lecturer',
        employeeId: 'FY001',
        qualifications: ['MSc Mathematics', 'BSc Mathematics']
      },
      'sneha.iyer@apsit.edu.in': { 
        department: 'First Year', 
        designation: 'Lecturer',
        employeeId: 'FY002',
        qualifications: ['MSc Physics', 'BSc Physics']
      },
      'divya.singh@apsit.edu.in': { 
        department: 'First Year', 
        designation: 'Lecturer',
        employeeId: 'FY003',
        qualifications: ['MSc Chemistry', 'BSc Chemistry']
      },
      'suresh.gaikwad@apsit.edu.in': { 
        department: 'First Year', 
        designation: 'Associate Professor',
        employeeId: 'FY004',
        qualifications: ['MSc Engineering Mechanics', 'BE Mechanical']
      }
    };
    
    // Clear existing Teacher records to avoid duplicates
    await Teacher.deleteMany({});
    console.log('🗑️ Cleared existing Teacher records\n');
    
    // Create Teacher records for each user
    for (const user of teacherUsers) {
      const assignment = teacherAssignments[user.email];
      
      if (assignment) {
        const teacherData = {
          name: user.name,
          employeeId: assignment.employeeId,
          user: user._id,
          department: assignment.department,
          designation: assignment.designation,
          qualifications: assignment.qualifications,
          contactInfo: {
            email: user.email,
            staffRoom: `Room ${assignment.employeeId.slice(-3)}`
          },
          workload: {
            maxHoursPerWeek: 18,
            minHoursPerWeek: 8
          },
          availability: [
            { dayOfWeek: 'Monday', startTime: '09:00', endTime: '17:00' },
            { dayOfWeek: 'Tuesday', startTime: '09:00', endTime: '17:00' },
            { dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '17:00' },
            { dayOfWeek: 'Thursday', startTime: '09:00', endTime: '17:00' },
            { dayOfWeek: 'Friday', startTime: '09:00', endTime: '17:00' }
          ]
        };
        
        const teacher = new Teacher(teacherData);
        await teacher.save();
        
        console.log(`✅ Created Teacher record: ${user.name} (${assignment.employeeId}) - ${assignment.department}`);
      } else {
        console.log(`⚠️  No assignment found for: ${user.email}`);
      }
    }
    
    console.log('\n🎉 All Teacher records have been created!');
    
    // Verify the Teacher records
    console.log('\n📋 Verification - Created teachers:');
    const teachers = await Teacher.find({}).populate('user', 'name email');
    teachers.forEach(teacher => {
      console.log(`   - ${teacher.name} (${teacher.employeeId}) -> ${teacher.department} -> User: ${teacher.user?.email}`);
    });
    
  } catch (error) {
    console.error('❌ Error creating teacher records:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔚 Database connection closed');
  }
}

createTeacherRecords();