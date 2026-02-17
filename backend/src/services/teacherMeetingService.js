const TeacherMeeting = require('../models/TeacherMeeting');
const ApiError = require('../utils/ApiError');
const { isTeacherFree } = require('./teacherAvailabilityService');

const toMinutes = (time) => {
  const [h, m] = String(time).split(':').map(Number);
  return h * 60 + m;
};

const dayRange = (dateString) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
  return { start, end };
};

const hasMeetingConflict = async (teacherId, date, startTime, endTime) => {
  const range = dayRange(date);
  if (!range) {
    throw new ApiError('Invalid date', 400);
  }

  const requestedStart = toMinutes(startTime);
  const requestedEnd = toMinutes(endTime);

  const overlapping = await TeacherMeeting.find({
    participants: teacherId,
    date: { $gte: range.start, $lt: range.end }
  }).lean();

  return overlapping.some((meeting) => {
    const meetingStart = toMinutes(meeting.startTime);
    const meetingEnd = toMinutes(meeting.endTime);
    return requestedStart < meetingEnd && meetingStart < requestedEnd;
  });
};

const createMeeting = async (data, userId) => {
  const { participants, date, startTime, endTime } = data;

  if (!participants || participants.length === 0) {
    throw new ApiError('At least one participant required', 400);
  }

  for (const teacherId of participants) {
    const conflict = await hasMeetingConflict(teacherId, date, startTime, endTime);
    if (conflict) {
      throw new ApiError(`Teacher ${teacherId} already has a meeting in this slot`, 409);
    }

    const free = await isTeacherFree(teacherId, date, startTime, endTime);
    if (!free) {
      throw new ApiError(`Teacher ${teacherId} is not available in selected slot`, 409);
    }
  }

  return TeacherMeeting.create({
    ...data,
    createdBy: userId
  });
};

const getMeetingsForTeacher = async (teacherId, date) => {
  const range = dayRange(date);
  if (!range) {
    throw new ApiError('Invalid date', 400);
  }

  return TeacherMeeting.find({
    participants: teacherId,
    date: { $gte: range.start, $lt: range.end }
  })
    .populate('participants', 'name email')
    .populate('createdBy', 'name email');
};

module.exports = {
  createMeeting,
  getMeetingsForTeacher
};
