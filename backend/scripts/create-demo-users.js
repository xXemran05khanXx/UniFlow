require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createDemoUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing users
    await User.deleteMany({});
    console.log('Cleared existing users');

    // Create demo users
    const demoUsers = [
      {
        name: 'Admin User',
        email: 'admin@uniflow.edu',
        password: 'password123',
        role: 'admin'
      },
      {
        name: 'Dr. John Smith',
        email: 'teacher@uniflow.edu',
        password: 'password123',
        role: 'teacher',
        department: 'Computer Science',
        employeeId: 'EMP001'
      },
      {
        name: 'Alice Johnson',
        email: 'student@uniflow.edu',
        password: 'password123',
        role: 'student',
        department: 'Computer Science',
        semester: 3,
        studentId: 'STU001'
      }
    ];

    for (const userData of demoUsers) {
      const user = new User(userData);
      await user.save();
      console.log(`Created user: ${user.email} (${user.role})`);
    }

    console.log('Demo users created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating demo users:', error);
    process.exit(1);
  }
};

createDemoUsers();
