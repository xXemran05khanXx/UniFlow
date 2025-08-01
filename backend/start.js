const app = require('./src/app');
const connectDB = require('./src/config/database');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    console.log('🚀 Starting UniFlow Timetable Generation Server...\n');
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ MongoDB connected successfully\n');
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log('🎉 UniFlow Backend Server Running!');
      console.log('─'.repeat(60));
      console.log(`🌐 Server URL: http://localhost:${PORT}`);
      console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
      console.log('');
      console.log('🎯 Timetable Generation API Endpoints:');
      console.log(`   📝 Generate Sync: POST ${PORT}/api/timetable/generate`);
      console.log(`   🔄 Generate Async: POST ${PORT}/api/timetable/generate-async`);
      console.log(`   🔍 Validate: POST ${PORT}/api/timetable/validate`);
      console.log(`   📄 Parse Files: POST ${PORT}/api/timetable/parse-syllabus`);
      console.log(`   ⚡ Optimize: POST ${PORT}/api/timetable/optimize`);
      console.log(`   📊 Job Status: GET ${PORT}/api/timetable/status/:jobId`);
      console.log(`   📋 Templates: GET ${PORT}/api/timetable/templates/:type/download`);
      console.log(`   🧠 Algorithms: GET ${PORT}/api/timetable/algorithms`);
      console.log('');
      console.log('🔐 Authentication Endpoints:');
      console.log(`   🔑 Login: POST ${PORT}/api/auth/login`);
      console.log(`   👤 Register: POST ${PORT}/api/auth/register`);
      console.log('');
      console.log('✅ Automatic Timetable Generation System Ready!');
      console.log('   • Syllabus parsing (PDF, Excel, CSV)');
      console.log('   • Advanced scheduling algorithms');
      console.log('   • Comprehensive clash detection');
      console.log('   • Background job processing');
      console.log('   • RESTful API with file uploads');
      console.log('─'.repeat(60));
    });
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Received SIGINT. Shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server stopped.');
        process.exit(0);
      });
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM. Shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server stopped.');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
