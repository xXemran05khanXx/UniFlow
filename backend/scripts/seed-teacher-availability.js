const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const User = require('../src/models/User');
const TeacherAvailability = require('../src/models/TeacherAvailability');

const defaultSlots = [
  { dayOfWeek: 'Monday', startTime: '09:00', endTime: '17:00' },
  { dayOfWeek: 'Tuesday', startTime: '09:00', endTime: '17:00' },
  { dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '17:00' },
  { dayOfWeek: 'Thursday', startTime: '09:00', endTime: '17:00' },
  { dayOfWeek: 'Friday', startTime: '09:00', endTime: '17:00' }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/uniflow', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    const teachers = await User.find({ role: 'teacher' }).lean();
    console.log(`👩‍🏫 Found ${teachers.length} teachers`);

    for (const teacher of teachers) {
      for (const slot of defaultSlots) {
        const exists = await TeacherAvailability.findOne({ teacher: teacher._id, dayOfWeek: slot.dayOfWeek });
        if (exists) {
          console.log(`⏭️  ${teacher.name || teacher._id} already has ${slot.dayOfWeek} availability`);
          continue;
        }

        await TeacherAvailability.create({
          teacher: teacher._id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isActive: true
        });
        console.log(`✅ Added ${slot.dayOfWeek} availability for ${teacher.name || teacher._id}`);
      }
    }

    console.log('🎉 Seeding complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding availability', err);
    process.exit(1);
  }
}

seed();
