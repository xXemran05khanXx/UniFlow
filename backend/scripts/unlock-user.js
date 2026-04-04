const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

const unlockUser = async (email) => {
  try {
    // Connect to MongoDB
    const dbUrl = process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/uniflow';
    await mongoose.connect(dbUrl);
    console.log('Connected to MongoDB');

    // Find and unlock user
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`Found user: ${user.name} (${user.email})`);
    console.log(`Login attempts: ${user.loginAttempts}`);
    console.log(`Lock until: ${user.lockUntil}`);
    console.log(`Is locked: ${user.isLocked}`);

    // Unlock user
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    console.log('✅ User unlocked successfully!');
    console.log(`Login attempts reset to: 0`);
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('Usage: node unlock-user.js <email>');
  console.log('Example: node unlock-user.js admin@uniflow.edu');
  process.exit(1);
}

unlockUser(email);
