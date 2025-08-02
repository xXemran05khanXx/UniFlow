/**
 * Time Slot Management Service
 * Handles all time slot-related API operations for Mumbai University engineering college
 */

import api from './api';

// Time Slot Interfaces
export interface TimeSlot {
  _id?: string;
  name: string;
  startTime: string; // Format: "HH:MM"
  endTime: string;   // Format: "HH:MM"
  duration: number;  // Duration in minutes
  type: 'lecture' | 'laboratory' | 'break' | 'lunch' | 'other';
  isActive: boolean;
  dayType: 'weekday' | 'saturday' | 'sunday' | 'all';
  order: number;     // Order in the day
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  updatedBy?: {
    _id: string;
    name: string;
    email: string;
  };
}

export interface TimeSlotFilters {
  search?: string;
  type?: string;
  dayType?: string;
  isActive?: boolean;
  minDuration?: number;
  maxDuration?: number;
}

export interface TimeSlotStats {
  totalSlots: number;
  activeSlots: number;
  typeDistribution: Record<string, number>;
  dayTypeDistribution: Record<string, number>;
  averageDuration: number;
  totalDuration: number;
  longestSlot: number;
  shortestSlot: number;
}

export interface PaginatedTimeSlots {
  timeSlots: TimeSlot[];
  totalPages: number;
  currentPage: number;
  totalSlots: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface BulkUpdateTimeSlots {
  slotIds: string[];
  action: 'activate' | 'deactivate' | 'delete' | 'updateType' | 'updateDayType';
  data?: Partial<TimeSlot>;
}

export interface ImportResult {
  imported: number;
  failed: number;
  errors: Array<{
    row: any;
    error: string;
  }>;
}

export interface TimeSlotConflict {
  slot1: TimeSlot;
  slot2: TimeSlot;
  conflictType: 'overlap' | 'duplicate';
  dayType: string;
}

export interface DaySchedule {
  dayType: 'weekday' | 'saturday' | 'sunday';
  slots: TimeSlot[];
  totalDuration: number;
  breakCount: number;
  lectureCount: number;
  labCount: number;
}

class TimeSlotManagementService {
  private baseURL = '/time-slots';

