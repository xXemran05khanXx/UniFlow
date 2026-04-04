class ClashDetector {
  constructor() {
    this.conflictTypes = {
      TEACHER_CONFLICT: 'teacher_conflict',
      ROOM_CONFLICT: 'room_conflict',
      STUDENT_CONFLICT: 'student_conflict',
      TIME_CONFLICT: 'time_conflict',
      CAPACITY_CONFLICT: 'capacity_conflict',
      RESOURCE_CONFLICT: 'resource_conflict'
    };
    
    this.severityLevels = {
      CRITICAL: 'critical',
      HIGH: 'high',
      MEDIUM: 'medium',
      LOW: 'low'
    };
  }

  /**
   * Main clash detection function
   * @param {Array} scheduleEntries - Array of schedule entries to check
   * @param {Array} existingSchedule - Existing schedule to compare against
   * @returns {Object} Detailed clash report
   */
  detectClashes(scheduleEntries, existingSchedule = []) {
    const allEntries = [...existingSchedule, ...scheduleEntries];
    const conflicts = [];
    
    // Check for different types of conflicts
    conflicts.push(...this.detectTeacherConflicts(allEntries));
    conflicts.push(...this.detectRoomConflicts(allEntries));
    conflicts.push(...this.detectStudentConflicts(allEntries));
    conflicts.push(...this.detectTimeConflicts(allEntries));
    conflicts.push(...this.detectCapacityConflicts(allEntries));
    conflicts.push(...this.detectResourceConflicts(allEntries));
    
    return this.generateClashReport(conflicts, scheduleEntries);
  }

  /**
   * Detect teacher conflicts (same teacher in multiple places at same time)
   */
  detectTeacherConflicts(scheduleEntries) {
    const conflicts = [];
    const teacherSchedule = new Map();
    
    scheduleEntries.forEach((entry, index) => {
      const teacherId = entry.instructor || entry.teacherId;
      if (!teacherId) return;
      
      const timeSlot = this.normalizeTimeSlot(entry.day, entry.timeSlot);
      const key = `${teacherId}_${timeSlot.day}_${timeSlot.startTime}`;
      
      if (teacherSchedule.has(key)) {
        const conflictingEntry = teacherSchedule.get(key);
        
        // Check if times actually overlap
        if (this.timeSlotsOverlap(timeSlot, conflictingEntry.timeSlot)) {
          conflicts.push({
            type: this.conflictTypes.TEACHER_CONFLICT,
            severity: this.severityLevels.CRITICAL,
            description: `Teacher ${entry.instructorName || teacherId} is scheduled in multiple locations`,
            affectedEntries: [conflictingEntry.index, index],
            details: {
              teacher: {
                id: teacherId,
                name: entry.instructorName
              },
              conflictingSlots: [
                {
                  course: conflictingEntry.entry.courseCode,
                  room: conflictingEntry.entry.roomNumber,
                  time: `${conflictingEntry.timeSlot.day} ${conflictingEntry.timeSlot.startTime}-${conflictingEntry.timeSlot.endTime}`
                },
                {
                  course: entry.courseCode,
                  room: entry.roomNumber,
                  time: `${timeSlot.day} ${timeSlot.startTime}-${timeSlot.endTime}`
                }
              ]
            },
            resolution: {
              suggestions: [
                'Reschedule one of the classes',
                'Assign different teacher to one course',
                'Split the time slots'
              ]
            }
          });
        }
      } else {
        teacherSchedule.set(key, {
          entry,
          timeSlot,
          index
        });
      }
    });
    
    return conflicts;
  }

  /**
   * Detect room conflicts (same room booked multiple times)
   */
  detectRoomConflicts(scheduleEntries) {
    const conflicts = [];
    const roomSchedule = new Map();
    
    scheduleEntries.forEach((entry, index) => {
      const roomId = entry.room || entry.roomId;
      if (!roomId) return;
      
      const timeSlot = this.normalizeTimeSlot(entry.day, entry.timeSlot);
      const key = `${roomId}_${timeSlot.day}_${timeSlot.startTime}`;
      
      if (roomSchedule.has(key)) {
        const conflictingEntry = roomSchedule.get(key);
        
        if (this.timeSlotsOverlap(timeSlot, conflictingEntry.timeSlot)) {
          conflicts.push({
            type: this.conflictTypes.ROOM_CONFLICT,
            severity: this.severityLevels.HIGH,
            description: `Room ${entry.roomNumber || roomId} is double-booked`,
            affectedEntries: [conflictingEntry.index, index],
            details: {
              room: {
                id: roomId,
                number: entry.roomNumber,
                building: entry.building
              },
              conflictingSlots: [
                {
                  course: conflictingEntry.entry.courseCode,
                  teacher: conflictingEntry.entry.instructorName,
                  time: `${conflictingEntry.timeSlot.day} ${conflictingEntry.timeSlot.startTime}-${conflictingEntry.timeSlot.endTime}`
                },
                {
                  course: entry.courseCode,
                  teacher: entry.instructorName,
                  time: `${timeSlot.day} ${timeSlot.startTime}-${timeSlot.endTime}`
                }
              ]
            },
            resolution: {
              suggestions: [
                'Find alternative room with similar capacity',
                'Reschedule one of the classes',
                'Use online/hybrid mode for one class'
              ]
            }
          });
        }
      } else {
        roomSchedule.set(key, {
          entry,
          timeSlot,
          index
        });
      }
    });
    
    return conflicts;
  }

  /**
   * Detect student conflicts (students enrolled in overlapping classes)
   */
  detectStudentConflicts(scheduleEntries) {
    const conflicts = [];
    const studentSchedules = new Map();
    
    scheduleEntries.forEach((entry, index) => {
      if (!entry.enrolledStudents || !Array.isArray(entry.enrolledStudents)) return;
      
      const timeSlot = this.normalizeTimeSlot(entry.day, entry.timeSlot);
      
      entry.enrolledStudents.forEach(studentEnrollment => {
        const studentId = studentEnrollment.student || studentEnrollment.studentId;
        if (!studentId) return;
        
        if (!studentSchedules.has(studentId)) {
          studentSchedules.set(studentId, []);
        }
        
        const studentTimeSlots = studentSchedules.get(studentId);
        
        // Check for conflicts with existing slots for this student
        studentTimeSlots.forEach(existingSlot => {
          if (this.timeSlotsOverlap(timeSlot, existingSlot.timeSlot)) {
            conflicts.push({
              type: this.conflictTypes.STUDENT_CONFLICT,
              severity: this.severityLevels.HIGH,
              description: `Student has overlapping class schedules`,
              affectedEntries: [existingSlot.index, index],
              details: {
                student: {
                  id: studentId
                },
                conflictingSlots: [
                  {
                    course: existingSlot.entry.courseCode,
                    room: existingSlot.entry.roomNumber,
                    time: `${existingSlot.timeSlot.day} ${existingSlot.timeSlot.startTime}-${existingSlot.timeSlot.endTime}`
                  },
                  {
                    course: entry.courseCode,
                    room: entry.roomNumber,
                    time: `${timeSlot.day} ${timeSlot.startTime}-${timeSlot.endTime}`
                  }
                ]
              },
              resolution: {
                suggestions: [
                  'Reschedule one of the classes',
                  'Remove student from one course',
                  'Offer alternative section'
                ]
              }
            });
          }
        });
        
        studentTimeSlots.push({
          entry,
          timeSlot,
          index
        });
      });
    });
    
    return conflicts;
  }

  /**
   * Detect general time conflicts and constraints violations
   */
  detectTimeConflicts(scheduleEntries) {
    const conflicts = [];
    
    scheduleEntries.forEach((entry, index) => {
      const timeSlot = this.normalizeTimeSlot(entry.day, entry.timeSlot);
      
      // Check for invalid time ranges
      if (!this.isValidTimeRange(timeSlot)) {
        conflicts.push({
          type: this.conflictTypes.TIME_CONFLICT,
          severity: this.severityLevels.HIGH,
          description: 'Invalid time range detected',
          affectedEntries: [index],
          details: {
            timeSlot: timeSlot,
            issue: 'Start time is after end time or invalid format'
          },
          resolution: {
            suggestions: ['Correct the time range', 'Verify time format']
          }
        });
      }
      
      // Check for reasonable duration
      const duration = this.calculateDuration(timeSlot);
      if (duration < 30 || duration > 180) {
        conflicts.push({
          type: this.conflictTypes.TIME_CONFLICT,
          severity: this.severityLevels.MEDIUM,
          description: 'Unusual class duration detected',
          affectedEntries: [index],
          details: {
            duration: duration,
            timeSlot: timeSlot,
            issue: duration < 30 ? 'Duration too short' : 'Duration too long'
          },
          resolution: {
            suggestions: [
              'Adjust duration to standard class length',
              'Split long sessions with breaks'
            ]
          }
        });
      }
      
      // Check for weekend scheduling (if not allowed)
      if (['saturday', 'sunday'].includes(timeSlot.day.toLowerCase()) && !this.isWeekendAllowed()) {
        conflicts.push({
          type: this.conflictTypes.TIME_CONFLICT,
          severity: this.severityLevels.LOW,
          description: 'Weekend scheduling detected',
          affectedEntries: [index],
          details: {
            day: timeSlot.day,
            policy: 'Weekend classes may require special approval'
          },
          resolution: {
            suggestions: ['Move to weekday', 'Get weekend approval']
          }
        });
      }
    });
    
    return conflicts;
  }

  /**
   * Detect capacity conflicts (room too small for enrolled students)
   */
  detectCapacityConflicts(scheduleEntries) {
    const conflicts = [];
    
    scheduleEntries.forEach((entry, index) => {
      const roomCapacity = entry.roomCapacity || entry.capacity;
      const enrolledCount = entry.currentEnrollment || 
                           (entry.enrolledStudents ? entry.enrolledStudents.length : 0);
      
      if (roomCapacity && enrolledCount > roomCapacity) {
        conflicts.push({
          type: this.conflictTypes.CAPACITY_CONFLICT,
          severity: this.severityLevels.HIGH,
          description: 'Room capacity exceeded',
          affectedEntries: [index],
          details: {
            room: {
              number: entry.roomNumber,
              capacity: roomCapacity
            },
            enrollment: {
              current: enrolledCount,
              overflow: enrolledCount - roomCapacity
            }
          },
          resolution: {
            suggestions: [
              'Find larger room',
              'Limit enrollment',
              'Split into multiple sections',
              'Use hybrid learning'
            ]
          }
        });
      }
      
      // Check for minimum enrollment
      const minEnrollment = entry.minEnrollment || 5;
      if (enrolledCount < minEnrollment) {
        conflicts.push({
          type: this.conflictTypes.CAPACITY_CONFLICT,
          severity: this.severityLevels.MEDIUM,
          description: 'Low enrollment detected',
          affectedEntries: [index],
          details: {
            enrollment: {
              current: enrolledCount,
              minimum: minEnrollment,
              shortage: minEnrollment - enrolledCount
            }
          },
          resolution: {
            suggestions: [
              'Promote course enrollment',
              'Combine with similar section',
              'Cancel if enrollment doesn\'t improve'
            ]
          }
        });
      }
    });
    
    return conflicts;
  }

  /**
   * Detect resource conflicts (equipment, lab requirements)
   */
  detectResourceConflicts(scheduleEntries) {
    const conflicts = [];
    const resourceSchedule = new Map();
    
    scheduleEntries.forEach((entry, index) => {
      if (!entry.requiredResources && !entry.equipment) return;
      
      const resources = entry.requiredResources || entry.equipment || [];
      const timeSlot = this.normalizeTimeSlot(entry.day, entry.timeSlot);
      
      resources.forEach(resource => {
        const key = `${resource}_${timeSlot.day}_${timeSlot.startTime}`;
        
        if (resourceSchedule.has(key)) {
          const conflictingEntry = resourceSchedule.get(key);
          
          if (this.timeSlotsOverlap(timeSlot, conflictingEntry.timeSlot)) {
            conflicts.push({
              type: this.conflictTypes.RESOURCE_CONFLICT,
              severity: this.severityLevels.MEDIUM,
              description: `Resource conflict: ${resource}`,
              affectedEntries: [conflictingEntry.index, index],
              details: {
                resource: resource,
                conflictingSlots: [
                  {
                    course: conflictingEntry.entry.courseCode,
                    room: conflictingEntry.entry.roomNumber,
                    time: `${conflictingEntry.timeSlot.day} ${conflictingEntry.timeSlot.startTime}-${conflictingEntry.timeSlot.endTime}`
                  },
                  {
                    course: entry.courseCode,
                    room: entry.roomNumber,
                    time: `${timeSlot.day} ${timeSlot.startTime}-${timeSlot.endTime}`
                  }
                ]
              },
              resolution: {
                suggestions: [
                  'Find alternative resource',
                  'Reschedule one session',
                  'Share resource with time buffer'
                ]
              }
            });
          }
        } else {
          resourceSchedule.set(key, {
            entry,
            timeSlot,
            index
          });
        }
      });
    });
    
    return conflicts;
  }

  /**
   * Normalize time slot for consistent comparison
   */
  normalizeTimeSlot(day, timeSlot) {
    return {
      day: day.toLowerCase(),
      startTime: this.normalizeTime(timeSlot.startTime),
      endTime: this.normalizeTime(timeSlot.endTime)
    };
  }

  /**
   * Normalize time format to HH:MM
   */
  normalizeTime(timeString) {
    if (!timeString) return null;
    
    // Handle different time formats
    const time = timeString.toString().trim();
    
    // Already in HH:MM format
    if (/^\d{1,2}:\d{2}$/.test(time)) {
      return time.padStart(5, '0');
    }
    
    // Handle HHMM format
    if (/^\d{3,4}$/.test(time)) {
      const hours = time.slice(0, -2);
      const minutes = time.slice(-2);
      return `${hours.padStart(2, '0')}:${minutes}`;
    }
    
    // Handle 12-hour format
    const twelveHourMatch = time.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)/i);
    if (twelveHourMatch) {
      let hours = parseInt(twelveHourMatch[1]);
      const minutes = twelveHourMatch[2] || '00';
      const period = twelveHourMatch[3].toUpperCase();
      
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
    
    return time; // Return as-is if can't parse
  }

  /**
   * Check if two time slots overlap
   */
  timeSlotsOverlap(slot1, slot2) {
    if (slot1.day !== slot2.day) return false;
    
    const start1 = this.timeToMinutes(slot1.startTime);
    const end1 = this.timeToMinutes(slot1.endTime);
    const start2 = this.timeToMinutes(slot2.startTime);
    const end2 = this.timeToMinutes(slot2.endTime);
    
    return start1 < end2 && start2 < end1;
  }

  /**
   * Convert time string to minutes since midnight
   */
  timeToMinutes(timeString) {
    if (!timeString) return 0;
    
    const [hours, minutes] = timeString.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  }

  /**
   * Check if time range is valid
   */
  isValidTimeRange(timeSlot) {
    const startMinutes = this.timeToMinutes(timeSlot.startTime);
    const endMinutes = this.timeToMinutes(timeSlot.endTime);
    
    return startMinutes < endMinutes && startMinutes >= 0 && endMinutes <= 1440; // 24 hours = 1440 minutes
  }

  /**
   * Calculate duration in minutes
   */
  calculateDuration(timeSlot) {
    const startMinutes = this.timeToMinutes(timeSlot.startTime);
    const endMinutes = this.timeToMinutes(timeSlot.endTime);
    
    return endMinutes - startMinutes;
  }

  /**
   * Check if weekend scheduling is allowed
   */
  isWeekendAllowed() {
    // This could be configurable based on institution policy
    return false;
  }

  /**
   * Generate comprehensive clash report
   */
  generateClashReport(conflicts, scheduleEntries) {
    const summary = {
      total: conflicts.length,
      critical: conflicts.filter(c => c.severity === this.severityLevels.CRITICAL).length,
      high: conflicts.filter(c => c.severity === this.severityLevels.HIGH).length,
      medium: conflicts.filter(c => c.severity === this.severityLevels.MEDIUM).length,
      low: conflicts.filter(c => c.severity === this.severityLevels.LOW).length
    };
    
    const byType = {};
    Object.values(this.conflictTypes).forEach(type => {
      byType[type] = conflicts.filter(c => c.type === type).length;
    });
    
    const affectedEntries = new Set();
    conflicts.forEach(conflict => {
      conflict.affectedEntries.forEach(index => affectedEntries.add(index));
    });
    
    return {
      timestamp: new Date().toISOString(),
      summary: {
        ...summary,
        affectedSchedules: affectedEntries.size,
        totalSchedules: scheduleEntries.length,
        conflictRate: ((affectedEntries.size / scheduleEntries.length) * 100).toFixed(2) + '%'
      },
      byType,
      conflicts: conflicts.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }),
      recommendations: this.generateRecommendations(conflicts),
      canProceed: summary.critical === 0, // Can proceed if no critical conflicts
      requiresReview: summary.high > 0 || summary.critical > 0
    };
  }

  /**
   * Generate recommendations based on conflicts
   */
  generateRecommendations(conflicts) {
    const recommendations = [];
    
    const criticalConflicts = conflicts.filter(c => c.severity === this.severityLevels.CRITICAL);
    if (criticalConflicts.length > 0) {
      recommendations.push({
        priority: 'critical',
        action: 'Resolve all critical conflicts before proceeding',
        details: 'Critical conflicts prevent proper scheduling and must be addressed immediately'
      });
    }
    
    const teacherConflicts = conflicts.filter(c => c.type === this.conflictTypes.TEACHER_CONFLICT);
    if (teacherConflicts.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Review teacher assignments and schedules',
        details: `${teacherConflicts.length} teacher conflicts detected`
      });
    }
    
    const roomConflicts = conflicts.filter(c => c.type === this.conflictTypes.ROOM_CONFLICT);
    if (roomConflicts.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Review room bookings and availability',
        details: `${roomConflicts.length} room conflicts detected`
      });
    }
    
    const capacityConflicts = conflicts.filter(c => c.type === this.conflictTypes.CAPACITY_CONFLICT);
    if (capacityConflicts.length > 0) {
      recommendations.push({
        priority: 'medium',
        action: 'Review room capacities and enrollment numbers',
        details: `${capacityConflicts.length} capacity issues detected`
      });
    }
    
    return recommendations;
  }

  /**
   * Quick validation for single schedule entry
   */
  validateSingleEntry(entry, existingSchedule = []) {
    return this.detectClashes([entry], existingSchedule);
  }

  /**
   * Get conflicting entries for a specific entry
   */
  getConflictingEntries(targetEntry, scheduleEntries) {
    const conflicts = this.detectClashes([targetEntry], scheduleEntries);
    const conflictingIndexes = new Set();
    
    conflicts.conflicts.forEach(conflict => {
      conflict.affectedEntries.forEach(index => {
        if (index < scheduleEntries.length) { // Exclude the target entry
          conflictingIndexes.add(index);
        }
      });
    });
    
    return Array.from(conflictingIndexes).map(index => scheduleEntries[index]);
  }
}

module.exports = ClashDetector;
