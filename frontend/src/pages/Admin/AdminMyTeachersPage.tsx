import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Search, Plus, ChevronDown, Loader2 } from 'lucide-react';
import { dataManagementService } from '../../services/dataManagementService';

interface Teacher {
  id: string;
  name: string;
  department: string;
  email: string;
  subjects: string[];
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
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [nextAvailableSlot, setNextAvailableSlot] = useState<{date: string, startTime: string, endTime: string} | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState<TimeSlot | null>(null);
  
  // Teachers data
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Load teachers on component mount
  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      // Use dataManagementService to fetch teachers
      const teachersData = await dataManagementService.getTeachers();
      
      // Map the teacher data to the expected format
      const mappedTeachers = teachersData.map((teacher: any) => ({
        id: teacher._id,
        name: teacher.name,
        department: teacher.department || 'Not Assigned',
        email: teacher.email,
        subjects: teacher.qualifications || []
      }));
      
      setTeachers(mappedTeachers);
      console.log('Fetched teachers:', mappedTeachers);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setTeachers([]);
    }
  };

  const findCommonSlots = async () => {
    if (selectedTeachers.length < 2) return;
    
    setIsLoading(true);
    setSearchAttempted(true);
    
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate finding slots or not
      const hasSlots = Math.random() > 0.3; // 70% chance of finding slots
      
      if (hasSlots) {
        setAvailableSlots([
          { startTime: '11:30', endTime: '12:30' },
          { startTime: '14:00', endTime: '16:00' },
          { startTime: '16:30', endTime: '17:30' }
        ]);
        setNextAvailableSlot(null);
      } else {
        setAvailableSlots([]);
        setNextAvailableSlot({
          date: 'Tuesday, Aug 12th',
          startTime: '15:00',
          endTime: '16:00'
        });
      }
    } catch (error) {
      console.error('Error finding common slots:', error);
    } finally {
      setIsLoading(false);
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
      setAvailableSlots(prev => prev.filter(slot => slot !== selectedSlotForBooking));
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
    setSelectedTeachers(prev => 
      prev.includes(teacherId) 
        ? prev.filter(id => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const getSelectedTeachersData = () => {
    return teachers.filter(teacher => selectedTeachers.includes(teacher.id));
  };

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
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
          <div className="flex items-center mb-6">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 ml-4">Scheduling Assistant</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Side - Controls */}
            <div className="space-y-6">
              
              {/* Teacher Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Teachers *
                </label>
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-between"
                  >
                    <span className="text-gray-600">
                      {selectedTeachers.length === 0 
                        ? "Choose teachers..." 
                        : `${selectedTeachers.length} teacher${selectedTeachers.length > 1 ? 's' : ''} selected`
                      }
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </button>
                  
                  {isDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {teachers.map(teacher => (
                        <label
                          key={teacher.id}
                          className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTeachers.includes(teacher.id)}
                            onChange={() => toggleTeacherSelection(teacher.id)}
                            className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            title={`Select ${teacher.name}`}
                            aria-label={`Select ${teacher.name}`}
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{teacher.name}</div>
                            <div className="text-sm text-gray-500">{typeof teacher.department === 'object' ? (teacher.department as any)?.name || (teacher.department as any)?.code : teacher.department}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Selected Teachers Display */}
                {selectedTeachers.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {getSelectedTeachersData().map(teacher => (
                      <span
                        key={teacher.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        {teacher.name}
                        <button
                          onClick={() => toggleTeacherSelection(teacher.id)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date *
                </label>
                <input
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  title="Select date for availability search"
                  aria-label="Select date for availability search"
                />
              </div>

              {/* Action Button */}
              <button
                onClick={findCommonSlots}
                disabled={selectedTeachers.length < 2 || isLoading}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5" />
                    <span>Find Common Slots</span>
                  </>
                )}
              </button>
            </div>

            {/* Right Side - Results */}
            <div className="bg-gray-50 rounded-xl p-6">
              {!searchAttempted ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">
                    Select teachers and a date to find common availability
                  </p>
                </div>
              ) : isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-600 text-lg">Searching for common slots...</p>
                </div>
              ) : availableSlots.length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Users className="h-5 w-5 mr-2 text-green-600" />
                    Available Common Slots
                  </h3>
                  <div className="space-y-3">
                    {availableSlots.map((slot, index) => (
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
