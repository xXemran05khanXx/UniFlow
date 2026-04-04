const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

// ── One affected class that needs a substitute ────────────────────────────────
const affectedClassSchema = new Schema({
  timetableId:    { type: Schema.Types.ObjectId, ref: 'Timetable', required: true },
  scheduleIndex:  { type: Number, required: true },
  course:         { type: Schema.Types.ObjectId, ref: 'Course' },
  room:           { type: Schema.Types.ObjectId, ref: 'Room' },
  startTime:      { type: String },
  endTime:        { type: String },
  type:           { type: String, enum: ['Theory', 'Lab'] },
  semester:       { type: Number },
  division:       { type: String },
  batch:          { type: String, default: null },
  // Human-readable cache
  courseName:     { type: String },
  courseCode:     { type: String },
  roomNumber:     { type: String },

  // ── Substitute assignment (filled by admin) ─────────────────────────────────
  // null  → not yet assigned (system suggested but admin hasn't confirmed)
  // ObjectId → confirmed substitute teacher
  substituteTeacher: {
    type:    Schema.Types.ObjectId,
    ref:     'Teacher',
    default: null,
  },
  substituteName:    { type: String, default: null },

  // System-suggested free teachers for this slot (admin picks from these)
  suggestedTeachers: [{
    teacher:     { type: Schema.Types.ObjectId, ref: 'Teacher' },
    teacherName: { type: String },
    reason:      { type: String }, // e.g. "Qualified for subject", "Free in this slot"
  }],

  // 'pending'   → no substitute assigned yet
  // 'assigned'  → admin picked a substitute
  // 'cancelled' → class cancelled (no substitute found)
  substituteStatus: {
    type:    String,
    enum:    ['pending', 'assigned', 'cancelled'],
    default: 'pending',
  },
}, { _id: true }); // _id: true so admin can update individual classes by id

// ── AbsenceRequest ────────────────────────────────────────────────────────────
const absenceRequestSchema = new Schema({

  // Teacher who is absent
  teacher: { type: Schema.Types.ObjectId, ref: 'Teacher', required: true },

  // The date of absence (stored as date-only, e.g. 2026-03-10)
  absenceDate: { type: Date, required: true },

  // Which day of week (derived from absenceDate, stored for fast queries)
  dayOfWeek: {
    type: String,
    enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    required: true,
  },

  // Optional reason from teacher
  reason: { type: String, maxlength: 500 },

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  //  pending          → teacher submitted, admin not yet acted
  //  substitutes_suggested → system found suggestions, admin reviewing
  //  partially_assigned  → some classes have substitutes, some still pending
  //  fully_assigned   → all classes have substitutes confirmed
  //  published        → admin published the substitute schedule
  //  rejected         → admin rejected the absence request
  //
  status: {
    type:    String,
    enum:    ['pending','substitutes_suggested','partially_assigned',
              'fully_assigned','published','rejected'],
    default: 'pending',
  },

  // All classes that need covering on that day
  affectedClasses: [affectedClassSchema],

  // Admin who handled this request
  handledBy:  { type: Schema.Types.ObjectId, ref: 'User' },
  handledAt:  { type: Date },
  adminNote:  { type: String, maxlength: 500 },

  // When the substitute schedule was published
  publishedAt: { type: Date },

}, { timestamps: true });

absenceRequestSchema.index({ teacher: 1, absenceDate: 1 }, { unique: true });
absenceRequestSchema.index({ absenceDate: 1, status: 1 });
absenceRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('AbsenceRequest', absenceRequestSchema);