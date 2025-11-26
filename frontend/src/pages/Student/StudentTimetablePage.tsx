import React, { useState } from 'react';
import { Calendar, Clock, MapPin, BookOpen, User, Download, RefreshCw } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';

interface TimeSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  color: string;
}

interface Teacher {
  id: string;
  name: string;
}

interface Room {
  id: string;
  number: string;
  building: string;
}

interface TimetableEntry {
  id: string;
  subject: Subject;
  teacher: Teacher;
  room: Room;
  timeSlot: TimeSlot;
  sessionType: 'lecture' | 'lab' | 'tutorial';
}

const StudentTimetablePage: React.FC = () => {
  const { user } = useAuth();
  const [selectedView, setSelectedView] = useState<'week' | 'day'>('week');
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date().getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames[today] === 'Saturday' || dayNames[today] === 'Sunday' ? 'Monday' : dayNames[today];
  });
  const [loading, setLoading] = useState(false);

  // Sample timetable data - in real app, this would come from API
  const timeSlots = [
    { time: '09:00', label: '9:00 AM' },
    { time: '10:00', label: '10:00 AM' },
    { time: '11:00', label: '11:00 AM' },
    { time: '12:00', label: '12:00 PM' },
    { time: '13:00', label: '1:00 PM' },
    { time: '14:00', label: '2:00 PM' },
    { time: '15:00', label: '3:00 PM' },
    { time: '16:00', label: '4:00 PM' },
    { time: '17:00', label: '5:00 PM' }
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const sampleTimetable: TimetableEntry[] = [
    // Monday Classes
    {
      id: '1',
      subject: { id: '1', name: 'Digital Logic Design', code: 'CS201', color: 'border-blue-500 bg-blue-50' },
      teacher: { id: '1', name: 'Dr. Smith' },
      room: { id: '1', number: '201', building: 'CS Building' },
      timeSlot: { id: '1', day: 'Monday', startTime: '09:00', endTime: '10:00' },
      sessionType: 'lecture'
    },
    {
      id: '2',
      subject: { id: '2', name: 'Database Systems', code: 'CS301', color: 'border-green-500 bg-green-50' },
      teacher: { id: '2', name: 'Prof. Johnson' },
      room: { id: '2', number: '305', building: 'CS Building' },
      timeSlot: { id: '2', day: 'Monday', startTime: '11:00', endTime: '12:00' },
      sessionType: 'lecture'
    },
    {
      id: '3',
      subject: { id: '6', name: 'Mathematics III', code: 'MATH301', color: 'border-indigo-500 bg-indigo-50' },
      teacher: { id: '6', name: 'Dr. Anderson' },
      room: { id: '11', number: '101', building: 'Math Building' },
      timeSlot: { id: '11', day: 'Monday', startTime: '14:00', endTime: '15:00' },
      sessionType: 'lecture'
    },
    {
      id: '4',
      subject: { id: '4', name: 'Software Engineering', code: 'CS501', color: 'border-orange-500 bg-orange-50' },
      teacher: { id: '4', name: 'Prof. Brown' },
      room: { id: '12', number: '405', building: 'CS Building' },
      timeSlot: { id: '12', day: 'Monday', startTime: '16:00', endTime: '17:00' },
      sessionType: 'tutorial'
    },

    // Tuesday Classes
    {
      id: '5',
      subject: { id: '1', name: 'Digital Logic Design', code: 'CS201', color: 'border-blue-500 bg-blue-50' },
      teacher: { id: '1', name: 'Dr. Smith' },
      room: { id: '13', number: 'Lab-A', building: 'CS Building' },
      timeSlot: { id: '13', day: 'Tuesday', startTime: '10:00', endTime: '12:00' },
      sessionType: 'lab'
    },
    {
      id: '6',
      subject: { id: '3', name: 'Computer Networks', code: 'CS401', color: 'border-purple-500 bg-purple-50' },
      teacher: { id: '3', name: 'Dr. Williams' },
      room: { id: '3', number: 'Lab-B', building: 'CS Building' },
      timeSlot: { id: '3', day: 'Tuesday', startTime: '14:00', endTime: '16:00' },
      sessionType: 'lab'
    },
    {
      id: '7',
      subject: { id: '7', name: 'Technical Communication', code: 'ENG201', color: 'border-pink-500 bg-pink-50' },
      teacher: { id: '7', name: 'Prof. Taylor' },
      room: { id: '14', number: '302', building: 'Language Center' },
      timeSlot: { id: '14', day: 'Tuesday', startTime: '17:00', endTime: '18:00' },
      sessionType: 'lecture'
    },

    // Wednesday Classes
    {
      id: '8',
      subject: { id: '2', name: 'Database Systems', code: 'CS301', color: 'border-green-500 bg-green-50' },
      teacher: { id: '2', name: 'Prof. Johnson' },
      room: { id: '15', number: 'Lab-C', building: 'CS Building' },
      timeSlot: { id: '15', day: 'Wednesday', startTime: '09:00', endTime: '11:00' },
      sessionType: 'lab'
    },
    {
      id: '9',
      subject: { id: '4', name: 'Software Engineering', code: 'CS501', color: 'border-orange-500 bg-orange-50' },
      teacher: { id: '4', name: 'Prof. Brown' },
      room: { id: '4', number: '402', building: 'CS Building' },
      timeSlot: { id: '4', day: 'Wednesday', startTime: '12:00', endTime: '13:00' },
      sessionType: 'lecture'
    },
    {
      id: '10',
      subject: { id: '3', name: 'Computer Networks', code: 'CS401', color: 'border-purple-500 bg-purple-50' },
      teacher: { id: '3', name: 'Dr. Williams' },
      room: { id: '16', number: '301', building: 'CS Building' },
      timeSlot: { id: '16', day: 'Wednesday', startTime: '15:00', endTime: '16:00' },
      sessionType: 'lecture'
    },
    {
      id: '11',
      subject: { id: '6', name: 'Mathematics III', code: 'MATH301', color: 'border-indigo-500 bg-indigo-50' },
      teacher: { id: '8', name: 'Dr. Wilson' },
      room: { id: '17', number: '103', building: 'Math Building' },
      timeSlot: { id: '17', day: 'Wednesday', startTime: '16:00', endTime: '17:00' },
      sessionType: 'tutorial'
    },

    // Thursday Classes
    {
      id: '12',
      subject: { id: '5', name: 'Data Structures', code: 'CS202', color: 'border-red-500 bg-red-50' },
      teacher: { id: '5', name: 'Dr. Davis' },
      room: { id: '18', number: '210', building: 'CS Building' },
      timeSlot: { id: '18', day: 'Thursday', startTime: '09:00', endTime: '10:00' },
      sessionType: 'lecture'
    },
    {
      id: '13',
      subject: { id: '4', name: 'Software Engineering', code: 'CS501', color: 'border-orange-500 bg-orange-50' },
      teacher: { id: '4', name: 'Prof. Brown' },
      room: { id: '19', number: '405', building: 'CS Building' },
      timeSlot: { id: '19', day: 'Thursday', startTime: '11:00', endTime: '12:00' },
      sessionType: 'tutorial'
    },
    {
      id: '14',
      subject: { id: '7', name: 'Technical Communication', code: 'ENG201', color: 'border-pink-500 bg-pink-50' },
      teacher: { id: '7', name: 'Prof. Taylor' },
      room: { id: '20', number: '204', building: 'Language Center' },
      timeSlot: { id: '20', day: 'Thursday', startTime: '13:00', endTime: '14:00' },
      sessionType: 'tutorial'
    },
    {
      id: '15',
      subject: { id: '5', name: 'Data Structures', code: 'CS202', color: 'border-red-500 bg-red-50' },
      teacher: { id: '5', name: 'Dr. Davis' },
      room: { id: '5', number: 'Lab-D', building: 'CS Building' },
      timeSlot: { id: '5', day: 'Thursday', startTime: '15:00', endTime: '17:00' },
      sessionType: 'lab'
    },

    // Friday Classes
    {
      id: '16',
      subject: { id: '1', name: 'Digital Logic Design', code: 'CS201', color: 'border-blue-500 bg-blue-50' },
      teacher: { id: '1', name: 'Dr. Smith' },
      room: { id: '6', number: '203', building: 'CS Building' },
      timeSlot: { id: '6', day: 'Friday', startTime: '09:00', endTime: '10:00' },
      sessionType: 'tutorial'
    },
    {
      id: '17',
      subject: { id: '2', name: 'Database Systems', code: 'CS301', color: 'border-green-500 bg-green-50' },
      teacher: { id: '2', name: 'Prof. Johnson' },
      room: { id: '21', number: '308', building: 'CS Building' },
      timeSlot: { id: '21', day: 'Friday', startTime: '11:00', endTime: '12:00' },
      sessionType: 'lecture'
    },
    {
      id: '18',
      subject: { id: '6', name: 'Mathematics III', code: 'MATH301', color: 'border-indigo-500 bg-indigo-50' },
      teacher: { id: '6', name: 'Dr. Anderson' },
      room: { id: '22', number: '105', building: 'Math Building' },
      timeSlot: { id: '22', day: 'Friday', startTime: '13:00', endTime: '14:00' },
      sessionType: 'lecture'
    },
    {
      id: '19',
      subject: { id: '5', name: 'Data Structures', code: 'CS202', color: 'border-red-500 bg-red-50' },
      teacher: { id: '5', name: 'Dr. Davis' },
      room: { id: '23', number: '215', building: 'CS Building' },
      timeSlot: { id: '23', day: 'Friday', startTime: '14:00', endTime: '15:00' },
      sessionType: 'lecture'
    },
    {
      id: '20',
      subject: { id: '3', name: 'Computer Networks', code: 'CS401', color: 'border-purple-500 bg-purple-50' },
      teacher: { id: '3', name: 'Dr. Williams' },
      room: { id: '24', number: '310', building: 'CS Building' },
      timeSlot: { id: '24', day: 'Friday', startTime: '16:00', endTime: '17:00' },
      sessionType: 'tutorial'
    }
  ];

  const getTimetableEntry = (day: string, time: string) => {
    return sampleTimetable.find(entry => 
      entry.timeSlot.day === day && entry.timeSlot.startTime === time
    );
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'lecture':
        return <BookOpen className="h-3 w-3" />;
      case 'lab':
        return <Clock className="h-3 w-3" />;
      case 'tutorial':
        return <User className="h-3 w-3" />;
      default:
        return <BookOpen className="h-3 w-3" />;
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Timetable</h1>
          <p className="text-gray-600 mt-1">
            {user?.department} - Semester {user?.semester}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setSelectedView('week')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                selectedView === 'week' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setSelectedView('day')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                selectedView === 'day' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Day
            </button>
          </div>

          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button variant="outline" className="flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Classes</p>
              <p className="text-2xl font-bold text-gray-900">{sampleTimetable.length}</p>
            </div>
            <div className="bg-blue-100 p-2 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Subjects</p>
              <p className="text-2xl font-bold text-gray-900">7</p>
            </div>
            <div className="bg-green-100 p-2 rounded-lg">
              <BookOpen className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Lectures</p>
              <p className="text-2xl font-bold text-gray-900">{sampleTimetable.filter(entry => entry.sessionType === 'lecture').length}</p>
            </div>
            <div className="bg-purple-100 p-2 rounded-lg">
              <User className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Labs</p>
              <p className="text-2xl font-bold text-gray-900">{sampleTimetable.filter(entry => entry.sessionType === 'lab').length}</p>
            </div>
            <div className="bg-orange-100 p-2 rounded-lg">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Timetable Grid */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {selectedView === 'week' ? (
              <>
                {/* Header Row */}
                <div className="grid grid-cols-6 gap-2 mb-4">
                  <div className="p-3 text-center font-medium text-gray-600 text-sm">Time</div>
                  {days.map(day => (
                    <div key={day} className="p-3 text-center font-medium text-gray-900 text-sm bg-gray-50 rounded-lg">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Time Slots */}
                <div className="space-y-2">
                  {timeSlots.map(slot => (
                    <div key={slot.time} className="grid grid-cols-6 gap-2">
                      {/* Time Column */}
                      <div className="p-3 text-center text-sm text-gray-600 font-medium bg-gray-50 rounded-lg flex items-center justify-center">
                        {slot.label}
                      </div>

                      {/* Day Columns */}
                      {days.map(day => {
                        const entry = getTimetableEntry(day, slot.time);
                        
                        if (entry) {
                          const isMultiHour = parseInt(entry.timeSlot.endTime.split(':')[0]) - parseInt(entry.timeSlot.startTime.split(':')[0]) > 1;
                          
                          return (
                            <div
                              key={`${day}-${slot.time}`}
                              className={`p-3 rounded-lg border-l-4 ${entry.subject.color} border shadow-sm hover:shadow-md transition-shadow cursor-pointer group ${
                                isMultiHour ? 'min-h-[80px]' : 'min-h-[60px]'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-start justify-between">
                                  <h4 className="font-medium text-gray-900 text-sm leading-tight group-hover:text-gray-700">
                                    {entry.subject.code}
                                  </h4>
                                  <div className="flex items-center text-gray-500">
                                    {getSessionTypeIcon(entry.sessionType)}
                                  </div>
                                </div>
                                
                                <p className="text-xs text-gray-600 truncate">
                                  {entry.subject.name}
                                </p>
                                
                                <div className="flex items-center text-xs text-gray-500 space-x-2">
                                  <span className="flex items-center">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {entry.room.number}
                                  </span>
                                </div>
                                
                                <p className="text-xs text-gray-500 truncate">
                                  {entry.teacher.name}
                                </p>
                                
                                <div className="text-xs text-gray-400">
                                  {formatTime(entry.timeSlot.startTime)} - {formatTime(entry.timeSlot.endTime)}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={`${day}-${slot.time}`}
                            className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors min-h-[60px] flex items-center justify-center"
                          >
                            <span className="text-gray-400 text-sm">Free</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* Day View Header */}
                <div className="mb-6">
                  <div className="flex justify-center">
                    <div className="flex bg-gray-100 rounded-lg p-1 overflow-x-auto">
                      {days.map(day => (
                        <button
                          key={day}
                          onClick={() => setSelectedDay(day)}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                            selectedDay === day 
                              ? 'bg-white text-gray-900 shadow-sm' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Day View Content */}
                <div className="max-w-2xl mx-auto">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                    {selectedDay} Schedule
                  </h3>
                  <div className="space-y-3">
                    {(() => {
                      const dayClasses = timeSlots
                        .map(slot => getTimetableEntry(selectedDay, slot.time))
                        .filter(entry => entry !== undefined);
                      
                      if (dayClasses.length === 0) {
                        return (
                          <div className="text-center py-12">
                            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">No classes scheduled for {selectedDay}</p>
                          </div>
                        );
                      }
                      
                      return dayClasses.map((entry) => (
                        <div
                          key={`${selectedDay}-${entry!.timeSlot.startTime}`}
                          className={`p-4 rounded-lg border-l-4 ${entry!.subject.color} border shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="font-semibold text-gray-900 text-lg">
                                  {entry!.subject.code} - {entry!.subject.name}
                                </h4>
                                <div className="flex items-center text-gray-500">
                                  {getSessionTypeIcon(entry!.sessionType)}
                                  <span className="ml-1 text-sm capitalize">{entry!.sessionType}</span>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-2" />
                                  {formatTime(entry!.timeSlot.startTime)} - {formatTime(entry!.timeSlot.endTime)}
                                </div>
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-2" />
                                  {entry!.room.number}, {entry!.room.building}
                                </div>
                                <div className="flex items-center">
                                  <User className="h-4 w-4 mr-2" />
                                  {entry!.teacher.name}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Legend */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Session Types</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4 text-gray-600" />
            <span className="text-sm text-gray-600">Lecture</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-600" />
            <span className="text-sm text-gray-600">Lab</span>
          </div>
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-gray-600" />
            <span className="text-sm text-gray-600">Tutorial</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StudentTimetablePage;
