/**
 * Department Service
 * API client methods for department operations
 */

import  apiClient from './apiClient';
import { Department, DepartmentStats } from '../types';

export interface CreateDepartmentDto {
  code: 'IT' | 'CS' | 'FE';
  name: 'Information Technology' | 'Computer Science' | 'First Year Engineering';
  description?: string;
  isActive?: boolean;
}

export interface UpdateDepartmentDto {
  description?: string;
  isActive?: boolean;
}

class DepartmentService {
  private basePath = '/departments';

  /**
   * Get all departments
   */
  async getAllDepartments(isActive?: boolean): Promise<Department[]> {
    const params = isActive !== undefined ? { isActive: String(isActive) } : {};
    const response = await apiClient.get<{ statusCode: number; data: Department[]; message: string }>(this.basePath, { params });
    console.log('Department API response:', response.data);
    // Extract data array from ApiResponse wrapper
    const departments = response.data.data || response.data as unknown as Department[];
    console.log('Extracted departments:', departments);
    return departments;
  }

  /**
   * Get active departments only
   */
  async getActiveDepartments(): Promise<Department[]> {
    return this.getAllDepartments(true);
  }

  /**
   * Get department by ID
   */
  async getDepartmentById(id: string): Promise<Department> {
    const response = await apiClient.get<Department>(`${this.basePath}/${id}`);
    return response.data;
  }

  /**
   * Get department by code
   */
  async getDepartmentByCode(code: 'IT' | 'CS' | 'FE'): Promise<Department> {
    const response = await apiClient.get<Department>(`${this.basePath}/code/${code}`);
    return response.data;
  }

  /**
   * Create new department (Admin only)
   */
  async createDepartment(data: CreateDepartmentDto): Promise<Department> {
    const response = await apiClient.post<Department>(this.basePath, data);
    return response.data;
  }

  /**
   * Update department (Admin only)
   */
  async updateDepartment(id: string, data: UpdateDepartmentDto): Promise<Department> {
    const response = await apiClient.put<Department>(`${this.basePath}/${id}`, data);
    return response.data;
  }

  /**
   * Delete (deactivate) department (Admin only)
   */
  async deleteDepartment(id: string): Promise<void> {
    await apiClient.delete(`${this.basePath}/${id}`);
  }

  /**
   * Activate department (Admin only)
   */
  async activateDepartment(id: string): Promise<Department> {
    const response = await apiClient.patch<Department>(`${this.basePath}/${id}/activate`);
    return response.data;
  }

  /**
   * Get department statistics
   */
  async getDepartmentStats(id: string): Promise<DepartmentStats> {
    const response = await apiClient.get<DepartmentStats>(`${this.basePath}/${id}/stats`);
    return response.data;
  }

  /**
   * Helper: Get department name from code
   */
  getDepartmentName(code: 'IT' | 'CS' | 'FE'): string {
    const names = {
      IT: 'Information Technology',
      CS: 'Computer Science',
      FE: 'First Year Engineering'
    };
    return names[code];
  }

  /**
   * Helper: Get department code from name
   */
  getDepartmentCode(name: string): 'IT' | 'CS' | 'FE' | null {
    const codes: Record<string, 'IT' | 'CS' | 'FE'> = {
      'Information Technology': 'IT',
      'Computer Science': 'CS',
      'First Year Engineering': 'FE'
    };
    return codes[name] || null;
  }

  /**
   * Helper: Extract department ID from Department object or string
   */
  getDepartmentId(department: string | Department | undefined): string | undefined {
    if (!department) return undefined;
    if (typeof department === 'string') return department;
    return department._id;
  }

  /**
   * Helper: Extract department code from Department object or string
   */
  extractDepartmentCode(department: string | Department | undefined): string | undefined {
    if (!department) return undefined;
    if (typeof department === 'string') return department;
    return department.code;
  }

  /**
   * Helper: Extract department name from Department object or string
   */
  extractDepartmentName(department: string | Department | undefined): string | undefined {
    if (!department) return undefined;
    if (typeof department === 'string') return department;
    return department.name;
  }
}

export const departmentService = new DepartmentService();
export default departmentService;
