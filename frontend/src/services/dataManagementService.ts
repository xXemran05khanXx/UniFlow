import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance for data management
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
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

export const dataManagementService = {
  // Teacher methods
  async getTeachers(): Promise<Teacher[]> {
    try {
      const response = await apiClient.get('/data/teachers');
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error fetching teachers:', error);
      throw error;
    }
  },

  async addTeacher(teacherData: TeacherForm): Promise<Teacher> {
    try {
      // Transform form data to match backend schema
      const payload = {
        employeeId: teacherData.employeeId,
        name: teacherData.name,
        department: teacherData.department,
        designation: teacherData.designation,
        qualifications: teacherData.qualifications,
        contactInfo: {
          staffRoom: teacherData.staffRoom
        },
        workload: {
          maxHoursPerWeek: teacherData.maxHoursPerWeek,
          minHoursPerWeek: teacherData.minHoursPerWeek
        },
        // Create user account
        user: {
          email: teacherData.email,
          password: 'defaultPassword123', // You might want to generate this or require it
          role: 'teacher'
        }
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
      const response = await apiClient.get('/data/courses');
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error fetching courses:', error);
      throw error;
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
