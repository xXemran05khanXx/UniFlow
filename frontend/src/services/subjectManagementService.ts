/**
 * Subject Management Service
 * Handles all subject-related API operations for admin users
 */

import axios, { AxiosResponse } from 'axios';
import {
  CourseType,
  DepartmentType,
  SemesterType
} from '../constants';
import { getApiBaseUrl } from './apiConfig';

const API_BASE_URL = getApiBaseUrl();

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
  department: DepartmentType | string | { _id?: string; name?: string; code?: string; coursecode?: string };
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

function mapCourseTypeFromApi(type?: string): CourseType {
  if (!type) return 'Theory' as CourseType;
  if (type === 'Lab') return 'Practical' as CourseType;
  return type as CourseType;
}

function mapCourseTypeToApi(type?: string): string | undefined {
  if (!type) return undefined;
  if (type === 'Practical') return 'Lab';
  return type;
}

function mapCourseToSubject(course: any): Subject {
  const semester = Number(course?.semester || 1) as SemesterType;
  return {
    _id: course?._id,
    code: course?.courseCode || course?.code || '',
    name: course?.name || '',
    credits: Number(course?.credits || 0),
    semester,
    department: course?.department,
    year: Number(course?.year || Math.ceil(semester / 2)),
    type: mapCourseTypeFromApi(course?.courseType || course?.type),
    description: Array.isArray(course?.syllabus?.topics) ? course.syllabus.topics.join(', ') : '',
    prerequisites: course?.prerequisites || [],
    syllabus: course?.syllabus,
    isActive: course?.isActive !== false,
    createdBy: course?.createdBy,
    updatedBy: course?.updatedBy,
    createdAt: course?.createdAt,
    updatedAt: course?.updatedAt,
  };
}

