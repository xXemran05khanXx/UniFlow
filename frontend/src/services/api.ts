import axios, { AxiosResponse } from 'axios';
import { 
  User, 
  Subject, 
  Room, 
  TimeSlot, 
  Timetable, 
  TimetableGeneration,
  ApiResponse 
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// Request interceptor to add auth token
api.interceptors.request.use(
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
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> => {
    const response: AxiosResponse<ApiResponse<{ user: User; token: string }>> = await api.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  register: async (userData: Partial<User> & { password: string }): Promise<ApiResponse<{ user: User; token: string }>> => {
    const response: AxiosResponse<ApiResponse<{ user: User; token: string }>> = await api.post('/auth/register', userData);
    return response.data;
  },

  logout: async (): Promise<ApiResponse<null>> => {
    const response: AxiosResponse<ApiResponse<null>> = await api.post('/auth/logout');
    return response.data;
  },

  getProfile: async (): Promise<ApiResponse<User>> => {
    const response: AxiosResponse<ApiResponse<User>> = await api.get('/auth/profile');
    return response.data;
  },
};

// Users API
export const usersAPI = {
  getAll: async (): Promise<ApiResponse<User[]>> => {
    const response: AxiosResponse<ApiResponse<User[]>> = await api.get('/users');
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<User>> => {
    const response: AxiosResponse<ApiResponse<User>> = await api.get(`/users/${id}`);
    return response.data;
  },

  create: async (userData: Partial<User>): Promise<ApiResponse<User>> => {
    const response: AxiosResponse<ApiResponse<User>> = await api.post('/users', userData);
    return response.data;
  },

  update: async (id: string, userData: Partial<User>): Promise<ApiResponse<User>> => {
    const response: AxiosResponse<ApiResponse<User>> = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response: AxiosResponse<ApiResponse<null>> = await api.delete(`/users/${id}`);
    return response.data;
  },
};

// Subjects API
export const subjectsAPI = {
  getAll: async (): Promise<ApiResponse<Subject[]>> => {
    const response: AxiosResponse<ApiResponse<Subject[]>> = await api.get('/subjects');
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Subject>> => {
    const response: AxiosResponse<ApiResponse<Subject>> = await api.get(`/subjects/${id}`);
    return response.data;
  },

  getByDepartment: async (department: string): Promise<ApiResponse<Subject[]>> => {
    const response: AxiosResponse<ApiResponse<Subject[]>> = await api.get(`/subjects/department/${department}`);
    return response.data;
  },

  getBySemester: async (semester: number): Promise<ApiResponse<Subject[]>> => {
    const response: AxiosResponse<ApiResponse<Subject[]>> = await api.get(`/subjects/semester/${semester}`);
    return response.data;
  },

  create: async (subjectData: Partial<Subject>): Promise<ApiResponse<Subject>> => {
    const response: AxiosResponse<ApiResponse<Subject>> = await api.post('/subjects', subjectData);
    return response.data;
  },

  update: async (id: string, subjectData: Partial<Subject>): Promise<ApiResponse<Subject>> => {
    const response: AxiosResponse<ApiResponse<Subject>> = await api.put(`/subjects/${id}`, subjectData);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response: AxiosResponse<ApiResponse<null>> = await api.delete(`/subjects/${id}`);
    return response.data;
  },

  uploadSyllabus: async (id: string, file: File): Promise<ApiResponse<Subject>> => {
    const formData = new FormData();
    formData.append('syllabus', file);
    const response: AxiosResponse<ApiResponse<Subject>> = await api.post(
      `/subjects/${id}/syllabus`, 
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },
};

// Rooms API
export const roomsAPI = {
  getAll: async (): Promise<ApiResponse<Room[]>> => {
    const response: AxiosResponse<ApiResponse<Room[]>> = await api.get('/rooms');
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Room>> => {
    const response: AxiosResponse<ApiResponse<Room>> = await api.get(`/rooms/${id}`);
    return response.data;
  },

  create: async (roomData: Partial<Room>): Promise<ApiResponse<Room>> => {
    const response: AxiosResponse<ApiResponse<Room>> = await api.post('/rooms', roomData);
    return response.data;
  },

  update: async (id: string, roomData: Partial<Room>): Promise<ApiResponse<Room>> => {
    const response: AxiosResponse<ApiResponse<Room>> = await api.put(`/rooms/${id}`, roomData);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response: AxiosResponse<ApiResponse<null>> = await api.delete(`/rooms/${id}`);
    return response.data;
  },
};

// Time Slots API
export const timeSlotsAPI = {
  getAll: async (): Promise<ApiResponse<TimeSlot[]>> => {
    const response: AxiosResponse<ApiResponse<TimeSlot[]>> = await api.get('/timeslots');
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<TimeSlot>> => {
    const response: AxiosResponse<ApiResponse<TimeSlot>> = await api.get(`/timeslots/${id}`);
    return response.data;
  },

  create: async (timeSlotData: Partial<TimeSlot>): Promise<ApiResponse<TimeSlot>> => {
    const response: AxiosResponse<ApiResponse<TimeSlot>> = await api.post('/timeslots', timeSlotData);
    return response.data;
  },

  update: async (id: string, timeSlotData: Partial<TimeSlot>): Promise<ApiResponse<TimeSlot>> => {
    const response: AxiosResponse<ApiResponse<TimeSlot>> = await api.put(`/timeslots/${id}`, timeSlotData);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response: AxiosResponse<ApiResponse<null>> = await api.delete(`/timeslots/${id}`);
    return response.data;
  },
};

// Timetables API
export const timetablesAPI = {
  getAll: async (): Promise<ApiResponse<Timetable[]>> => {
    const response: AxiosResponse<ApiResponse<Timetable[]>> = await api.get('/timetables');
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Timetable>> => {
    const response: AxiosResponse<ApiResponse<Timetable>> = await api.get(`/timetables/${id}`);
    return response.data;
  },

  getByTeacher: async (teacherId: string): Promise<ApiResponse<Timetable[]>> => {
    const response: AxiosResponse<ApiResponse<Timetable[]>> = await api.get(`/timetables/teacher/${teacherId}`);
    return response.data;
  },

  getByStudent: async (studentId: string): Promise<ApiResponse<Timetable[]>> => {
    const response: AxiosResponse<ApiResponse<Timetable[]>> = await api.get(`/timetables/student/${studentId}`);
    return response.data;
  },

  create: async (timetableData: Partial<Timetable>): Promise<ApiResponse<Timetable>> => {
    const response: AxiosResponse<ApiResponse<Timetable>> = await api.post('/timetables', timetableData);
    return response.data;
  },

  update: async (id: string, timetableData: Partial<Timetable>): Promise<ApiResponse<Timetable>> => {
    const response: AxiosResponse<ApiResponse<Timetable>> = await api.put(`/timetables/${id}`, timetableData);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response: AxiosResponse<ApiResponse<null>> = await api.delete(`/timetables/${id}`);
    return response.data;
  },

  publish: async (id: string): Promise<ApiResponse<Timetable>> => {
    const response: AxiosResponse<ApiResponse<Timetable>> = await api.post(`/timetables/${id}/publish`);
    return response.data;
  },

  generate: async (parameters: {
    semester: number;
    department: string;
    preferences?: any;
  }): Promise<ApiResponse<TimetableGeneration>> => {
    const response: AxiosResponse<ApiResponse<TimetableGeneration>> = await api.post('/timetables/generate', parameters);
    return response.data;
  },

  getGeneration: async (id: string): Promise<ApiResponse<TimetableGeneration>> => {
    const response: AxiosResponse<ApiResponse<TimetableGeneration>> = await api.get(`/timetables/generation/${id}`);
    return response.data;
  },

  getGenerations: async (): Promise<ApiResponse<TimetableGeneration[]>> => {
    const response: AxiosResponse<ApiResponse<TimetableGeneration[]>> = await api.get('/timetables/generations');
    return response.data;
  },

  export: async (id: string, format: 'pdf' | 'excel'): Promise<Blob> => {
    const response = await api.get(`/timetables/${id}/export?format=${format}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default api;
