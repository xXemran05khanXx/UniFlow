const mongoose = require('mongoose');

const teacherBlockSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
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
    reason: {
      type: String,
      default: 'Blocked'
    }
  },
  { timestamps: true }
);

teacherBlockSchema.index({ teacher: 1, date: 1 });

module.exports = mongoose.model('TeacherBlock', teacherBlockSchema);
