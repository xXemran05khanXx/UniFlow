const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  // Basic Room Information
  roomNumber: {
    type: String,
    required: [true, 'Please provide room number'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9-]{1,10}$/, 'Room number must be alphanumeric with optional hyphens']
  },
  roomName: {
    type: String,
    trim: true,
    maxlength: [100, 'Room name cannot be more than 100 characters']
  },
  
  // Location Information
  building: {
    name: {
      type: String,
      required: [true, 'Please provide building name'],
      trim: true
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      maxlength: [10, 'Building code cannot be more than 10 characters']
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'USA' }
    }
  },
  floor: {
    type: Number,
    required: [true, 'Please provide floor number'],
    min: [-2, 'Floor cannot be below -2 (sub-basement)'],
    max: [50, 'Floor cannot exceed 50']
  },
  wing: {
    type: String,
    enum: ['north', 'south', 'east', 'west', 'central', 'none'],
    default: 'none'
  },
  
  // Room Specifications
  capacity: {
    normal: {
      type: Number,
      required: [true, 'Please provide normal capacity'],
      min: [1, 'Capacity must be at least 1'],
      max: [1000, 'Capacity cannot exceed 1000']
    },
    maximum: {
      type: Number,
      required: true,
      min: [1, 'Maximum capacity must be at least 1']
    },
    exam: {
      type: Number,
      min: [0, 'Exam capacity cannot be negative']
    }
  },
  
  // Room Type and Purpose
  type: {
    type: String,
    enum: [
      'classroom',
      'lecture_hall',
      'laboratory',
      'computer_lab',
      'library',
      'auditorium',
      'seminar_room',
      'conference_room',
      'office',
      'study_room',
      'workshop',
      'studio',
      'gymnasium',
      'cafeteria',
      'other'
    ],
    required: true
  },
  category: {
    type: String,
    enum: ['academic', 'administrative', 'recreational', 'service', 'storage'],
    default: 'academic'
  },
  
  // Physical Specifications
  dimensions: {
    length: { type: Number, min: 0 }, // in meters
    width: { type: Number, min: 0 },  // in meters
    height: { type: Number, min: 0 }, // in meters
    area: { type: Number, min: 0 }    // in square meters
  },
  
  // Equipment and Features
  equipment: {
    projector: { type: Boolean, default: false },
    smartBoard: { type: Boolean, default: false },
    whiteBoard: { type: Boolean, default: false },
    blackBoard: { type: Boolean, default: false },
    audioSystem: { type: Boolean, default: false },
    microphone: { type: Boolean, default: false },
    speakers: { type: Boolean, default: false },
    videoConferencing: { type: Boolean, default: false },
    airConditioning: { type: Boolean, default: false },
    heating: { type: Boolean, default: false },
    windows: { type: Boolean, default: true },
    naturalLight: { type: Boolean, default: true }
  },
  
  technology: {
    wifi: { type: Boolean, default: true },
    ethernet: { type: Boolean, default: false },
    powerOutlets: { type: Number, default: 4, min: 0 },
    computers: { type: Number, default: 0, min: 0 },
    printers: { type: Number, default: 0, min: 0 },
    smartTV: { type: Boolean, default: false },
    documentCamera: { type: Boolean, default: false }
  },
  
  furniture: {
    desks: { type: Number, default: 0, min: 0 },
    chairs: { type: Number, default: 0, min: 0 },
    tables: { type: Number, default: 0, min: 0 },
    podium: { type: Boolean, default: false },
    storage: { type: Boolean, default: false },
    movableFurniture: { type: Boolean, default: true }
  },
  
  // Accessibility and Safety
  accessibility: {
    wheelchairAccessible: { type: Boolean, default: false },
    elevatorAccess: { type: Boolean, default: false },
    hearingLoop: { type: Boolean, default: false },
    visualAid: { type: Boolean, default: false },
    emergencyExit: { type: Boolean, default: true },
    fireExtinguisher: { type: Boolean, default: true },
    firstAidKit: { type: Boolean, default: false }
  },
  
  // Room Policies and Rules
  policies: {
    foodAllowed: { type: Boolean, default: false },
    drinksAllowed: { type: Boolean, default: true },
    smokingAllowed: { type: Boolean, default: false },
    petsAllowed: { type: Boolean, default: false },
    afterHoursAccess: { type: Boolean, default: false },
    keyRequired: { type: Boolean, default: true },
    supervisionRequired: { type: Boolean, default: false }
  },
  
  // Scheduling and Availability
  availability: {
    defaultHours: {
      monday: { start: String, end: String, available: { type: Boolean, default: true } },
      tuesday: { start: String, end: String, available: { type: Boolean, default: true } },
      wednesday: { start: String, end: String, available: { type: Boolean, default: true } },
      thursday: { start: String, end: String, available: { type: Boolean, default: true } },
      friday: { start: String, end: String, available: { type: Boolean, default: true } },
      saturday: { start: String, end: String, available: { type: Boolean, default: false } },
      sunday: { start: String, end: String, available: { type: Boolean, default: false } }
    },
    bookingAdvanceTime: {
      type: Number,
      default: 24, // hours
      min: 1
    },
    maxBookingDuration: {
      type: Number,
      default: 8, // hours
      min: 1,
      max: 24
    }
  },
  
  // Maintenance and Status
  condition: {
    status: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor', 'under_maintenance'],
      default: 'good'
    },
    lastInspection: Date,
    lastMaintenance: Date,
    nextMaintenance: Date,
    maintenanceNotes: String
  },
  
  // Usage and Analytics
  usage: {
    utilizationRate: { type: Number, min: 0, max: 100, default: 0 },
    averageOccupancy: { type: Number, min: 0, default: 0 },
    totalBookings: { type: Number, default: 0, min: 0 },
    lastUsed: Date,
    popularTimeSlots: [{
      day: String,
      startTime: String,
      endTime: String,
      frequency: Number
    }]
  },
  
  // Contact and Management
  management: {
    department: String,
    responsible: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    contactPhone: String,
    contactEmail: String,
    keyHolder: String
  },
  
  // System Information
  isActive: {
    type: Boolean,
    default: true
  },
  isBookable: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot be more than 1000 characters']
  },
  
  // Images and Documents
  images: [{
    url: String,
    description: String,
    uploadDate: { type: Date, default: Date.now }
  }],
  documents: [{
    name: String,
    url: String,
    type: String,
    uploadDate: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
roomSchema.index({ roomNumber: 1 });
roomSchema.index({ 'building.code': 1, floor: 1 });
roomSchema.index({ type: 1, isActive: 1 });
roomSchema.index({ 'capacity.normal': 1 });
roomSchema.index({ isBookable: 1, isActive: 1 });

// Virtual for full room identifier
roomSchema.virtual('fullRoomId').get(function() {
  return `${this.building.code}-${this.roomNumber}`;
});

// Virtual for capacity utilization
roomSchema.virtual('capacityUtilization').get(function() {
  if (!this.usage.averageOccupancy || !this.capacity.normal) return 0;
  return Math.round((this.usage.averageOccupancy / this.capacity.normal) * 100);
});

// Virtual for room area calculation
roomSchema.virtual('calculatedArea').get(function() {
  if (this.dimensions.area) return this.dimensions.area;
  if (this.dimensions.length && this.dimensions.width) {
    return this.dimensions.length * this.dimensions.width;
  }
  return null;
});

// Virtual for room status summary
roomSchema.virtual('statusSummary').get(function() {
  if (!this.isActive) return 'inactive';
  if (this.condition.status === 'under_maintenance') return 'maintenance';
  if (!this.isBookable) return 'not_bookable';
  return 'available';
});

// Pre-save middleware to calculate maximum capacity
roomSchema.pre('save', function(next) {
  if (!this.capacity.maximum) {
    this.capacity.maximum = Math.floor(this.capacity.normal * 1.2);
  }
  
  if (!this.capacity.exam) {
    this.capacity.exam = Math.floor(this.capacity.normal * 0.5);
  }
  
  next();
});

// Method to check availability for a specific time slot
roomSchema.methods.isAvailable = function(day, startTime, endTime, date = null) {
  if (!this.isActive || !this.isBookable) return false;
  
  const dayAvailability = this.availability.defaultHours[day.toLowerCase()];
  if (!dayAvailability || !dayAvailability.available) return false;
  
  // Check if the requested time is within available hours
  const availableStart = this.timeToMinutes(dayAvailability.start);
  const availableEnd = this.timeToMinutes(dayAvailability.end);
  const requestStart = this.timeToMinutes(startTime);
  const requestEnd = this.timeToMinutes(endTime);
  
  return requestStart >= availableStart && requestEnd <= availableEnd;
};

// Method to check if room meets equipment requirements
roomSchema.methods.hasRequiredEquipment = function(requirements) {
  for (let requirement of requirements) {
    if (requirement.includes('.')) {
      // Handle nested properties like 'technology.wifi'
      const [category, item] = requirement.split('.');
      if (!this[category] || !this[category][item]) return false;
    } else {
      // Handle direct equipment properties
      if (!this.equipment[requirement]) return false;
    }
  }
  return true;
};

// Method to update usage statistics
roomSchema.methods.updateUsageStats = function(occupancy, duration) {
  this.usage.totalBookings += 1;
  this.usage.lastUsed = new Date();
  
  // Update average occupancy (simple moving average)
  const currentAvg = this.usage.averageOccupancy || 0;
  const totalBookings = this.usage.totalBookings;
  this.usage.averageOccupancy = ((currentAvg * (totalBookings - 1)) + occupancy) / totalBookings;
  
  // Update utilization rate based on capacity
  this.usage.utilizationRate = Math.round((this.usage.averageOccupancy / this.capacity.normal) * 100);
  
  return this.save();
};

// Method to add popular time slot
roomSchema.methods.addPopularTimeSlot = function(day, startTime, endTime) {
  const existingSlot = this.usage.popularTimeSlots.find(slot => 
    slot.day === day && slot.startTime === startTime && slot.endTime === endTime
  );
  
  if (existingSlot) {
    existingSlot.frequency += 1;
  } else {
    this.usage.popularTimeSlots.push({
      day,
      startTime,
      endTime,
      frequency: 1
    });
  }
  
  return this.save();
};

// Helper method to convert time string to minutes
roomSchema.methods.timeToMinutes = function(timeString) {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

// Static method to find rooms by capacity
roomSchema.statics.findByCapacity = function(minCapacity, maxCapacity = null) {
  const query = {
    'capacity.normal': { $gte: minCapacity },
    isActive: true,
    isBookable: true
  };
  
  if (maxCapacity) {
    query['capacity.normal'].$lte = maxCapacity;
  }
  
  return this.find(query).sort('capacity.normal');
};

// Static method to find rooms by type and equipment
roomSchema.statics.findByTypeAndEquipment = function(roomType, requiredEquipment = []) {
  const query = {
    type: roomType,
    isActive: true,
    isBookable: true
  };
  
  // Add equipment requirements to query
  requiredEquipment.forEach(equipment => {
    if (equipment.includes('.')) {
      query[equipment] = true;
    } else {
      query[`equipment.${equipment}`] = true;
    }
  });
  
  return this.find(query).sort('roomNumber');
};

// Static method to find available rooms for a time slot
roomSchema.statics.findAvailableRooms = function(day, startTime, endTime, minCapacity = 1) {
  return this.find({
    isActive: true,
    isBookable: true,
    'capacity.normal': { $gte: minCapacity },
    [`availability.defaultHours.${day.toLowerCase()}.available`]: true
  }).sort('capacity.normal');
};

module.exports = mongoose.model('Room', roomSchema);
