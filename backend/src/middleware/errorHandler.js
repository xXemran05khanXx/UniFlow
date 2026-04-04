const fs = require('fs');
const path = require('path');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  const timestamp = new Date().toISOString();
  const errorLog = `[${timestamp}] ${err.stack}\n`;
  
  const logsDir = path.join(__dirname, '..', '..', 'logs');
  fs.appendFileSync(path.join(logsDir, 'error.log'), errorLog);

  // Console log in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  // Default to 500 server error
  let statuscoursecode = err.statuscoursecode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    message = 'Resource not found';
    statuscoursecode = 404;
  }

  // Mongoose duplicate key
  if (err.coursecode === 11000) {
    message = 'Duplicate field value entered';
    statuscoursecode = 400;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map(val => val.message).join(', ');
    statuscoursecode = 400;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token';
    statuscoursecode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    message = 'Token expired';
    statuscoursecode = 401;
  }

  res.status(statuscoursecode).json({
    success: false,
    message,
    error: {
      status: statuscoursecode,
      ...(err.data && { data: err.data }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

module.exports = errorHandler;
