// ═══════════════════════════════════════════════════════════════════════════
// FILE 2: scripts/backfillTimetableDisplayFields.js
//
// Run ONCE after updating the schema to fix all existing timetable docs.
// Usage:  node scripts/backfillTimetableDisplayFields.js
// ═══════════════════════════════════════════════════════════════════════════

require('dotenv').config();
const mongoose = require('mongoose');

// ── adjust these paths to match your project ────────────────────────────────

require('./src/models/User');
const Timetable = require('../backend/src/models/Timetable');
const Course    = require('../backend/src/models/Course');
const Teacher   = require('../backend/src/models/Teacher');
const Room      = require('../backend/src/models/Room');
// ────────────────────────────────────────────────────────────────────────────

async function backfill() {
  await mongoose.connect(process.env.DATABASE_URL || process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const timetables = await Timetable.find({})
    .populate('schedule.Course',  'courseCode name')
    .populate({ path: 'schedule.teacher', populate: { path: 'user', select: 'name' } })
    .populate('schedule.room',    'roomNumber')
    .lean();

  console.log(`📋 Found ${timetables.length} timetable(s) to backfill`);

  let updated = 0;
  let skipped = 0;

  for (const tt of timetables) {
    const newSchedule = (tt.schedule || []).map(entry => {
      // If display fields already populated, skip
      const alreadyHas =
        entry.courseCode  && entry.courseCode  !== null &&
        entry.teacherName && entry.teacherName !== null;

      if (alreadyHas) {
        skipped++;
        return null; // signals no change needed for this entry
      }

      return {
        ...entry,
        courseCode:  entry.Course?.courseCode  || entry.courseCode  || '—',
        courseName:  entry.Course?.name        || entry.courseName  || 'Untitled Course',
        teacherName: entry.teacher?.user?.name || entry.teacherName || 'Unassigned',
        roomNumber:  entry.room?.roomNumber    || entry.roomNumber  || '—',
      };
    });

    // Only write if at least one entry needed updating
    const needsWrite = newSchedule.some(e => e !== null);
    if (!needsWrite) continue;

    // Merge: use updated entry where available, original otherwise
    const mergedSchedule = newSchedule.map((e, i) => e !== null ? e : tt.schedule[i]);

    // Strip populated sub-docs back to ObjectIds for the update
    const cleanSchedule = mergedSchedule.map(entry => ({
      Course:      entry.Course?._id  || entry.Course,
      teacher:     entry.teacher?._id || entry.teacher,
      room:        entry.room?._id    || entry.room,
      type:        entry.type,
      dayOfWeek:   entry.dayOfWeek,
      startTime:   entry.startTime,
      endTime:     entry.endTime,
      semester:    entry.semester,
      division:    entry.division,
      batch:       entry.batch,
      courseCode:  entry.courseCode,
      courseName:  entry.courseName,
      teacherName: entry.teacherName,
      roomNumber:  entry.roomNumber,
    }));

    await Timetable.updateOne(
      { _id: tt._id },
      { $set: { schedule: cleanSchedule } }
    );

    updated++;
    console.log(`  ✔ Updated: "${tt.name}" (${cleanSchedule.length} entries)`);
  }

  console.log(`\n🏁 Done — ${updated} timetable(s) updated, ${skipped} entries already had display fields`);
  await mongoose.disconnect();
}

backfill().catch(err => {
  console.error('❌ Backfill failed:', err);
  process.exit(1);
});