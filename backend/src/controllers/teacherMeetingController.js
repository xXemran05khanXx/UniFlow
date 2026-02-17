const asyncHandler = require('../middleware/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const { createMeeting, getMeetingsForTeacher } = require('../services/teacherMeetingService');

const createMeetingHandler = asyncHandler(async (req, res) => {
  const meeting = await createMeeting(req.body, req.user.id);
  res.status(201).json(ApiResponse.success('Meeting created', meeting, 201));
});

const getMeetingsHandler = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;
  const { date } = req.query;

  const meetings = await getMeetingsForTeacher(teacherId, date);
  res.status(200).json(ApiResponse.success('Meetings fetched', meetings));
});

module.exports = {
  createMeetingHandler,
  getMeetingsHandler
};
