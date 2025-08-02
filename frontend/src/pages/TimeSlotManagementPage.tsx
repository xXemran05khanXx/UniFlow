/**
 * Time Slot Management Page
 * Comprehensive admin interface for managing time slots in Mumbai University engineering college
 */

import React, { useState, useEffect, useCallback } from 'react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import timeSlotManagementService, { 
  TimeSlot, 
  TimeSlotFilters, 
  TimeSlotStats, 
  PaginatedTimeSlots,
  DaySchedule,
  TimeSlotConflict
} from '../services/timeSlotManagementService';

// Constants
const TIME_SLOT_TYPES = [
  { value: 'lecture', label: 'Lecture', color: 'blue' },
  { value: 'laboratory', label: 'Laboratory', color: 'green' },
  { value: 'break', label: 'Break', color: 'yellow' },
  { value: 'lunch', label: 'Lunch', color: 'orange' },
  { value: 'other', label: 'Other', color: 'gray' }
];

const DAY_TYPES = [
  { value: 'weekday', label: 'Weekday (Mon-Fri)' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
  { value: 'all', label: 'All Days' }
];

const PREDEFINED_DURATIONS = [
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' }
];

const TimeSlotManagementPage: React.FC = () => {
  // State management
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [stats, setStats] = useState<TimeSlotStats | null>(null);
  const [daySchedules, setDaySchedules] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'slots' | 'add' | 'schedule' | 'import' | 'generate'>('overview');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter state
  const [filters, setFilters] = useState<TimeSlotFilters>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Selection state
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Form state
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [showSlotDetails, setShowSlotDetails] = useState<TimeSlot | null>(null);
  const [conflicts, setConflicts] = useState<TimeSlotConflict[]>([]);

  // Time slot form state
  const [slotForm, setSlotForm] = useState<Partial<TimeSlot>>({
    name: '',
    startTime: '',
    endTime: '',
    duration: 60,
    type: 'lecture',
    dayType: 'weekday',
    isActive: true,
    order: 1,
    description: ''
  });

  // Generate default slots state
  const [generateConfig, setGenerateConfig] = useState({
    lectureStartTime: '09:00',
    lectureEndTime: '17:00',
    lectureDuration: 60,
    breakDuration: 15,
    lunchStartTime: '13:00',
    lunchDuration: 60,
    labDuration: 120,
    dayTypes: ['weekday']
  });

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  /**
   * Load time slots with current filters and pagination
   */
  const loadTimeSlots = useCallback(async () => {
    try {
      setLoading(true);
      const data: PaginatedTimeSlots = await timeSlotManagementService.getAllTimeSlots(
        { ...filters, search: searchTerm },
        currentPage,
        pageSize,
        'order',
        'asc'
      );
      
      setTimeSlots(data.timeSlots);
      setTotalPages(data.totalPages);
      setError(null);
    } catch (err) {
      console.error('Error loading time slots:', err);
      setError('Failed to load time slots');
    } finally {
      setLoading(false);
    }
  }, [filters, searchTerm, currentPage, pageSize]);

  /**
   * Load time slot statistics
   */
  const loadStats = useCallback(async () => {
    try {
      const statsData = await timeSlotManagementService.getTimeSlotStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }, []);

  /**
   * Load day schedules
   */
  const loadDaySchedules = useCallback(async () => {
    try {
      const schedules = await timeSlotManagementService.getDaySchedules();
      setDaySchedules(schedules);
    } catch (err) {
      console.error('Error loading day schedules:', err);
    }
  }, []);

  // Load data on component mount and when dependencies change
  useEffect(() => {
    loadTimeSlots();
  }, [loadTimeSlots]);

  useEffect(() => {
    loadStats();
    loadDaySchedules();
  }, [loadStats, loadDaySchedules]);

  /**
   * Handle search input change
   */
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  /**
   * Handle filter change
   */
  const handleFilterChange = (key: keyof TimeSlotFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }));
    setCurrentPage(1);
  };

  /**
   * Handle time slot selection
   */
  const handleSelectSlot = (slotId: string) => {
    setSelectedSlots(prev => {
      const newSelection = prev.includes(slotId)
        ? prev.filter(id => id !== slotId)
        : [...prev, slotId];
      
      setSelectAll(newSelection.length === timeSlots.length);
      return newSelection;
    });
  };

  /**
   * Handle select all time slots
   */
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedSlots([]);
      setSelectAll(false);
    } else {
      const allIds = timeSlots.map(slot => slot._id!);
      setSelectedSlots(allIds);
      setSelectAll(true);
    }
  };

  /**
   * Calculate duration when start/end time changes
   */
  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    const newForm = { ...slotForm, [field]: value };
    
    if (newForm.startTime && newForm.endTime) {
      const duration = timeSlotManagementService.calculateDuration(
        newForm.startTime,
        newForm.endTime
      );
      newForm.duration = duration;
    }
    
    setSlotForm(newForm);
  };

  /**
   * Handle duration change
   */
  const handleDurationChange = (duration: number) => {
    if (slotForm.startTime) {
      const [hour, minute] = slotForm.startTime.split(':').map(Number);
      const startMinutes = hour * 60 + minute;
      const endMinutes = startMinutes + duration;
      const endHour = Math.floor(endMinutes / 60);
      const endMinute = endMinutes % 60;
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
      
      setSlotForm(prev => ({
        ...prev,
        duration,
        endTime
      }));
    } else {
      setSlotForm(prev => ({ ...prev, duration }));
    }
  };

  /**
   * Validate time slot for conflicts
   */
  const validateTimeSlot = useCallback(async () => {
    if (!slotForm.startTime || !slotForm.endTime || !slotForm.dayType) {
      return;
    }

    try {
      const conflicts = await timeSlotManagementService.validateTimeSlot({
        ...slotForm,
        ...(editingSlot && { _id: editingSlot._id })
      });
      setConflicts(conflicts);
    } catch (err) {
      console.error('Error validating time slot:', err);
    }
  }, [slotForm, editingSlot]);

  /**
   * Handle time slot form submission
   */
  const handleSubmitSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (conflicts.length > 0) {
      if (!window.confirm('There are conflicts with this time slot. Do you want to proceed anyway?')) {
        return;
      }
    }

    try {
      setLoading(true);
      
      if (editingSlot) {
        await timeSlotManagementService.updateTimeSlot(editingSlot._id!, slotForm);
      } else {
        const nextOrder = await timeSlotManagementService.getNextOrder(slotForm.dayType!);
        await timeSlotManagementService.createTimeSlot({
          ...slotForm,
          order: nextOrder
        } as Omit<TimeSlot, '_id' | 'createdAt' | 'updatedAt'>);
      }
      
      setEditingSlot(null);
      setSlotForm({
        name: '',
        startTime: '',
        endTime: '',
        duration: 60,
        type: 'lecture',
        dayType: 'weekday',
        isActive: true,
        order: 1,
        description: ''
      });
      setConflicts([]);
      
      await loadTimeSlots();
      await loadStats();
      await loadDaySchedules();
      setActiveTab('slots');
    } catch (err) {
      setError('Failed to save time slot');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle time slot deletion
   */
  const handleDeleteSlot = async (slotId: string) => {
    if (!window.confirm('Are you sure you want to delete this time slot?')) return;
    
    try {
      await timeSlotManagementService.deleteTimeSlot(slotId);
      await loadTimeSlots();
      await loadStats();
      await loadDaySchedules();
    } catch (err) {
      setError('Failed to delete time slot');
    }
  };

  /**
   * Handle time slot status toggle
   */
  const handleToggleStatus = async (slotId: string, currentStatus: boolean) => {
    try {
      await timeSlotManagementService.toggleTimeSlotStatus(slotId, !currentStatus);
      await loadTimeSlots();
      await loadStats();
    } catch (err) {
      setError('Failed to update time slot status');
    }
  };

  /**
   * Handle bulk operations
   */
  const handleBulkOperation = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedSlots.length === 0) return;
    
    const confirmMessage = action === 'delete' 
      ? `Are you sure you want to delete ${selectedSlots.length} time slots?`
      : `Are you sure you want to ${action} ${selectedSlots.length} time slots?`;
    
    if (!window.confirm(confirmMessage)) return;
    
    try {
      await timeSlotManagementService.bulkUpdateTimeSlots({
        slotIds: selectedSlots,
        action,
        data: action !== 'delete' ? {
          isActive: action === 'activate'
        } : undefined
      });
      
      setSelectedSlots([]);
      setSelectAll(false);
      await loadTimeSlots();
      await loadStats();
      await loadDaySchedules();
    } catch (err) {
      setError(`Failed to ${action} time slots`);
    }
  };

  /**
   * Handle generating default time slots
   */
  const handleGenerateDefault = async () => {
    if (!window.confirm('This will generate default time slots. Are you sure?')) return;

    try {
      setLoading(true);
      await timeSlotManagementService.generateDefaultTimeSlots(generateConfig);
      await loadTimeSlots();
      await loadStats();
      await loadDaySchedules();
      setActiveTab('slots');
    } catch (err) {
      setError('Failed to generate default time slots');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle CSV import
   */
  const handleImport = async () => {
    if (!importFile) return;
    
    try {
      setImporting(true);
      const result = await timeSlotManagementService.importTimeSlots(importFile);
      
      alert(`Import completed! Imported: ${result.imported}, Failed: ${result.failed}`);
      if (result.errors.length > 0) {
        console.error('Import errors:', result.errors);
      }
      
      setImportFile(null);
      setActiveTab('slots');
      await loadTimeSlots();
      await loadStats();
      await loadDaySchedules();
    } catch (err) {
      setError('Failed to import time slots');
    } finally {
      setImporting(false);
    }
  };

  /**
   * Handle export
   */
  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const blob = await timeSlotManagementService.exportTimeSlots(format, filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `time-slots.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export time slots');
    }
  };

  /**
   * Download import template
   */
  const handleDownloadTemplate = async () => {
    try {
      const blob = await timeSlotManagementService.getTimeSlotTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'time_slot_template.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download template');
    }
  };

  /**
   * Validate time slot on form changes
   */
  useEffect(() => {
    if (slotForm.startTime && slotForm.endTime && slotForm.dayType) {
      validateTimeSlot();
    }
  }, [slotForm.startTime, slotForm.endTime, slotForm.dayType, validateTimeSlot]);

  /**
   * Render statistics cards
   */
  const renderStatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Time Slots</p>
            <p className="text-3xl font-bold text-blue-600">{stats?.totalSlots || 0}</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-full">
            🕒
          </div>
        </div>
      </Card>
      
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Active Slots</p>
            <p className="text-3xl font-bold text-green-600">{stats?.activeSlots || 0}</p>
          </div>
          <div className="p-3 bg-green-100 rounded-full">
            ✅
          </div>
        </div>
      </Card>
      
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Avg Duration</p>
            <p className="text-3xl font-bold text-purple-600">
              {stats?.averageDuration ? Math.round(stats.averageDuration) : 0}m
            </p>
          </div>
          <div className="p-3 bg-purple-100 rounded-full">
            ⏱️
          </div>
        </div>
      </Card>
      
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Duration</p>
            <p className="text-3xl font-bold text-orange-600">
              {stats?.totalDuration ? Math.round(stats.totalDuration / 60) : 0}h
            </p>
          </div>
          <div className="p-3 bg-orange-100 rounded-full">
            📊
          </div>
        </div>
      </Card>
    </div>
  );

  /**
   * Render time slots table
   */
  const renderTimeSlotsTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                aria-label="Select all time slots"
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Order
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Time
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Duration
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Day Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {timeSlots.map((slot) => (
            <tr key={slot._id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={selectedSlots.includes(slot._id!)}
                  onChange={() => handleSelectSlot(slot._id!)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  aria-label={`Select time slot ${slot.name}`}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {slot.order}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {slot.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {timeSlotManagementService.formatTime(slot.startTime)} - {timeSlotManagementService.formatTime(slot.endTime)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {slot.duration} min
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  slot.type === 'lecture' 
                    ? 'bg-blue-100 text-blue-800'
                    : slot.type === 'laboratory'
                    ? 'bg-green-100 text-green-800'
                    : slot.type === 'break'
                    ? 'bg-yellow-100 text-yellow-800'
                    : slot.type === 'lunch'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {slot.type}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {slot.dayType}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  slot.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {slot.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowSlotDetails(slot)}
                  className="text-blue-600 hover:text-blue-900"
                >
                  👁️
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditingSlot(slot);
                    setSlotForm(slot);
                    setActiveTab('add');
                  }}
                  className="text-green-600 hover:text-green-900"
                >
                  ✏️
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleToggleStatus(slot._id!, slot.isActive)}
                  className={slot.isActive ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'}
                >
                  {slot.isActive ? '❌' : '✅'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDeleteSlot(slot._id!)}
                  className="text-red-600 hover:text-red-900"
                >
                  🗑️
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  /**
   * Render day schedule
   */
  const renderDaySchedule = (schedule: DaySchedule) => (
    <Card key={schedule.dayType} className="p-6">
      <h3 className="text-lg font-semibold mb-4 capitalize">{schedule.dayType} Schedule</h3>
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Total Duration: {Math.round(schedule.totalDuration / 60)}h {schedule.totalDuration % 60}m</span>
          <span>Slots: {schedule.slots.length}</span>
        </div>
        <div className="flex space-x-4 text-sm text-gray-600">
          <span>Lectures: {schedule.lectureCount}</span>
          <span>Labs: {schedule.labCount}</span>
          <span>Breaks: {schedule.breakCount}</span>
        </div>
      </div>
      <div className="space-y-1">
        {schedule.slots.map((slot, index) => (
          <div key={slot._id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
            <div className="flex items-center space-x-3">
              <span className="w-6 text-center font-medium">{index + 1}</span>
              <span className="font-medium">{slot.name}</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                slot.type === 'lecture' 
                  ? 'bg-blue-100 text-blue-800'
                  : slot.type === 'laboratory'
                  ? 'bg-green-100 text-green-800'
                  : slot.type === 'break'
                  ? 'bg-yellow-100 text-yellow-800'
                  : slot.type === 'lunch'
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {slot.type}
              </span>
            </div>
            <div className="text-right">
              <div>{timeSlotManagementService.formatTime(slot.startTime)} - {timeSlotManagementService.formatTime(slot.endTime)}</div>
              <div className="text-xs text-gray-500">{slot.duration} min</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  if (loading && timeSlots.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Time Slot Management</h1>
          <p className="text-gray-600 mt-1">
            Manage time slots for Mumbai University Engineering College timetables
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => handleExport('csv')}
            variant="secondary"
          >
            📤 Export CSV
          </Button>
          <Button
            onClick={() => handleExport('json')}
            variant="secondary"
          >
            📤 Export JSON
          </Button>
          <Button
            onClick={() => setActiveTab('add')}
            variant="primary"
          >
            ➕ Add Time Slot
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: '📊' },
            { id: 'slots', name: 'Time Slots', icon: '🕒' },
            { id: 'add', name: 'Add Time Slot', icon: '➕' },
            { id: 'schedule', name: 'Schedule View', icon: '📅' },
            { id: 'generate', name: 'Generate Default', icon: '⚡' },
            { id: 'import', name: 'Import', icon: '📥' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div>
          {renderStatsCards()}
          
          {/* Type Distribution */}
          {stats?.typeDistribution && (
            <Card className="p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Time Slot Distribution by Type</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(stats.typeDistribution).map(([type, count]) => (
                  <div key={type} className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{count}</div>
                    <div className="text-sm text-gray-600 capitalize">{type}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          
          {/* Day Type Distribution */}
          {stats?.dayTypeDistribution && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Time Slot Distribution by Day Type</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats.dayTypeDistribution).map(([dayType, count]) => (
                  <div key={dayType} className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{count}</div>
                    <div className="text-sm text-gray-600 capitalize">{dayType}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'slots' && (
        <div>
          {/* Filters and Search */}
          <Card className="p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <Input
                placeholder="Search time slots..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
              />
              
              <select
                value={filters.type || ''}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                aria-label="Filter by type"
              >
                <option value="">All Types</option>
                {TIME_SLOT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              
              <select
                value={filters.dayType || ''}
                onChange={(e) => handleFilterChange('dayType', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                aria-label="Filter by day type"
              >
                <option value="">All Day Types</option>
                {DAY_TYPES.map(dayType => (
                  <option key={dayType.value} value={dayType.value}>{dayType.label}</option>
                ))}
              </select>
              
              <select
                value={filters.isActive?.toString() || ''}
                onChange={(e) => handleFilterChange('isActive', e.target.value === '' ? undefined : e.target.value === 'true')}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                aria-label="Filter by status"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            
            {/* Bulk Actions */}
            {selectedSlots.length > 0 && (
              <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-900">
                  {selectedSlots.length} time slot(s) selected
                </span>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => handleBulkOperation('activate')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Activate
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleBulkOperation('deactivate')}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Deactivate
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleBulkOperation('delete')}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Time Slots Table */}
          <Card className="p-6">
            {renderTimeSlotsTable()}
            
            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">
                  Show
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="block px-3 py-1 border border-gray-300 rounded-md text-sm"
                  aria-label="Select page size"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-700">
                  entries
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'add' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">
            {editingSlot ? 'Edit Time Slot' : 'Add New Time Slot'}
          </h3>
          
          {/* Conflicts Warning */}
          {conflicts.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h4 className="font-medium text-yellow-800">⚠️ Time Slot Conflicts Detected</h4>
              <ul className="mt-2 text-sm text-yellow-700">
                {conflicts.map((conflict, index) => (
                  <li key={index}>
                    Conflict with "{conflict.slot2.name}" ({timeSlotManagementService.formatTime(conflict.slot2.startTime)} - {timeSlotManagementService.formatTime(conflict.slot2.endTime)})
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <form onSubmit={handleSubmitSlot} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Slot Name *
                </label>
                <Input
                  required
                  value={slotForm.name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSlotForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Period 1, Lab Session 1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type *
                </label>
                <select
                  required
                  value={slotForm.type || ''}
                  onChange={(e) => setSlotForm(prev => ({ ...prev, type: e.target.value as any }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  aria-label="Select time slot type"
                >
                  {TIME_SLOT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Day Type *
                </label>
                <select
                  required
                  value={slotForm.dayType || ''}
                  onChange={(e) => setSlotForm(prev => ({ ...prev, dayType: e.target.value as any }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  aria-label="Select day type"
                >
                  {DAY_TYPES.map(dayType => (
                    <option key={dayType.value} value={dayType.value}>{dayType.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration
                </label>
                <div className="flex space-x-2">
                  <select
                    value={slotForm.duration || ''}
                    onChange={(e) => handleDurationChange(Number(e.target.value))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    aria-label="Select duration"
                  >
                    {PREDEFINED_DURATIONS.map(duration => (
                      <option key={duration.value} value={duration.value}>{duration.label}</option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min="5"
                    max="480"
                    value={slotForm.duration || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDurationChange(Number(e.target.value))}
                    placeholder="Minutes"
                    className="w-24"
                  />
                </div>
              </div>
            </div>

            {/* Time Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time *
                </label>
                <Input
                  type="time"
                  required
                  value={slotForm.startTime || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTimeChange('startTime', e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time *
                </label>
                <Input
                  type="time"
                  required
                  value={slotForm.endTime || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTimeChange('endTime', e.target.value)}
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={slotForm.isActive || false}
                  onChange={(e) => setSlotForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>
            
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={slotForm.description || ''}
                onChange={(e) => setSlotForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional description for this time slot..."
              />
            </div>
            
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingSlot(null);
                  setConflicts([]);
                  setActiveTab('slots');
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : editingSlot ? 'Update Time Slot' : 'Create Time Slot'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {activeTab === 'schedule' && (
        <div className="space-y-6">
          {daySchedules.map(schedule => renderDaySchedule(schedule))}
          {daySchedules.length === 0 && (
            <Card className="p-6 text-center">
              <p className="text-gray-500">No schedules found. Create some time slots first.</p>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'generate' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">Generate Default Time Slots</h3>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lecture Start Time
                </label>
                <Input
                  type="time"
                  value={generateConfig.lectureStartTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGenerateConfig(prev => ({ ...prev, lectureStartTime: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lecture End Time
                </label>
                <Input
                  type="time"
                  value={generateConfig.lectureEndTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGenerateConfig(prev => ({ ...prev, lectureEndTime: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lecture Duration (minutes)
                </label>
                <Input
                  type="number"
                  min="30"
                  max="180"
                  value={generateConfig.lectureDuration}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGenerateConfig(prev => ({ ...prev, lectureDuration: Number(e.target.value) }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Break Duration (minutes)
                </label>
                <Input
                  type="number"
                  min="5"
                  max="60"
                  value={generateConfig.breakDuration}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGenerateConfig(prev => ({ ...prev, breakDuration: Number(e.target.value) }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lunch Start Time
                </label>
                <Input
                  type="time"
                  value={generateConfig.lunchStartTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGenerateConfig(prev => ({ ...prev, lunchStartTime: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lunch Duration (minutes)
                </label>
                <Input
                  type="number"
                  min="30"
                  max="120"
                  value={generateConfig.lunchDuration}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGenerateConfig(prev => ({ ...prev, lunchDuration: Number(e.target.value) }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lab Duration (minutes)
                </label>
                <Input
                  type="number"
                  min="60"
                  max="240"
                  value={generateConfig.labDuration}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGenerateConfig(prev => ({ ...prev, labDuration: Number(e.target.value) }))}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Day Types to Generate
              </label>
              <div className="space-y-2">
                {DAY_TYPES.slice(0, 3).map(dayType => (
                  <label key={dayType.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={generateConfig.dayTypes.includes(dayType.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setGenerateConfig(prev => ({
                            ...prev,
                            dayTypes: [...prev.dayTypes, dayType.value]
                          }));
                        } else {
                          setGenerateConfig(prev => ({
                            ...prev,
                            dayTypes: prev.dayTypes.filter(type => type !== dayType.value)
                          }));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{dayType.label}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <Button
              onClick={handleGenerateDefault}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Generating...' : 'Generate Default Time Slots'}
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'import' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">Import Time Slots</h3>
          
          <div className="space-y-6">
            <div>
              <Button
                onClick={handleDownloadTemplate}
                variant="secondary"
                className="mb-4"
              >
                📥 Download CSV Template
              </Button>
              <p className="text-sm text-gray-600">
                Download the template file to see the required format for importing time slots.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                aria-label="Select CSV file for time slot import"
              />
            </div>
            
            {importFile && (
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  Selected file: {importFile.name}
                </p>
              </div>
            )}
            
            <Button
              onClick={handleImport}
              disabled={!importFile || importing}
              className="w-full"
            >
              {importing ? 'Importing...' : 'Import Time Slots'}
            </Button>
          </div>
        </Card>
      )}

      {/* Time Slot Details Modal */}
      {showSlotDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Time Slot Details - {showSlotDetails.name}</h3>
              <Button
                onClick={() => setShowSlotDetails(null)}
                variant="secondary"
                size="sm"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><strong>Name:</strong> {showSlotDetails.name}</div>
                <div><strong>Type:</strong> <span className="capitalize">{showSlotDetails.type}</span></div>
                <div><strong>Day Type:</strong> <span className="capitalize">{showSlotDetails.dayType}</span></div>
                <div><strong>Order:</strong> {showSlotDetails.order}</div>
                <div><strong>Start Time:</strong> {timeSlotManagementService.formatTime(showSlotDetails.startTime)}</div>
                <div><strong>End Time:</strong> {timeSlotManagementService.formatTime(showSlotDetails.endTime)}</div>
                <div><strong>Duration:</strong> {showSlotDetails.duration} minutes</div>
                <div>
                  <strong>Status:</strong>
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    showSlotDetails.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {showSlotDetails.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              
              {showSlotDetails.description && (
                <div>
                  <strong>Description:</strong>
                  <p className="mt-1 text-gray-600">{showSlotDetails.description}</p>
                </div>
              )}
              
              <div className="text-sm text-gray-500">
                <div>Created: {new Date(showSlotDetails.createdAt!).toLocaleString()}</div>
                {showSlotDetails.updatedAt && showSlotDetails.updatedAt !== showSlotDetails.createdAt && (
                  <div>Updated: {new Date(showSlotDetails.updatedAt).toLocaleString()}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeSlotManagementPage;
