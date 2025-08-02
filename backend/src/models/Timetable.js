const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 5. Timetable Schema (Refined)
// The structure for holding the final generated schedule.
const timetableEntrySchema = new Schema({
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    teacher: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
    room: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    dayOfWeek: {
        type: String,
        required: true,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    },
    startTime: { type: String, required: true }, // Format: HH:MM
    endTime: { type: String, required: true },   // Format: HH:MM
}, { _id: false });

const timetableSchema = new Schema({
    // A descriptive name, e.g., "SE-COMP-A - Sem 3 - AY 2025-26"
    name: { type: String, required: true, unique: true },
    studentGroup: {
        department: { type: String, required: true },
        year: { type: Number, required: true }, // e.g., 2 for Second Year
        division: { type: String, required: true }, // e.g., 'A', 'B'
    },
    status: {
        type: String,
        enum: ['Draft', 'Published', 'Archived'],
        default: 'Draft',
    },
    schedule: [timetableEntrySchema]
}, { timestamps: true });

module.exports = mongoose.model('Timetable', timetableSchema);
