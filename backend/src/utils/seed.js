const mongoose = require('mongoose');
const User = require('../models/User'); 
const Course = require('../models/Course'); 
const Department = require('../models/Department');
const Division = require('../models/Division');
const Room = require('../models/Room');
const Teacher = require('../models/Teacher');
const MONGO_URI = 'mongodb://localhost:27017/uniflow';

const seedData = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to DB...");

    // 1. Wipe everything for a fresh start
    await mongoose.connection.dropDatabase();
    console.log("Database dropped for fresh seed.");

    // 2. Create IT Department
    const itDept = await Department.create({
      coursecode: 'IT',
      name: 'Information Technology'
    });

    // 3. Create Teachers (Inside User Collection)
    console.log("Creating Teacher accounts...");
    const facultyData = [
      "Vishal B.", "Seema Jadhav", "Snehal Mali", 
      "Sonal Jain", "Ganesh G.", "Randeep K.", 
      "Mandar G.", "Anupama S.", "Geetanjali K."
    ];

   const teacherMap = {};

for (const name of facultyData) {

  const employeeId = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

  // 1️⃣ Create User (for login)
  const user = await User.create({
    name: name,
    email: `${name.replace(/\s/g, '').toLowerCase()}${Math.floor(Math.random() * 1000)}@mu.edu`,
    password: 'password123',
    role: 'teacher',
    department: itDept._id,
    semester: 8,
    employeeId: employeeId,
    designation: 'Assistant Professor'
  });

  // 2️⃣ Create Teacher Profile (for timetable engine)
  await Teacher.create({
    user: user._id,
    employeeId: employeeId,
    name: user.name,
    primaryDepartment: itDept._id,
    designation: 'Assistant Professor',
    workload: {
      maxHoursPerWeek: 18,
      minHoursPerWeek: 8
    },
    availability: []   // optional for now
  });

  teacherMap[name] = user._id;
}

    // 4. Create Rooms (2nd Floor Theory, 3rd Floor Labs)
    console.log("Setting up Rooms (201-207) and Labs (301-317)...");
    const roomBatch = [];
    for (let i = 201; i <= 207; i++) {
      roomBatch.push({ roomNumber: `${i}`, name: `CR-${i}`, building: 'Main Building', floor: 2, capacity: 70, type: 'classroom', createdBy: teacherMap["Vishal B."] });
    }
    for (let i = 301; i <= 317; i++) {
      roomBatch.push({ roomNumber: `${i}`, name: `Lab-${i}`, building: 'Main Building', floor: 3, capacity: 25, type: 'laboratory', createdBy: teacherMap["Vishal B."] });
    }
    await Room.insertMany(roomBatch);

    // 5. Create Courses (Theory + Labs)
    console.log("Inserting all 6 Courses...");
    const courses = await Course.insertMany([
  {
    courseCode: "IT801",
    name: "Big Data Analysis",
    semester: 8,
    courseType: "Theory",
    credits: 4,
    hoursPerWeek: 4,
    department: itDept._id,
    year: 4,
    type: "theory",
    qualifiedFaculties: [
      teacherMap["Vishal B."],
      teacherMap["Seema Jadhav"],
      teacherMap["Snehal Mali"]
    ]
  },
  {
    courseCode: "IT802",
    name: "Cloud Computing",
    semester: 8,
    courseType: "Theory",
    credits: 4,
    hoursPerWeek: 4,
    department: itDept._id,
    year: 4,
    type: "theory",
    qualifiedFaculties: [
      teacherMap["Sonal Jain"],
      teacherMap["Ganesh G."]
    ]
  },
  {
    courseCode: "IT803",
    name: "Project Management",
    semester: 8,
    courseType: "Theory",
    credits: 3,
    hoursPerWeek: 3,
    department: itDept._id,
    year: 4,
    type: "theory",
    qualifiedFaculties: [
      teacherMap["Ganesh G."],
      teacherMap["Randeep K."]
    ]
  },
  {
    courseCode: "IT804",
    name: "Blockchain",
    semester: 8,
    courseType: "Theory",
    credits: 4,
    hoursPerWeek: 4,
    department: itDept._id,
    year: 4,
    type: "theory",
    qualifiedFaculties: [
      teacherMap["Mandar G."],
      teacherMap["Anupama S."],
      teacherMap["Geetanjali K."]
    ]
  },
  {
    courseCode: "ITL801",
    name: "Cloud Computing Lab",
    semester: 8,
    courseType: "Lab",
    credits: 1,
    hoursPerWeek: 2,
    department: itDept._id,
    year: 4,
    type: "lab",
    qualifiedFaculties: [
      teacherMap["Sonal Jain"],
      teacherMap["Ganesh G."]
    ]
  },
  {
    courseCode: "ITL802",
    name: "Blockchain Lab",
    semester: 8,
    courseType: "Lab",
    credits: 1,
    hoursPerWeek: 2,
    department: itDept._id,
    year: 4,
    type: "lab",
    qualifiedFaculties: [
      teacherMap["Mandar G."],
      teacherMap["Anupama S."],
      teacherMap["Snehal Mali"]
    ]
  }
]);
    // 6. Create Divisions (A, B, C) and Batches (A1, A2, A3...)
    const mainDivs = ['A', 'B', 'C'];
    for (const d of mainDivs) {
      const parent = await Division.create({
        name: d, semester: 8, department: itDept._id, type: 'theory', maxSeats: 65
      });
      for (let i = 1; i <= 3; i++) {
        await Division.create({
          name: `${d}${i}`, semester: 8, department: itDept._id, 
          parentDivision: parent._id, type: 'lab', maxSeats: 25
        });
      }
    }

    console.log("🎉 SUCCESS: Project data is ready for scheduling.");
    process.exit();
  } catch (err) {
    console.error("❌ SEED ERROR:", err);
    process.exit(1);
  }
};

seedData();