const express = require('express');
const app = require('../src/app');
const connectDB = require('../src/config/database');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    console.log('🚀 Starting UniFlow Backend Server...\n');
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ MongoDB connected successfully\n');
    
    // Start the server
    app.listen(PORT, () => {
      console.log('🎉 UniFlow Backend Server Running!');
      console.log('─'.repeat(50));
      console.log(`🌐 Server URL: http://localhost:${PORT}`);
      console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
      console.log('');
      console.log('🎯 Timetable Generation Endpoints:');
      console.log(`   📝 Generate: POST http://localhost:${PORT}/api/timetable/generate`);
      console.log(`   🔍 Validate: POST http://localhost:${PORT}/api/timetable/validate`);
      console.log(`   📄 Parse: POST http://localhost:${PORT}/api/timetable/parse-syllabus`);
      console.log(`   📊 Status: GET http://localhost:${PORT}/api/timetable/status/:jobId`);
      console.log(`   📋 Templates: GET http://localhost:${PORT}/api/timetable/templates/:type/download`);
      console.log('');
      console.log('🔐 Authentication Required:');
      console.log(`   🔑 Login: POST http://localhost:${PORT}/api/auth/login`);
      console.log(`   👤 Register: POST http://localhost:${PORT}/api/auth/register`);
      console.log('');
      console.log('✅ All systems ready for timetable generation!');
      console.log('─'.repeat(50));
    });
    
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

startServer();
