import axios from 'axios';
import {
  CourseType,
  DepartmentType,
  RoomType,
  SemesterType,
  TeacherDesignationType
} from '../constants';
import { getApiBaseUrl } from './apiConfig';

const API_BASE_URL = getApiBaseUrl();

// Create axios instance for data management
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Teacher interfaces matching refined schema
export interface Teacher {
  _id?: string;
  employeeId: string;
  name: string;
  user?: {
    _id: string;
    email: string;
  };
  department: DepartmentType;
  designation: TeacherDesignationType;
  qualifications: string[];
  contactInfo: {
    staffRoom?: string;
  };
  workload: {
    maxHoursPerWeek: number;
    minHoursPerWeek: number;
  };
  availability: Array<{
    dayOfWeek: string;
    startTime: string;
    endTime: string;
  }>;
  performanceRating?: number;
}

export interface TeacherForm {
  name: string;
  email: string;
  employeeId: string;
  department: string;
  designation: string;
  qualifications: string[];
  staffRoom: string;
  maxHoursPerWeek: number;
  minHoursPerWeek: number;
}

// Room interfaces matching refined schema
export interface Room {
  _id?: string;
  roomNumber: string;
  floor: number;
  capacity: number;
  type: RoomType;
  availabilityNotes?: string;
}

// Subject interfaces (canonical academic catalog)
export interface Subject {
  _id?: string;
  code: string;
  name: string;
  department: DepartmentType;
  semester: SemesterType; // 1-8
  year: number;
  type: CourseType;
  credits: number;
  hoursPerWeek?: number;
  description?: string;
  isActive?: boolean;
  syllabus: {
    topics: string[];
    syllabusLink?: string;
  };
}

// Backward-compatible aliases
export type Course = Subject;

export interface SubjectForm {
  code: string;
  name: string;
  department: DepartmentType;
  semester: SemesterType;
  year: number;
  type: CourseType;
  credits: number;
  hoursPerWeek?: number;
  description?: string;
  isActive?: boolean;
  syllabus: {
    topics: string[];
    syllabusLink?: string;
  };
}

export type CourseForm = SubjectForm;

const mapSubjectToCoursePayload = (subjectData: Partial<SubjectForm>) => ({
  courseCode: subjectData.code,
  name: subjectData.name,
  department: subjectData.department,
  semester: subjectData.semester,
  year: subjectData.year,
  courseType: subjectData.type === 'Practical' ? 'Lab' : subjectData.type,
  credits: subjectData.credits,
  hoursPerWeek: subjectData.hoursPerWeek,
  isActive: subjectData.isActive,
  syllabus: {
    topics: subjectData.syllabus?.topics || [],
    syllabusLink: subjectData.syllabus?.syllabusLink || ''
  }
});

const mapCourseToSubject = (course: any): Subject => ({
  _id: course._id,
  code: course.courseCode || course.code,
  name: course.name,
  department: course.department,
  semester: course.semester,
  year: course.year || Math.ceil(Number(course.semester || 1) / 2),
  type: (course.courseType === 'Lab' ? 'Practical' : course.courseType) as CourseType,
  credits: Number(course.credits || 0),
  hoursPerWeek: Number(course.hoursPerWeek || 0),
  description: course.description || '',
  isActive: course.isActive !== false,
  syllabus: {
    topics: course.syllabus?.topics || [],
    syllabusLink: course.syllabus?.syllabusLink || ''
  }
});

