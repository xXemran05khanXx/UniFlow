const ClashDetector = require('./clashDetector');

class SchedulingAlgorithm {
  constructor(options = {}) {
    this.clashDetector = new ClashDetector();
    this.options = {
      algorithm: options.algorithm || 'greedy', 
      maxIterations: options.maxIterations || 1000,
      populationSize: options.populationSize || 50,
      mutationRate: options.mutationRate || 0.1,
      timeSlotDuration: options.timeSlotDuration || 60, // minutes
      workingDays: options.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      workingHours: options.workingHours || { start: '08:00', end: '18:00' },
      breakDuration: options.breakDuration || 15, // minutes between classes
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

  /**
   * Main scheduling function
   * @param {Object} input - Input data containing courses, teachers, rooms, constraints
   * @returns {Object} Generated timetable with conflicts and statistics
   */
  async generateTimetable(input) {
    try {
      console.log(`Starting timetable generation using ${this.options.algorithm} algorithm...`);
      
      // Validate input data
      const validation = this.validateInput(input);
      if (!validation.isValid) {
        throw new Error(`Input validation failed: ${validation.errors.join(', ')}`);
      }

      // Prepare data structures
      const prepared = this.prepareData(input);
      
      // Generate time slots
      const timeSlots = this.generateTimeSlots();
      
      // Run the selected algorithm
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

      // Validate result and detect conflicts
      const conflicts = this.clashDetector.detectClashes(result.schedule);
      
      // Calculate statistics
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

  /**
   * Greedy Algorithm Implementation
   */
  async greedyAlgorithm(prepared, timeSlots) {
    const startTime = Date.now();
    const schedule = [];
    let iterations = 0;
    
    // Sort courses by priority (credits, enrollment, constraints)
    const sortedCourses = this.prioritizeCourses(prepared.courses);
    
    for (const course of sortedCourses) {
      iterations++;
      
      let assigned = false;
      const attempts = [];
      
      // Try to assign each session of the course
      for (let session = 0; session < course.sessionsPerWeek; session++) {
        let bestSlot = null;
        let bestScore = -1;

        const eligibleRooms = course.isLabCourse
          ? prepared.rooms.filter(r => r.isLab)
          : prepared.rooms.filter(r => !r.isLab);

        if (eligibleRooms.length === 0) {
          continue; // No valid room type available
        }

        const shuffledRooms = [...eligibleRooms].sort(() => Math.random() - 0.5);
        
        // Try all possible combinations
        for (const timeSlot of timeSlots) {
          for (const room of shuffledRooms) {
            if (room.isLab && !course.isLabCourse) {
              console.error('INVALID ASSIGNMENT: Lecture in lab detected');
            }
            for (const teacher of prepared.teachers) {
              
              // Check if this combination is valid for this course
              if (!this.isValidAssignment(course, teacher, room, timeSlot, schedule)) {
                continue;
              }
              
              // Calculate score for this assignment
              const score = this.calculateAssignmentScore(course, teacher, room, timeSlot, schedule, prepared);
              
              if (score > bestScore) {
                bestScore = score;
                bestSlot = {
                  course: course,
                  teacher: teacher,
                  room: room,
                  timeSlot: timeSlot,
                  score: score
                };
              }
            }
          }
        }
        
        // Assign the best slot found
        if (bestSlot) {
          const scheduleEntry = this.createScheduleEntry(bestSlot);
          schedule.push(scheduleEntry);
          assigned = true;
          
          // Remove used time slot from available slots for this room/teacher
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

  /**
   * Genetic Algorithm Implementation
   */
  async geneticAlgorithm(prepared, timeSlots) {
    const startTime = Date.now();
    
    let population = this.initializePopulation(prepared, timeSlots);
    let bestSolution = [];
    let bestFitness = -Infinity;
    let iterations = 0;
    const earlyStopFitness = 950;
    const maxIterations = Math.max(1, this.options.maxIterations || 1);
    const populationSize = Math.max(2, this.options.populationSize || 2);

    if (population.length === 0) {
      return {
        schedule: [],
        executionTime: Date.now() - startTime,
        iterations,
        fitness: -10000
      };
    }
    
    for (let generation = 0; generation < maxIterations; generation++) {
      iterations = generation + 1;

      // Evaluate fitness for each individual
      const fitnessScores = population.map(individual => 
        this.calculateFitness(individual, prepared)
      );

      if (fitnessScores.length === 0) {
        break;
      }
      
      // Find best solution in this generation
      const maxFitnessIndex = fitnessScores.indexOf(Math.max(...fitnessScores));
      if (fitnessScores[maxFitnessIndex] > bestFitness) {
        bestFitness = fitnessScores[maxFitnessIndex];
        bestSolution = this.cloneSchedule(population[maxFitnessIndex]);
      }

      if (bestFitness >= earlyStopFitness) {
        break;
      }
      
      // Create next generation
      const newPopulation = [];
      
      // Elitism - keep best individuals
      const eliteCount = Math.max(1, Math.floor(populationSize * 0.1));
      const eliteIndices = fitnessScores
        .map((fitness, index) => ({ fitness, index }))
        .sort((a, b) => b.fitness - a.fitness)
        .slice(0, eliteCount)
        .map(item => item.index);
      
      eliteIndices.forEach(index => {
        newPopulation.push(this.cloneSchedule(population[index]));
      });
      
      // Generate offspring through crossover and mutation
      while (newPopulation.length < populationSize) {
        const parent1 = this.selectParent(population, fitnessScores);
        const parent2 = this.selectParent(population, fitnessScores);
        
        let offspring = this.crossover(parent1, parent2);
        offspring = this.mutate(offspring, prepared, timeSlots);
        
        newPopulation.push(offspring);
      }
      
      population = newPopulation;
    }
    
    return {
      schedule: bestSolution || [],
      executionTime: Date.now() - startTime,
      iterations,
      fitness: bestFitness
    };
  }

  /**
   * Constraint Satisfaction Algorithm Implementation
   */
  async constraintSatisfactionAlgorithm(prepared, timeSlots) {
    const startTime = Date.now();
    const schedule = [];
    const domains = this.initializeDomains(prepared, timeSlots);
    let iterations = 0;
    
    // Backtracking with constraint propagation
    const result = this.backtrackSearch(schedule, domains, prepared, timeSlots, iterations);
    
    return {
      schedule: result.schedule,
      executionTime: Date.now() - startTime,
      iterations: result.iterations,
      success: result.success
    };
  }

  /**
   * Validate input data
   */
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
    
    // Validate individual courses
    input.courses?.forEach((course, index) => {
      if (!course.courseCode) errors.push(`Course ${index}: courseCode is required`);
      if (!course.credits || course.credits <= 0) errors.push(`Course ${index}: valid credits required`);
      if (!course.department) errors.push(`Course ${index}: department is required`);
    });
    
    // Validate teachers
    input.teachers?.forEach((teacher, index) => {
      if (!teacher.teacherId) errors.push(`Teacher ${index}: teacherId is required`);
      if (!teacher.name) errors.push(`Teacher ${index}: name is required`);
      if (!teacher.department) errors.push(`Teacher ${index}: department is required`);
    });
    
    // Validate rooms
    input.rooms?.forEach((room, index) => {
      if (!room.roomNumber) errors.push(`Room ${index}: roomNumber is required`);
      if (!room.capacity || room.capacity <= 0) errors.push(`Room ${index}: valid capacity required`);
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Prepare data for algorithm processing
   */
  prepareData(input) {
    // Normalize and enrich courses
    const courses = input.courses.map(course => ({
      ...course,
      sessionsPerWeek: course.sessionsPerWeek || Math.ceil(course.credits || 3),
      duration: course.duration || this.options.timeSlotDuration,
      priority: this.calculateCoursePriority(course),
      constraints: course.constraints || {},
      isLabCourse:
        course.requiresLab === true ||
        course.sessionType?.toLowerCase() === 'lab'
    }));
    
    // Normalize teachers
    const teachers = input.teachers.map(teacher => ({
      ...teacher,
      maxHours: teacher.maxHours || 20,
      preferences: teacher.preferences || {},
      availability: teacher.availability || this.getDefaultAvailability(),
      currentLoad: 0
    }));
    
    // Normalize rooms
    const rooms = input.rooms.map(room => ({
      ...room,
      roomId: room.roomId || room._id?.toString(),
      availability: room.availability || this.getDefaultAvailability(),
      equipment: room.equipment || [],
      isLab:
        room.isLab === true ||
        room.type?.toLowerCase() === 'lab' ||
        room.roomType?.toLowerCase() === 'lab'
    }));
    
    return { courses, teachers, rooms };
  }

  /**
   * Generate available time slots
   */
  generateTimeSlots() {
    const slots = [];
    const startMinutes = this.timeToMinutes(this.options.workingHours.start);
    const endMinutes = this.timeToMinutes(this.options.workingHours.end);
    const slotDuration = this.options.timeSlotDuration;
    const breakDuration = this.options.breakDuration;
    
    for (const day of this.options.workingDays) {
      for (let time = startMinutes; time + slotDuration <= endMinutes; time += slotDuration + breakDuration) {
        const startTime = this.minutesToTime(time);
        const endTime = this.minutesToTime(time + slotDuration);
        
        slots.push({
          day: day,
          startTime: startTime,
          endTime: endTime,
          duration: slotDuration,
          available: true
        });
      }
    }
    
    return slots;
  }

  /**
   * Check if assignment is valid
   */
  isValidAssignment(course, teacher, room, timeSlot, existingSchedule) {
    // Check teacher availability
    if (!this.isTeacherAvailable(teacher, timeSlot, existingSchedule)) {
      return false;
    }
    
    // Check room availability
    if (!this.isRoomAvailable(room, timeSlot, existingSchedule)) {
      return false;
    }

    // Strict room type enforcement
    if (course.isLabCourse && !room.isLab) {
      return false;
    }
    if (!course.isLabCourse && room.isLab) {
      return false;
    }
    
    // Check room capacity
    if (room.capacity < (course.maxStudents || course.enrollment || 30)) {
      return false;
    }
    
    // Check teacher qualifications
    if (!this.isTeacherQualified(teacher, course)) {
      return false;
    }
    
    // Check equipment requirements
    if (course.requiredEquipment && !this.hasRequiredEquipment(room, course.requiredEquipment)) {
      return false;
    }
    
    return true;
  }

  /**
   * Calculate assignment score for greedy algorithm
   */
  calculateAssignmentScore(course, teacher, room, timeSlot, schedule, prepared) {
    let score = 0;
    
    // Base score
    score += 50;
    
    // Teacher preference bonus
    if (teacher.preferences?.departments?.includes(course.department)) {
      score += 20;
    }
    
    if (teacher.preferences?.timeSlots) {
      const prefSlot = teacher.preferences.timeSlots.find(pref => 
        pref.day === timeSlot.day && pref.startTime === timeSlot.startTime
      );
      if (prefSlot) {
        score += 15;
      }
    }
    
    // Room suitability bonus
    const capacityUtilization = (course.maxStudents || 30) / room.capacity;
    if (capacityUtilization >= 0.7 && capacityUtilization <= 0.9) {
      score += 10; // Good capacity utilization
    }
    
    // Equipment match bonus
    if (course.requiredEquipment) {
      const equipmentMatch = course.requiredEquipment.filter(req => 
        room.equipment?.includes(req)
      ).length;
      score += equipmentMatch * 5;
    }
    
    const roomUsageCount = schedule.filter(entry => 
      entry.room === room.roomId
    ).length;
    const totalSessions = schedule.length || 1;
    const usageRatio = roomUsageCount / totalSessions;
    score -= usageRatio * 50;

    const roomConflicts = schedule.filter(entry => 
      entry.room === room.roomId &&
      entry.day === timeSlot.day &&
      this.timeSlotsOverlap(entry.timeSlot, timeSlot)
    ).length;
    score -= roomConflicts * 200;
    
    // Avoid conflicts penalty
    const teacherConflicts = schedule.filter(entry => 
      entry.instructor === teacher.teacherId &&
      entry.day === timeSlot.day &&
      this.timeSlotsOverlap(entry.timeSlot, timeSlot)
    ).length;
    score -= teacherConflicts * 100; // Heavy penalty for conflicts
    
    // Consecutive classes bonus (for same teacher)
    const consecutiveBonus = this.calculateConsecutiveBonus(teacher, timeSlot, schedule);
    score += consecutiveBonus;
    
    // Lunch time penalty (avoid scheduling during lunch)
    if (this.isLunchTime(timeSlot)) {
      score -= 10;
    }
    
    return score;
  }

  /**
   * Helper methods
   */
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
      entry.instructor === teacher.teacherId &&
      entry.day === timeSlot.day &&
      this.timeSlotsOverlap(entry.timeSlot, timeSlot)
    );
  }

  isRoomAvailable(room, timeSlot, schedule) {
    return !schedule.some(entry => 
      entry.room === room.roomId &&
      entry.day === timeSlot.day &&
      this.timeSlotsOverlap(entry.timeSlot, timeSlot)
    );
  }

  isTeacherQualified(teacher, course) {
    // Check if teacher's department matches course department
    if (teacher.department === course.department) {
      return true;
    }
    
    // Check specializations
    if (teacher.specialization?.includes(course.subject) || 
        teacher.specialization?.includes(course.department)) {
      return true;
    }
    
    return false;
  }

  hasRequiredEquipment(room, requiredEquipment) {
    return requiredEquipment.every(req => room.equipment?.includes(req));
  }

  timeSlotsOverlap(slot1, slot2) {
    const start1 = this.timeToMinutes(slot1.startTime);
    const end1 = this.timeToMinutes(slot1.endTime);
    const start2 = this.timeToMinutes(slot2.startTime);
    const end2 = this.timeToMinutes(slot2.endTime);
    
    return start1 < end2 && start2 < end1;
  }

  calculateCoursePriority(course) {
    let priority = course.credits || 3;
    
    // Higher priority for required courses
    if (course.isRequired) priority += 5;
    
    // Higher priority for higher enrollment
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
    // This could be implemented to track used slots
    // For now, conflicts are handled by the validation functions
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
    // Check if teacher has classes before/after this slot
    const sameDayClasses = schedule.filter(entry => 
      entry.instructor === teacher.teacherId && entry.day === timeSlot.day
    );
    
    if (sameDayClasses.length > 0) {
      return 5; // Small bonus for consecutive classes
    }
    
    return 0;
  }

  isLunchTime(timeSlot) {
    const startMinutes = this.timeToMinutes(timeSlot.startTime);
    const lunchStart = this.timeToMinutes('12:00');
    const lunchEnd = this.timeToMinutes('13:00');
    
    return startMinutes >= lunchStart && startMinutes < lunchEnd;
  }

  calculateStatistics(schedule, prepared) {
    const stats = {
      totalSessions: schedule.length,
      totalCourses: new Set(schedule.map(s => s.courseCode)).size,
      totalTeachers: new Set(schedule.map(s => s.instructor)).size,
      totalRooms: new Set(schedule.map(s => s.room)).size,
      utilizationRate: {
        teachers: 0,
        rooms: 0,
        timeSlots: 0
      },
      distribution: {
        byDay: {},
        byTimeSlot: {},
        byDepartment: {}
      }
    };
    
    // Calculate utilization rates
    stats.utilizationRate.teachers = (stats.totalTeachers / prepared.teachers.length * 100).toFixed(2);
    stats.utilizationRate.rooms = (stats.totalRooms / prepared.rooms.length * 100).toFixed(2);
    
    // Calculate distributions
    this.options.workingDays.forEach(day => {
      stats.distribution.byDay[day] = schedule.filter(s => s.day === day).length;
    });
    
    return stats;
  }

  // Additional methods for genetic algorithm would go here...
  initializePopulation(prepared, timeSlots) {
    const population = [];
    const targetPopulationSize = Math.max(2, this.options.populationSize || 2);

    for (let i = 0; i < targetPopulationSize; i++) {
      const individual = [];
      const shuffledCourses = [...prepared.courses].sort(() => Math.random() - 0.5);

      for (const course of shuffledCourses) {
        const qualifiedTeachers = prepared.teachers.filter(teacher => 
          this.isTeacherQualified(teacher, course)
        );

        const eligibleRooms = course.isLabCourse
          ? prepared.rooms.filter(room => room.isLab)
          : prepared.rooms.filter(room => !room.isLab);

        if (qualifiedTeachers.length === 0 || eligibleRooms.length === 0) {
          continue;
        }

        for (let session = 0; session < course.sessionsPerWeek; session++) {
          let assigned = false;

          for (let attempt = 0; attempt < 75 && !assigned; attempt++) {
            const teacher = this.getRandomItem(qualifiedTeachers);
            const room = this.getRandomItem(eligibleRooms);
            const timeSlot = this.getRandomItem(timeSlots);

            if (!teacher || !room || !timeSlot) {
              continue;
            }

            if (!this.isValidAssignment(course, teacher, room, timeSlot, individual)) {
              continue;
            }

            if (this.hasStudentGroupConflict(individual, course, timeSlot, prepared)) {
              continue;
            }

            individual.push(this.createScheduleEntry({ course, teacher, room, timeSlot }));
            assigned = true;
          }

          if (!assigned) {
            for (const timeSlot of timeSlots) {
              let placedInFallback = false;

              for (const room of eligibleRooms) {
                for (const teacher of qualifiedTeachers) {
                  if (!this.isValidAssignment(course, teacher, room, timeSlot, individual)) {
                    continue;
                  }

                  if (this.hasStudentGroupConflict(individual, course, timeSlot, prepared)) {
                    continue;
                  }

                  individual.push(this.createScheduleEntry({ course, teacher, room, timeSlot }));
                  assigned = true;
                  placedInFallback = true;
                  break;
                }

                if (placedInFallback) {
                  break;
                }
              }

              if (placedInFallback) {
                break;
              }
            }
          }
        }
      }

      population.push(individual);
    }

    return population;
  }

  calculateFitness(individual, prepared) {
    if (!Array.isArray(individual) || individual.length === 0) {
      return -10000;
    }

    let fitness = 1000;
    const hardMetrics = this.evaluateHardConstraints(individual, prepared);
    const hardViolations =
      hardMetrics.teacherConflicts +
      hardMetrics.roomConflicts +
      hardMetrics.studentConflicts +
      hardMetrics.labTypeViolations;

    if (hardViolations > 0) {
      return -10000 - hardViolations * 500;
    }

    const roomUsage = new Map();
    individual.forEach(entry => {
      roomUsage.set(entry.room, (roomUsage.get(entry.room) || 0) + 1);
    });

    if (roomUsage.size > 0) {
      const roomCounts = Array.from(roomUsage.values());
      const minUsage = Math.min(...roomCounts);
      const maxUsage = Math.max(...roomCounts);
      const spread = Math.max(1, maxUsage);
      const balanceScore = Math.max(0, 1 - ((maxUsage - minUsage) / spread));
      fitness += balanceScore * 10;
    }

    const roomById = new Map(prepared.rooms.map(room => [room.roomId, room]));
    let goodCapacityCount = 0;
    individual.forEach(entry => {
      const room = roomById.get(entry.room);
      if (!room || !room.capacity) {
        return;
      }

      const enrolled = entry.currentEnrollment || entry.maxEnrollment || 0;
      const utilization = enrolled / room.capacity;
      if (utilization >= 0.6 && utilization <= 0.95) {
        goodCapacityCount += 1;
      }
    });
    fitness += (goodCapacityCount / individual.length) * 10;

    const teacherById = new Map(prepared.teachers.map(teacher => [teacher.teacherId, teacher]));
    const courseByCode = new Map(prepared.courses.map(course => [course.courseCode, course]));
    const courseById = new Map(prepared.courses.map(course => [course.courseId, course]));
    let preferenceMatches = 0;
    individual.forEach(entry => {
      const teacher = teacherById.get(entry.instructor);
      const course = courseByCode.get(entry.courseCode) || courseById.get(entry.course);
      if (!teacher) {
        return;
      }

      if (teacher.preferences?.departments?.includes(course?.department)) {
        preferenceMatches += 1;
      }

      const prefersTimeSlot = teacher.preferences?.timeSlots?.some(pref => 
        pref.day === entry.day &&
        pref.startTime === entry.timeSlot.startTime
      );
      if (prefersTimeSlot) {
        preferenceMatches += 1;
      }
    });
    const preferenceDenominator = Math.max(1, individual.length * 2);
    fitness += (preferenceMatches / preferenceDenominator) * 20;

    const lunchViolations = individual.filter(entry => this.isLunchTime(entry.timeSlot)).length;
    fitness += (1 - (lunchViolations / individual.length)) * 5;

    const teacherDayMap = new Map();
    individual.forEach(entry => {
      const key = `${entry.instructor}_${entry.day}`;
      const list = teacherDayMap.get(key) || [];
      list.push(entry);
      teacherDayMap.set(key, list);
    });

    let consecutiveLinks = 0;
    let possibleLinks = 0;
    teacherDayMap.forEach(entries => {
      if (entries.length < 2) {
        return;
      }

      entries.sort((a, b) => this.timeToMinutes(a.timeSlot.startTime) - this.timeToMinutes(b.timeSlot.startTime));
      possibleLinks += entries.length - 1;

      for (let i = 1; i < entries.length; i++) {
        const prevEnd = this.timeToMinutes(entries[i - 1].timeSlot.endTime);
        const currentStart = this.timeToMinutes(entries[i].timeSlot.startTime);
        if (currentStart - prevEnd <= this.options.breakDuration + 15) {
          consecutiveLinks += 1;
        }
      }
    });

    if (possibleLinks > 0) {
      fitness += (consecutiveLinks / possibleLinks) * 5;
    }

    return fitness;
  }

  selectParent(population, fitnessScores) {
    if (!population.length) {
      return [];
    }

    const tournamentSize = Math.min(3, population.length);
    let bestIndex = -1;
    let bestFitness = -Infinity;

    for (let i = 0; i < tournamentSize; i++) {
      const candidateIndex = Math.floor(Math.random() * population.length);
      if (fitnessScores[candidateIndex] > bestFitness) {
        bestFitness = fitnessScores[candidateIndex];
        bestIndex = candidateIndex;
      }
    }

    return this.cloneSchedule(population[bestIndex]);
  }

  crossover(parent1, parent2) {
    if (!Array.isArray(parent1) || parent1.length === 0) {
      return this.cloneSchedule(parent2 || []);
    }
    if (!Array.isArray(parent2) || parent2.length === 0) {
      return this.cloneSchedule(parent1);
    }

    const crossoverPoint = Math.floor(Math.random() * Math.min(parent1.length, parent2.length));
    const child = [
      ...this.cloneSchedule(parent1.slice(0, crossoverPoint)),
      ...this.cloneSchedule(parent2.slice(crossoverPoint))
    ];

    const targetLength = Math.max(parent1.length, parent2.length);
    if (child.length < targetLength) {
      const fillerSource = parent1.length >= parent2.length ? parent1 : parent2;
      const filler = this.cloneSchedule(fillerSource.slice(child.length, targetLength));
      child.push(...filler);
    }

    return child;
  }

  mutate(individual, prepared, timeSlots) {
    if (!Array.isArray(individual) || individual.length === 0) {
      return individual;
    }

    if (Math.random() > this.options.mutationRate) {
      return individual;
    }

    const mutated = this.cloneSchedule(individual);
    const mutationIndex = Math.floor(Math.random() * mutated.length);
    const targetEntry = mutated[mutationIndex];

    const course = prepared.courses.find(item =>
      item.courseCode === targetEntry.courseCode || item.courseId === targetEntry.course
    );

    if (!course) {
      return individual;
    }

    const qualifiedTeachers = prepared.teachers.filter(teacher => this.isTeacherQualified(teacher, course));
    const eligibleRooms = course.isLabCourse
      ? prepared.rooms.filter(room => room.isLab)
      : prepared.rooms.filter(room => !room.isLab);

    if (qualifiedTeachers.length === 0 || eligibleRooms.length === 0 || timeSlots.length === 0) {
      return individual;
    }

    const scheduleWithoutGene = mutated.filter((_, index) => index !== mutationIndex);

    for (let attempt = 0; attempt < 40; attempt++) {
      let candidateTeacher = prepared.teachers.find(teacher => teacher.teacherId === targetEntry.instructor) || this.getRandomItem(qualifiedTeachers);
      let candidateRoom = prepared.rooms.find(room => room.roomId === targetEntry.room) || this.getRandomItem(eligibleRooms);
      let candidateTimeSlot = {
        day: targetEntry.day,
        startTime: targetEntry.timeSlot.startTime,
        endTime: targetEntry.timeSlot.endTime
      };

      const mutationType = Math.floor(Math.random() * 3);
      if (mutationType === 0) {
        candidateRoom = this.getRandomItem(eligibleRooms);
      } else if (mutationType === 1) {
        candidateTimeSlot = this.getRandomItem(timeSlots);
      } else {
        candidateTeacher = this.getRandomItem(qualifiedTeachers);
      }

      if (!candidateTeacher || !candidateRoom || !candidateTimeSlot) {
        continue;
      }

      if (!this.isValidAssignment(course, candidateTeacher, candidateRoom, candidateTimeSlot, scheduleWithoutGene)) {
        continue;
      }

      if (this.hasStudentGroupConflict(scheduleWithoutGene, course, candidateTimeSlot, prepared)) {
        continue;
      }

      const candidateEntry = this.createScheduleEntry({
        course,
        teacher: candidateTeacher,
        room: candidateRoom,
        timeSlot: candidateTimeSlot
      });

      const candidateSchedule = [...scheduleWithoutGene, candidateEntry];
      const hardMetrics = this.evaluateHardConstraints(candidateSchedule, prepared);
      const hardViolations =
        hardMetrics.teacherConflicts +
        hardMetrics.roomConflicts +
        hardMetrics.studentConflicts +
        hardMetrics.labTypeViolations;

      if (hardViolations === 0) {
        return candidateSchedule;
      }
    }

    return individual;
  }

  cloneSchedule(schedule) {
    return (schedule || []).map(entry => ({
      ...entry,
      timeSlot: entry.timeSlot ? { ...entry.timeSlot } : entry.timeSlot
    }));
  }

  getRandomItem(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return null;
    }
    const index = Math.floor(Math.random() * items.length);
    return items[index];
  }

  resolveStudentGroupKey(course) {
    if (!course) {
      return null;
    }

    return (
      course.studentGroup ||
      course.section ||
      course.batch ||
      course.group ||
      (course.department && (course.semester || course.level || course.year)
        ? `${course.department}_${course.semester || course.level || course.year}`
        : null) ||
      course.courseCode
    );
  }

  hasStudentGroupConflict(schedule, course, timeSlot, prepared) {
    const targetGroupKey = this.resolveStudentGroupKey(course);
    if (!targetGroupKey) {
      return false;
    }

    const courseByCode = new Map(prepared.courses.map(item => [item.courseCode, item]));
    const courseById = new Map(prepared.courses.map(item => [item.courseId, item]));

    return schedule.some(entry => {
      if (entry.day !== timeSlot.day || !this.timeSlotsOverlap(entry.timeSlot, timeSlot)) {
        return false;
      }

      const scheduledCourse = courseByCode.get(entry.courseCode) || courseById.get(entry.course);
      if (!scheduledCourse) {
        return false;
      }

      return this.resolveStudentGroupKey(scheduledCourse) === targetGroupKey;
    });
  }

  evaluateHardConstraints(individual, prepared) {
    const teacherByDay = new Map();
    const roomByDay = new Map();
    const studentByDay = new Map();
    const roomLookup = new Map(prepared.rooms.map(room => [room.roomId, room]));
    const courseByCode = new Map(prepared.courses.map(course => [course.courseCode, course]));
    const courseById = new Map(prepared.courses.map(course => [course.courseId, course]));

    let teacherConflicts = 0;
    let roomConflicts = 0;
    let studentConflicts = 0;
    let labTypeViolations = 0;

    for (const entry of individual) {
      const timeSlot = entry.timeSlot;
      if (!timeSlot) {
        continue;
      }

      const course = courseByCode.get(entry.courseCode) || courseById.get(entry.course);
      const room = roomLookup.get(entry.room);

      if (course && room && course.isLabCourse !== room.isLab) {
        labTypeViolations += 1;
      }

      const teacherKey = `${entry.instructor}_${entry.day}`;
      const teacherEntries = teacherByDay.get(teacherKey) || [];
      teacherEntries.forEach(existingEntry => {
        if (this.timeSlotsOverlap(existingEntry.timeSlot, timeSlot)) {
          teacherConflicts += 1;
        }
      });
      teacherEntries.push(entry);
      teacherByDay.set(teacherKey, teacherEntries);

      const roomKey = `${entry.room}_${entry.day}`;
      const roomEntries = roomByDay.get(roomKey) || [];
      roomEntries.forEach(existingEntry => {
        if (this.timeSlotsOverlap(existingEntry.timeSlot, timeSlot)) {
          roomConflicts += 1;
        }
      });
      roomEntries.push(entry);
      roomByDay.set(roomKey, roomEntries);

      const studentGroupKey = this.resolveStudentGroupKey(course);
      if (studentGroupKey) {
        const studentKey = `${studentGroupKey}_${entry.day}`;
        const studentEntries = studentByDay.get(studentKey) || [];
        studentEntries.forEach(existingEntry => {
          if (this.timeSlotsOverlap(existingEntry.timeSlot, timeSlot)) {
            studentConflicts += 1;
          }
        });
        studentEntries.push(entry);
        studentByDay.set(studentKey, studentEntries);
      }
    }

    return {
      teacherConflicts,
      roomConflicts,
      studentConflicts,
      labTypeViolations
    };
  }

  // Methods for constraint satisfaction algorithm...
  initializeDomains(prepared, timeSlots) {
    // Implementation for domain initialization
    return {};
  }

  backtrackSearch(schedule, domains, prepared, timeSlots, iterations) {
    // Implementation for backtracking search
    return { schedule: [], iterations: 0, success: false };
  }
}

module.exports = SchedulingAlgorithm;
