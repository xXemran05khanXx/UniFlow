const mongoose = require('mongoose');
const Timetable = require('../models/Timetable');
const Teacher = require('../models/Teacher');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SLOTS = [
  { start: '08:10', end: '10:00' },
  { start: '10:20', end: '11:15' },
  { start: '11:15', end: '12:10' },
  { start: '12:10', end: '13:05' },
  { start: '13:50', end: '14:45' },
  { start: '14:45', end: '15:40' },
  { start: '15:40', end: '16:35' },
];

const toMin = (t) => {
  const [h, m] = (t || '0:0').split(':').map(Number);
  return h * 60 + m;
};

const overlaps = (s1, e1, s2, e2) =>
  toMin(s1) < toMin(e2) && toMin(s2) < toMin(e1);

async function computeFreeSlots(teacherIds) {
  // 1. Timetables
  const timetables = await Timetable.find({
    status: 'Published',
    'schedule.teacher': { $in: teacherIds },
  }).lean();

  // 2. Meetings (optional)
  let meetings = [];
  try {
    const Meeting = require('../models/Meeting');
    meetings = await Meeting.find({
      status: 'scheduled',
      'invitees.teacher': { $in: teacherIds },
    }).lean();
  } catch {}

  // 3. Teacher names
  const teacherDocs = await Teacher.find({ _id: { $in: teacherIds } })
    .populate('user', 'name')
    .lean();

  const teacherMap = {};
  teacherDocs.forEach(t => {
    teacherMap[t._id.toString()] = t.user?.name || 'Unknown';
  });

  // 4. Busy map
  const busyMap = {};
  teacherIds.forEach(id => {
    busyMap[id] = {};
    DAYS.forEach(d => busyMap[id][d] = []);
  });

  // Timetable sessions
  timetables.forEach(tt => {
    tt.schedule.forEach(e => {
      const tid = e.teacher?.toString();
      if (!busyMap[tid]) return;

      busyMap[tid][e.dayOfWeek].push({
        start: e.startTime,
        end: e.endTime,
        label: e.courseCode || 'Class',
      });
    });
  });

  // Meetings
  meetings.forEach(m => {
    m.invitees.forEach(inv => {
      const tid = inv.teacher?.toString();
      if (!busyMap[tid]) return;

      busyMap[tid][m.dayOfWeek].push({
        start: m.startTime,
        end: m.endTime,
        label: 'Meeting',
      });
    });
  });

  // 5. Compute free slots
  const result = {};

  DAYS.forEach(day => {
    result[day] = SLOTS.map(slot => {
      const teacherStatuses = teacherIds.map(id => {
        const busy = busyMap[id][day].filter(b =>
          overlaps(slot.start, slot.end, b.start, b.end)
        );

        return {
          teacherId: id,
          name: teacherMap[id],
          free: busy.length === 0,
        };
      });

      return {
        start: slot.start,
        end: slot.end,
        allFree: teacherStatuses.every(t => t.free),
        teacherStatuses,
      };
    });
  });

  return result;
}

module.exports = { computeFreeSlots };