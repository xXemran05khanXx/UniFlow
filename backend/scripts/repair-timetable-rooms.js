const mongoose = require('mongoose');
const cfg = require('../src/config/config');
const Timetable = require('../src/models/Timetable');
const Room = require('../src/models/Room');

const toId = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (v.$oid) return String(v.$oid);
  if (v._id) return String(v._id);
  if (typeof v.toString === 'function') return String(v.toString());
  return null;
};

(async () => {
  await mongoose.connect(cfg.database.url, cfg.database.options);

  const rooms = await Room.find().select('_id roomNumber name').sort({ roomNumber: 1, name: 1 }).lean();
  if (!rooms.length) {
    console.log('No rooms found. Aborting.');
    await mongoose.disconnect();
    return;
  }

  const roomIdSet = new Set(rooms.map(r => String(r._id)));
  const timetables = await Timetable.find({}).lean();

  let fixedTimetables = 0;
  let fixedEntries = 0;

  for (const tt of timetables) {
    let changed = false;
    const updatedSchedule = (tt.schedule || []).map((entry, idx) => {
      const rid = toId(entry.room);
      const valid = rid && roomIdSet.has(rid);
      if (valid) return entry;

      // Deterministic room assignment based on entry index/day/time
      const key = `${entry.dayOfWeek || ''}-${entry.startTime || ''}-${idx}`;
      let hash = 0;
      for (let i = 0; i < key.length; i++) hash = ((hash << 5) - hash) + key.charCodeAt(i);
      const room = rooms[Math.abs(hash) % rooms.length];

      changed = true;
      fixedEntries++;

      return {
        ...entry,
        room: room._id
      };
    });

    if (changed) {
      await Timetable.updateOne({ _id: tt._id }, { $set: { schedule: updatedSchedule } });
      fixedTimetables++;
      console.log(`Fixed timetable ${tt.name} (${tt._id})`);
    }
  }

  console.log(`Done. Fixed timetables: ${fixedTimetables}, fixed entries: ${fixedEntries}`);
  await mongoose.disconnect();
})();
