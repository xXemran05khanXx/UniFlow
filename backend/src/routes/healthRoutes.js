const express = require('express');
const router = express.Router();
const { getHealth, getHealthDetailed } = require('../controllers/healthController');

// @route   GET /api/health
// @desc    Basic health check
// @access  Public
router.get('/', getHealth);

// @route   GET /api/health/detailed
// @desc    Detailed health check
// @access  Public
router.get('/detailed', getHealthDetailed);

module.exports = router;
