const https = require('https');
const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.port === 443 ? https : http;
    const req = protocol.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 400) {
            reject({ response: { status: res.statusCode, data: parsed } });
          } else {
            resolve({ data: parsed, status: res.statusCode });
          }
        } catch (e) {
          reject(new Error(body));
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testAuth() {
  try {
    console.log('🧪 Testing authentication flow...');
    
    // 1. Login
    console.log('📝 Logging in as admin...');
    const loginResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: 'admin@uniflow.edu',
      password: 'password123'
    });
    
    console.log('✅ Login successful!');
    console.log('Response:', loginResponse.data);
    
    const token = loginResponse.data.data?.token || loginResponse.data.token;
    const user = loginResponse.data.data?.user || loginResponse.data.user;
    
    if (!token) {
      console.error('❌ No token in response');
      return;
    }
    
    console.log('Token:', token.substring(0, 50) + '...');
    console.log('User:', user);
    
    // 2. Test timetable generation
    console.log('\n🎯 Testing timetable generation...');
    const timetableResponse = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/timetable/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      algorithm: 'greedy',
      semester: 'fall',
      academicYear: 2024
    });
    
    console.log('✅ Timetable generation successful!');
    console.log('Result:', timetableResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
    }
  }
}

testAuth();
