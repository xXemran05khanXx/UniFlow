import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
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
import './css/GeneratePage.module.css';

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
  
  const years = ['1', '2', '3', '4'];
  const semesters = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeSlots = [
    '8:00-9:00', '9:00-10:00', '10:00-11:00', '11:00-12:00',
    '12:00-13:00', '13:00-14:00', '14:00-15:00', '15:00-16:00', '16:00-17:00'
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
            timeSlot: '9:00-10:00',
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
            timeSlot: '10:00-11:00',
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
            timeSlot: '14:00-16:00',
            day: 'Tuesday',
            type: 'lab',
            duration: 120,
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
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 bg-gray-50 rounded-tl-xl">Time</th>
                  {days.map(day => (
                    <th key={day} className="text-center py-4 px-4 font-semibold text-gray-900 bg-gray-50 min-w-[180px]">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot, slotIndex) => (
                  <tr key={slot} className={slotIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="py-4 px-4 font-medium text-gray-900 border-r border-gray-200">
                      {slot}
                    </td>
                    {days.map(day => {
                      const entry = filteredTimetables.find(
                        e => e.day === day && e.timeSlot === slot
                      );
                      return (
                        <td key={`${day}-${slot}`} className="py-2 px-2 border-r border-gray-100">
                          {entry ? (
                            <div className={`p-3 rounded-lg border-l-4 ${
                              entry.type === 'lecture' ? 'border-blue-500 bg-blue-50' :
                              entry.type === 'lab' ? 'border-green-500 bg-green-50' :
                              'border-purple-500 bg-purple-50'
                            } hover:shadow-md transition-shadow cursor-pointer group`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getTypeColor(entry.type)}`}>
                                  {getTypeIcon(entry.type)}
                                  <span className="ml-1 capitalize">{entry.type}</span>
                                </span>
                                <Button size="sm" variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </div>
                              <h4 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-2">
                                {entry.subject}
                              </h4>
                              <p className="text-xs text-gray-600 mb-1">{entry.subjectCode}</p>
                              <div className="flex items-center text-xs text-gray-500 mb-1">
                                <Users className="h-3 w-3 mr-1" />
                                {entry.teacher}
                              </div>
                              <div className="flex items-center text-xs text-gray-500">
                                <MapPin className="h-3 w-3 mr-1" />
                                {entry.room}
                              </div>
                            </div>
                          ) : (
                            <div className="h-24 flex items-center justify-center text-gray-300 hover:bg-gray-100 rounded-lg transition-colors">
                              <Clock className="h-5 w-5" />
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
              <Button className="flex items-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Star className="h-4 w-4 mr-2" />
                Quick Actions
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
