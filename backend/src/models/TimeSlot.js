const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  startTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  },
  endTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  },
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0,
    max: 6, // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Validate that end time is after start time
timeSlotSchema.pre('save', function(next) {
  const startTime = this.startTime.split(':').map(Number);
  const endTime = this.endTime.split(':').map(Number);
  
  const startMinutes = startTime[0] * 60 + startTime[1];
  const endMinutes = endTime[0] * 60 + endTime[1];
  
  if (endMinutes <= startMinutes) {
    return next(new Error('End time must be after start time'));
  }
  
  next();
});

// Compound index to prevent duplicate time slots for the same day
timeSlotSchema.index({ dayOfWeek: 1, startTime: 1, endTime: 1 }, { unique: true });

// Virtual for duration in minutes
timeSlotSchema.virtual('durationMinutes').get(function() {
  const startTime = this.startTime.split(':').map(Number);
  const endTime = this.endTime.split(':').map(Number);
  
  const startMinutes = startTime[0] * 60 + startTime[1];
  const endMinutes = endTime[0] * 60 + endTime[1];
  
  return endMinutes - startMinutes;
});

// Method to check if time slot overlaps with another
timeSlotSchema.methods.overlapsWith = function(otherTimeSlot) {
  if (this.dayOfWeek !== otherTimeSlot.dayOfWeek) {
    return false;
  }
  
  const thisStart = this.startTime.split(':').map(Number);
  const thisEnd = this.endTime.split(':').map(Number);
  const otherStart = otherTimeSlot.startTime.split(':').map(Number);
  const otherEnd = otherTimeSlot.endTime.split(':').map(Number);
  
  const thisStartMinutes = thisStart[0] * 60 + thisStart[1];
  const thisEndMinutes = thisEnd[0] * 60 + thisEnd[1];
  const otherStartMinutes = otherStart[0] * 60 + otherStart[1];
  const otherEndMinutes = otherEnd[0] * 60 + otherEnd[1];
  
  return thisStartMinutes < otherEndMinutes && thisEndMinutes > otherStartMinutes;
};

// Static method to get all time slots for a specific day
timeSlotSchema.statics.getByDay = function(dayOfWeek) {
  return this.find({ dayOfWeek, isActive: true }).sort({ startTime: 1 });
};

// Static method to get active time slots
timeSlotSchema.statics.getActive = function() {
  return this.find({ isActive: true }).sort({ dayOfWeek: 1, startTime: 1 });
};

const TimeSlot = mongoose.model('TimeSlot', timeSlotSchema);

module.exports = TimeSlot;
