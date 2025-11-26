// Test our timetable API directly
async function testTimetableAPI() {
  console.log('🧪 Testing Timetable API...');
  
  // Test login first
  console.log('1. Testing login...');
  try {
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@uniflow.edu',  // Correct admin email from database
        password: 'password123'      // Try common password
      })
    });

    let loginData = await loginResponse.json();
    console.log('Login response:', loginData);
    
    // If first login fails, try the other admin email
    if (!loginData.success) {
      console.log('Trying alternate admin email...');
      const loginResponse2 = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'admin@uniflow.edu',  // Correct email
          password: 'password123'      // Try alternate password
        })
      });
      loginData = await loginResponse2.json();
      console.log('Second login response:', loginData);
    }

    if (!loginData.success) {
      console.log('❌ Login failed:', loginData.message);
      return;
    }

    console.log('✅ Login successful:', loginData.data.user.email, '(' + loginData.data.user.role + ')');
    const token = loginData.data.token;

    // Test semesters endpoint
    console.log('\n2. Testing semesters endpoint...');
    console.log('Making request to: http://localhost:5000/api/timetable-simple/semesters');
    console.log('Using token:', token.substring(0, 50) + '...');
    
    const semestersResponse = await fetch('http://localhost:5000/api/timetable-simple/semesters', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', semestersResponse.status);
    console.log('Response headers:', Object.fromEntries(semestersResponse.headers.entries()));
    
    const responseText = await semestersResponse.text();
    console.log('Raw response body:', responseText);
    
    let semestersData;
    try {
      semestersData = JSON.parse(responseText);
      console.log('Parsed response:', semestersData);
    } catch (parseError) {
      console.log('Failed to parse JSON:', parseError.message);
      semestersData = { error: 'Invalid JSON response', body: responseText };
    }
    
    if (semestersData.success) {
      console.log('✅ Semesters fetched successfully:');
      semestersData.data.semesters.forEach(sem => {
        console.log(`   - Semester ${sem.semester}: ${sem.courses} courses`);
      });
    } else {
      console.log('❌ Semesters fetch failed:', semestersData.message || semestersData.error);
      console.log('Full response:', semestersData);
      return;
    }

    // Test timetable generation
    console.log('\n3. Testing timetable generation...');
    console.log('Making request to: http://localhost:5000/api/timetable-simple/generate');
    console.log('Payload:', { algorithm: 'greedy', semester: 1, academicYear: 2025 });
    
    const generateResponse = await fetch('http://localhost:5000/api/timetable-simple/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        algorithm: 'greedy',
        semester: 1,  // Test with semester 1
        academicYear: 2025
      })
    });

    console.log('Generate response status:', generateResponse.status);
    console.log('Generate response headers:', Object.fromEntries(generateResponse.headers.entries()));
    
    const generateText = await generateResponse.text();
    console.log('Generate raw response:', generateText);
    
    let generateData;
    try {
      generateData = JSON.parse(generateText);
      console.log('Generate parsed response:', generateData);
    } catch (parseError) {
      console.log('Failed to parse generation JSON:', parseError.message);
      generateData = { error: 'Invalid JSON response', body: generateText };
    }

    if (generateData.success) {
      console.log('✅ Timetable generated successfully:');
      console.log(`   📊 Total Sessions: ${generateData.data.metadata.totalSessions}`);
      console.log(`   🎯 Quality Score: ${generateData.data.metrics.qualityScore}/100`);
      console.log(`   📈 Success Rate: ${generateData.data.metrics.schedulingRate}%`);
      console.log(`   ⚠️  Conflicts: ${generateData.data.conflicts.length}`);
    } else {
      console.log('❌ Timetable generation failed:', generateData.message || generateData.error);
      console.log('Response status:', generateResponse.status);
      console.log('Full response:', generateData);
    }

  } catch (error) {
    console.log('❌ API Test Error:', error.message);
  }
}

// Run the test
testTimetableAPI();