const { validationResult } = require('express-validator');
const asyncHandler = require('../middleware/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const roomBookingService = require('../services/roomBookingService');

const createBooking = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError('Validation failed', 400, errors.array());
  }

  const booking = await roomBookingService.createBooking(req.body, req.user._id);

  res.status(201).json(ApiResponse.success('Room booked successfully', booking, 201));
});

const getBookings = asyncHandler(async (req, res) => {
  const filters = {
    room: req.query.room,
    status: req.query.status,
    date: req.query.date,
    startDate: req.query.startDate,
    endDate: req.query.endDate
  };

  const bookings = await roomBookingService.getBookings(filters, req.user);

  res.status(200).json(ApiResponse.success('Bookings retrieved successfully', bookings, 200));
});

const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await roomBookingService.cancelBooking(req.params.id, req.user._id, req.user.role);

  res.status(200).json(ApiResponse.success('Booking cancelled successfully', booking, 200));
});

module.exports = {
  createBooking,
  getBookings,
  cancelBooking
};
