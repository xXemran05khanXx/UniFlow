const fs = require('fs').promises;
const path = require('path');

class SampleDataGenerator {
  constructor() {
    this.departments = ['Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History'];
    this.courseTypes = ['lecture', 'lab', 'tutorial', 'seminar'];
    this.buildings = ['Science Block', 'Engineering Block', 'Liberal Arts', 'Main Building'];
    this.equipmentTypes = ['Projector', 'Whiteboard', 'Computer', 'Lab Equipment', 'Smart Board', 'Audio System'];
  }

  /**
   * Generate sample course data
   */
  generateCourses(count = 50) {
    const courses = [];
    
    for (let i = 1; i <= count; i++) {
      const department = this.getRandomElement(this.departments);
      const deptCode = department.split(' ').map(word => word[0]).join('').toUpperCase();
      
      courses.push({
        courseCode: `${deptCode}${(100 + i).toString()}`,
        courseName: this.generateCourseName(department),
        credits: this.getRandomElement([2, 3, 4]),
        department: department,
        semester: this.getRandomElement(['fall', 'spring', 'summer']),
        prerequisites: this.generatePrerequisites(deptCode, i),
        description: `Advanced course in ${department.toLowerCase()}`,
        maxStudents: this.getRandomInt(20, 60),
        sessionType: this.getRandomElement(this.courseTypes),
        hoursPerWeek: this.getRandomElement([2, 3, 4]),
        requiresLab: this.getRandomElement([true, false]),
        requiredEquipment: this.generateEquipment(),
        isRequired: this.getRandomElement([true, false]),
        enrollment: this.getRandomInt(15, 50)
      });
    }
    
    return courses;
  }

