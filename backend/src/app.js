const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const logger = require('./middleware/logger');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const healthRoutes = require('./routes/healthRoutes');
const timetableRoutes = require('./routes/timetable');
const roomRoutes = require('./routes/roomRoutes');
const timeSlotRoutes = require('./routes/timeSlotRoutes');
const dataManagementRoutes = require('../routes/dataManagement');

// Import config
const config = require('./config/config');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Add custom request logging
app.use((req, res, next) => {
  console.log(`🌐 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log(`📝 Headers:`, {
    'content-type': req.headers['content-type'],
    'authorization': req.headers['authorization'] ? 'Bearer ***' : 'None',
    'origin': req.headers['origin']
  });
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`📦 Body:`, req.body);
  }
  next();
});

// Logging middleware
app.use(logger);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Morgan HTTP request logging
app.use(morgan('combined', {
  stream: fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' })
}));

// Basic test route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'UniFlow Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Routes

console.log(' Mounting routes...');
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/timetable', timetableRoutes);

console.log(' Mounting room routes...');
app.use('/api/rooms', roomRoutes);
app.use('/api/timeslots', timeSlotRoutes);
app.use('/api/data', dataManagementRoutes);
console.log(' All routes mounted successfully');

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    error: {
      status: 404,
      message: `Cannot ${req.method} ${req.originalUrl}`
    }
  });
});

// Global error handling middleware
app.use(errorHandler);

module.exports = app;
