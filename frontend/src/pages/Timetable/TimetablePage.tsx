import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { 
  Calendar, 
  Download, 
  RefreshCw, 
  Eye,
  Search,
  BookOpen,
  Users,
  Clock,
  MapPin,
  ChevronDown,
  Grid,
  List,
  Printer,
  FileText,
  Star,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import '../css/GeneratePage.module.css';

interface TimetableEntry {
  id: string;
  subject: string;
  subjectCode: string;
  teacher: string;
  room: string;
  timeSlot: string;
  day: string;
  type: 'lecture' | 'lab' | 'tutorial';
  duration: number;
  department: string;
  year: number;
  semester: string;
}

const TimetablePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [timetableData, setTimetableData] = useState<TimetableEntry[]>([]);
  const [showTimetableGenerator, setShowTimetableGenerator] = useState<boolean>(false);
  
  const years = ['1', '2', '3', '4'];
  const semesters = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  const timeSlots = [
    '8:00AM-9:00AM', '9:00AM-10:00AM', '10:00AM-11:00AM', '11:00AM-12:00PM',
    '12:00PM-1:00PM', '1:00PM-2:00PM', '2:00PM-3:00PM', '3:00PM-4:00PM', '4:00PM-5:00PM'
  ];

  // Mock timetable data - this would come from API
  useEffect(() => {
    const loadTimetables = async () => {
      try {
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockData: TimetableEntry[] = [
          {
            id: '1',
            subject: 'Data Structures & Algorithms',
            subjectCode: 'CS301',
            teacher: 'Dr. Sarah Johnson',
            room: 'Lab-CS-1',
            timeSlot: '9:00AM-10:00AM',
            day: 'Monday',
            type: 'lecture',
            duration: 60,
            department: 'cs',
            year: 3,
            semester: 'V'
          },
          {
            id: '2',
            subject: 'Database Management Systems',
            subjectCode: 'CS302',
            teacher: 'Prof. Mike Chen',
            room: 'Room-301',
            timeSlot: '10:00AM-11:00AM',
            day: 'Monday',
            type: 'lecture',
            duration: 60,
            department: 'cs',
            year: 3,
            semester: 'V'
          },
          {
            id: '3',
            subject: 'Computer Networks Lab',
            subjectCode: 'CS303L',
            teacher: 'Dr. Emily Watson',
            room: 'Lab-CS-2',
            timeSlot: '2:00PM-3:00PM',
            day: 'Tuesday',
            type: 'lab',
            duration: 120,
            department: 'cs',
            year: 3,
            semester: 'V'
          },
          {
            id: '4',
            subject: 'Mathematics',
            subjectCode: 'MATH201',
            teacher: 'Dr. Alex Brown',
            room: 'Room-201',
            timeSlot: '8:00AM-9:00AM',
            day: 'Wednesday',
            type: 'lecture',
            duration: 60,
            department: 'cs',
            year: 3,
            semester: 'V'
          },
          {
            id: '5',
            subject: 'Physics',
            subjectCode: 'PHY101',
            teacher: 'Prof. Lisa Davis',
            room: 'Lab-PHY-1',
            timeSlot: '11:00AM-12:00PM',
            day: 'Thursday',
            type: 'lab',
            duration: 60,
            department: 'cs',
            year: 3,
            semester: 'V'
          }
        ];
        
        setTimetableData(mockData);
      } catch (error) {
        console.error('Error loading timetables:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTimetables();
  }, [selectedDepartment, selectedYear, selectedSemester]);

  const filteredTimetables = timetableData.filter(entry => {
    const matchesDepartment = selectedDepartment === 'all' || entry.department === selectedDepartment;
    const matchesYear = selectedYear === 'all' || entry.year.toString() === selectedYear;
    const matchesSemester = selectedSemester === 'all' || entry.semester === selectedSemester;
    const matchesSearch = searchTerm === '' || 
      entry.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.teacher.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.subjectCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesDepartment && matchesYear && matchesSemester && matchesSearch;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lecture': return <BookOpen className="h-4 w-4" />;
      case 'lab': return <Users className="h-4 w-4" />;
      case 'tutorial': return <FileText className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lecture': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'lab': return 'bg-green-100 text-green-800 border-green-200';
      case 'tutorial': return 'bg-purple-100 text-purple-800 border-purple-200';
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
      'Mathematics': {
        bg: 'from-orange-100 to-orange-200',
        hoverBg: 'hover:from-orange-200 hover:to-orange-300',
        border: 'border-orange-400',
        text: 'text-orange-900'
      },
      'Physics': {
        bg: 'from-red-100 to-red-200',
        hoverBg: 'hover:from-red-200 hover:to-red-300',
        border: 'border-red-400',
        text: 'text-red-900'
      },
      'Chemistry': {
        bg: 'from-teal-100 to-teal-200',
        hoverBg: 'hover:from-teal-200 hover:to-teal-300',
        border: 'border-teal-400',
        text: 'text-teal-900'
      },
      'Software Engineering': {
        bg: 'from-indigo-100 to-indigo-200',
        hoverBg: 'hover:from-indigo-200 hover:to-indigo-300',
        border: 'border-indigo-400',
        text: 'text-indigo-900'
      },
      'Operating Systems': {
        bg: 'from-pink-100 to-pink-200',
        hoverBg: 'hover:from-pink-200 hover:to-pink-300',
        border: 'border-pink-400',
        text: 'text-pink-900'
      }
    };

    return colors[subject as keyof typeof colors] || {
      bg: 'from-gray-100 to-gray-200',
      hoverBg: 'hover:from-gray-200 hover:to-gray-300',
      border: 'border-gray-400',
      text: 'text-gray-900'
    };
  };

  const renderFilters = () => (
    <Card className="mb-8 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <div className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search subjects, teachers, or codes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Department Filter */}
            <div className="relative">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
                aria-label="Select department"
              >
                <option value="all">All Departments</option>
                <option value="cs">Computer Science</option>
                <option value="it">Information Technology</option>
                <option value="ec">Electronics & Communication</option>
                <option value="me">Mechanical Engineering</option>
                <option value="ce">Civil Engineering</option>
                <option value="ee">Electrical Engineering</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>

            {/* Year Filter */}
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[150px]"
                aria-label="Select year"
              >
                <option value="all">All Years</option>
                {years.map(year => (
                  <option key={year} value={year}>Year {year}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>

            {/* Semester Filter */}
            <div className="relative">
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[150px]"
                aria-label="Select semester"
              >
                <option value="all">All Semesters</option>
                {semesters.map(sem => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                aria-label="Grid view"
              >
                <Grid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'list' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                aria-label="List view"
              >
                <List className="h-5 w-5" />
              </button>
            </div>
            
            <Button variant="outline" className="flex items-center">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            
            <Button variant="outline" className="flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );

  const renderTimetableGrid = () => (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-7 w-7 mr-3 text-blue-600" />
            Weekly Timetable
            {selectedDepartment !== 'all' && (
              <span className="ml-3 text-lg text-gray-600">
                - {selectedDepartment.toUpperCase()}
                {selectedYear !== 'all' && ` Year ${selectedYear}`}
                {selectedSemester !== 'all' && ` Sem ${selectedSemester}`}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{filteredTimetables.length} entries</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading timetables...</p>
            </div>
          </div>
        ) : filteredTimetables.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Timetables Found</h3>
              <p className="text-gray-600">Try adjusting your filters or search terms.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-separate border-spacing-0 rounded-2xl overflow-hidden shadow-lg">
              <thead>
                <tr className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600">
                  <th className="text-left py-3 px-4 font-bold text-white rounded-tl-2xl border-r border-white/20">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5" />
                      <span>Day</span>
                    </div>
                  </th>
                  {timeSlots.map((slot, index) => (
                    <th key={slot} className={`text-center py-3 px-3 font-semibold text-white border-r border-white/20 min-w-[90px] ${
                      index === timeSlots.length - 1 ? 'rounded-tr-2xl border-r-0' : ''
                    }`}>
                      <div className="text-xs leading-tight">
                        {slot}
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
                    <td className={`py-4 px-4 font-bold text-gray-800 border-r border-gray-200 bg-gradient-to-r from-gray-100 to-gray-50 ${
                      dayIndex === days.length - 1 ? 'rounded-bl-2xl' : ''
                    }`}>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${
                          dayIndex === 0 ? 'bg-blue-500' :
                          dayIndex === 1 ? 'bg-green-500' :
                          dayIndex === 2 ? 'bg-purple-500' :
                          'bg-orange-500'
                        }`}></div>
                        <span className="text-sm">{day}</span>
                      </div>
                    </td>
                    {timeSlots.map((slot, slotIndex) => {
                      const entry = filteredTimetables.find(
                        e => e.day === day && e.timeSlot === slot
                      );
                      return (
                        <td key={`${day}-${slot}`} className={`py-2 px-1 border-r border-gray-100 relative group-hover:border-blue-200 transition-colors ${
                          dayIndex === days.length - 1 && slotIndex === timeSlots.length - 1 ? 'rounded-br-2xl border-r-0' : ''
                        }`}>
                          {entry ? (
                            (() => {
                              const subjectColors = getSubjectColor(entry.subject);
                              return (
                                <div className={`p-2 rounded-xl border-l-4 transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer group/card bg-gradient-to-br ${subjectColors.bg} ${subjectColors.hoverBg} ${subjectColors.border}`}>
                                  <div className="mb-1">
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-xs font-bold border shadow-sm ${getTypeColor(entry.type)}`}>
                                      {getTypeIcon(entry.type)}
                                      <span className="ml-1 capitalize">{entry.type}</span>
                                    </span>
                                  </div>
                                  <h4 className={`font-bold text-xs mb-1 line-clamp-2 leading-tight ${subjectColors.text}`}>
                                    {entry.subject}
                                  </h4>
                                  <p className={`text-xs mb-1 font-medium ${subjectColors.text} opacity-80`}>{entry.subjectCode}</p>
                                  <div className={`flex items-center text-xs mb-1 ${subjectColors.text} opacity-70`}>
                                    <Users className="h-3 w-3 mr-1 flex-shrink-0" />
                                    <span className="truncate">{entry.teacher}</span>
                                  </div>
                                  <div className={`flex items-center text-xs ${subjectColors.text} opacity-70`}>
                                    <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                                    <span className="truncate">{entry.room}</span>
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            <div className="h-20 flex items-center justify-center text-gray-300 hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100 rounded-lg transition-all duration-200 group">
                              <Clock className="h-4 w-4 group-hover:scale-110 transition-transform" />
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
        )}
      </div>
    </Card>
  );

  const renderTimetableList = () => (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <List className="h-7 w-7 mr-3 text-blue-600" />
            Timetable Entries
          </h2>
          <span className="text-sm text-gray-500">{filteredTimetables.length} entries</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTimetables.map((entry) => (
              <div
                key={entry.id}
                className="p-6 border border-gray-200 rounded-xl hover:shadow-md transition-shadow bg-white"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getTypeColor(entry.type)}`}>
                        {getTypeIcon(entry.type)}
                        <span className="ml-2 capitalize">{entry.type}</span>
                      </span>
                      <span className="text-sm text-gray-500">{entry.subjectCode}</span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{entry.subject}</h3>
                    
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Users className="h-4 w-4 mr-2 text-blue-500" />
                        {entry.teacher}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-4 w-4 mr-2 text-green-500" />
                        {entry.room}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-4 w-4 mr-2 text-purple-500" />
                        {entry.day}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Clock className="h-4 w-4 mr-2 text-orange-500" />
                        {entry.timeSlot}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button size="sm" variant="outline">
                      <Printer className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-2xl mr-4">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
                Timetable Management
              </h1>
              <p className="text-gray-600 mt-3 text-lg">
                View and manage timetables across all departments and academic years
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <Button className="flex items-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                onClick={() => setShowTimetableGenerator(true)}
              >
                <Star className="h-4 w-4 mr-2" />
                Generate
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        {renderFilters()}

        {/* Main Content */}
        {viewMode === 'grid' ? renderTimetableGrid() : renderTimetableList()}
      </div>
    </div>
  );
};

export default TimetablePage;
