const Course = require('../../models/Course');
const Teacher = require('../../models/Teacher');
const Room = require('../../models/Room');
const Timetable = require('../../models/Timetable');
const User = require('../../models/User');
const Department = require('../../models/Department');

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
      semester = null, // Can be 1, 2, 3, 4, 5, 6, 7, 8 or null for all
      academicYear = new Date().getFullYear(),
      targetSemester = semester, // For backward compatibility
      departmentId = null, // New: Filter by department ObjectId
      departmentCode = null // New: Filter by department code (IT, CS, FE)
    } = options;

    try {
      console.log('🚀 Starting timetable generation...');
      
      // Resolve department if code is provided
      let resolvedDepartmentId = departmentId;
      if (departmentCode && !departmentId) {
        const department = await Department.getByCode(departmentCode);
        if (department) {
          resolvedDepartmentId = department._id;
          console.log(`📌 Department resolved: ${departmentCode} -> ${department.name}`);
        } else {
          throw new Error(`Department with code ${departmentCode} not found`);
        }
      }
      
      // Fetch all required data
      let courses = await this.fetchCourses(resolvedDepartmentId);
      const teachers = await this.fetchTeachers(resolvedDepartmentId);
      const rooms = await this.fetchRooms(resolvedDepartmentId);

      // Filter courses by semester if specified
      if (semester || targetSemester) {
        const targetSem = semester || targetSemester;
        courses = courses.filter(course => course.semester === targetSem);
        console.log(`📚 Filtered to semester ${targetSem}: ${courses.length} courses`);
      }

      console.log(`📊 Data loaded: ${courses.length} courses, ${teachers.length} teachers, ${rooms.length} rooms`);
      if (resolvedDepartmentId) {
        console.log(`🏛️  Department filter applied`);
      }

      // Initialize empty timetable
      let timetable = this.initializeEmptyTimetable();
      this.conflicts = [];

      // Generate timetable based on algorithm
      switch (algorithm) {
        case 'greedy':
          timetable = await this.greedyAlgorithmImproved(courses, teachers, rooms, timetable);
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
          semester: semester || targetSemester || 'all',
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

  async greedyAlgorithmImproved(courses, teachers, rooms, timetable) {
    console.log('🧠 Running Improved Greedy Algorithm with Even Distribution...');
    
    // Sort courses by priority (credit hours, enrollment, etc.)
    const sortedCourses = courses.sort((a, b) => {
      const priorityA = (a.credits || 3) * (a.maxStudents || 30);
      const priorityB = (b.credits || 3) * (b.maxStudents || 30);
      return priorityB - priorityA;
    });

    // Track sessions per day to ensure even distribution
    const sessionsPerDay = {};
    this.workingDays.forEach(day => {
      sessionsPerDay[day] = 0;
    });

    for (const course of sortedCourses) {
      console.log(`🔄 Processing course: ${course.courseCode} (${course.hoursPerWeek || course.credits || 3} sessions needed)`);
      const sessionsNeeded = course.hoursPerWeek || course.credits || 3;
      let sessionsScheduled = 0;

      for (let session = 0; session < sessionsNeeded; session++) {
        let scheduled = false;

        // Try to schedule on the day with fewest sessions first (load balancing)
        const daysByLoad = this.workingDays.sort((a, b) => sessionsPerDay[a] - sessionsPerDay[b]);
        
        for (const day of daysByLoad) {
          // Skip this day if it's too overloaded compared to others
          const avgSessionsPerDay = Object.values(sessionsPerDay).reduce((a, b) => a + b, 0) / this.workingDays.length;
          if (sessionsPerDay[day] > avgSessionsPerDay + 2) {
            continue;
          }

          for (const timeSlot of this.timeSlots) {
            // Find available teacher for this course
            const availableTeacher = teachers.find(teacher => 
              this.isTeacherAvailable(teacher, day, timeSlot, timetable) &&
              this.canTeachCourse(teacher, course)
            );

            // Find available room suitable for this course
            const availableRoom = rooms.find(room =>
              this.isRoomAvailable(room, day, timeSlot, timetable) &&
              this.isRoomSuitable(room, course)
            );

            if (availableTeacher && availableRoom) {
              // Schedule the session
              const session = {
                id: `${course.courseCode}-${day}-${timeSlot.id}-${sessionsScheduled + 1}`,
                courseCode: course.courseCode,
                courseName: course.courseName,
                teacherId: availableTeacher._id || availableTeacher.teacherId,
                teacherName: availableTeacher.name,
                roomId: availableRoom._id || availableRoom.roomNumber,
                roomNumber: availableRoom.roomNumber,
                day,
                timeSlot: {
                  id: timeSlot.id,
                  startTime: timeSlot.startTime,
                  endTime: timeSlot.endTime,
                  label: timeSlot.label
                },
                startTime: timeSlot.startTime,
                endTime: timeSlot.endTime,
                semester: course.semester,
                department: course.department,
                courseType: course.courseType,
                credits: course.credits,
                maxStudents: course.maxStudents || 30,
                course: {
                  code: course.courseCode,
                  name: course.courseName,
                  department: course.department,
                  credits: course.credits,
                  duration: course.hoursPerWeek
                },
                teacher: {
                  name: availableTeacher.name,
                  id: availableTeacher._id || availableTeacher.teacherId
                },
                room: {
                  number: availableRoom.roomNumber,
                  capacity: availableRoom.capacity,
                  type: availableRoom.type,
                  id: availableRoom._id || availableRoom.roomNumber
                }
              };

              timetable.push(session);
              sessionsPerDay[day]++;
              sessionsScheduled++;
              
              console.log(`✅ Scheduled: ${session.courseCode} - ${session.day} ${session.timeSlot.label} (Day load: ${sessionsPerDay[day]})`);
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

    // Log final distribution
    console.log('\n📊 Final Session Distribution:');
    this.workingDays.forEach(day => {
      console.log(`   ${day.charAt(0).toUpperCase() + day.slice(1)}: ${sessionsPerDay[day]} sessions`);
    });

    console.log(`\n📊 Improved Greedy Algorithm completed: ${timetable.length} total sessions scheduled`);
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
    // Check if teacher can teach this course based on department
    if (!teacher.primaryDepartment && !teacher.departmentLegacy && !course.department) {
      return true;
    }
    
    // Handle new department structure (ObjectId)
    if (teacher.primaryDepartment && course.department) {
      const teacherPrimaryDept = teacher.primaryDepartment.toString();
      const courseDept = course.department.toString();
      
      // Primary department match
      if (teacherPrimaryDept === courseDept) {
        return true;
      }
      
      // Check allowed departments for cross-teaching
      if (teacher.allowedDepartments && teacher.allowedDepartments.length > 0) {
        const isAllowed = teacher.allowedDepartments.some(
          dept => dept.toString() === courseDept
        );
        if (isAllowed) {
          return true;
        }
      }
    }
    
    // Legacy support: Handle old string-based department matching
    if (teacher.departmentLegacy && course.departmentLegacy) {
      // Primary match: same department
      if (teacher.departmentLegacy === course.departmentLegacy) return true;
      
      // Secondary match: First Year teachers can teach basic courses to other departments
      if (teacher.departmentLegacy === 'First Year' && course.semester <= 2) return true;
      
      // Tertiary match: CS teachers can teach some IT courses and vice versa
      if ((teacher.departmentLegacy === 'Computer Science' && course.departmentLegacy === 'Information Technology') ||
          (teacher.departmentLegacy === 'Information Technology' && course.departmentLegacy === 'Computer Science')) {
        return true;
      }
    }
    
    return false;
  }

  isRoomSuitable(room, course) {
    // Check room capacity (assume 30 students per course if not specified)
    if (room.capacity < (course.maxStudents || 30)) return false;
    
    // Check room type for practical courses
    if (course.courseType === 'Practical') {
      // Practical courses need laboratories
      return room.type === 'laboratory';
    }
    
    // Theory courses can use classrooms, lecture halls, or seminar rooms
    if (course.courseType === 'Theory') {
      return ['classroom', 'lecture_hall', 'seminar_room'].includes(room.type);
    }
    
    // Tutorial courses prefer smaller rooms
    if (course.courseType === 'Tutorial') {
      return ['classroom', 'seminar_room'].includes(room.type) && room.capacity <= 40;
    }
    
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

  async fetchCourses(departmentId = null) {
    try {
      const filter = {};
      if (departmentId) {
        filter.department = departmentId;
      }

      const courses = await Course.find(filter)
        .populate('department', 'code name')
        .select('courseCode courseName department departmentLegacy semester courseType credits hoursPerWeek syllabus');

      return courses.map(course => ({
        courseCode: course.courseCode,
        courseName: course.courseName,
        department: course.department?._id || course.department,
        departmentCode: course.department?.code,
        departmentName: course.department?.name,
        departmentLegacy: course.departmentLegacy, // For backward compatibility
        semester: course.semester,
        courseType: course.courseType,
        credits: course.credits,
        hoursPerWeek: course.hoursPerWeek,
        maxStudents: 30, // Default class size
        topics: course.syllabus?.topics || []
      }));
    } catch (error) {
      console.error('Error fetching courses from database:', error);
      // Return empty array if database fetch fails
      return [];
    }
  }

  async fetchTeachers(departmentId = null) {
    try {
      const filter = {};
      if (departmentId) {
        // Find teachers whose primary department OR allowed departments include the specified department
        filter.$or = [
          { primaryDepartment: departmentId },
          { allowedDepartments: departmentId }
        ];
      }

      const teachers = await Teacher.find(filter)
        .populate('user', 'name email')
        .populate('primaryDepartment', 'code name')
        .populate('allowedDepartments', 'code name')
        .select('employeeId name primaryDepartment allowedDepartments department designation qualifications workload');

      return teachers.map(teacher => ({
        teacherId: teacher.employeeId,
        _id: teacher._id,
        name: teacher.name || teacher.user?.name,
        primaryDepartment: teacher.primaryDepartment?._id,
        primaryDepartmentCode: teacher.primaryDepartment?.code,
        allowedDepartments: teacher.allowedDepartments?.map(d => d._id) || [],
        departmentLegacy: teacher.department, // Legacy string field for backward compatibility
        specialization: teacher.qualifications?.join(';') || teacher.primaryDepartment?.name?.toLowerCase(),
        maxHours: teacher.workload?.maxHoursPerWeek || 18
      }));
    } catch (error) {
      console.error('Error fetching teachers:', error);
      // Return empty array if database fetch fails
      return [];
    }
  }

  async fetchRooms(departmentId = null) {
    try {
      const filter = {};
      if (departmentId) {
        filter.department = departmentId;
      }

      const rooms = await Room.find(filter)
        .populate('department', 'code name')
        .select('roomNumber floor capacity type department availabilityNotes');

      return rooms.map(room => ({
        roomNumber: room.roomNumber,
        _id: room._id,
        capacity: room.capacity,
        type: room.type,
        floor: room.floor,
        department: room.department?._id,
        departmentCode: room.department?.code,
        isLab: room.type === 'laboratory',
        availabilityNotes: room.availabilityNotes
      }));
    } catch (error) {
      console.error('Error fetching rooms from database:', error);
      // Return empty array if database fetch fails
      return [];
    }
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
