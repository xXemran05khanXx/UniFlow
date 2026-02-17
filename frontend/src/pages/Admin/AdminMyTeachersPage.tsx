import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar, Clock, Users, Search, Plus, ChevronDown, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { dataManagementService } from '../../services/dataManagementService';

interface Teacher {
  id: string;
  name: string;
  department: string;
  email: string;
  subjects: string[];
  availability: {
    dayOfWeek: string;
    startTime: string;
    endTime: string;
  }[];
}

interface TimeSlot {
  startTime: string;
  endTime: string;
}

interface Room {
  id: string;
  number: string;
  building: string;
  capacity: number;
}

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSlot: TimeSlot | null;
  selectedDate: Date;
  selectedTeachers: Teacher[];
  onSchedule: (title: string, roomId: string) => void;
}

const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({
  isOpen,
  onClose,
  selectedSlot,
  selectedDate,
  selectedTeachers,
  onSchedule
}) => {
  const [title, setTitle] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  useEffect(() => {
    if (isOpen && selectedSlot) {
      fetchAvailableRooms();
    }
  }, [isOpen, selectedSlot]);

  const fetchAvailableRooms = async () => {
    setIsLoadingRooms(true);
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAvailableRooms([
        { id: '1', number: '101', building: 'Main Block', capacity: 30 },
        { id: '2', number: '205', building: 'CS Block', capacity: 50 },
        { id: '3', number: 'Conference Room A', building: 'Admin Block', capacity: 20 }
      ]);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setIsLoadingRooms(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && selectedRoom) {
      onSchedule(title, selectedRoom);
      setTitle('');
      setSelectedRoom('');
      onClose();
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Schedule a Meeting</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Meeting Details */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Meeting Details</h4>
              <p className="text-sm text-gray-600">
                <strong>Date:</strong> {selectedDate.toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Time:</strong> {selectedSlot && `${formatTime(selectedSlot.startTime)} - ${formatTime(selectedSlot.endTime)}`}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Attendees:</strong> {selectedTeachers.map(t => t.name).join(', ')}
              </p>
            </div>

            {/* Meeting Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Title / Agenda *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter meeting purpose..."
                required
              />
            </div>

            {/* Room Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Room *
              </label>
              {isLoadingRooms ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  <span className="ml-2 text-gray-600">Loading available rooms...</span>
                </div>
              ) : (
                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  title="Select a room for the meeting"
                  required
                >
                  <option value="">Choose a room...</option>
                  {availableRooms.map(room => (
                    <option key={room.id} value={room.id}>
                      {room.number} - {room.building} (Capacity: {room.capacity})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim() || !selectedRoom}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Confirm & Book Slot
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const AdminMyTeachersPage: React.FC = () => {
  // State for Scheduling Assistant
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [commonSlots, setCommonSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [nextAvailableSlot, setNextAvailableSlot] = useState<{date: string, startTime: string, endTime: string} | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState<TimeSlot | null>(null);
  
  // Teachers data
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'today' | 'recent'>('all');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [recentSelections, setRecentSelections] = useState<string[]>([]);

  // Load teachers on component mount
  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setTeachersLoading(true);
      // Use dataManagementService to fetch teachers
      const teachersData = await dataManagementService.getTeachers();
      
      // Map the teacher data to the expected format
      const mappedTeachers = teachersData.map((teacher: any) => ({
        id: teacher._id,
        name: teacher.name,
        department: teacher.department || 'Not Assigned',
        email: teacher.email,
        subjects: teacher.qualifications || [],
        availability: teacher.availability || []
      }));
      
      setTeachers(mappedTeachers);
      console.log('Fetched teachers:', mappedTeachers);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setTeachers([]);
    } finally {
      setTeachersLoading(false);
    }
  };

  // Debounce search input
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  const toMinutes = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const minutesToTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(h)}:${pad(m)}`;
  };

  const normalizeDepartment = (dept: any): string => {
    if (!dept) return '';
    if (typeof dept === 'string') return dept.toLowerCase();
    if (typeof dept === 'object') {
      return (dept.name || dept.code || '').toLowerCase();
    }
    return '';
  };

  const findCommonSlots = async () => {
    if (selectedTeachers.length < 2) {
      toast.error('Select at least two teachers');
      return;
    }

    if (!selectedDate) {
      toast.error('Select a date');
      return;
    }

    setLoading(true);
    setSearchAttempted(true);

    try {
      const selectedDay = new Date(selectedDate).toLocaleString('en-US', { weekday: 'long' });
      const selectedTeacherData = teachers.filter((t) => selectedTeachers.includes(t.id));

      if (selectedTeacherData.length === 0) {
        setCommonSlots([]);
        setNextAvailableSlot(null);
        return;
      }

      let common = selectedTeacherData[0].availability
        .filter((a) => a.dayOfWeek === selectedDay)
        .map((slot) => ({ startTime: slot.startTime, endTime: slot.endTime }));

      for (let i = 1; i < selectedTeacherData.length; i++) {
        const teacherSlots = selectedTeacherData[i].availability
          .filter((a) => a.dayOfWeek === selectedDay)
          .map((slot) => ({ startTime: slot.startTime, endTime: slot.endTime }));

        const overlaps: TimeSlot[] = [];

        for (const slotA of common) {
          for (const slotB of teacherSlots) {
            const start = Math.max(toMinutes(slotA.startTime), toMinutes(slotB.startTime));
            const end = Math.min(toMinutes(slotA.endTime), toMinutes(slotB.endTime));

            if (start < end) {
              overlaps.push({
                startTime: minutesToTime(start),
                endTime: minutesToTime(end)
              });
            }
          }
        }

        common = overlaps;
        if (common.length === 0) break;
      }

      setCommonSlots(common);
      setNextAvailableSlot(null);
    } catch (error) {
      console.error('Error finding common slots:', error);
      toast.error('Failed to find common slots');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleMeeting = (slot: TimeSlot) => {
    setSelectedSlotForBooking(slot);
    setIsModalOpen(true);
  };

  const handleConfirmMeeting = async (title: string, roomId: string) => {
    try {
      // Mock API call - replace with actual API
      console.log('Scheduling meeting:', {
        teacherIds: selectedTeachers,
        date: selectedDate.toISOString().split('T')[0],
        startTime: selectedSlotForBooking?.startTime,
        endTime: selectedSlotForBooking?.endTime,
        title,
        roomId
      });
      
      alert('Meeting scheduled successfully!');
      
      // Remove the booked slot from available slots
      setCommonSlots(prev => prev.filter(slot => slot !== selectedSlotForBooking));
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      alert('Error scheduling meeting. Please try again.');
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const toggleTeacherSelection = (teacherId: string) => {
    setSelectedTeachers(prev => {
      const updated = prev.includes(teacherId)
        ? prev.filter(id => id !== teacherId)
        : [...prev, teacherId];

      if (!recentSelections.includes(teacherId)) {
        setRecentSelections((rs) => [teacherId, ...rs].slice(0, 10));
      }
      return updated;
    });
  };

  const getSelectedTeachersData = () => {
    return teachers.filter(teacher => selectedTeachers.includes(teacher.id));
  };

  const selectedDayName = useMemo(() => selectedDate.toLocaleString('en-US', { weekday: 'long' }), [selectedDate]);

  const filteredTeachers = useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    return teachers.filter((teacher) => {
      const deptNormalized = normalizeDepartment(teacher.department);
      const matchesTerm = !term ||
        teacher.name.toLowerCase().includes(term) ||
        deptNormalized.includes(term) ||
        (teacher as any).designation?.toLowerCase?.().includes?.(term);

      const matchesFilter = (() => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'today') {
          return teacher.availability?.some(a => a.dayOfWeek === selectedDayName);
        }
        if (activeFilter === 'recent') {
          return recentSelections.includes(teacher.id);
        }
        return true;
      })();

      return matchesTerm && matchesFilter;
    });
  }, [teachers, debouncedSearch, activeFilter, selectedDayName, recentSelections]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            My Teachers
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Manage teacher schedules and find common availability slots
          </p>
        </div>

        {/* Scheduling Assistant Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center mb-6">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 ml-4">Scheduling Assistant</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Teacher selection */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Select Teachers *</label>

              {/* Quick filters */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'today', label: 'Only Available Today' },
                  { id: 'recent', label: 'Recently Selected' }
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id as any)}
                    className={`filter-pill px-3 py-1 rounded-full text-sm border transition ${activeFilter === filter.id ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* Searchable dropdown */}
              <div className="relative" onKeyDown={(e) => {
                if (!isDropdownOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
                  setIsDropdownOpen(true);
                  return;
                }
                if (!isDropdownOpen) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setHighlightIndex((prev) => Math.min(prev + 1, filteredTeachers.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setHighlightIndex((prev) => Math.max(prev - 1, 0));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  const targetTeacher = filteredTeachers[highlightIndex];
                  if (targetTeacher) toggleTeacherSelection(targetTeacher.id);
                } else if (e.key === 'Escape') {
                  setIsDropdownOpen(false);
                }
              }}>
                <div
                  className="flex items-center rounded-lg border border-gray-300 px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-indigo-500 cursor-text"
                  onClick={() => setIsDropdownOpen(true)}
                  role="combobox"
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="listbox"
                >
                  <Search className="h-4 w-4 text-gray-400" />
                  <input
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setHighlightIndex(0); setIsDropdownOpen(true); }}
                    placeholder="Search teachers by name, department, designation"
                    className="ml-2 flex-1 bg-transparent focus:outline-none text-sm text-gray-800"
                    aria-label="Search teachers"
                  />
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>

                {isDropdownOpen && (
                  <div
                    ref={listRef}
                    className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
                    role="listbox"
                  >
                    {teachersLoading ? (
                      <div className="p-3 text-sm text-gray-500">Loading teachers...</div>
                    ) : filteredTeachers.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500">No teachers match your search.</div>
                    ) : (
                      filteredTeachers.map((teacher, idx) => {
                        const selected = selectedTeachers.includes(teacher.id);
                        const highlight = idx === highlightIndex;
                        const deptName = typeof teacher.department === 'object' ? (teacher.department as any)?.name || (teacher.department as any)?.code : teacher.department;
                        const availabilitySummary = teacher.availability?.length
                          ? teacher.availability.map(a => `${a.dayOfWeek} ${a.startTime}-${a.endTime}`).join(', ')
                          : 'No availability';
                        return (
                          <button
                            type="button"
                            key={teacher.id}
                            className={`w-full text-left px-3 py-2 flex items-start gap-3 ${highlight ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                            onClick={() => toggleTeacherSelection(teacher.id)}
                            role="option"
                            aria-selected={selected}
                            title={availabilitySummary}
                            tabIndex={-1}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              readOnly
                              className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900 truncate">{teacher.name}</span>
                                <span className="text-xs text-gray-500">{deptName}</span>
                              </div>
                              <p className="text-xs text-gray-600 truncate">{availabilitySummary}</p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Selected chips */}
              {selectedTeachers.length > 0 && (
                <div className="flex flex-wrap gap-2" aria-label="Selected teachers">
                  {getSelectedTeachersData().map((teacher) => {
                    const initials = teacher.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
                    const deptName = typeof teacher.department === 'object' ? (teacher.department as any)?.name || (teacher.department as any)?.code : teacher.department;
                    const availabilitySummary = teacher.availability?.length
                      ? teacher.availability.map(a => `${a.dayOfWeek} ${a.startTime}-${a.endTime}`).join(', ')
                      : 'No availability';
                    return (
                      <span
                        key={teacher.id}
                        className="group inline-flex items-center gap-2 rounded-full bg-indigo-100 text-indigo-700 px-3 py-1 text-sm shadow-sm"
                        title={availabilitySummary}
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-semibold">
                          {initials}
                        </span>
                        <span className="truncate max-w-[160px]">{teacher.name}</span>
                        <span className="text-xs text-indigo-600/80">{deptName}</span>
                        <button
                          onClick={() => toggleTeacherSelection(teacher.id)}
                          className="ml-1 text-indigo-600 hover:text-indigo-800 focus:outline-none"
                          aria-label={`Remove ${teacher.name}`}
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Date + action */}
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Date *</label>
                  <input
                    type="date"
                    value={selectedDate.toISOString().split('T')[0]}
                    onChange={(e) => setSelectedDate(new Date(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    title="Select date for availability search"
                    aria-label="Select date for availability search"
                  />
                </div>
              </div>

              <button
                onClick={findCommonSlots}
                disabled={selectedTeachers.length < 2 || loading || !selectedDate}
                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-sm"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Clock className="h-5 w-5" />}
                <span>{loading ? 'Searching...' : 'Find Common Slots'}</span>
              </button>
            </div>

            {/* Results */}
            <div className="md:col-span-2 bg-gray-50 rounded-xl p-6">
              {!searchAttempted ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">
                    Select teachers and a date to find common availability
                  </p>
                </div>
              ) : loading ? (
                <div className="text-center py-8 animate-pulse">
                  <Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-600 text-lg">Searching for common slots...</p>
                </div>
              ) : commonSlots.length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Users className="h-5 w-5 mr-2 text-green-600" />
                    Available Common Slots
                  </h3>
                  <div className="space-y-3">
                    {commonSlots.map((slot, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center space-x-3">
                          <Clock className="h-5 w-5 text-blue-600" />
                          <span className="font-medium text-gray-900">
                            {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleScheduleMeeting(slot)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center space-x-2"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Schedule Meeting</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No common slots found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    No common slots found for the selected teachers on this date.
                  </p>
                  {nextAvailableSlot && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-700">
                        <strong>Next available common slot:</strong><br />
                        {nextAvailableSlot.date} at {formatTime(nextAvailableSlot.startTime)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Teachers List Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">All Teachers</h2>
            <div className="text-sm text-gray-500">
              {teachers.length} teachers total
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teachers.map(teacher => (
              <div key={teacher.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {teacher.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{teacher.name}</h3>
                    <p className="text-sm text-gray-600">{typeof teacher.department === 'object' ? (teacher.department as any)?.name || (teacher.department as any)?.code : teacher.department}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{teacher.email}</p>
                <div className="flex flex-wrap gap-1">
                  {teacher.subjects.map((subject, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Schedule Meeting Modal */}
        <ScheduleMeetingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          selectedSlot={selectedSlotForBooking}
          selectedDate={selectedDate}
          selectedTeachers={getSelectedTeachersData()}
          onSchedule={handleConfirmMeeting}
        />
      </div>
    </div>
  );
};

export default AdminMyTeachersPage;
