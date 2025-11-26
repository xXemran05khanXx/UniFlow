// Test what the frontend actually receives from the API
const testFrontendAPI = async () => {
  console.log('🧪 Testing Frontend API Integration...');

  try {
    // 1. Login first
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

    console.log('✅ Login successful');
    const token = loginData.data.token;

    // 2. Test the exact same call the frontend makes
    console.log('\n2. Testing timetable generation (frontend style)...');
    const payload = {
      algorithm: 'greedy',
      semester: 1,
      academicYear: 2025
    };

    console.log('Payload being sent:', JSON.stringify(payload, null, 2));

    const response = await fetch('http://localhost:5000/api/timetable-simple/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const rawText = await response.text();
    console.log('\nRaw response body:', rawText);

    let result;
    try {
      result = JSON.parse(rawText);
    } catch (parseError) {
      console.log('❌ Failed to parse JSON:', parseError.message);
      return;
    }

    console.log('\n📊 Parsed Response Structure:');
    console.log('- success:', result.success);
    console.log('- message:', result.message);
    console.log('- data exists:', !!result.data);
    
    if (result.data) {
      console.log('- data.metadata exists:', !!result.data.metadata);
      console.log('- data.conflicts exists:', !!result.data.conflicts);
      console.log('- data.metrics exists:', !!result.data.metrics);
      console.log('- data.timetable exists:', !!result.data.timetable);
      
      if (result.data.metadata) {
        console.log('- data.metadata.totalSessions:', result.data.metadata.totalSessions);
      }
      
      if (result.data.conflicts) {
        console.log('- data.conflicts.length:', result.data.conflicts.length);
        console.log('- data.conflicts type:', typeof result.data.conflicts);
      }
      
      if (result.data.metrics) {
        console.log('- data.metrics.qualityScore:', result.data.metrics.qualityScore);
        console.log('- data.metrics.schedulingRate:', result.data.metrics.schedulingRate);
      }
    }

    // Test what the frontend expects
    console.log('\n🖥️  Frontend Display Values:');
    const totalSessions = result.data?.metadata?.totalSessions || 0;
    const conflicts = result.data?.conflicts?.length || 0;
    const qualityScore = result.data?.metrics?.qualityScore || 0;
    
    console.log('- Total Sessions:', totalSessions);
    console.log('- Conflicts:', conflicts);
    console.log('- Quality Score:', qualityScore);
    
    if (totalSessions === 0) {
      console.log('\n❌ PROBLEM: Frontend would show 0 sessions!');
      console.log('Debug info:');
      console.log('- result.data:', !!result.data);
      console.log('- result.data.metadata:', !!result.data?.metadata);
      console.log('- Raw metadata:', result.data?.metadata);
    } else {
      console.log('\n✅ Frontend should display correct values!');
    }

  } catch (error) {
    console.log('❌ Test Error:', error.message);
    console.log('Stack:', error.stack);
  }
};

testFrontendAPI();