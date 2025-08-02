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
    },
    courseName: {
        type: String,
        required: [true, 'Course name is required.'],
        trim: true,
    },
    department: {
        type: String,
        required: [true, 'Department is required.'],
        enum: ['Computer', 'IT', 'EXTC', 'Mechanical', 'Civil', 'AI & DS', 'First Year'],
    },
    semester: { // Which semester the course belongs to
        type: Number,
        required: true,
        min: 1,
        max: 8,
    },
    courseType: {
        type: String,
        required: true,
        enum: ['Theory', 'Practical', 'Tutorial'],
    },
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
    // assignedTeacher is now part of the TimetableEntry, not the course itself,
    // as different teachers might take the same course for different divisions.
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);
