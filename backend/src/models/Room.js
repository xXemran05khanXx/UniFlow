/**
 * Room Model
 * MongoDB schema for managing rooms in Mumbai University engineering college
 */

const mongoose = require('mongoose');

// Equipment schema
const equipmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  condition: {
    type: String,
    required: true,
    enum: ['excellent', 'good', 'fair', 'poor', 'needs_repair'],
    default: 'good'
  },
  lastMaintenanceDate: {
    type: Date
  },
  nextMaintenanceDate: {
    type: Date
  },
  maintenanceNotes: {
    type: String,
    trim: true
  }
}, { _id: false });

// Accessibility features schema
const accessibilitySchema = new mongoose.Schema({
  wheelchairAccessible: {
    type: Boolean,
    default: false
  },
  elevatorAccess: {
    type: Boolean,
    default: false
  },
  disabledParking: {
    type: Boolean,
    default: false
  },
  accessibleRestroom: {
    type: Boolean,
    default: false
  },
  brailleSignage: {
    type: Boolean,
    default: false
  },
  audioSystem: {
    type: Boolean,
    default: false
  }
}, { _id: false });

// Booking schema for room reservations
const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  purpose: {
    type: String,
    required: true,
    trim: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

// Maintenance record schema
const maintenanceSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['routine', 'repair', 'cleaning', 'inspection', 'upgrade']
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  completedDate: {
    type: Date
  },
  assignedTo: {
    type: String,
    trim: true
  },
  cost: {
    type: Number,
    min: 0
  },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  notes: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

// Utilization tracking schema
const utilizationSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  totalHours: {
    type: Number,
    required: true,
    min: 0,
    max: 24
  },
  usedHours: {
    type: Number,
    required: true,
    min: 0,
    max: 24
  },
  utilizationRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  sessions: [{
    startTime: Date,
    endTime: Date,
    purpose: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }]
}, { _id: true });

