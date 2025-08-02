/**
 * Room Management Service
 * Handles all room-related API operations for admin users
 */

import axios, { AxiosResponse } from 'axios';

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

// Room interfaces
export interface Room {
  _id?: string;
  roomNumber: string;
  name: string;
  building: string;
  floor: number;
  capacity: number;
  type: 'classroom' | 'laboratory' | 'lecture_hall' | 'seminar_room' | 'auditorium' | 'library' | 'office' | 'other';
  department?: string;
  features: string[];
  equipment: Array<{
    name: string;
    quantity: number;
    condition: 'excellent' | 'good' | 'fair' | 'poor' | 'needs_repair';
  }>;
  accessibility: {
    wheelchairAccessible: boolean;
    elevatorAccess: boolean;
    disabledParking: boolean;
    accessibleRestroom: boolean;
  };
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  airConditioning: boolean;
  projector: boolean;
  smartBoard: boolean;
  wifi: boolean;
  powerOutlets: number;
  maintenanceSchedule?: {
    lastMaintenance: string;
    nextMaintenance: string;
    maintenanceType: string;
  };
  bookingRules?: {
    advanceBookingDays: number;
    minimumBookingHours: number;
    maximumBookingHours: number;
    allowWeekendBooking: boolean;
  };
  isActive: boolean;
  isAvailable: boolean;
  notes?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoomFilters {
  search?: string;
  building?: string;
  floor?: number;
  type?: string;
  department?: string;
  capacity?: {
    min?: number;
    max?: number;
  };
  features?: string[];
  isActive?: boolean;
  isAvailable?: boolean;
  airConditioning?: boolean;
  projector?: boolean;
  smartBoard?: boolean;
  wifi?: boolean;
}

export interface RoomStats {
  totalRooms: number;
  activeRooms: number;
  inactiveRooms: number;
  availableRooms: number;
  unavailableRooms: number;
  buildingDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
  departmentDistribution: Record<string, number>;
  capacityDistribution: Record<string, number>;
  averageCapacity: number;
  totalCapacity: number;
  featuresDistribution: Record<string, number>;
  equipmentStats: {
    totalEquipment: number;
    equipmentByCondition: Record<string, number>;
  };
}

export interface PaginatedRooms {
  rooms: Room[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface BulkRoomOperation {
  roomIds: string[];
  action: 'activate' | 'deactivate' | 'delete' | 'updateBuilding' | 'updateDepartment' | 'makeAvailable' | 'makeUnavailable';
  data?: {
    building?: string;
    department?: string;
    isActive?: boolean;
    isAvailable?: boolean;
  };
}

// Room Management Service Class
class RoomManagementService {
  
  /**
   * Get all rooms with optional filtering and pagination
   */
  async getAllRooms(
    filters: RoomFilters = {},
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'roomNumber',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<PaginatedRooms> {
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

      const response: AxiosResponse<PaginatedRooms> = await apiClient.get(
        `/rooms?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching rooms:', error);
      throw new Error('Failed to fetch rooms');
    }
  }

  /**
   * Get a single room by ID
   */
  async getRoomById(id: string): Promise<Room> {
    try {
      const response: AxiosResponse<Room> = await apiClient.get(`/rooms/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching room:', error);
      throw new Error('Failed to fetch room details');
    }
  }

  /**
   * Create a new room
   */
  async createRoom(roomData: Omit<Room, '_id' | 'createdAt' | 'updatedAt'>): Promise<Room> {
    try {
      const response: AxiosResponse<Room> = await apiClient.post('/rooms', roomData);
      return response.data;
    } catch (error) {
      console.error('Error creating room:', error);
      throw new Error('Failed to create room');
    }
  }

  /**
   * Update an existing room
   */
  async updateRoom(id: string, roomData: Partial<Room>): Promise<Room> {
    try {
      const response: AxiosResponse<Room> = await apiClient.put(`/rooms/${id}`, roomData);
      return response.data;
    } catch (error) {
      console.error('Error updating room:', error);
      throw new Error('Failed to update room');
    }
  }

  /**
   * Delete a room
   */
  async deleteRoom(id: string): Promise<void> {
    try {
      await apiClient.delete(`/rooms/${id}`);
    } catch (error) {
      console.error('Error deleting room:', error);
      throw new Error('Failed to delete room');
    }
  }

  /**
   * Toggle room status (active/inactive)
   */
  async toggleRoomStatus(id: string, isActive: boolean): Promise<Room> {
    try {
      const response: AxiosResponse<Room> = await apiClient.patch(
        `/rooms/${id}/${isActive ? 'activate' : 'deactivate'}`
      );
      return response.data;
    } catch (error) {
      console.error('Error toggling room status:', error);
      throw new Error('Failed to update room status');
    }
  }

  /**
   * Toggle room availability
   */
  async toggleRoomAvailability(id: string, isAvailable: boolean): Promise<Room> {
    try {
      const response: AxiosResponse<Room> = await apiClient.patch(
        `/rooms/${id}/${isAvailable ? 'make-available' : 'make-unavailable'}`
      );
      return response.data;
    } catch (error) {
      console.error('Error toggling room availability:', error);
      throw new Error('Failed to update room availability');
    }
  }

  /**
   * Get room statistics
   */
  async getRoomStats(): Promise<RoomStats> {
    try {
      const response: AxiosResponse<RoomStats> = await apiClient.get('/rooms/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching room statistics:', error);
      throw new Error('Failed to fetch room statistics');
    }
  }

  /**
   * Bulk operations on multiple rooms
   */
  async bulkUpdateRooms(operation: BulkRoomOperation): Promise<{ 
    success: number; 
    failed: number; 
    errors: string[] 
  }> {
    try {
      const response = await apiClient.patch('/rooms/bulk-update', operation);
      return response.data;
    } catch (error) {
      console.error('Error performing bulk operation:', error);
      throw new Error('Failed to perform bulk operation');
    }
  }

  /**
   * Import rooms from CSV
   */
  async importRooms(file: File): Promise<{
    imported: number;
    failed: number;
    errors: string[];
  }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/rooms/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error importing rooms:', error);
      throw new Error('Failed to import rooms');
    }
  }

  /**
   * Export rooms to CSV/JSON
   */
  async exportRooms(
    format: 'csv' | 'json' = 'csv',
    filters: RoomFilters = {}
  ): Promise<Blob> {
    try {
      const params = new URLSearchParams({
        format,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        )
      });

      const response = await apiClient.get(`/rooms/export?${params.toString()}`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting rooms:', error);
      throw new Error('Failed to export rooms');
    }
  }

  /**
   * Get room template for CSV import
   */
  async getRoomTemplate(): Promise<Blob> {
    try {
      const response = await apiClient.get('/rooms/template', {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading template:', error);
      throw new Error('Failed to download template');
    }
  }

  /**
   * Get buildings list
   */
  async getBuildings(): Promise<string[]> {
    try {
      const response = await apiClient.get('/rooms/buildings');
      return response.data;
    } catch (error) {
      console.error('Error fetching buildings:', error);
      return [
        'Main Building',
        'Computer Science Block',
        'Engineering Block A',
        'Engineering Block B',
        'Laboratory Complex',
        'Library Building',
        'Administration Block'
      ];
    }
  }

  /**
   * Get rooms by building and floor
   */
  async getRoomsByBuildingAndFloor(
    building: string,
    floor: number
  ): Promise<Room[]> {
    try {
      const response: AxiosResponse<Room[]> = await apiClient.get(
        `/rooms/building/${building}/floor/${floor}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching rooms by building and floor:', error);
      throw new Error('Failed to fetch rooms');
    }
  }

  /**
   * Check room availability for a time slot
   */
  async checkRoomAvailability(
    roomId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<{
    available: boolean;
    conflicts: Array<{
      subject: string;
      startTime: string;
      endTime: string;
      teacher: string;
    }>;
  }> {
    try {
      const response = await apiClient.get(`/rooms/${roomId}/availability`, {
        params: { date, startTime, endTime }
      });
      return response.data;
    } catch (error) {
      console.error('Error checking room availability:', error);
      throw new Error('Failed to check room availability');
    }
  }

  /**
   * Get room utilization report
   */
  async getRoomUtilization(
    roomId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    roomId: string;
    roomNumber: string;
    utilizationPercentage: number;
    totalHours: number;
    bookedHours: number;
    peakUsageHours: string[];
    departmentUsage: Record<string, number>;
  }[]> {
    try {
      const params = new URLSearchParams();
      if (roomId) params.append('roomId', roomId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await apiClient.get(`/rooms/utilization?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching room utilization:', error);
      throw new Error('Failed to fetch room utilization');
    }
  }

  /**
   * Update room equipment
   */
  async updateRoomEquipment(
    roomId: string,
    equipment: Array<{
      name: string;
      quantity: number;
      condition: 'excellent' | 'good' | 'fair' | 'poor' | 'needs_repair';
    }>
  ): Promise<Room> {
    try {
      const response: AxiosResponse<Room> = await apiClient.patch(
        `/rooms/${roomId}/equipment`,
        { equipment }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating room equipment:', error);
      throw new Error('Failed to update room equipment');
    }
  }

  /**
   * Schedule room maintenance
   */
  async scheduleRoomMaintenance(
    roomId: string,
    maintenanceData: {
      maintenanceType: string;
      scheduledDate: string;
      estimatedDuration: number;
      description: string;
    }
  ): Promise<Room> {
    try {
      const response: AxiosResponse<Room> = await apiClient.patch(
        `/rooms/${roomId}/maintenance`,
        maintenanceData
      );
      return response.data;
    } catch (error) {
      console.error('Error scheduling room maintenance:', error);
      throw new Error('Failed to schedule room maintenance');
    }
  }
}

// Export singleton instance
export const roomManagementService = new RoomManagementService();
export default roomManagementService;
