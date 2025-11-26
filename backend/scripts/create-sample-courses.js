const mongoose = require('mongoose');
const Course = require('../src/models/Course');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/uniflow', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function createSampleCourses() {
  try {
    console.log('📚 Creating sample courses for timetable generation...\n');
    
    // Clear existing courses
    await Course.deleteMany({});
    console.log('🗑️ Cleared existing course data\n');
    
    const sampleCourses = [
      // Computer Science Department - Semester 1
      {
        courseCode: 'CS101',
        courseName: 'Programming Fundamentals',
        department: 'Computer Science',
        semester: 1,
        courseType: 'Theory',
        credits: 4,
        hoursPerWeek: 4,
        syllabus: {
          topics: ['Introduction to Programming', 'Variables and Data Types', 'Control Structures', 'Functions', 'Arrays'],
          syllabusLink: ''
        }
      },
      {
        courseCode: 'CS101L',
        courseName: 'Programming Fundamentals Lab',
        department: 'Computer Science',
        semester: 1,
        courseType: 'Practical',
        credits: 2,
        hoursPerWeek: 2,
        syllabus: {
          topics: ['C Programming Exercises', 'Algorithm Implementation', 'Code Debugging'],
          syllabusLink: ''
        }
      },
      
      // Computer Science Department - Semester 3
      {
        courseCode: 'CS301',
        courseName: 'Data Structures and Algorithms',
        department: 'Computer Science',
        semester: 3,
        courseType: 'Theory',
        credits: 4,
        hoursPerWeek: 4,
        syllabus: {
          topics: ['Arrays', 'Linked Lists', 'Stacks', 'Queues', 'Trees', 'Graphs', 'Sorting', 'Searching'],
          syllabusLink: ''
        }
      },
      {
        courseCode: 'CS301L',
        courseName: 'Data Structures Lab',
        department: 'Computer Science',
        semester: 3,
        courseType: 'Practical',
        credits: 2,
        hoursPerWeek: 2,
        syllabus: {
          topics: ['Implementation of Data Structures', 'Algorithm Analysis'],
          syllabusLink: ''
        }
      },
      {
        courseCode: 'CS302',
        courseName: 'Database Management Systems',
        department: 'Computer Science',
        semester: 3,
        courseType: 'Theory',
        credits: 3,
        hoursPerWeek: 3,
        syllabus: {
          topics: ['Database Design', 'SQL', 'Normalization', 'Transactions', 'Concurrency Control'],
          syllabusLink: ''
        }
      },
      
      // Information Technology Department - Semester 1
      {
        courseCode: 'IT101',
        courseName: 'Introduction to Information Technology',
        department: 'Information Technology',
        semester: 1,
        courseType: 'Theory',
        credits: 3,
        hoursPerWeek: 3,
        syllabus: {
          topics: ['IT Fundamentals', 'Computer Systems', 'Networks', 'Software Engineering'],
          syllabusLink: ''
        }
      },
      {
        courseCode: 'IT102',
        courseName: 'Web Technologies',
        department: 'Information Technology',
        semester: 1,
        courseType: 'Theory',
        credits: 4,
        hoursPerWeek: 4,
        syllabus: {
          topics: ['HTML', 'CSS', 'JavaScript', 'Web Design Principles'],
          syllabusLink: ''
        }
      },
      {
        courseCode: 'IT102L',
        courseName: 'Web Technologies Lab',
        department: 'Information Technology',
        semester: 1,
        courseType: 'Practical',
        credits: 2,
        hoursPerWeek: 2,
        syllabus: {
          topics: ['Website Development', 'Frontend Programming', 'Responsive Design'],
          syllabusLink: ''
        }
      },
      
      // Information Technology Department - Semester 3
      {
        courseCode: 'IT301',
        courseName: 'Network Administration',
        department: 'Information Technology',
        semester: 3,
        courseType: 'Theory',
        credits: 3,
        hoursPerWeek: 3,
        syllabus: {
          topics: ['Network Protocols', 'Network Security', 'Server Administration', 'Network Troubleshooting'],
          syllabusLink: ''
        }
      },
      {
        courseCode: 'IT301L',
        courseName: 'Network Administration Lab',
        department: 'Information Technology',
        semester: 3,
        courseType: 'Practical',
        credits: 2,
        hoursPerWeek: 2,
        syllabus: {
          topics: ['Network Configuration', 'Server Setup', 'Security Implementation'],
          syllabusLink: ''
        }
      },
      
      // First Year Department - Semester 1
      {
        courseCode: 'FY101',
        courseName: 'Engineering Mathematics I',
        department: 'First Year',
        semester: 1,
        courseType: 'Theory',
        credits: 4,
        hoursPerWeek: 4,
        syllabus: {
          topics: ['Differential Calculus', 'Integral Calculus', 'Matrices', 'Vector Algebra'],
          syllabusLink: ''
        }
      },
      {
        courseCode: 'FY102',
        courseName: 'Engineering Physics I',
        department: 'First Year',
        semester: 1,
        courseType: 'Theory',
        credits: 3,
        hoursPerWeek: 3,
        syllabus: {
          topics: ['Mechanics', 'Wave Motion', 'Thermodynamics', 'Optics'],
          syllabusLink: ''
        }
      },
      {
        courseCode: 'FY102L',
        courseName: 'Engineering Physics Lab I',
        department: 'First Year',
        semester: 1,
        courseType: 'Practical',
        credits: 1,
        hoursPerWeek: 2,
        syllabus: {
          topics: ['Physics Experiments', 'Measurement Techniques', 'Data Analysis'],
          syllabusLink: ''
        }
      },
      {
        courseCode: 'FY103',
        courseName: 'Engineering Chemistry I',
        department: 'First Year',
        semester: 1,
        courseType: 'Theory',
        credits: 3,
        hoursPerWeek: 3,
        syllabus: {
          topics: ['Atomic Structure', 'Chemical Bonding', 'Periodic Table', 'Chemical Reactions'],
          syllabusLink: ''
        }
      },
      {
        courseCode: 'FY103L',
        courseName: 'Engineering Chemistry Lab I',
        department: 'First Year',
        semester: 1,
        courseType: 'Practical',
        credits: 1,
        hoursPerWeek: 2,
        syllabus: {
          topics: ['Chemical Analysis', 'Synthesis Experiments', 'Safety Procedures'],
          syllabusLink: ''
        }
      },
      
      // First Year Department - Semester 2
      {
        courseCode: 'FY201',
        courseName: 'Engineering Mathematics II',
        department: 'First Year',
        semester: 2,
        courseType: 'Theory',
        credits: 4,
        hoursPerWeek: 4,
        syllabus: {
          topics: ['Differential Equations', 'Laplace Transform', 'Fourier Series', 'Complex Numbers'],
          syllabusLink: ''
        }
      },
      {
        courseCode: 'FY202',
        courseName: 'Engineering Mechanics',
        department: 'First Year',
        semester: 2,
        courseType: 'Theory',
        credits: 4,
        hoursPerWeek: 4,
        syllabus: {
          topics: ['Statics', 'Dynamics', 'Kinematics', 'Kinetics', 'Work and Energy'],
          syllabusLink: ''
        }
      }
    ];

    // Add courses to database
    for (const courseData of sampleCourses) {
      const course = new Course(courseData);
      await course.save();
      console.log(`✅ Added course: ${course.courseCode} - ${course.courseName} (${course.department}, Sem ${course.semester})`);
    }
    
    console.log(`\n🎉 Successfully added ${sampleCourses.length} courses to the database!`);
    
    // Show summary by department
    console.log('\n📊 Course Summary by Department:');
    for (const dept of ['Computer Science', 'Information Technology', 'First Year']) {
      const deptCourses = sampleCourses.filter(c => c.department === dept);
      console.log(`   ${dept}: ${deptCourses.length} courses`);
      deptCourses.forEach(course => {
        console.log(`     - ${course.courseCode}: ${course.courseName} (${course.courseType}, ${course.hoursPerWeek}h/week)`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error adding courses:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔚 Database connection closed');
  }
}

createSampleCourses();