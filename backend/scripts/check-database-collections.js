const mongoose = require('mongoose');
const User = require('../src/models/User');
const Teacher = require('../src/models/Teacher');
const Course = require('../src/models/Course');
const Course = require('../src/models/Course');
const Room = require('../src/models/Room');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/uniflow', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function checkCollections() {
  try {
    console.log('🔍 Checking database collections...\n');
    
    // Check Users
    const users = await User.find({});
    console.log(`👥 Users Collection: ${users.length} records`);
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - Role: ${user.role}`);
    });
    
    console.log('\n📚 Teachers Collection:', (await Teacher.find({})).length, 'records');
    const teachers = await Teacher.find({}).populate('user', 'name email');
    teachers.forEach(teacher => {
      console.log(`   - ${teacher.name} (${teacher.employeeId}) - User: ${teacher.user?.email || 'No user'}`);
    });
    
    console.log('\n📖 Courses Collection:', (await Course.find({})).length, 'records');
    const Courses = await Course.find({});
    Courses.forEach(Course => {
      console.log(`   - ${Course.name} (${Course.coursecode}) - Dept: ${Course.department}`);
    });
    
    console.log('\n📚 Courses Collection:', (await Course.find({})).length, 'records');
    const courses = await Course.find({});
    courses.forEach(course => {
      console.log(`   - ${course.courseName || course.name} (${course.coursecoursecode || course.coursecode}) - Dept: ${course.department}`);
    });
    
    console.log('\n🏫 Rooms Collection:', (await Room.find({})).length, 'records');
    const rooms = await Room.find({});
    rooms.forEach(room => {
      console.log(`   - ${room.roomNumber} - Capacity: ${room.capacity} - Type: ${room.type}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking collections:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔚 Database connection closed');
  }
}

checkCollections();