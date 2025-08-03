// Test script to debug import issues
console.log('Testing imports...');

try {
  console.log('1. Testing auth routes...');
  const authRoutes = require('./src/routes/auth');
  console.log('✅ Auth routes imported successfully');
} catch (error) {
  console.error('❌ Auth routes failed:', error.message);
}

try {
  console.log('2. Testing timetable routes...');
  const timetableRoutes = require('./src/routes/timetable');
  console.log('✅ Timetable routes imported successfully');
} catch (error) {
  console.error('❌ Timetable routes failed:', error.message);
}

try {
  console.log('3. Testing data management routes...');
  const dataManagementRoutes = require('./src/routes/dataManagement');
  console.log('✅ Data management routes imported successfully');
} catch (error) {
  console.error('❌ Data management routes failed:', error.message);
}

try {
  console.log('4. Testing user routes...');
  const userRoutes = require('./src/routes/userRoutes');
  console.log('✅ User routes imported successfully');
} catch (error) {
  console.error('❌ User routes failed:', error.message);
}

try {
  console.log('5. Testing subject routes...');
  const subjectRoutes = require('./src/routes/subjectRoutes');
  console.log('✅ Subject routes imported successfully');
} catch (error) {
  console.error('❌ Subject routes failed:', error.message);
}

console.log('Import test complete!');
