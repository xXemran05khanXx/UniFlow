const express = require('express');
const { body, query, param } = require('express-validator');
const { auth } = require('../middleware/auth');
const { requireAnyRole } = require('../middleware/roleAuth');
const {
  createBooking,
  getBookings,
  cancelBooking
} = require('../controllers/roomBookingController');

const router = express.Router();

const TIME_REGEX = /^([0-1]\d|2[0-3]):[0-5]\d$/;

router.post(
  '/',
  auth,
  requireAnyRole(['admin', 'teacher']),
  [
    body('room').isMongoId().withMessage('room is required'),
    body('purpose').isString().trim().notEmpty().withMessage('purpose is required'),
    body('date').isISO8601().withMessage('date must be a valid ISO date'),
    body('startTime').matches(TIME_REGEX).withMessage('startTime must be in HH:MM format'),
    body('endTime')
      .matches(TIME_REGEX).withMessage('endTime must be in HH:MM format')
      .custom((value, { req }) => {
        if (!req.body.startTime || !TIME_REGEX.test(req.body.startTime)) return true;
        const [sh, sm] = req.body.startTime.split(':').map(Number);
        const [eh, em] = value.split(':').map(Number);
        return eh * 60 + em > sh * 60 + sm;
      }).withMessage('endTime must be after startTime')
  ],
  createBooking
);

router.get(
  '/',
  auth,
  [
    query('room').optional().isMongoId().withMessage('room must be a valid ID'),
    query('status').optional().isIn(['approved', 'cancelled']).withMessage('Invalid status filter'),
    query('date').optional().isISO8601().withMessage('date must be a valid ISO date'),
    query('startDate').optional().isISO8601().withMessage('startDate must be a valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('endDate must be a valid ISO date')
  ],
  getBookings
);

router.patch(
  '/:id/cancel',
  auth,
  [param('id').isMongoId().withMessage('Invalid booking id')],
  cancelBooking
);

module.exports = router;
