import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Filter,
  Download,
  Printer,
  RefreshCw,
  ArrowUpDown,
  CheckCircle,
  AlertCircle,
  Eye,
  Settings,
  BookOpen
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

import '../css/TeacherTimetablePage.css';

// Interfaces for teacher timetable data
interface TeacherClass {
  id: string;
  subject: string;
  subjectCode: string;
  day: string;
  timeSlot: string;
  room: string;
  type: 'lecture' | 'practical' | 'tutorial';
  duration: number;
  students: number;
  semester: string;
  section: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'swapped';
  canSwap: boolean;
  swapRequests?: string[];
  attendanceMarked?: boolean;
}

interface WeeklyStats {
  totalClasses: number;
  completedClasses: number;
  pendingClasses: number;
  averageAttendance: number;
}

const TeacherTimetablePage: React.FC = () => {
  const [selectedWeek, setSelectedWeek] = useState<string>('current');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Sample teacher timetable data
  const [teacherClasses] = useState<TeacherClass[]>([
    {
      id: '1',
      subject: 'Data Structures & Algorithms',
      subjectCode: 'CS301',
      day: 'Monday',
      timeSlot: '9:00AM-10:00AM',
      room: 'Room-301',
      type: 'lecture',
      duration: 60,
      students: 45,
      semester: 'V',
      section: 'A',
      status: 'completed',
      canSwap: false,
      attendanceMarked: true
    },
    {
      id: '2',
      subject: 'Data Structures & Algorithms',
      subjectCode: 'CS301',
      day: 'Wednesday',
      timeSlot: '10:00AM-11:00AM',
      room: 'Room-301',
      type: 'lecture',
      duration: 60,
      students: 45,
      semester: 'V',
      section: 'A',
      status: 'scheduled',
      canSwap: true,
      attendanceMarked: false
    },
    {
      id: '3',
      subject: 'Database Management Systems',
      subjectCode: 'CS302',
      day: 'Monday',
      timeSlot: '11:00AM-12:00PM',
      room: 'Room-302',
      type: 'lecture',
      duration: 60,
      students: 42,
      semester: 'V',
      section: 'B',
      status: 'completed',
      canSwap: true,
      swapRequests: ['Prof. Mike Chen'],
      attendanceMarked: true
    },
    {
      id: '4',
      subject: 'Database Management Systems',
      subjectCode: 'CS302',
      day: 'Thursday',
      timeSlot: '2:00PM-3:00PM',
      room: 'Room-302',
      type: 'lecture',
      duration: 60,
      students: 42,
      semester: 'V',
      section: 'B',
      status: 'scheduled',
      canSwap: true,
      attendanceMarked: false
    },
    {
      id: '5',
      subject: 'Computer Networks Lab',
      subjectCode: 'CS303L',
      day: 'Tuesday',
      timeSlot: '2:00PM-4:00PM',
      room: 'Lab-CS-2',
      type: 'practical',
      duration: 120,
      students: 30,
      semester: 'V',
      section: 'A',
      status: 'scheduled',
      canSwap: true,
      attendanceMarked: false
    },
    {
      id: '6',
      subject: 'Computer Networks Lab',
      subjectCode: 'CS303L',
      day: 'Friday',
      timeSlot: '10:00AM-12:00PM',
      room: 'Lab-CS-2',
      type: 'practical',
      duration: 120,
      students: 28,
      semester: 'V',
      section: 'B',
      status: 'scheduled',
      canSwap: true,
      attendanceMarked: false
    },
    {
      id: '7',
      subject: 'Software Engineering',
      subjectCode: 'CS304',
      day: 'Wednesday',
      timeSlot: '3:00PM-4:00PM',
      room: 'Room-305',
      type: 'lecture',
      duration: 60,
      students: 38,
      semester: 'VI',
      section: 'A',
      status: 'scheduled',
      canSwap: true,
      attendanceMarked: false
    },
    {
      id: '8',
      subject: 'Software Engineering',
      subjectCode: 'CS304',
      day: 'Friday',
      timeSlot: '4:00PM-5:00PM',
      room: 'Room-305',
      type: 'tutorial',
      duration: 60,
      students: 38,
      semester: 'VI',
      section: 'A',
      status: 'scheduled',
      canSwap: true,
      attendanceMarked: false
    }
  ]);

  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    totalClasses: 0,
    completedClasses: 0,
    pendingClasses: 0,
    averageAttendance: 85
  });

  const timeSlots = [
    '8:00AM-9:00AM',
    '9:00AM-10:00AM',
    '10:00AM-11:00AM',
    '11:00AM-12:00PM',
    '12:00PM-1:00PM',
    '1:00PM-2:00PM',
    '2:00PM-3:00PM',
    '3:00PM-4:00PM',
    '4:00PM-5:00PM',
    '5:00PM-6:00PM'
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const subjects = Array.from(new Set(teacherClasses.map(cls => cls.subject)));

  useEffect(() => {
    // Calculate weekly stats
    const completed = teacherClasses.filter(cls => cls.status === 'completed').length;
    const pending = teacherClasses.filter(cls => cls.status === 'scheduled').length;
    
    setWeeklyStats({
      totalClasses: teacherClasses.length,
      completedClasses: completed,
      pendingClasses: pending,
      averageAttendance: 85
    });
  }, [teacherClasses]);

  const getFilteredClasses = () => {
    return teacherClasses.filter(cls => {
      if (selectedSubject !== 'all' && cls.subject !== selectedSubject) {
        return false;
      }
      return true;
    });
  };

  const getClassForSlot = (day: string, timeSlot: string) => {
    return getFilteredClasses().find(cls => cls.day === day && cls.timeSlot === timeSlot);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'swapped': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSubjectColor = (subject: string) => {
    const colors = {
      'Data Structures & Algorithms': {
        bg: 'from-blue-100 to-blue-200',
        hoverBg: 'hover:from-blue-200 hover:to-blue-300',
        border: 'border-blue-400',
        text: 'text-blue-900'
      },
      'Database Management Systems': {
        bg: 'from-green-100 to-green-200',
        hoverBg: 'hover:from-green-200 hover:to-green-300',
        border: 'border-green-400',
        text: 'text-green-900'
      },
      'Computer Networks Lab': {
        bg: 'from-purple-100 to-purple-200',
        hoverBg: 'hover:from-purple-200 hover:to-purple-300',
        border: 'border-purple-400',
        text: 'text-purple-900'
      },
      'Software Engineering': {
        bg: 'from-indigo-100 to-indigo-200',
        hoverBg: 'hover:from-indigo-200 hover:to-indigo-300',
        border: 'border-indigo-400',
        text: 'text-indigo-900'
      }
    };

    return colors[subject as keyof typeof colors] || {
      bg: 'from-gray-100 to-gray-200',
      hoverBg: 'hover:from-gray-200 hover:to-gray-300',
      border: 'border-gray-400',
      text: 'text-gray-900'
    };
  };

  return (
    <div className="space-y-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen p-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Calendar className="h-8 w-8" />
              <h1 className="text-4xl font-bold">My Timetable</h1>
            </div>
            <p className="text-blue-100 text-lg">Your personal teaching schedule and class management dashboard</p>
            <div className="flex items-center space-x-6 mt-4 text-sm">
              <div className="flex items-center space-x-2 bg-white bg-opacity-20 rounded-lg px-3 py-2">
                <Clock className="h-4 w-4" />
                <span>{getFilteredClasses().length} classes this week</span>
              </div>
              <div className="flex items-center space-x-2 bg-white bg-opacity-20 rounded-lg px-3 py-2">
                <BookOpen className="h-4 w-4" />
                <span>{subjects.length} subjects</span>
              </div>
              <div className="flex items-center space-x-2 bg-white bg-opacity-20 rounded-lg px-3 py-2">
                <Users className="h-4 w-4" />
                <span>{weeklyStats.completedClasses}/{weeklyStats.totalClasses} completed</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="bg-white bg-opacity-20 border-white border-opacity-30 text-white hover:bg-white hover:bg-opacity-30 backdrop-blur-sm"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button variant="outline" className="bg-white bg-opacity-20 border-white border-opacity-30 text-white hover:bg-white hover:bg-opacity-30 backdrop-blur-sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" className="bg-white bg-opacity-20 border-white border-opacity-30 text-white hover:bg-white hover:bg-opacity-30 backdrop-blur-sm">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button className="bg-white text-blue-600 hover:bg-gray-100 font-semibold">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      {showFilters && (
        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <Filter className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Filter Options</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Week Selection</label>
                <div className="relative">
                  <select
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(e.target.value)}
                    title="Select week"
                    aria-label="Select week to view"
                  >
                    <option value="current">Current Week</option>
                    <option value="next">Next Week</option>
                    <option value="previous">Previous Week</option>
                  </select>
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject Filter</label>
                <div className="relative">
                  <select
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    title="Select subject"
                    aria-label="Filter by subject"
                  >
                    <option value="all">All Subjects</option>
                    {subjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                  <BookOpen className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">View Mode</label>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant={viewMode === 'grid' ? 'primary' : 'outline'}
                    onClick={() => setViewMode('grid')}
                    className="flex-1"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Grid
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === 'list' ? 'primary' : 'outline'}
                    onClick={() => setViewMode('list')}
                    className="flex-1"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    List
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Generate</label>
                <Button size="sm" variant="outline" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Preferences
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Weekly Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Classes</p>
              <p className="text-3xl font-bold text-blue-900">{weeklyStats.totalClasses}</p>
              <p className="text-xs text-blue-500 mt-1">This week</p>
            </div>
            <div className="bg-blue-500 p-3 rounded-full">
              <Calendar className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Completed</p>
              <p className="text-3xl font-bold text-green-900">{weeklyStats.completedClasses}</p>
              <p className="text-xs text-green-500 mt-1">Classes finished</p>
            </div>
            <div className="bg-green-500 p-3 rounded-full">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Pending</p>
              <p className="text-3xl font-bold text-orange-900">{weeklyStats.pendingClasses}</p>
              <p className="text-xs text-orange-500 mt-1">Upcoming classes</p>
            </div>
            <div className="bg-orange-500 p-3 rounded-full">
              <Clock className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Attendance</p>
              <p className="text-3xl font-bold text-purple-900">{weeklyStats.averageAttendance}%</p>
              <p className="text-xs text-purple-500 mt-1">Average rate</p>
            </div>
            <div className="bg-purple-500 p-3 rounded-full">
              <Users className="h-6 w-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Timetable Grid/List View */}
      {viewMode === 'grid' ? (
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                <Calendar className="h-7 w-7 mr-3 text-blue-600" />
                Weekly Schedule
              </h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>{getFilteredClasses().length} classes this week</span>
              </div>
            </div>
            
            {/* Timetable Grid */}
            <div className="overflow-x-auto timetable-scroll">
              <table className="timetable-table w-full border-collapse rounded-2xl overflow-hidden shadow-sm bg-gradient-to-br from-white to-gray-50">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <th className="py-4 px-4 text-left font-bold rounded-tl-2xl">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-5 w-5" />
                        <span>Day</span>
                      </div>
                    </th>
                    {timeSlots.map((timeSlot, index) => (
                      <th key={timeSlot} className={`py-4 px-2 text-center font-bold text-sm ${
                        index === timeSlots.length - 1 ? 'rounded-tr-2xl' : ''
                      }`}>
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <div className={`w-2 h-2 rounded-full ${
                            index < 3 ? 'bg-yellow-300' :
                            index < 6 ? 'bg-green-300' :
                            'bg-orange-300'
                          }`}></div>
                          <span className="text-xs leading-tight">{timeSlot}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {days.map((day, dayIndex) => (
                    <tr key={day} className={`group transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 ${
                      dayIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}>
                      <td className={`timetable-cell py-4 px-4 font-bold text-gray-800 border-r border-gray-200 bg-gradient-to-r from-gray-100 to-gray-50 ${
                        dayIndex === days.length - 1 ? 'rounded-bl-2xl' : ''
                      }`}>
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${
                            dayIndex === 0 ? 'bg-blue-500' :
                            dayIndex === 1 ? 'bg-green-500' :
                            dayIndex === 2 ? 'bg-yellow-500' :
                            dayIndex === 3 ? 'bg-orange-500' : 'bg-purple-500'
                          }`}></div>
                          <span className="text-sm">{day}</span>
                        </div>
                      </td>
                      {timeSlots.map((timeSlot, timeIndex) => {
                        const classItem = getClassForSlot(day, timeSlot);
                        return (
                          <td key={`${day}-${timeSlot}`} className={`timetable-cell py-2 px-1 border-r border-gray-100 relative group-hover:border-blue-200 transition-colors ${
                            dayIndex === days.length - 1 && timeIndex === timeSlots.length - 1 ? 'rounded-br-2xl border-r-0' : ''
                          }`}>
                            {classItem ? (
                              (() => {
                                const subjectColors = getSubjectColor(classItem.subject);
                                return (
                                  <div className={`grid-card-hover p-2 rounded-lg border-l-4 transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer group/card bg-gradient-to-br ${subjectColors.bg} ${subjectColors.hoverBg} ${subjectColors.border} relative h-full flex flex-col justify-between overflow-hidden`}>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className={`inline-flex items-center px-1 py-0.5 rounded text-xs font-bold border shadow-sm ${getStatusColor(classItem.status)}`}>
                                        {classItem.status === 'completed' && <CheckCircle className="h-2 w-2 mr-1" />}
                                        {classItem.status === 'scheduled' && <Clock className="h-2 w-2 mr-1" />}
                                        <span className="capitalize text-xs">{classItem.status}</span>
                                      </span>
                                      {classItem.status === 'completed' && (
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Completed - View Only"></div>
                                      )}
                                    </div>
                                    
                                    <h4 className={`font-bold text-xs mb-1 line-clamp-2 leading-tight ${subjectColors.text}`}>
                                      {classItem.subjectCode}
                                    </h4>

                                    {/* Lab/Theory Type Badge */}
                                    <div className="mb-1">
                                      <span className={`inline-flex items-center px-1 py-0.5 rounded text-xs font-bold text-white ${
                                        classItem.type === 'practical' ? 'bg-purple-500' : 
                                        classItem.type === 'tutorial' ? 'bg-orange-500' : 'bg-blue-500'
                                      }`}>
                                        {classItem.type === 'practical' && <Users className="h-2 w-2 mr-1" />}
                                        {classItem.type === 'tutorial' && <RefreshCw className="h-2 w-2 mr-1" />}
                                        {classItem.type === 'lecture' && <BookOpen className="h-2 w-2 mr-1" />}
                                        <span className="capitalize">{classItem.type === 'practical' ? 'Lab' : classItem.type === 'lecture' ? 'Theory' : 'Tutorial'}</span>
                                      </span>
                                    </div>
                                    
                                    <div className="space-y-0.5">
                                      <div className={`flex items-center text-xs ${subjectColors.text} opacity-70`}>
                                        <MapPin className="h-2 w-2 mr-1 flex-shrink-0" />
                                        <span className="truncate">{classItem.room}</span>
                                      </div>
                                      <div className={`flex items-center text-xs ${subjectColors.text} opacity-70`}>
                                        <Users className="h-2 w-2 mr-1 flex-shrink-0" />
                                        <span>{classItem.students}</span>
                                      </div>
                                    </div>

                                    {/* Action buttons overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover/card:opacity-100 rounded-lg transition-all duration-300 flex items-end justify-center pb-3">
                                      <div className="flex items-center space-x-3">
                                        <Button 
                                          size="sm" 
                                          className="action-button h-10 w-10 p-0 bg-white/95 hover:bg-white border-2 border-white/50 rounded-full shadow-xl transform hover:scale-110 transition-all duration-200"
                                          title="View Details"
                                        >
                                          <Eye className="h-6 w-6 text-blue-600" />
                                        </Button>
                                        {classItem.status !== 'completed' && classItem.canSwap && (
                                          <Button 
                                            size="sm" 
                                            className="action-button h-10 w-10 p-0 bg-white/95 hover:bg-white border-2 border-white/50 rounded-full shadow-xl transform hover:scale-110 transition-all duration-200"
                                            title="Request Swap"
                                          >
                                            <ArrowUpDown className="h-6 w-6 text-red-600" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()
                            ) : (
                              <div className="h-full flex items-center justify-center opacity-30 hover:opacity-60 transition-opacity cursor-pointer">
                                <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-blue-400 transition-colors">
                                  <span className="text-xs text-gray-400">+</span>
                                </div>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      ) : (
        /* Enhanced List View */
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                <BookOpen className="h-7 w-7 mr-3 text-blue-600" />
                Classes List
              </h3>
              <span className="text-sm text-gray-500">{getFilteredClasses().length} classes</span>
            </div>
            
            <div className="space-y-4">
              {getFilteredClasses().map((classItem: TeacherClass) => {
                const subjectColors = getSubjectColor(classItem.subject);
                return (
                  <div key={classItem.id} className={`p-6 rounded-xl border-l-4 bg-gradient-to-br ${subjectColors.bg} ${subjectColors.hoverBg} ${subjectColors.border} hover:shadow-lg transition-all duration-300 border border-gray-200`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h4 className={`font-bold text-xl ${subjectColors.text}`}>
                            {classItem.subject}
                          </h4>
                          <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(classItem.status)}`}>
                            {classItem.status === 'completed' && <CheckCircle className="h-4 w-4 mr-1 inline" />}
                            {classItem.status === 'scheduled' && <Clock className="h-4 w-4 mr-1 inline" />}
                            <span className="capitalize">{classItem.status}</span>
                          </span>
                          <span className={`px-3 py-1 text-sm font-medium rounded text-white shadow-sm ${
                            classItem.type === 'practical' ? 'bg-gradient-to-r from-purple-500 to-purple-600' : 
                            classItem.type === 'tutorial' ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 
                            'bg-gradient-to-r from-blue-500 to-blue-600'
                          }`}>
                            {classItem.type === 'practical' && <Users className="h-4 w-4 mr-1 inline" />}
                            {classItem.type === 'tutorial' && <RefreshCw className="h-4 w-4 mr-1 inline" />}
                            {classItem.type === 'lecture' && <BookOpen className="h-4 w-4 mr-1 inline" />}
                            <span className="capitalize font-semibold">
                              {classItem.type === 'practical' ? 'Lab Session' : 
                               classItem.type === 'lecture' ? 'Theory Class' : 
                               'Tutorial'}
                            </span>
                          </span>
                        </div>
                        
                        <p className={`text-lg font-medium ${subjectColors.text} opacity-80 mb-3`}>
                          {classItem.subjectCode} • Semester {classItem.semester} • Section {classItem.section}
                        </p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center space-x-2 bg-white bg-opacity-60 rounded-lg p-3">
                            <Calendar className="h-5 w-5 text-blue-600" />
                            <div>
                              <p className="font-medium text-gray-900">{classItem.day}</p>
                              <p className="text-gray-600">Day</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 bg-white bg-opacity-60 rounded-lg p-3">
                            <Clock className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="font-medium text-gray-900">{classItem.timeSlot}</p>
                              <p className="text-gray-600">Time</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 bg-white bg-opacity-60 rounded-lg p-3">
                            <MapPin className="h-5 w-5 text-purple-600" />
                            <div>
                              <p className="font-medium text-gray-900">{classItem.room}</p>
                              <p className="text-gray-600">Location</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 bg-white bg-opacity-60 rounded-lg p-3">
                            <Users className="h-5 w-5 text-orange-600" />
                            <div>
                              <p className="font-medium text-gray-900">{classItem.students}</p>
                              <p className="text-gray-600">Students</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-3">
                        <div className="flex items-center space-x-2">
                          {classItem.swapRequests && classItem.swapRequests.length > 0 && (
                            <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full border border-yellow-200 flex items-center">
                              <AlertCircle className="h-4 w-4 mr-1" />
                              {classItem.swapRequests.length} swap request(s)
                            </span>
                          )}
                          {classItem.attendanceMarked && (
                            <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-3 py-1 rounded-full border border-green-200">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm">Attendance Marked</span>
                            </div>
                          )}
                          {!classItem.attendanceMarked && classItem.status === 'completed' && (
                            <div className="flex items-center space-x-1 bg-orange-100 text-orange-800 px-3 py-1 rounded-full border border-orange-200">
                              <AlertCircle className="h-4 w-4" />
                              <span className="text-sm">Pending Attendance</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex space-x-3">
                          <Button size="sm" variant="outline" className="bg-white hover:bg-gray-50 border-gray-300 text-gray-700 font-medium shadow-sm">
                            <Eye className="h-6 w-6 mr-2 text-blue-600" />
                            View Details
                          </Button>
                          {classItem.status !== 'completed' && classItem.canSwap && (
                            <Button size="sm" variant="outline" className="bg-white hover:bg-gray-50 border-gray-300 text-gray-700 font-medium shadow-sm">
                              <ArrowUpDown className="h-6 w-6 mr-2 text-red-600" />
                              Request Swap
                            </Button>
                          )}
                          {!classItem.attendanceMarked && classItem.status === 'completed' && (
                            <Button size="sm" className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium shadow-sm">
                              <CheckCircle className="h-6 w-6 mr-2" />
                              Mark Attendance
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default TeacherTimetablePage;
