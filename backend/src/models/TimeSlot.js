/**
 * TimeSlot Model
 * MongoDB schema for managing time slots in Mumbai University engineering college
 */

const mongoose = require('mongoose');

// Time slot schema
const timeSlotSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Time slot name is required'],
    trim: true,
    index: true
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    validate: {
      validator: function(v) {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Start time must be in HH:MM format'
    },
    index: true
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    validate: {
      validator: function(v) {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'End time must be in HH:MM format'
    },
    index: true
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [5, 'Duration must be at least 5 minutes'],
    max: [480, 'Duration cannot exceed 8 hours'],
    index: true
  },
  type: {
    type: String,
    required: [true, 'Time slot type is required'],
    enum: {
      values: ['lecture', 'laboratory', 'break', 'lunch', 'other'],
      message: 'Type must be one of: lecture, laboratory, break, lunch, other'
    },
    index: true
  },
  dayType: {
    type: String,
    required: [true, 'Day type is required'],
    enum: {
      values: ['weekday', 'saturday', 'sunday', 'all'],
      message: 'Day type must be one of: weekday, saturday, sunday, all'
    },
    index: true
  },
  order: {
    type: Number,
    required: [true, 'Order is required'],
    min: [1, 'Order must be at least 1'],
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Usage tracking
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsed: {
    type: Date
  },
  
  // Constraints and preferences
  isBreakTime: {
    type: Boolean,
    default: false
  },
  isLunchTime: {
    type: Boolean,
    default: false
  },
  allowDoubleBooking: {
    type: Boolean,
    default: false
  },
  preferredFor: [{
    type: String,
    enum: ['theory', 'practical', 'seminar', 'examination']
  }],
  
  // Scheduling constraints
  minimumGap: {
    type: Number,
    default: 0,
    min: 0,
    max: 60
  },
  maximumContinuous: {
    type: Number,
    default: 1,
    min: 1,
    max: 4
  },
  
  // Color coding for UI
  color: {
    type: String,
    default: '#3B82F6',
    match: /^#[0-9A-F]{6}$/i
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for better query performance
timeSlotSchema.index({ dayType: 1, order: 1 });
timeSlotSchema.index({ dayType: 1, startTime: 1 });
timeSlotSchema.index({ type: 1, isActive: 1 });
timeSlotSchema.index({ startTime: 1, endTime: 1, dayType: 1 }, { unique: true });

// Text search index
timeSlotSchema.index({
  name: 'text',
  description: 'text'
});

// Virtual for formatted time display
timeSlotSchema.virtual('formattedTime').get(function() {
  const formatTime = (time) => {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
    return `${displayHour}:${minute} ${ampm}`;
  };
  
  return `${formatTime(this.startTime)} - ${formatTime(this.endTime)}`;
});

// Virtual for time in minutes from start of day
timeSlotSchema.virtual('startMinutes').get(function() {
  const [hour, minute] = this.startTime.split(':').map(Number);
  return hour * 60 + minute;
});

timeSlotSchema.virtual('endMinutes').get(function() {
  const [hour, minute] = this.endTime.split(':').map(Number);
  return hour * 60 + minute;
});

// Virtual for overlap checking
timeSlotSchema.virtual('timeRange').get(function() {
  return {
    start: this.startMinutes,
    end: this.endMinutes
  };
});

// Pre-save middleware
timeSlotSchema.pre('save', function(next) {
  // Calculate duration if not provided
  if (!this.duration && this.startTime && this.endTime) {
    const startMinutes = this.startMinutes;
    const endMinutes = this.endMinutes;
    this.duration = endMinutes - startMinutes;
  }
  
  // Validate that end time is after start time
  if (this.startTime && this.endTime) {
    const startMinutes = this.startMinutes;
    const endMinutes = this.endMinutes;
    
    if (endMinutes <= startMinutes) {
      return next(new Error('End time must be after start time'));
    }
  }
  
  // Set break/lunch flags based on type
  this.isBreakTime = this.type === 'break';
  this.isLunchTime = this.type === 'lunch';
  
  // Set color based on type if not provided
  if (!this.color || this.color === '#3B82F6') {
    const colorMap = {
      'lecture': '#3B82F6',     // Blue
      'laboratory': '#10B981',  // Green
      'break': '#F59E0B',       // Yellow
      'lunch': '#EF4444',       // Red
      'other': '#6B7280'        // Gray
    };
    this.color = colorMap[this.type] || '#3B82F6';
  }
  
  next();
});

// Pre-update middleware
timeSlotSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Instance methods
timeSlotSchema.methods.overlaps = function(otherSlot) {
  if (this.dayType !== otherSlot.dayType && 
      this.dayType !== 'all' && 
      otherSlot.dayType !== 'all') {
    return false;
  }
  
  const thisStart = this.startMinutes;
  const thisEnd = this.endMinutes;
  const otherStart = otherSlot.startMinutes || this.constructor.calculateMinutes(otherSlot.startTime);
  const otherEnd = otherSlot.endMinutes || this.constructor.calculateMinutes(otherSlot.endTime);
  
  return (thisStart < otherEnd && thisEnd > otherStart);
};

timeSlotSchema.methods.isAdjacent = function(otherSlot) {
  if (this.dayType !== otherSlot.dayType && 
      this.dayType !== 'all' && 
      otherSlot.dayType !== 'all') {
    return false;
  }
  
  const thisEnd = this.endMinutes;
  const otherStart = otherSlot.startMinutes || this.constructor.calculateMinutes(otherSlot.startTime);
  const thisStart = this.startMinutes;
  const otherEnd = otherSlot.endMinutes || this.constructor.calculateMinutes(otherSlot.endTime);
  
  return (thisEnd === otherStart || otherEnd === thisStart);
};

timeSlotSchema.methods.canMergeWith = function(otherSlot) {
  return this.type === otherSlot.type && 
         this.dayType === otherSlot.dayType && 
         this.isAdjacent(otherSlot);
};

timeSlotSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

// Static methods
timeSlotSchema.statics.calculateMinutes = function(timeString) {
  const [hour, minute] = timeString.split(':').map(Number);
  return hour * 60 + minute;
};

timeSlotSchema.statics.findOverlapping = function(startTime, endTime, dayType, excludeId = null) {
  const startMinutes = this.calculateMinutes(startTime);
  const endMinutes = this.calculateMinutes(endTime);
  
  const query = {
    $or: [
      { dayType: dayType },
      { dayType: 'all' },
      ...(dayType === 'all' ? [{ dayType: { $in: ['weekday', 'saturday', 'sunday'] } }] : [])
    ],
    $expr: {
      $and: [
        { $lt: [{ $add: [{ $multiply: [{ $toInt: { $substr: ['$startTime', 0, 2] } }, 60] }, { $toInt: { $substr: ['$startTime', 3, 2] } }] }, endMinutes] },
        { $gt: [{ $add: [{ $multiply: [{ $toInt: { $substr: ['$endTime', 0, 2] } }, 60] }, { $toInt: { $substr: ['$endTime', 3, 2] } }] }, startMinutes] }
      ]
    }
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  return this.find(query);
};

timeSlotSchema.statics.findByDayType = function(dayType, activeOnly = true) {
  const query = {
    $or: [
      { dayType: dayType },
      { dayType: 'all' }
    ]
  };
  
  if (activeOnly) {
    query.isActive = true;
  }
  
  return this.find(query).sort({ order: 1, startTime: 1 });
};

timeSlotSchema.statics.generateSchedule = function(dayType) {
  return this.findByDayType(dayType)
    .then(slots => {
      let totalDuration = 0;
      let lectureCount = 0;
      let labCount = 0;
      let breakCount = 0;
      
      slots.forEach(slot => {
        totalDuration += slot.duration;
        switch (slot.type) {
          case 'lecture':
            lectureCount++;
            break;
          case 'laboratory':
            labCount++;
            break;
          case 'break':
          case 'lunch':
            breakCount++;
            break;
        }
      });
      
      return {
        dayType,
        slots,
        totalDuration,
        lectureCount,
        labCount,
        breakCount
      };
    });
};

timeSlotSchema.statics.getNextOrder = function(dayType) {
  return this.findOne({ dayType })
    .sort({ order: -1 })
    .then(lastSlot => {
      return lastSlot ? lastSlot.order + 1 : 1;
    });
};

timeSlotSchema.statics.reorderSlots = function(slotOrders) {
  const operations = slotOrders.map(({ id, order }) => ({
    updateOne: {
      filter: { _id: id },
      update: { order }
    }
  }));
  
  return this.bulkWrite(operations);
};

timeSlotSchema.statics.generateDefaultSlots = function(config, createdBy) {
  const {
    lectureStartTime,
    lectureEndTime,
    lectureDuration,
    breakDuration,
    lunchStartTime,
    lunchDuration,
    labDuration,
    dayTypes
  } = config;
  
  const slots = [];
  
  dayTypes.forEach(dayType => {
    let currentTime = this.calculateMinutes(lectureStartTime);
    const endTime = this.calculateMinutes(lectureEndTime);
    const lunchStart = this.calculateMinutes(lunchStartTime);
    let order = 1;
    let periodCount = 1;
    
    while (currentTime < endTime) {
      // Check if it's lunch time
      if (currentTime >= lunchStart && currentTime < lunchStart + lunchDuration) {
        if (currentTime === lunchStart) {
          slots.push({
            name: 'Lunch Break',
            startTime: this.minutesToTime(currentTime),
            endTime: this.minutesToTime(currentTime + lunchDuration),
            duration: lunchDuration,
            type: 'lunch',
            dayType,
            order: order++,
            isActive: true,
            createdBy
          });
        }
        currentTime = lunchStart + lunchDuration;
        continue;
      }
      
      // Add lecture slot
      const slotEndTime = Math.min(currentTime + lectureDuration, endTime);
      if (slotEndTime > currentTime) {
        slots.push({
          name: `Period ${periodCount}`,
          startTime: this.minutesToTime(currentTime),
          endTime: this.minutesToTime(slotEndTime),
          duration: slotEndTime - currentTime,
          type: 'lecture',
          dayType,
          order: order++,
          isActive: true,
          createdBy
        });
        periodCount++;
      }
      
      currentTime = slotEndTime;
      
      // Add break if not at end and not lunch time
      if (currentTime < endTime && currentTime + breakDuration < lunchStart) {
        slots.push({
          name: `Break ${Math.floor(periodCount / 2)}`,
          startTime: this.minutesToTime(currentTime),
          endTime: this.minutesToTime(currentTime + breakDuration),
          duration: breakDuration,
          type: 'break',
          dayType,
          order: order++,
          isActive: true,
          createdBy
        });
        currentTime += breakDuration;
      }
    }
  });
  
  return this.insertMany(slots);
};

timeSlotSchema.statics.minutesToTime = function(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

timeSlotSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $facet: {
        totalSlots: [{ $count: 'count' }],
        activeSlots: [
          { $match: { isActive: true } },
          { $count: 'count' }
        ],
        typeDistribution: [
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 }
            }
          }
        ],
        dayTypeDistribution: [
          {
            $group: {
              _id: '$dayType',
              count: { $sum: 1 }
            }
          }
        ],
        durationStats: [
          {
            $group: {
              _id: null,
              averageDuration: { $avg: '$duration' },
              totalDuration: { $sum: '$duration' },
              maxDuration: { $max: '$duration' },
              minDuration: { $min: '$duration' }
            }
          }
        ]
      }
    }
  ]);
};

timeSlotSchema.statics.validateSlot = function(slotData) {
  const { startTime, endTime, dayType, _id } = slotData;
  
  return this.findOverlapping(startTime, endTime, dayType, _id)
    .then(overlapping => {
      return overlapping.map(slot => ({
        slot1: slotData,
        slot2: slot,
        conflictType: 'overlap',
        dayType: slot.dayType
      }));
    });
};

timeSlotSchema.statics.findOptimal = function(duration, type, dayType) {
  const query = {
    duration: { $gte: duration },
    type: type,
    isActive: true
  };
  
  if (dayType !== 'all') {
    query.$or = [
      { dayType: dayType },
      { dayType: 'all' }
    ];
  }
  
  return this.find(query)
    .sort({ usageCount: 1, duration: 1 })
    .limit(10);
};

// Export the model
module.exports = mongoose.model('TimeSlot', timeSlotSchema);
