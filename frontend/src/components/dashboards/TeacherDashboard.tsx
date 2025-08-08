import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, BookOpen, Users, MapPin, AlertCircle, Plus, 
  Building2, GraduationCap, BarChart3, RefreshCw, CheckCircle,
  ArrowUpDown, Target, Award, TrendingUp, User, ExternalLink
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import TimetableGenerator from '../timetable/TimetableGenerator';
import './TeacherDashboard.css';

// Enhanced interfaces for teacher data
interface TeacherProfile {
  id: string;
  name: string;
  email: string;
  department: string;
  employeeId: string;
  designation: string;
  experience: number;
}

interface SubjectProgress {
  id: string;
  name: string;
  code: string;
  totalLectures: number;
  completedLectures: number;
  department: string;
  semester: string;
  credits: number;
  type: 'theory' | 'practical' | 'tutorial';
}

interface TodayClass {
  id: string;
  subject: string;
  subjectCode: string;
  timeSlot: string;
  room: string;
  type: 'lecture' | 'practical' | 'tutorial';
  duration: number;
  status: 'upcoming' | 'ongoing' | 'completed';
  students: number;
  canSwap: boolean;
  swapRequests?: string[];
}

const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [teacherProfile] = useState<TeacherProfile>({
    id: '1',
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@university.edu',
    department: 'Computer Science',
    employeeId: 'EMP001',
    designation: 'Associate Professor',
    experience: 8
  });

  const [subjectProgress] = useState<SubjectProgress[]>([
    {
      id: '1',
      name: 'Data Structures & Algorithms',
      code: 'CS301',
      totalLectures: 45,
      completedLectures: 32,
      department: 'Computer Science',
      semester: 'V',
      credits: 4,
      type: 'theory'
    },
    {
      id: '2',
      name: 'Database Management Systems',
      code: 'CS302',
      totalLectures: 40,
      completedLectures: 28,
      department: 'Computer Science',
      semester: 'V',
      credits: 3,
      type: 'theory'
    },
    {
      id: '3',
      name: 'Computer Networks Lab',
      code: 'CS303L',
      totalLectures: 30,
      completedLectures: 25,
      department: 'Computer Science',
      semester: 'V',
      credits: 2,
      type: 'practical'
    },
    {
      id: '4',
      name: 'Software Engineering',
      code: 'CS304',
      totalLectures: 38,
      completedLectures: 22,
      department: 'Computer Science',
      semester: 'VI',
      credits: 4,
      type: 'theory'
    }
  ]);

  const [todaySchedule] = useState<TodayClass[]>([
    {
      id: '1',
      subject: 'Data Structures & Algorithms',
      subjectCode: 'CS301',
      timeSlot: '9:00AM-10:00AM',
      room: 'Room-301',
      type: 'lecture',
      duration: 60,
      status: 'completed',
      students: 45,
      canSwap: false
    },
    {
      id: '2',
      subject: 'Database Management Systems',
      subjectCode: 'CS302',
      timeSlot: '10:00AM-11:00AM',
      room: 'Room-302',
      type: 'lecture',
      duration: 60,
      status: 'completed',
      students: 42,
      canSwap: true,
      swapRequests: ['Prof. Mike Chen', 'Dr. Emily Watson']
    },
    {
      id: '3',
      subject: 'Computer Networks Lab',
      subjectCode: 'CS303L',
      timeSlot: '2:00PM-4:00PM',
      room: 'Lab-CS-2',
      type: 'practical',
      duration: 120,
      status: 'upcoming',
      students: 30,
      canSwap: true
    },
    {
      id: '4',
      subject: 'Software Engineering',
      subjectCode: 'CS304',
      timeSlot: '4:00PM-5:00PM',
      room: 'Room-305',
      type: 'lecture',
      duration: 60,
      status: 'upcoming',
      students: 38,
      canSwap: true
    }
  ]);

  const [weeklyStats, setWeeklyStats] = useState({
    totalClasses: 0,
    completedClasses: 0,
    upcomingClasses: 0,
    subjects: 0
  });
  const [nextClass, setNextClass] = useState<TodayClass | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTimetableGenerator, setShowTimetableGenerator] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedClassForSwap, setSelectedClassForSwap] = useState<TodayClass | null>(null);

  useEffect(() => {
    // Calculate stats from mock data
    const totalClasses = subjectProgress.reduce((acc, subject) => acc + subject.totalLectures, 0);
    const completedClasses = subjectProgress.reduce((acc, subject) => acc + subject.completedLectures, 0);
    
    setWeeklyStats({
      totalClasses,
      completedClasses,
      upcomingClasses: totalClasses - completedClasses,
      subjects: subjectProgress.length
    });

    // Find next class
    const upcomingClasses = todaySchedule.filter(cls => cls.status === 'upcoming');
    setNextClass(upcomingClasses.length > 0 ? upcomingClasses[0] : null);
  }, [subjectProgress, todaySchedule]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'ongoing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'upcoming': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProgressBarClass = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 70) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lecture': return 'bg-blue-100 text-blue-800';
      case 'practical': return 'bg-green-100 text-green-800';
      case 'tutorial': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSwapRequest = (classItem: TodayClass) => {
    setSelectedClassForSwap(classItem);
    setShowSwapModal(true);
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
      {/* Enhanced Header with Teacher Info */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Welcome back, {teacherProfile.name}!</h1>
              <div className="flex items-center space-x-4 mt-2 text-blue-100">
                <span className="flex items-center">
                  <Building2 className="h-4 w-4 mr-1" />
                  {teacherProfile.department}
                </span>
                <span className="flex items-center">
                  <GraduationCap className="h-4 w-4 mr-1" />
                  {teacherProfile.designation}
                </span>
                <span className="flex items-center">
                  <Award className="h-4 w-4 mr-1" />
                  {teacherProfile.experience} years exp.
                </span>
              </div>
              <p className="text-blue-100 mt-1">Employee ID: {teacherProfile.employeeId}</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" className="bg-white bg-opacity-20 border-white border-opacity-30 text-white hover:bg-white hover:bg-opacity-30">
              <Calendar className="h-4 w-4 mr-2" />
              View My Timetable
            </Button>
          </div>
        </div>
      </div>

      {/* Next Class Alert */}
      {nextClass && (
        <Card className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-green-900">Next Class</h3>
                <p className="text-green-700">
                  {nextClass.subject} ({nextClass.subjectCode}) at {nextClass.timeSlot} in {nextClass.room}
                </p>
                <p className="text-sm text-green-600">{nextClass.students} students enrolled</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
                Prepare Class
              </Button>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                Join Class
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Today's Classes</p>
              <p className="text-3xl font-bold text-blue-900">{todaySchedule.length}</p>
              <p className="text-xs text-blue-500 mt-1">
                {todaySchedule.filter(c => c.status === 'completed').length} completed
              </p>
            </div>
            <div className="bg-blue-500 p-3 rounded-full">
              <Calendar className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Subjects Teaching</p>
              <p className="text-3xl font-bold text-green-900">{weeklyStats.subjects}</p>
              <p className="text-xs text-green-500 mt-1">Across {teacherProfile.department}</p>
            </div>
            <div className="bg-green-500 p-3 rounded-full">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Total Lectures</p>
              <p className="text-3xl font-bold text-purple-900">{weeklyStats.totalClasses}</p>
              <p className="text-xs text-purple-500 mt-1">This semester</p>
            </div>
            <div className="bg-purple-500 p-3 rounded-full">
              <Clock className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Completion Rate</p>
              <p className="text-3xl font-bold text-orange-900">
                {Math.round((weeklyStats.completedClasses / weeklyStats.totalClasses) * 100)}%
              </p>
              <p className="text-xs text-orange-500 mt-1">
                {weeklyStats.completedClasses}/{weeklyStats.totalClasses} lectures
              </p>
            </div>
            <div className="bg-orange-500 p-3 rounded-full">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Today's Schedule with Swap Options */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Today's Schedule</h3>
            <Button size="sm" variant="outline" className="flex items-center">
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
          <div className="space-y-3">
            {todaySchedule.map((classItem) => (
              <div key={classItem.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(classItem.status)}`}>
                      {classItem.status}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(classItem.type)}`}>
                      {classItem.type}
                    </span>
                  </div>
                  {classItem.status === 'completed' && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
                
                <div className="mb-2">
                  <h4 className="font-medium text-gray-900">{classItem.subject}</h4>
                  <p className="text-sm text-gray-600">{classItem.subjectCode}</p>
                </div>
                
                <div className="flex items-center text-sm text-gray-500 space-x-4 mb-3">
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {classItem.timeSlot}
                  </span>
                  <span className="flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    {classItem.room}
                  </span>
                  <span className="flex items-center">
                    <Users className="h-3 w-3 mr-1" />
                    {classItem.students} students
                  </span>
                </div>

                {classItem.canSwap && classItem.status !== 'completed' && (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <div className="flex items-center space-x-2">
                      {classItem.swapRequests && classItem.swapRequests.length > 0 && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {classItem.swapRequests.length} swap request(s)
                        </span>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex items-center text-xs"
                      onClick={() => handleSwapRequest(classItem)}
                    >
                      <ArrowUpDown className="h-3 w-3 mr-1" />
                      Request Swap
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Subject Progress */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Progress</h3>
          <div className="space-y-4">
            {subjectProgress.map((subject) => {
              const progressPercentage = (subject.completedLectures / subject.totalLectures) * 100;
              return (
                <div key={subject.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{subject.name}</h4>
                      <p className="text-sm text-gray-600">{subject.code} • Semester {subject.semester}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{subject.completedLectures}/{subject.totalLectures}</p>
                      <p className="text-xs text-gray-500">{subject.credits} credits</p>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium text-gray-900">{Math.round(progressPercentage)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressBarClass(progressPercentage)}`}
                        data-width={Math.round(progressPercentage)}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(subject.type)}`}>
                      {subject.type}
                    </span>
                    <div className="flex items-center space-x-1">
                      <Target className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {subject.totalLectures - subject.completedLectures} remaining
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Additional Stats and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Schedule Makeup Class
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              View Swap Requests
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Generate Reports
            </Button>
            <Button 
              className="w-full justify-start bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              onClick={() => setShowTimetableGenerator(true)}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Generate Timetable
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Overview</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-blue-900">Total Faculty</span>
              <span className="text-lg font-bold text-blue-700">24</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-green-900">Active Subjects</span>
              <span className="text-lg font-bold text-green-700">18</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <span className="text-sm font-medium text-purple-900">Students Enrolled</span>
              <span className="text-lg font-bold text-purple-700">450</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Completed CS301 lecture</p>
                <p className="text-xs text-gray-500">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <ArrowUpDown className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Swap request approved</p>
                <p className="text-xs text-gray-500">4 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Generated progress report</p>
                <p className="text-xs text-gray-500">Yesterday</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Timetable Generator Modal */}
      {showTimetableGenerator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Timetable Generator</h2>
              <Button 
                variant="outline" 
                onClick={() => setShowTimetableGenerator(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>
            <div className="p-6">
              <TimetableGenerator />
            </div>
          </div>
        </div>
      )}

      {/* Lecture Swap Modal */}
      {showSwapModal && selectedClassForSwap && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Request Lecture Swap</h2>
              <p className="text-gray-600 mt-1">
                {selectedClassForSwap.subject} - {selectedClassForSwap.timeSlot}
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Teacher to Swap With
                  </label>
                  <select 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    title="Select teacher for swap"
                    aria-label="Select teacher for lecture swap"
                  >
                    <option>Prof. Mike Chen - Database Systems</option>
                    <option>Dr. Emily Watson - Computer Networks</option>
                    <option>Prof. John Smith - Software Engineering</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Swap
                  </label>
                  <textarea 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Please provide a reason for the lecture swap request..."
                  ></textarea>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowSwapModal(false)}>
                Cancel
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700">
                Send Request
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
