const { Course, Teacher, Room, Timetable } = require('../models');

class TimetableGenerator {
  constructor() {
    this.timeSlots = [
      { id: 1, startTime: '08:00', endTime: '09:00', label: '8:00 AM - 9:00 AM' },
      { id: 2, startTime: '09:00', endTime: '10:00', label: '9:00 AM - 10:00 AM' },
      { id: 3, startTime: '10:00', endTime: '11:00', label: '10:00 AM - 11:00 AM' },
      { id: 4, startTime: '11:00', endTime: '12:00', label: '11:00 AM - 12:00 PM' },
      { id: 5, startTime: '12:00', endTime: '13:00', label: '12:00 PM - 1:00 PM' },
      { id: 6, startTime: '13:00', endTime: '14:00', label: '1:00 PM - 2:00 PM' },
      { id: 7, startTime: '14:00', endTime: '15:00', label: '2:00 PM - 3:00 PM' },
      { id: 8, startTime: '15:00', endTime: '16:00', label: '3:00 PM - 4:00 PM' },
      { id: 9, startTime: '16:00', endTime: '17:00', label: '4:00 PM - 5:00 PM' },
      { id: 10, startTime: '17:00', endTime: '18:00', label: '5:00 PM - 6:00 PM' }
    ];
    
    this.workingDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    this.conflicts = [];
  }

  async generateTimetable(options = {}) {
    const {
      algorithm = 'greedy',
      maxIterations = 1000,
      semester = 'fall',
      academicYear = new Date().getFullYear()
    } = options;

    try {
      console.log('🚀 Starting timetable generation...');
      
      // Fetch all required data
      const courses = await this.fetchCourses();
      const teachers = await this.fetchTeachers();
      const rooms = await this.fetchRooms();

      console.log(`📊 Data loaded: ${courses.length} courses, ${teachers.length} teachers, ${rooms.length} rooms`);

      // Initialize empty timetable
      let timetable = this.initializeEmptyTimetable();
      this.conflicts = [];

      // Generate timetable based on algorithm
      switch (algorithm) {
        case 'greedy':
          timetable = await this.greedyAlgorithm(courses, teachers, rooms, timetable);
          break;
        case 'genetic':
          timetable = await this.geneticAlgorithm(courses, teachers, rooms, timetable);
          break;
        case 'constraint':
          timetable = await this.constraintSatisfaction(courses, teachers, rooms, timetable);
          break;
        default:
          throw new Error(`Unknown algorithm: ${algorithm}`);
      }

      // Calculate quality metrics
      const metrics = this.calculateQualityMetrics(timetable, courses);

      console.log('✅ Timetable generation completed');
      console.log(`📈 Quality Score: ${metrics.qualityScore}/100`);
      console.log(`⚠️  Conflicts Found: ${this.conflicts.length}`);

      return {
        success: true,
        timetable,
        metrics,
        conflicts: this.conflicts,
        metadata: {
          algorithm,
          semester,
          academicYear,
          generatedAt: new Date().toISOString(),
          totalSessions: timetable.length
        }
      };

    } catch (error) {
      console.error('❌ Timetable generation failed:', error);
      throw error;
    }
  }

