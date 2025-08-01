const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  // Basic Course Information
  courseCode: {
    type: String,
    required: [true, 'Please provide course code'],
    unique: true,
    uppercase: true,
    match: [/^[A-Z]{2,4}[0-9]{3,4}$/, 'Course code must be in format like CS101, MATH205']
  },
  title: {
    type: String,
    required: [true, 'Please provide course title'],
    trim: true,
    maxlength: [200, 'Course title cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide course description'],
    maxlength: [2000, 'Course description cannot be more than 2000 characters']
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
  level: {
    type: String,
    enum: ['undergraduate', 'graduate', 'postgraduate'],
    required: true
  },
  
  // Course Structure
  credits: {
    type: Number,
    required: [true, 'Please provide credit hours'],
    min: [1, 'Credits must be at least 1'],
    max: [6, 'Credits cannot exceed 6']
  },
  duration: {
    weeks: {
      type: Number,
      default: 16,
      min: 4,
      max: 52
    },
    hoursPerWeek: {
      type: Number,
      required: true,
      min: 1,
      max: 20
    }
  },
  
  // Prerequisites and Requirements
  prerequisites: [{
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    courseCode: String,
    minimumGrade: {
      type: String,
      enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'],
      default: 'C'
    }
  }],
  corequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  
  // Course Content and Objectives
  learningObjectives: [{
    type: String,
    required: true
  }],
  topics: [{
    title: String,
    description: String,
    weekNumber: Number,
    hoursAllocated: Number
  }],
  
  // Assessment Structure
  assessmentStructure: {
    assignments: {
      weight: { type: Number, min: 0, max: 100, default: 20 },
      count: { type: Number, min: 0, default: 3 }
    },
    quizzes: {
      weight: { type: Number, min: 0, max: 100, default: 15 },
      count: { type: Number, min: 0, default: 4 }
    },
    midterm: {
      weight: { type: Number, min: 0, max: 100, default: 25 },
      count: { type: Number, min: 0, max: 2, default: 1 }
    },
    final: {
      weight: { type: Number, min: 0, max: 100, default: 40 },
      count: { type: Number, min: 0, max: 1, default: 1 }
    },
    participation: {
      weight: { type: Number, min: 0, max: 100, default: 0 }
    },
    project: {
      weight: { type: Number, min: 0, max: 100, default: 0 },
      count: { type: Number, min: 0, default: 0 }
    }
  },
  
  // Course Resources
  textbooks: [{
    title: String,
    author: String,
    isbn: String,
    edition: String,
    required: { type: Boolean, default: true },
    publisher: String,
    year: Number
  }],
  resources: [{
    type: {
      type: String,
      enum: ['book', 'article', 'website', 'video', 'software', 'other']
    },
    title: String,
    description: String,
    url: String,
    required: { type: Boolean, default: false }
  }],
  
  // Enrollment and Capacity
  capacity: {
    maximum: {
      type: Number,
      required: true,
      min: 1,
      max: 500
    },
    minimum: {
      type: Number,
      default: 5,
      min: 1
    },
    waitlist: {
      type: Number,
      default: 10,
      min: 0
    }
  },
  
  // Course Offerings and Scheduling
  offerings: [{
    semester: {
      type: String,
      enum: ['fall', 'spring', 'summer'],
      required: true
    },
    year: {
      type: Number,
      required: true,
      min: 2020,
      max: 2030
    },
    section: {
      type: String,
      required: true,
      match: [/^[A-Z0-9]{1,3}$/, 'Section must be 1-3 alphanumeric characters']
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher'
    },
    schedule: [{
      day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        required: true
      },
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
      room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room'
      },
      type: {
        type: String,
        enum: ['lecture', 'lab', 'tutorial', 'seminar'],
        default: 'lecture'
      }
    }],
    enrollmentCount: {
      type: Number,
      default: 0,
      min: 0
    },
    waitlistCount: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ['planned', 'open', 'closed', 'cancelled', 'completed'],
      default: 'planned'
    }
  }],
  
  // Course Policies
  policies: {
    attendance: {
      required: { type: Boolean, default: true },
      minimumPercentage: { type: Number, min: 0, max: 100, default: 75 }
    },
    lateSubmission: {
      allowed: { type: Boolean, default: true },
      penaltyPerDay: { type: Number, min: 0, max: 100, default: 5 },
      maxLateDays: { type: Number, min: 0, default: 3 }
    },
    makeup: {
      exams: { type: Boolean, default: true },
      assignments: { type: Boolean, default: false }
    }
  },
  
  // Course Status and Metadata
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived', 'under_review'],
    default: 'active'
  },
  category: {
    type: String,
    enum: ['core', 'elective', 'major_required', 'general_education'],
    required: true
  },
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  
  // Approval and Version Control
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalDate: Date,
  version: {
    type: String,
    default: '1.0'
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
courseSchema.index({ courseCode: 1 });
courseSchema.index({ department: 1, status: 1 });
courseSchema.index({ level: 1, category: 1 });
courseSchema.index({ 'offerings.semester': 1, 'offerings.year': 1 });
courseSchema.index({ tags: 1 });
courseSchema.index({ title: 'text', description: 'text' });

// Virtual for total assessment weight
courseSchema.virtual('totalAssessmentWeight').get(function() {
  const structure = this.assessmentStructure;
  return structure.assignments.weight + 
         structure.quizzes.weight + 
         structure.midterm.weight + 
         structure.final.weight + 
         structure.participation.weight + 
         structure.project.weight;
});

// Virtual for current enrollment across all offerings
courseSchema.virtual('totalCurrentEnrollment').get(function() {
  return this.offerings.reduce((total, offering) => total + offering.enrollmentCount, 0);
});

// Virtual for available spots
courseSchema.virtual('availableSpots').get(function() {
  return this.offerings.reduce((total, offering) => {
    return total + Math.max(0, this.capacity.maximum - offering.enrollmentCount);
  }, 0);
});

// Validation for assessment weights
courseSchema.pre('save', function(next) {
  const totalWeight = this.totalAssessmentWeight;
  if (totalWeight !== 100) {
    return next(new Error(`Total assessment weight must equal 100%, currently ${totalWeight}%`));
  }
  next();
});

// Method to add offering
courseSchema.methods.addOffering = function(offeringData) {
  // Check for conflicts in existing offerings
  const existingOffering = this.offerings.find(offering => 
    offering.semester === offeringData.semester && 
    offering.year === offeringData.year && 
    offering.section === offeringData.section
  );
  
  if (existingOffering) {
    throw new Error('Offering with same semester, year, and section already exists');
  }
  
  this.offerings.push(offeringData);
  return this.save();
};

// Method to check if course is available for enrollment
courseSchema.methods.isAvailableForEnrollment = function(semester, year, section) {
  const offering = this.offerings.find(o => 
    o.semester === semester && o.year === year && o.section === section
  );
  
  if (!offering) return false;
  
  return offering.status === 'open' && 
         offering.enrollmentCount < this.capacity.maximum;
};

// Method to enroll student
courseSchema.methods.enrollStudent = function(semester, year, section) {
  const offering = this.offerings.find(o => 
    o.semester === semester && o.year === year && o.section === section
  );
  
  if (!offering) {
    throw new Error('Offering not found');
  }
  
  if (offering.enrollmentCount >= this.capacity.maximum) {
    throw new Error('Course is full');
  }
  
  offering.enrollmentCount += 1;
  return this.save();
};

// Method to drop student
courseSchema.methods.dropStudent = function(semester, year, section) {
  const offering = this.offerings.find(o => 
    o.semester === semester && o.year === year && o.section === section
  );
  
  if (!offering) {
    throw new Error('Offering not found');
  }
  
  offering.enrollmentCount = Math.max(0, offering.enrollmentCount - 1);
  return this.save();
};

// Static method to find courses by department
courseSchema.statics.findByDepartment = function(department, semester, year) {
  const query = { department, status: 'active' };
  
  if (semester && year) {
    query['offerings.semester'] = semester;
    query['offerings.year'] = year;
  }
  
  return this.find(query)
    .populate('offerings.instructor', 'user employeeId title')
    .populate('offerings.room')
    .sort('courseCode');
};

// Static method to search courses
courseSchema.statics.searchCourses = function(searchTerm, filters = {}) {
  const query = {
    status: 'active',
    ...filters
  };
  
  if (searchTerm) {
    query.$or = [
      { courseCode: new RegExp(searchTerm, 'i') },
      { title: new RegExp(searchTerm, 'i') },
      { description: new RegExp(searchTerm, 'i') },
      { tags: new RegExp(searchTerm, 'i') }
    ];
  }
  
  return this.find(query)
    .populate('prerequisites.course', 'courseCode title')
    .populate('corequisites', 'courseCode title')
    .sort('courseCode');
};

module.exports = mongoose.model('Course', courseSchema);
