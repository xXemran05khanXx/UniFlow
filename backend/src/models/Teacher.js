const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 2. Teacher Schema (Refined)
// More detailed information about teachers for better resource management.
const teacherSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    employeeId: {
        type: String,
        required: [true, 'Employee ID is required.'],
        unique: true,
        trim: true,
    },
    name: {
        type: String,
        required: [true, 'Teacher name is required.'],
        trim: true,
    },
    department: {
        type: String,
        required: [true, 'Department is required.'],
        enum: ['Computer Science', 'Information Technology', 'First Year'],
    },
    designation: {
        type: String,
        required: true,
        enum: ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer'],
    },
    qualifications: {
        type: [String], // e.g., ['Ph.D. (Computer Engg)', 'M.E. (IT)']
        default: [],
    },
    contactInfo: {
        staffRoom: { type: String, trim: true }
    },
    workload: {
        // Defines the teaching load constraints for the teacher
        maxHoursPerWeek: { type: Number, default: 18 },
        minHoursPerWeek: { type: Number, default: 8 },
    },
    availability: [{ // Teacher's preferred or fixed available slots
        dayOfWeek: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
        startTime: String, // Format: HH:MM
        endTime: String,   // Format: HH:MM
    }],
    performanceRating: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
    }
}, { timestamps: true });

module.exports = mongoose.model('Teacher', teacherSchema);