  async greedyAlgorithm(courses, teachers, rooms, timetable) {
    console.log('🧠 Running Greedy Algorithm...');
    
    // Sort courses by priority (credit hours, enrollment, etc.)
    const sortedCourses = courses.sort((a, b) => {
      const priorityA = (a.credits || 3) * (a.maxStudents || 30);
      const priorityB = (b.credits || 3) * (b.maxStudents || 30);
      return priorityB - priorityA;
    });

    for (const course of sortedCourses) {
      const sessionsNeeded = course.hoursPerWeek || course.credits || 3;
      let sessionsScheduled = 0;

      for (let session = 0; session < sessionsNeeded; session++) {
        let scheduled = false;

        // Try to find a suitable slot
        for (const day of this.workingDays) {
          for (const timeSlot of this.timeSlots) {
            // Find available teacher
            const availableTeacher = teachers.find(teacher => 
              this.isTeacherAvailable(teacher, day, timeSlot, timetable) &&
              this.canTeachCourse(teacher, course)
            );

            // Find available room
            const availableRoom = rooms.find(room =>
              this.isRoomAvailable(room, day, timeSlot, timetable) &&
              this.isRoomSuitable(room, course)
            );

            if (availableTeacher && availableRoom) {
              // Schedule the session
              const session = {
                id: `${course.courseCode}-${day}-${timeSlot.id}`,
                courseCode: course.courseCode,
                courseName: course.courseName,
                teacherId: availableTeacher._id || availableTeacher.teacherId,
                teacherName: availableTeacher.name,
                roomId: availableRoom._id || availableRoom.roomNumber,
                roomNumber: availableRoom.roomNumber,
                day,
                timeSlot,
                semester: course.semester,
                department: course.department,
                credits: course.credits,
                maxStudents: course.maxStudents,
                sessionType: course.sessionType || 'lecture'
              };

              timetable.push(session);
              sessionsScheduled++;
              scheduled = true;
              break;
            }
          }
          if (scheduled) break;
        }

        if (!scheduled) {
          this.conflicts.push({
            type: 'scheduling_failed',
            course: course.courseCode,
            message: `Failed to schedule session ${session + 1} for ${course.courseName}`
          });
        }
      }
    }

    return timetable;
  }

  async geneticAlgorithm(courses, teachers, rooms, timetable) {
    console.log('🧬 Running Genetic Algorithm...');
    // Placeholder for genetic algorithm implementation
    // For now, fallback to greedy
    return this.greedyAlgorithm(courses, teachers, rooms, timetable);
  }

  async constraintSatisfaction(courses, teachers, rooms, timetable) {
    console.log('🔍 Running Constraint Satisfaction...');
    // Placeholder for constraint satisfaction implementation
    // For now, fallback to greedy
    return this.greedyAlgorithm(courses, teachers, rooms, timetable);
  }

  initializeEmptyTimetable() {
    return [];
  }

  isTeacherAvailable(teacher, day, timeSlot, timetable) {
    return !timetable.some(session => 
      session.teacherId === (teacher._id || teacher.teacherId) &&
      session.day === day &&
      session.timeSlot.id === timeSlot.id
    );
  }

  isRoomAvailable(room, day, timeSlot, timetable) {
    return !timetable.some(session => 
      session.roomId === (room._id || room.roomNumber) &&
      session.day === day &&
      session.timeSlot.id === timeSlot.id
    );
  }

  canTeachCourse(teacher, course) {
    // Check if teacher can teach this course based on specialization
    if (!teacher.specialization && !teacher.department) return true;
    
    const teacherSpecs = (teacher.specialization || '').toLowerCase().split(';');
    const courseName = course.courseName.toLowerCase();
    const courseCode = course.courseCode.toLowerCase();
    
    return teacherSpecs.some(spec => 
      courseName.includes(spec.trim()) || 
      courseCode.includes(spec.trim())
    ) || teacher.department === course.department;
  }

  isRoomSuitable(room, course) {
    // Check room capacity
    if (room.capacity < (course.maxStudents || 30)) return false;
    
    // Check room type for labs
    if (course.sessionType === 'lab' && !room.isLab) return false;
    
    return true;
  }

  calculateQualityMetrics(timetable, courses) {
    const totalCoursesScheduled = [...new Set(timetable.map(s => s.courseCode))].length;
    const totalCourses = courses.length;
    const schedulingRate = (totalCoursesScheduled / totalCourses) * 100;
    
    const conflictPenalty = this.conflicts.length * 5;
    const qualityScore = Math.max(0, schedulingRate - conflictPenalty);
    
    return {
      qualityScore: Math.round(qualityScore),
      schedulingRate: Math.round(schedulingRate),
      totalSessions: timetable.length,
      totalConflicts: this.conflicts.length,
      coursesScheduled: totalCoursesScheduled,
      totalCourses
    };
  }

