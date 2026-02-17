const mongoose = require('mongoose');

const { Schema } = mongoose;

const TIME_REGEX = /^([0-1]\d|2[0-3]):[0-5]\d$/;

const toMinutes = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

const toUTCDateOnly = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const roomBookingSchema = new Schema({
  room: {
    type: Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  bookedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  purpose: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true,
    set: toUTCDateOnly
  },
  startTime: {
    type: String,
    required: true,
    match: TIME_REGEX
  },
  endTime: {
    type: String,
    required: true,
    match: TIME_REGEX
  },
  status: {
    type: String,
    enum: ['approved', 'cancelled'],
    default: 'approved'
  }
}, { timestamps: true });

roomBookingSchema.index({ room: 1, date: 1, startTime: 1 });

roomBookingSchema.pre('validate', function(next) {
  if (!this.startTime || !this.endTime) {
    return next();
  }

  const startMinutes = toMinutes(this.startTime);
  const endMinutes = toMinutes(this.endTime);

  if (endMinutes <= startMinutes) {
    return next(new Error('endTime must be after startTime'));
  }

  if (!this.date || Number.isNaN(new Date(this.date).getTime())) {
    return next(new Error('Invalid booking date'));
  }

  next();
});

module.exports = mongoose.model('RoomBooking', roomBookingSchema);
