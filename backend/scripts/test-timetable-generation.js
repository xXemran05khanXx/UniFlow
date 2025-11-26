const mongoose = require('mongoose');
const TimetableGenerator = require('../src/services/timetable/TimetableGenerator');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/uniflow', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testTimetableGeneration() {
  try {
    console.log('🚀 Testing Semester-wise Timetable Generation...\n');
    
    // Initialize the generator
    const generator = new TimetableGenerator();
    
    // Test semester 1 timetable generation
    console.log('📚 Generating timetable for Semester 1...');
    const semester1Result = await generator.generateTimetable({
      algorithm: 'greedy',
      semester: 1,
      academicYear: 2025
    });
    
    console.log('\n📋 Semester 1 Results:');
    console.log(`✅ Success: ${semester1Result.success}`);
    console.log(`📊 Total Sessions: ${semester1Result.metadata.totalSessions}`);
    console.log(`🎯 Quality Score: ${semester1Result.metrics.qualityScore}/100`);
    console.log(`📈 Scheduling Rate: ${semester1Result.metrics.schedulingRate}%`);
    console.log(`⚠️  Conflicts: ${semester1Result.conflicts.length}`);
    
    if (semester1Result.conflicts.length > 0) {
      console.log('\n⚠️  Semester 1 Conflicts:');
      semester1Result.conflicts.slice(0, 5).forEach((conflict, index) => {
        console.log(`   ${index + 1}. ${conflict.type}: ${conflict.message}`);
      });
      if (semester1Result.conflicts.length > 5) {
        console.log(`   ... and ${semester1Result.conflicts.length - 5} more conflicts`);
      }
    }
    
    // Show semester 1 schedule distribution
    console.log('\n📅 Semester 1 Sessions by Day:');
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    days.forEach(day => {
      const daySessions = semester1Result.timetable.filter(session => session.day === day);
      console.log(`   ${day.charAt(0).toUpperCase() + day.slice(1)}: ${daySessions.length} sessions`);
    });
    
    // Show sample sessions
    console.log('\n📖 Sample Semester 1 Sessions (First 5):');
    const sampleSessions = semester1Result.timetable.slice(0, 5);
    sampleSessions.forEach((session, index) => {
      console.log(`   ${index + 1}. ${session.courseCode} - ${session.courseName}`);
      console.log(`      📍 ${session.day} ${session.timeSlot.label}`);
      console.log(`      👨‍🏫 Teacher: ${session.teacher.name}`);
      console.log(`      🏫 Room: ${session.room.number} (${session.room.type}, Capacity: ${session.room.capacity})`);
      console.log(`      🏢 Department: ${session.department}\n`);
    });
    
    // Test semester 3 timetable generation
    console.log('\n' + '='.repeat(60));
    console.log('📚 Generating timetable for Semester 3...');
    const semester3Result = await generator.generateTimetable({
      algorithm: 'greedy',
      semester: 3,
      academicYear: 2025
    });
    
    console.log('\n📋 Semester 3 Results:');
    console.log(`✅ Success: ${semester3Result.success}`);
    console.log(`📊 Total Sessions: ${semester3Result.metadata.totalSessions}`);
    console.log(`🎯 Quality Score: ${semester3Result.metrics.qualityScore}/100`);
    console.log(`� Scheduling Rate: ${semester3Result.metrics.schedulingRate}%`);
    console.log(`⚠️  Conflicts: ${semester3Result.conflicts.length}`);
    
    // Show semester 3 schedule distribution
    console.log('\n📅 Semester 3 Sessions by Day:');
    days.forEach(day => {
      const daySessions = semester3Result.timetable.filter(session => session.day === day);
      console.log(`   ${day.charAt(0).toUpperCase() + day.slice(1)}: ${daySessions.length} sessions`);
    });
    
    // Compare semester distributions
    console.log('\n📊 Comparison Summary:');
    console.log(`   Semester 1: ${semester1Result.metadata.totalSessions} sessions`);
    console.log(`   Semester 3: ${semester3Result.metadata.totalSessions} sessions`);
    
    // Show courses by semester
    const sem1Courses = [...new Set(semester1Result.timetable.map(s => s.courseCode))];
    const sem3Courses = [...new Set(semester3Result.timetable.map(s => s.courseCode))];
    
    console.log('\n📚 Courses by Semester:');
    console.log(`   Semester 1 Courses: ${sem1Courses.join(', ')}`);
    console.log(`   Semester 3 Courses: ${sem3Courses.join(', ')}`);
    
  } catch (error) {
    console.error('❌ Timetable generation failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    mongoose.connection.close();
    console.log('\n🔚 Database connection closed');
  }
}

testTimetableGeneration();