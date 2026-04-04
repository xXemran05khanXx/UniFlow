const mongoose = require('mongoose');

const dailyOverrideSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  originalTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  newTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  startTime: { type: String },
  endTime: { type: String },
  timetableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Timetable' }
});

module.exports = mongoose.model('DailyOverride', dailyOverrideSchema);