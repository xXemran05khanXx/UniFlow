const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 4. Room Schema (Refined)
// More specific details for effective room allocation.
const roomSchema = new Schema({
    roomNumber: {
        type: String,
        required: [true, 'Room number is required.'],
        unique: true,
        trim: true,
    },
    floor: {
        type: Number,
        required: true,
    },
    capacity: {
        type: Number,
        required: [true, 'Room capacity is required.'],
    },
    type: {
        type: String,
        required: true,
        enum: ['Theory Classroom', 'Computer Lab', 'Electronics Lab', 'Mechanical Workshop', 'Seminar Hall', 'Auditorium'],
    },
    // Dynamic availability is determined by the timetable.
    // This field can store general usage notes or restrictions.
    availabilityNotes: {
        type: String,
        trim: true,
        default: 'Available during college hours',
    }
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