  async fetchCourses() {
    // Mock course data for now - in real implementation, fetch from database
    return [
      {
        courseCode: 'CS101',
        courseName: 'Introduction to Computer Science',
        credits: 3,
        department: 'Computer Science',
        semester: 'fall',
        maxStudents: 50,
        hoursPerWeek: 3,
        sessionType: 'lecture'
      },
      {
        courseCode: 'CS102',
        courseName: 'Programming Fundamentals',
        credits: 4,
        department: 'Computer Science',
        semester: 'fall',
        maxStudents: 40,
        hoursPerWeek: 4,
        sessionType: 'lecture'
      },
      {
        courseCode: 'CS201',
        courseName: 'Data Structures',
        credits: 3,
        department: 'Computer Science',
        semester: 'fall',
        maxStudents: 35,
        hoursPerWeek: 3,
        sessionType: 'lecture'
      },
      {
        courseCode: 'CS202',
        courseName: 'Database Lab',
        credits: 2,
        department: 'Computer Science',
        semester: 'fall',
        maxStudents: 20,
        hoursPerWeek: 2,
        sessionType: 'lab'
      },
      {
        courseCode: 'MATH101',
        courseName: 'Calculus I',
        credits: 4,
        department: 'Mathematics',
        semester: 'fall',
        maxStudents: 60,
        hoursPerWeek: 4,
        sessionType: 'lecture'
      }
    ];
  }

  async fetchTeachers() {
    // Mock teacher data for now
    return [
      {
        teacherId: 'T001',
        name: 'Dr. John Smith',
        department: 'Computer Science',
        specialization: 'algorithms;data structures;programming',
        maxHours: 20
      },
      {
        teacherId: 'T002',
        name: 'Dr. Jane Wilson',
        department: 'Computer Science',
        specialization: 'database;software engineering',
        maxHours: 18
      },
      {
        teacherId: 'T003',
        name: 'Dr. Robert Johnson',
        department: 'Mathematics',
        specialization: 'calculus;linear algebra',
        maxHours: 22
      },
      {
        teacherId: 'T004',
        name: 'Dr. Sarah Davis',
        department: 'Computer Science',
        specialization: 'computer science;programming',
        maxHours: 20
      }
    ];
  }

  async fetchRooms() {
    // Mock room data for now
    return [
      {
        roomNumber: 'CS101',
        building: 'Computer Science Building',
        capacity: 50,
        type: 'classroom',
        isLab: false,
        equipment: ['projector', 'whiteboard']
      },
      {
        roomNumber: 'CS102',
        building: 'Computer Science Building',
        capacity: 40,
        type: 'classroom',
        isLab: false,
        equipment: ['projector', 'whiteboard']
      },
      {
        roomNumber: 'CS-LAB1',
        building: 'Computer Science Building',
        capacity: 25,
        type: 'lab',
        isLab: true,
        equipment: ['computers', 'projector']
      },
      {
        roomNumber: 'MATH201',
        building: 'Mathematics Building',
        capacity: 60,
        type: 'classroom',
        isLab: false,
        equipment: ['projector', 'whiteboard', 'smart_board']
      }
    ];
  }

  // Validation and conflict detection methods
  validateTimetable(timetable) {
    const conflicts = [];
    
    // Check for teacher conflicts
    const teacherSchedule = {};
    timetable.forEach(session => {
      const key = `${session.teacherId}-${session.day}-${session.timeSlot.id}`;
      if (teacherSchedule[key]) {
        conflicts.push({
          type: 'teacher_conflict',
          teacher: session.teacherName,
          sessions: [teacherSchedule[key], session]
        });
      }
      teacherSchedule[key] = session;
    });

    // Check for room conflicts
    const roomSchedule = {};
    timetable.forEach(session => {
      const key = `${session.roomId}-${session.day}-${session.timeSlot.id}`;
      if (roomSchedule[key]) {
        conflicts.push({
          type: 'room_conflict',
          room: session.roomNumber,
          sessions: [roomSchedule[key], session]
        });
      }
      roomSchedule[key] = session;
    });

    return conflicts;
  }
}

module.exports = TimetableGenerator;
