/**
 * Department Model
 * MongoDB schema for managing departments in Mumbai University engineering college
 * Departments: IT (Information Technology), CS (Computer Science), FE (First Year Engineering)
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const departmentSchema = new Schema({
  code: {
    type: String,
    required: [true, 'Department code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    enum: {
      values: ['IT', 'CS', 'FE'],
      message: 'Department code must be IT, CS, or FE'
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
departmentSchema.index({ code: 1 });
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

// Static method to get department by code
departmentSchema.statics.getByCode = async function(code) {
  return this.findOne({ code: code.toUpperCase(), isActive: true });
};

// Static method to get all active departments
departmentSchema.statics.getActive = async function() {
  return this.find({ isActive: true }).sort({ code: 1 });
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

// Pre-save validation to ensure code and name match
departmentSchema.pre('save', function(next) {
  const codeNameMap = {
    'IT': 'Information Technology',
    'CS': 'Computer Science',
    'FE': 'First Year Engineering'
  };
  
  if (this.code && this.name && codeNameMap[this.code] !== this.name) {
    return next(new Error('Department code and name do not match'));
  }
  
  next();
});

module.exports = mongoose.model('Department', departmentSchema);
