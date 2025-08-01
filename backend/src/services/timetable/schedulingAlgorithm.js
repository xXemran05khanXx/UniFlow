const ClashDetector = require('./clashDetector');

class SchedulingAlgorithm {
  constructor(options = {}) {
    this.clashDetector = new ClashDetector();
    this.options = {
      algorithm: options.algorithm || 'greedy', // 'greedy', 'genetic', 'constraint_satisfaction'
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
        
        // Try all possible combinations
        for (const timeSlot of timeSlots) {
          for (const room of prepared.rooms) {
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
    
    // Initialize population
    let population = this.initializePopulation(prepared, timeSlots);
    let bestSolution = null;
    let bestFitness = -Infinity;
    
    for (let generation = 0; generation < this.options.maxIterations; generation++) {
      // Evaluate fitness for each individual
      const fitnessScores = population.map(individual => 
        this.calculateFitness(individual, prepared)
      );
      
      // Find best solution in this generation
      const maxFitnessIndex = fitnessScores.indexOf(Math.max(...fitnessScores));
      if (fitnessScores[maxFitnessIndex] > bestFitness) {
        bestFitness = fitnessScores[maxFitnessIndex];
        bestSolution = [...population[maxFitnessIndex]];
      }
      
      // Create next generation
      const newPopulation = [];
      
      // Elitism - keep best individuals
      const eliteCount = Math.floor(this.options.populationSize * 0.1);
      const eliteIndices = fitnessScores
        .map((fitness, index) => ({ fitness, index }))
        .sort((a, b) => b.fitness - a.fitness)
        .slice(0, eliteCount)
        .map(item => item.index);
      
      eliteIndices.forEach(index => {
        newPopulation.push([...population[index]]);
      });
      
      // Generate offspring through crossover and mutation
      while (newPopulation.length < this.options.populationSize) {
        const parent1 = this.selectParent(population, fitnessScores);
        const parent2 = this.selectParent(population, fitnessScores);
        
        let offspring = this.crossover(parent1, parent2);
        offspring = this.mutate(offspring, prepared, timeSlots);
        
        newPopulation.push(offspring);
      }
      
      population = newPopulation;
      
      // Early termination if perfect solution found
      if (bestFitness >= 100) {
        break;
      }
    }
    
    return {
      schedule: bestSolution || [],
      executionTime: Date.now() - startTime,
      iterations: this.options.maxIterations,
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
      constraints: course.constraints || {}
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
      availability: room.availability || this.getDefaultAvailability(),
      equipment: room.equipment || [],
      isLab: room.isLab || false
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
    
    // Check room capacity
    if (room.capacity < (course.maxStudents || course.enrollment || 30)) {
      return false;
    }
    
    // Check teacher qualifications
    if (!this.isTeacherQualified(teacher, course)) {
      return false;
    }
    
    // Check room type requirements
    if (course.requiresLab && !room.isLab) {
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
    // Implementation for genetic algorithm initialization
    return [];
  }

  calculateFitness(individual, prepared) {
    // Implementation for fitness calculation
    return 0;
  }

  selectParent(population, fitnessScores) {
    // Implementation for parent selection
    return population[0];
  }

  crossover(parent1, parent2) {
    // Implementation for crossover
    return parent1;
  }

  mutate(individual, prepared, timeSlots) {
    // Implementation for mutation
    return individual;
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
