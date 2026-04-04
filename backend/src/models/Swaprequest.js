const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

// ── Session snapshot ──────────────────────────────────────────────────────────
const sessionSnapshotSchema = new Schema({
  timetableId:   { type: Schema.Types.ObjectId, ref: 'Timetable', required: true },
  scheduleIndex: { type: Number, required: true },
  teacher:       { type: Schema.Types.ObjectId, ref: 'Teacher',  required: true },
  course:        { type: Schema.Types.ObjectId, ref: 'Course',   required: true },
  room:          { type: Schema.Types.ObjectId, ref: 'Room',     required: true },
  dayOfWeek:     { type: String, required: true },
  startTime:     { type: String, required: true },
  endTime:       { type: String, required: true },
  type:          { type: String, enum: ['Theory', 'Lab'] },
  semester:      { type: Number },
  division:      { type: String },
  batch:         { type: String, default: null },
  teacherName:   { type: String },
  courseName:    { type: String },
  courseCode:    { type: String },
  roomNumber:    { type: String },
}, { _id: false });

// ── SwapRequest ───────────────────────────────────────────────────────────────
const swapRequestSchema = new Schema({

  // 'lecture'   → teacher-to-teacher lecture swap (cross-division supported)
  // 'timetable' → legacy full timetable swap
  swapType: {
    type:    String,
    enum:    ['lecture', 'timetable'],
    default: 'lecture',
  },

  requestedBy: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },
  requestedTo: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },

  // fromSession → requestedBy's lecture  |  toSession → requestedTo's lecture
  fromSession: { type: sessionSnapshotSchema, required: true },
  toSession:   { type: sessionSnapshotSchema, required: true },

  reason: { type: String, maxlength: 500 },
  swapDate: { type: Date, required: true },

  status: {
    type:    String,
    enum:    ['pending_teacher','accepted','rejected_teacher',
              'pending_admin','approved','rejected_admin','cancelled'],
    default: 'pending_teacher',
  },

  teacherRespondedAt: { type: Date },
  teacherNote:        { type: String, maxlength: 300 },

  adminActionBy: { type: Schema.Types.ObjectId, ref: 'User' },
  adminActionAt: { type: Date },
  adminNote:     { type: String, maxlength: 500 },
  swapAppliedAt: { type: Date },

}, { timestamps: true });

swapRequestSchema.index({ requestedBy: 1, status: 1 });
swapRequestSchema.index({ requestedTo: 1, status: 1 });
swapRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('SwapRequest', swapRequestSchema);