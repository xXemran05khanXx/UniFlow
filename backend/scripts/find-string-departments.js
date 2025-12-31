/**
 * Find ALL users with string department values
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

async function findStringDepartments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/uniflow', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Find users where department exists and is a string
    const usersWithStringDept = await usersCollection.find({
      department: { $type: 'string' }
    }).toArray();
    
    console.log(`\n⚠️  Found ${usersWithStringDept.length} users with STRING departments:\n`);
    
    usersWithStringDept.forEach(u => {
      console.log(`  - ${u.email} (${u.role}): "${u.department}"`);
    });

    // Also check teachers collection
    const teachersCollection = db.collection('teachers');
    const teachersWithStringDept = await teachersCollection.find({
      department: { $type: 'string' }
    }).toArray();
    
    if (teachersWithStringDept.length > 0) {
      console.log(`\n⚠️  Found ${teachersWithStringDept.length} teachers with STRING departments:\n`);
      teachersWithStringDept.forEach(t => {
        console.log(`  - ${t.name}: "${t.department}"`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

findStringDepartments();
