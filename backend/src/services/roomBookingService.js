const RoomBooking = require('../models/RoomBooking');
const Room = require('../models/Room');
const Timetable = require('../models/Timetable');
const ApiError = require('../utils/ApiError');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WORKING_HOURS = { start: '07:00', end: '21:00' };

const TIME_REGEX = /^([0-1]\d|2[0-3]):[0-5]\d$/;

const toMinutes = (timeString) => {
  const [hours, minutes] = String(timeString || '').split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new ApiError('Invalid time format', 400);
  }
  return hours * 60 + minutes;
};

const startOfUTCDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError('Invalid date', 400);
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const ensureTimeWindow = (startTime, endTime) => {
  if (!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime)) {
    throw new ApiError('Time must be in HH:MM format', 400);
  }
  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);

  if (endMinutes <= startMinutes) {
    throw new ApiError('startTime must be before endTime', 400);
  }

  const workStart = toMinutes(WORKING_HOURS.start);
  const workEnd = toMinutes(WORKING_HOURS.end);

  if (startMinutes < workStart || endMinutes > workEnd) {
    throw new ApiError(`Bookings must be within working hours (${WORKING_HOURS.start}-${WORKING_HOURS.end})`, 400);
  }

  return { startMinutes, endMinutes };
};

const hasOverlap = (startA, endA, startB, endB) => startA < endB && startB < endA;

const checkTimetableClash = async (roomId, dayName, startMinutes, endMinutes) => {
  const timetables = await Timetable.find({
    status: { $ne: 'Archived' },
    'schedule.room': roomId,
    'schedule.dayOfWeek': dayName
  }, { schedule: 1, name: 1 }).lean();

  for (const timetable of timetables) {
    for (const slot of timetable.schedule || []) {
      if (String(slot.room) !== String(roomId)) continue;
      if (slot.dayOfWeek !== dayName) continue;

      const slotStart = toMinutes(slot.startTime);
      const slotEnd = toMinutes(slot.endTime);

      if (hasOverlap(startMinutes, endMinutes, slotStart, slotEnd)) {
        throw new ApiError('Room already allocated in timetable', 400);
      }
    }
  }
};

const createBooking = async (data, userId) => {
  const { room, purpose, date, startTime, endTime } = data;

  const normalizedDate = startOfUTCDate(date);
  const today = startOfUTCDate(new Date());
  if (normalizedDate < today) {
    throw new ApiError('Cannot book past dates', 400);
  }

  const { startMinutes, endMinutes } = ensureTimeWindow(startTime, endTime);

  const roomExists = await Room.findById(room).select('_id').lean();
  if (!roomExists) {
    throw new ApiError('Room not found', 404);
  }

  const existingBookings = await RoomBooking.find({
    room,
    date: normalizedDate,
    status: 'approved'
  }).lean();

  for (const booking of existingBookings) {
    const bookingStart = toMinutes(booking.startTime);
    const bookingEnd = toMinutes(booking.endTime);

    if (hasOverlap(startMinutes, endMinutes, bookingStart, bookingEnd)) {
      throw new ApiError('Room already booked for this time range', 400);
    }
  }

  const dayName = DAY_NAMES[normalizedDate.getUTCDay()];
  await checkTimetableClash(room, dayName, startMinutes, endMinutes);

  const booking = await RoomBooking.create({
    room,
    bookedBy: userId,
    purpose,
    date: normalizedDate,
    startTime,
    endTime,
    status: 'approved'
  });

  return booking;
};

const buildDateFilter = ({ date, startDate, endDate }) => {
  if (date) {
    return startOfUTCDate(date);
  }

  const range = {};
  if (startDate) {
    range.$gte = startOfUTCDate(startDate);
  }
  if (endDate) {
    range.$lte = startOfUTCDate(endDate);
  }

  return Object.keys(range).length ? range : undefined;
};

const getBookings = async (filters, requester) => {
  const query = {};

  if (filters.room) {
    query.room = filters.room;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  const dateFilter = buildDateFilter(filters);
  if (dateFilter) {
    query.date = dateFilter;
  }

  if (requester.role === 'student') {
    query.bookedBy = requester._id;
  }

  const bookings = await RoomBooking.find(query)
    .populate('room', 'roomNumber name building capacity')
    .populate('bookedBy', 'name email role')
    .sort({ date: 1, startTime: 1 });

  return bookings;
};

const cancelBooking = async (id, userId, role) => {
  const booking = await RoomBooking.findById(id);

  if (!booking) {
    throw new ApiError('Booking not found', 404);
  }

  if (role === 'teacher' && String(booking.bookedBy) !== String(userId)) {
    throw new ApiError('You can only cancel your own bookings', 403);
  }

  if (role === 'student') {
    throw new ApiError('Students are not allowed to cancel bookings', 403);
  }

  if (booking.status === 'cancelled') {
    return booking;
  }

  booking.status = 'cancelled';
  await booking.save();

  return booking;
};

module.exports = {
  createBooking,
  getBookings,
  cancelBooking
};
