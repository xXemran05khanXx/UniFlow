import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  BookOpen, 
  Download, 
  RefreshCw, 
  Grid3X3,
  List,
  Search,
  Users,
  Building
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface TimeSlot {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  type: string;
}

interface Subject {
  _id: string;
  name: string;
  code: string;
  department: string;
  credits: number;
}

interface Teacher {
  _id: string;
  name: string;
  email: string;
  department: string;
}

interface Room {
  _id: string;
  number: string;
  name: string;
  capacity: number;
  type: string;
  building: string;
}

interface TimetableEntry {
  _id: string;
  subject: Subject;
  teacher: Teacher;
  room: Room;
  timeSlot: TimeSlot;
  dayOfWeek: number;
  sessionType: 'lecture' | 'practical' | 'lab' | 'tutorial';
  semester: number;
  department: string;
  division?: string;
  batch?: string;
}

interface Timetable {
  _id: string;
  name: string;
  department: string;
  semester: number;
  academicYear: string;
  entries: TimetableEntry[];
  createdAt: string;
  isActive: boolean;
}

const TimetablePage: React.FC = () => {
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [selectedTimetable, setSelectedTimetable] = useState<Timetable | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'calendar'>('table');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    department: 'all',
    semester: 'all',
    sessionType: 'all',
    dayOfWeek: 'all'
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const sessionColors = {
    lecture: 'bg-blue-100 text-blue-800 border-blue-200',
    practical: 'bg-green-100 text-green-800 border-green-200',
    lab: 'bg-purple-100 text-purple-800 border-purple-200',
    tutorial: 'bg-orange-100 text-orange-800 border-orange-200'
  };

  // Mock data - replace with actual API calls
  const fetchTimetables = useCallback(async () => {
    try {
      setLoading(true);
      // Simulated API call
      const mockTimetables: Timetable[] = [
        {
          _id: '1',
          name: 'Computer Engineering - Semester 5',
          department: 'Computer Engineering',
          semester: 5,
          academicYear: '2024-25',
          isActive: true,
          createdAt: '2024-01-15',
          entries: [
            {
              _id: 'e1',
              subject: { _id: 's1', name: 'Data Structures', code: 'CS301', department: 'Computer Engineering', credits: 4 },
              teacher: { _id: 't1', name: 'Dr. Smith Johnson', email: 'smith@uni.edu', department: 'Computer Engineering' },
              room: { _id: 'r1', number: 'A101', name: 'Computer Lab 1', capacity: 40, type: 'lab', building: 'Academic Block A' },
              timeSlot: { _id: 'ts1', name: 'Period 1', startTime: '09:00', endTime: '10:00', type: 'lecture' },
              dayOfWeek: 1,
              sessionType: 'lecture',
              semester: 5,
              department: 'Computer Engineering',
              division: 'A'
            },
            {
              _id: 'e2',
              subject: { _id: 's2', name: 'Database Management', code: 'CS302', department: 'Computer Engineering', credits: 4 },
              teacher: { _id: 't2', name: 'Prof. Jane Davis', email: 'jane@uni.edu', department: 'Computer Engineering' },
              room: { _id: 'r2', number: 'B201', name: 'Theory Classroom 1', capacity: 60, type: 'classroom', building: 'Academic Block B' },
              timeSlot: { _id: 'ts2', name: 'Period 2', startTime: '10:15', endTime: '11:15', type: 'lecture' },
              dayOfWeek: 1,
              sessionType: 'lecture',
              semester: 5,
              department: 'Computer Engineering',
              division: 'A'
            },
            {
              _id: 'e3',
              subject: { _id: 's3', name: 'Operating Systems', code: 'CS303', department: 'Computer Engineering', credits: 4 },
              teacher: { _id: 't3', name: 'Dr. Michael Brown', email: 'michael@uni.edu', department: 'Computer Engineering' },
              room: { _id: 'r3', number: 'C101', name: 'Lab Complex 1', capacity: 30, type: 'lab', building: 'Lab Block' },
              timeSlot: { _id: 'ts3', name: 'Period 3-4', startTime: '11:30', endTime: '13:30', type: 'practical' },
              dayOfWeek: 1,
              sessionType: 'practical',
              semester: 5,
              department: 'Computer Engineering',
              division: 'A',
              batch: 'A1'
            },
            // Tuesday
            {
              _id: 'e4',
              subject: { _id: 's4', name: 'Computer Networks', code: 'CS304', department: 'Computer Engineering', credits: 4 },
              teacher: { _id: 't4', name: 'Dr. Sarah Wilson', email: 'sarah@uni.edu', department: 'Computer Engineering' },
              room: { _id: 'r4', number: 'A102', name: 'Network Lab', capacity: 35, type: 'lab', building: 'Academic Block A' },
              timeSlot: { _id: 'ts1', name: 'Period 1', startTime: '09:00', endTime: '10:00', type: 'lecture' },
              dayOfWeek: 2,
              sessionType: 'lecture',
              semester: 5,
              department: 'Computer Engineering',
              division: 'A'
            },
            {
              _id: 'e5',
              subject: { _id: 's5', name: 'Software Engineering', code: 'CS305', department: 'Computer Engineering', credits: 3 },
              teacher: { _id: 't5', name: 'Prof. Robert Lee', email: 'robert@uni.edu', department: 'Computer Engineering' },
              room: { _id: 'r5', number: 'B202', name: 'Seminar Hall', capacity: 80, type: 'hall', building: 'Academic Block B' },
              timeSlot: { _id: 'ts2', name: 'Period 2', startTime: '10:15', endTime: '11:15', type: 'lecture' },
              dayOfWeek: 2,
              sessionType: 'tutorial',
              semester: 5,
              department: 'Computer Engineering',
              division: 'A'
            }
          ]
        },
        {
          _id: '2',
          name: 'Mechanical Engineering - Semester 3',
          department: 'Mechanical Engineering',
          semester: 3,
          academicYear: '2024-25',
          isActive: true,
          createdAt: '2024-01-15',
          entries: [
            {
              _id: 'e6',
              subject: { _id: 's6', name: 'Thermodynamics', code: 'ME201', department: 'Mechanical Engineering', credits: 4 },
              teacher: { _id: 't6', name: 'Dr. Alex Kumar', email: 'alex@uni.edu', department: 'Mechanical Engineering' },
              room: { _id: 'r6', number: 'M101', name: 'Mechanics Lab', capacity: 25, type: 'lab', building: 'Mechanical Block' },
              timeSlot: { _id: 'ts1', name: 'Period 1', startTime: '09:00', endTime: '10:00', type: 'lecture' },
              dayOfWeek: 1,
              sessionType: 'lecture',
              semester: 3,
              department: 'Mechanical Engineering',
              division: 'A'
            }
          ]
        }
      ];
      
      setTimetables(mockTimetables);
      if (mockTimetables.length > 0) {
        setSelectedTimetable(mockTimetables[0]);
      }
    } catch (error) {
      console.error('Error fetching timetables:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimetables();
  }, [fetchTimetables]);

  const filteredEntries = selectedTimetable?.entries.filter(entry => {
    const matchesSearch = searchTerm === '' || 
      entry.subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.room.number.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDepartment = filters.department === 'all' || entry.department === filters.department;
    const matchesSemester = filters.semester === 'all' || entry.semester.toString() === filters.semester;
    const matchesSessionType = filters.sessionType === 'all' || entry.sessionType === filters.sessionType;
    const matchesDayOfWeek = filters.dayOfWeek === 'all' || entry.dayOfWeek.toString() === filters.dayOfWeek;

    return matchesSearch && matchesDepartment && matchesSemester && matchesSessionType && matchesDayOfWeek;
  }) || [];

  const groupedByDay = filteredEntries.reduce((acc, entry) => {
    const day = entry.dayOfWeek;
    if (!acc[day]) acc[day] = [];
    acc[day].push(entry);
    return acc;
  }, {} as Record<number, TimetableEntry[]>);

  // Sort entries by time within each day
  Object.keys(groupedByDay).forEach(day => {
    groupedByDay[parseInt(day)].sort((a, b) => 
      a.timeSlot.startTime.localeCompare(b.timeSlot.startTime)
    );
  });

  const getUniqueTimeSlots = () => {
    const timeSlots = new Set<string>();
    filteredEntries.forEach(entry => {
      timeSlots.add(`${entry.timeSlot.startTime}-${entry.timeSlot.endTime}`);
    });
    return Array.from(timeSlots).sort();
  };

  const renderTableView = () => {
    const timeSlots = getUniqueTimeSlots();
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-900 min-w-[120px]">
                Time Slot
              </th>
              {daysOfWeek.map((day, index) => (
                <th key={day} className="border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-gray-900 min-w-[200px]">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map(timeSlot => (
              <tr key={timeSlot} className="hover:bg-gray-50">
                <td className="border border-gray-200 px-4 py-4 text-sm font-medium text-gray-900 bg-gray-25">
                  {timeSlot}
                </td>
                {daysOfWeek.map((day, dayIndex) => {
                  const dayEntries = groupedByDay[dayIndex + 1] || [];
                  const entry = dayEntries.find(e => 
                    `${e.timeSlot.startTime}-${e.timeSlot.endTime}` === timeSlot
                  );
                  
                  return (
                    <td key={`${timeSlot}-${dayIndex}`} className="border border-gray-200 px-2 py-2">
                      {entry ? (
                        <div className={`p-3 rounded-lg border-2 ${sessionColors[entry.sessionType]} hover:shadow-md transition-shadow cursor-pointer`}>
                          <div className="font-semibold text-sm mb-1">{entry.subject.name}</div>
                          <div className="text-xs mb-1">{entry.subject.code}</div>
                          <div className="flex items-center text-xs text-gray-600 mb-1">
                            <User className="h-3 w-3 mr-1" />
                            {entry.teacher.name}
                          </div>
                          <div className="flex items-center text-xs text-gray-600 mb-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            {entry.room.number}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs bg-white bg-opacity-50 px-2 py-1 rounded">
                              {entry.sessionType}
                            </span>
                            {entry.division && (
                              <span className="text-xs bg-white bg-opacity-50 px-2 py-1 rounded">
                                Div {entry.division}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="h-24 flex items-center justify-center text-gray-400 text-sm">
                          No class
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
    );
  };

  const renderGridView = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEntries.map(entry => (
          <Card key={entry._id} className="p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-gray-900">{entry.subject.name}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${sessionColors[entry.sessionType]}`}>
                {entry.sessionType}
              </span>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <BookOpen className="h-4 w-4 mr-2" />
                <span>{entry.subject.code}</span>
              </div>
              
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                <span>{daysOfWeek[entry.dayOfWeek - 1]} • {entry.timeSlot.startTime} - {entry.timeSlot.endTime}</span>
              </div>
              
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                <span>{entry.teacher.name}</span>
              </div>
              
              <div className="flex items-center">
                <Building className="h-4 w-4 mr-2" />
                <span>{entry.room.number} ({entry.room.name})</span>
              </div>
              
              {entry.division && (
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  <span>Division {entry.division} {entry.batch && `• Batch ${entry.batch}`}</span>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const handleExport = () => {
    if (!selectedTimetable) return;
    
    // Create and download CSV
    const csvData = filteredEntries.map(entry => ({
      Day: daysOfWeek[entry.dayOfWeek - 1],
      Time: `${entry.timeSlot.startTime} - ${entry.timeSlot.endTime}`,
      Subject: entry.subject.name,
      Code: entry.subject.code,
      Teacher: entry.teacher.name,
      Room: entry.room.number,
      Type: entry.sessionType,
      Division: entry.division || '',
      Batch: entry.batch || ''
    }));
    
    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTimetable.name.replace(/\s+/g, '_')}_timetable.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 mr-3 text-primary-600" />
            Timetable Display
          </h1>
          <p className="text-gray-600 mt-1">View and analyze class schedules with detailed information</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={fetchTimetables} className="flex items-center">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={!selectedTimetable} className="flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Timetable Selection */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Timetable</label>
            <select
              value={selectedTimetable?._id || ''}
              onChange={(e) => {
                const timetable = timetables.find(t => t._id === e.target.value);
                setSelectedTimetable(timetable || null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Select timetable"
            >
              <option value="">Select a timetable...</option>
              {timetables.map(timetable => (
                <option key={timetable._id} value={timetable._id}>
                  {timetable.name} ({timetable.academicYear})
                </option>
              ))}
            </select>
          </div>
          
          {selectedTimetable && (
            <div className="lg:w-80">
              <label className="block text-sm font-medium text-gray-700 mb-2">Timetable Info</label>
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm space-y-1">
                  <div><strong>Department:</strong> {selectedTimetable.department}</div>
                  <div><strong>Semester:</strong> {selectedTimetable.semester}</div>
                  <div><strong>Academic Year:</strong> {selectedTimetable.academicYear}</div>
                  <div><strong>Total Classes:</strong> {selectedTimetable.entries.length}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {selectedTimetable && (
        <>
          {/* Search and Filters */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search by subject, teacher, or room..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'table' ? 'primary' : 'outline'}
                    onClick={() => setViewMode('table')}
                    className="flex items-center"
                  >
                    <Grid3X3 className="h-4 w-4 mr-2" />
                    Table
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'primary' : 'outline'}
                    onClick={() => setViewMode('grid')}
                    className="flex items-center"
                  >
                    <List className="h-4 w-4 mr-2" />
                    Grid
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={filters.department}
                    onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    aria-label="Filter by department"
                  >
                    <option value="all">All Departments</option>
                    {Array.from(new Set(selectedTimetable.entries.map(e => e.department))).map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Session Type</label>
                  <select
                    value={filters.sessionType}
                    onChange={(e) => setFilters(prev => ({ ...prev, sessionType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    aria-label="Filter by session type"
                  >
                    <option value="all">All Types</option>
                    <option value="lecture">Lecture</option>
                    <option value="practical">Practical</option>
                    <option value="lab">Lab</option>
                    <option value="tutorial">Tutorial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                  <select
                    value={filters.dayOfWeek}
                    onChange={(e) => setFilters(prev => ({ ...prev, dayOfWeek: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    aria-label="Filter by day of week"
                  >
                    <option value="all">All Days</option>
                    {daysOfWeek.map((day, index) => (
                      <option key={day} value={(index + 1).toString()}>{day}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Results</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm">
                    {filteredEntries.length} entries
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Timetable Display */}
          <Card className="p-6">
            {filteredEntries.length > 0 ? (
              <div className="space-y-4">
                {viewMode === 'table' ? renderTableView() : renderGridView()}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No classes found</h3>
                <p className="text-gray-500">Try adjusting your search criteria or filters.</p>
              </div>
            )}
          </Card>

          {/* Statistics Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Classes</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredEntries.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center">
                <User className="h-8 w-8 text-green-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Teachers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {new Set(filteredEntries.map(e => e.teacher._id)).size}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center">
                <Building className="h-8 w-8 text-purple-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Rooms</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {new Set(filteredEntries.map(e => e.room._id)).size}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Time Slots</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {getUniqueTimeSlots().length}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Legend */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Types</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(sessionColors).map(([type, colorClass]) => (
                <div key={type} className="flex items-center space-x-2">
                  <div className={`w-4 h-4 rounded border-2 ${colorClass}`}></div>
                  <span className="text-sm text-gray-600 capitalize">{type}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default TimetablePage;
