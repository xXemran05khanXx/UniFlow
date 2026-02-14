export interface Department {
  _id: string;
  code: 'IT' | 'CS' | 'FE';
  name: 'Information Technology' | 'Computer Science' | 'First Year Engineering';
  description?: string;
  isActive: boolean;
  studentCount?: number;
  teacherCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  department?: string | Department; // Can be string (legacy) or Department object
  semester?: number;
  employeeId?: string;
  studentId?: string;
  subjects?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Teacher {
  _id: string;
  user: string | User;
  employeeId: string;
  name: string;
  primaryDepartment: string | Department; // ObjectId or populated Department
  allowedDepartments?: (string | Department)[]; // For cross-teaching
  department?: string; // Legacy field
  designation: 'Professor' | 'Associate Professor' | 'Assistant Professor' | 'Lecturer';
  qualifications?: string[];
  contactInfo?: {
    staffRoom?: string;
  };
  workload?: {
    maxHoursPerWeek?: number;
    minHoursPerWeek?: number;
  };
  availability?: Array<{
    dayOfWeek: string;
    startTime: string;
    endTime: string;
  }>;
  performanceRating?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  _id: string;
  name: string;
  code: string;
  semester: number;
  department: string | Department; // Can be string (legacy) or Department object
  credits: number;
  type: 'theory' | 'practical' | 'lab';
  syllabus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  _id: string;
  number: string;
  building: string;
  capacity: number;
  type: 'classroom' | 'lab' | 'auditorium';
  department?: string | Department; // Can be string (legacy) or Department object
  equipment: string[];
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TimeSlot {
  _id: string;
  startTime: string;
  endTime: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TimetableEntry {
  _id: string;
  subject: Subject;
  teacher: User | Teacher;
  room: Room;
  timeSlot: TimeSlot;
  semester: number;
  department: string | Department;
  sessionType: 'lecture' | 'practical' | 'lab';
  createdAt: string;
  updatedAt: string;
}

export interface Timetable {
  _id: string;
  name: string;
  semester: number;
  department: string | Department;
  academicYear: string;
  entries: TimetableEntry[];
  status: 'draft' | 'published' | 'archived' | 'Draft' | 'Published' | 'Archived';
  generatedAt?: string;
  publishedAt?: string;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export interface ConflictReport {
  type: 'teacher_conflict' | 'room_conflict' | 'student_conflict';
  message: string;
  entries: TimetableEntry[];
  severity: 'low' | 'medium' | 'high';
}

export interface TimetableGeneration {
  _id: string;
  timetable: Timetable;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  conflicts: ConflictReport[];
  qualityScore: number;
  parameters: {
    semester: number;
    department: string | Department;
    departmentId?: string;
    departmentCode?: 'IT' | 'CS' | 'FE';
    preferences?: any;
  };
  createdAt: string;
  completedAt?: string;
}

export interface DepartmentStats {
  department: {
    code: string;
    name: string;
    isActive: boolean;
  };
  counts: {
    students: number;
    teachers: number;
    courses: number;
    subjects: number;
    rooms: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface TimetableState {
  timetables: Timetable[];
  currentTimetable: Timetable | null;
  generations: TimetableGeneration[];
  currentGeneration: TimetableGeneration | null;
  isLoading: boolean;
  error: string | null;
}
