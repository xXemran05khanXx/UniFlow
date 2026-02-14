import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import {
  Calendar,
  Download,
  RefreshCw,
  Search,
  BookOpen,
  Users,
  Clock,
  MapPin,
  ChevronDown,
  Grid,
  List,
  FileText,
  Star,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import '../css/GeneratePage.module.css';
import { timetableAPI } from '../../services/timetableService';
import departmentService from '../../services/departmentService';
import { subjectManagementService } from '../../services/subjectManagementService';
import TimetableBlock from '../../components/timetable/TimetableBlock';
import ScheduleModal from '../../components/timetable/ScheduleModal';
import { TimetableDisplayEntry } from '../../components/timetable/types';

type TimetableEntry = TimetableDisplayEntry;

const romanToNumber = (roman: string): number | undefined => {
  const map: Record<string, number> = {
    I: 1,
    II: 2,
    III: 3,
    IV: 4,
    V: 5,
    VI: 6,
    VII: 7,
    VIII: 8
  };
  return map[roman?.toUpperCase()];
};

const numberToRoman = (num?: number): string => {
  const map: Record<number, string> = {
    1: 'I',
    2: 'II',
    3: 'III',
    4: 'IV',
    5: 'V',
    6: 'VI',
    7: 'VII',
    8: 'VIII'
  };
  return (num && map[num]) || 'I';
};

const normalizeSessionType = (courseType?: string): 'lecture' | 'lab' | 'tutorial' => {
  const type = (courseType || '').toLowerCase();
  if (type === 'practical' || type === 'lab') return 'lab';
  if (type === 'tutorial') return 'tutorial';
  return 'lecture';
};

const calculateDurationMinutes = (startTime?: string, endTime?: string): number => {
  if (!startTime || !endTime) return 0;
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  return Math.max(0, (endHour * 60 + endMinute) - (startHour * 60 + startMinute));
};

const parseSemesterFromName = (name?: string): number | undefined => {
  if (!name) return undefined;
  const match = name.match(/sem(?:ester)?\s*([1-8])/i);
  if (match && match[1]) {
    const num = Number(match[1]);
    if (!Number.isNaN(num)) return num;
  }
  return undefined;
};

const formatTimeRange = (startTime?: string, endTime?: string): string => {
  if (!startTime || !endTime) return 'TBD';
  const to12Hour = (time: string) => {
    const [hStr, mStr] = time.split(':');
    const h = Number(hStr);
    const m = Number(mStr);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = ((h + 11) % 12) + 1;
    return `${hour12}:${m.toString().padStart(2, '0')}${suffix}`;
  };
  return `${to12Hour(startTime)}-${to12Hour(endTime)}`;
};

const normalizeDayName = (day?: string): string => {
  if (!day) return 'Monday';
  const d = day.toLowerCase();
  const map: Record<string, string> = {
    mon: 'Monday', monday: 'Monday',
    tue: 'Tuesday', tues: 'Tuesday', tuesday: 'Tuesday',
    wed: 'Wednesday', wednesday: 'Wednesday',
    thu: 'Thursday', thur: 'Thursday', thurs: 'Thursday', thursday: 'Thursday',
    fri: 'Friday', friday: 'Friday',
    sat: 'Saturday', saturday: 'Saturday'
  };
  return map[d] || (d.charAt(0).toUpperCase() + d.slice(1));
};

const mapBackendTimetables = (timetables: any[], fallbackSemester: string, fallbackDepartment: string): TimetableEntry[] => {
  return (timetables || []).flatMap((tt: any) => {
    const department = tt?.studentGroup?.department || (fallbackDepartment !== 'all' ? fallbackDepartment : 'Unknown');
    const year = tt?.studentGroup?.year || 0;
    const division = tt?.studentGroup?.division || '-';

    const inferredSemesterFromName = parseSemesterFromName(tt?.name);

    return (tt?.schedule || []).map((session: any, index: number) => {
      const course = session?.course || {};
      const teacher = session?.teacher || {};
      const room = session?.room || {};
      const startTime = session?.startTime || '';
      const endTime = session?.endTime || '';
      const semesterNumber = session?.courseSemester
        || course?.semester
        || inferredSemesterFromName
        || (year ? year * 2 : undefined);
      const semesterLabel = semesterNumber
        ? numberToRoman(semesterNumber)
        : (fallbackSemester !== 'all' ? fallbackSemester : 'I');

      return {
        id: `${tt._id || 'tt'}-${index}`,
        courseId: (course?._id || session?.course?._id || '').toString() || undefined,
        subject: session?.courseName || course.courseName || course.name || course.title || 'Untitled Course',
        subjectCode: session?.courseCode || course.courseCode || course.code || '',
        teacher: session?.teacherName || teacher.name || teacher.employeeId || 'Unassigned',
        teacherEmail: teacher.email || teacher.user?.email || undefined,
        room: session?.roomName || room.name || room.roomNumber || room.code || 'TBD',
        roomName: room.name || session?.roomName || undefined,
        roomNumber: room.roomNumber || undefined,
        roomType: room.type || undefined,
        timeSlot: formatTimeRange(startTime, endTime),
        startTime,
        endTime,
        day: normalizeDayName(session.dayOfWeek),
        type: normalizeSessionType(session?.courseType || course.courseType || course.type),
        duration: calculateDurationMinutes(startTime, endTime),
        department,
        departmentLabel: department,
        year: year || Math.ceil((course.semester || 1) / 2),
        semester: semesterLabel,
        semesterNumber: semesterNumber || undefined,
        division
      };
    });
  });
};

const TimetablePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [timetableData, setTimetableData] = useState<TimetableEntry[]>([]);
  const [showTimetableGenerator, setShowTimetableGenerator] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null);
  
  const semesters = React.useMemo(() => {
    const fromData = Array.from(new Set(
      timetableData.map(t => t.semester || numberToRoman(t.semesterNumber || 0)).filter(Boolean)
    ));
    const allRomans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
    const merged = Array.from(new Set([...allRomans, ...fromData]));
    return merged;
  }, [timetableData]);

  const departmentOptions = React.useMemo(() => {
    const safeDepartments = Array.isArray(departments) ? departments : [];
    const timetableDepts = timetableData.map(t => t.departmentLabel || t.department).filter(Boolean);
    const uniques = Array.from(new Set([
      ...safeDepartments,
      ...timetableDepts
    ]));
    return uniques.length > 0 ? uniques : [];
  }, [timetableData, departments]);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = React.useMemo(() => {
    const slots = Array.from(new Set(
      timetableData
        .map(s => formatTimeRange(s.startTime, s.endTime))
        .filter(label => label && label !== 'TBD')
    ));

    if (slots.length > 0) return slots;

    return [
      '8:00AM-9:00AM', '9:00AM-10:00AM', '10:00AM-11:00AM', '11:00AM-12:00PM',
      '12:00PM-1:00PM', '1:00PM-2:00PM', '2:00PM-3:00PM', '3:00PM-4:00PM', '4:00PM-5:00PM'
    ];
  }, [timetableData]);

  useEffect(() => {
    const loadTimetables = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all timetables and filter client-side to avoid backend query mismatches
        const response = await timetableAPI.getSavedTimetables();

        const timetables = response?.data || [];
        const mapped = mapBackendTimetables(timetables, selectedSemester, selectedDepartment);
        setTimetableData(mapped);
      } catch (err) {
        console.error('Error loading timetables:', err);
        setError('Failed to load timetables. Please try again.');
        setTimetableData([]);
      } finally {
        setLoading(false);
      }
    };

    loadTimetables();
  }, []);

  // Load departments for filters
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        // Prefer dynamic departments from DB; fall back to subject service constants if needed
        let names: string[] = [];
        try {
          const deptData = await departmentService.getAllDepartments();
          if (Array.isArray(deptData)) {
            names = deptData.map((d: any) => d.name || d.code).filter(Boolean);
          } else if (deptData && Array.isArray((deptData as any).data)) {
            names = (deptData as any).data.map((d: any) => d.name || d.code).filter(Boolean);
          }
        } catch (innerErr) {
          console.error('Department service failed, falling back to subjectManagementService.getDepartments', innerErr);
        }

        if (names.length === 0) {
          try {
            names = await subjectManagementService.getDepartments();
          } catch (fallbackErr) {
            console.error('Fallback department list failed', fallbackErr);
          }
        }

        setDepartments(names);
      } catch (err) {
        console.error('Error loading departments:', err);
      }
    };

    loadDepartments();
  }, []);

  const filteredTimetables = timetableData.filter(entry => {
    const entryDept = entry.department || '';
    const entryDeptLabel = entry.departmentLabel || entryDept;
    const entryIsObjectId = /^[a-f\d]{24}$/i.test(entryDept);

    const matchesDepartment = selectedDepartment === 'all'
      ? true
      : entryIsObjectId
        ? entryDept === selectedDepartment
        : entryDeptLabel.toLowerCase() === selectedDepartment.toLowerCase();


    const matchesSemester = selectedSemester === 'all'
      ? true
      : entry.semester === selectedSemester || entry.semesterNumber === romanToNumber(selectedSemester);

    const matchesSearch = searchTerm === '' || 
      entry.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.teacher.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.subjectCode.toLowerCase().includes(searchTerm.toLowerCase());
    
      return matchesDepartment && matchesSemester && matchesSearch;
  });

  const activeDepartmentLabel = React.useMemo(() => {
    if (selectedDepartment !== 'all') return selectedDepartment;
    const unique = Array.from(new Set(filteredTimetables.map(t => t.departmentLabel || t.department).filter(Boolean)));
    if (unique.length === 1) return unique[0];
    if (unique.length > 1) return 'Multiple Departments';
    return 'All Departments';
  }, [selectedDepartment, filteredTimetables]);

  const activeSemesterLabel = React.useMemo(() => {
    if (selectedSemester !== 'all') return `Sem ${selectedSemester}`;
    const unique = Array.from(new Set(filteredTimetables.map(t => t.semester).filter(Boolean)));
    if (unique.length === 1) return `Sem ${unique[0]}`;
    if (unique.length > 1) return 'Multiple Semesters';
    return 'All Semesters';
  }, [selectedSemester, filteredTimetables]);

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
                {departmentOptions.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
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
            <span className="ml-3 text-lg text-gray-600">
              - {activeDepartmentLabel} • {activeSemesterLabel}
            </span>
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
                      const slotEntries = filteredTimetables.filter(e => {
                        if (e.day !== day) return false;
                        if (e.timeSlot === slot) return true;
                        return formatTimeRange(e.startTime, e.endTime) === slot;
                      });

                      return (
                        <td key={`${day}-${slot}`} className={`py-2 px-1 border-r border-gray-100 relative group-hover:border-blue-200 transition-colors ${
                          dayIndex === days.length - 1 && slotIndex === timeSlots.length - 1 ? 'rounded-br-2xl border-r-0' : ''
                        }`}>
                          {slotEntries.length > 0 ? (
                            <div className="space-y-2">
                              {slotEntries.map(entry => (
                                <TimetableBlock
                                  key={entry.id}
                                  entry={entry}
                                  onClick={setSelectedEntry}
                                  compact
                                />
                              ))}
                            </div>
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
              <div key={entry.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <TimetableBlock entry={entry} onClick={setSelectedEntry} compact={false} />
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
                onClick={() => navigate('/timetable-generation')}
              >
                <Star className="h-4 w-4 mr-2" />
                Generate
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        {renderFilters()}

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Main Content */}
        {viewMode === 'grid' ? renderTimetableGrid() : renderTimetableList()}
      </div>

      <ScheduleModal
        isOpen={!!selectedEntry}
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />
    </div>
  );
};

export default TimetablePage;
