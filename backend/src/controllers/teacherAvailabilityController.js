const asyncHandler = require('../middleware/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const {
  createAvailability,
  updateAvailability,
  getTeacherAvailability,
  isTeacherFree
} = require('../services/teacherAvailabilityService');

const createAvailabilityHandler = asyncHandler(async (req, res) => {
  const availability = await createAvailability(req.body);
  res.status(201).json(ApiResponse.success('Availability created', availability, 201));
});

const updateAvailabilityHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const availability = await updateAvailability(id, req.body);
  res.status(200).json(ApiResponse.success('Availability updated', availability));
});

const getAvailability = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;
  const { date } = req.query;

  if (!date) {
    throw new ApiError(400, 'Query param "date" is required (YYYY-MM-DD).');
  }

  const availability = await getTeacherAvailability(teacherId, date);
  return res.status(200).json(ApiResponse.success('Availability fetched.', availability));
});

const checkSlot = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;
  const { date, startTime, endTime } = req.body;

  if (!date || !startTime || !endTime) {
    throw new ApiError(400, 'date, startTime, and endTime are required.');
  }

  const free = await isTeacherFree(teacherId, date, startTime, endTime);
  return res.status(200).json(ApiResponse.success(free ? 'Slot available.' : 'Slot not available.', { free }));
});

module.exports = {
  createAvailabilityHandler,
  updateAvailabilityHandler,
  getAvailability,
  checkSlot
};
