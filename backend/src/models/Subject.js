/**
 * Subject Model for MongoDB
 * Represents academic subjects in Mumbai University engineering college system
 */

const mongoose = require('mongoose');

// Subject syllabus module schema
const syllabusModuleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  topics: [{
    type: String,
    trim: true
  }],
  hours: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

// Subject syllabus schema
const syllabusSchema = new mongoose.Schema({
  modules: [syllabusModuleSchema],
  references: [{
    type: String,
    trim: true
  }],
  outcomes: [{
    type: String,
    trim: true
  }]
}, { _id: false });

// Main Subject schema
const subjectSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Subject code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        return /^[A-Z]{2,4}\d{3,4}[A-Z]?$/.test(v);
      },
      message: 'Subject code must be in format like CS101, MECH2001, etc.'
    }
  },
  name: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true,
    maxlength: [200, 'Subject name cannot exceed 200 characters']
  },
  credits: {
    type: Number,
    required: [true, 'Credits are required'],
    min: [1, 'Credits must be at least 1'],
    max: [10, 'Credits cannot exceed 10']
  },
  semester: {
    type: Number,
    required: [true, 'Semester is required'],
    min: [1, 'Semester must be between 1 and 8'],
    max: [8, 'Semester must be between 1 and 8']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: {
      values: [
        'Computer Science',
        'Information Technology',
        'Electronics & Telecommunication',
        'Electrical Engineering',
        'Mechanical Engineering',
        'Civil Engineering',
        'Chemical Engineering',
        'Instrumentation Engineering'
      ],
      message: 'Please select a valid department'
    }
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: [1, 'Year must be between 1 and 4'],
    max: [4, 'Year must be between 1 and 4']
  },
  type: {
    type: String,
    required: [true, 'Subject type is required'],
    enum: {
      values: ['theory', 'practical', 'both'],
      message: 'Subject type must be theory, practical, or both'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  prerequisites: [{
    type: String,
    trim: true
  }],
  syllabus: syllabusSchema,
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
subjectSchema.index({ code: 1 });
subjectSchema.index({ department: 1, semester: 1 });
subjectSchema.index({ isActive: 1 });
subjectSchema.index({ createdAt: -1 });

// Virtual for full subject identifier
subjectSchema.virtual('fullIdentifier').get(function() {
  return `${this.code} - ${this.name}`;
});

// Virtual for academic position
subjectSchema.virtual('academicPosition').get(function() {
  return `Year ${this.year}, Semester ${this.semester}`;
});

// Pre-save middleware to ensure consistency
subjectSchema.pre('save', function(next) {
  // Ensure semester aligns with year
  const expectedSemesters = {
    1: [1, 2],
    2: [3, 4],
    3: [5, 6],
    4: [7, 8]
  };
  
  if (!expectedSemesters[this.year].includes(this.semester)) {
    return next(new Error(`Semester ${this.semester} is not valid for Year ${this.year}`));
  }
  
  next();
});

// Static methods
subjectSchema.statics.findByDepartmentAndSemester = function(department, semester) {
  return this.find({ 
    department, 
    semester, 
    isActive: true 
  }).sort({ code: 1 });
};

subjectSchema.statics.findActiveByYear = function(year) {
  return this.find({ 
    year, 
    isActive: true 
  }).sort({ semester: 1, code: 1 });
};

subjectSchema.statics.getSubjectStats = async function() {
  const pipeline = [
    {
      $facet: {
        totalStats: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
              inactive: { $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] } },
              averageCredits: { $avg: '$credits' }
            }
          }
        ],
        departmentDistribution: [
          {
            $group: {
              _id: '$department',
              count: { $sum: 1 }
            }
          }
        ],
        semesterDistribution: [
          {
            $group: {
              _id: '$semester',
              count: { $sum: 1 }
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
        creditDistribution: [
          {
            $group: {
              _id: '$credits',
              count: { $sum: 1 }
            }
          }
        ]
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  const data = result[0];
  
  const totalStats = data.totalStats[0] || {
    total: 0,
    active: 0,
    inactive: 0,
    averageCredits: 0
  };
  
  const departmentDistribution = {};
  data.departmentDistribution.forEach(item => {
    departmentDistribution[item._id] = item.count;
  });
  
  const semesterDistribution = {};
  data.semesterDistribution.forEach(item => {
    semesterDistribution[`Semester ${item._id}`] = item.count;
  });
  
  const typeDistribution = {};
  data.typeDistribution.forEach(item => {
    typeDistribution[item._id] = item.count;
  });
  
  const creditDistribution = {};
  data.creditDistribution.forEach(item => {
    creditDistribution[`${item._id} Credits`] = item.count;
  });
  
  return {
    totalSubjects: totalStats.total,
    activeSubjects: totalStats.active,
    inactiveSubjects: totalStats.inactive,
    averageCredits: Math.round(totalStats.averageCredits * 10) / 10,
    departmentDistribution,
    semesterDistribution,
    typeDistribution,
    creditDistribution
  };
};

// Instance methods
subjectSchema.methods.canBeDeleted = function() {
  // Add logic to check if subject is referenced in timetables, etc.
  return true; // Simplified for now
};

subjectSchema.methods.duplicate = function(newCode) {
  const duplicated = new this.constructor({
    ...this.toObject(),
    _id: undefined,
    code: newCode,
    createdAt: undefined,
    updatedAt: undefined
  });
  
  return duplicated;
};

// Validation helpers
subjectSchema.methods.validatePrerequisites = async function() {
  if (!this.prerequisites || this.prerequisites.length === 0) {
    return { valid: true, invalidCodes: [] };
  }
  
  const validCodes = await this.constructor.find({
    code: { $in: this.prerequisites },
    isActive: true
  }).distinct('code');
  
  const invalidCodes = this.prerequisites.filter(code => !validCodes.includes(code));
  
  return {
    valid: invalidCodes.length === 0,
    invalidCodes
  };
};

// Export model
const Subject = mongoose.model('Subject', subjectSchema);

module.exports = Subject;
