const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  // Basic Information
  firstName: {
    type: String,
    required: [true, 'Please provide first name'],
    trim: true,
    maxlength: [50, 'First name cannot be more than 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Please provide last name'],
    trim: true,
    maxlength: [50, 'Last name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  
  // User Type and Status
  userType: {
    type: String,
    enum: ['student', 'teacher', 'admin', 'staff'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  // Contact Information
  phone: {
    type: String,
    match: [/^\+?[\d\s-()]+$/, 'Please provide a valid phone number']
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'USA' }
  },
  
  // Academic Information
  studentId: {
    type: String,
    unique: true,
    sparse: true, // Allows null values for non-students
    match: [/^[A-Z0-9]{6,12}$/, 'Student ID must be 6-12 alphanumeric characters']
  },
  employeeId: {
    type: String,
    unique: true,
    sparse: true, // Allows null values for non-employees
    match: [/^[A-Z0-9]{4,10}$/, 'Employee ID must be 4-10 alphanumeric characters']
  },
  
  // Academic Details for Students
  academicInfo: {
    enrollmentDate: Date,
    graduationDate: Date,
    year: {
      type: String,
      enum: ['1', '2', '3', '4', 'graduate', 'phd']
    },
    semester: {
      type: String,
      enum: ['fall', 'spring', 'summer']
    },
    major: String,
    minor: String,
    gpa: {
      type: Number,
      min: 0.0,
      max: 4.0
    },
    credits: {
      completed: { type: Number, default: 0 },
      inProgress: { type: Number, default: 0 },
      required: { type: Number, default: 120 }
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'graduated', 'suspended', 'transferred'],
      default: 'active'
    }
  },
  
  // Profile Information
  profile: {
    avatar: String,
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say']
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot be more than 500 characters']
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
      email: String
    }
  },
  
  // System Information
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  
  // Password Reset
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  
  // Email Verification
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  
  // Preferences
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    },
    timezone: {
      type: String,
      default: 'America/New_York'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ userType: 1, isActive: 1 });
userSchema.index({ studentId: 1 });
userSchema.index({ employeeId: 1 });
userSchema.index({ 'academicInfo.year': 1, 'academicInfo.semester': 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for age
userSchema.virtual('age').get(function() {
  if (!this.profile.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.profile.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Encrypt password using bcrypt before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Generate student/employee ID before saving
userSchema.pre('save', function(next) {
  if (this.isNew) {
    if (this.userType === 'student' && !this.studentId) {
      this.studentId = `STU${Date.now().toString().slice(-6)}`;
    } else if (['teacher', 'admin', 'staff'].includes(this.userType) && !this.employeeId) {
      this.employeeId = `EMP${Date.now().toString().slice(-6)}`;
    }
  }
  next();
});

// Generate and sign JWT token
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      email: this.email,
      userType: this.userType,
      studentId: this.studentId,
      employeeId: this.employeeId
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    }
  );
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Handle failed login attempts
userSchema.methods.incLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Check if user is student
userSchema.methods.isStudent = function() {
  return this.userType === 'student';
};

// Check if user is teacher
userSchema.methods.isTeacher = function() {
  return this.userType === 'teacher';
};

// Check if user is admin
userSchema.methods.isAdmin = function() {
  return this.userType === 'admin';
};

module.exports = mongoose.model('User', userSchema);
