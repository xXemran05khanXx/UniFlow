const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  // Basic Timetable Information
  name: {
    type: String,
    required: [true, 'Please provide timetable name'],
    trim: true,
    maxlength: [100, 'Timetable name cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  
  // Academic Period
  academicPeriod: {
    year: {
      type: Number,
      required: [true, 'Please provide academic year'],
      min: [2020, 'Year cannot be before 2020'],
      max: [2030, 'Year cannot be after 2030']
    },
    semester: {
      type: String,
      enum: ['fall', 'spring', 'summer'],
      required: true
    },
    startDate: {
      type: Date,
      required: [true, 'Please provide semester start date']
    },
    endDate: {
      type: Date,
      required: [true, 'Please provide semester end date']
    }
  },
  
  // Timetable Type and Scope
  type: {
    type: String,
    enum: ['master', 'department', 'teacher', 'student', 'room', 'course'],
    required: true
  },
  scope: {
    // For department timetables
    department: String,
    faculty: String,
    
    // For individual timetables
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher'
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room'
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    }
  },
  
  // Time Slot Configuration
  timeSlots: {
    slotDuration: {
      type: Number,
      default: 60, // minutes
      min: 15,
      max: 180
    },
    breakDuration: {
      type: Number,
      default: 15, // minutes
      min: 0,
      max: 60
    },
    dailyStartTime: {
      type: String,
      default: '08:00',
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format']
    },
    dailyEndTime: {
      type: String,
      default: '18:00',
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format']
    },
    workingDays: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }]
  },
  
  // Schedule Entries
  schedule: [{
    // Time Information
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true
    },
    timeSlot: {
      startTime: {
        type: String,
        required: true,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format']
      },
      endTime: {
        type: String,
        required: true,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format']
      },
      slotNumber: Number // Sequential slot number for the day
    },
    
    // Course Information
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    courseCode: String, // Denormalized for quick access
    courseTitle: String, // Denormalized for quick access
    section: String,
    
    // Instructor Information
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true
    },
    instructorName: String, // Denormalized for quick access
    
    // Location Information
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true
    },
    roomNumber: String, // Denormalized for quick access
    building: String, // Denormalized for quick access
    
    // Session Details
    sessionType: {
      type: String,
      enum: ['lecture', 'lab', 'tutorial', 'seminar', 'exam', 'workshop'],
      default: 'lecture'
    },
    credits: Number,
    duration: Number, // in minutes
    
    // Enrollment Information
    enrolledStudents: [{
      student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      enrollmentStatus: {
        type: String,
        enum: ['enrolled', 'waitlisted', 'dropped'],
        default: 'enrolled'
      },
      enrollmentDate: {
        type: Date,
        default: Date.now
      }
    }],
    maxEnrollment: Number,
    currentEnrollment: {
      type: Number,
      default: 0
    },
    
    // Status and Flags
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'postponed'],
      default: 'scheduled'
    },
    isRecurring: {
      type: Boolean,
      default: true
    },
    isExam: {
      type: Boolean,
      default: false
    },
    isLab: {
      type: Boolean,
      default: false
    },
    
    // Recurrence Pattern (for recurring sessions)
    recurrence: {
      pattern: {
        type: String,
        enum: ['weekly', 'biweekly', 'monthly', 'custom'],
        default: 'weekly'
      },
      interval: {
        type: Number,
        default: 1,
        min: 1
      },
      endDate: Date,
      exceptions: [Date] // Dates when this session doesn't occur
    },
    
    // Additional Information
    notes: String,
    requirements: [String],
    resources: [String]
  }],
  
  // Conflicts and Validations
  conflicts: [{
    type: {
      type: String,
      enum: ['room_conflict', 'instructor_conflict', 'student_conflict', 'time_conflict']
    },
    description: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    affectedEntries: [Number], // Indexes of affected schedule entries
    resolved: {
      type: Boolean,
      default: false
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date
  }],
  
  // Generation and Optimization
  generation: {
    algorithm: {
      type: String,
      enum: ['manual', 'genetic', 'constraint_satisfaction', 'greedy', 'simulated_annealing'],
      default: 'manual'
    },
    constraints: {
      hard: [{
        type: String,
        description: String,
        weight: { type: Number, default: 1 }
      }],
      soft: [{
        type: String,
        description: String,
        weight: { type: Number, default: 1 }
      }]
    },
    optimizationScore: {
      type: Number,
      min: 0,
      max: 100
    },
    generationTime: Number, // in milliseconds
    iterations: Number
  },
  
  // Statistics and Analytics
  statistics: {
    totalSessions: {
      type: Number,
      default: 0
    },
    utilizationRate: {
      rooms: { type: Number, min: 0, max: 100 },
      instructors: { type: Number, min: 0, max: 100 },
      timeSlots: { type: Number, min: 0, max: 100 }
    },
    distribution: {
      byDay: {
        monday: Number,
        tuesday: Number,
        wednesday: Number,
        thursday: Number,
        friday: Number,
        saturday: Number,
        sunday: Number
      },
      byTimeSlot: [{
        startTime: String,
        endTime: String,
        sessionCount: Number
      }],
      byDepartment: [{
        department: String,
        sessionCount: Number,
        creditHours: Number
      }]
    },
    conflicts: {
      total: { type: Number, default: 0 },
      resolved: { type: Number, default: 0 },
      pending: { type: Number, default: 0 }
    }
  },
  
  // Publication and Approval
  publication: {
    status: {
      type: String,
      enum: ['draft', 'under_review', 'approved', 'published', 'archived'],
      default: 'draft'
    },
    publishedAt: Date,
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    version: {
      type: String,
      default: '1.0'
    },
    changelog: [{
      version: String,
      changes: String,
      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      changedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // System Information
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
timetableSchema.index({ 
  'academicPeriod.year': 1, 
  'academicPeriod.semester': 1,
  type: 1 
});
timetableSchema.index({ 'scope.department': 1 });
timetableSchema.index({ 'scope.teacher': 1 });
timetableSchema.index({ 'scope.student': 1 });
timetableSchema.index({ 'scope.room': 1 });
timetableSchema.index({ 'schedule.day': 1, 'schedule.timeSlot.startTime': 1 });
timetableSchema.index({ 'schedule.course': 1 });
timetableSchema.index({ 'schedule.instructor': 1 });
timetableSchema.index({ 'schedule.room': 1 });
timetableSchema.index({ 'publication.status': 1 });

// Virtual for total scheduled hours
timetableSchema.virtual('totalScheduledHours').get(function() {
  return this.schedule.reduce((total, entry) => {
    return total + (entry.duration || 60);
  }, 0) / 60; // Convert to hours
});

// Virtual for conflict rate
timetableSchema.virtual('conflictRate').get(function() {
  if (this.statistics.conflicts.total === 0) return 0;
  return Math.round((this.statistics.conflicts.total / this.schedule.length) * 100);
});

// Virtual for is published
timetableSchema.virtual('isPublished').get(function() {
  return this.publication.status === 'published';
});

// Pre-save middleware to update statistics
timetableSchema.pre('save', function(next) {
  // Update total sessions
  this.statistics.totalSessions = this.schedule.length;
  
  // Update conflict statistics
  this.statistics.conflicts.total = this.conflicts.length;
  this.statistics.conflicts.resolved = this.conflicts.filter(c => c.resolved).length;
  this.statistics.conflicts.pending = this.statistics.conflicts.total - this.statistics.conflicts.resolved;
  
  // Update distribution by day
  const dayDistribution = {
    monday: 0, tuesday: 0, wednesday: 0, thursday: 0,
    friday: 0, saturday: 0, sunday: 0
  };
  
  this.schedule.forEach(entry => {
    dayDistribution[entry.day]++;
  });
  
  this.statistics.distribution.byDay = dayDistribution;
  
  next();
});

// Method to add schedule entry
timetableSchema.methods.addScheduleEntry = function(entryData) {
  // Validate for conflicts before adding
  const conflicts = this.checkConflicts(entryData);
  
  if (conflicts.length > 0) {
    throw new Error(`Schedule conflicts detected: ${conflicts.map(c => c.description).join(', ')}`);
  }
  
  this.schedule.push(entryData);
  return this.save();
};

// Method to check for conflicts
timetableSchema.methods.checkConflicts = function(newEntry) {
  const conflicts = [];
  
  this.schedule.forEach((existingEntry, index) => {
    // Same day and time overlap
    if (existingEntry.day === newEntry.day && 
        this.timeOverlaps(existingEntry.timeSlot, newEntry.timeSlot)) {
      
      // Room conflict
      if (existingEntry.room.toString() === newEntry.room.toString()) {
        conflicts.push({
          type: 'room_conflict',
          description: `Room ${existingEntry.roomNumber} is already booked`,
          severity: 'high',
          affectedEntries: [index]
        });
      }
      
      // Instructor conflict
      if (existingEntry.instructor.toString() === newEntry.instructor.toString()) {
        conflicts.push({
          type: 'instructor_conflict',
          description: `Instructor is already scheduled`,
          severity: 'high',
          affectedEntries: [index]
        });
      }
    }
  });
  
  return conflicts;
};

// Method to check time overlap
timetableSchema.methods.timeOverlaps = function(slot1, slot2) {
  const start1 = this.timeToMinutes(slot1.startTime);
  const end1 = this.timeToMinutes(slot1.endTime);
  const start2 = this.timeToMinutes(slot2.startTime);
  const end2 = this.timeToMinutes(slot2.endTime);
  
  return start1 < end2 && start2 < end1;
};

// Helper method to convert time to minutes
timetableSchema.methods.timeToMinutes = function(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

// Method to get schedule for specific day
timetableSchema.methods.getScheduleForDay = function(day) {
  return this.schedule
    .filter(entry => entry.day === day)
    .sort((a, b) => this.timeToMinutes(a.timeSlot.startTime) - this.timeToMinutes(b.timeSlot.startTime));
};

// Method to get instructor's schedule
timetableSchema.methods.getInstructorSchedule = function(instructorId) {
  return this.schedule
    .filter(entry => entry.instructor.toString() === instructorId.toString())
    .sort((a, b) => {
      const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return this.timeToMinutes(a.timeSlot.startTime) - this.timeToMinutes(b.timeSlot.startTime);
    });
};

// Method to get room schedule
timetableSchema.methods.getRoomSchedule = function(roomId) {
  return this.schedule
    .filter(entry => entry.room.toString() === roomId.toString())
    .sort((a, b) => {
      const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return this.timeToMinutes(a.timeSlot.startTime) - this.timeToMinutes(b.timeSlot.startTime);
    });
};

// Method to resolve conflict
timetableSchema.methods.resolveConflict = function(conflictIndex, resolvedBy) {
  if (this.conflicts[conflictIndex]) {
    this.conflicts[conflictIndex].resolved = true;
    this.conflicts[conflictIndex].resolvedBy = resolvedBy;
    this.conflicts[conflictIndex].resolvedAt = new Date();
    return this.save();
  }
  throw new Error('Conflict not found');
};

// Method to publish timetable
timetableSchema.methods.publish = function(publishedBy) {
  if (this.conflicts.some(c => !c.resolved && c.severity === 'critical')) {
    throw new Error('Cannot publish timetable with unresolved critical conflicts');
  }
  
  this.publication.status = 'published';
  this.publication.publishedAt = new Date();
  this.publication.publishedBy = publishedBy;
  return this.save();
};

// Static method to find timetables by academic period
timetableSchema.statics.findByAcademicPeriod = function(year, semester) {
  return this.find({
    'academicPeriod.year': year,
    'academicPeriod.semester': semester,
    isActive: true
  }).populate('scope.teacher scope.student scope.room scope.course');
};

// Static method to find conflicts across all timetables
timetableSchema.statics.findSystemWideConflicts = function(year, semester) {
  return this.aggregate([
    {
      $match: {
        'academicPeriod.year': year,
        'academicPeriod.semester': semester,
        isActive: true
      }
    },
    {
      $unwind: '$conflicts'
    },
    {
      $match: {
        'conflicts.resolved': false
      }
    },
    {
      $group: {
        _id: '$conflicts.type',
        count: { $sum: 1 },
        conflicts: { $push: '$conflicts' }
      }
    }
  ]);
};

module.exports = mongoose.model('Timetable', timetableSchema);
