const mongoose = require('mongoose');
const cfg = require('../src/config/config');
const Timetable = require('../src/models/Timetable');
const Room = require('../src/models/Room');

function toId(v) {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (v.$oid) return String(v.$oid);
  if (v._id) return String(v._id);
  if (typeof v.toString === 'function') return String(v.toString());
  return null;
}

(async () => {
  await mongoose.connect(cfg.database.url, cfg.database.options);
  const tt = await Timetable.findOne({ name: /Information Technology - Semester 4/i }).lean();
  if (!tt) {
    console.log('NO_TIMETABLE');
    await mongoose.disconnect();
    return;
  }

  console.log('TT_ID:', String(tt._id));
  for (let i = 0; i < Math.min(5, (tt.schedule || []).length); i++) {
    const s = tt.schedule[i];
    const rid = toId(s.room);
    const room = rid ? await Room.findById(rid).lean() : null;
    console.log(`IDX ${i}`, {
      rawRoom: s.room,
      rid,
      roomFound: !!room,
      room: room ? { _id: String(room._id), roomNumber: room.roomNumber, name: room.name, code: room.code } : null
    });
  }

  await mongoose.disconnect();
})();
