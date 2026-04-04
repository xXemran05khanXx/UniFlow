const ClashDetector = require('./clashDetector');

class SchedulingAlgorithm {
  constructor(options = {}) {
    this.clashDetector = new ClashDetector();
    this.options = {
      algorithm: options.algorithm || 'greedy',
      maxIterations: options.maxIterations || 1000,
      populationSize: options.populationSize || 50,
      mutationRate: options.mutationRate || 0.1,
      timeSlotDuration: options.timeSlotDuration || 60,
      workingDays: options.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      workingHours: options.workingHours || { start: '08:00', end: '18:00' },
      breakDuration: options.breakDuration || 0,  // 0 = no gap, slots align exactly on the hour
      ...options
    };

    this.constraints = {
      hard: [
        'no_teacher_conflict',
        'no_room_conflict',
        'no_student_conflict',
        'valid_time_slots'
      ],
      soft: [
        'teacher_preferences',
        'room_preferences',
        'optimal_gaps',
        'lunch_break',
        'consecutive_classes'
      ]
    };
  }

  async generateTimetable(input) {
    try {
      console.log(`Starting timetable generation using ${this.options.algorithm} algorithm...`);

      const validation = this.validateInput(input);
      if (!validation.isValid) {
        throw new Error(`Input validation failed: ${validation.errors.join(', ')}`);
      }

      const prepared = this.prepareData(input);
      const timeSlots = this.generateTimeSlots();

      let result;
      switch (this.options.algorithm) {
        case 'greedy':
          result = await this.greedyAlgorithm(prepared, timeSlots);
          break;
        case 'genetic':
          result = await this.geneticAlgorithm(prepared, timeSlots);
          break;
        case 'constraint_satisfaction':
          result = await this.constraintSatisfactionAlgorithm(prepared, timeSlots);
          break;
        default:
          throw new Error(`Unknown algorithm: ${this.options.algorithm}`);
      }

      const conflicts = this.clashDetector.detectClashes(result.schedule);
      const statistics = this.calculateStatistics(result.schedule, prepared);

      return {
        success: true,
        algorithm: this.options.algorithm,
        executionTime: result.executionTime,
        iterations: result.iterations,
        schedule: result.schedule,
        conflicts: conflicts,
        statistics: statistics,
        metadata: {
          totalCourses: prepared.courses.length,
          totalTeachers: prepared.teachers.length,
          totalRooms: prepared.rooms.length,
          totalTimeSlots: timeSlots.length,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        algorithm: this.options.algorithm,
        generatedAt: new Date().toISOString()
      };
    }
  }

  async greedyAlgorithm(prepared, timeSlots) {
    const startTime = Date.now();
    const schedule = [];
    let iterations = 0;

    const sortedCourses = this.prioritizeCourses(prepared.courses);

    for (const course of sortedCourses) {
      iterations++;

      let assigned = false;
      const attempts = [];

      for (let session = 0; session < course.sessionsPerWeek; session++) {
        let bestSlot = null;
        let bestScore = -1;

        for (const timeSlot of timeSlots) {
          for (const room of prepared.rooms) {
            for (const teacher of prepared.teachers) {
              if (!this.isValidAssignment(course, teacher, room, timeSlot, schedule)) {
                continue;
              }

              const score = this.calculateAssignmentScore(course, teacher, room, timeSlot, schedule, prepared);

              if (score > bestScore) {
                bestScore = score;
                bestSlot = { course, teacher, room, timeSlot, score };
              }
            }
          }
        }

        if (bestSlot) {
          const scheduleEntry = this.createScheduleEntry(bestSlot);
          schedule.push(scheduleEntry);
          assigned = true;
          this.markSlotAsUsed(bestSlot, timeSlots);
        } else {
          attempts.push({
            course: course.courseCode,
            session: session + 1,
            reason: 'No valid slot found'
          });
        }
      }

      if (!assigned) {
        console.warn(`Could not assign course: ${course.courseCode}`);
      }
    }

    return {
      schedule,
      executionTime: Date.now() - startTime,
      iterations,
      unassigned: prepared.courses.filter(course =>
        !schedule.some(entry => entry.courseCode === course.courseCode)
      )
    };
  }

  async geneticAlgorithm(prepared, timeSlots) {
    const startTime = Date.now();

    // FIX 1: Pass populationSize correctly as first arg
    let population = this.initializePopulation(this.options.populationSize, prepared, timeSlots);

    // FIX 2: Guard against empty population (e.g. no qualifiedFaculties)
    if (!population || population.length === 0) {
      console.warn('⚠️  initializePopulation returned empty — falling back to greedy');
      return this.greedyAlgorithm(prepared, timeSlots);
    }

    let bestSolution = null;
    let bestFitness = -Infinity;

    for (let generation = 0; generation < this.options.maxIterations; generation++) {
      const fitnessScores = population.map(individual =>
        this.calculateFitness(individual, prepared)
      );

      const maxFitnessIndex = fitnessScores.indexOf(Math.max(...fitnessScores));
      if (fitnessScores[maxFitnessIndex] > bestFitness) {
        bestFitness = fitnessScores[maxFitnessIndex];
        bestSolution = [...population[maxFitnessIndex]];
      }

      const newPopulation = [];

      const eliteCount = Math.floor(this.options.populationSize * 0.1);
      const eliteIndices = fitnessScores
        .map((fitness, index) => ({ fitness, index }))
        .sort((a, b) => b.fitness - a.fitness)
        .slice(0, eliteCount)
        .map(item => item.index);

      eliteIndices.forEach(index => {
        newPopulation.push([...population[index]]);
      });

      while (newPopulation.length < this.options.populationSize) {
        const parent1 = this.selectParent(population, fitnessScores);
        const parent2 = this.selectParent(population, fitnessScores);

        let offspring = this.crossover(parent1, parent2);
        // FIX 3: mutate now returns the individual
        offspring = this.mutate(offspring, prepared, timeSlots);

        newPopulation.push(offspring);
      }

      population = newPopulation;

      if (bestFitness >= 100) {
        break;
      }
    }

    // FIX 4: Fall back to greedy if genetic produced no solution
    if (!bestSolution || bestSolution.length === 0) {
      console.warn('⚠️  Genetic algorithm produced no valid schedule — falling back to greedy');
      return this.greedyAlgorithm(prepared, timeSlots);
    }

    return {
      schedule: bestSolution,
      executionTime: Date.now() - startTime,
      iterations: this.options.maxIterations,
      fitness: bestFitness
    };
  }

  async constraintSatisfactionAlgorithm(prepared, timeSlots) {
    const startTime = Date.now();
    const schedule = [];
    const domains = this.initializeDomains(prepared, timeSlots);
    let iterations = 0;

    const result = this.backtrackSearch(schedule, domains, prepared, timeSlots, iterations);

    return {
      schedule: result.schedule,
      executionTime: Date.now() - startTime,
      iterations: result.iterations,
      success: result.success
    };
  }

  validateInput(input) {
    const errors = [];

    if (!input.courses || !Array.isArray(input.courses) || input.courses.length === 0) {
      errors.push('Courses array is required and must not be empty');
    }

    if (!input.teachers || !Array.isArray(input.teachers) || input.teachers.length === 0) {
      errors.push('Teachers array is required and must not be empty');
    }

    if (!input.rooms || !Array.isArray(input.rooms) || input.rooms.length === 0) {
      errors.push('Rooms array is required and must not be empty');
    }

    // FIX 5: Relax course validation — department is optional when sessions are pre-split
    input.courses?.forEach((course, index) => {
      if (!course.courseCode) errors.push(`Course ${index}: courseCode is required`);
      if (!course.credits || course.credits <= 0) errors.push(`Course ${index}: valid credits required`);
      // department is NOT required for pre-split sessions
    });

    input.teachers?.forEach((teacher, index) => {
      if (!teacher.teacherId) errors.push(`Teacher ${index}: teacherId is required`);
      if (!teacher.name) errors.push(`Teacher ${index}: name is required`);
      // department is optional
    });

    input.rooms?.forEach((room, index) => {
      if (!room.roomNumber) errors.push(`Room ${index}: roomNumber is required`);
      if (!room.capacity || room.capacity <= 0) errors.push(`Room ${index}: valid capacity required`);
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  prepareData(input) {
    const courses = input.courses.map(course => ({
      ...course,
      sessionsPerWeek: course.sessionsPerWeek || Math.ceil(course.credits || 3),
      duration: course.duration || this.options.timeSlotDuration,
      priority: this.calculateCoursePriority(course),
      constraints: course.constraints || {}
    }));

    const teachers = input.teachers.map(teacher => ({
      ...teacher,
      maxHours: teacher.maxHours || 20,
      preferences: teacher.preferences || {},
      availability: teacher.availability || this.getDefaultAvailability(),
      currentLoad: 0
    }));

    const rooms = input.rooms.map(room => ({
      ...room,
      availability: room.availability || this.getDefaultAvailability(),
      equipment: room.equipment || [],
      isLab: room.isLab || false
    }));

    return { courses, teachers, rooms };
  }

  generateTimeSlots() {
    // If caller passed exact periods (e.g. real college schedule), use them directly.
    if (this.options.customTimeSlots && this.options.customTimeSlots.length > 0) {
      const slots = [];
      for (const day of this.options.workingDays) {
        for (const ts of this.options.customTimeSlots) {
          slots.push({
            day,
            startTime: ts.startTime,
            endTime:   ts.endTime,
            duration:  this.timeToMinutes(ts.endTime) - this.timeToMinutes(ts.startTime),
            available: true
          });
        }
      }
      return slots;
    }

    // Default: auto-generate from workingHours + timeSlotDuration
    const slots = [];
    const startMinutes = this.timeToMinutes(this.options.workingHours.start);
    const endMinutes   = this.timeToMinutes(this.options.workingHours.end);
    const slotDuration  = this.options.timeSlotDuration;
    const breakDuration = this.options.breakDuration;

    for (const day of this.options.workingDays) {
      for (let time = startMinutes; time + slotDuration <= endMinutes; time += slotDuration + breakDuration) {
        slots.push({
          day,
          startTime: this.minutesToTime(time),
          endTime:   this.minutesToTime(time + slotDuration),
          duration:  slotDuration,
          available: true
        });
      }
    }

    return slots;
  }

  isValidAssignment(course, teacher, room, timeSlot, existingSchedule) {
    if (!this.isTeacherAvailable(teacher, timeSlot, existingSchedule)) return false;
    if (!this.isRoomAvailable(room, timeSlot, existingSchedule)) return false;
    if (room.capacity < (course.maxStudents || course.enrollment || 30)) return false;
    if (!this.isTeacherQualified(teacher, course)) return false;
    if (course.requiresLab && !room.isLab) return false;
    if (course.requiredEquipment && !this.hasRequiredEquipment(room, course.requiredEquipment)) return false;
    return true;
  }

  calculateAssignmentScore(course, teacher, room, timeSlot, schedule, prepared) {
    let score = 50;

    if (teacher.preferences?.departments?.includes(course.department)) score += 20;

    if (teacher.preferences?.timeSlots) {
      const prefSlot = teacher.preferences.timeSlots.find(pref =>
        pref.day === timeSlot.day && pref.startTime === timeSlot.startTime
      );
      if (prefSlot) score += 15;
    }

    const capacityUtilization = (course.maxStudents || 30) / room.capacity;
    if (capacityUtilization >= 0.7 && capacityUtilization <= 0.9) score += 10;

    if (course.requiredEquipment) {
      const equipmentMatch = course.requiredEquipment.filter(req =>
        room.equipment?.includes(req)
      ).length;
      score += equipmentMatch * 5;
    }

    const teacherConflicts = schedule.filter(entry =>
      entry.instructor?.toString() === teacher.teacherId?.toString() &&
      entry.day === timeSlot.day &&
      this.timeSlotsOverlap(entry.timeSlot, timeSlot)
    ).length;
    score -= teacherConflicts * 100;

    score += this.calculateConsecutiveBonus(teacher, timeSlot, schedule);
    if (this.isLunchTime(timeSlot)) score -= 10;

    return score;
  }

  timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  isTeacherAvailable(teacher, timeSlot, schedule) {
    return !schedule.some(entry =>
      entry.instructor?.toString() === teacher.teacherId?.toString() &&
      entry.day === timeSlot.day &&
      this.timeSlotsOverlap(entry.timeSlot, timeSlot)
    );
  }

  isRoomAvailable(room, timeSlot, schedule) {
    return !schedule.some(entry =>
      entry.room?.toString() === room.roomId?.toString() &&
      entry.day === timeSlot.day &&
      this.timeSlotsOverlap(entry.timeSlot, timeSlot)
    );
  }

  // FIX 6: isTeacherQualified — compare as strings, and fall back to true
  // if no qualifiedFaculties are defined (so unassigned courses can still be placed)
  isTeacherQualified(teacher, course) {
    if (!course.qualifiedFaculties || course.qualifiedFaculties.length === 0) {
      // No restriction — any teacher can teach this course
      return true;
    }
    return course.qualifiedFaculties.some(
      id => id?.toString() === teacher.teacherId?.toString()
    );
  }

  hasRequiredEquipment(room, requiredEquipment) {
    return requiredEquipment.every(req => room.equipment?.includes(req));
  }

  timeSlotsOverlap(slot1, slot2) {
    if (!slot1 || !slot2) return false;
    const start1 = this.timeToMinutes(slot1.startTime);
    const end1 = this.timeToMinutes(slot1.endTime);
    const start2 = this.timeToMinutes(slot2.startTime);
    const end2 = this.timeToMinutes(slot2.endTime);
    return start1 < end2 && start2 < end1;
  }

  calculateCoursePriority(course) {
    let priority = course.credits || 3;
    if (course.isRequired) priority += 5;
    priority += (course.enrollment || 30) / 10;
    return priority;
  }

  prioritizeCourses(courses) {
    return courses.sort((a, b) => b.priority - a.priority);
  }

  createScheduleEntry(assignment) {
    return {
      day: assignment.timeSlot.day,
      timeSlot: {
        startTime: assignment.timeSlot.startTime,
        endTime: assignment.timeSlot.endTime
      },
      course: assignment.course.courseId,
      courseCode: assignment.course.courseCode,
      courseTitle: assignment.course.courseName,
      instructor: assignment.teacher.teacherId,
      instructorName: assignment.teacher.name,
      room: assignment.room.roomId,
      roomNumber: assignment.room.roomNumber,
      building: assignment.room.building,
      sessionType: assignment.course.sessionType || 'lecture',
      credits: assignment.course.credits,
      duration: assignment.course.duration,
      maxEnrollment: assignment.course.maxStudents,
      currentEnrollment: assignment.course.enrollment || 0
    };
  }

  markSlotAsUsed(assignment, timeSlots) {
    // Conflicts are handled by validation functions
  }

  getDefaultAvailability() {
    const availability = {};
    this.options.workingDays.forEach(day => {
      availability[day] = {
        available: true,
        startTime: this.options.workingHours.start,
        endTime: this.options.workingHours.end
      };
    });
    return availability;
  }

  calculateConsecutiveBonus(teacher, timeSlot, schedule) {
    const sameDayClasses = schedule.filter(entry =>
      entry.instructor?.toString() === teacher.teacherId?.toString() &&
      entry.day === timeSlot.day
    );
    return sameDayClasses.length > 0 ? 5 : 0;
  }

  isLunchTime(timeSlot) {
    const startMinutes = this.timeToMinutes(timeSlot.startTime);
    return startMinutes >= this.timeToMinutes('12:00') && startMinutes < this.timeToMinutes('13:00');
  }

  calculateStatistics(schedule, prepared) {
    const stats = {
      totalSessions: schedule.length,
      totalCourses: new Set(schedule.map(s => s.courseCode)).size,
      totalTeachers: new Set(schedule.map(s => s.instructor)).size,
      totalRooms: new Set(schedule.map(s => s.room)).size,
      utilizationRate: { teachers: 0, rooms: 0, timeSlots: 0 },
      distribution: { byDay: {}, byTimeSlot: {}, byDepartment: {} }
    };

    stats.utilizationRate.teachers = (stats.totalTeachers / prepared.teachers.length * 100).toFixed(2);
    stats.utilizationRate.rooms = (stats.totalRooms / prepared.rooms.length * 100).toFixed(2);

    this.options.workingDays.forEach(day => {
      stats.distribution.byDay[day] = schedule.filter(s => s.day === day).length;
    });

    return stats;
  }

  // ==========================================
  // Genetic Algorithm Helper Methods
  // ==========================================

  // FIX 7: Correct signature — initializePopulation(populationSize, prepared, timeSlots)
  // FIX 8: Use isLab flag (not room.type) since prepareData maps room.isLab
  // FIX 9: Gracefully skip courses with no qualifiedFaculties rather than crashing
  initializePopulation(populationSize, prepared, timeSlots) {
    const population = [];

    for (let i = 0; i < populationSize; i++) {
      const individual = [];

      prepared.courses.forEach(course => {
        // qualifiedFaculties are plain string IDs (from TimetableGenerator).
        // Fall back to a random teacher if list is empty.
        let instructorId;
        if (course.qualifiedFaculties && course.qualifiedFaculties.length > 0) {
          const picked = course.qualifiedFaculties[
            Math.floor(Math.random() * course.qualifiedFaculties.length)
          ];
          // Handle both plain string and object shapes defensively
          instructorId = (typeof picked === 'string')
            ? picked
            : (picked?.teacherId ?? picked?._id)?.toString();
        } else {
          const picked = prepared.teachers[Math.floor(Math.random() * prepared.teachers.length)];
          instructorId = picked?.teacherId?.toString();
        }

        // Use isLab flag for room matching
        const isLab = course.requiresLab || false;
        const suitableRooms = prepared.rooms.filter(room => room.isLab === isLab);
        const finalRooms = suitableRooms.length > 0 ? suitableRooms : prepared.rooms;
        const selectedRoom = finalRooms[Math.floor(Math.random() * finalRooms.length)];
        const roomId = selectedRoom?.roomId?.toString();

        const selectedSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];

        individual.push({
          courseCode: course.courseCode,
          instructor: instructorId,   // always a plain string ID
          room: roomId,               // always a plain string ID
          day: selectedSlot.day,
          timeSlot: {
            startTime: selectedSlot.startTime,
            endTime: selectedSlot.endTime
          },
          semester: course.semester
        });
      });

      population.push(individual);
    }

    return population;
  }

  // FIX 10: Use .toString() for all ID comparisons in fitness
  calculateFitness(individual, prepared) {
    let fitness = 1000;
    let hardConflicts = 0;
    let softConflicts = 0;

    for (let i = 0; i < individual.length; i++) {
      const entryA = individual[i];

      const courseA = prepared.courses.find(c => c.courseCode === entryA.courseCode);
      const roomA = prepared.rooms.find(r =>
        r.roomId?.toString() === entryA.room || r._id?.toString() === entryA.room
      );

      if (!courseA || !roomA) continue;

      // Teacher qualification check
      if (courseA.qualifiedFaculties && courseA.qualifiedFaculties.length > 0) {
        const qualifiedIds = courseA.qualifiedFaculties.map(f =>
          (f.teacherId || f._id || f)?.toString()
        );
        if (!qualifiedIds.includes(entryA.instructor)) {
          hardConflicts += 2.0;
        }
      }

      // Room type matching using isLab
      const isLabCourse = courseA.requiresLab || false;
      const isLabRoom = roomA.isLab || false;
      if (isLabCourse && !isLabRoom) hardConflicts += 1.5;
      else if (!isLabCourse && isLabRoom) softConflicts += 0.5;

      // Capacity check
      if (roomA.capacity < 30 && !isLabCourse) softConflicts += 0.3;

      for (let j = i + 1; j < individual.length; j++) {
        const entryB = individual[j];

        if (entryA.day === entryB.day && this.timeSlotsOverlap(entryA.timeSlot, entryB.timeSlot)) {
          if (entryA.room === entryB.room) hardConflicts += 1.0;
          if (entryA.instructor === entryB.instructor) hardConflicts += 1.0;

          const courseB = prepared.courses.find(c => c.courseCode === entryB.courseCode);
          if (courseA.semester && courseB?.semester && courseA.semester === courseB.semester) {
            hardConflicts += 1.0;
          }
        }
      }
    }

    return Math.max(0, fitness / (1 + (hardConflicts * 10) + softConflicts));
  }

  selectParent(population, fitnessScores) {
    const index1 = Math.floor(Math.random() * population.length);
    const index2 = Math.floor(Math.random() * population.length);
    return fitnessScores[index1] > fitnessScores[index2]
      ? population[index1]
      : population[index2];
  }

  crossover(parent1, parent2) {
    const crossoverPoint = Math.floor(parent1.length / 2);
    return [
      ...parent1.slice(0, crossoverPoint),
      ...parent2.slice(crossoverPoint)
    ];
  }

  // FIX 11: mutate must RETURN the individual
  mutate(individual, prepared, timeSlots) {
    if (!individual || individual.length === 0) return individual;

    const mutateIndex = Math.floor(Math.random() * individual.length);
    // Deep-clone the gene to avoid mutating the parent
    const gene = { ...individual[mutateIndex], timeSlot: { ...individual[mutateIndex].timeSlot } };

    const courseData = prepared.courses.find(c => c.courseCode === gene.courseCode);
    if (!courseData) return individual;

    const mutationType = Math.random();

    if (mutationType < 0.33) {
      // Mutate instructor — qualifiedFaculties are plain string IDs
      if (courseData.qualifiedFaculties?.length > 0) {
        const picked = courseData.qualifiedFaculties[Math.floor(Math.random() * courseData.qualifiedFaculties.length)];
        gene.instructor = (typeof picked === 'string') ? picked : (picked?.teacherId ?? picked?._id)?.toString();
      } else {
        const picked = prepared.teachers[Math.floor(Math.random() * prepared.teachers.length)];
        gene.instructor = picked?.teacherId?.toString();
      }
    } else if (mutationType < 0.66) {
      // FIX 8: Use isLab for room filtering
      const isLab = courseData.requiresLab || false;
      const suitableRooms = prepared.rooms.filter(r => r.isLab === isLab);
      const finalRooms = suitableRooms.length > 0 ? suitableRooms : prepared.rooms;
      const newRoom = finalRooms[Math.floor(Math.random() * finalRooms.length)];
      gene.room = (newRoom.roomId || newRoom._id)?.toString();
    } else {
      // Mutate time/day
      const selectedSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
      gene.day = selectedSlot.day;
      gene.timeSlot = { startTime: selectedSlot.startTime, endTime: selectedSlot.endTime };
    }

    // Return a new array with the mutated gene
    const mutated = [...individual];
    mutated[mutateIndex] = gene;
    return mutated;
  }

  getRandomDay() {
    return this.options.workingDays[Math.floor(Math.random() * this.options.workingDays.length)];
  }

  getRandomTimeSlot() {
    const slots = this.generateTimeSlots();
    return slots[Math.floor(Math.random() * slots.length)];
  }

  initializeDomains(prepared, timeSlots) {
    return {};
  }

  backtrackSearch(schedule, domains, prepared, timeSlots, iterations) {
    return { schedule: [], iterations: 0, success: false };
  }
}

module.exports = SchedulingAlgorithm;