// Main Room schema
const roomSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
    required: [true, 'Room number is required'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Room name is required'],
    trim: true,
    index: true
  },
  building: {
    type: String,
    required: [true, 'Building is required'],
    trim: true,
    index: true,
    enum: [
      'Main Building',
      'Computer Science Block',
      'Engineering Block A',
      'Engineering Block B',
      'Laboratory Complex',
      'Library Building',
      'Administration Block'
    ]
  },
  floor: {
    type: Number,
    required: [true, 'Floor is required'],
    min: [0, 'Floor cannot be negative'],
    max: [20, 'Floor cannot exceed 20'],
    index: true
  },
  capacity: {
    type: Number,
    required: [true, 'Capacity is required'],
    min: [1, 'Capacity must be at least 1'],
    max: [1000, 'Capacity cannot exceed 1000'],
    index: true
  },
  type: {
    type: String,
    required: [true, 'Room type is required'],
    enum: [
      'classroom',
      'laboratory', 
      'lecture_hall',
      'seminar_room',
      'auditorium',
      'library',
      'office',
      'other'
    ],
    index: true
  },
  department: {
    type: String,
    trim: true,
    enum: [
      'Computer Science',
      'Information Technology',
      'Electronics & Telecommunication',
      'Electrical Engineering',
      'Mechanical Engineering',
      'Civil Engineering',
      'Chemical Engineering',
      'Instrumentation Engineering',
      'General',
      ''
    ],
    index: true
  },
  
  // Basic amenities
  airConditioning: {
    type: Boolean,
    default: false,
    index: true
  },
  projector: {
    type: Boolean,
    default: false,
    index: true
  },
  smartBoard: {
    type: Boolean,
    default: false,
    index: true
  },
  wifi: {
    type: Boolean,
    default: false,
    index: true
  },
  powerOutlets: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Additional features
  features: [{
    type: String,
    trim: true
  }],
  
  // Equipment
  equipment: [equipmentSchema],
  
  // Accessibility features
  accessibility: {
    type: accessibilitySchema,
    default: () => ({})
  },
  
  // Room status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isAvailable: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Booking and scheduling
  bookings: [bookingSchema],
  
  // Maintenance
  maintenanceRecords: [maintenanceSchema],
  lastMaintenanceDate: {
    type: Date
  },
  nextMaintenanceDate: {
    type: Date
  },
  
  // Utilization tracking
  utilizationHistory: [utilizationSchema],
  
  // Additional information
  notes: {
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
  
  // Location coordinates (for future mapping)
  coordinates: {
    latitude: Number,
    longitude: Number
  },
  
  // Photo URLs
  photos: [{
    url: String,
    description: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Emergency information
  emergencyExits: [{
    direction: String,
    description: String
  }],
  fireExtinguisher: {
    type: Boolean,
    default: false
  },
  firstAidKit: {
    type: Boolean,
    default: false
  },
  
  // Environmental features
  naturalLight: {
    type: Boolean,
    default: false
  },
  ventilation: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor'],
    default: 'good'
  },
  noiseLevel: {
    type: String,
    enum: ['very_quiet', 'quiet', 'moderate', 'noisy'],
    default: 'moderate'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
roomSchema.index({ building: 1, floor: 1 });
roomSchema.index({ type: 1, isActive: 1 });
roomSchema.index({ department: 1, isActive: 1 });
roomSchema.index({ capacity: 1, isAvailable: 1 });
roomSchema.index({ 'bookings.startTime': 1, 'bookings.endTime': 1 });
roomSchema.index({ createdAt: -1 });

// Text search index
roomSchema.index({
  roomNumber: 'text',
  name: 'text',
  building: 'text',
  department: 'text',
  features: 'text'
});

// Virtual for full room identifier
roomSchema.virtual('fullIdentifier').get(function() {
  return `${this.building} - ${this.roomNumber}`;
});

// Virtual for current occupancy status
roomSchema.virtual('currentOccupancy').get(function() {
  const now = new Date();
  const currentBooking = this.bookings.find(booking => 
    booking.startTime <= now && 
    booking.endTime >= now && 
    booking.status === 'approved'
  );
  return currentBooking ? 'occupied' : 'available';
});

// Virtual for upcoming bookings
roomSchema.virtual('upcomingBookings').get(function() {
  const now = new Date();
  return this.bookings
    .filter(booking => booking.startTime > now && booking.status === 'approved')
    .sort((a, b) => a.startTime - b.startTime)
    .slice(0, 5);
});

// Virtual for maintenance status
roomSchema.virtual('maintenanceStatus').get(function() {
  const now = new Date();
  const activeMaintenances = this.maintenanceRecords.filter(
    record => record.status === 'scheduled' || record.status === 'in_progress'
  );
  
  if (activeMaintenances.length > 0) {
    return 'maintenance_required';
  }
  
  if (this.nextMaintenanceDate && this.nextMaintenanceDate <= now) {
    return 'maintenance_due';
  }
  
  return 'good';
});

// Virtual for utilization rate (last 30 days)
roomSchema.virtual('recentUtilizationRate').get(function() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentUtilizations = this.utilizationHistory.filter(
    util => util.date >= thirtyDaysAgo
  );
  
  if (recentUtilizations.length === 0) return 0;
  
  const totalRate = recentUtilizations.reduce(
    (sum, util) => sum + util.utilizationRate, 0
  );
  
  return Math.round(totalRate / recentUtilizations.length);
});

// Pre-save middleware
roomSchema.pre('save', function(next) {
  // Automatically set coordinates based on building (placeholder values)
  if (!this.coordinates && this.building) {
    const buildingCoordinates = {
      'Main Building': { latitude: 19.0760, longitude: 72.8777 },
      'Computer Science Block': { latitude: 19.0761, longitude: 72.8778 },
      'Engineering Block A': { latitude: 19.0762, longitude: 72.8779 },
      'Engineering Block B': { latitude: 19.0763, longitude: 72.8780 },
      'Laboratory Complex': { latitude: 19.0764, longitude: 72.8781 },
      'Library Building': { latitude: 19.0765, longitude: 72.8782 },
      'Administration Block': { latitude: 19.0766, longitude: 72.8783 }
    };
    
    this.coordinates = buildingCoordinates[this.building];
  }
  
  // Validate booking times
  if (this.bookings && this.bookings.length > 0) {
    for (let booking of this.bookings) {
      if (booking.startTime >= booking.endTime) {
        return next(new Error('Booking start time must be before end time'));
      }
    }
  }
  
  next();
});

// Instance methods
roomSchema.methods.isBookedAt = function(startTime, endTime) {
  return this.bookings.some(booking => 
    booking.status === 'approved' &&
    ((startTime >= booking.startTime && startTime < booking.endTime) ||
     (endTime > booking.startTime && endTime <= booking.endTime) ||
     (startTime <= booking.startTime && endTime >= booking.endTime))
  );
};

roomSchema.methods.getAvailableSlots = function(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(6, 0, 0, 0); // Start at 6 AM
  
  const endOfDay = new Date(date);
  endOfDay.setHours(22, 0, 0, 0); // End at 10 PM
  
  const bookedSlots = this.bookings
    .filter(booking => 
      booking.status === 'approved' &&
      booking.startTime >= startOfDay &&
      booking.endTime <= endOfDay
    )
    .sort((a, b) => a.startTime - b.startTime);
  
  const availableSlots = [];
  let currentTime = startOfDay;
  
  for (let booking of bookedSlots) {
    if (currentTime < booking.startTime) {
      availableSlots.push({
        startTime: new Date(currentTime),
        endTime: new Date(booking.startTime)
      });
    }
    currentTime = booking.endTime;
  }
  
  if (currentTime < endOfDay) {
    availableSlots.push({
      startTime: new Date(currentTime),
      endTime: new Date(endOfDay)
    });
  }
  
  return availableSlots;
};

roomSchema.methods.scheduleMaintenance = function(maintenanceData) {
  this.maintenanceRecords.push(maintenanceData);
  
  if (maintenanceData.type === 'routine') {
    // Schedule next routine maintenance in 3 months
    const nextDate = new Date(maintenanceData.scheduledDate);
    nextDate.setMonth(nextDate.getMonth() + 3);
    this.nextMaintenanceDate = nextDate;
  }
  
  return this.save();
};

roomSchema.methods.updateUtilization = function(date, sessions) {
  const existingIndex = this.utilizationHistory.findIndex(
    util => util.date.toDateString() === date.toDateString()
  );
  
  const totalHours = 16; // 6 AM to 10 PM
  const usedHours = sessions.reduce((total, session) => {
    const duration = (session.endTime - session.startTime) / (1000 * 60 * 60);
    return total + duration;
  }, 0);
  
  const utilizationRate = Math.round((usedHours / totalHours) * 100);
  
  const utilizationData = {
    date,
    totalHours,
    usedHours,
    utilizationRate,
    sessions
  };
  
  if (existingIndex >= 0) {
    this.utilizationHistory[existingIndex] = utilizationData;
  } else {
    this.utilizationHistory.push(utilizationData);
  }
  
  // Keep only last 365 days of utilization data
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  this.utilizationHistory = this.utilizationHistory.filter(
    util => util.date >= oneYearAgo
  );
  
  return this.save();
};

// Static methods
roomSchema.statics.findAvailableRooms = function(startTime, endTime, filters = {}) {
  const query = {
    isActive: true,
    isAvailable: true,
    ...filters
  };
  
  return this.find(query).then(rooms => {
    return rooms.filter(room => !room.isBookedAt(startTime, endTime));
  });
};

roomSchema.statics.getUtilizationReport = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        'utilizationHistory.date': {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $unwind: '$utilizationHistory'
    },
    {
      $match: {
        'utilizationHistory.date': {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: {
          roomId: '$_id',
          roomNumber: '$roomNumber',
          building: '$building',
          type: '$type'
        },
        averageUtilization: { $avg: '$utilizationHistory.utilizationRate' },
        totalSessions: { $sum: { $size: '$utilizationHistory.sessions' } },
        totalUsedHours: { $sum: '$utilizationHistory.usedHours' }
      }
    },
    {
      $sort: { averageUtilization: -1 }
    }
  ]);
};

