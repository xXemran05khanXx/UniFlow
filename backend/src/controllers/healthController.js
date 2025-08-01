const asyncHandler = require('../middleware/asyncHandler');

// @desc    Basic health check
// @route   GET /api/health
// @access  Public
const getHealth = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// @desc    Detailed health check
// @route   GET /api/health/detailed
// @access  Public
const getHealthDetailed = asyncHandler(async (req, res) => {
  const healthData = {
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
      external: Math.round(process.memoryUsage().external / 1024 / 1024 * 100) / 100
    },
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version
    }
  };

  res.status(200).json(healthData);
});

module.exports = {
  getHealth,
  getHealthDetailed
};
