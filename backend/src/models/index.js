// Export all Mongoose models
const User = require('./User');
const Project = require('./Project');
const Flow = require('./Flow');
const Execution = require('./Execution');
const Template = require('./Template');
const Course = require('./Course');
const Teacher = require('./Teacher');
const Room = require('./Room');
const Timetable = require('./Timetable');

module.exports = {
  User,
  Project,
  Flow,
  Execution,
  Template,
  Course,
  Teacher,
  Room,
  Timetable
};