// Interface for paginated subjects response (like in subjectManagementService)
export interface PaginatedSubjects {
  subjects: Subject[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
}

// Helper function to unwrap API data (copied from subjectManagementService)
// Current backend (subjectController) mistakenly constructs new ApiResponse(statusCode, data, message)
// resulting JSON shape: { success: <statusCode>, message: <actualData>, data: <messageString> }
// Proper shape (ideal) would be: { success: true, message: <messageString>, data: <actualData> }
// This helper attempts to gracefully handle both without breaking if backend is later corrected.
function unwrapApiData<T>(raw: any): T {
  if (!raw) return raw as T;

  // If raw looks already like the target object (has expected fields) return as-is
  if (raw.subjects || raw.code || raw._id) return raw as T;

  // If raw has data property that contains expected fields
  if (raw.data && (raw.data.subjects || raw.data.code || raw.data._id)) {
    return raw.data as T;
  }

  // If raw.message holds the actual payload (current faulty pattern)
  if (raw.message && typeof raw.message === 'object' && !Array.isArray(raw.message)) {
    const msgObj = raw.message;
    if (msgObj.subjects || msgObj.code || msgObj._id || Object.keys(msgObj).length > 1) {
      return msgObj as T;
    }
  }

  // If raw.message holds array data directly
  if (raw.message && Array.isArray(raw.message)) {
    return raw.message as T;
  }

  // Fallback to raw data
  return raw as T;
}

export const dataManagementService = {
  // Teacher methods
  async getTeachers(): Promise<Teacher[]> {
    try {
      // Primary source: Teacher profiles collection (matches timetable generation requirements)
      try {
        const teacherRes = await apiClient.get('/teachers');
        const teacherDocs = teacherRes.data?.data || teacherRes.data || [];

        return teacherDocs.map((t: any) => ({
          _id: t._id,
          name: t.name || t.user?.name || 'Unknown Teacher',
          email: t.user?.email || t.email || '',
          employeeId: t.employeeId || `T${String(t._id).slice(-4)}`,
          // Keep both department fields for compatibility with existing consumers.
          department: t.primaryDepartment || t.department || 'Not Assigned',
          designation: t.designation || 'Teacher',
          qualifications: t.qualifications || [],
          contactInfo: t.contactInfo || { staffRoom: '' },
          workload: {
            maxHoursPerWeek: t.workload?.maxHoursPerWeek || 18,
            minHoursPerWeek: t.workload?.minHoursPerWeek || 8
          },
          availability: t.availability || [],
          user: t.user,
          primaryDepartment: t.primaryDepartment,
          allowedDepartments: t.allowedDepartments || []
        } as any));
      } catch (teacherErr) {
        console.warn('Teacher profiles fetch failed, falling back to users endpoint:', teacherErr);
      }

      // Fallback source: users endpoint filtered by teacher role
      const response = await apiClient.get('/users?role=teacher');
      const teacherUsers = response.data?.data || response.data || [];

      return teacherUsers.map((user: any) => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId || `T${String(user._id).slice(-4)}`,
        department: user.department || 'Not Assigned',
        designation: user.designation || 'Teacher',
        qualifications: user.qualifications || [],
        contactInfo: { staffRoom: user.staffRoom || '' },
        workload: {
          maxHoursPerWeek: user.maxHoursPerWeek || 18,
          minHoursPerWeek: user.minHoursPerWeek || 8
        },
        availability: user.availability || [],
        user: user._id
      }));
    } catch (error) {
      console.error('Error fetching teachers:', error);
      throw error;
    }
  },

  async addTeacher(teacherData: TeacherForm): Promise<Teacher> {
    try {
      // Transform form data to match backend schema
      const payload = {
        name: teacherData.name,
        email: teacherData.email,
        employeeId: teacherData.employeeId,
        department: teacherData.department,
        designation: teacherData.designation,
        qualifications: teacherData.qualifications, // Already an array from the component
        staffRoom: teacherData.staffRoom,
        maxHoursPerWeek: teacherData.maxHoursPerWeek,
        minHoursPerWeek: teacherData.minHoursPerWeek
      };

      const response = await apiClient.post('/data/teachers', payload);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error adding teacher:', error);
      throw error;
    }
  },

  async updateTeacher(id: string, teacherData: Partial<TeacherForm>): Promise<Teacher> {
    try {
      const response = await apiClient.put(`/data/teachers/${id}`, teacherData);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error updating teacher:', error);
      throw error;
    }
  },

  async deleteTeacher(id: string): Promise<void> {
    try {
      await apiClient.delete(`/data/teachers/${id}`);
    } catch (error) {
      console.error('Error deleting teacher:', error);
      throw error;
    }
  },

  // Room methods
  async getRooms(): Promise<Room[]> {
    try {
      const response = await apiClient.get('/data/rooms');
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error fetching rooms:', error);
      throw error;
    }
  },

  async addRoom(roomData: Room): Promise<Room> {
    try {
      const response = await apiClient.post('/data/rooms', roomData);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error adding room:', error);
      throw error;
    }
  },

  async updateRoom(id: string, roomData: Partial<Room>): Promise<Room> {
    try {
      const response = await apiClient.put(`/data/rooms/${id}`, roomData);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error updating room:', error);
      throw error;
    }
  },

  async deleteRoom(id: string): Promise<void> {
    try {
      await apiClient.delete(`/data/rooms/${id}`);
    } catch (error) {
      console.error('Error deleting room:', error);
      throw error;
    }
  },

  // Subject methods
  async getSubjects(): Promise<Subject[]> {
    try {
      console.log('🔍 DataManagement: Fetching subjects from /subjects endpoint...');

      const response = await apiClient.get('/Courses?page=1&limit=1000&sortBy=courseCode&sortOrder=asc');

      console.log('🔍 DataManagement: Raw subject response:', response.data);

      // Handle both correct and legacy ApiResponse shapes
      const unwrapped = unwrapApiData<any>(response.data);
      const courses = Array.isArray(unwrapped)
        ? unwrapped
        : (unwrapped?.courses
          || response.data?.data?.courses
          || response.data?.message?.courses
          || []);

      const subjects = Array.isArray(courses) ? courses.map(mapCourseToSubject) : [];

      console.log('🔍 DataManagement: Extracted subjects:', subjects);
      console.log('🔍 DataManagement: Is array?', Array.isArray(subjects));
      console.log('🔍 DataManagement: Number of subjects found:', subjects.length);

      if (!Array.isArray(subjects)) {
        console.error('❌ DataManagement: subjects is not an array:', subjects);
        return [];
      }

      console.log('✅ DataManagement: Subjects:', subjects);
      return subjects;
    } catch (error) {
      console.error('❌ DataManagement: Error fetching subjects:', error);
      throw new Error('Failed to fetch subjects');
    }
  },

  async addSubject(subjectData: SubjectForm): Promise<Subject> {
    try {
      const response = await apiClient.post('/Courses', mapSubjectToCoursePayload(subjectData));
      const payload = response.data.data || response.data.message || response.data;
      return mapCourseToSubject(payload);
    } catch (error) {
      console.error('Error adding subject:', error);
      throw error;
    }
  },

  async updateSubject(id: string, subjectData: Partial<SubjectForm>): Promise<Subject> {
    try {
      const response = await apiClient.put(`/Courses/${id}`, mapSubjectToCoursePayload(subjectData));
      const payload = response.data.data || response.data.message || response.data;
      return mapCourseToSubject(payload);
    } catch (error) {
      console.error('Error updating subject:', error);
      throw error;
    }
  },

  async deleteSubject(id: string): Promise<void> {
    try {
      await apiClient.delete(`/Courses/${id}`);
    } catch (error) {
      console.error('Error deleting subject:', error);
      throw error;
    }
  },

  // Backward-compatible course methods mapped to subject APIs
  async getCourses(): Promise<Course[]> {
    return this.getSubjects();
  },

  async addCourse(courseData: CourseForm): Promise<Course> {
    return this.addSubject(courseData);
  },

  async updateCourse(id: string, courseData: Partial<CourseForm>): Promise<Course> {
    return this.updateSubject(id, courseData);
  },

  async deleteCourse(id: string): Promise<void> {
    return this.deleteSubject(id);
  },

  // File upload methods
  async uploadFile(dataType: 'teachers' | 'rooms' | 'subjects' | 'courses', file: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const normalizedType = dataType === 'courses' ? 'subjects' : dataType;
      const endpoint = normalizedType === 'subjects' ? '/Courses/import' : `/data/${normalizedType}/upload`;

      const response = await apiClient.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error uploading ${dataType} file:`, error);
      throw error;
    }
  },

  async downloadTemplate(dataType: 'teachers' | 'rooms' | 'subjects' | 'courses'): Promise<void> {
    try {
      const normalizedType = dataType === 'courses' ? 'subjects' : dataType;

      const endpoint = normalizedType === 'subjects'
        ? '/Courses/template'
        : `/data/${normalizedType}/template`;

      const response = await apiClient.get(endpoint, {
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${normalizedType}_template.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Error downloading ${dataType} template:`, error);
      throw error;
    }
  },

  // Export methods
  async exportData(dataType: 'teachers' | 'rooms' | 'subjects' | 'courses', format: 'csv' | 'json' = 'csv'): Promise<void> {
    try {
      const normalizedType = dataType === 'courses' ? 'subjects' : dataType;

      const endpoint = normalizedType === 'subjects'
        ? `/Courses/export?format=${format}`
        : `/data/${normalizedType}/export?format=${format}`;

      const response = await apiClient.get(endpoint, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${normalizedType}_export.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Error exporting ${dataType}:`, error);
      throw error;
    }
  },

  // Bulk operations
  async bulkDelete(dataType: 'teachers' | 'rooms' | 'subjects' | 'courses', ids: string[]): Promise<void> {
    try {
      const normalizedType = dataType === 'courses' ? 'subjects' : dataType;

      const endpoint = normalizedType === 'subjects'
        ? '/Courses/bulk-update'
        : `/data/${normalizedType}/bulk`;

      if (normalizedType === 'subjects') {
        await apiClient.patch(endpoint, {
          courseIds: ids,
          action: 'delete'
        });
        return;
      }

      await apiClient.delete(endpoint, {
        data: { ids }
      });
    } catch (error) {
      console.error(`Error bulk deleting ${dataType}:`, error);
      throw error;
    }
  },

  // Validation methods
  async validateData(dataType: 'teachers' | 'rooms' | 'subjects' | 'courses', data: any[]): Promise<any> {
    try {
      const normalizedType = dataType === 'courses' ? 'subjects' : dataType;
      if (normalizedType === 'subjects') {
        return {
          success: true,
          data: {
            valid: true,
            errors: [],
            warnings: []
          }
        };
      }

      const response = await apiClient.post(`/data/${normalizedType}/validate`, { data });
      return response.data;
    } catch (error) {
      console.error(`Error validating ${dataType} data:`, error);
      throw error;
    }
  }
};

export default dataManagementService;
