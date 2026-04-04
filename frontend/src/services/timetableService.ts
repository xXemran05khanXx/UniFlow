// services/timetableService.ts
// Updated to pass division + academicYear filters that the backend now supports.

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

  // ── Fetch saved timetables from DB ────────────────────────────────────────
  // Now supports all backend filter params: department, semester, division,
  // academicYear, status
  getSavedTimetables: async (filters: {
    department?:   string;
    semester?:     string | number;
    division?:     string;
    academicYear?: string | number;
    status?:       string;
  } = {}) => {
    const params = new URLSearchParams();
    if (filters.department)   params.append('department',   String(filters.department));
    if (filters.semester)     params.append('semester',     String(filters.semester));
    if (filters.division)     params.append('division',     String(filters.division));
    if (filters.academicYear) params.append('academicYear', String(filters.academicYear));
    if (filters.status)       params.append('status',       String(filters.status));

    const url = `/timetable/list${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest<any>('GET', url);
  },

  // ── Generate new timetable ────────────────────────────────────────────────
  generateTimetable: async (options: TimetableGenerationOptions = {}): Promise<TimetableGenerationResponse> => {
    return apiRequest('POST', '/timetable/generate', options);
  },

  // ── Validate existing timetable ───────────────────────────────────────────
  validateTimetable: async (timetable: TimetableSession[]): Promise<TimetableValidationResult> => {
    return apiRequest('POST', '/timetable/validate', { timetable });
  },

  // ── Role-aware timetable view ─────────────────────────────────────────────
  getTimetable: async (filters: {
    role?:        string;
    semester?:    string;
    department?:  string;
    division?:    string;
    academicYear?: string;
    teacherId?:   string;
    roomId?:      string;
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
    const url = `/timetable/list${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest('GET', url);
  },

  // ── Export timetable ──────────────────────────────────────────────────────
  exportTimetable: async (options: {
    format?:     'json' | 'csv';
    semester?:   string;
    department?: string;
  } = {}): Promise<any> => {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    const url = `/timetable/export${params.toString() ? `?${params.toString()}` : ''}`;
    return apiRequest('GET', url);
  },

  // ── Time slots ────────────────────────────────────────────────────────────
  getTimeSlots: async (): Promise<TimeSlot[]> => {
    return apiRequest('GET', '/timeslots');
  },

  // ── Teacher schedule ──────────────────────────────────────────────────────
  getTeacherSchedule: async (teacherId?: string) => {
    const qs = teacherId ? `?teacherId=${encodeURIComponent(teacherId)}` : '';
    return apiRequest<any>('GET', `/timetable/my-schedule${qs}`);
  },

  // ── Student schedule ──────────────────────────────────────────────────────
  getStudentSchedule: async () => {
    return apiRequest<any>('GET', '/timetable/student-schedule');
  },
};

// ── Timetable CRUD service ────────────────────────────────────────────────────
export const timetableService = {

  saveTimetable: async (data: {
    name:         string;
    department:   string;
    semester:     number;
    academicYear: string;
    schedule:     Array<{
      subject:     string;
      subjectName: string;
      teacher:     string;
      teacherName: string;
      timeSlot:    string;
      day:         number;
      startTime:   string;
      endTime:     string;
      room?:       string;
    }>;
  }) => {
    return apiRequest('POST', '/timetable/save', data);
  },

  saveDraft: async (data: any) => {
    return apiRequest('POST', '/timetable/save-draft', data);
  },

  publishTimetable: async (id: string) => {
    return apiRequest('PATCH', `/timetable/${id}/publish`);
  },

  deleteTimetable: async (id: string) => {
    return apiRequest('DELETE', `/timetable/${id}`);
  },

  getTimetables: async (filters?: {
    department?:   string;
    semester?:     number;
    division?:     string;
    academicYear?: number;
    status?:       string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.department)   params.append('department',   filters.department);
    if (filters?.semester)     params.append('semester',     String(filters.semester));
    if (filters?.division)     params.append('division',     filters.division);
    if (filters?.academicYear) params.append('academicYear', String(filters.academicYear));
    if (filters?.status)       params.append('status',       filters.status);
    const qs  = params.toString();
    return apiRequest('GET', qs ? `/timetable/list?${qs}` : '/timetable/list');
  },

  getTimetableById: async (id: string) => {
    return apiRequest('GET', `/timetable/${id}`);
  },
};

// ── Utility functions ─────────────────────────────────────────────────────────
export const timetableUtils = {
  convertToCalendarEvents: (sessions: TimetableSession[]) => {
    const events: any[] = [];
    const daysMap: Record<string, number> = {
      monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
      friday: 5, saturday: 6, sunday: 0,
    };
    sessions.forEach(session => {
      const dayOfWeek = daysMap[session.day.toLowerCase()];
      const startTime = session.timeSlot.startTime.split(':');
      const endTime   = session.timeSlot.endTime.split(':');
      const now = new Date();
      const diff = dayOfWeek - now.getDay();
      const sessionDate = new Date(now);
      sessionDate.setDate(now.getDate() + diff);
      const start = new Date(sessionDate);
      start.setHours(parseInt(startTime[0]), parseInt(startTime[1]), 0, 0);
      const end = new Date(sessionDate);
      end.setHours(parseInt(endTime[0]), parseInt(endTime[1]), 0, 0);
      events.push({
        id:    session.id,
        title: `${session.courseCode}: ${session.courseName}`,
        start, end,
        resource: {
          courseCode:  session.courseCode,
          courseName:  session.courseName,
          teacher:     session.teacherName,
          room:        session.roomNumber,
          department:  session.department,
          sessionType: session.sessionType,
          credits:     session.credits,
          maxStudents: session.maxStudents,
        },
      });
    });
    return events;
  },

  groupSessionsByDay: (sessions: TimetableSession[]) => {
    const grouped: Record<string, TimetableSession[]> = {
      monday: [], tuesday: [], wednesday: [], thursday: [],
      friday: [], saturday: [], sunday: [],
    };
    sessions.forEach(session => {
      const day = session.day.toLowerCase();
      if (grouped[day]) grouped[day].push(session);
    });
    Object.keys(grouped).forEach(day => {
      grouped[day].sort((a, b) => a.timeSlot.id - b.timeSlot.id);
    });
    return grouped;
  },

  getCourseColor: (courseCode: string, department: string) => {
    const colors = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#F97316','#84CC16'];
    const hash = (courseCode + department).split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0); return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  },
};