  /**
   * Generate sample teacher data
   */
  generateTeachers(count = 20) {
    const teachers = [];
    const titles = ['Dr.', 'Prof.', 'Mr.', 'Ms.', 'Mrs.'];
    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'James', 'Maria'];
    const lastNames = ['Smith', 'Johnson', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas'];
    
    for (let i = 1; i <= count; i++) {
      const firstName = this.getRandomElement(firstNames);
      const lastName = this.getRandomElement(lastNames);
      const title = this.getRandomElement(titles);
      const department = this.getRandomElement(this.departments);
      
      teachers.push({
        teacherId: `T${i.toString().padStart(3, '0')}`,
        name: `${title} ${firstName} ${lastName}`,
        department: department,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@university.edu`,
        qualification: this.getRandomElement(['PhD', 'Masters', 'Bachelor']),
        specialization: this.generateSpecializations(department),
        maxHours: this.getRandomInt(15, 25),
        experience: this.getRandomInt(1, 20),
        preferences: this.generateTeacherPreferences(),
        availability: this.generateAvailability()
      });
    }
    
    return teachers;
  }

  /**
   * Generate sample room data
   */
  generateRooms(count = 30) {
    const rooms = [];
    
    for (let i = 1; i <= count; i++) {
      const building = this.getRandomElement(this.buildings);
      const floor = this.getRandomInt(1, 4);
      const roomNum = (floor * 100) + i;
      
      rooms.push({
        roomNumber: roomNum.toString(),
        building: building,
        capacity: this.getRandomInt(20, 80),
        type: this.getRandomElement(['classroom', 'lab', 'lecture_hall', 'seminar_room']),
        equipment: this.generateRoomEquipment(),
        isLab: this.getRandomElement([true, false]),
        floor: floor,
        availability: this.generateRoomAvailability()
      });
    }
    
    return rooms;
  }

  /**
   * Generate comprehensive test dataset
   */
  async generateCompleteDataset(options = {}) {
    const {
      courseCount = 50,
      teacherCount = 20,
      roomCount = 30,
      outputDir = './sample-data'
    } = options;

    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    // Generate data
    const courses = this.generateCourses(courseCount);
    const teachers = this.generateTeachers(teacherCount);
    const rooms = this.generateRooms(roomCount);

    // Save as JSON files
    await fs.writeFile(
      path.join(outputDir, 'courses.json'),
      JSON.stringify(courses, null, 2)
    );

    await fs.writeFile(
      path.join(outputDir, 'teachers.json'),
      JSON.stringify(teachers, null, 2)
    );

    await fs.writeFile(
      path.join(outputDir, 'rooms.json'),
      JSON.stringify(rooms, null, 2)
    );

    // Save as CSV files
    await this.saveAsCSV(courses, path.join(outputDir, 'courses.csv'));
    await this.saveAsCSV(teachers, path.join(outputDir, 'teachers.csv'));
    await this.saveAsCSV(rooms, path.join(outputDir, 'rooms.csv'));

    // Generate a comprehensive dataset file
    const dataset = {
      courses,
      teachers,
      rooms,
      metadata: {
        generatedAt: new Date().toISOString(),
        counts: {
          courses: courses.length,
          teachers: teachers.length,
          rooms: rooms.length
        },
        summary: {
          departments: [...new Set(courses.map(c => c.department))],
          buildings: [...new Set(rooms.map(r => r.building))],
          courseTypes: [...new Set(courses.map(c => c.sessionType))]
        }
      }
    };

    await fs.writeFile(
      path.join(outputDir, 'complete-dataset.json'),
      JSON.stringify(dataset, null, 2)
    );

    return {
      success: true,
      outputDir,
      files: [
        'courses.json', 'courses.csv',
        'teachers.json', 'teachers.csv',
        'rooms.json', 'rooms.csv',
        'complete-dataset.json'
      ],
      statistics: dataset.metadata
    };
  }

  /**
   * Helper methods
   */
  getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  generateCourseName(department) {
    const courseNames = {
      'Computer Science': ['Data Structures', 'Algorithms', 'Database Systems', 'Software Engineering', 'Web Development'],
      'Mathematics': ['Calculus', 'Linear Algebra', 'Statistics', 'Discrete Mathematics', 'Probability Theory'],
      'Physics': ['Mechanics', 'Thermodynamics', 'Quantum Physics', 'Electromagnetism', 'Optics'],
      'Chemistry': ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Analytical Chemistry', 'Biochemistry'],
      'Biology': ['Cell Biology', 'Genetics', 'Ecology', 'Microbiology', 'Molecular Biology'],
      'English': ['Literature', 'Creative Writing', 'Linguistics', 'Grammar', 'Poetry'],
      'History': ['World History', 'Modern History', 'Ancient Civilizations', 'Political History', 'Cultural Studies']
    };

    const names = courseNames[department] || ['General Studies'];
    return this.getRandomElement(names);
  }

  generatePrerequisites(deptCode, courseNum) {
    if (courseNum <= 5) return []; // Introductory courses have no prerequisites
    
    const prereqCount = this.getRandomInt(0, 2);
    const prereqs = [];
    
    for (let i = 0; i < prereqCount; i++) {
      const prereqNum = this.getRandomInt(100, 100 + courseNum - 1);
      prereqs.push(`${deptCode}${prereqNum}`);
    }
    
    return prereqs;
  }

  generateEquipment() {
    const equipmentCount = this.getRandomInt(1, 4);
    const equipment = [];
    
    for (let i = 0; i < equipmentCount; i++) {
      const item = this.getRandomElement(this.equipmentTypes);
      if (!equipment.includes(item)) {
        equipment.push(item);
      }
    }
    
    return equipment;
  }

  generateSpecializations(department) {
    const specializations = {
      'Computer Science': ['Algorithms', 'Data Structures', 'AI/ML', 'Web Development', 'Database Systems'],
      'Mathematics': ['Pure Mathematics', 'Applied Mathematics', 'Statistics', 'Mathematical Modeling'],
      'Physics': ['Theoretical Physics', 'Experimental Physics', 'Quantum Mechanics', 'Astrophysics'],
      'Chemistry': ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Analytical Chemistry'],
      'Biology': ['Molecular Biology', 'Cell Biology', 'Genetics', 'Ecology', 'Microbiology'],
      'English': ['Literature', 'Linguistics', 'Creative Writing', 'Rhetoric'],
      'History': ['Ancient History', 'Modern History', 'Political History', 'Cultural Studies']
    };

    const available = specializations[department] || ['General'];
    const count = this.getRandomInt(1, 3);
    const selected = [];
    
    for (let i = 0; i < count; i++) {
      const spec = this.getRandomElement(available);
      if (!selected.includes(spec)) {
        selected.push(spec);
      }
    }
    
    return selected;
  }

  generateTeacherPreferences() {
    const workingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const preferredDays = [];
    const preferredTimes = [];
    
    // Randomly select 2-4 preferred days
    const dayCount = this.getRandomInt(2, 4);
    while (preferredDays.length < dayCount) {
      const day = this.getRandomElement(workingDays);
      if (!preferredDays.includes(day)) {
        preferredDays.push(day);
      }
    }
    
    // Generate preferred time slots
    const timeSlots = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
    const timeCount = this.getRandomInt(2, 4);
    
    while (preferredTimes.length < timeCount) {
      const time = this.getRandomElement(timeSlots);
      if (!preferredTimes.includes(time)) {
        preferredTimes.push(time);
      }
    }
    
    return {
      preferredDays,
      preferredTimes,
      avoidLunchTime: this.getRandomElement([true, false]),
      maxConsecutiveHours: this.getRandomInt(3, 6)
    };
  }

  generateAvailability() {
    const availability = {};
    const workingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    
    workingDays.forEach(day => {
      availability[day] = {
        available: this.getRandomElement([true, false]) || Math.random() > 0.1, // 90% chance available
        startTime: this.getRandomElement(['08:00', '09:00']),
        endTime: this.getRandomElement(['17:00', '18:00'])
      };
    });
    
    return availability;
  }

  generateRoomEquipment() {
    const equipmentCount = this.getRandomInt(2, 5);
    const equipment = [];
    
    for (let i = 0; i < equipmentCount; i++) {
      const item = this.getRandomElement(this.equipmentTypes);
      if (!equipment.includes(item)) {
        equipment.push(item);
      }
    }
    
    return equipment;
  }

  generateRoomAvailability() {
    const availability = {};
    const workingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    
    workingDays.forEach(day => {
      availability[day] = {
        available: true,
        startTime: '08:00',
        endTime: '18:00',
        maintenance: this.getRandomElement([true, false]) && Math.random() < 0.1 // 10% chance
      };
    });
    
    return availability;
  }

  async saveAsCSV(data, filePath) {
    if (data.length === 0) return;
    
    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Convert data to CSV format
    const csvLines = [headers.join(',')];
    
    data.forEach(item => {
      const values = headers.map(header => {
        let value = item[header];
        
        // Handle arrays and objects
        if (Array.isArray(value)) {
          value = value.join(';');
        } else if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value);
        }
        
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        
        return value || '';
      });
      
      csvLines.push(values.join(','));
    });
    
    await fs.writeFile(filePath, csvLines.join('\n'));
  }

  /**
   * Generate conflict scenarios for testing
   */
  generateConflictScenario() {
    // Generate a dataset with intentional conflicts for testing
    const teachers = this.generateTeachers(5);
    const rooms = this.generateRooms(5);
    const courses = this.generateCourses(10);
    
    // Create a schedule with conflicts
    const conflictSchedule = [
      {
        day: 'monday',
        timeSlot: { startTime: '09:00', endTime: '10:00' },
        course: courses[0].courseCode,
        instructor: teachers[0].teacherId,
        room: rooms[0].roomNumber,
        // This will conflict with the next entry (same teacher, same time)
      },
      {
        day: 'monday',
        timeSlot: { startTime: '09:00', endTime: '10:00' },
        course: courses[1].courseCode,
        instructor: teachers[0].teacherId, // Same teacher as above
        room: rooms[1].roomNumber,
        // Teacher conflict
      },
      {
        day: 'tuesday',
        timeSlot: { startTime: '14:00', endTime: '15:00' },
        course: courses[2].courseCode,
        instructor: teachers[1].teacherId,
        room: rooms[0].roomNumber,
      },
      {
        day: 'tuesday',
        timeSlot: { startTime: '14:00', endTime: '15:00' },
        course: courses[3].courseCode,
        instructor: teachers[2].teacherId,
        room: rooms[0].roomNumber, // Same room as above
        // Room conflict
      }
    ];
    
    return {
      courses,
      teachers,
      rooms,
      conflictSchedule,
      expectedConflicts: [
        'teacher_conflict: Same teacher scheduled in multiple locations',
        'room_conflict: Same room double-booked'
      ]
    };
  }
}

module.exports = SampleDataGenerator;
