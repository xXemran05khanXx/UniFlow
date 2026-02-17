// Export all Mongoose models for UniFlow Timetable System
const User = require('./User');
const Course = require('./Course');
const Room = require('./Room');
const Timetable = require('./Timetable');
const TimeSlot = require('./TimeSlot');
const Department = require('./Department');
const TeacherMeeting = require('./TeacherMeeting');

module.exports = {
  User,
  Course,
  Room,
  Timetable,
  TimeSlot,
  Department,
  TeacherMeeting
};
