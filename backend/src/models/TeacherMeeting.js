const mongoose = require('mongoose');

const teacherMeetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    location: {
      type: String,
      default: 'Online'
    }
  },
  { timestamps: true }
);

teacherMeetingSchema.index({ date: 1 });

module.exports = mongoose.model('TeacherMeeting', teacherMeetingSchema);
