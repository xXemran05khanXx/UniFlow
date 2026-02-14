const Course = require('../../models/Course');
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

    // Prevent double-booking by tracking slots
    const roomScheduleMap = new Map();
    const teacherScheduleMap = new Map();

    for (const course of sortedCourses) {
      console.log(`🔄 Processing course: ${course.courseCode} (${course.hoursPerWeek || course.credits || 3} sessions needed)`);
      const sessionsNeeded = course.hoursPerWeek || course.credits || 3;
      let sessionsScheduled = 0;

      for (let sessionIndex = 0; sessionIndex < sessionsNeeded; sessionIndex++) {
        let scheduled = false;

        // Try to schedule on the day with fewest sessions first (load balancing)
        const daysByLoad = [...this.workingDays].sort((a, b) => sessionsPerDay[a] - sessionsPerDay[b]);

        for (const day of daysByLoad) {
          // Skip this day if it's too overloaded compared to others
          const avgSessionsPerDay = Object.values(sessionsPerDay).reduce((a, b) => a + b, 0) / this.workingDays.length;
          if (sessionsPerDay[day] > avgSessionsPerDay + 2) {
            continue;
          }

          for (const timeSlot of this.timeSlots) {
            const dayName = this.toDayName(day);

            const teacher = teachers.find(candidate =>
              this.canTeachCourse(candidate, course) &&
              this.isTeacherSlotFree(candidate, dayName, timeSlot.id, teacherScheduleMap)
            );

            const room = rooms.find(candidate =>
              this.isRoomSuitable(candidate, course) &&
              this.isRoomSlotFree(candidate, dayName, timeSlot.id, roomScheduleMap)
            );

            if (!teacher || !room) {
              continue;
            }

            // Reserve the slot before pushing to avoid duplicates
            this.reserveTeacherSlot(teacher, dayName, timeSlot.id, teacherScheduleMap);
            this.reserveRoomSlot(room, dayName, timeSlot.id, roomScheduleMap);

            const session = this.buildScheduleEntry({
              course,
              teacher,
              room,
              dayOfWeek: dayName,
              timeSlot,
              sessionNumber: sessionsScheduled + 1
            });

            timetable.push(session);
            sessionsPerDay[day]++;
            sessionsScheduled++;

            console.log(`✅ Scheduled: ${session.courseCode} - ${session.dayOfWeek} ${session.timeSlot.label} (Day load: ${sessionsPerDay[day]})`);
            scheduled = true;
            break;
          }
          if (scheduled) break;
        }

        if (!scheduled) {
          this.conflicts.push({
            type: 'scheduling_failed',
            course: course.courseCode,
            reason: 'room_or_teacher_not_found',
            message: `Failed to schedule session ${sessionIndex + 1} for ${course.courseName}`
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

  toDayName(day) {
    if (!day) return 'Monday';
    const lower = day.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  isTeacherSlotFree(teacher, day, slotId, teacherScheduleMap) {
    const key = `${teacher._id || teacher.teacherId}_${day}_${slotId}`;
    return !teacherScheduleMap.has(key);
  }

  reserveTeacherSlot(teacher, day, slotId, teacherScheduleMap) {
    const key = `${teacher._id || teacher.teacherId}_${day}_${slotId}`;
    teacherScheduleMap.set(key, true);
  }

  isRoomSlotFree(room, day, slotId, roomScheduleMap) {
    const key = `${room._id || room.roomNumber}_${day}_${slotId}`;
    return !roomScheduleMap.has(key);
  }

  reserveRoomSlot(room, day, slotId, roomScheduleMap) {
    const key = `${room._id || room.roomNumber}_${day}_${slotId}`;
    roomScheduleMap.set(key, true);
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

    // Lab / practical subjects must use laboratories
    if (course.courseType === 'Practical' || course.courseType === 'Lab') {
      return room.type === 'laboratory';
    }

    // Theory subjects can use lecture-friendly rooms
    if (course.courseType === 'Theory') {
      return ['classroom', 'lecture_hall', 'seminar_room'].includes(room.type);
    }

    // Tutorials prefer smaller rooms
    if (course.courseType === 'Tutorial') {
      return ['classroom', 'seminar_room'].includes(room.type) && room.capacity <= 40;
    }

    return true;
  }

  buildScheduleEntry({ course, teacher, room, dayOfWeek, timeSlot, sessionNumber }) {
    return {
      id: `${course.courseCode}-${dayOfWeek}-${timeSlot.id}-${sessionNumber}`,
      course: course._id, // kept for schema compatibility
      subject: course._id, // alias to satisfy subject-based consumers
      courseCode: course.courseCode,
      courseName: course.courseName,
      teacher: teacher._id,
      teacherId: teacher._id || teacher.teacherId,
      teacherName: teacher.name,
      room: room._id,
      roomId: room._id,
      roomNumber: room.roomNumber,
      dayOfWeek,
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
      courseMeta: {
        code: course.courseCode,
        name: course.courseName,
        department: course.department,
        credits: course.credits,
        duration: course.hoursPerWeek
      }
    };
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
        .select('_id courseCode courseName department departmentLegacy semester courseType credits hoursPerWeek syllabus');

      return courses.map(course => ({
        _id: course._id,
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
      const filter = { role: 'teacher' };
      if (departmentId) {
        // Find teachers whose department OR allowed departments include the specified department
        filter.$or = [
          { department: departmentId },
          { allowedDepartments: departmentId }
        ];
      }

      const teachers = await User.find(filter)
        .populate('department', 'code name')
        .populate('allowedDepartments', 'code name')
        .select('employeeId name department allowedDepartments designation qualifications workload');

      return teachers.map(teacher => ({
        teacherId: teacher.employeeId,
        _id: teacher._id,
        name: teacher.name,
        primaryDepartment: teacher.department?._id,
        primaryDepartmentCode: teacher.department?.code,
        allowedDepartments: teacher.allowedDepartments?.map(d => d._id) || [],
        specialization: teacher.qualifications?.join(';') || teacher.department?.name?.toLowerCase(),
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
      const filter = { isActive: true };
      if (departmentId) {
        filter.department = departmentId;
      }

      const rooms = await Room.find(filter)
        .populate('department', 'code name')
        .select('_id roomNumber floor capacity type department availabilityNotes');

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
