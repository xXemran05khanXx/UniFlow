/**
 * Check raw MongoDB for users with string departments
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

async function checkRawUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/uniflow', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Find all users
    const allUsers = await usersCollection.find({}).toArray();
    console.log(`\n📋 Total users: ${allUsers.length}\n`);
    
    // Check department types
    const withDept = allUsers.filter(u => u.department !== null && u.department !== undefined);
    console.log(`Users with department field: ${withDept.length}`);
    
    withDept.forEach(u => {
      const deptType = typeof u.department;
      const isObjectId = mongoose.Types.ObjectId.isValid(u.department);
      console.log(`  - ${u.email}: type=${deptType}, isObjectId=${isObjectId}, value=${JSON.stringify(u.department)}`);
    });
    
    // Check for string departments specifically
    const stringDepts = allUsers.filter(u => typeof u.department === 'string');
    console.log(`\n⚠️  Users with STRING departments: ${stringDepts.length}`);
    stringDepts.forEach(u => {
      console.log(`  - ${u.email}: "${u.department}"`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkRawUsers();
