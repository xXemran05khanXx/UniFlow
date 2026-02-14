const mongoose = require('mongoose');
const cfg = require('../src/config/config');

const targetId = process.argv[2];
if (!targetId) {
  console.error('Usage: node scripts/find-id-in-collections.js <objectId>');
  process.exit(1);
}

(async () => {
  await mongoose.connect(cfg.database.url, cfg.database.options);
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  for (const c of collections) {
    const name = c.name;
    const col = db.collection(name);
    let byId = null;
    try {
      byId = await col.findOne({ _id: new mongoose.Types.ObjectId(targetId) });
    } catch (_) {}

    if (byId) {
      console.log('FOUND _id in', name, JSON.stringify(byId).slice(0, 300));
      continue;
    }

    const byString = await col.findOne({ $or: [
      { room: targetId },
      { roomId: targetId },
      { 'schedule.room': targetId },
      { 'schedule.room._id': targetId },
      { 'schedule.room.$oid': targetId }
    ]});

    if (byString) {
      console.log('FOUND ref in', name, JSON.stringify(byString).slice(0, 300));
    }
  }

  await mongoose.disconnect();
})();
