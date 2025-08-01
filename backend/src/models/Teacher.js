const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  // Reference to User model
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Professional Information
  employeeId: {
    type: String,
    required: true,
    unique: true,
    match: [/^[A-Z0-9]{4,10}$/, 'Employee ID must be 4-10 alphanumeric characters']
  },
  title: {
    type: String,
    enum: [
      'professor',
      'associate_professor',
      'assistant_professor',
      'lecturer',
      'adjunct_professor',
      'visiting_professor',
      'instructor',
      'teaching_assistant'
    ],
    required: true
  },
  
  // Academic Information
  department: {
    type: String,
    required: [true, 'Please provide department'],
    trim: true
  },
  faculty: {
    type: String,
    required: [true, 'Please provide faculty'],
    trim: true
  },
  office: {
    building: String,
    room: String,
    phone: String
  },
  
  // Qualifications
  qualifications: [{
    degree: {
      type: String,
      enum: ['bachelor', 'master', 'phd', 'postdoc', 'certificate'],
      required: true
    },
    field: {
      type: String,
      required: true
    },
    institution: {
      type: String,
      required: true
    },
    year: {
      type: Number,
      required: true,
      min: 1950,
      max: new Date().getFullYear()
    },
    country: String
  }],
  
  // Specializations and Expertise
  specializations: [{
    type: String,
    trim: true
  }],
  researchAreas: [{
    type: String,
    trim: true
  }],
  
  // Employment Details
  employment: {
    hireDate: {
      type: Date,
      required: true
    },
    contractType: {
      type: String,
      enum: ['permanent', 'contract', 'part_time', 'visiting'],
      default: 'permanent'
    },
    status: {
      type: String,
      enum: ['active', 'on_leave', 'sabbatical', 'retired', 'terminated'],
      default: 'active'
    },
    workload: {
      type: Number,
      min: 0,
      max: 100,
      default: 100 // Percentage of full-time
    }
  },
  
  // Teaching Information
  teaching: {
    maxCoursesPerSemester: {
      type: Number,
      default: 4,
      min: 1,
      max: 10
    },
    preferredTimeSlots: [{
      day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      },
      startTime: String, // Format: "HH:MM"
      endTime: String    // Format: "HH:MM"
    }],
    unavailableSlots: [{
      day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      },
      startTime: String,
      endTime: String,
      reason: String
    }],
    teachingLoad: {
      currentSemester: { type: Number, default: 0 },
      maxLoad: { type: Number, default: 12 } // Credit hours
    }
  },
  
  // Contact and Availability
  officeHours: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    startTime: String,
    endTime: String,
    location: String,
    type: {
      type: String,
      enum: ['in_person', 'virtual', 'hybrid'],
      default: 'in_person'
    }
  }],
  
  // Professional Development
  certifications: [{
    name: String,
    issuer: String,
    issueDate: Date,
    expiryDate: Date,
    credentialId: String
  }],
  
  // Performance and Evaluation
  evaluation: {
    overallRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    studentRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    lastEvaluationDate: Date,
    notes: String
  },
  
  // Additional Information
  biography: {
    type: String,
    maxlength: [2000, 'Biography cannot be more than 2000 characters']
  },
  website: String,
  socialMedia: {
    linkedin: String,
    twitter: String,
    researchGate: String,
    googleScholar: String
  },
  
  // System Information
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
teacherSchema.index({ user: 1 });
teacherSchema.index({ employeeId: 1 });
teacherSchema.index({ department: 1, isActive: 1 });
teacherSchema.index({ faculty: 1 });
teacherSchema.index({ 'employment.status': 1 });
teacherSchema.index({ specializations: 1 });

// Virtual for years of experience
teacherSchema.virtual('yearsOfExperience').get(function() {
  if (!this.employment.hireDate) return 0;
  const today = new Date();
  const hireDate = new Date(this.employment.hireDate);
  return Math.floor((today - hireDate) / (365.25 * 24 * 60 * 60 * 1000));
});

// Virtual for current course load
teacherSchema.virtual('currentCourseCount').get(function() {
  return this.teaching.teachingLoad.currentSemester || 0;
});

// Virtual for availability status
teacherSchema.virtual('isAvailable').get(function() {
  return this.employment.status === 'active' && this.isActive;
});

// Method to check if teacher can take additional courses
teacherSchema.methods.canTakeAdditionalCourse = function() {
  return this.teaching.teachingLoad.currentSemester < this.teaching.maxCoursesPerSemester;
};

// Method to get available time slots
teacherSchema.methods.getAvailableTimeSlots = function() {
  // This would return time slots that are not in unavailableSlots
  // Implementation would depend on your scheduling logic
  return this.teaching.preferredTimeSlots.filter(slot => {
    return !this.teaching.unavailableSlots.some(unavailable => 
      unavailable.day === slot.day &&
      this.timeOverlaps(slot, unavailable)
    );
  });
};

// Helper method to check time overlaps
teacherSchema.methods.timeOverlaps = function(slot1, slot2) {
  const start1 = this.timeToMinutes(slot1.startTime);
  const end1 = this.timeToMinutes(slot1.endTime);
  const start2 = this.timeToMinutes(slot2.startTime);
  const end2 = this.timeToMinutes(slot2.endTime);
  
  return start1 < end2 && start2 < end1;
};

// Helper method to convert time string to minutes
teacherSchema.methods.timeToMinutes = function(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

// Method to add qualification
teacherSchema.methods.addQualification = function(qualification) {
  this.qualifications.push(qualification);
  return this.save();
};

// Method to update teaching load
teacherSchema.methods.updateTeachingLoad = function(creditHours, operation = 'add') {
  if (operation === 'add') {
    this.teaching.teachingLoad.currentSemester += creditHours;
  } else if (operation === 'subtract') {
    this.teaching.teachingLoad.currentSemester = Math.max(0, this.teaching.teachingLoad.currentSemester - creditHours);
  }
  return this.save();
};

// Static method to find teachers by department
teacherSchema.statics.findByDepartment = function(department) {
  return this.find({ department, isActive: true })
    .populate('user', 'firstName lastName email phone')
    .sort('user.lastName');
};

// Static method to find available teachers
teacherSchema.statics.findAvailable = function() {
  return this.find({ 
    'employment.status': 'active',
    isActive: true 
  }).populate('user', 'firstName lastName email');
};

module.exports = mongoose.model('Teacher', teacherSchema);
