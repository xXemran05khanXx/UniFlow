// ═══════════════════════════════════════════════════════════════════════════
// FILE 1: models/Timetable.js  — ADD the display fields to the entry schema
// Replace your existing Timetable.js with this.
// ═══════════════════════════════════════════════════════════════════════════

const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

const timetableEntrySchema = new Schema({
  Course: {
    type: Schema.Types.ObjectId,
    ref:  'Course',
    required: true,
  },
  teacher: {
    type: Schema.Types.ObjectId,
    ref:  'Teacher',
    required: true,
  },
  room: {
    type: Schema.Types.ObjectId,
    ref:  'Room',
    required: true,
  },

  type: {
    type:     String,
    enum:     ['Theory', 'Lab'],
    required: true,
  },

  dayOfWeek: {
    type:     String,
    required: true,
    enum:     ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  },

  startTime: { type: String, required: true },
  endTime:   { type: String, required: true },
  semester:  { type: Number },
  division:  { type: String, default: 'A' },
  batch:     { type: String, default: null },

  // ── Display fields (denormalized for fast reads) ──────────────────────────
  // These MUST be in the schema or Mongoose silently drops them on save.
  courseCode:  { type: String, default: null },
  courseName:  { type: String, default: null },
  teacherName: { type: String, default: null },
  roomNumber:  { type: String, default: null },

}, { _id: false });


const timetableSchema = new Schema({
  name: {
    type:     String,
    required: true,
    unique:   true,
  },

  studentGroup: {
    department: { type: Schema.Types.ObjectId, ref: 'Department' },
    semester:   { type: Number, required: true },
    division:   { type: String, default: 'A' },
  },

  academicYear: {
    type:    Number,
    default: () => new Date().getFullYear(),
  },

  status: {
    type:    String,
    enum:    ['Draft', 'Published', 'Archived'],
    default: 'Draft',
  },

  publishedAt: { type: Date },
  schedule:    [timetableEntrySchema],

}, { timestamps: true });

timetableSchema.index({ 'schedule.teacher': 1, status: 1 });
timetableSchema.index({ 'studentGroup.semester': 1, status: 1 });
timetableSchema.index({ 'studentGroup.department': 1, status: 1 });
timetableSchema.index({ academicYear: 1, status: 1 });

module.exports = mongoose.model('Timetable', timetableSchema);