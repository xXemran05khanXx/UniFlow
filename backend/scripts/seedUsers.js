/**
 * Database seeding script for User Management system
 * Run this script to populate the database with sample users
 */

const mongoose = require('mongoose');
const config = require('../src/config/config');
const User = require('../src/models/User');
const Course = require('../src/models/Course');
const { generateSampleUsers, generateUserStats } = require('../utils/sampleUserData');
const { generateSampleCourses } = require('../utils/sampleCourseData');

/**
 * Connect to database
 */
const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

/**
 * Clear existing data (optional)
 */
const clearData = async () => {
  try {
    await User.deleteMany({});
    await Course.deleteMany({});
    console.log('🗑️ Cleared existing data');
  } catch (error) {
    console.error('❌ Error clearing data:', error.message);
  }
};

/**
 * Seed users into database
 */
const seedUsers = async () => {
  try {
    const sampleUsers = await generateSampleUsers();
    
    for (const userData of sampleUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        console.log(`✅ Created user: ${user.name} (${user.email})`);
      } else {
        console.log(`⚠️ User already exists: ${userData.email}`);
      }
    }
    
    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding users:', error.message);
  }
};

/**
 * Seed Courses into database
 */
const seedCourses = async () => {
  try {
    // Get the first admin user for createdBy field
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('⚠️ No admin user found, skipping Course seeding');
      return;
    }

    const sampleCourses = generateSampleCourses(adminUser._id);
    
    for (const CourseData of sampleCourses) {
      const existingCourse = await Course.findOne({ coursecode: CourseData.coursecode });
      
      if (!existingCourse) {
        const Course = new Course(CourseData);
        await Course.save();
        console.log(`✅ Created Course: ${Course.coursecode} - ${Course.name}`);
      } else {
        console.log(`⚠️ Course already exists: ${CourseData.coursecode}`);
      }
    }
    
    console.log('🎉 Course seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding Courses:', error.message);
  }
};
/**
 * Display seeded data summary
 */
const displaySummary = async () => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const teacherUsers = await User.countDocuments({ role: 'teacher' });
    const studentUsers = await User.countDocuments({ role: 'student' });
    
    const totalCourses = await Course.countDocuments();
    const activeCourses = await Course.countDocuments({ isActive: true });
    const csCourses = await Course.countDocuments({ department: 'Computer Science' });
    const mechCourses = await Course.countDocuments({ department: 'Mechanical Engineering' });
    
    console.log('\n📊 Database Summary:');
    console.log('   === USERS ===');
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Active Users: ${activeUsers}`);
    console.log(`   Admin Users: ${adminUsers}`);
    console.log(`   Teacher Users: ${teacherUsers}`);
    console.log(`   Student Users: ${studentUsers}`);
    
    console.log('\n   === CourseS ===');
    console.log(`   Total Courses: ${totalCourses}`);
    console.log(`   Active Courses: ${activeCourses}`);
    console.log(`   CS Courses: ${csCourses}`);
    console.log(`   Mechanical Courses: ${mechCourses}`);
    
    console.log('\n👥 Sample Login Credentials:');
    console.log('   Admin: rajesh.kumar@mu.edu.in / password123');
    console.log('   Admin: sunita.rao@mu.edu.in / password123');
    console.log('   Teacher: priya.sharma@mu.edu.in / password123');
    console.log('   Student: rahul.verma@student.mu.edu.in / password123');
    
  } catch (error) {
    console.error('❌ Error displaying summary:', error.message);
  }
};

/**
 * Main seeding function
 */
const main = async () => {
  console.log('🌱 Starting database seeding...\n');
  
  await connectDB();
  
  // Uncomment the next line if you want to clear existing data first
  // await clearData();
  
  await seedUsers();
  await seedCourses();
  await displaySummary();
  
  console.log('\n✨ Seeding process completed!');
  console.log('You can now test the User and Course Management pages with the sample data.\n');
  
  // Close database connection
  await mongoose.connection.close();
  console.log('🔌 Database connection closed');
  process.exit(0);
};

/**
 * Handle process termination
 */
process.on('SIGINT', async () => {
  console.log('\n⚡ Process interrupted');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  process.exit(1);
});

// Run the seeding script
if (require.main === module) {
  main();
}

module.exports = { main, seedUsers, seedCourses, clearData };
