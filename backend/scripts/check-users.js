/**
 * Script to check and display all users in the database
 */

const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config({ path: '../.env' });

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/uniflow', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Find all users without populate
    const users = await User.find({}).select('name email role department semester').lean();
    
    console.log(`\n📋 Found ${users.length} users in database:\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.role})`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Department: ${JSON.stringify(user.department)} (type: ${typeof user.department})`);
      console.log(`   Semester: ${user.semester || 'N/A'}`);
      console.log('');
    });

    // Check for users with string departments
    const usersWithStringDept = users.filter(u => u.department && typeof u.department === 'string');
    console.log(`\n⚠️  Users with STRING departments: ${usersWithStringDept.length}`);
    usersWithStringDept.forEach(u => {
      console.log(`   - ${u.email}: "${u.department}"`);
    });

    // Check for users with ObjectId departments
    const usersWithObjectIdDept = users.filter(u => u.department && typeof u.department === 'object');
    console.log(`\n✅ Users with OBJECTID departments: ${usersWithObjectIdDept.length}`);
    usersWithObjectIdDept.forEach(u => {
      console.log(`   - ${u.email}: ${JSON.stringify(u.department)}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUsers();
