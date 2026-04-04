// ═══════════════════════════════════════════════════════════════════════════
// seed.js  —  A. P. Shah Institute of Technology
//             Department of Information Technology
//             MASTER TIME TABLE EVEN A.Y. : 2025-26
//
// Built by visual inspection of all 3 pages of IT_DEPT_MASTER_EVEN_25-26.pdf
//
// Usage:
//   MONGO_URI=mongodb://localhost:27017/uniflow node seed.js
//
// What it seeds:
//   • 3  Departments  (IT, CS, FE)
//   • 14 Rooms        (classrooms + labs, building = "Laboratory Complex")
//   • 31 Teachers     (all faculty from PDF abbreviation table)
//   • 39 Courses      (SE sem-4, TE sem-6, BE sem-8)
//   • 9  Timetables   (SE/TE/BE × Div A/B/C)
// ═══════════════════════════════════════════════════════════════════════════

'use strict';
const mongoose = require('mongoose');

// ── Inline mini-schemas (no path dependency) ─────────────────────────────────

const Department = mongoose.models.Department || mongoose.model('Department',
  new mongoose.Schema({
    coursecode: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name:       { type: String, required: true, trim: true },
    description:{ type: String },
    isActive:   { type: Boolean, default: true },
  }, { timestamps: true })
);

const Room = mongoose.models.Room || mongoose.model('Room',
  new mongoose.Schema({
    roomNumber:  { type: String, required: true, unique: true, trim: true, uppercase: true },
    name:        { type: String, required: true, trim: true },
    building:    { type: String, required: true },
    floor:       { type: Number, required: true },
    capacity:    { type: Number, required: true },
    type:        { type: String, required: true },
    projector:   { type: Boolean, default: true },
    wifi:        { type: Boolean, default: true },
    isActive:    { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },
  }, { timestamps: true })
);

