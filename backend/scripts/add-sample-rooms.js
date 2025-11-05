const mongoose = require('mongoose');
const Room = require('../src/models/Room');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/uniflow', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function addSampleRooms() {
  try {
    console.log('🏫 Adding sample room data...\n');
    
    // Get a user ID for createdBy field (use admin user)
    const User = require('../src/models/User');
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.error('❌ Admin user not found. Please create an admin user first.');
      return;
    }
    
    const sampleRooms = [
      {
        roomNumber: 'A101',
        name: 'Theory Classroom A101',
        building: 'Engineering Block A',
        floor: 1,
        capacity: 60,
        type: 'classroom',
        department: 'Computer Science',
        createdBy: adminUser._id
      },
      {
        roomNumber: 'A102',
        name: 'Theory Classroom A102',
        building: 'Engineering Block A',
        floor: 1,
        capacity: 60,
        type: 'classroom',
        department: 'Information Technology',
        createdBy: adminUser._id
      },
      {
        roomNumber: 'A201',
        name: 'Computer Lab A201',
        building: 'Computer Science Block',
        floor: 2,
        capacity: 30,
        type: 'laboratory',
        department: 'Computer Science',
        createdBy: adminUser._id
      },
      {
        roomNumber: 'A202',
        name: 'Electronics Lab A202',
        building: 'Engineering Block A',
        floor: 2,
        capacity: 30,
        type: 'laboratory',
        department: 'Electronics & Telecommunication',
        createdBy: adminUser._id
      },
      {
        roomNumber: 'B101',
        name: 'Main Lecture Hall',
        building: 'Main Building',
        floor: 1,
        capacity: 120,
        type: 'lecture_hall',
        department: 'General',
        createdBy: adminUser._id
      },
      {
        roomNumber: 'B201',
        name: 'Seminar Room B201',
        building: 'Main Building',
        floor: 2,
        capacity: 40,
        type: 'seminar_room',
        department: 'General',
        createdBy: adminUser._id
      }
    ];

    // Clear existing rooms
    await Room.deleteMany({});
    console.log('Cleared existing room data');

    // Add new rooms
    for (const roomData of sampleRooms) {
      const room = new Room(roomData);
      await room.save();
      console.log(`✅ Added room: ${room.roomNumber} - ${room.name} (Capacity: ${room.capacity})`);
    }
    
    console.log(`\n🎉 Successfully added ${sampleRooms.length} rooms to the database!`);
    
  } catch (error) {
    console.error('❌ Error adding rooms:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔚 Database connection closed');
  }
}

addSampleRooms();