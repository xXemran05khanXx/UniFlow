const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'https://localhost:3000'
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'production') {
      return callback(null, true);
    }
    
    callback(null, true); // Allow all origins in development
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/uniflow', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error.message);
});

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'UniFlow Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const timetableRoutes = require('./src/routes/timetable');
const dataManagementRoutes = require('./src/routes/dataManagement');
const userRoutes = require('./src/routes/userRoutes');
const subjectRoutes = require('./src/routes/subjectRoutes');
const roomRoutes = require('./src/routes/roomRoutes');
const timeSlotRoutes = require('./src/routes/timeSlotRoutes');

// Use routes
console.log('🔧 Mounting API routes...');
app.use('/api/auth', authRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/data', dataManagementRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/timeslots', timeSlotRoutes);

// Serve static files from React build (for production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
} else {
  // Development fallback
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'Route not found'
    });
  });
}

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error:', error);
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error'
  });
});

// Configuration sanity checks
if (!process.env.JWT_SECRET) {
  console.warn('\n[Startup Warning] JWT_SECRET is not set. Authentication token issuance will fail.');
  console.warn('Create a .env file (backend/.env) with a strong JWT_SECRET, e.g.');
  console.warn('  JWT_SECRET=replace-with-a-long-random-string');
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`API Base URL: http://localhost:${PORT}/api`);
  console.log(`JWT Secret: ${process.env.JWT_SECRET ? 'SET' : 'NOT SET'}`);
});

module.exports = app;