const Teacher = mongoose.models.Teacher || mongoose.model('Teacher',
  new mongoose.Schema({
    employeeId:         { type: String, required: true, unique: true },
    name:               { type: String, required: true },
    primaryDepartment:  { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    allowedDepartments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
    designation:        { type: String, required: true },
    workload: { maxHoursPerWeek: { type: Number, default: 18 }, minHoursPerWeek: { type: Number, default: 8 } },
  }, { timestamps: true })
);

const Course = mongoose.models.Course || mongoose.model('Course',
  new mongoose.Schema({
    courseCode:   { type: String, required: true, unique: true, trim: true, uppercase: true },
    name:         { type: String, required: true },
    department:   { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    semester:     { type: Number, required: true },
    courseType:   { type: String, required: true, enum: ['Theory','Lab','Tutorial'] },
    credits:      { type: Number, required: true },
    hoursPerWeek: { type: Number, required: true },
    isActive:     { type: Boolean, default: true },
  }, { timestamps: true })
);

const entrySchema = new mongoose.Schema({
  Course:      { type: mongoose.Schema.Types.ObjectId, ref: 'Course',  required: true },
  teacher:     { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  room:        { type: mongoose.Schema.Types.ObjectId, ref: 'Room',    required: true },
  type:        { type: String, enum: ['Theory','Lab'], required: true },
  dayOfWeek:   { type: String, required: true },
  startTime:   { type: String, required: true },
  endTime:     { type: String, required: true },
  semester:    { type: Number },
  division:    { type: String, default: 'A' },
  batch:       { type: String, default: null },
  courseCode:  { type: String, default: null },
  courseName:  { type: String, default: null },
  teacherName: { type: String, default: null },
  roomNumber:  { type: String, default: null },
}, { _id: false });

const Timetable = mongoose.models.Timetable || mongoose.model('Timetable',
  new mongoose.Schema({
    name:         { type: String, required: true, unique: true },
    studentGroup: {
      department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
      semester:   { type: Number, required: true },
      division:   { type: String, default: 'A' },
    },
    academicYear: { type: Number, default: 2025 },
    status:       { type: String, enum: ['Draft','Published','Archived'], default: 'Published' },
    publishedAt:  { type: Date, default: Date.now },
    schedule:     [entrySchema],
  }, { timestamps: true })
);

// ═══════════════════════════════════════════════════════════════════════════
// REFERENCE DATA
// ═══════════════════════════════════════════════════════════════════════════

const DEPARTMENTS = [
  { coursecode: 'IT', name: 'Information Technology',   description: 'IT Department — NBA Accredited' },
  { coursecode: 'CS', name: 'Computer Science',         description: 'Computer Science Department' },
  { coursecode: 'FE', name: 'First Year Engineering',   description: 'First Year Engineering Department' },
];

const ROOMS = [
  { roomNumber:'101',  name:'Classroom 101',   floor:1, capacity:60, type:'classroom'   },
  { roomNumber:'205',  name:'Classroom 205',   floor:2, capacity:60, type:'classroom'   },
  { roomNumber:'206',  name:'Classroom 206',   floor:2, capacity:60, type:'classroom'   },
  { roomNumber:'207',  name:'Classroom 207',   floor:2, capacity:60, type:'classroom'   },
  { roomNumber:'213',  name:'Classroom 213',   floor:2, capacity:60, type:'classroom'   },
  { roomNumber:'214',  name:'Classroom 214',   floor:2, capacity:60, type:'classroom'   },
  { roomNumber:'422',  name:'Project Hall 422',floor:4, capacity:40, type:'seminar_room' },
  { roomNumber:'301',  name:'IT Lab 301',      floor:3, capacity:30, type:'laboratory'  },
  { roomNumber:'302',  name:'IT Lab 302',      floor:3, capacity:30, type:'laboratory'  },
  { roomNumber:'303',  name:'IT Lab 303',      floor:3, capacity:30, type:'laboratory'  },
  { roomNumber:'304C', name:'IT Lab 304C',     floor:3, capacity:30, type:'laboratory'  },
  { roomNumber:'309',  name:'IT Lab 309',      floor:3, capacity:30, type:'laboratory'  },
  { roomNumber:'313',  name:'IT Lab 313',      floor:3, capacity:30, type:'laboratory'  },
  { roomNumber:'317',  name:'IT Lab 317',      floor:3, capacity:30, type:'laboratory'  },
];

// Full names from PDF page-3 abbreviation table
const TEACHERS = [
  { abbrev:'KBD', name:'Dr. Kiran Deshpande',      desig:'Professor'           },
  { abbrev:'GG',  name:'Prof. Ganesh Gourshete',    desig:'Assistant Professor' },
  { abbrev:'SA',  name:'Dr. Sonia Aneesh',          desig:'Associate Professor' },
  { abbrev:'SJ',  name:'Prof. Sonal Jain',          desig:'Assistant Professor' },
  { abbrev:'ATM', name:'Prof. Apeksha Mohite',      desig:'Assistant Professor' },
  { abbrev:'RC',  name:'Prof. Rujata Chaudhari',    desig:'Assistant Professor' },
  { abbrev:'SYA', name:'Prof. Shital Agrawal',      desig:'Assistant Professor' },
  { abbrev:'VY',  name:'Prof. Vaibhav Yavalkar',    desig:'Assistant Professor' },
  { abbrev:'GK',  name:'Prof. Geetanjali Kalme',    desig:'Assistant Professor' },
  { abbrev:'SB',  name:'Prof. Sonal Balpande',      desig:'Assistant Professor' },
  { abbrev:'MK',  name:'Prof. Manjusha Kashilkar',  desig:'Assistant Professor' },
  { abbrev:'JJ',  name:'Prof. Jayshree Jha',        desig:'Assistant Professor' },
  { abbrev:'SK',  name:'Prof. Sachin Kasare',       desig:'Assistant Professor' },
  { abbrev:'CS',  name:'Prof. Charul Singh',        desig:'Assistant Professor' },
  { abbrev:'MG',  name:'Prof. Mandar Ganjapurkar',  desig:'Assistant Professor' },
  { abbrev:'RS',  name:'Prof. Roshna Sangale',      desig:'Assistant Professor' },
  { abbrev:'RK',  name:'Prof. Rucha Kulkarni',      desig:'Assistant Professor' },
  { abbrev:'SD',  name:'Prof. Sneha Dalvi',         desig:'Assistant Professor' },
  { abbrev:'RRK', name:'Prof. Randeep Kahlon',      desig:'Assistant Professor' },
  { abbrev:'UP',  name:'Prof. Urjashree Patil',     desig:'Assistant Professor' },
  { abbrev:'SS',  name:'Prof. Shafaque Syed',       desig:'Assistant Professor' },
  { abbrev:'SO',  name:'Prof. Sujata Oak',          desig:'Assistant Professor' },
  { abbrev:'VB',  name:'Prof. Vishal Badgujar',     desig:'Assistant Professor' },
  { abbrev:'SMJ', name:'Prof. Seema Jadhav',        desig:'Assistant Professor' },
  { abbrev:'SRM', name:'Prof. Snehal Mali',         desig:'Assistant Professor' },
  { abbrev:'SL',  name:'Prof. Saylee Lapalikar',    desig:'Assistant Professor' },
  { abbrev:'PV',  name:'Prof. Pranali Vhora',       desig:'Assistant Professor' },
  { abbrev:'ANS', name:'Prof. Anupama Singh',       desig:'Assistant Professor' },
  { abbrev:'PC',  name:'Prof. Pooja Chavan',        desig:'Assistant Professor' },
  { abbrev:'SVK', name:'Prof. Sushruti Kachare',    desig:'Assistant Professor' },
  { abbrev:'NF',  name:'Prof. Nilofar Fakir',       desig:'Assistant Professor' },
];

const COURSES = [
  // SE Theory (Sem 4)
  { code:'SE-OS',    name:'Operating Systems',                         sem:4, type:'Theory',  cr:4, hpw:4 },
  { code:'SE-CNND',  name:'Computer Networks & Network Design',        sem:4, type:'Theory',  cr:4, hpw:4 },
  { code:'SE-MPMDM', name:'Microprocessor & Microcontroller Design',   sem:4, type:'Theory',  cr:4, hpw:4 },
  { code:'SE-AMT2',  name:'Applied Mathematics II',                    sem:4, type:'Theory',  cr:4, hpw:4 },
  { code:'SE-BMD',   name:'Basics of Modern Design',                   sem:4, type:'Theory',  cr:3, hpw:3 },
  { code:'SE-MPPP',  name:'Microprocessor Peripheral Programming',     sem:4, type:'Theory',  cr:3, hpw:3 },
  { code:'SE-OE',    name:'Open Elective',                             sem:4, type:'Theory',  cr:3, hpw:3 },
  { code:'SE-DT',    name:'Design Thinking',                           sem:4, type:'Theory',  cr:2, hpw:2 },
  // SE Tutorial (Sem 4)
  { code:'SE-AMT2T', name:'Applied Mathematics II Tutorial',           sem:4, type:'Tutorial',cr:1, hpw:1 },
  // SE Labs (Sem 4)
  { code:'SE-UL',    name:'Unix Lab',                                  sem:4, type:'Lab',     cr:1, hpw:2 },
  { code:'SE-NDL',   name:'Network Design Lab',                        sem:4, type:'Lab',     cr:1, hpw:2 },
  { code:'SE-MPL',   name:'Microprocessor Lab',                        sem:4, type:'Lab',     cr:1, hpw:2 },
  { code:'SE-DTL',   name:'Design Thinking Lab',                       sem:4, type:'Lab',     cr:1, hpw:2 },
  { code:'SE-BMDL',  name:'Basics of Modern Design Lab',               sem:4, type:'Lab',     cr:1, hpw:2 },
  { code:'SE-MPPPL', name:'Microprocessor Peripheral Programming Lab', sem:4, type:'Lab',     cr:1, hpw:2 },
  // TE Theory (Sem 6)
  { code:'TE-DMBI',  name:'Data Mining & Business Intelligence',       sem:6, type:'Theory',  cr:4, hpw:4 },
  { code:'TE-WT',    name:'Web Technologies',                          sem:6, type:'Theory',  cr:4, hpw:4 },
  { code:'TE-AIDS1', name:'Artificial Intelligence & Data Science I',  sem:6, type:'Theory',  cr:4, hpw:4 },
  { code:'TE-WEBX0', name:'Web X.0',                                   sem:6, type:'Theory',  cr:3, hpw:3 },
  { code:'TE-CYBSEC',name:'Cyber Security (Honors)',                   sem:6, type:'Theory',  cr:3, hpw:3 },
  { code:'TE-AIMLH', name:'AI & ML Honors',                            sem:6, type:'Theory',  cr:3, hpw:3 },
  { code:'TE-EHF',   name:'Engineering Humanity & Future',             sem:6, type:'Theory',  cr:2, hpw:2 },
  // TE Labs (Sem 6)
  { code:'TE-BIL',   name:'Business Intelligence Lab',                 sem:6, type:'Lab',     cr:1, hpw:2 },
  { code:'TE-WL',    name:'Web Technologies Lab',                      sem:6, type:'Lab',     cr:1, hpw:2 },
  { code:'TE-SL',    name:'Software Lab',                              sem:6, type:'Lab',     cr:1, hpw:2 },
  { code:'TE-MADL',  name:'Machine Learning & AI Design Lab',          sem:6, type:'Lab',     cr:1, hpw:2 },
  { code:'TE-DSL',   name:'Data Science Lab',                          sem:6, type:'Lab',     cr:1, hpw:2 },
  { code:'TE-MP2B',  name:'Mini Project 2B',                           sem:6, type:'Lab',     cr:2, hpw:4 },
  // BE Theory (Sem 8)
  { code:'BE-BDA',   name:'Big Data Analytics',                        sem:8, type:'Theory',  cr:4, hpw:4 },
  { code:'BE-BDLT',  name:'Blockchain & Distributed Ledger Technology',sem:8, type:'Theory',  cr:4, hpw:4 },
  { code:'BE-PM',    name:'Project Management',                        sem:8, type:'Theory',  cr:3, hpw:3 },
  { code:'BE-UID',   name:'User Interface Design',                     sem:8, type:'Theory',  cr:3, hpw:3 },
  { code:'BE-CCS',   name:'Cloud Computing & Services',                sem:8, type:'Theory',  cr:3, hpw:3 },
  { code:'BE-CYBSEC',name:'Cyber Security Honors (BE)',                sem:8, type:'Theory',  cr:3, hpw:3 },
  { code:'BE-AIMLH', name:'AI & ML Honors (BE)',                       sem:8, type:'Theory',  cr:3, hpw:3 },
  // BE Labs (Sem 8)
  { code:'BE-BL',    name:'Big Data Lab',                              sem:8, type:'Lab',     cr:1, hpw:2 },
  { code:'BE-CCL',   name:'Cloud Computing Lab',                       sem:8, type:'Lab',     cr:1, hpw:2 },
  { code:'BE-MAJPRJ',name:'Major Project I',                           sem:8, type:'Lab',     cr:6, hpw:6 },
  { code:'BE-MP2B',  name:'Mini Project 2B (BE)',                      sem:8, type:'Lab',     cr:2, hpw:4 },
];

// ═══════════════════════════════════════════════════════════════════════════
// SCHEDULE ROWS  — transcribed cell-by-cell from all 3 PDF pages
//
// { div, day, start, end, course, teacher, room, type, batch }
// type: 'Theory' | 'Lab' | 'Tutorial'
// batch: null = whole-division entry; 'A1'..'C3' = sub-batch lab/tutorial
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// SE  (Semester 4)   Pages 1-3
// ─────────────────────────────────────────────────────────────────────────────
const SE = [

  // ━━━ MONDAY ━━━
  // SE A ───────────────────────────────────────────────────────────────────
  { div:'A', day:'Monday', start:'08:10', end:'09:05', course:'SE-AMT2T',teacher:'PC',  room:'205', type:'Tutorial',batch:'A3' },
  // S3+S4 lab block
  { div:'A', day:'Monday', start:'10:20', end:'12:10', course:'SE-UL',   teacher:'VB',  room:'301', type:'Lab',    batch:'A1' },
  { div:'A', day:'Monday', start:'10:20', end:'12:10', course:'SE-NDL',  teacher:'KBD', room:'317', type:'Lab',    batch:'A2' },
  { div:'A', day:'Monday', start:'10:20', end:'12:10', course:'SE-MPL',  teacher:'SRM', room:'309', type:'Lab',    batch:'A3' },
  { div:'A', day:'Monday', start:'12:50', end:'13:45', course:'SE-MPPP', teacher:'RC',  room:'205', type:'Theory', batch:null },
  { div:'A', day:'Monday', start:'13:45', end:'14:40', course:'SE-MPMDM',teacher:'ATM', room:'205', type:'Theory', batch:null },
  { div:'A', day:'Monday', start:'14:40', end:'15:35', course:'SE-OS',   teacher:'RRK', room:'205', type:'Theory', batch:null },

  // SE B ───────────────────────────────────────────────────────────────────
  { div:'B', day:'Monday', start:'08:10', end:'10:00', course:'SE-UL',   teacher:'SK',  room:'302', type:'Lab',    batch:'B1' },
  { div:'B', day:'Monday', start:'08:10', end:'10:00', course:'SE-MPL',  teacher:'VY',  room:'317', type:'Lab',    batch:'B3' },
  { div:'B', day:'Monday', start:'10:20', end:'11:15', course:'SE-OS',   teacher:'SYA', room:'206', type:'Theory', batch:null },
  { div:'B', day:'Monday', start:'11:15', end:'12:10', course:'SE-CNND', teacher:'SA',  room:'206', type:'Theory', batch:null },
  { div:'B', day:'Monday', start:'12:50', end:'14:40', course:'SE-DTL',  teacher:'SO',  room:'303', type:'Lab',    batch:'B1' },
  { div:'B', day:'Monday', start:'12:50', end:'14:40', course:'SE-UL',   teacher:'SK',  room:'309', type:'Lab',    batch:'B2' },
  { div:'B', day:'Monday', start:'12:50', end:'14:40', course:'SE-NDL',  teacher:'RK',  room:'313', type:'Lab',    batch:'B3' },
  { div:'B', day:'Monday', start:'14:40', end:'15:35', course:'SE-MPMDM',teacher:'NF',  room:'206', type:'Theory', batch:null },

  // SE C ───────────────────────────────────────────────────────────────────
  { div:'C', day:'Monday', start:'08:10', end:'10:00', course:'SE-UL',   teacher:'VB',  room:'301', type:'Lab',    batch:'C1' },
  { div:'C', day:'Monday', start:'08:10', end:'10:00', course:'SE-NDL',  teacher:'JJ',  room:'313', type:'Lab',    batch:'C3' },
  { div:'C', day:'Monday', start:'10:20', end:'11:15', course:'SE-CNND', teacher:'RK',  room:'207', type:'Theory', batch:null },
  { div:'C', day:'Monday', start:'11:15', end:'12:10', course:'SE-OS',   teacher:'RS',  room:'207', type:'Theory', batch:null },
  { div:'C', day:'Monday', start:'12:50', end:'14:40', course:'SE-DTL',  teacher:'ANS', room:'304C',type:'Lab',    batch:'C1' },
  { div:'C', day:'Monday', start:'12:50', end:'14:40', course:'SE-NDL',  teacher:'JJ',  room:'317', type:'Lab',    batch:'C2' },

  // ━━━ TUESDAY ━━━
  // SE A
  { div:'A', day:'Tuesday', start:'08:10', end:'10:00', course:'SE-BMDL', teacher:'UP',  room:'301', type:'Lab',    batch:'A1' },
  { div:'A', day:'Tuesday', start:'08:10', end:'10:00', course:'SE-DTL',  teacher:'PV',  room:'302', type:'Lab',    batch:'A2' },
  { div:'A', day:'Tuesday', start:'08:10', end:'10:00', course:'SE-UL',   teacher:'SJ',  room:'303', type:'Lab',    batch:'A3' },
  { div:'A', day:'Tuesday', start:'10:20', end:'12:10', course:'SE-NDL',  teacher:'KBD', room:'317', type:'Lab',    batch:'A1' },
  { div:'A', day:'Tuesday', start:'10:20', end:'12:10', course:'SE-MPL',  teacher:'SRM', room:'309', type:'Lab',    batch:'A2' },
  { div:'A', day:'Tuesday', start:'10:20', end:'12:10', course:'SE-MPPPL',teacher:'RC',  room:'313', type:'Lab',    batch:'A3' },
  { div:'A', day:'Tuesday', start:'12:50', end:'13:45', course:'SE-AMT2', teacher:'PC',  room:'205', type:'Theory', batch:null },
  { div:'A', day:'Tuesday', start:'13:45', end:'14:40', course:'SE-OS',   teacher:'RRK', room:'205', type:'Theory', batch:null },
  { div:'A', day:'Tuesday', start:'14:40', end:'15:35', course:'SE-AMT2T',teacher:'PC',  room:'205', type:'Tutorial',batch:'A1'},

  // SE B
  { div:'B', day:'Tuesday', start:'08:10', end:'09:05', course:'SE-AMT2T',teacher:'PC',  room:'206', type:'Tutorial',batch:'B2'},
  { div:'B', day:'Tuesday', start:'09:05', end:'10:00', course:'SE-MPMDM',teacher:'NF',  room:'206', type:'Theory', batch:null },
  { div:'B', day:'Tuesday', start:'10:20', end:'11:15', course:'SE-AMT2', teacher:'PC',  room:'206', type:'Theory', batch:null },
  { div:'B', day:'Tuesday', start:'11:15', end:'12:10', course:'SE-MPPP', teacher:'MG',  room:'206', type:'Theory', batch:null },
  { div:'B', day:'Tuesday', start:'12:50', end:'13:45', course:'SE-CNND', teacher:'SA',  room:'206', type:'Theory', batch:null },
  { div:'B', day:'Tuesday', start:'13:45', end:'14:40', course:'SE-OE',   teacher:'SK',  room:'206', type:'Theory', batch:null },
  { div:'B', day:'Tuesday', start:'14:40', end:'16:30', course:'SE-MPL',  teacher:'VY',  room:'304C',type:'Lab',    batch:'B1' },
  { div:'B', day:'Tuesday', start:'14:40', end:'16:30', course:'SE-BMDL', teacher:'UP',  room:'302', type:'Lab',    batch:'B2' },
  { div:'B', day:'Tuesday', start:'14:40', end:'16:30', course:'SE-MPPPL',teacher:'RC',  room:'317', type:'Lab',    batch:'B3' },

  // SE C
  { div:'C', day:'Tuesday', start:'10:20', end:'11:15', course:'SE-BMD',  teacher:'SL',  room:'207', type:'Theory', batch:null },
  { div:'C', day:'Tuesday', start:'11:15', end:'12:10', course:'SE-MPMDM',teacher:'NF',  room:'207', type:'Theory', batch:null },
  { div:'C', day:'Tuesday', start:'12:50', end:'13:45', course:'SE-CNND', teacher:'RK',  room:'207', type:'Theory', batch:null },
  { div:'C', day:'Tuesday', start:'13:45', end:'14:40', course:'SE-AMT2', teacher:'SVK', room:'207', type:'Theory', batch:null },
  { div:'C', day:'Tuesday', start:'14:40', end:'16:30', course:'SE-NDL',  teacher:'JJ',  room:'313', type:'Lab',    batch:'C1' },
  { div:'C', day:'Tuesday', start:'14:40', end:'16:30', course:'SE-AMT2T',teacher:'SVK', room:'207', type:'Tutorial',batch:'C2'},
  { div:'C', day:'Tuesday', start:'14:40', end:'16:30', course:'SE-MPL',  teacher:'SRM', room:'304C',type:'Lab',    batch:'C3' },

  // ━━━ WEDNESDAY ━━━
  // SE A
  { div:'A', day:'Wednesday', start:'08:10', end:'09:05', course:'SE-AMT2T',teacher:'PC',  room:'205', type:'Tutorial',batch:'A2'},
  { div:'A', day:'Wednesday', start:'09:05', end:'10:00', course:'SE-AMT2', teacher:'PC',  room:'205', type:'Theory', batch:null },
  { div:'A', day:'Wednesday', start:'10:20', end:'11:15', course:'SE-OE',   teacher:'VY',  room:'205', type:'Theory', batch:null },
  { div:'A', day:'Wednesday', start:'11:15', end:'12:10', course:'SE-DT',   teacher:'CS',  room:'205', type:'Theory', batch:null },
  { div:'A', day:'Wednesday', start:'12:50', end:'14:40', course:'SE-MPL',  teacher:'SRM', room:'309', type:'Lab',    batch:'A1' },
  { div:'A', day:'Wednesday', start:'12:50', end:'14:40', course:'SE-MPPPL',teacher:'RC',  room:'313', type:'Lab',    batch:'A2' },
  { div:'A', day:'Wednesday', start:'12:50', end:'14:40', course:'SE-NDL',  teacher:'KBD', room:'317', type:'Lab',    batch:'A3' },
  { div:'A', day:'Wednesday', start:'14:40', end:'15:35', course:'SE-BMD',  teacher:'UP',  room:'205', type:'Theory', batch:null },

  // SE B
  { div:'B', day:'Wednesday', start:'09:05', end:'10:00', course:'SE-BMD',  teacher:'SL',  room:'206', type:'Theory', batch:null },
  { div:'B', day:'Wednesday', start:'10:20', end:'11:15', course:'SE-OS',   teacher:'SYA', room:'206', type:'Theory', batch:null },
  { div:'B', day:'Wednesday', start:'11:15', end:'12:10', course:'SE-OE',   teacher:'SK',  room:'206', type:'Theory', batch:null },
  { div:'B', day:'Wednesday', start:'12:50', end:'14:40', course:'SE-NDL',  teacher:'JJ',  room:'303', type:'Lab',    batch:'B1' },
  { div:'B', day:'Wednesday', start:'12:50', end:'14:40', course:'SE-DTL',  teacher:'SO',  room:'302', type:'Lab',    batch:'B2' },
  { div:'B', day:'Wednesday', start:'12:50', end:'14:40', course:'SE-BMDL', teacher:'RRK', room:'301', type:'Lab',    batch:'B3' },
  { div:'B', day:'Wednesday', start:'14:40', end:'15:35', course:'SE-AMT2T',teacher:'PC',  room:'206', type:'Tutorial',batch:'B1'},
  { div:'B', day:'Wednesday', start:'14:40', end:'15:35', course:'SE-NDL',  teacher:'RK',  room:'317', type:'Lab',    batch:'B2' },

  // SE C
  { div:'C', day:'Wednesday', start:'08:10', end:'10:00', course:'SE-MPL',  teacher:'SRM', room:'301', type:'Lab',    batch:'C1' },
  { div:'C', day:'Wednesday', start:'08:10', end:'10:00', course:'SE-MPPPL',teacher:'RK',  room:'317', type:'Lab',    batch:'C2' },
  { div:'C', day:'Wednesday', start:'08:10', end:'10:00', course:'SE-BMDL', teacher:'RRK', room:'302', type:'Lab',    batch:'C3' },
  { div:'C', day:'Wednesday', start:'10:20', end:'11:15', course:'SE-OE',   teacher:'SK',  room:'207', type:'Theory', batch:null },
  { div:'C', day:'Wednesday', start:'11:15', end:'12:10', course:'SE-CNND', teacher:'RK',  room:'207', type:'Theory', batch:null },
  { div:'C', day:'Wednesday', start:'12:50', end:'13:45', course:'SE-AMT2', teacher:'SVK', room:'207', type:'Theory', batch:null },
  { div:'C', day:'Wednesday', start:'13:45', end:'14:40', course:'SE-MPMDM',teacher:'NF',  room:'207', type:'Theory', batch:null },
  { div:'C', day:'Wednesday', start:'14:40', end:'15:35', course:'SE-UL',   teacher:'VB',  room:'309', type:'Lab',    batch:'C2' },
  { div:'C', day:'Wednesday', start:'14:40', end:'15:35', course:'SE-AMT2T',teacher:'SVK', room:'207', type:'Tutorial',batch:'C3'},

  // ━━━ THURSDAY ━━━
  // SE A
  { div:'A', day:'Thursday', start:'09:05', end:'10:00', course:'SE-BMD',  teacher:'UP',  room:'205', type:'Theory', batch:null },
  { div:'A', day:'Thursday', start:'10:20', end:'11:15', course:'SE-OS',   teacher:'RRK', room:'205', type:'Theory', batch:null },
  { div:'A', day:'Thursday', start:'11:15', end:'12:10', course:'SE-CNND', teacher:'JJ',  room:'205', type:'Theory', batch:null },
  { div:'A', day:'Thursday', start:'12:50', end:'14:40', course:'SE-MPPPL',teacher:'RC',  room:'317', type:'Lab',    batch:'A1' },
  { div:'A', day:'Thursday', start:'12:50', end:'14:40', course:'SE-BMDL', teacher:'UP',  room:'301', type:'Lab',    batch:'A2' },
  { div:'A', day:'Thursday', start:'12:50', end:'14:40', course:'SE-DTL',  teacher:'PV',  room:'302', type:'Lab',    batch:'A3' },
  { div:'A', day:'Thursday', start:'14:40', end:'15:35', course:'SE-DT',   teacher:'CS',  room:'205', type:'Theory', batch:null },
  { div:'A', day:'Thursday', start:'15:35', end:'16:30', course:'SE-MPMDM',teacher:'ATM', room:'205', type:'Theory', batch:null },

  // SE B
  { div:'B', day:'Thursday', start:'08:10', end:'10:00', course:'SE-MPL',  teacher:'VY',  room:'301', type:'Lab',    batch:'B2' },
  { div:'B', day:'Thursday', start:'08:10', end:'10:00', course:'SE-DTL',  teacher:'SO',  room:'303', type:'Lab',    batch:'B3' },
  { div:'B', day:'Thursday', start:'10:20', end:'11:15', course:'SE-OS',   teacher:'SYA', room:'206', type:'Theory', batch:null },
  { div:'B', day:'Thursday', start:'11:15', end:'12:10', course:'SE-DT',   teacher:'SO',  room:'206', type:'Theory', batch:null },
  { div:'B', day:'Thursday', start:'12:50', end:'13:45', course:'SE-AMT2', teacher:'PC',  room:'206', type:'Theory', batch:null },
  { div:'B', day:'Thursday', start:'13:45', end:'14:40', course:'SE-BMD',  teacher:'SL',  room:'206', type:'Theory', batch:null },
  { div:'B', day:'Thursday', start:'14:40', end:'16:30', course:'SE-MPPPL',teacher:'MG',  room:'313', type:'Lab',    batch:'B1' },
  { div:'B', day:'Thursday', start:'14:40', end:'16:30', course:'SE-UL',   teacher:'SK',  room:'303', type:'Lab',    batch:'B3' },
  { div:'B', day:'Thursday', start:'14:40', end:'15:35', course:'SE-AMT2T',teacher:'PC',  room:'206', type:'Tutorial',batch:'B1'},
  { div:'B', day:'Thursday', start:'14:40', end:'15:35', course:'SE-NDL',  teacher:'RK',  room:'317', type:'Lab',    batch:'B2' },

  // SE C
  { div:'C', day:'Thursday', start:'08:10', end:'10:00', course:'SE-MPPPL',teacher:'RK',  room:'304C',type:'Lab',    batch:'C1' },
  { div:'C', day:'Thursday', start:'08:10', end:'10:00', course:'SE-BMDL', teacher:'RRK', room:'302', type:'Lab',    batch:'C2' },
  { div:'C', day:'Thursday', start:'08:10', end:'10:00', course:'SE-DTL',  teacher:'PV',  room:'309', type:'Lab',    batch:'C3' },
  { div:'C', day:'Thursday', start:'10:20', end:'11:15', course:'SE-DT',   teacher:'ANS', room:'207', type:'Theory', batch:null },
  { div:'C', day:'Thursday', start:'11:15', end:'12:10', course:'SE-OE',   teacher:'SK',  room:'207', type:'Theory', batch:null },
  { div:'C', day:'Thursday', start:'12:50', end:'13:45', course:'SE-MPPP', teacher:'RK',  room:'207', type:'Theory', batch:null },
  { div:'C', day:'Thursday', start:'13:45', end:'14:40', course:'SE-OS',   teacher:'RS',  room:'207', type:'Theory', batch:null },
  { div:'C', day:'Thursday', start:'14:40', end:'15:35', course:'SE-BMD',  teacher:'SL',  room:'207', type:'Theory', batch:null },
  { div:'C', day:'Thursday', start:'14:40', end:'15:35', course:'SE-UL',   teacher:'VB',  room:'309', type:'Lab',    batch:'C2' },
  { div:'C', day:'Thursday', start:'14:40', end:'15:35', course:'SE-AMT2T',teacher:'SVK', room:'207', type:'Tutorial',batch:'C3'},

  // ━━━ FRIDAY ━━━
  // SE A
  { div:'A', day:'Friday', start:'08:10', end:'09:05', course:'SE-CNND', teacher:'JJ',  room:'205', type:'Theory', batch:null },
  { div:'A', day:'Friday', start:'09:05', end:'10:00', course:'SE-MPMDM',teacher:'ATM', room:'205', type:'Theory', batch:null },
  { div:'A', day:'Friday', start:'10:20', end:'12:10', course:'SE-DTL',  teacher:'PV',  room:'313', type:'Lab',    batch:'A1' },
  { div:'A', day:'Friday', start:'10:20', end:'12:10', course:'SE-UL',   teacher:'SJ',  room:'303', type:'Lab',    batch:'A2' },
  { div:'A', day:'Friday', start:'10:20', end:'12:10', course:'SE-BMDL', teacher:'UP',  room:'302', type:'Lab',    batch:'A3' },
  { div:'A', day:'Friday', start:'12:50', end:'13:45', course:'SE-MPPP', teacher:'RC',  room:'205', type:'Theory', batch:null },
  { div:'A', day:'Friday', start:'13:45', end:'14:40', course:'SE-OE',   teacher:'VY',  room:'205', type:'Theory', batch:null },
  { div:'A', day:'Friday', start:'14:40', end:'15:35', course:'SE-CNND', teacher:'JJ',  room:'205', type:'Theory', batch:null },

  // SE B
  { div:'B', day:'Friday', start:'08:10', end:'09:05', course:'SE-MPMDM',teacher:'NF',  room:'206', type:'Theory', batch:null },
  { div:'B', day:'Friday', start:'09:05', end:'10:00', course:'SE-MPPP', teacher:'MG',  room:'206', type:'Theory', batch:null },
  { div:'B', day:'Friday', start:'10:20', end:'11:15', course:'SE-DT',   teacher:'SO',  room:'206', type:'Theory', batch:null },
  { div:'B', day:'Friday', start:'11:15', end:'12:10', course:'SE-CNND', teacher:'SA',  room:'206', type:'Theory', batch:null },
  { div:'B', day:'Friday', start:'12:50', end:'14:40', course:'SE-BMDL', teacher:'UP',  room:'313', type:'Lab',    batch:'B1' },
  { div:'B', day:'Friday', start:'12:50', end:'14:40', course:'SE-MPPPL',teacher:'MG',  room:'302', type:'Lab',    batch:'B2' },
  { div:'B', day:'Friday', start:'12:50', end:'14:40', course:'SE-AMT2T',teacher:'PC',  room:'206', type:'Tutorial',batch:'B3'},

  // SE C
  { div:'C', day:'Friday', start:'08:10', end:'09:05', course:'SE-AMT2T',teacher:'SVK', room:'207', type:'Tutorial',batch:'C1'},
  { div:'C', day:'Friday', start:'09:05', end:'10:00', course:'SE-MPL',  teacher:'SRM', room:'313', type:'Lab',    batch:'C1' },
  { div:'C', day:'Friday', start:'09:05', end:'10:00', course:'SE-UL',   teacher:'VB',  room:'302', type:'Lab',    batch:'C2' },
  { div:'C', day:'Friday', start:'10:20', end:'11:15', course:'SE-OS',   teacher:'RS',  room:'207', type:'Theory', batch:null },
  { div:'C', day:'Friday', start:'11:15', end:'12:10', course:'SE-MPPP', teacher:'RK',  room:'207', type:'Theory', batch:null },
  { div:'C', day:'Friday', start:'12:50', end:'13:45', course:'SE-DT',   teacher:'ANS', room:'207', type:'Theory', batch:null },
  { div:'C', day:'Friday', start:'13:45', end:'14:40', course:'SE-MPMDM',teacher:'NF',  room:'207', type:'Theory', batch:null },
  { div:'C', day:'Friday', start:'14:40', end:'16:30', course:'SE-BMDL', teacher:'RRK', room:'303', type:'Lab',    batch:'C1' },
  { div:'C', day:'Friday', start:'14:40', end:'16:30', course:'SE-DTL',  teacher:'PV',  room:'313', type:'Lab',    batch:'C2' },
  { div:'C', day:'Friday', start:'14:40', end:'16:30', course:'SE-MPPPL',teacher:'RK',  room:'317', type:'Lab',    batch:'C3' },
];

// ─────────────────────────────────────────────────────────────────────────────
// TE  (Semester 6)
// ─────────────────────────────────────────────────────────────────────────────
const TE = [

  // ━━━ MONDAY ━━━
  // TE A
  { div:'A', day:'Monday', start:'08:10', end:'10:00', course:'TE-CYBSEC',teacher:'MK',  room:'213', type:'Theory', batch:null },
  { div:'A', day:'Monday', start:'08:10', end:'10:00', course:'TE-AIMLH', teacher:'SS',  room:'214', type:'Theory', batch:null },
  { div:'A', day:'Monday', start:'10:20', end:'11:15', course:'TE-DMBI',  teacher:'ATM', room:'213', type:'Theory', batch:null },
  { div:'A', day:'Monday', start:'11:15', end:'12:10', course:'TE-WT',    teacher:'VY',  room:'213', type:'Theory', batch:null },
  { div:'A', day:'Monday', start:'12:50', end:'13:45', course:'TE-AIDS1', teacher:'SS',  room:'213', type:'Theory', batch:null },
  { div:'A', day:'Monday', start:'13:45', end:'14:40', course:'TE-WEBX0', teacher:'SYA', room:'213', type:'Theory', batch:null },
  { div:'A', day:'Monday', start:'14:40', end:'16:30', course:'TE-BIL',   teacher:'ATM', room:'303', type:'Lab',    batch:'A1' },
  { div:'A', day:'Monday', start:'14:40', end:'16:30', course:'TE-WL',    teacher:'SYA', room:'302', type:'Lab',    batch:'A2' },
  { div:'A', day:'Monday', start:'14:40', end:'16:30', course:'TE-SL',    teacher:'CS',  room:'317', type:'Lab',    batch:'A3' },

  // TE B
  { div:'B', day:'Monday', start:'08:10', end:'10:00', course:'TE-CYBSEC',teacher:'MK',  room:'213', type:'Theory', batch:null },
  { div:'B', day:'Monday', start:'08:10', end:'10:00', course:'TE-AIMLH', teacher:'SS',  room:'214', type:'Theory', batch:null },
  { div:'B', day:'Monday', start:'10:20', end:'11:15', course:'TE-WEBX0', teacher:'UP',  room:'214', type:'Theory', batch:null },
  { div:'B', day:'Monday', start:'11:15', end:'12:10', course:'TE-DMBI',  teacher:'GK',  room:'214', type:'Theory', batch:null },
  { div:'B', day:'Monday', start:'12:50', end:'13:45', course:'TE-WT',    teacher:'VY',  room:'214', type:'Theory', batch:null },
  { div:'B', day:'Monday', start:'13:45', end:'14:40', course:'TE-WEBX0', teacher:'UP',  room:'214', type:'Theory', batch:null },
  { div:'B', day:'Monday', start:'14:40', end:'16:30', course:'TE-MADL',  teacher:'MK',  room:'301', type:'Lab',    batch:'B1' },
  { div:'B', day:'Monday', start:'14:40', end:'16:30', course:'TE-SL',    teacher:'SMJ', room:'313', type:'Lab',    batch:'B2' },
  { div:'B', day:'Monday', start:'14:40', end:'16:30', course:'TE-DSL',   teacher:'SS',  room:'309', type:'Lab',    batch:'B3' },

  // TE C
  { div:'C', day:'Monday', start:'10:20', end:'11:15', course:'TE-DMBI',  teacher:'PV',  room:'101', type:'Theory', batch:null },
  { div:'C', day:'Monday', start:'11:15', end:'12:10', course:'TE-WT',    teacher:'SK',  room:'101', type:'Theory', batch:null },
  { div:'C', day:'Monday', start:'12:50', end:'13:45', course:'TE-AIDS1', teacher:'PV',  room:'101', type:'Theory', batch:null },
  { div:'C', day:'Monday', start:'13:45', end:'14:40', course:'TE-WEBX0', teacher:'RS',  room:'101', type:'Theory', batch:null },
  { div:'C', day:'Monday', start:'14:40', end:'16:30', course:'TE-MADL',  teacher:'SL',  room:'304C',type:'Lab',    batch:'C1' },

  // ━━━ TUESDAY ━━━
  // TE A
  { div:'A', day:'Tuesday', start:'08:10', end:'10:00', course:'TE-CYBSEC',teacher:'MK',  room:'213', type:'Theory', batch:null },
  { div:'A', day:'Tuesday', start:'08:10', end:'10:00', course:'TE-AIMLH', teacher:'SS',  room:'214', type:'Theory', batch:null },
  { div:'A', day:'Tuesday', start:'08:10', end:'10:00', course:'TE-EHF',   teacher:'RC',  room:'213', type:'Theory', batch:'B1' },
  { div:'A', day:'Tuesday', start:'08:10', end:'10:00', course:'TE-EHF',   teacher:'VB',  room:'214', type:'Theory', batch:'B2' },
  { div:'A', day:'Tuesday', start:'10:20', end:'11:15', course:'TE-DMBI',  teacher:'ATM', room:'213', type:'Theory', batch:null },
  { div:'A', day:'Tuesday', start:'11:15', end:'12:10', course:'TE-AIDS1', teacher:'SS',  room:'213', type:'Theory', batch:null },
  { div:'A', day:'Tuesday', start:'12:50', end:'14:40', course:'TE-WL',    teacher:'SYA', room:'303', type:'Lab',    batch:'A1' },
  { div:'A', day:'Tuesday', start:'12:50', end:'14:40', course:'TE-BIL',   teacher:'ATM', room:'317', type:'Lab',    batch:'A2' },
  { div:'A', day:'Tuesday', start:'12:50', end:'14:40', course:'TE-MADL',  teacher:'SL',  room:'301', type:'Lab',    batch:'A3' },

  // TE B
  { div:'B', day:'Tuesday', start:'08:10', end:'10:00', course:'TE-EHF',   teacher:'RC',  room:'213', type:'Theory', batch:'B1' },
  { div:'B', day:'Tuesday', start:'08:10', end:'10:00', course:'TE-EHF',   teacher:'VB',  room:'214', type:'Theory', batch:'B2' },
  { div:'B', day:'Tuesday', start:'10:20', end:'11:15', course:'TE-AIDS1', teacher:'NF',  room:'214', type:'Theory', batch:null },
  { div:'B', day:'Tuesday', start:'11:15', end:'12:10', course:'TE-WT',    teacher:'VY',  room:'214', type:'Theory', batch:null },
  { div:'B', day:'Tuesday', start:'12:50', end:'13:45', course:'TE-WEBX0', teacher:'UP',  room:'214', type:'Theory', batch:null },
  { div:'B', day:'Tuesday', start:'13:45', end:'14:40', course:'TE-DMBI',  teacher:'GK',  room:'214', type:'Theory', batch:null },
  { div:'B', day:'Tuesday', start:'14:40', end:'16:30', course:'TE-WL',    teacher:'SYA', room:'303', type:'Lab',    batch:'B1' },
  { div:'B', day:'Tuesday', start:'14:40', end:'16:30', course:'TE-WL',    teacher:'RS',  room:'309', type:'Lab',    batch:'B2' },
  { div:'B', day:'Tuesday', start:'14:40', end:'16:30', course:'TE-MADL',  teacher:'MK',  room:'301', type:'Lab',    batch:'B3' },

  // TE C
  { div:'C', day:'Tuesday', start:'10:20', end:'12:10', course:'TE-BIL',   teacher:'GK',  room:'302', type:'Lab',    batch:'C1' },
  { div:'C', day:'Tuesday', start:'10:20', end:'12:10', course:'TE-DSL',   teacher:'SB',  room:'301', type:'Lab',    batch:'C2' },
  { div:'C', day:'Tuesday', start:'10:20', end:'12:10', course:'TE-SL',    teacher:'CS',  room:'303', type:'Lab',    batch:'C3' },

  // ━━━ WEDNESDAY ━━━
  // TE A
  { div:'A', day:'Wednesday', start:'08:10', end:'10:00', course:'TE-CYBSEC',teacher:'MK',  room:'213', type:'Theory', batch:null },
  { div:'A', day:'Wednesday', start:'08:10', end:'10:00', course:'TE-AIMLH', teacher:'SS',  room:'214', type:'Theory', batch:null },
  { div:'A', day:'Wednesday', start:'08:10', end:'10:00', course:'TE-EHF',   teacher:'RC',  room:'213', type:'Theory', batch:'B1' },
  { div:'A', day:'Wednesday', start:'08:10', end:'10:00', course:'TE-EHF',   teacher:'VB',  room:'214', type:'Theory', batch:'B2' },
  { div:'A', day:'Wednesday', start:'10:20', end:'11:15', course:'TE-AIDS1', teacher:'SS',  room:'213', type:'Theory', batch:null },
  { div:'A', day:'Wednesday', start:'11:15', end:'12:10', course:'TE-DMBI',  teacher:'ATM', room:'213', type:'Theory', batch:null },
  { div:'A', day:'Wednesday', start:'12:50', end:'13:45', course:'TE-WEBX0', teacher:'SYA', room:'213', type:'Theory', batch:null },
  { div:'A', day:'Wednesday', start:'13:45', end:'14:40', course:'TE-WT',    teacher:'VY',  room:'213', type:'Theory', batch:null },
  { div:'A', day:'Wednesday', start:'14:40', end:'16:30', course:'TE-SL',    teacher:'CS',  room:'302', type:'Lab',    batch:'A1' },
  { div:'A', day:'Wednesday', start:'14:40', end:'16:30', course:'TE-MADL',  teacher:'MK',  room:'301', type:'Lab',    batch:'A2' },
  { div:'A', day:'Wednesday', start:'14:40', end:'16:30', course:'TE-DSL',   teacher:'SS',  room:'304C',type:'Lab',    batch:'A3' },

  // TE B
  { div:'B', day:'Wednesday', start:'08:10', end:'10:00', course:'TE-CYBSEC',teacher:'MK',  room:'213', type:'Theory', batch:null },
  { div:'B', day:'Wednesday', start:'08:10', end:'10:00', course:'TE-AIMLH', teacher:'SS',  room:'214', type:'Theory', batch:null },
  { div:'B', day:'Wednesday', start:'10:20', end:'12:10', course:'TE-DSL',   teacher:'NF',  room:'317', type:'Lab',    batch:'B1' },
  { div:'B', day:'Wednesday', start:'10:20', end:'12:10', course:'TE-MADL',  teacher:'MK',  room:'301', type:'Lab',    batch:'B2' },
  { div:'B', day:'Wednesday', start:'10:20', end:'12:10', course:'TE-BIL',   teacher:'GK',  room:'302', type:'Lab',    batch:'B3' },
  { div:'B', day:'Wednesday', start:'13:45', end:'15:35', course:'TE-MP2B',  teacher:'UP',  room:'214', type:'Lab',    batch:null },

  // TE C
  { div:'C', day:'Wednesday', start:'10:20', end:'11:15', course:'TE-WEBX0', teacher:'RS',  room:'101', type:'Theory', batch:null },
  { div:'C', day:'Wednesday', start:'11:15', end:'12:10', course:'TE-DMBI',  teacher:'PV',  room:'101', type:'Theory', batch:null },
  { div:'C', day:'Wednesday', start:'12:50', end:'13:45', course:'TE-WEBX0', teacher:'RS',  room:'101', type:'Theory', batch:null },
  { div:'C', day:'Wednesday', start:'13:45', end:'14:40', course:'TE-AIDS1', teacher:'PV',  room:'101', type:'Theory', batch:null },
  { div:'C', day:'Wednesday', start:'14:40', end:'16:30', course:'TE-DSL',   teacher:'SB',  room:'304C',type:'Lab',    batch:'C1' },
  { div:'C', day:'Wednesday', start:'14:40', end:'16:30', course:'TE-BIL',   teacher:'ATM', room:'313', type:'Lab',    batch:'C2' },
  { div:'C', day:'Wednesday', start:'14:40', end:'16:30', course:'TE-WL',    teacher:'RS',  room:'303', type:'Lab',    batch:'C3' },

  // ━━━ THURSDAY ━━━
  // TE A
  { div:'A', day:'Thursday', start:'08:10', end:'10:00', course:'TE-CYBSEC',teacher:'MK',  room:'213', type:'Theory', batch:null },
  { div:'A', day:'Thursday', start:'08:10', end:'10:00', course:'TE-AIMLH', teacher:'SS',  room:'214', type:'Theory', batch:null },
  { div:'A', day:'Thursday', start:'10:20', end:'12:10', course:'TE-MADL',  teacher:'MK',  room:'309', type:'Lab',    batch:'A1' },
  { div:'A', day:'Thursday', start:'10:20', end:'12:10', course:'TE-DSL',   teacher:'SS',  room:'313', type:'Lab',    batch:'A2' },
  { div:'A', day:'Thursday', start:'10:20', end:'12:10', course:'TE-BIL',   teacher:'ATM', room:'302', type:'Lab',    batch:'A3' },
  { div:'A', day:'Thursday', start:'12:50', end:'13:45', course:'TE-DSL',   teacher:'SS',  room:'309', type:'Lab',    batch:'A1' },

  // TE B
  { div:'B', day:'Thursday', start:'08:10', end:'10:00', course:'TE-CYBSEC',teacher:'MK',  room:'213', type:'Theory', batch:null },
  { div:'B', day:'Thursday', start:'08:10', end:'10:00', course:'TE-AIMLH', teacher:'SS',  room:'214', type:'Theory', batch:null },
  { div:'B', day:'Thursday', start:'10:20', end:'11:15', course:'TE-AIDS1', teacher:'NF',  room:'214', type:'Theory', batch:null },
  { div:'B', day:'Thursday', start:'11:15', end:'12:10', course:'TE-WT',    teacher:'VY',  room:'214', type:'Theory', batch:null },
  { div:'B', day:'Thursday', start:'12:50', end:'14:40', course:'TE-BIL',   teacher:'GK',  room:'301', type:'Lab',    batch:'B1' },
  { div:'B', day:'Thursday', start:'12:50', end:'14:40', course:'TE-DSL',   teacher:'NF',  room:'302', type:'Lab',    batch:'B2' },
  { div:'B', day:'Thursday', start:'12:50', end:'14:40', course:'TE-SL',    teacher:'SMJ', room:'303', type:'Lab',    batch:'B3' },
  { div:'B', day:'Thursday', start:'14:40', end:'15:35', course:'TE-EHF',   teacher:'VB',  room:'214', type:'Theory', batch:'B2' },

  // TE C
  { div:'C', day:'Thursday', start:'10:20', end:'11:15', course:'TE-AIDS1', teacher:'PV',  room:'214', type:'Theory', batch:null },
  { div:'C', day:'Thursday', start:'11:15', end:'12:10', course:'TE-WT',    teacher:'SK',  room:'214', type:'Theory', batch:null },
  { div:'C', day:'Thursday', start:'12:50', end:'14:40', course:'TE-WL',    teacher:'RS',  room:'303', type:'Lab',    batch:'C1' },
  { div:'C', day:'Thursday', start:'12:50', end:'14:40', course:'TE-SL',    teacher:'CS',  room:'317', type:'Lab',    batch:'C2' },
  { div:'C', day:'Thursday', start:'12:50', end:'14:40', course:'TE-MADL',  teacher:'SL',  room:'301', type:'Lab',    batch:'C3' },

  // ━━━ FRIDAY ━━━
  // TE A
  { div:'A', day:'Friday', start:'08:10', end:'10:00', course:'TE-EHF',   teacher:'RC',  room:'213', type:'Theory', batch:'B1' },
  { div:'A', day:'Friday', start:'08:10', end:'10:00', course:'TE-SL',    teacher:'CS',  room:'317', type:'Lab',    batch:'A2' },
  { div:'A', day:'Friday', start:'08:10', end:'10:00', course:'TE-WL',    teacher:'SYA', room:'303', type:'Lab',    batch:'A3' },
  { div:'A', day:'Friday', start:'10:20', end:'11:15', course:'TE-WT',    teacher:'VY',  room:'213', type:'Theory', batch:null },
  { div:'A', day:'Friday', start:'11:15', end:'12:10', course:'TE-WEBX0', teacher:'SYA', room:'213', type:'Theory', batch:null },
  { div:'A', day:'Friday', start:'12:50', end:'14:40', course:'TE-MP2B',  teacher:'MK',  room:'213', type:'Lab',    batch:null },

  // TE B
  { div:'B', day:'Friday', start:'10:20', end:'11:15', course:'TE-DMBI',  teacher:'GK',  room:'214', type:'Theory', batch:null },
  { div:'B', day:'Friday', start:'11:15', end:'12:10', course:'TE-AIDS1', teacher:'NF',  room:'214', type:'Theory', batch:null },
  { div:'B', day:'Friday', start:'12:50', end:'14:40', course:'TE-SL',    teacher:'SMJ', room:'317', type:'Lab',    batch:'B1' },
  { div:'B', day:'Friday', start:'12:50', end:'14:40', course:'TE-BIL',   teacher:'GK',  room:'301', type:'Lab',    batch:'B2' },
  { div:'B', day:'Friday', start:'12:50', end:'14:40', course:'TE-WL',    teacher:'RS',  room:'303', type:'Lab',    batch:'B3' },

  // TE C
  { div:'C', day:'Friday', start:'10:20', end:'12:10', course:'TE-SL',    teacher:'CS',  room:'317', type:'Lab',    batch:'C1' },
  { div:'C', day:'Friday', start:'10:20', end:'12:10', course:'TE-MADL',  teacher:'SL',  room:'301', type:'Lab',    batch:'C2' },
  { div:'C', day:'Friday', start:'10:20', end:'12:10', course:'TE-DSL',   teacher:'SB',  room:'309', type:'Lab',    batch:'C3' },
  { div:'C', day:'Friday', start:'12:50', end:'13:45', course:'TE-DMBI',  teacher:'PV',  room:'101', type:'Theory', batch:null },
  { div:'C', day:'Friday', start:'13:45', end:'14:40', course:'TE-WT',    teacher:'SK',  room:'101', type:'Theory', batch:null },
  { div:'C', day:'Friday', start:'14:40', end:'16:30', course:'TE-WL',    teacher:'RS',  room:'302', type:'Lab',    batch:'C2' },
  { div:'C', day:'Friday', start:'14:40', end:'16:30', course:'TE-BIL',   teacher:'ATM', room:'301', type:'Lab',    batch:'C3' },
];

// ─────────────────────────────────────────────────────────────────────────────
// BE  (Semester 8)
// ─────────────────────────────────────────────────────────────────────────────
const BE = [

  // ━━━ MONDAY ━━━
  // BE A
  { div:'A', day:'Monday', start:'12:50', end:'14:40', course:'BE-BL',    teacher:'MG',  room:'302', type:'Lab',    batch:'A1' },
  { div:'A', day:'Monday', start:'12:50', end:'14:40', course:'BE-CCL',   teacher:'SJ',  room:'301', type:'Lab',    batch:'A2' },
  { div:'A', day:'Monday', start:'13:45', end:'14:40', course:'BE-BDA',   teacher:'VB',  room:'213', type:'Theory', batch:null },
  { div:'A', day:'Monday', start:'14:40', end:'15:35', course:'BE-CYBSEC',teacher:'SD',  room:'213', type:'Theory', batch:null },
  { div:'A', day:'Monday', start:'14:40', end:'15:35', course:'BE-AIMLH', teacher:'SS',  room:'214', type:'Theory', batch:null },

  // BE B
  { div:'B', day:'Monday', start:'08:10', end:'09:05', course:'BE-CCL',   teacher:'GG',  room:'303', type:'Lab',    batch:'B1' },
  { div:'B', day:'Monday', start:'12:50', end:'14:40', course:'BE-BL',    teacher:'ANS', room:'313', type:'Lab',    batch:'B1' },
  { div:'B', day:'Monday', start:'12:50', end:'14:40', course:'BE-BL',    teacher:'ANS', room:'302', type:'Lab',    batch:'B2' },
  { div:'B', day:'Monday', start:'12:50', end:'13:45', course:'BE-PM',    teacher:'RRK', room:'422', type:'Theory', batch:'B2' },
  { div:'B', day:'Monday', start:'13:45', end:'14:40', course:'BE-BDA',   teacher:'SMJ', room:'422', type:'Theory', batch:null },
  { div:'B', day:'Monday', start:'14:40', end:'15:35', course:'BE-BDLT',  teacher:'ANS', room:'422', type:'Theory', batch:null },
  { div:'B', day:'Monday', start:'14:40', end:'15:35', course:'BE-CYBSEC',teacher:'SD',  room:'213', type:'Theory', batch:null },
  { div:'B', day:'Monday', start:'14:40', end:'15:35', course:'BE-AIMLH', teacher:'SS',  room:'214', type:'Theory', batch:null },

  // BE C
  { div:'C', day:'Monday', start:'10:20', end:'12:10', course:'BE-BL',    teacher:'SL',  room:'302', type:'Lab',    batch:'C3' },
  { div:'C', day:'Monday', start:'13:45', end:'14:40', course:'BE-BDA',   teacher:'SRM', room:'101', type:'Theory', batch:null },
  { div:'C', day:'Monday', start:'14:40', end:'15:35', course:'BE-BDLT',  teacher:'GK',  room:'101', type:'Theory', batch:null },
  { div:'C', day:'Monday', start:'14:40', end:'15:35', course:'BE-CYBSEC',teacher:'SD',  room:'213', type:'Theory', batch:null },
  { div:'C', day:'Monday', start:'14:40', end:'15:35', course:'BE-AIMLH', teacher:'SS',  room:'214', type:'Theory', batch:null },

  // ━━━ TUESDAY ━━━
  // BE A
  { div:'A', day:'Tuesday', start:'08:10', end:'09:05', course:'BE-BDLT', teacher:'MG',  room:'205', type:'Theory', batch:null },
  { div:'A', day:'Tuesday', start:'12:50', end:'14:40', course:'BE-BL',   teacher:'MG',  room:'304C',type:'Lab',    batch:'A1' },
  { div:'A', day:'Tuesday', start:'12:50', end:'14:40', course:'BE-CCL',  teacher:'SJ',  room:'309', type:'Lab',    batch:'A3' },
  { div:'A', day:'Tuesday', start:'13:45', end:'14:40', course:'BE-PM',   teacher:'GG',  room:'422', type:'Theory', batch:'B1' },
  { div:'A', day:'Tuesday', start:'13:45', end:'14:40', course:'BE-PM',   teacher:'RRK', room:'101', type:'Theory', batch:'B2' },
  { div:'A', day:'Tuesday', start:'13:45', end:'14:40', course:'BE-UID',  teacher:'JJ',  room:'422', type:'Theory', batch:null },
  { div:'A', day:'Tuesday', start:'13:45', end:'14:40', course:'BE-CCS',  teacher:'SJ',  room:'101', type:'Theory', batch:null },
  { div:'A', day:'Tuesday', start:'14:40', end:'15:35', course:'BE-CYBSEC',teacher:'SD', room:'213', type:'Theory', batch:null },
  { div:'A', day:'Tuesday', start:'14:40', end:'15:35', course:'BE-AIMLH',teacher:'SS',  room:'214', type:'Theory', batch:null },

  // BE B
  { div:'B', day:'Tuesday', start:'08:10', end:'10:00', course:'BE-BL',   teacher:'ANS', room:'313', type:'Lab',    batch:'B3' },
  { div:'B', day:'Tuesday', start:'09:05', end:'10:00', course:'BE-PM',   teacher:'GG',  room:'422', type:'Theory', batch:'B1' },
  { div:'B', day:'Tuesday', start:'09:05', end:'10:00', course:'BE-PM',   teacher:'RRK', room:'101', type:'Theory', batch:'B2' },
  { div:'B', day:'Tuesday', start:'09:05', end:'10:00', course:'BE-UID',  teacher:'JJ',  room:'422', type:'Theory', batch:null },
  { div:'B', day:'Tuesday', start:'09:05', end:'10:00', course:'BE-CCS',  teacher:'SJ',  room:'101', type:'Theory', batch:null },
  { div:'B', day:'Tuesday', start:'12:50', end:'14:40', course:'BE-BL',   teacher:'ANS', room:'302', type:'Lab',    batch:'B2' },
  { div:'B', day:'Tuesday', start:'12:50', end:'14:40', course:'BE-CCL',  teacher:'GG',  room:'313', type:'Lab',    batch:'B3' },
  { div:'B', day:'Tuesday', start:'12:50', end:'14:40', course:'BE-MP2B', teacher:'GK',  room:'422', type:'Lab',    batch:null },

  // BE C
  { div:'C', day:'Tuesday', start:'08:10', end:'10:00', course:'BE-CCL',  teacher:'GG',  room:'309', type:'Lab',    batch:'C1' },
  { div:'C', day:'Tuesday', start:'12:50', end:'13:45', course:'BE-BDLT', teacher:'GK',  room:'101', type:'Theory', batch:null },
  { div:'C', day:'Tuesday', start:'13:45', end:'14:40', course:'BE-BDA',  teacher:'SRM', room:'101', type:'Theory', batch:null },
  { div:'C', day:'Tuesday', start:'14:40', end:'15:35', course:'BE-BDLT', teacher:'GK',  room:'101', type:'Theory', batch:null },
  { div:'C', day:'Tuesday', start:'14:40', end:'15:35', course:'BE-BDA',  teacher:'SRM', room:'101', type:'Theory', batch:null },

  // ━━━ WEDNESDAY ━━━
  // BE A
  { div:'A', day:'Wednesday', start:'12:50', end:'13:45', course:'BE-BDLT',teacher:'MG',  room:'422', type:'Theory', batch:null },
  { div:'A', day:'Wednesday', start:'13:45', end:'14:40', course:'BE-PM',  teacher:'GG',  room:'422', type:'Theory', batch:'B1' },
  { div:'A', day:'Wednesday', start:'12:50', end:'14:40', course:'BE-CCL', teacher:'SJ',  room:'309', type:'Lab',    batch:'A1' },
  { div:'A', day:'Wednesday', start:'12:50', end:'14:40', course:'BE-BL',  teacher:'MG',  room:'303', type:'Lab',    batch:'A3' },
  { div:'A', day:'Wednesday', start:'14:40', end:'15:35', course:'BE-UID', teacher:'JJ',  room:'422', type:'Theory', batch:null },
  { div:'A', day:'Wednesday', start:'14:40', end:'15:35', course:'BE-CCS', teacher:'SJ',  room:'213', type:'Theory', batch:null },
  { div:'A', day:'Wednesday', start:'14:40', end:'15:35', course:'BE-CYBSEC',teacher:'SD',room:'213', type:'Theory', batch:null },
  { div:'A', day:'Wednesday', start:'14:40', end:'15:35', course:'BE-AIMLH',teacher:'SS', room:'214', type:'Theory', batch:null },

  // BE C
  { div:'C', day:'Wednesday', start:'10:20', end:'12:10', course:'BE-CCL', teacher:'GG',  room:'313', type:'Lab',    batch:'C2' },
  { div:'C', day:'Wednesday', start:'10:20', end:'12:10', course:'BE-BL',  teacher:'SL',  room:'304C',type:'Lab',    batch:'C1' },
  { div:'C', day:'Wednesday', start:'10:20', end:'12:10', course:'BE-BL',  teacher:'ANS', room:'304C',type:'Lab',    batch:'C2' },

  // ━━━ THURSDAY ━━━
  // BE A
  { div:'A', day:'Thursday', start:'09:05', end:'10:00', course:'BE-BDA',   teacher:'VB',  room:'213', type:'Theory', batch:null },
  { div:'A', day:'Thursday', start:'10:20', end:'11:15', course:'BE-BDA',   teacher:'VB',  room:'213', type:'Theory', batch:null },
  { div:'A', day:'Thursday', start:'11:15', end:'12:10', course:'BE-BDLT',  teacher:'MG',  room:'213', type:'Theory', batch:null },
  { div:'A', day:'Thursday', start:'10:20', end:'12:10', course:'BE-UID',   teacher:'JJ',  room:'422', type:'Theory', batch:null },
  { div:'A', day:'Thursday', start:'10:20', end:'12:10', course:'BE-CCS',   teacher:'SJ',  room:'213', type:'Theory', batch:null },
  { div:'A', day:'Thursday', start:'14:40', end:'16:30', course:'BE-MAJPRJ',teacher:'UP',  room:'101', type:'Lab',    batch:null },
  { div:'A', day:'Thursday', start:'14:40', end:'15:35', course:'BE-CYBSEC',teacher:'SD',  room:'205', type:'Theory', batch:null },
  { div:'A', day:'Thursday', start:'14:40', end:'15:35', course:'BE-AIMLH', teacher:'SS',  room:'214', type:'Theory', batch:null },

  // BE B
  { div:'B', day:'Thursday', start:'10:20', end:'11:15', course:'BE-BDLT',  teacher:'ANS', room:'422', type:'Theory', batch:null },
  { div:'B', day:'Thursday', start:'11:15', end:'12:10', course:'BE-BDA',   teacher:'SMJ', room:'422', type:'Theory', batch:null },
  { div:'B', day:'Thursday', start:'12:50', end:'13:45', course:'BE-BDLT',  teacher:'ANS', room:'422', type:'Theory', batch:null },
  { div:'B', day:'Thursday', start:'13:45', end:'14:40', course:'BE-PM',    teacher:'GG',  room:'422', type:'Theory', batch:'B1' },
  { div:'B', day:'Thursday', start:'13:45', end:'14:40', course:'BE-PM',    teacher:'RRK', room:'101', type:'Theory', batch:'B2' },
  { div:'B', day:'Thursday', start:'14:40', end:'16:30', course:'BE-MAJPRJ',teacher:'GG',  room:'422', type:'Lab',    batch:null },
  { div:'B', day:'Thursday', start:'12:50', end:'14:40', course:'BE-MP2B',  teacher:'SRM', room:'304C',type:'Lab',    batch:null },

  // BE C
  { div:'C', day:'Thursday', start:'08:10', end:'10:00', course:'BE-CCL',   teacher:'GG',  room:'317', type:'Lab',    batch:'C3' },
  { div:'C', day:'Thursday', start:'12:50', end:'13:45', course:'BE-BDA',   teacher:'SRM', room:'101', type:'Theory', batch:null },
  { div:'C', day:'Thursday', start:'13:45', end:'14:40', course:'BE-BDLT',  teacher:'GK',  room:'101', type:'Theory', batch:null },
  { div:'C', day:'Thursday', start:'12:50', end:'14:40', course:'BE-MAJPRJ',teacher:'KBD', room:'304C',type:'Lab',    batch:null },
  { div:'C', day:'Thursday', start:'14:40', end:'15:35', course:'BE-CYBSEC',teacher:'SD',  room:'205', type:'Theory', batch:null },
  { div:'C', day:'Thursday', start:'14:40', end:'15:35', course:'BE-AIMLH', teacher:'SS',  room:'206', type:'Theory', batch:null },

  // ━━━ FRIDAY ━━━
  // BE A — MAJOR PROJECT-I  A=101 (S1-S4) / A=206 (S5-S8)
  { div:'A', day:'Friday', start:'08:10', end:'10:00', course:'BE-MAJPRJ',teacher:'VB',  room:'101', type:'Lab',    batch:null },
  { div:'A', day:'Friday', start:'10:20', end:'12:10', course:'BE-MAJPRJ',teacher:'VB',  room:'101', type:'Lab',    batch:null },
  { div:'A', day:'Friday', start:'12:50', end:'14:40', course:'BE-MAJPRJ',teacher:'MG',  room:'206', type:'Lab',    batch:null },
  { div:'A', day:'Friday', start:'14:40', end:'16:30', course:'BE-MAJPRJ',teacher:'MG',  room:'206', type:'Lab',    batch:null },

  // BE B — MAJOR PROJECT-I  B=422 (S1-S4) / B=304C (S5-S8)
  { div:'B', day:'Friday', start:'08:10', end:'10:00', course:'BE-MAJPRJ',teacher:'ANS', room:'422', type:'Lab',    batch:null },
  { div:'B', day:'Friday', start:'10:20', end:'12:10', course:'BE-MAJPRJ',teacher:'ANS', room:'422', type:'Lab',    batch:null },
  { div:'B', day:'Friday', start:'12:50', end:'14:40', course:'BE-MAJPRJ',teacher:'GK',  room:'304C',type:'Lab',    batch:null },
  { div:'B', day:'Friday', start:'14:40', end:'16:30', course:'BE-MAJPRJ',teacher:'GK',  room:'304C',type:'Lab',    batch:null },

  // BE C — MAJOR PROJECT-I  C=304C (S1-S4) / C=422 (S5-S8)
  { div:'C', day:'Friday', start:'08:10', end:'10:00', course:'BE-MAJPRJ',teacher:'SMJ', room:'304C',type:'Lab',    batch:null },
  { div:'C', day:'Friday', start:'10:20', end:'12:10', course:'BE-MAJPRJ',teacher:'SMJ', room:'304C',type:'Lab',    batch:null },
  { div:'C', day:'Friday', start:'12:50', end:'14:40', course:'BE-MAJPRJ',teacher:'SRM', room:'422', type:'Lab',    batch:null },
  { div:'C', day:'Friday', start:'14:40', end:'16:30', course:'BE-MAJPRJ',teacher:'SRM', room:'422', type:'Lab',    batch:null },
];

// ═══════════════════════════════════════════════════════════════════════════
// SEED
// ═══════════════════════════════════════════════════════════════════════════
async function seed() {
  const URI = process.env.MONGO_URI || 'mongodb://localhost:27017/uniflow';
  console.log(`\n🔌 Connecting → ${URI}`);
  await mongoose.connect(URI);
  console.log('✅ Connected\n');

  console.log('🗑️  Clearing old data …');
  await Promise.all([
    Timetable.deleteMany({}), Course.deleteMany({}),
    Teacher.deleteMany({}),   Room.deleteMany({}),
    Department.deleteMany({}),
  ]);

  // Departments
  console.log('📂 Departments …');
  const deptDocs = await Department.insertMany(DEPARTMENTS);
  const deptMap  = {};
  deptDocs.forEach(d => (deptMap[d.coursecode] = d._id));
  const IT = deptMap['IT'];

  // Rooms
  console.log('🏛️  Rooms …');
  const roomDocs = await Room.insertMany(
    ROOMS.map(r => ({ ...r, building:'Laboratory Complex', isActive:true, isAvailable:true }))
  );
  const roomMap = {};
  roomDocs.forEach(r => (roomMap[r.roomNumber] = r._id));

  // Teachers
  console.log('👩‍🏫 Teachers …');
  const teacherDocs = await Teacher.insertMany(
    TEACHERS.map((t, i) => ({
      employeeId:        `EMP-IT-${String(i+1).padStart(3,'0')}`,
      name:              t.name,
      primaryDepartment: IT,
      allowedDepartments:[IT],
      designation:       t.desig,
    }))
  );
  const teacherMap = {};
  TEACHERS.forEach((t, i) => (teacherMap[t.abbrev] = { _id:teacherDocs[i]._id, name:t.name }));

  // Courses
  console.log('📚 Courses …');
  const courseDocs = await Course.insertMany(
    COURSES.map(c => ({
      courseCode:   c.code,
      name:         c.name,
      department:   IT,
      semester:     c.sem,
      courseType:   c.type,
      credits:      c.cr,
      hoursPerWeek: c.hpw,
      isActive:     true,
    }))
  );
  const courseMap = {};
  courseDocs.forEach(c => (courseMap[c.courseCode] = { _id:c._id, name:c.name, code:c.courseCode }));

  // Build + insert timetables
  const warnings = [];
  function buildEntries(rows, sem) {
    return rows.reduce((acc, r) => {
      const C = courseMap[r.course];
      const T = teacherMap[r.teacher];
      const R = roomMap[r.room];
      if (!C) { warnings.push(`❓ Course: ${r.course}`);   return acc; }
      if (!T) { warnings.push(`❓ Teacher: ${r.teacher}`); return acc; }
      if (!R) { warnings.push(`❓ Room: ${r.room}`);       return acc; }
      acc.push({
        Course:      C._id,
        teacher:     T._id,
        room:        R,
        type:        r.type === 'Tutorial' ? 'Theory' : r.type,
        dayOfWeek:   r.day,
        startTime:   r.start,
        endTime:     r.end,
        semester:    sem,
        division:    r.div,
        batch:       r.batch || null,
        courseCode:  C.code,
        courseName:  C.name,
        teacherName: T.name,
        roomNumber:  r.room,
      });
      return acc;
    }, []);
  }

  console.log('📅 Timetables …\n');
  for (const { label, rows, sem } of [
    { label:'SE', rows:SE, sem:4 },
    { label:'TE', rows:TE, sem:6 },
    { label:'BE', rows:BE, sem:8 },
  ]) {
    for (const div of ['A','B','C']) {
      const entries = buildEntries(rows.filter(r => r.div === div), sem);
      await Timetable.create({
        name:         `IT-${label}-DIV${div}-EVEN-2025-26`,
        studentGroup: { department:IT, semester:sem, division:div },
        academicYear: 2025,
        status:       'Published',
        publishedAt:  new Date(),
        schedule:     entries,
      });
      console.log(`   ✅ IT ${label} Div-${div}  →  ${entries.length} schedule entries`);
    }
  }

  if (warnings.length) {
    console.log('\n⚠️  Warnings (missing refs):');
    [...new Set(warnings)].forEach(w => console.log('   ', w));
  }

  const [d,r,t,c,tt] = await Promise.all([
    Department.countDocuments(), Room.countDocuments(),
    Teacher.countDocuments(),    Course.countDocuments(),
    Timetable.countDocuments(),
  ]);
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  ✅  SEED COMPLETE  —  A.P. Shah IT Dept  Even 2025-26');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Departments  :  ${d}`);
  console.log(`  Rooms        :  ${r}  (7 classrooms · 7 labs)`);
  console.log(`  Teachers     :  ${t}  (all PDF faculty incl. NF)`);
  console.log(`  Courses      :  ${c}  (SE · TE · BE)`);
  console.log(`  Timetables   :  ${tt}  (SE/TE/BE × Div A/B/C · Published)`);
  console.log('══════════════════════════════════════════════════════════\n');
  await mongoose.disconnect();
  console.log('🔌 Disconnected. Done!\n');
}

seed().catch(err => { console.error('❌ Seed error:', err.message); process.exit(1); });