roomSchema.statics.getMaintenanceSchedule = function(startDate, endDate) {
  return this.aggregate([
    {
      $unwind: '$maintenanceRecords'
    },
    {
      $match: {
        'maintenanceRecords.scheduledDate': {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $project: {
        roomNumber: 1,
        building: 1,
        maintenance: '$maintenanceRecords'
      }
    },
    {
      $sort: { 'maintenance.scheduledDate': 1 }
    }
  ]);
};

roomSchema.statics.getRoomStats = function() {
  return this.aggregate([
    {
      $facet: {
        totalRooms: [{ $count: 'count' }],
        activeRooms: [
          { $match: { isActive: true } },
          { $count: 'count' }
        ],
        availableRooms: [
          { $match: { isActive: true, isAvailable: true } },
          { $count: 'count' }
        ],
        capacityStats: [
          {
            $group: {
              _id: null,
              totalCapacity: { $sum: '$capacity' },
              averageCapacity: { $avg: '$capacity' },
              maxCapacity: { $max: '$capacity' },
              minCapacity: { $min: '$capacity' }
            }
          }
        ],
        typeDistribution: [
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 }
            }
          }
        ],
        buildingDistribution: [
          {
            $group: {
              _id: '$building',
              count: { $sum: 1 }
            }
          }
        ]
      }
    }
  ]);
};

// Export the model
module.exports = mongoose.model('Room', roomSchema);
