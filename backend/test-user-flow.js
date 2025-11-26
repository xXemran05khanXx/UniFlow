// Test the actual frontend behavior
console.log('🧪 Testing Frontend User Flow...');

// Function to test frontend via fetch (simulating what user would see)
const testFrontendFlow = async () => {
  try {
    console.log('1. Testing frontend React app availability...');
    
    // Test if frontend is accessible
    const frontendResponse = await fetch('http://localhost:3000', {
      method: 'GET',
      timeout: 5000
    });
    
    console.log('Frontend status:', frontendResponse.status);
    
    if (frontendResponse.ok) {
      console.log('✅ Frontend is running and accessible');
    } else {
      console.log('❌ Frontend not accessible');
      return;
    }
    
    console.log('\n2. Testing API endpoints that frontend would call...');
    
    // Test login (what frontend does first)
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
      console.log('❌ Login would fail for frontend user');
      return;
    }
    
    console.log('✅ Login would work for frontend user');
    const token = loginData.data.token;
    
    // Test semesters (what frontend does when page loads)
    const semestersResponse = await fetch('http://localhost:5000/api/timetable-simple/semesters', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const semestersData = await semestersResponse.json();
    if (semestersData.success) {
      console.log('✅ Semesters would load for frontend user');
      console.log('Available semesters:', semestersData.data.semesters.map(s => `${s.semester} (${s.courses} courses)`));
    } else {
      console.log('❌ Semesters would fail for frontend user');
      return;
    }
    
    // Test generation (what happens when user clicks generate)
    console.log('\n3. Testing generation (what user experiences)...');
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
    
    const generateData = await generateResponse.json();
    
    console.log('Generate response status:', generateResponse.status);
    console.log('Generate success:', generateData.success);
    
    if (generateData.success) {
      console.log('✅ Generation would work for frontend user');
      console.log('🔍 What frontend should display:');
      console.log('   Quality Score:', generateData.data?.metrics?.qualityScore || 0);
      console.log('   Total Sessions:', generateData.data?.metadata?.totalSessions || 0);
      console.log('   Conflicts:', generateData.data?.conflicts?.length || 0);
      console.log('   Scheduling Rate:', generateData.data?.metrics?.schedulingRate || 0);
      
      // Check if there are any issues with the data structure
      if ((generateData.data?.metadata?.totalSessions || 0) === 0) {
        console.log('❌ ISSUE: Frontend would show 0 sessions!');
        console.log('Debug data structure:', {
          hasData: !!generateData.data,
          hasMetadata: !!generateData.data?.metadata,
          hasTotalSessions: 'totalSessions' in (generateData.data?.metadata || {}),
          metadataKeys: Object.keys(generateData.data?.metadata || {}),
          totalSessionsValue: generateData.data?.metadata?.totalSessions,
          totalSessionsType: typeof generateData.data?.metadata?.totalSessions
        });
      } else {
        console.log('✅ Frontend should show correct session count');
      }
    } else {
      console.log('❌ Generation would fail for frontend user:', generateData.message);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
};

testFrontendFlow();