function mapSubjectToCoursePayload(subjectData: Partial<Subject>) {
  const apiType = mapCourseTypeToApi(subjectData.type);
  const payload: any = {
    courseCode: subjectData.code,
    name: subjectData.name,
    department: subjectData.department,
    semester: subjectData.semester,
    courseType: apiType,
    credits: subjectData.credits,
    hoursPerWeek: subjectData.credits,
    year: subjectData.year,
    isActive: subjectData.isActive,
    prerequisites: subjectData.prerequisites || [],
  };

  if (subjectData.description) {
    payload.syllabus = {
      topics: [subjectData.description],
      syllabusLink: ''
    };
  }

  return Object.fromEntries(
    Object.entries(payload).filter(([_, v]) => v !== undefined)
  );
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
      const normalizedFilters: Record<string, any> = {
        ...filters,
        courseType: filters.type ? mapCourseTypeToApi(filters.type) : undefined,
        type: undefined,
      };

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: sortBy === 'code' ? 'courseCode' : sortBy,
        sortOrder,
        ...Object.fromEntries(
          Object.entries(normalizedFilters).filter(([_, value]) => value !== undefined && value !== '')
        )
      });

      const response: AxiosResponse<any> = await apiClient.get(
        `/Courses?${params.toString()}`
      );

      const payload = unwrapApiData<any>(response.data);
      const courses = payload?.courses || [];

      return {
        subjects: courses.map(mapCourseToSubject),
        totalCount: Number(payload?.totalCount || 0),
        currentPage: Number(payload?.currentPage || page),
        totalPages: Number(payload?.totalPages || 1),
        hasNextPage: Boolean(payload?.hasNextPage),
        hasPrevPage: Boolean(payload?.hasPrevPage),
      };
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
      const response: AxiosResponse<any> = await apiClient.get(`/Courses/${id}`);
      return mapCourseToSubject(unwrapApiData<any>(response.data));
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
      const response: AxiosResponse<any> = await apiClient.post('/Courses', mapSubjectToCoursePayload(subjectData));
      return mapCourseToSubject(unwrapApiData<any>(response.data));
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
      const response: AxiosResponse<any> = await apiClient.put(`/Courses/${id}`, mapSubjectToCoursePayload(subjectData));
      return mapCourseToSubject(unwrapApiData<any>(response.data));
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
      await apiClient.delete(`/Courses/${id}`);
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
        `/Courses/${id}/${isActive ? 'activate' : 'deactivate'}`
      );
      return mapCourseToSubject(unwrapApiData<any>(response.data));
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
      const response: AxiosResponse<any> = await apiClient.get('/Courses?page=1&limit=1000&sortBy=courseCode&sortOrder=asc');
      const payload = unwrapApiData<any>(response.data);
      const courses: Subject[] = (payload?.courses || []).map((c: any) => mapCourseToSubject(c));

      const totalSubjects = courses.length;
      const activeSubjects = courses.filter((s: Subject) => s.isActive).length;
      const inactiveSubjects = totalSubjects - activeSubjects;

      const departmentDistribution: Record<string, number> = {};
      const semesterDistribution: Record<string, number> = {};
      const typeDistribution: Record<string, number> = {};
      const creditDistribution: Record<string, number> = {};

      courses.forEach((course: Subject) => {
        const dept = typeof course.department === 'object'
          ? (course.department?.name || course.department?.code || course.department?.coursecode || 'Unknown')
          : (course.department || 'Unknown');
        departmentDistribution[dept] = (departmentDistribution[dept] || 0) + 1;

        const sem = `Sem ${course.semester}`;
        semesterDistribution[sem] = (semesterDistribution[sem] || 0) + 1;

        typeDistribution[course.type] = (typeDistribution[course.type] || 0) + 1;

        const creditsKey = String(course.credits || 0);
        creditDistribution[creditsKey] = (creditDistribution[creditsKey] || 0) + 1;
      });

      const averageCredits = totalSubjects
        ? courses.reduce((sum: number, c: Subject) => sum + (Number(c.credits) || 0), 0) / totalSubjects
        : 0;

      return {
        totalSubjects,
        activeSubjects,
        inactiveSubjects,
        departmentDistribution,
        semesterDistribution,
        typeDistribution,
        creditDistribution,
        averageCredits,
      };
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
      if (operation.action === 'delete') {
        const results = await Promise.allSettled(
          operation.subjectIds.map((id) => apiClient.delete(`/Courses/${id}`))
        );
        const success = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results.length - success;
        return {
          success,
          failed,
          errors: failed ? ['Some courses could not be deleted'] : []
        };
      }

      const response = await apiClient.patch('/Courses/bulk-update', {
        courseIds: operation.subjectIds,
        action: operation.action,
        data: operation.data
      });

      const payload = unwrapApiData<any>(response.data);
      const modified = Number(payload?.modifiedCount || payload?.nModified || 0);
      return {
        success: modified,
        failed: Math.max(0, operation.subjectIds.length - modified),
        errors: []
      };
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

      const response = await apiClient.post('/Courses/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const payload = unwrapApiData<any>(response.data);
      return {
        imported: Number(payload?.imported || 0),
        failed: Number(payload?.failed || 0),
        errors: payload?.errors || []
      };
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
        ...(filters.type ? { courseType: mapCourseTypeToApi(filters.type) as string } : {}),
        ...Object.fromEntries(
          Object.entries(filters)
            .filter(([key, value]) => key !== 'type' && value !== undefined && value !== '')
        )
      });

      const response = await apiClient.get(`/Courses/export?${params.toString()}`, {
        responseType: 'blob',
      });
      return response.data;
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
      const response = await apiClient.get('/Courses/template', {
        responseType: 'blob',
      });
      return response.data;
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
      const response = await apiClient.get('/departments');
      const payload = unwrapApiData<any>(response.data);
      const list = Array.isArray(payload) ? payload : payload?.departments || payload?.data || [];
      return list.map((d: any) => d?.name || d?.coursecode || d?.code).filter(Boolean);
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
        `/Courses/${id}/duplicate`,
        { newCourseCode: newCode }
      );
      return mapCourseToSubject(unwrapApiData<any>(response.data));
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
        `/Courses/department/${department}/semester/${semester}`
      );
      const payload = unwrapApiData<any>(response.data);
      return (Array.isArray(payload) ? payload : []).map(mapCourseToSubject);
    } catch (error) {
      console.error('Error fetching subjects by department and semester:', error);
      throw new Error('Failed to fetch subjects');
    }
  }
}

// Export singleton instance
export const subjectManagementService = new SubjectManagementService();
export default subjectManagementService;
