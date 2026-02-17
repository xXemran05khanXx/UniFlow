const TeacherAvailability = require('../models/TeacherAvailability');
const TeacherBlock = require('../models/TeacherBlock');
const Timetable = require('../models/Timetable');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const toMinutes = (time) => {
  const [h, m] = String(time).split(':').map(Number);
  return h * 60 + m;
};

const toTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const subtractIntervals = (baseIntervals, removeIntervals) => {
  let result = [...baseIntervals];

  for (const remove of removeIntervals) {
    const newResult = [];

    for (const base of result) {
      const baseStart = toMinutes(base.startTime);
      const baseEnd = toMinutes(base.endTime);
      const removeStart = toMinutes(remove.startTime);
      const removeEnd = toMinutes(remove.endTime);

      if (removeEnd <= baseStart || removeStart >= baseEnd) {
        newResult.push(base);
      } else {
        if (removeStart > baseStart) {
          newResult.push({ startTime: toTime(baseStart), endTime: toTime(removeStart) });
        }
        if (removeEnd < baseEnd) {
          newResult.push({ startTime: toTime(removeEnd), endTime: toTime(baseEnd) });
        }
      }
    }

    result = newResult;
  }

  return result;
};

const normalizeDateRange = (dateString) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return { start: null, end: null };
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
  return { start, end };
};

const ensureTeacher = async (teacherId) => {
  const teacher = await User.findById(teacherId).lean();
  if (!teacher || teacher.role !== 'teacher') {
    throw new ApiError('Invalid teacher', 400);
  }
  return teacher;
};

const validateTimeRange = (startTime, endTime) => {
  if (!startTime || !endTime) {
    throw new ApiError('startTime and endTime are required', 400);
  }
  if (toMinutes(startTime) >= toMinutes(endTime)) {
    throw new ApiError('startTime must be earlier than endTime', 400);
  }
};

const createAvailability = async ({ teacherId, dayOfWeek, startTime, endTime }) => {
  await ensureTeacher(teacherId);
  validateTimeRange(startTime, endTime);

  if (!dayOfWeek) {
    throw new ApiError('dayOfWeek is required', 400);
  }

  const existing = await TeacherAvailability.findOne({ teacher: teacherId, dayOfWeek });
  if (existing) {
    throw new ApiError('Availability for this day already exists', 409);
  }

  return TeacherAvailability.create({ teacher: teacherId, dayOfWeek, startTime, endTime, isActive: true });
};

const updateAvailability = async (id, { teacherId, dayOfWeek, startTime, endTime, isActive }) => {
  const availability = await TeacherAvailability.findById(id);
  if (!availability) {
    throw new ApiError('Availability not found', 404);
  }

  const teacher = await ensureTeacher(teacherId || availability.teacher);

  if (startTime || endTime) {
    validateTimeRange(startTime || availability.startTime, endTime || availability.endTime);
  }

  const nextDayOfWeek = dayOfWeek || availability.dayOfWeek;
  const nextTeacherId = teacherId || availability.teacher;

  const duplicate = await TeacherAvailability.findOne({
    teacher: nextTeacherId,
    dayOfWeek: nextDayOfWeek,
    _id: { $ne: id }
  });

  if (duplicate) {
    throw new ApiError('Availability for this day already exists', 409);
  }

  availability.teacher = nextTeacherId;
  availability.dayOfWeek = nextDayOfWeek;
  availability.startTime = startTime || availability.startTime;
  availability.endTime = endTime || availability.endTime;
  if (typeof isActive === 'boolean') {
    availability.isActive = isActive;
  }

  await availability.save();
  return availability.toObject();
};

const getTeacherAvailability = async (teacherId, date) => {
  await ensureTeacher(teacherId);

  const { start, end } = normalizeDateRange(date);
  if (!start) {
    throw new ApiError('Invalid date', 400);
  }

  const dayOfWeek = start.toLocaleString('en-US', { weekday: 'long' });

  const baseAvailability = await TeacherAvailability.find({
    teacher: teacherId,
    dayOfWeek,
    isActive: true
  }).lean();

  const timetableDocs = await Timetable.find({
    status: 'active',
    'schedule.teacher': teacherId,
    'schedule.dayOfWeek': dayOfWeek
  }).lean();

  const occupiedSlots = [];
  timetableDocs.forEach((doc) => {
    (doc.schedule || []).forEach((session) => {
      if (String(session.teacher) === String(teacherId) && session.dayOfWeek === dayOfWeek) {
        occupiedSlots.push({ startTime: session.startTime, endTime: session.endTime });
      }
    });
  });

  const blocks = await TeacherBlock.find({
    teacher: teacherId,
    date: { $gte: start, $lt: end }
  }).lean();

  const blockSlots = blocks.map((block) => ({ startTime: block.startTime, endTime: block.endTime }));
  const baseSlots = baseAvailability.map((a) => ({ startTime: a.startTime, endTime: a.endTime }));

  const afterTimetableSubtraction = subtractIntervals(baseSlots, occupiedSlots);
  const finalAvailability = subtractIntervals(afterTimetableSubtraction, blockSlots);

  return {
    teacherId,
    date,
    availableSlots: finalAvailability,
    occupiedSlots,
    blockedSlots: blockSlots
  };
};

const isTeacherFree = async (teacherId, date, startTime, endTime) => {
  const availability = await getTeacherAvailability(teacherId, date);
  const requestedStart = toMinutes(startTime);
  const requestedEnd = toMinutes(endTime);

  return availability.availableSlots.some((slot) => {
    const slotStart = toMinutes(slot.startTime);
    const slotEnd = toMinutes(slot.endTime);
    return requestedStart >= slotStart && requestedEnd <= slotEnd;
  });
};

module.exports = {
  createAvailability,
  updateAvailability,
  getTeacherAvailability,
  isTeacherFree
};
