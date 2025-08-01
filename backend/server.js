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
  console.log('Connected to MongoDB');
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
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
const authRoutes = require('./routes/auth');
const timetableRoutes = require('./routes/timetable');
// const userRoutes = require('./routes/users');
// const subjectRoutes = require('./routes/subjects');
// const roomRoutes = require('./routes/rooms');
// const timeSlotRoutes = require('./routes/timeSlots');
// const timetableRoutes = require('./routes/timetables');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/timetable', timetableRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/subjects', subjectRoutes);
// app.use('/api/rooms', roomRoutes);
// app.use('/api/timeslots', timeSlotRoutes);
// app.use('/api/timetables', timetableRoutes);

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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`API Base URL: http://localhost:${PORT}/api`);
});

module.exports = app;
