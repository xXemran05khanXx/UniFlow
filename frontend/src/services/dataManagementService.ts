import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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
  department: 'Computer' | 'IT' | 'EXTC' | 'Mechanical' | 'Civil' | 'AI & DS' | 'First Year';
  designation: 'Professor' | 'Associate Professor' | 'Assistant Professor';
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
  type: 'Theory Classroom' | 'Computer Lab' | 'Electronics Lab' | 'Mechanical Workshop' | 'Seminar Hall' | 'Auditorium';
  availabilityNotes?: string;
}

// Course interfaces matching refined schema
export interface Course {
  _id?: string;
  courseCode: string;
  courseName: string;
  department: 'Computer' | 'IT' | 'EXTC' | 'Mechanical' | 'Civil' | 'AI & DS' | 'First Year';
  semester: number; // 1-8
  courseType: 'Theory' | 'Practical' | 'Tutorial';
  credits: number;
  hoursPerWeek: number;
  syllabus: {
    topics: string[];
    syllabusLink?: string;
  };
}

export interface CourseForm {
  courseCode: string;
  courseName: string;
  department: string;
  semester: number;
  courseType: string;
  credits: number;
  hoursPerWeek: number;
  syllabus: {
    topics: string[];
    syllabusLink?: string;
  };
}

// Interface for paginated subjects response (like in subjectManagementService)
export interface PaginatedSubjects {
  subjects: Course[];
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
      // Use users endpoint to get teacher users since Teachers collection is empty
      const response = await apiClient.get('/users?role=teacher');
      const teacherUsers = response.data.data || response.data;
      
      // Transform user data to teacher format for display
      return teacherUsers.map((user: any) => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId || `T${user._id.slice(-4)}`,
        department: user.department || 'Not Assigned',
        designation: user.designation || 'Teacher',
        qualifications: user.qualifications || [],
        contactInfo: { staffRoom: user.staffRoom || '' },
        workload: { 
          maxHoursPerWeek: user.maxHoursPerWeek || 18,
          minHoursPerWeek: user.minHoursPerWeek || 8
        },
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

  // Course methods  
  async getCourses(): Promise<Course[]> {
    try {
      console.log('🔍 DataManagement: Fetching courses from subjects endpoint...');
      
      // Use subjects endpoint with pagination like Subject Management service
      const response = await apiClient.get('/subjects?page=1&limit=100&sortBy=name&sortOrder=asc');
      
      console.log('🔍 DataManagement: Raw response:', response.data);
      
      // Use unwrapApiData to handle the backend's inconsistent response format
      const paginatedData = unwrapApiData<PaginatedSubjects>(response.data);
      
      console.log('🔍 DataManagement: Unwrapped data:', paginatedData);
      
      // Extract subjects array from paginated response
      const subjects = paginatedData.subjects || [];
      
      console.log('🔍 DataManagement: Extracted subjects:', subjects);
      console.log('🔍 DataManagement: Is array?', Array.isArray(subjects));
      console.log('🔍 DataManagement: Number of subjects found:', subjects.length);
      
      if (!Array.isArray(subjects)) {
        console.error('❌ DataManagement: subjects is not an array:', subjects);
        return [];
      }
      
      // Transform subject data to course format for display
      const courses = subjects.map((subject: any) => ({
        _id: subject._id,
        courseCode: subject.code,
        courseName: subject.name,
        department: subject.department,
        semester: subject.semester,
        courseType: subject.type || 'Theory',
        credits: subject.credits,
        hoursPerWeek: subject.hoursPerWeek || 0,
        syllabus: {
          topics: Array.isArray(subject.syllabus?.topics) ? subject.syllabus.topics : [],
          syllabusLink: subject.syllabus?.syllabusLink || ''
        }
      }));
      
      console.log('✅ DataManagement: Transformed courses:', courses);
      return courses;
    } catch (error) {
      console.error('❌ DataManagement: Error fetching courses:', error);
      throw new Error('Failed to fetch courses');
    }
  },

  async addCourse(courseData: CourseForm): Promise<Course> {
    try {
      const response = await apiClient.post('/data/courses', courseData);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error adding course:', error);
      throw error;
    }
  },

  async updateCourse(id: string, courseData: Partial<CourseForm>): Promise<Course> {
    try {
      const response = await apiClient.put(`/data/courses/${id}`, courseData);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error updating course:', error);
      throw error;
    }
  },

  async deleteCourse(id: string): Promise<void> {
    try {
      await apiClient.delete(`/data/courses/${id}`);
    } catch (error) {
      console.error('Error deleting course:', error);
      throw error;
    }
  },

  // File upload methods
  async uploadFile(dataType: 'teachers' | 'rooms' | 'courses', file: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post(`/data/${dataType}/upload`, formData, {
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

  async downloadTemplate(dataType: 'teachers' | 'rooms' | 'courses'): Promise<void> {
    try {
      const response = await apiClient.get(`/data/${dataType}/template`, {
        responseType: 'blob',
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${dataType}_template.csv`);
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
  async exportData(dataType: 'teachers' | 'rooms' | 'courses', format: 'csv' | 'json' = 'csv'): Promise<void> {
    try {
      const response = await apiClient.get(`/data/${dataType}/export?format=${format}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${dataType}_export.${format}`);
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
  async bulkDelete(dataType: 'teachers' | 'rooms' | 'courses', ids: string[]): Promise<void> {
    try {
      await apiClient.delete(`/data/${dataType}/bulk`, {
        data: { ids }
      });
    } catch (error) {
      console.error(`Error bulk deleting ${dataType}:`, error);
      throw error;
    }
  },

  // Validation methods
  async validateData(dataType: 'teachers' | 'rooms' | 'courses', data: any[]): Promise<any> {
    try {
      const response = await apiClient.post(`/data/${dataType}/validate`, { data });
      return response.data;
    } catch (error) {
      console.error(`Error validating ${dataType} data:`, error);
      throw error;
    }
  }
};

export default dataManagementService;
