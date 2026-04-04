/**
 * Department Model
 * MongoDB schema for managing departments in Mumbai University engineering college
 * Departments: IT (Information Technology), CS (Computer Science), FE (First Year Engineering)
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const departmentSchema = new Schema({
  coursecode: {
    type: String,
    required: [true, 'Department coursecode is required'],
    unique: true,
    trim: true,
    uppercase: true,
    enum: {
      values: ['IT', 'CS', 'FE'],
      message: 'Department coursecode must be IT, CS, or FE'
    },
    index: true
  },
  name: {
    type: String,
    required: [true, 'Department name is required'],
    trim: true,
    enum: {
      values: ['Information Technology', 'Computer Science', 'First Year Engineering'],
      message: 'Invalid department name'
    },
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
departmentSchema.index({ coursecode: 1 });
departmentSchema.index({ isActive: 1 });

// Virtual for student count
departmentSchema.virtual('studentCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'department',
  count: true,
  match: { role: 'student', isActive: true }
});

// Virtual for teacher count
departmentSchema.virtual('teacherCount', {
  ref: 'Teacher',
  localField: '_id',
  foreignField: 'primaryDepartment',
  count: true
});

// Static method to get department by coursecode
departmentSchema.statics.getBycoursecode = async function(coursecode) {
  return this.findOne({ coursecode: coursecode.toUpperCase(), isActive: true });
};

// Static method to get all active departments
departmentSchema.statics.getActive = async function() {
  return this.find({ isActive: true }).sort({ coursecode: 1 });
};

// Instance method to deactivate department
departmentSchema.methods.deactivate = async function() {
  this.isActive = false;
  return this.save();
};

// Instance method to activate department
departmentSchema.methods.activate = async function() {
  this.isActive = true;
  return this.save();
};

// Pre-save validation to ensure coursecode and name match
departmentSchema.pre('save', function(next) {
  const coursecodeNameMap = {
    'IT': 'Information Technology',
    'CS': 'Computer Science',
    'FE': 'First Year Engineering'
  };
  
  if (this.coursecode && this.name && coursecodeNameMap[this.coursecode] !== this.name) {
    return next(new Error('Department coursecode and name do not match'));
  }
  
  next();
});

module.exports = mongoose.model('Department', departmentSchema);
