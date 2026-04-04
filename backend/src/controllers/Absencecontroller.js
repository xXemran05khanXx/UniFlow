const asyncHandler    = require('../middleware/asyncHandler');
const AbsenceRequest  = require('../models/AbsenceReq');
const Timetable       = require('../models/Timetable');
const Teacher         = require('../models/Teacher');
const mongoose        = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function getDayOfWeek(date) {
  return DAY_NAMES[new Date(date).getDay()];
}

/** Strip time from a date for safe date-only comparison */
function toDateOnly(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

/**
 * Find all Published timetable sessions for a given teacher on a given dayOfWeek.
 * Returns { timetable, entry, scheduleIndex } objects.
 */
async function getTeacherSessionsForDay(teacherId, dayOfWeek) {
  const timetables = await Timetable.find({
    status: 'Published',
    'schedule.teacher': teacherId,
  })
    .populate('schedule.Course', 'courseCode name courseType')
    .populate('schedule.room',   'roomNumber floor')
    .lean();

  const sessions = [];
  timetables.forEach(tt => {
    tt.schedule.forEach((entry, idx) => {
      const entryTeacherId = entry.teacher?._id?.toString() || entry.teacher?.toString();
      if (entryTeacherId === teacherId.toString() && entry.dayOfWeek === dayOfWeek) {
        sessions.push({ timetable: tt, entry, scheduleIndex: idx });
      }
    });
  });

  return sessions;
}

/**
 * For each affected class, find teachers who:
 *  1. Are free at that day+time slot (not already teaching something)
 *  2. Preferably teach the same subject or department
 * Returns up to 3 suggestions per class.
 */
async function suggestSubstitutes(affectedClasses, absentTeacherId, absenceDayOfWeek) {
  // Load all active teachers except the absent one
  const allTeachers = await Teacher.find({ _id: { $ne: absentTeacherId } })
    .populate('user',              'name email')
    .populate('primaryDepartment', 'name')
    .lean();

  // Build a map of teacher → busy slots on that day (from Published timetables)
  const busyMap = new Map(); // teacherId → Set of "startTime" strings

  const publishedTimetables = await Timetable.find({ status: 'Published' }).lean();
  publishedTimetables.forEach(tt => {
    tt.schedule.forEach(entry => {
      if (entry.dayOfWeek !== absenceDayOfWeek) return;
      const tid = entry.teacher?.toString();
      if (!tid) return;
      if (!busyMap.has(tid)) busyMap.set(tid, new Set());
      busyMap.get(tid).add(entry.startTime);
    });
  });

  // For each affected class, suggest free teachers
  const suggestions = [];

  for (const cls of affectedClasses) {
    const classSuggestions = [];

    for (const teacher of allTeachers) {
      const tid      = teacher._id.toString();
      const busySlots = busyMap.get(tid) || new Set();

      // Skip if teacher is busy at this exact start time
      if (busySlots.has(cls.startTime)) continue;

      // Build a human-readable reason
      let reason = 'Free during this slot';
      classSuggestions.push({
        teacher:     teacher._id,
        teacherName: teacher.user?.name || 'Unknown',
        reason,
      });

      if (classSuggestions.length >= 3) break; // max 3 suggestions per class
    }

    suggestions.push(classSuggestions);
  }

  return suggestions;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/absences
// Teacher marks themselves absent for a specific date.
// System immediately finds their affected classes and suggests substitutes.
//
// Body: { absenceDate: '2026-03-10', reason?: '...' }
// ─────────────────────────────────────────────────────────────────────────────
const markAbsent = asyncHandler(async (req, res) => {
  const { absenceDate, reason } = req.body;

  if (!absenceDate) {
    return res.status(400).json({ success: false, error: 'absenceDate is required (YYYY-MM-DD)' });
  }

  const parsedDate = toDateOnly(absenceDate);
  const dayOfWeek  = getDayOfWeek(parsedDate);

  if (!['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].includes(dayOfWeek)) {
    return res.status(400).json({ success: false, error: 'absenceDate falls on a Sunday — no classes' });
  }

  // Find teacher profile for the logged-in user
  const teacher = await Teacher.findOne({ user: req.user._id }).populate('user', 'name email');
  if (!teacher) {
    return res.status(404).json({ success: false, error: 'Teacher profile not found for your account' });
  }

  // Prevent duplicate absence requests for the same date
  const existing = await AbsenceRequest.findOne({
    teacher:     teacher._id,
    absenceDate: parsedDate,
  });
  if (existing) {
    return res.status(409).json({
      success: false,
      error:   `You already have an absence request for ${absenceDate}`,
      data:    existing,
    });
  }

  // Get all classes this teacher has on that day of week
  const sessions = await getTeacherSessionsForDay(teacher._id, dayOfWeek);

  if (sessions.length === 0) {
    return res.status(200).json({
      success: true,
      message: `No classes found for ${dayOfWeek}. Absence noted.`,
      data:    null,
    });
  }

  // Build affectedClasses list
  const affectedClasses = sessions.map(({ timetable, entry, scheduleIndex }) => ({
    timetableId:      timetable._id,
    scheduleIndex,
    course:           entry.Course?._id   || entry.Course,
    room:             entry.room?._id     || entry.room,
    startTime:        entry.startTime,
    endTime:          entry.endTime,
    type:             entry.type,
    semester:         entry.semester,
    division:         entry.division,
    batch:            entry.batch || null,
    courseName:       entry.Course?.name       || null,
    courseCode:       entry.Course?.courseCode || null,
    roomNumber:       entry.room?.roomNumber   || null,
    substituteTeacher: null,
    substituteName:    null,
    suggestedTeachers: [],
    substituteStatus:  'pending',
  }));

  // Get substitute suggestions
  const suggestions = await suggestSubstitutes(affectedClasses, teacher._id, dayOfWeek);
  affectedClasses.forEach((cls, i) => {
    cls.suggestedTeachers = suggestions[i] || [];
  });

  // Save absence request
  const absenceReq = await AbsenceRequest.create({
    teacher:         teacher._id,
    absenceDate:     parsedDate,
    dayOfWeek,
    reason:          reason || '',
    status:          'substitutes_suggested',
    affectedClasses,
  });

  console.log(`🏥 Absence request: ${teacher.user?.name} absent on ${absenceDate} (${dayOfWeek}) — ${affectedClasses.length} classes affected`);

  res.status(201).json({
    success: true,
    message: `Absence marked for ${absenceDate}. ${affectedClasses.length} class(es) need substitutes. Admin has been notified.`,
    data:    absenceReq,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/absences/my-absences
// Teacher views their own absence history
// ─────────────────────────────────────────────────────────────────────────────
const getMyAbsences = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findOne({ user: req.user._id });
  if (!teacher) return res.status(404).json({ success: false, error: 'Teacher profile not found' });

  const absences = await AbsenceRequest.find({ teacher: teacher._id })
    .sort({ absenceDate: -1 });

  res.status(200).json({ success: true, count: absences.length, data: absences });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/absences/admin
// Admin views all pending absence requests
// GET /api/absences/admin?status=pending
// GET /api/absences/admin?status=all
// GET /api/absences/admin?date=2026-03-10
// ─────────────────────────────────────────────────────────────────────────────
const getAdminAbsences = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const { status = 'substitutes_suggested', date } = req.query;
  const query = {};

  if (status !== 'all') query.status = status;
  if (date)             query.absenceDate = toDateOnly(date);

  const absences = await AbsenceRequest.find(query)
    .populate({ path: 'teacher', populate: { path: 'user', select: 'name email' } })
    .sort({ absenceDate: 1, createdAt: 1 });

  res.status(200).json({ success: true, count: absences.length, data: absences });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/absences/:id
// Get a single absence request (teacher who filed it, or admin)
// ─────────────────────────────────────────────────────────────────────────────
const getAbsenceById = asyncHandler(async (req, res) => {
  const absence = await AbsenceRequest.findById(req.params.id)
    .populate({ path: 'teacher', populate: { path: 'user', select: 'name email' } })
    .populate('affectedClasses.substituteTeacher')
    .populate({ path: 'handledBy', select: 'name' });

  if (!absence) return res.status(404).json({ success: false, error: 'Absence request not found' });

  // Access: admin or the teacher who filed it
  if (req.user.role !== 'admin') {
    const teacher = await Teacher.findOne({ user: req.user._id });
    if (!teacher || !absence.teacher._id.equals(teacher._id)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
  }

  res.status(200).json({ success: true, data: absence });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/absences/:id/assign
// Admin assigns substitute teachers to one or more affected classes.
// Can be called multiple times to assign class-by-class.
//
// Body:
//   assignments: [
//     { classId: '<affectedClass _id>', substituteTeacherId: '<Teacher._id>' },
//     ...
//   ]
//   note?: 'Admin note'
// ─────────────────────────────────────────────────────────────────────────────
const assignSubstitutes = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const { assignments, note } = req.body;
  if (!assignments?.length) {
    return res.status(400).json({ success: false, error: 'assignments array is required' });
  }

  const absence = await AbsenceRequest.findById(req.params.id);
  if (!absence) return res.status(404).json({ success: false, error: 'Absence request not found' });

  if (['published', 'rejected'].includes(absence.status)) {
    return res.status(409).json({ success: false, error: `Cannot edit — status is "${absence.status}"` });
  }

  // Validate all substitute teacher IDs exist
  const subIds      = [...new Set(assignments.map(a => a.substituteTeacherId))];
  const subTeachers = await Teacher.find({ _id: { $in: subIds } })
    .populate('user', 'name')
    .lean();
  const subMap = new Map(subTeachers.map(t => [t._id.toString(), t]));

  // Apply each assignment
  for (const { classId, substituteTeacherId } of assignments) {
    const cls = absence.affectedClasses.id(classId);
    if (!cls) {
      return res.status(400).json({ success: false, error: `Class ${classId} not found in this absence request` });
    }

    const sub = subMap.get(substituteTeacherId?.toString());
    if (!sub) {
      return res.status(400).json({ success: false, error: `Substitute teacher ${substituteTeacherId} not found` });
    }

    cls.substituteTeacher  = sub._id;
    cls.substituteName     = sub.user?.name || null;
    cls.substituteStatus   = 'assigned';
  }

  if (note) {
    absence.handledBy = req.user._id;
    absence.adminNote = note;
  }

  // Update overall status
  const pendingCount   = absence.affectedClasses.filter(c => c.substituteStatus === 'pending').length;
  const assignedCount  = absence.affectedClasses.filter(c => c.substituteStatus === 'assigned').length;

  if (pendingCount === 0) {
    absence.status    = 'fully_assigned';
    absence.handledBy = req.user._id;
    absence.handledAt = new Date();
  } else if (assignedCount > 0) {
    absence.status = 'partially_assigned';
  }

  await absence.save();

  res.status(200).json({
    success: true,
    message: `${assignedCount} class(es) assigned. ${pendingCount} still pending.`,
    data:    absence,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/absences/:id/publish
// Admin publishes the substitute schedule — makes it visible to all teachers.
// Only possible when at least some classes are assigned.
// ─────────────────────────────────────────────────────────────────────────────
const publishSubstituteSchedule = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const absence = await AbsenceRequest.findById(req.params.id)
    .populate({ path: 'teacher', populate: { path: 'user', select: 'name' } });
  if (!absence) return res.status(404).json({ success: false, error: 'Absence request not found' });

  const assignedCount = absence.affectedClasses.filter(c => c.substituteStatus === 'assigned').length;
  if (assignedCount === 0) {
    return res.status(400).json({ success: false, error: 'Assign at least one substitute before publishing' });
  }

  absence.status      = 'published';
  absence.publishedAt = new Date();
  absence.handledBy   = req.user._id;
  absence.handledAt   = new Date();
  if (req.body.note) absence.adminNote = req.body.note;

  await absence.save();

  const teacherName = absence.teacher?.user?.name || 'The teacher';
  const unassigned  = absence.affectedClasses.filter(c => c.substituteStatus === 'pending').length;

  console.log(`📢 Substitute schedule published for ${teacherName} on ${absence.absenceDate.toDateString()} — ${assignedCount} assigned, ${unassigned} cancelled`);

  res.status(200).json({
    success: true,
    message: `Substitute schedule published. ${assignedCount} class(es) covered, ${unassigned} class(es) cancelled.`,
    data:    absence,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/absences/schedule/:date
// Anyone can view the published substitute schedule for a given date.
// Returns all absence requests that are published for that date.
// ─────────────────────────────────────────────────────────────────────────────
const getDaySubstituteSchedule = asyncHandler(async (req, res) => {
  const dateParam = req.params.date; // e.g. "2026-03-10"
  const parsedDate = toDateOnly(dateParam);

  const absences = await AbsenceRequest.find({
    absenceDate: parsedDate,
    status:      'published',
  })
    .populate({ path: 'teacher', populate: { path: 'user', select: 'name email' } })
    .populate('affectedClasses.substituteTeacher')
    .lean();

  if (!absences.length) {
    return res.status(200).json({
      success: true,
      message: `No published substitute schedule for ${dateParam}`,
      data:    [],
    });
  }

  // Flatten to a clean schedule view
  const schedule = [];
  absences.forEach(absence => {
    absence.affectedClasses.forEach(cls => {
      if (cls.substituteStatus !== 'assigned') return; // skip unassigned/cancelled
      schedule.push({
        absentTeacher:      absence.teacher?.user?.name,
        absentTeacherId:    absence.teacher?._id,
        substituteTeacher:  cls.substituteName || cls.substituteTeacher?.user?.name,
        substituteId:       cls.substituteTeacher?._id || cls.substituteTeacher,
        course:             cls.courseName,
        courseCode:         cls.courseCode,
        room:               cls.roomNumber,
        startTime:          cls.startTime,
        endTime:            cls.endTime,
        type:               cls.type,
        semester:           cls.semester,
        division:           cls.division,
        batch:              cls.batch,
        date:               dateParam,
        dayOfWeek:          absence.dayOfWeek,
      });
    });
  });

  // Sort by startTime
  schedule.sort((a, b) => a.startTime.localeCompare(b.startTime));

  res.status(200).json({
    success:       true,
    date:          dateParam,
    totalAbsent:   absences.length,
    totalCovered:  schedule.length,
    data:          schedule,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/absences/:id/reject
// Admin rejects the absence request entirely
// ─────────────────────────────────────────────────────────────────────────────
const rejectAbsence = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const absence = await AbsenceRequest.findById(req.params.id);
  if (!absence) return res.status(404).json({ success: false, error: 'Absence request not found' });

  absence.status    = 'rejected';
  absence.handledBy = req.user._id;
  absence.handledAt = new Date();
  absence.adminNote = req.body.note || '';
  await absence.save();

  res.status(200).json({ success: true, message: 'Absence request rejected.', data: absence });
});

// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  markAbsent,
  getMyAbsences,
  getAdminAbsences,
  getAbsenceById,
  assignSubstitutes,
  publishSubstituteSchedule,
  getDaySubstituteSchedule,
  rejectAbsence,
};