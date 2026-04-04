/**
 * teacher.types.ts
 * Types derived directly from the backend Teacher model + controller responses.
 * Add to your existing src/types/ folder (or merge into your main types/index.ts).
 */

// ── Schedule query options ────────────────────────────────────────────────────

export interface ScheduleQueryOptions {
  status?: 'Published' | 'Draft' | 'any';
  academicYear?: number;
}

// ── Session (one class entry in the timetable) ───────────────────────────────

export type DayOfWeek =
  | 'Monday' | 'Tuesday' | 'Wednesday'
  | 'Thursday' | 'Friday' | 'Saturday';

export type SessionType = 'Theory' | 'Lab';

export interface Session {
  timetableId: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  courseType: SessionType;
  credits: number;
  roomId: string;
  roomNumber: string;
  floor: string;
  roomType: string;
  dayOfWeek: DayOfWeek;
  startTime: string;   // HH:MM
  endTime: string;     // HH:MM
  type: SessionType;
  semester: number;
  division: string;
  batch: string | null;
  department: string | null;
  academicYear: number;
  status: 'Published' | 'Draft';
}

// ── Weekly stats (returned by /my-schedule) ───────────────────────────────────

export interface WeeklyStats {
  totalSessions: number;
  theoryClasses: number;
  labClasses: number;
  workingDays: number;
  totalHours: number;
}

// ── Weekly schedule map ───────────────────────────────────────────────────────

export type WeeklySchedule = Record<DayOfWeek, Session[]>;

// ── Teacher info (compact — returned inside schedule response) ────────────────

export interface TeacherInfo {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  department: string | null;
}

// ── Full teacher profile (returned by GET /teachers/:id) ─────────────────────

export interface TeacherProfile {
  _id: string;
  employeeId: string;
  name: string;
  designation: 'Professor' | 'Associate Professor' | 'Assistant Professor' | 'Lecturer';
  qualifications: string[];
  contactInfo?: { staffRoom?: string };
  workload?: { maxHoursPerWeek: number; minHoursPerWeek: number };
  availability?: Array<{
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
  }>;
  performanceRating?: number | null;
  primaryDepartment?: { _id: string; name: string; code?: string; coursecode?: string };
  allowedDepartments?: Array<{ _id: string; name: string; coursecode?: string }>;
  user?: { _id: string; name: string; email: string; role: string };
  createdAt?: string;
  updatedAt?: string;
}

// ── Full schedule API response ────────────────────────────────────────────────

export interface TeacherScheduleResponse {
  success: boolean;
  message?: string;
  data: {
    teacher: TeacherInfo;
    weeklySchedule: WeeklySchedule;
    allSessions: Session[];
    weeklyStats: WeeklyStats;
  };
}