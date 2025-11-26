const testTimetableAPI = async () => {
  console.log('🧪 Testing Timetable API (Quick Test)...');

  try {
    // 1. Test login
    console.log('\n1. Testing login...');
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@uniflow.edu',
        password: 'password123'
      })
    });

    const loginData = await loginResponse.json();
    
    if (!loginData.success) {
      console.log('❌ Login failed:', loginData.message);
      return;
    }

    console.log('✅ Login successful:', loginData.data.user.email);
    const token = loginData.data.token;

    // 2. Test semesters endpoint
    console.log('\n2. Testing semesters endpoint...');
    const semestersResponse = await fetch('http://localhost:5000/api/timetable-simple/semesters', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Semesters status:', semestersResponse.status);
    const semestersData = await semestersResponse.json();
    console.log('Semesters response:', semestersData);
    
    if (semestersData.success) {
      console.log('✅ Semesters fetched successfully:');
      semestersData.data.semesters.forEach(sem => {
        console.log(`   - Semester ${sem.semester}: ${sem.courses} courses`);
      });

      // 3. Test timetable generation
      console.log('\n3. Testing timetable generation...');
      const generateResponse = await fetch('http://localhost:5000/api/timetable-simple/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          algorithm: 'greedy',
          semester: 1,
          academicYear: 2025
        })
      });

      console.log('Generate status:', generateResponse.status);
      const generateData = await generateResponse.json();
      
      if (generateData.success) {
        console.log('✅ Timetable generated successfully:');
        console.log(`   📊 Total Sessions: ${generateData.data.metadata.totalSessions}`);
        console.log(`   ⚠️  Conflicts: ${generateData.data.conflicts.length}`);
      } else {
        console.log('❌ Generation failed:', generateData.message);
      }
    } else {
      console.log('❌ Semesters failed:', semestersData.message || semestersData.error);
    }

  } catch (error) {
    console.log('❌ API Test Error:', error.message);
  }
};

testTimetableAPI();