  /**
   * Get all time slots with filtering and pagination
   */
  async getAllTimeSlots(
    filters: TimeSlotFilters = {},
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'order',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<PaginatedTimeSlots> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder,
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
      )
    });

    const response = await api.get(`${this.baseURL}?${params}`);
    return response.data.data;
  }

  /**
   * Get time slot by ID
   */
  async getTimeSlotById(id: string): Promise<TimeSlot> {
    const response = await api.get(`${this.baseURL}/${id}`);
    return response.data.data;
  }

  /**
   * Create new time slot
   */
  async createTimeSlot(timeSlotData: Omit<TimeSlot, '_id' | 'createdAt' | 'updatedAt'>): Promise<TimeSlot> {
    const response = await api.post(this.baseURL, timeSlotData);
    return response.data.data;
  }

  /**
   * Update time slot
   */
  async updateTimeSlot(id: string, timeSlotData: Partial<TimeSlot>): Promise<TimeSlot> {
    const response = await api.put(`${this.baseURL}/${id}`, timeSlotData);
    return response.data.data;
  }

  /**
   * Delete time slot
   */
  async deleteTimeSlot(id: string): Promise<void> {
    await api.delete(`${this.baseURL}/${id}`);
  }

  /**
   * Toggle time slot status
   */
  async toggleTimeSlotStatus(id: string, isActive: boolean): Promise<TimeSlot> {
    const response = await api.patch(`${this.baseURL}/${id}/status`, { isActive });
    return response.data.data;
  }

  /**
   * Bulk update time slots
   */
  async bulkUpdateTimeSlots(bulkData: BulkUpdateTimeSlots): Promise<{ modifiedCount: number; matchedCount: number }> {
    const response = await api.patch(`${this.baseURL}/bulk`, bulkData);
    return response.data.data;
  }

  /**
   * Get time slot statistics
   */
  async getTimeSlotStats(): Promise<TimeSlotStats> {
    const response = await api.get(`${this.baseURL}/stats`);
    return response.data.data;
  }

  /**
   * Get day schedules (organized by day type)
   */
  async getDaySchedules(): Promise<DaySchedule[]> {
    const response = await api.get(`${this.baseURL}/schedules`);
    return response.data.data;
  }

  /**
   * Validate time slot for conflicts
   */
  async validateTimeSlot(timeSlotData: Partial<TimeSlot>): Promise<TimeSlotConflict[]> {
    const response = await api.post(`${this.baseURL}/validate`, timeSlotData);
    return response.data.data;
  }

  /**
   * Reorder time slots
   */
  async reorderTimeSlots(slotOrders: Array<{ id: string; order: number }>): Promise<void> {
    await api.patch(`${this.baseURL}/reorder`, { slotOrders });
  }

  /**
   * Generate default time slots
   */
  async generateDefaultTimeSlots(config: {
    lectureStartTime: string;
    lectureEndTime: string;
    lectureDuration: number;
    breakDuration: number;
    lunchStartTime: string;
    lunchDuration: number;
    labDuration: number;
    dayTypes: string[];
  }): Promise<TimeSlot[]> {
    const response = await api.post(`${this.baseURL}/generate-default`, config);
    return response.data.data;
  }

  /**
   * Import time slots from CSV
   */
  async importTimeSlots(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`${this.baseURL}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  }

  /**
   * Export time slots
   */
  async exportTimeSlots(format: 'csv' | 'json', filters: TimeSlotFilters = {}): Promise<Blob> {
    const params = new URLSearchParams({
      format,
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
      )
    });

    const response = await api.get(`${this.baseURL}/export?${params}`, {
      responseType: 'blob',
    });

    return response.data;
  }

  /**
   * Get time slot template for import
   */
  async getTimeSlotTemplate(): Promise<Blob> {
    const response = await api.get(`${this.baseURL}/template`, {
      responseType: 'blob',
    });

    return response.data;
  }

  /**
   * Get time slots for specific day type
   */
  async getTimeSlotsByDayType(dayType: 'weekday' | 'saturday' | 'sunday' | 'all'): Promise<TimeSlot[]> {
    const response = await api.get(`${this.baseURL}/by-day-type/${dayType}`);
    return response.data.data;
  }

  /**
   * Check time slot availability for timetable generation
   */
  async checkAvailability(
    startTime: string,
    endTime: string,
    dayType: string,
    excludeSlotId?: string
  ): Promise<{ available: boolean; conflicts: TimeSlotConflict[] }> {
    const params = new URLSearchParams({
      startTime,
      endTime,
      dayType,
      ...(excludeSlotId && { excludeSlotId })
    });

    const response = await api.get(`${this.baseURL}/check-availability?${params}`);
    return response.data.data;
  }

  /**
   * Get optimal time slots for specific duration
   */
  async getOptimalTimeSlots(
    duration: number,
    type: string,
    dayType: string
  ): Promise<TimeSlot[]> {
    const params = new URLSearchParams({
      duration: duration.toString(),
      type,
      dayType
    });

    const response = await api.get(`${this.baseURL}/optimal?${params}`);
    return response.data.data;
  }

  /**
   * Copy time slots from one day type to another
   */
  async copyTimeSlots(
    fromDayType: string,
    toDayType: string,
    options: {
      includeBreaks: boolean;
      includeLunch: boolean;
      adjustTiming: boolean;
      timingAdjustment?: number;
    }
  ): Promise<TimeSlot[]> {
    const response = await api.post(`${this.baseURL}/copy`, {
      fromDayType,
      toDayType,
      ...options
    });
    return response.data.data;
  }

  /**
   * Calculate duration between two times
   */
  calculateDuration(startTime: string, endTime: string): number {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    return endMinutes - startMinutes;
  }

  /**
   * Format time for display
   */
  formatTime(time: string): string {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
    return `${displayHour}:${minute} ${ampm}`;
  }

  /**
   * Validate time format
   */
  isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Get next available order for new time slot
   */
  async getNextOrder(dayType: string): Promise<number> {
    const response = await api.get(`${this.baseURL}/next-order/${dayType}`);
    return response.data.data.nextOrder;
  }
}

// Export singleton instance
const timeSlotManagementService = new TimeSlotManagementService();
export default timeSlotManagementService;
