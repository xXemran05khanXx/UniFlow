import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, BookOpen, MapPin, GraduationCap, AlertCircle } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { timetablesAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { TimetableEntry, Timetable } from '../../types';

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [todaySchedule, setTodaySchedule] = useState<TimetableEntry[]>([]);
  const [weeklyStats, setWeeklyStats] = useState({
    totalClasses: 0,
    attendedClasses: 0,
    missedClasses: 0,
    subjects: 0
  });
  const [nextClass, setNextClass] = useState<TimetableEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStudentData = useCallback(async () => {
    try {
      // Fetch student's timetables based on semester and department
      const response = await timetablesAPI.getByStudent(user!._id);
      
      if (response.success && response.data) {
        const timetables = response.data;
        const allEntries: TimetableEntry[] = [];
        
        timetables.forEach((timetable: Timetable) => {
          allEntries.push(...timetable.entries);
        });

        // Filter today's classes
        const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
        const todayClasses = allEntries.filter(entry => 
          entry.timeSlot.dayOfWeek === today
        );
        setTodaySchedule(todayClasses);

        // Calculate weekly stats
        const uniqueSubjects = new Set(allEntries.map(entry => entry.subject._id));
        setWeeklyStats({
          totalClasses: allEntries.length,
          attendedClasses: Math.floor(allEntries.length * 0.85), // Mock data
          missedClasses: Math.floor(allEntries.length * 0.15),
          subjects: uniqueSubjects.size
        });

        // Find next class
        const currentTime = new Date();
        const nextUpcoming = todayClasses
          .filter(entry => {
            const [hours, minutes] = entry.timeSlot.startTime.split(':');
            const classTime = new Date();
            classTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            return classTime > currentTime;
          })
          .sort((a, b) => a.timeSlot.startTime.localeCompare(b.timeSlot.startTime))[0];
        
        setNextClass(nextUpcoming || null);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchStudentData();
    }
  }, [user, fetchStudentData]);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getAttendancePercentage = () => {
    if (weeklyStats.totalClasses === 0) return 0;
    return Math.round((weeklyStats.attendedClasses / weeklyStats.totalClasses) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Hello, {user?.name}!</h1>
          <p className="text-gray-600 mt-1">
            {user?.department} - Semester {user?.semester}
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            View Full Schedule
          </Button>
        </div>
      </div>

      {/* Next Class Alert */}
      {nextClass && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-green-900">Next Class</h3>
              <p className="text-green-700">
                {nextClass.subject.name} at {formatTime(nextClass.timeSlot.startTime)} in {nextClass.room.number}
              </p>
              <p className="text-sm text-green-600">
                with {nextClass.teacher.name}
              </p>
            </div>
            <Button size="sm" className="bg-green-600 hover:bg-green-700">
              View Details
            </Button>
          </div>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Classes</p>
              <p className="text-3xl font-bold text-gray-900">{todaySchedule.length}</p>
            </div>
            <div className="bg-blue-500 p-3 rounded-full">
              <Calendar className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Enrolled Subjects</p>
              <p className="text-3xl font-bold text-gray-900">{weeklyStats.subjects}</p>
            </div>
            <div className="bg-purple-500 p-3 rounded-full">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Weekly Classes</p>
              <p className="text-3xl font-bold text-gray-900">{weeklyStats.totalClasses}</p>
            </div>
            <div className="bg-orange-500 p-3 rounded-full">
              <Clock className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Attendance</p>
              <p className="text-3xl font-bold text-gray-900">{getAttendancePercentage()}%</p>
            </div>
            <div className="bg-green-500 p-3 rounded-full">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Classes</h3>
          <div className="space-y-3">
            {todaySchedule.length > 0 ? (
              todaySchedule.map((entry, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="font-medium text-gray-900">{entry.subject.name}</p>
                      <p className="text-sm text-gray-600">Prof. {entry.teacher.name}</p>
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTime(entry.timeSlot.startTime)} - {formatTime(entry.timeSlot.endTime)}
                        </span>
                        <span className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {entry.room.number}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    entry.sessionType === 'lecture' ? 'bg-blue-100 text-blue-800' :
                    entry.sessionType === 'practical' ? 'bg-green-100 text-green-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {entry.sessionType}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No classes scheduled for today</p>
            )}
          </div>
        </Card>

        {/* Attendance Overview */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Overall Attendance</span>
              <span className="text-sm font-bold text-green-600">{getAttendancePercentage()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`bg-green-500 h-3 rounded-full transition-all duration-300 w-[${getAttendancePercentage()}%]`}
              ></div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{weeklyStats.attendedClasses}</p>
                <p className="text-sm text-gray-500">Attended</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{weeklyStats.missedClasses}</p>
                <p className="text-sm text-gray-500">Missed</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Links */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="flex items-center justify-center p-4 h-auto">
            <Calendar className="h-5 w-5 mr-2" />
            View Full Timetable
          </Button>
          <Button variant="outline" className="flex items-center justify-center p-4 h-auto">
            <BookOpen className="h-5 w-5 mr-2" />
            Course Materials
          </Button>
          <Button variant="outline" className="flex items-center justify-center p-4 h-auto">
            <GraduationCap className="h-5 w-5 mr-2" />
            Academic Progress
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default StudentDashboard;
