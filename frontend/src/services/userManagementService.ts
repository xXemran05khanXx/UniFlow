import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance for user management
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

// User interfaces
export interface User {
  _id?: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  department?: string | { _id: string; name: string; code: string };
  semester?: number;
  isActive: boolean;
  isEmailVerified: boolean;
  avatar?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    dateOfBirth?: Date;
    bio?: string;
    location?: string;
    website?: string;
  };
  preferences?: {
    theme: 'light' | 'dark' | 'auto';
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    language: string;
  };
  lastLogin?: Date;
  loginAttempts?: number;
  lockUntil?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserForm {
  name: string;
  email: string;
  password?: string;
  role: string;
  department?: string;
  semester?: number;
  isActive: boolean;
  profile: {
    firstName: string;
    lastName: string;
    phone: string;
    bio: string;
    location: string;
    website: string;
  };
}

export interface UserFilters {
  role?: string;
  isActive?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminUsers: number;
  teacherUsers: number;
  studentUsers: number;
  recentSignups: number;
}

export const userManagementService = {
  // User CRUD operations
  async getUsers(filters: UserFilters = {}): Promise<{ users: User[]; total: number; page: number; pages: number }> {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await apiClient.get(`/users?${params.toString()}`);
      return {
        users: response.data.data || response.data,
        total: response.data.total || 0,
        page: response.data.page || 1,
        pages: response.data.pages || 1
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  async getUser(id: string): Promise<User> {
    try {
      const response = await apiClient.get(`/users/${id}`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  },

  async createUser(userData: UserForm): Promise<User> {
    try {
      const response = await apiClient.post('/users', userData);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  async updateUser(id: string, userData: Partial<UserForm>): Promise<User> {
    try {
      const response = await apiClient.put(`/users/${id}`, userData);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  async deleteUser(id: string): Promise<void> {
    try {
      await apiClient.delete(`/users/${id}`);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  // User status management
  async activateUser(id: string): Promise<User> {
    try {
      const response = await apiClient.patch(`/users/${id}/activate`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error activating user:', error);
      throw error;
    }
  },

  async deactivateUser(id: string): Promise<User> {
    try {
      const response = await apiClient.patch(`/users/${id}/deactivate`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error;
    }
  },

  async unlockUser(id: string): Promise<User> {
    try {
      const response = await apiClient.patch(`/users/${id}/unlock`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error unlocking user:', error);
      throw error;
    }
  },

  async resetUserPassword(id: string): Promise<{ tempPassword: string }> {
    try {
      const response = await apiClient.patch(`/users/${id}/reset-password`);
      return response.data;
    } catch (error) {
      console.error('Error resetting user password:', error);
      throw error;
    }
  },

  // Bulk operations
  async bulkUpdateUsers(userIds: string[], updates: Partial<UserForm>): Promise<void> {
    try {
      await apiClient.patch('/users/bulk-update', {
        userIds,
        updates
      });
    } catch (error) {
      console.error('Error bulk updating users:', error);
      throw error;
    }
  },

  async bulkDeleteUsers(userIds: string[]): Promise<void> {
    try {
      await apiClient.delete('/users/bulk-delete', {
        data: { userIds }
      });
    } catch (error) {
      console.error('Error bulk deleting users:', error);
      throw error;
    }
  },

  // Statistics and analytics
  async getUserStats(): Promise<UserStats> {
    try {
      const response = await apiClient.get('/users/stats');
      return response.data.data || response.data;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  },

  // Export functionality
  async exportUsers(filters: UserFilters = {}, format: 'csv' | 'json' = 'csv'): Promise<void> {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
      params.append('format', format);

      const response = await apiClient.get(`/users/export?${params.toString()}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users_export.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting users:', error);
      throw error;
    }
  },

  // Import functionality
  async importUsers(file: File): Promise<{ success: number; errors: string[] }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post('/users/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error importing users:', error);
      throw error;
    }
  },

  // Template download
  async downloadUserTemplate(): Promise<void> {
    try {
      const response = await apiClient.get('/users/template', {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'users_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading user template:', error);
      throw error;
    }
  }
};

export default userManagementService;
