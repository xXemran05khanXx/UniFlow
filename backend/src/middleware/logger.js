const fs = require('fs');
const path = require('path');

const logger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || '';

  const logEntry = `[${timestamp}] ${method} ${url} - IP: ${ip} - User-Agent: ${userAgent}\n`;

  // Console log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`${method} ${url} - ${ip}`);
  }

  // Write to log file
  const logsDir = path.join(__dirname, '..', '..', 'logs');
  fs.appendFileSync(path.join(logsDir, 'requests.log'), logEntry);

  next();
};

module.exports = logger;
