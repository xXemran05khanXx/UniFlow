// Export all Mongoose models
const User = require('./User');
const Project = require('./Project');
const Flow = require('./Flow');
const Execution = require('./Execution');
const Template = require('./Template');

module.exports = {
  User,
  Project,
  Flow,
  Execution,
  Template
};
