import React, { useState, useEffect } from 'react';
import { Clock, Plus, Edit, Trash2, Search, Filter, Save, X, Copy } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { timeSlotsAPI } from '../../services/api';
import { TimeSlot } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { formatTime, getDayName } from '../../utils';

interface TimeSlotFormData {
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  isActive: boolean;
}

const TimeSlotsPage: React.FC = () => {
  const { user } = useAuth();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDay, setFilterDay] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<TimeSlotFormData>({
    startTime: '',
    endTime: '',
    dayOfWeek: 1,
    isActive: true
  });

  const [copyingToDay, setCopyingToDay] = useState<number | null>(null);

  const daysOfWeek = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 0, label: 'Sunday' }
  ];

  useEffect(() => {
    fetchTimeSlots();
  }, []);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const fetchTimeSlots = async () => {
    try {
      setLoading(true);
      console.log('Fetching time slots from API...');
      const response = await timeSlotsAPI.getAll();
      console.log('Time slots response:', response);
      if (response.success && response.data) {
        setTimeSlots(response.data);
        console.log('Time slots loaded:', response.data.length);
      } else {
        setError('Failed to fetch time slots');
        console.error('Failed response:', response);
      }
    } catch (err: any) {
      console.error('Error fetching time slots:', err);
      console.error('Error response:', err.response);
      setError(err.response?.data?.message || err.message || 'Failed to fetch time slots');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      startTime: '',
      endTime: '',
      dayOfWeek: 1,
      isActive: true
    });
    setEditingSlot(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleEdit = (slot: TimeSlot) => {
    setFormData({
      startTime: slot.startTime,
      endTime: slot.endTime,
      dayOfWeek: slot.dayOfWeek,
      isActive: slot.isActive
    });
    setEditingSlot(slot);
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.startTime || !formData.endTime) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.startTime >= formData.endTime) {
      setError('End time must be after start time');
      return;
    }

    try {
      if (editingSlot) {
        const response = await timeSlotsAPI.update(editingSlot._id, formData);
        if (response.success) {
          setSuccess('Time slot updated successfully');
          fetchTimeSlots();
        } else {
          setError(response.error || 'Failed to update time slot');
        }
      } else {
        const response = await timeSlotsAPI.create(formData);
        if (response.success) {
          setSuccess('Time slot created successfully');
          fetchTimeSlots();
        } else {
          setError(response.error || 'Failed to create time slot');
        }
      }
      
      setShowCreateModal(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this time slot?')) {
      return;
    }

    try {
      const response = await timeSlotsAPI.delete(id);
      if (response.success) {
        setSuccess('Time slot deleted successfully');
        fetchTimeSlots();
      } else {
        setError(response.error || 'Failed to delete time slot');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete time slot');
    }
  };

  const handleToggleActive = async (slot: TimeSlot) => {
    try {
      const response = await timeSlotsAPI.update(slot._id, {
        ...slot,
        isActive: !slot.isActive
      });
      if (response.success) {
        setSuccess(`Time slot ${!slot.isActive ? 'activated' : 'deactivated'} successfully`);
        fetchTimeSlots();
      } else {
        setError(response.error || 'Failed to update time slot');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update time slot');
    }
  };

  // Copy time slots from one day to another
  const handleCopyFromDay = async (targetDay: number, sourceDay: number) => {
    if (sourceDay === targetDay) {
      setError('Cannot copy to the same day');
      return;
    }

    const sourceSlots = timeSlots.filter(slot => slot.dayOfWeek === sourceDay);
    
    if (sourceSlots.length === 0) {
      setError(`No time slots found for ${getDayName(sourceDay)} to copy`);
      return;
    }

    // Check for existing slots on target day
    const targetSlots = timeSlots.filter(slot => slot.dayOfWeek === targetDay);
    if (targetSlots.length > 0) {
      if (!window.confirm(`${getDayName(targetDay)} already has ${targetSlots.length} time slot(s). Do you want to add more from ${getDayName(sourceDay)}?`)) {
        setCopyingToDay(null);
        return;
      }
    }

    setCopyingToDay(targetDay);
    setError(null);

    try {
      let successCount = 0;
      let skipCount = 0;

      for (const slot of sourceSlots) {
        // Check if this exact time slot already exists on target day
        const exists = timeSlots.some(
          existingSlot => 
            existingSlot.dayOfWeek === targetDay && 
            existingSlot.startTime === slot.startTime && 
            existingSlot.endTime === slot.endTime
        );

        if (exists) {
          skipCount++;
          continue;
        }

        const response = await timeSlotsAPI.create({
          startTime: slot.startTime,
          endTime: slot.endTime,
          dayOfWeek: targetDay,
          isActive: slot.isActive
        });

        if (response.success) {
          successCount++;
        }
      }

      if (successCount > 0) {
        setSuccess(`Successfully copied ${successCount} time slot(s) from ${getDayName(sourceDay)} to ${getDayName(targetDay)}${skipCount > 0 ? ` (${skipCount} skipped - already exist)` : ''}`);
        fetchTimeSlots();
      } else if (skipCount > 0) {
        setError(`All ${skipCount} time slots already exist on ${getDayName(targetDay)}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to copy time slots');
    } finally {
      setCopyingToDay(null);
    }
  };

  const filteredTimeSlots = timeSlots.filter(slot => {
    const matchesSearch = 
      getDayName(slot.dayOfWeek).toLowerCase().includes(searchTerm.toLowerCase()) ||
      slot.startTime.includes(searchTerm) ||
      slot.endTime.includes(searchTerm);
    
    const matchesDay = filterDay === 'all' || slot.dayOfWeek.toString() === filterDay;
    const matchesActive = filterActive === 'all' || 
      (filterActive === 'active' && slot.isActive) ||
      (filterActive === 'inactive' && !slot.isActive);
    
    return matchesSearch && matchesDay && matchesActive;
  });

  // Group time slots by day of week
  const groupedTimeSlots = daysOfWeek.reduce((acc, day) => {
    acc[day.value] = filteredTimeSlots
      .filter(slot => slot.dayOfWeek === day.value)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    return acc;
  }, {} as Record<number, TimeSlot[]>);

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Clock className="h-8 w-8 mr-3 text-blue-600" />
            Time Slots Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage class time periods and schedule configurations
          </p>
        </div>
        <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Time Slot
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
              title="Close error message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
            <button
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-400 hover:text-green-600"
              title="Close success message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search time slots..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterDay}
              onChange={(e) => setFilterDay(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              title="Filter by day of week"
            >
              <option value="all">All Days</option>
              {daysOfWeek.map(day => (
                <option key={day.value} value={day.value.toString()}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>

          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            title="Filter by active status"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <div className="ml-auto text-sm text-gray-600">
            {filteredTimeSlots.length} time slot(s) found
          </div>
        </div>
      </Card>

      {/* Time Slots Grid */}
      {loading ? (
        <Card className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading time slots...</p>
        </Card>
      ) : (
        <div className="grid gap-6">
          {daysOfWeek.map(day => {
            const daySlots = groupedTimeSlots[day.value];
            // Get days that have time slots (to show in copy dropdown)
            const daysWithSlots = daysOfWeek.filter(
              d => d.value !== day.value && groupedTimeSlots[d.value]?.length > 0
            );
            
            if (daySlots.length === 0 && filterDay !== 'all' && filterDay !== day.value.toString()) {
              return null;
            }

            return (
              <Card key={day.value} className="overflow-hidden">
                {/* Day Header with Copy Option */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">{day.label}</h3>
                  
                  {/* Copy from dropdown */}
                  {daysWithSlots.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Copy className="h-4 w-4 text-gray-500" />
                      <select
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleCopyFromDay(day.value, parseInt(e.target.value));
                            e.target.value = '';
                          }
                        }}
                        disabled={copyingToDay === day.value}
                        title={`Copy time slots to ${day.label}`}
                      >
                        <option value="">Copy from...</option>
                        {daysWithSlots.map(sourceDay => (
                          <option key={sourceDay.value} value={sourceDay.value}>
                            {sourceDay.label} ({groupedTimeSlots[sourceDay.value]?.length} slots)
                          </option>
                        ))}
                      </select>
                      {copyingToDay === day.value && (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                      )}
                    </div>
                  )}
                </div>

                {daySlots.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No time slots configured for {day.label}</p>
                    {daysWithSlots.length > 0 && (
                      <p className="text-sm mt-2">Use "Copy from" above to copy slots from another day</p>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {daySlots.map(slot => (
                      <div
                        key={slot._id}
                        className={`p-4 border rounded-lg transition-all duration-200 ${
                          slot.isActive
                            ? 'border-green-200 bg-green-50 hover:shadow-md'
                            : 'border-gray-200 bg-gray-50 opacity-75'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 text-lg">
                              {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              Duration: {(() => {
                                const start = new Date(`2000-01-01T${slot.startTime}`);
                                const end = new Date(`2000-01-01T${slot.endTime}`);
                                const duration = (end.getTime() - start.getTime()) / (1000 * 60);
                                return `${duration} minutes`;
                              })()}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(slot)}
                              className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                              title="Edit time slot"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(slot._id)}
                              className="p-1 text-red-600 hover:text-red-800 transition-colors"
                              title="Delete time slot"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            slot.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {slot.isActive ? 'Active' : 'Inactive'}
                          </span>
                          
                          <button
                            onClick={() => handleToggleActive(slot)}
                            className={`text-xs px-3 py-1 rounded transition-colors ${
                              slot.isActive
                                ? 'text-red-600 hover:text-red-800'
                                : 'text-green-600 hover:text-green-800'
                            }`}
                          >
                            {slot.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingSlot ? 'Edit Time Slot' : 'Create Time Slot'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
                title="Close modal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Time"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  required
                />
                <Input
                  label="End Time"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Day of Week
                </label>
                <select
                  value={formData.dayOfWeek}
                  onChange={(e) => setFormData(prev => ({ ...prev, dayOfWeek: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  title="Select day of week"
                >
                  {daysOfWeek.map(day => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  Active
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  <Save className="h-4 w-4 mr-2" />
                  {editingSlot ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeSlotsPage;
