const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 3. Course Schema (Refined)
// Detailed course structure aligned with university standards.
const courseSchema = new Schema({
   courseCode: {
        type: String,
        required: [true, 'Course code is required.'],
        unique: true,
        trim: true,
        uppercase: true // Automatically store as uppercase
    },
    // FIXED: Renamed from courseName to name
    name: {
        type: String,
        required: [true, 'Course name is required.'],
        trim: true,
    },
    department: {
        type: Schema.Types.ObjectId,
        ref: 'Department',
        required: [true, 'Department is required.'],
        index: true,
    },
    // Legacy field - kept for backward compatibility during migration
    departmentLegacy: {
        type: String,
        enum: ['Computer Science', 'Information Technology', 'First Year'],
    },
    semester: { 
        type: Number,
        required: true,
        min: 1,
        max: 8,
    },
    courseType: {
        type: String,
        required: true,
        enum: ['Theory', 'Lab', 'Tutorial'], 
    },
qualifiedFaculties: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
}],
    credits: {
        type: Number,
        required: [true, 'Credits are required.'],
    },
    hoursPerWeek: {
        type: Number,
        required: [true, 'Hours per week are required.'],
    },
    syllabus: {
        topics: [String],
        syllabusLink: { type: String, trim: true } // Link to official university syllabus PDF
    },

year: {
  type: Number,
  min: 1,
  max: 4
},

type: {
  type: String,
  enum: ['theory', 'lab', 'tutorial'],
  default: 'theory'
},

isActive: {
  type: Boolean,
  default: true
},

prerequisites: [{
  type: String,
  trim: true
}],

createdBy: {
  type: Schema.Types.ObjectId,
  ref: 'User'
},

updatedBy: {
  type: Schema.Types.ObjectId,
  ref: 'User'
},
    // assignedTeacher is now part of the TimetableEntry, not the course itself,
    // as different teachers might take the same course for different divisions.
}, { timestamps: true });

// Indexes for performance
courseSchema.index({ coursecode: 1 });
courseSchema.index({ department: 1 });
courseSchema.index({ semester: 1 });
courseSchema.index({ courseType: 1 });

module.exports = mongoose.model('Course', courseSchema);
