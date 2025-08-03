const express = require('express');
const { body } = require('express-validator');
const {
  getAllTimeSlots,
  getTimeSlotById,
  getTimeSlotsByDay,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
  bulkCreateTimeSlots,
  toggleTimeSlotStatus
} = require('../controllers/timeSlotController');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roleAuth');

const router = express.Router();

// Validation rules
const timeSlotValidation = [
  body('startTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  body('endTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),
  body('dayOfWeek')
    .isInt({ min: 0, max: 6 })
    .withMessage('Day of week must be an integer between 0 and 6'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

const updateTimeSlotValidation = [
  body('startTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  body('endTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),
  body('dayOfWeek')
    .optional()
    .isInt({ min: 0, max: 6 })
    .withMessage('Day of week must be an integer between 0 and 6'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

// Routes

// GET /api/timeslots - Get all time slots with optional filtering
router.get('/', auth, getAllTimeSlots);

// GET /api/timeslots/:id - Get specific time slot
router.get('/:id', auth, getTimeSlotById);

// GET /api/timeslots/day/:day - Get time slots for specific day
router.get('/day/:day', auth, getTimeSlotsByDay);

// POST /api/timeslots - Create new time slot (admin only)
router.post('/', auth, requireRole('admin'), timeSlotValidation, createTimeSlot);

// POST /api/timeslots/bulk - Bulk create time slots (admin only)
router.post('/bulk', auth, requireRole('admin'), bulkCreateTimeSlots);

// PUT /api/timeslots/:id - Update time slot (admin only)
router.put('/:id', auth, requireRole('admin'), updateTimeSlotValidation, updateTimeSlot);

// PATCH /api/timeslots/:id/toggle - Toggle time slot active status (admin only)
router.patch('/:id/toggle', auth, requireRole('admin'), toggleTimeSlotStatus);

// DELETE /api/timeslots/:id - Delete time slot (admin only)
router.delete('/:id', auth, requireRole('admin'), deleteTimeSlot);

module.exports = router;
