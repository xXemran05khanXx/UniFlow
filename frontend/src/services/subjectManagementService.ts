/**
 * Subject Management Service
 * Handles all subject-related API operations for admin users
 */

import axios, { AxiosResponse } from 'axios';
import { 
  DEPARTMENTS, 
  DEPARTMENT_LIST, 
  DepartmentType, 
  SEMESTERS, 
  SemesterType,
  COURSE_TYPES,
  COURSE_TYPE_LIST,
  CourseType
} from '../constants';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// API client with request/response interceptors
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
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
  (error) => Promise.reject(error)
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

// Subject interfaces
export interface Subject {
  _id?: string;
  code: string;
  name: string;
  credits: number;
  semester: SemesterType;
  department: DepartmentType;
  year: number;
  type: CourseType;
  description?: string;
  prerequisites?: string[];
  syllabus?: {
    modules: Array<{
      title: string;
      topics: string[];
      hours: number;
    }>;
    references: string[];
    outcomes: string[];
  };
  isActive: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubjectFilters {
  search?: string;
  department?: string;
  semester?: number;
  year?: number;
  type?: string;
  isActive?: boolean;
  credits?: number;
}

export interface SubjectStats {
  totalSubjects: number;
  activeSubjects: number;
  inactiveSubjects: number;
  departmentDistribution: Record<string, number>;
  semesterDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
  creditDistribution: Record<string, number>;
  averageCredits: number;
}

export interface PaginatedSubjects {
  subjects: Subject[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface BulkSubjectOperation {
  subjectIds: string[];
  action: 'activate' | 'deactivate' | 'delete' | 'updateDepartment' | 'updateSemester';
  data?: {
    department?: string;
    semester?: number;
    isActive?: boolean;
  };
}

// Subject Management Service Class
// Helper to unwrap various backend ApiResponse shapes
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

  return raw as T; // Fallback
}

class SubjectManagementService {
  
  /**
   * Get all subjects with optional filtering and pagination
   */
  async getAllSubjects(
    filters: SubjectFilters = {},
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'name',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<PaginatedSubjects> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        )
      });

