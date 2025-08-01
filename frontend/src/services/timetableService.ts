import { apiRequest } from './apiClient';

export interface TimeSlot {
  id: number;
  startTime: string;
  endTime: string;
  label: string;
}

export interface TimetableSession {
  id: string;
  courseCode: string;
  courseName: string;
  teacherId: string;
  teacherName: string;
  roomId: string;
  roomNumber: string;
  day: string;
  timeSlot: TimeSlot;
  semester: string;
  department: string;
  credits: number;
  maxStudents: number;
  sessionType: 'lecture' | 'lab' | 'tutorial';
}

export interface TimetableGenerationOptions {
  algorithm?: 'greedy' | 'genetic' | 'constraint';
  maxIterations?: number;
  semester?: string;
  academicYear?: number;
  courses?: any[];
  teachers?: any[];
  rooms?: any[];
}

export interface TimetableValidationResult {
  isValid: boolean;
  conflicts: any[];
  totalSessions: number;
  conflictCount: number;
}

export interface TimetableMetrics {
  qualityScore: number;
  schedulingRate: number;
  totalSessions: number;
  totalConflicts: number;
  coursesScheduled: number;
  totalCourses: number;
}

export interface TimetableGenerationResult {
  success: boolean;
  timetable: TimetableSession[];
  metrics: TimetableMetrics;
  conflicts: any[];
  metadata: {
    algorithm: string;
    semester: string;
    academicYear: number;
    generatedAt: string;
    totalSessions: number;
  };
}

export interface TimetableGenerationResponse {
  success: boolean;
  message?: string;
  data: TimetableGenerationResult;
}

export const timetableAPI = {
  // Generate new timetable
  generateTimetable: async (options: TimetableGenerationOptions = {}): Promise<TimetableGenerationResponse> => {
    return apiRequest('POST', '/timetable/generate', options);
  },

  // Validate existing timetable
  validateTimetable: async (timetable: TimetableSession[]): Promise<TimetableValidationResult> => {
    return apiRequest('POST', '/timetable/validate', { timetable });
  },

  // Get timetable view based on user role and filters
  getTimetable: async (filters: {
    role?: string;
    semester?: string;
    department?: string;
    teacherId?: string;
    roomId?: string;
  } = {}): Promise<{
    timetable: TimetableSession[];
    totalSessions: number;
    userRole: string;
    filters: any;
  }> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    
    const url = `/timetable/view${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest('GET', url);
  },

  // Export timetable
  exportTimetable: async (options: {
    format?: 'json' | 'csv';
    semester?: string;
    department?: string;
  } = {}): Promise<any> => {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    
    const url = `/timetable/export${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest('GET', url);
  },

  // Get available time slots
  getTimeSlots: async (): Promise<TimeSlot[]> => {
    return apiRequest('GET', '/timetable/timeslots');
  }
};

// Utility functions for timetable processing
export const timetableUtils = {
  // Convert timetable sessions to calendar events for react-big-calendar
  convertToCalendarEvents: (sessions: TimetableSession[]) => {
    const events: any[] = [];
    const daysMap = {
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
      sunday: 0
    };

    sessions.forEach(session => {
      const dayOfWeek = daysMap[session.day.toLowerCase() as keyof typeof daysMap];
      const startTime = session.timeSlot.startTime.split(':');
      const endTime = session.timeSlot.endTime.split(':');
      
      // Create a date for this week (starting Monday)
      const now = new Date();
      const currentDay = now.getDay();
      const diff = dayOfWeek - currentDay;
      const sessionDate = new Date(now);
      sessionDate.setDate(now.getDate() + diff);
      
      const start = new Date(sessionDate);
      start.setHours(parseInt(startTime[0]), parseInt(startTime[1]), 0, 0);
      
      const end = new Date(sessionDate);
      end.setHours(parseInt(endTime[0]), parseInt(endTime[1]), 0, 0);

      events.push({
        id: session.id,
        title: `${session.courseCode}: ${session.courseName}`,
        start,
        end,
        resource: {
          courseCode: session.courseCode,
          courseName: session.courseName,
          teacher: session.teacherName,
          room: session.roomNumber,
          department: session.department,
          sessionType: session.sessionType,
          credits: session.credits,
          maxStudents: session.maxStudents
        }
      });
    });

    return events;
  },

  // Group sessions by day for table view
  groupSessionsByDay: (sessions: TimetableSession[]) => {
    const grouped: { [key: string]: TimetableSession[] } = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    };

    sessions.forEach(session => {
      const day = session.day.toLowerCase();
      if (grouped[day]) {
        grouped[day].push(session);
      }
    });

    // Sort sessions within each day by time
    Object.keys(grouped).forEach(day => {
      grouped[day].sort((a, b) => a.timeSlot.id - b.timeSlot.id);
    });

    return grouped;
  },

  // Get sessions for a specific teacher
  getTeacherSessions: (sessions: TimetableSession[], teacherId: string) => {
    return sessions.filter(session => session.teacherId === teacherId);
  },

  // Get sessions for a specific room
  getRoomSessions: (sessions: TimetableSession[], roomId: string) => {
    return sessions.filter(session => session.roomId === roomId);
  },

  // Calculate teacher workload
  calculateTeacherWorkload: (sessions: TimetableSession[], teacherId: string) => {
    const teacherSessions = sessions.filter(session => session.teacherId === teacherId);
    const totalHours = teacherSessions.length;
    const uniqueCourses = Array.from(new Set(teacherSessions.map(s => s.courseCode))).length;
    
    return {
      totalHours,
      uniqueCourses,
      sessions: teacherSessions.length,
      days: Array.from(new Set(teacherSessions.map(s => s.day))).length
    };
  },

  // Find conflicts in timetable
  findConflicts: (sessions: TimetableSession[]) => {
    const conflicts: any[] = [];
    
    // Check for teacher conflicts
    const teacherSchedule: { [key: string]: TimetableSession } = {};
    sessions.forEach(session => {
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
    const roomSchedule: { [key: string]: TimetableSession } = {};
    sessions.forEach(session => {
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
  },

  // Format time slot for display
  formatTimeSlot: (timeSlot: TimeSlot) => {
    return timeSlot.label || `${timeSlot.startTime} - ${timeSlot.endTime}`;
  },

  // Get color for course/department
  getCourseColor: (courseCode: string, department: string) => {
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Green  
      '#F59E0B', // Yellow
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#06B6D4', // Cyan
      '#F97316', // Orange
      '#84CC16', // Lime
    ];
    
    const hash = (courseCode + department).split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  }
};
