import React, { useState, useEffect, useCallback } from 'react';
import { Clock, User, BookOpen, Calendar, Coffee, Loader2 } from 'lucide-react';

interface Teacher {
  id: string;
  name: string;
  department: string;
  email: string;
  designation: string;
}

interface ScheduleEvent {
  startTime: string;
  endTime: string;
  title: string;
  type: 'Lecture' | 'Meeting' | 'Lab' | 'Consultation';
  location: string;
}

interface TimeSlot {
  hour: number;
  period: string;
  status: 'free' | 'busy';
  event?: ScheduleEvent;
}

const StudentMyTeachersPage: React.FC = () => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEvent[]>([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [selectedDate] = useState<Date>(new Date());

  // Load teachers on component mount
  useEffect(() => {
    const loadTeachers = async () => {
      setIsLoadingTeachers(true);
      try {
        // Mock API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 1000));
        setTeachers([
          { 
            id: '1', 
            name: 'Dr. Rajesh Kumar', 
            department: 'Computer Engineering', 
            email: 'rajesh@college.edu',
            designation: 'Professor' 
          },
          { 
            id: '2', 
            name: 'Prof. Priya Sharma', 
            department: 'Computer Engineering', 
            email: 'priya@college.edu',
            designation: 'Associate Professor' 
          },
          { 
            id: '3', 
            name: 'Dr. Amit Patel', 
            department: 'Electronics Engineering', 
            email: 'amit@college.edu',
            designation: 'Professor' 
          },
          { 
            id: '4', 
            name: 'Prof. Sunita Jain', 
            department: 'Computer Engineering', 
            email: 'sunita@college.edu',
            designation: 'Assistant Professor' 
          },
          { 
            id: '5', 
            name: 'Dr. Vikram Singh', 
            department: 'Mechanical Engineering', 
            email: 'vikram@college.edu',
            designation: 'Professor' 
          }
        ]);
      } catch (error) {
        console.error('Error fetching teachers:', error);
      } finally {
        setIsLoadingTeachers(false);
      }
    };
    loadTeachers();
  }, []);

  const fetchTeacherSchedule = useCallback(async (teacherId: string) => {
    setIsLoadingSchedule(true);
    try {
      const teacher = teachers.find(t => t.id === teacherId);
      setSelectedTeacher(teacher || null);

      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock schedule data based on teacher
      const schedules: { [key: string]: ScheduleEvent[] } = {
        '1': [
          { startTime: '09:00', endTime: '10:00', title: 'Data Structures (SE-COMP-A)', type: 'Lecture', location: 'Room 101' },
          { startTime: '11:00', endTime: '12:00', title: 'Algorithm Design (TE-COMP-B)', type: 'Lecture', location: 'Room 205' },
          { startTime: '14:00', endTime: '15:00', title: 'Research Meeting', type: 'Meeting', location: 'Office' },
          { startTime: '16:00', endTime: '17:00', title: 'Project Guidance', type: 'Consultation', location: 'Lab' }
        ],
        '2': [
          { startTime: '10:00', endTime: '11:00', title: 'Software Engineering (TE-COMP-A)', type: 'Lecture', location: 'Room 103' },
          { startTime: '13:00', endTime: '14:00', title: 'Database Lab (SE-COMP-B)', type: 'Lab', location: 'Lab 201' },
          { startTime: '15:00', endTime: '16:00', title: 'Faculty Meeting', type: 'Meeting', location: 'Conference Room' }
        ],
        '3': [
          { startTime: '09:00', endTime: '10:00', title: 'Digital Electronics (SE-EXTC-A)', type: 'Lecture', location: 'Room 201' },
          { startTime: '12:00', endTime: '13:00', title: 'Microprocessors (TE-EXTC-B)', type: 'Lecture', location: 'Room 202' },
          { startTime: '14:00', endTime: '15:00', title: 'Lab Supervision', type: 'Lab', location: 'Electronics Lab' }
        ],
        '4': [
          { startTime: '11:00', endTime: '12:00', title: 'Web Development (SE-COMP-C)', type: 'Lecture', location: 'Room 104' },
          { startTime: '13:00', endTime: '14:00', title: 'Programming Lab (FE-COMP-A)', type: 'Lab', location: 'Lab 101' },
          { startTime: '16:00', endTime: '17:00', title: 'Student Counseling', type: 'Consultation', location: 'Office' }
        ],
        '5': [
          { startTime: '09:00', endTime: '10:00', title: 'Thermodynamics (SE-MECH-A)', type: 'Lecture', location: 'Room 301' },
          { startTime: '11:00', endTime: '12:00', title: 'Fluid Mechanics (TE-MECH-B)', type: 'Lecture', location: 'Room 302' },
          { startTime: '15:00', endTime: '16:00', title: 'Industrial Visit Planning', type: 'Meeting', location: 'Office' }
        ]
      };

      setSchedule(schedules[teacherId] || []);
    } catch (error) {
      console.error('Error fetching teacher schedule:', error);
    } finally {
      setIsLoadingSchedule(false);
    }
  }, [teachers]);

  // Load teacher schedule when teacher is selected
  useEffect(() => {
    if (selectedTeacherId) {
      fetchTeacherSchedule(selectedTeacherId);
    }
  }, [selectedTeacherId, fetchTeacherSchedule]);

  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startHour = 9; // 9 AM
    const endHour = 17; // 5 PM

    for (let hour = startHour; hour < endHour; hour++) {
      const hourStr = hour.toString().padStart(2, '0') + ':00';
      const nextHourStr = (hour + 1).toString().padStart(2, '0') + ':00';
      
      // Check if this hour has any event
      const event = schedule.find(event => {
        const eventStart = parseInt(event.startTime.split(':')[0]);
        return eventStart === hour;
      });

      slots.push({
        hour,
        period: formatTimeRange(hourStr, nextHourStr),
        status: event ? 'busy' : 'free',
        event
      });
    }

    return slots;
  };

  const formatTimeRange = (start: string, end: string): string => {
    const formatTime = (time: string) => {
      const [hour, minute] = time.split(':');
      const hourNum = parseInt(hour);
      const period = hourNum >= 12 ? 'PM' : 'AM';
      const displayHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
      return `${displayHour}:${minute} ${period}`;
    };
    
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const timeSlots = generateTimeSlots();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
            My Teachers
          </h1>
          <p className="text-gray-600 text-lg">
            View your teachers' schedules and availability
          </p>
        </div>

        {/* Teacher Selection */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-800">Select Teacher</h2>
            </div>
            
            <div className="relative">
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                disabled={isLoadingTeachers}
                title="Select a teacher to view their schedule"
              >
                <option value="">
                  {isLoadingTeachers ? 'Loading teachers...' : 'Choose a teacher'}
                </option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} - {teacher.department}
                  </option>
                ))}
              </select>
              {isLoadingTeachers && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Schedule Display */}
        {selectedTeacher && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
            <div className="space-y-6">
              {/* Teacher Info */}
              <div className="border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">{selectedTeacher.name}</h3>
                    <p className="text-gray-600">{selectedTeacher.designation}, {selectedTeacher.department}</p>
                    <p className="text-gray-500">{selectedTeacher.email}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Calendar className="h-5 w-5" />
                      <span className="font-medium">{formatDate(selectedDate)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Schedule Timeline */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <h4 className="text-lg font-semibold text-gray-800">Today's Schedule</h4>
                </div>

                {isLoadingSchedule ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {timeSlots.map((slot) => (
                      <div
                        key={slot.hour}
                        className={`flex items-center p-4 rounded-lg border transition-all duration-200 ${
                          slot.status === 'busy'
                            ? 'bg-red-50 border-red-200 shadow-sm'
                            : 'bg-green-50 border-green-200'
                        }`}
                      >
                        <div className="flex-1 flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="text-center min-w-[120px]">
                              <div className="font-semibold text-gray-800">
                                {slot.period}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {slot.status === 'busy' ? (
                                <>
                                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                                  <span className="text-red-700 font-medium">Busy</span>
                                </>
                              ) : (
                                <>
                                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                                  <span className="text-green-700 font-medium">Available</span>
                                </>
                              )}
                            </div>
                          </div>

                          {slot.event && (
                            <div className="flex-1 ml-6">
                              <div className="flex items-center space-x-4">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <BookOpen className="h-4 w-4 text-gray-600" />
                                    <span className="font-medium text-gray-800">
                                      {slot.event.title}
                                    </span>
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    {slot.event.location} • {slot.event.type}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {!slot.event && (
                            <div className="flex-1 ml-6 flex items-center space-x-2 text-green-600">
                              <Coffee className="h-4 w-4" />
                              <span className="text-sm">Free time - Available for consultation</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              {!isLoadingSchedule && schedule.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                  <h5 className="font-semibold text-gray-800 mb-2">Today's Summary</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                      <span className="text-gray-700">
                        Busy: {timeSlots.filter(slot => slot.status === 'busy').length} hours
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      <span className="text-gray-700">
                        Available: {timeSlots.filter(slot => slot.status === 'free').length} hours
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <BookOpen className="h-3 w-3 text-gray-600" />
                      <span className="text-gray-700">
                        Total Events: {schedule.length}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!selectedTeacher && !isLoadingTeachers && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-12 text-center">
            <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              Select a Teacher
            </h3>
            <p className="text-gray-500">
              Choose a teacher from the dropdown above to view their daily schedule and availability.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentMyTeachersPage;
