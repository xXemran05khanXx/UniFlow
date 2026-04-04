const asyncHandler = require('../middleware/asyncHandler');
const Meeting      = require('../models/Meetingmodel');
const Teacher      = require('../models/Teacher');
const Timetable    = require('../models/Timetable');

// ─────────────────────────────────────────────────────────────────────────────
// TIME HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function toMin(hhmm) {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function overlaps(s1, e1, s2, e2) {
  return toMin(s1) < toMin(e2) && toMin(s2) < toMin(e1);
}

// ─────────────────────────────────────────────────────────────────────────────
// ALL POSSIBLE WEEKLY SLOTS
// Pulled from your TimetableGenerator — must match exactly.
// ─────────────────────────────────────────────────────────────────────────────
const WEEKLY_SLOTS = [
  { start: '08:10', end: '10:00' },
  { start: '10:20', end: '11:15' },
  { start: '11:15', end: '12:10' },
  { start: '12:10', end: '13:05' },
  { start: '13:50', end: '14:45' },
  { start: '14:45', end: '15:40' },
  { start: '15:40', end: '16:35' },
];

const WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/meetings/free-slots?teacherIds=id1,id2,id3
//
// For each teacher, builds a busy map from:
//   1. ALL Published timetable entries where teacher is assigned
//   2. ALL active (scheduled) meetings where teacher is an invitee
//
// Returns per-day, per-slot availability for every requested teacher.
// Response shape:
// {
//   success: true,
//   data: {
//     Monday: [
//       {
//         start: '08:10', end: '10:00', allFree: true,
//         teacherStatuses: [
//           { teacherId, name, free: true,  clash: null },
//           { teacherId, name, free: false, clash: 'CS101 (Theory)' },
//         ]
//       }, ...
//     ],
//     Tuesday: [...],
//     ...
//   }
// }
// ─────────────────────────────────────────────────────────────────────────────
const getFreeSlots = asyncHandler(async (req, res) => {
  const { teacherIds } = req.query;

  if (!teacherIds) {
    return res.status(400).json({ success: false, message: 'teacherIds query param required' });
  }

  const ids = teacherIds.split(',').map(id => id.trim()).filter(Boolean);
  if (!ids.length) {
    return res.status(400).json({ success: false, message: 'At least one teacher ID required' });
  }

  // ── 1. Load teacher profiles (for name display) ─────────────────────────
  const teachers = await Teacher.find({ _id: { $in: ids } })
    .populate('user', 'name')
    .lean();

  const teacherMap = new Map(
    teachers.map(t => [t._id.toString(), t.user?.name || t.name || 'Unknown'])
  );

  // ── 2. Load all Published timetables that involve ANY of these teachers ──
  const timetables = await Timetable.find({
    status: 'Published',
    'schedule.teacher': { $in: ids },
  })
    .select('schedule')
    .lean();

  // ── 3. Load all active meetings that involve ANY of these teachers ────────
  const meetings = await Meeting.find({
    status: 'scheduled',
    'invitees.teacher': { $in: ids },
  })
    .select('dayOfWeek startTime endTime title invitees')
    .lean();

  // ── 4. Build busy map: teacherId → day → [{start, end, clash}] ────────────
  // clash = human-readable label for what's blocking (e.g. "CS101 (Theory)", "Staff Meeting")
  const busyMap = new Map(); // teacherId → { Monday: [...], Tuesday: [...], ... }

  const emptyWeek = () =>
    Object.fromEntries(WORKING_DAYS.map(d => [d, []]));

  ids.forEach(id => busyMap.set(id, emptyWeek()));

  // 4a. From timetables
  timetables.forEach(tt => {
    (tt.schedule || []).forEach(entry => {
      const tid = entry.teacher?.toString();
      if (!tid || !busyMap.has(tid)) return;
      if (!WORKING_DAYS.includes(entry.dayOfWeek)) return;

      busyMap.get(tid)[entry.dayOfWeek].push({
        start: entry.startTime,
        end:   entry.endTime,
        clash: entry.courseCode
          ? `${entry.courseCode}${entry.type ? ` (${entry.type})` : ''}`
          : `Class (${entry.type || 'Session'})`,
        source: 'timetable',
      });
    });
  });

  // 4b. From meetings
  meetings.forEach(meeting => {
    if (!WORKING_DAYS.includes(meeting.dayOfWeek)) return;

    (meeting.invitees || []).forEach(inv => {
      const tid = inv.teacher?.toString();
      if (!tid || !busyMap.has(tid)) return;

      busyMap.get(tid)[meeting.dayOfWeek].push({
        start: meeting.startTime,
        end:   meeting.endTime,
        clash: meeting.title || 'Scheduled Meeting',
        source: 'meeting',
      });
    });
  });

// ── 5. Build the free-slot response ────────────────────────────────────────
  // Shape: { Monday: [ { start, end, allFree, teacherStatuses: [...] } ], ... }
  
  const resultEntries = WORKING_DAYS.map(day => {
    const daySlots = WEEKLY_SLOTS.map(slot => {
      
      const teacherStatuses = ids.map(tid => {
        const dayBusy = busyMap.get(tid)?.[day] || [];

        // Find any blocking entry that overlaps this slot
        const blocking = dayBusy.find(b =>
          overlaps(slot.start, slot.end, b.start, b.end)
        );

        return {
          teacherId: tid,
          name:      teacherMap.get(tid) || 'Unknown',
          free:      !blocking,
          clash:     blocking ? blocking.clash : null,
          source:    blocking ? blocking.source : null, // 'timetable' | 'meeting' | null
        };
      });

      const allFree = teacherStatuses.every(ts => ts.free);

      return {
        start:           slot.start,
        end:             slot.end,
        allFree:         allFree,
        teacherStatuses: teacherStatuses,
      };
    });

    return [day, daySlots];
  });

  const result = Object.fromEntries(resultEntries);

  res.status(200).json({ success: true, data: result });
})
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/meetings  — create a meeting + send invites
// ─────────────────────────────────────────────────────────────────────────────
const createMeeting = asyncHandler(async (req, res) => {
  const {
    title, description, dayOfWeek, startTime, endTime,
    venue, teacherIds, meetingDate,
  } = req.body;

  if (!title || !dayOfWeek || !startTime || !endTime || !teacherIds?.length) {
    return res.status(400).json({
      success: false,
      message: 'title, dayOfWeek, startTime, endTime and teacherIds are required',
    });
  }

  const invitees = teacherIds.map(tid => ({ teacher: tid, status: 'pending' }));

  const meeting = await Meeting.create({
    title, description, dayOfWeek, startTime, endTime,
    venue: venue || 'TBD',
    createdBy:   req.user._id,
    invitees,
    status:      'scheduled',
    meetingDate: meetingDate || null,
  });

  const populated = await Meeting.findById(meeting._id)
    .populate({ path: 'invitees.teacher', populate: { path: 'user', select: 'name email' } })
    .lean();

  res.status(201).json({ success: true, data: populated });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/meetings  — list all meetings (admin sees all, teacher sees own)
// ─────────────────────────────────────────────────────────────────────────────
const getMeetings = asyncHandler(async (req, res) => {
  let query = {};

  if (req.user.role !== 'admin') {
    // Teacher: find their Teacher profile, then filter by invitee
    const teacherProfile = await Teacher.findOne({ user: req.user._id }).lean();
    if (!teacherProfile) {
      return res.status(200).json({ success: true, data: [] });
    }
    query = { 'invitees.teacher': teacherProfile._id };
  }

  const meetings = await Meeting.find(query)
    .populate({ path: 'invitees.teacher', populate: { path: 'user', select: 'name email' } })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, data: meetings });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/meetings/:id/cancel
// ─────────────────────────────────────────────────────────────────────────────
const cancelMeeting = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) {
    return res.status(404).json({ success: false, message: 'Meeting not found' });
  }
  meeting.status = 'cancelled';
  await meeting.save();
  res.status(200).json({ success: true, data: meeting });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/meetings/:id/rsvp  — teacher accepts or declines
// ─────────────────────────────────────────────────────────────────────────────
const rsvpMeeting = asyncHandler(async (req, res) => {
  const { status } = req.body; // 'accepted' | 'declined'
  if (!['accepted', 'declined'].includes(status)) {
    return res.status(400).json({ success: false, message: 'status must be accepted or declined' });
  }

  const teacherProfile = await Teacher.findOne({ user: req.user._id }).lean();
  if (!teacherProfile) {
    return res.status(404).json({ success: false, message: 'Teacher profile not found' });
  }

  const meeting = await Meeting.findOneAndUpdate(
    { _id: req.params.id, 'invitees.teacher': teacherProfile._id },
    { $set: { 'invitees.$.status': status } },
    { new: true }
  ).populate({ path: 'invitees.teacher', populate: { path: 'user', select: 'name email' } });

  if (!meeting) {
    return res.status(404).json({ success: false, message: 'Meeting not found or you are not invited' });
  }

  res.status(200).json({ success: true, data: meeting });
});

module.exports = { getFreeSlots, createMeeting, getMeetings, cancelMeeting, rsvpMeeting };