      const response: AxiosResponse<any> = await apiClient.get(
        `/subjects?${params.toString()}`
      );
      return unwrapApiData<PaginatedSubjects>(response.data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      throw new Error('Failed to fetch subjects');
    }
  }

  /**
   * Get a single subject by ID
   */
  async getSubjectById(id: string): Promise<Subject> {
    try {
      const response: AxiosResponse<any> = await apiClient.get(`/subjects/${id}`);
      return unwrapApiData<Subject>(response.data);
    } catch (error) {
      console.error('Error fetching subject:', error);
      throw new Error('Failed to fetch subject details');
    }
  }

  /**
   * Create a new subject
   */
  async createSubject(subjectData: Omit<Subject, '_id' | 'createdAt' | 'updatedAt'>): Promise<Subject> {
    try {
      const response: AxiosResponse<any> = await apiClient.post('/subjects', subjectData);
      return unwrapApiData<Subject>(response.data);
    } catch (error) {
      console.error('Error creating subject:', error);
      throw new Error('Failed to create subject');
    }
  }

  /**
   * Update an existing subject
   */
  async updateSubject(id: string, subjectData: Partial<Subject>): Promise<Subject> {
    try {
      const response: AxiosResponse<any> = await apiClient.put(`/subjects/${id}`, subjectData);
      return unwrapApiData<Subject>(response.data);
    } catch (error) {
      console.error('Error updating subject:', error);
      throw new Error('Failed to update subject');
    }
  }

  /**
   * Delete a subject
   */
  async deleteSubject(id: string): Promise<void> {
    try {
      await apiClient.delete(`/subjects/${id}`);
    } catch (error) {
      console.error('Error deleting subject:', error);
      throw new Error('Failed to delete subject');
    }
  }

  /**
   * Activate/Deactivate a subject
   */
  async toggleSubjectStatus(id: string, isActive: boolean): Promise<Subject> {
    try {
      const response: AxiosResponse<any> = await apiClient.patch(
        `/subjects/${id}/${isActive ? 'activate' : 'deactivate'}`
      );
      return unwrapApiData<Subject>(response.data);
    } catch (error) {
      console.error('Error toggling subject status:', error);
      throw new Error('Failed to update subject status');
    }
  }

  /**
   * Get subject statistics
   */
  async getSubjectStats(): Promise<SubjectStats> {
    try {
      const response: AxiosResponse<any> = await apiClient.get('/subjects/stats');
      return unwrapApiData<SubjectStats>(response.data);
    } catch (error) {
      console.error('Error fetching subject statistics:', error);
      throw new Error('Failed to fetch subject statistics');
    }
  }

  /**
   * Bulk operations on multiple subjects
   */
  async bulkUpdateSubjects(operation: BulkSubjectOperation): Promise<{ 
    success: number; 
    failed: number; 
    errors: string[] 
  }> {
    try {
      const response = await apiClient.patch('/subjects/bulk-update', operation);
      return unwrapApiData<{ success: number; failed: number; errors: string[] }>(response.data);
    } catch (error) {
      console.error('Error performing bulk operation:', error);
      throw new Error('Failed to perform bulk operation');
    }
  }

  /**
   * Import subjects from CSV
   */
  async importSubjects(file: File): Promise<{
    imported: number;
    failed: number;
    errors: string[];
  }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/subjects/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return unwrapApiData(response.data);
    } catch (error) {
      console.error('Error importing subjects:', error);
      throw new Error('Failed to import subjects');
    }
  }

  /**
   * Export subjects to CSV/JSON
   */
  async exportSubjects(
    format: 'csv' | 'json' = 'csv',
    filters: SubjectFilters = {}
  ): Promise<Blob> {
    try {
      const params = new URLSearchParams({
        format,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        )
      });

      const response = await apiClient.get(`/subjects/export?${params.toString()}`, {
        responseType: 'blob',
      });
      return unwrapApiData(response.data);
    } catch (error) {
      console.error('Error exporting subjects:', error);
      throw new Error('Failed to export subjects');
    }
  }

  /**
   * Get subject template for CSV import
   */
  async getSubjectTemplate(): Promise<Blob> {
    try {
      const response = await apiClient.get('/subjects/template', {
        responseType: 'blob',
      });
      return unwrapApiData(response.data);
    } catch (error) {
      console.error('Error downloading template:', error);
      throw new Error('Failed to download template');
    }
  }

  /**
   * Get departments list
   */
  async getDepartments(): Promise<string[]> {
    try {
      const response = await apiClient.get('/subjects/departments');
      return unwrapApiData<string[]>(response.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
      return [
        'Computer Science',
        'Information Technology',
        'Electronics & Telecommunication',
        'Electrical Engineering',
        'Mechanical Engineering',
        'Civil Engineering',
        'Chemical Engineering',
        'Instrumentation Engineering'
      ];
    }
  }

  /**
   * Duplicate a subject
   */
  async duplicateSubject(id: string, newCode: string): Promise<Subject> {
    try {
      const response: AxiosResponse<any> = await apiClient.post(
        `/subjects/${id}/duplicate`,
        { newCode }
      );
      return unwrapApiData<Subject>(response.data);
    } catch (error) {
      console.error('Error duplicating subject:', error);
      throw new Error('Failed to duplicate subject');
    }
  }

  /**
   * Get subjects by department and semester
   */
  async getSubjectsByDepartmentAndSemester(
    department: string,
    semester: number
  ): Promise<Subject[]> {
    try {
      const response: AxiosResponse<any> = await apiClient.get(
        `/subjects/department/${department}/semester/${semester}`
      );
      return unwrapApiData<Subject[]>(response.data);
    } catch (error) {
      console.error('Error fetching subjects by department and semester:', error);
      throw new Error('Failed to fetch subjects');
    }
  }
}

// Export singleton instance
export const subjectManagementService = new SubjectManagementService();
export default subjectManagementService;
