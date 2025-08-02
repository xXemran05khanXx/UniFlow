// Export all Mongoose models for UniFlow Timetable System
const User = require('./User');
const Course = require('./Course');
const Teacher = require('./Teacher');
const Room = require('./Room');
const Timetable = require('./Timetable');

module.exports = {
  User,
  Course,
  Teacher,
  Room,
  Timetable
};
