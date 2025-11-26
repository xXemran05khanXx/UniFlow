const express = require('express');

console.log('🔍 Testing route loading...');

try {
  // Test loading timetableSimple routes
  const timetableSimpleRoutes = require('./src/routes/timetableSimple');
  console.log('✅ timetableSimple routes loaded');
  
  // Create a test app to mount routes
  const app = express();
  
  // Mount the routes
  app.use('/api/timetable-simple', timetableSimpleRoutes);
  
  // List all mounted routes
  console.log('\n📋 Mounted routes on /api/timetable-simple:');
  
  function listRoutes(stack, basePath = '') {
    stack.forEach((middleware) => {
      if (middleware.route) {
        // Regular route
        const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
        console.log(`   ${methods} ${basePath}${middleware.route.path}`);
      } else if (middleware.name === 'router') {
        // Nested router
        const layer = middleware;
        const path = layer.regexp.source
          .replace('\\/?', '')
          .replace('(?=\\/|$)', '$')
          .replace(/\\\//g, '/')
          .replace(/[$^]/g, '');
        
        if (layer.handle && layer.handle.stack) {
          listRoutes(layer.handle.stack, basePath + path);
        }
      }
    });
  }
  
  if (app._router && app._router.stack) {
    listRoutes(app._router.stack);
  }
  
  console.log('\n🌐 Testing a direct route call...');
  
  // Start a test server
  const server = app.listen(3001, () => {
    console.log('Test server running on port 3001');
    
    // Test the route
    setTimeout(async () => {
      try {
        const fetch = require('node-fetch');
        const response = await fetch('http://localhost:3001/api/timetable-simple/semesters');
        console.log('Test response status:', response.status);
        const text = await response.text();
        console.log('Test response body:', text);
      } catch (error) {
        console.log('Test request error:', error.message);
      } finally {
        server.close();
      }
    }, 100);
  });
  
} catch (error) {
  console.log('❌ Error:', error.message);
  console.log(error.stack);
}