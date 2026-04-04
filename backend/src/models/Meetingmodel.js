// models/Meeting.js
const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const meetingSchema = new Schema({
  title: {
    type:     String,
    required: true,
    trim:     true,
  },

  description: {
    type:    String,
    default: '',
  },

  // Admin who created the meeting
  createdBy: {
    type:     Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },

  // Day of week for the meeting (mirrors timetable pattern)
  dayOfWeek: {
    type:     String,
    required: true,
    enum:     ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  },

  startTime: { type: String, required: true },   // "10:20"
  endTime:   { type: String, required: true },   // "11:15"

  // Location / room (optional)
  venue: {
    type:    String,
    default: 'To be announced',
  },

  // Invited teachers — each gets their own status
  invitees: [
    {
      teacher:  { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
      status:   { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
      notified: { type: Boolean, default: false },
      respondedAt: Date,
    },
  ],

  // overall meeting status
  status: {
    type:    String,
    enum:    ['scheduled', 'cancelled', 'completed'],
    default: 'scheduled',
  },

  // Specific date for the meeting (optional — use with dayOfWeek for recurring)
  meetingDate: {
    type: Date,
  },

  academicYear: {
    type:    Number,
    default: () => new Date().getFullYear(),
  },

}, { timestamps: true });

meetingSchema.index({ dayOfWeek: 1, startTime: 1 });
meetingSchema.index({ 'invitees.teacher': 1 });
meetingSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Meeting', meetingSchema);