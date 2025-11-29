// Test script to verify our timetable API with real frontend calls
const API_BASE = 'http://localhost:5000';

// Test authentication first
async function testAuth() {
  console.log('🔐 Testing Authentication...');
  
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@uniflow.com',
        password: 'admin123'
      })
    });

    const data = await response.json();
    if (data.success) {
      console.log('✅ Auth successful:', data.user.name, '(' + data.user.role + ')');
      return data.token;
    } else {
      console.log('❌ Auth failed:', data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ Auth error:', error.message);
    return null;
  }
}

// Test getting available semesters
async function testSemesters(token) {
  console.log('\n📚 Testing Semesters API...');
  
  try {
    const response = await fetch(`${API_BASE}/api/timetable/semesters`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    if (data.success) {
      console.log('✅ Semesters fetched successfully:');
      data.semesters.forEach(sem => {
        console.log(`   - Semester ${sem.semester}: ${sem.courseCount} courses`);
      });
      return data.semesters;
    } else {
      console.log('❌ Semesters failed:', data.message);
      return [];
    }
  } catch (error) {
    console.log('❌ Semesters error:', error.message);
    return [];
  }
}

// Test timetable generation
async function testTimetableGeneration(token, semester = null) {
  const semesterText = semester ? `semester ${semester}` : 'all semesters';
  console.log(`\n🚀 Testing Timetable Generation for ${semesterText}...`);
  
  try {
    const payload = {
      algorithm: 'greedy',
      academicYear: 2025
    };

    if (semester) {
      payload.semester = semester;
    }

    const response = await fetch(`${API_BASE}/api/timetable/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (data.success) {
      console.log(`✅ Timetable generated for ${semesterText}:`);
      console.log(`   📊 Total Sessions: ${data.data.metadata.totalSessions}`);
      console.log(`   🎯 Quality Score: ${data.data.metrics.qualityScore}/100`);
      console.log(`   📈 Success Rate: ${data.data.metrics.schedulingRate}%`);
      console.log(`   ⚠️  Conflicts: ${data.data.conflicts.length}`);
      
      // Show first few sessions
      if (data.data.timetable.length > 0) {
        console.log(`\n   📅 Sample Sessions (first 3):`);
        data.data.timetable.slice(0, 3).forEach((session, i) => {
          console.log(`   ${i+1}. ${session.courseCode} - ${session.day} ${session.timeSlot} (${session.room?.roomNumber || 'TBD'})`);
        });
      }
      
      return data.data;
    } else {
      console.log(`❌ Timetable generation failed for ${semesterText}:`, data.message);
      return null;
    }
  } catch (error) {
    console.log(`❌ Timetable generation error for ${semesterText}:`, error.message);
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('🧪 Frontend API Integration Tests\n');
  console.log('========================================');
  
  // Test authentication
  const token = await testAuth();
  if (!token) {
    console.log('\n❌ Cannot proceed without authentication');
    return;
  }

  // Test semesters
  const semesters = await testSemesters(token);
  
  // Test timetable generation for all semesters
  await testTimetableGeneration(token);
  
  // Test timetable generation for specific semesters
  if (semesters.length > 0) {
    await testTimetableGeneration(token, semesters[0].semester);
    
    if (semesters.length > 1) {
      await testTimetableGeneration(token, semesters[1].semester);
    }
  }
  
  console.log('\n========================================');
  console.log('🎉 All tests completed!');
}

// Run tests if this is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = require('node-fetch');
  runTests();
} else {
  // Browser environment
  console.log('Run runTests() to start testing');
}

// Export for browser use
if (typeof window !== 'undefined') {
  window.runTests = runTests;
}