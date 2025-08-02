/**
 * Sample Subject Data Generator
 * Creates sample subjects for Mumbai University engineering college
 */

const Subject = require('../src/models/Subject');

/**
 * Generate comprehensive sample subjects for all departments and semesters
 */
const generateSampleSubjects = (adminUserId) => {
  return [
    // Computer Science Department - Year 1
    {
      code: 'CS101',
      name: 'Introduction to Computer Programming',
      credits: 4,
      semester: 1,
      department: 'Computer Science',
      year: 1,
      type: 'both',
      description: 'Fundamentals of programming using C language, basic algorithms and data structures',
      prerequisites: [],
      syllabus: {
        modules: [
          {
            title: 'Introduction to Programming',
            topics: ['Programming concepts', 'Algorithm design', 'Flowcharts'],
            hours: 8
          },
          {
            title: 'C Programming Basics',
            topics: ['Variables and data types', 'Control structures', 'Functions'],
            hours: 12
          }
        ],
        references: ['Programming in C by Dennis Ritchie', 'Let Us C by Yashavant Kanetkar'],
        outcomes: ['Understand programming fundamentals', 'Write basic C programs']
      },
      isActive: true,
      createdBy: adminUserId
    },
    {
      code: 'MATH101',
      name: 'Engineering Mathematics I',
      credits: 4,
      semester: 1,
      department: 'Computer Science',
      year: 1,
      type: 'theory',
      description: 'Differential calculus, integral calculus, and matrices for engineering applications',
      prerequisites: [],
      isActive: true,
      createdBy: adminUserId
    },
    {
      code: 'PHY101',
      name: 'Applied Physics I',
      credits: 3,
      semester: 1,
      department: 'Computer Science',
      year: 1,
      type: 'both',
      description: 'Mechanics, properties of matter, heat and thermodynamics',
      prerequisites: [],
      isActive: true,
      createdBy: adminUserId
    },
    {
      code: 'CS102',
      name: 'Data Structures and Algorithms',
      credits: 4,
      semester: 2,
      department: 'Computer Science',
      year: 1,
      type: 'both',
      description: 'Linear and non-linear data structures, sorting and searching algorithms',
      prerequisites: ['CS101'],
      isActive: true,
      createdBy: adminUserId
    },
    
    // Computer Science Department - Year 2
    {
      code: 'CS201',
      name: 'Object Oriented Programming',
      credits: 4,
      semester: 3,
      department: 'Computer Science',
      year: 2,
      type: 'both',
      description: 'OOP concepts using Java, inheritance, polymorphism, exception handling',
      prerequisites: ['CS101', 'CS102'],
      isActive: true,
      createdBy: adminUserId
    },
    {
      code: 'CS202',
      name: 'Database Management Systems',
      credits: 4,
      semester: 3,
      department: 'Computer Science',
      year: 2,
      type: 'both',
      description: 'Database design, SQL, normalization, transaction management',
      prerequisites: ['CS102'],
      isActive: true,
      createdBy: adminUserId
    },
    {
      code: 'CS203',
      name: 'Computer Networks',
      credits: 3,
      semester: 4,
      department: 'Computer Science',
      year: 2,
      type: 'theory',
      description: 'Network protocols, TCP/IP, OSI model, network security basics',
      prerequisites: ['CS201'],
      isActive: true,
      createdBy: adminUserId
    },
    
    // Mechanical Engineering Department
    {
      code: 'MECH101',
      name: 'Engineering Mechanics',
      credits: 4,
      semester: 1,
      department: 'Mechanical Engineering',
      year: 1,
      type: 'theory',
      description: 'Statics and dynamics of particles and rigid bodies',
      prerequisites: [],
      isActive: true,
      createdBy: adminUserId
    },
    {
      code: 'MECH102',
      name: 'Engineering Drawing',
      credits: 3,
      semester: 1,
      department: 'Mechanical Engineering',
      year: 1,
      type: 'practical',
      description: 'Technical drawing, orthographic projections, sectional views',
      prerequisites: [],
      isActive: true,
      createdBy: adminUserId
    },
    {
      code: 'MECH201',
      name: 'Thermodynamics',
      credits: 4,
      semester: 3,
      department: 'Mechanical Engineering',
      year: 2,
      type: 'theory',
      description: 'Laws of thermodynamics, cycles, heat engines, refrigeration',
      prerequisites: ['MECH101'],
      isActive: true,
      createdBy: adminUserId
    },
    
    // Electrical Engineering Department
    {
      code: 'EE101',
      name: 'Circuit Analysis',
      credits: 4,
      semester: 1,
      department: 'Electrical Engineering',
      year: 1,
      type: 'both',
      description: 'DC and AC circuit analysis, network theorems, resonance',
      prerequisites: [],
      isActive: true,
      createdBy: adminUserId
    },
    {
      code: 'EE102',
      name: 'Electrical Machines I',
      credits: 4,
      semester: 3,
      department: 'Electrical Engineering',
      year: 2,
      type: 'both',
      description: 'DC machines, transformers, operating principles and characteristics',
      prerequisites: ['EE101'],
      isActive: true,
      createdBy: adminUserId
    },
    
    // Information Technology Department
    {
      code: 'IT101',
      name: 'Fundamentals of Information Technology',
      credits: 3,
      semester: 1,
      department: 'Information Technology',
      year: 1,
      type: 'theory',
      description: 'IT fundamentals, computer systems, software and hardware overview',
      prerequisites: [],
      isActive: true,
      createdBy: adminUserId
    },
    {
      code: 'IT201',
      name: 'Web Technologies',
      credits: 4,
      semester: 3,
      department: 'Information Technology',
      year: 2,
      type: 'both',
      description: 'HTML, CSS, JavaScript, PHP, web development frameworks',
      prerequisites: ['IT101'],
      isActive: true,
      createdBy: adminUserId
    },
    
    // Electronics & Telecommunication Department
    {
      code: 'EC101',
      name: 'Electronic Devices and Circuits',
      credits: 4,
      semester: 1,
      department: 'Electronics & Telecommunication',
      year: 1,
      type: 'both',
      description: 'Semiconductor devices, diodes, transistors, amplifiers',
      prerequisites: [],
      isActive: true,
      createdBy: adminUserId
    },
    {
      code: 'EC201',
      name: 'Digital Electronics',
      credits: 4,
      semester: 3,
      department: 'Electronics & Telecommunication',
      year: 2,
      type: 'both',
      description: 'Boolean algebra, logic gates, combinational and sequential circuits',
      prerequisites: ['EC101'],
      isActive: true,
      createdBy: adminUserId
    },
    
    // Civil Engineering Department
    {
      code: 'CE101',
      name: 'Building Materials and Construction',
      credits: 4,
      semester: 1,
      department: 'Civil Engineering',
      year: 1,
      type: 'both',
      description: 'Properties of construction materials, concrete technology, construction methods',
      prerequisites: [],
      isActive: true,
      createdBy: adminUserId
    },
    {
      code: 'CE201',
      name: 'Structural Analysis',
      credits: 4,
      semester: 3,
      department: 'Civil Engineering',
      year: 2,
      type: 'theory',
      description: 'Analysis of determinate and indeterminate structures',
      prerequisites: ['CE101'],
      isActive: true,
      createdBy: adminUserId
    },
    
    // Chemical Engineering Department
    {
      code: 'CHEM101',
      name: 'Chemical Process Principles',
      credits: 4,
      semester: 1,
      department: 'Chemical Engineering',
      year: 1,
      type: 'theory',
      description: 'Material and energy balances, process calculations',
      prerequisites: [],
      isActive: true,
      createdBy: adminUserId
    },
    {
      code: 'CHEM201',
      name: 'Fluid Mechanics',
      credits: 4,
      semester: 3,
      department: 'Chemical Engineering',
      year: 2,
      type: 'both',
      description: 'Fluid statics and dynamics, flow measurement, pumps',
      prerequisites: ['CHEM101'],
      isActive: true,
      createdBy: adminUserId
    },
    
    // Instrumentation Engineering Department
    {
      code: 'INST101',
      name: 'Measurement and Instrumentation',
      credits: 4,
      semester: 1,
      department: 'Instrumentation Engineering',
      year: 1,
      type: 'both',
      description: 'Measurement principles, sensors, transducers, signal conditioning',
      prerequisites: [],
      isActive: true,
      createdBy: adminUserId
    },
    {
      code: 'INST201',
      name: 'Control Systems',
      credits: 4,
      semester: 3,
      department: 'Instrumentation Engineering',
      year: 2,
      type: 'both',
      description: 'Control system fundamentals, transfer functions, stability analysis',
      prerequisites: ['INST101'],
      isActive: true,
      createdBy: adminUserId
    },
    
    // Common subjects for all departments
    {
      code: 'ENG101',
      name: 'English Communication',
      credits: 2,
      semester: 1,
      department: 'Computer Science',
      year: 1,
      type: 'theory',
      description: 'Technical communication, presentation skills, report writing',
      prerequisites: [],
      isActive: true,
      createdBy: adminUserId
    },
    {
      code: 'ENV101',
      name: 'Environmental Studies',
      credits: 2,
      semester: 2,
      department: 'Computer Science',
      year: 1,
      type: 'theory',
      description: 'Environmental awareness, pollution control, sustainable development',
      prerequisites: [],
      isActive: true,
      createdBy: adminUserId
    }
  ];
};

/**
 * Sample CSV data for testing import functionality
 */
const generateSampleSubjectCSV = () => {
  return `code,name,department,semester,year,credits,type,description,prerequisites,isActive
CS301,Software Engineering,Computer Science,5,3,4,both,"Software development lifecycle, project management","CS201,CS202",true
CS302,Artificial Intelligence,Computer Science,5,3,3,theory,"AI fundamentals, machine learning basics",CS201,true
CS303,Computer Graphics,Computer Science,6,3,3,both,"2D and 3D graphics, OpenGL programming",CS201,true
MECH301,Heat Transfer,Mechanical Engineering,5,3,3,theory,"Conduction, convection, radiation",MECH201,true
EE301,Power Systems,Electrical Engineering,5,3,4,both,"Generation, transmission, distribution",EE102,true`;
};

module.exports = {
  generateSampleSubjects,
  generateSampleSubjectCSV
};
