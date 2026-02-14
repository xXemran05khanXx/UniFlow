import React, { useState, useEffect } from 'react';
import { Calendar, Users, BookOpen, Clock, Settings, Play, Download, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { dataManagementService } from '../../services/dataManagementService';
import { subjectManagementService } from '../../services/subjectManagementService';
import { timeSlotsAPI, roomsAPI } from '../../services/api';
import { timetableService } from '../../services/timetableService';
import { useToast } from '../../contexts/ToastContext';
import { DEPARTMENT_LIST, getDepartmentCode } from '../../constants';

interface Teacher {
  _id: string;
  name: string;
  email: string;
  department: string;
  qualifications: string[];
}

interface Subject {
  _id: string;
  name: string;
  code: string;
  department: string | { code: string; name: string };
  semester: number;
  credits: number;
  type: string;
}

interface TimeSlot {
  _id: string;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  isActive: boolean;
}

interface Assignment {
  subject: Subject;
  teacher: Teacher;
  allocatedHours: number;
}

interface GeneratedClass {
  subject: string;
  subjectName: string;
  teacher: string;
  teacherName: string;
  timeSlot: string;
  day: number;
  startTime: string;
  endTime: string;
  room?: string;
  sessionType: 'theory' | 'practical';
}

// Color palette for different subjects
const subjectColors = [
  { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800', accent: 'bg-blue-500' },
  { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800', accent: 'bg-purple-500' },
  { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800', accent: 'bg-emerald-500' },
  { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800', accent: 'bg-orange-500' },
  { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800', accent: 'bg-pink-500' },
  { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-800', accent: 'bg-cyan-500' },
  { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-800', accent: 'bg-amber-500' },
  { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-800', accent: 'bg-indigo-500' },
  { bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-800', accent: 'bg-rose-500' },
  { bg: 'bg-teal-100', border: 'border-teal-300', text: 'text-teal-800', accent: 'bg-teal-500' },
];

// Weekly Timetable Grid Component
interface WeeklyTimetableGridProps {
  classes: GeneratedClass[];
  timeSlots: TimeSlot[];
  daysOfWeek: string[];
}

const WeeklyTimetableGrid: React.FC<WeeklyTimetableGridProps> = ({ classes, timeSlots, daysOfWeek }) => {
  const workingDays = [1, 2, 3, 4, 5]; // Monday to Friday
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const fullDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Get unique time slots sorted by start time
  const uniqueTimeSlots = Array.from(
    new Map(
      classes
        .map(c => ({ startTime: c.startTime, endTime: c.endTime }))
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .map(slot => [`${slot.startTime}-${slot.endTime}`, slot])
    ).values()
  );

  // Create a map of subject to color
  const subjectColorMap = new Map<string, typeof subjectColors[0]>();
  const uniqueSubjects = Array.from(new Set(classes.map(c => c.subject)));
  uniqueSubjects.forEach((subject, index) => {
    subjectColorMap.set(subject, subjectColors[index % subjectColors.length]);
  });

  // Get class for a specific day and time slot
  const getClassForSlot = (day: number, startTime: string, endTime: string): GeneratedClass | undefined => {
    return classes.find(c => c.day === day && c.startTime === startTime && c.endTime === endTime);
  };

  // Format time to be more readable
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <Calendar className="w-16 h-16 mb-4 text-gray-300" />
        <p className="text-lg font-medium">No classes scheduled yet</p>
        <p className="text-sm">Generate a timetable to see the weekly view</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Subjects:</span>
          {uniqueSubjects.map(subjectId => {
            const cls = classes.find(c => c.subject === subjectId);
            const colors = subjectColorMap.get(subjectId);
            const subjectCode = cls?.subjectName.split(' - ')[0] || 'Unknown';
            return (
              <div key={subjectId} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full ${colors?.accent}`}></div>
                <span className="text-xs text-gray-600">{subjectCode}</span>
              </div>
            );
          })}
        </div>
        <div className="h-4 w-px bg-gray-300"></div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Type:</span>
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3 h-3 text-blue-600" />
            <span className="text-xs text-gray-600">Theory</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Settings className="w-3 h-3 text-green-600" />
            <span className="text-xs text-gray-600">Practical</span>
          </div>
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header Row - Days */}
          <div className="grid grid-cols-6 gap-2 mb-2">
            <div className="p-3"></div>
            {workingDays.map((day, idx) => (
              <div 
                key={day} 
                className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-4 text-center shadow-md"
              >
                <span className="text-white/80 text-xs font-medium uppercase tracking-wider">{dayNames[idx]}</span>
                <p className="text-white font-bold text-sm mt-0.5">{fullDayNames[idx]}</p>
              </div>
            ))}
          </div>

          {/* Time Slots Rows */}
          <div className="space-y-2">
            {uniqueTimeSlots.map((slot, slotIdx) => (
              <div key={`${slot.startTime}-${slot.endTime}`} className="grid grid-cols-6 gap-2">
                {/* Time Column */}
                <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-center items-center border border-gray-100">
                  <span className="text-sm font-semibold text-gray-800">{formatTime(slot.startTime)}</span>
                  <span className="text-xs text-gray-400 my-1">to</span>
                  <span className="text-sm font-semibold text-gray-800">{formatTime(slot.endTime)}</span>
                </div>

                {/* Day Columns */}
                {workingDays.map((day) => {
                  const classItem = getClassForSlot(day, slot.startTime, slot.endTime);
                  
                  if (classItem) {
                    const colors = subjectColorMap.get(classItem.subject);
                    const [code, name] = classItem.subjectName.split(' - ');
                    const isPractical = classItem.sessionType === 'practical';
                    
                    return (
                      <div
                        key={`${day}-${slot.startTime}`}
                        className={`relative group ${colors?.bg} ${colors?.border} border-2 rounded-xl p-3 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer overflow-hidden`}
                      >
                        {/* Accent bar */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${colors?.accent} rounded-l-xl`}></div>
                        
                        {/* Session type badge */}
                        <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          isPractical 
                            ? 'bg-green-500 text-white' 
                            : 'bg-blue-500 text-white'
                        }`}>
                          {isPractical ? 'LAB' : 'LEC'}
                        </div>
                        
                        {/* Content */}
                        <div className="pl-2 pr-8">
                          <div className={`font-bold text-sm ${colors?.text} truncate`}>
                            {code}
                          </div>
                          <div className={`text-xs ${colors?.text} opacity-80 truncate mt-0.5`}>
                            {name}
                          </div>
                          <div className="flex items-center mt-2 pt-2 border-t border-current/10">
                            <Users className={`w-3 h-3 ${colors?.text} opacity-60 mr-1`} />
                            <span className={`text-xs ${colors?.text} opacity-70 truncate`}>
                              {classItem.teacherName}
                            </span>
                          </div>
                        </div>

                        {/* Hover overlay with full details */}
                        <div className="absolute inset-0 bg-gray-900/95 rounded-xl p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-center">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-white font-bold text-sm">{code}</p>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              isPractical ? 'bg-green-500' : 'bg-blue-500'
                            } text-white`}>
                              {isPractical ? 'Practical' : 'Theory'}
                            </span>
                          </div>
                          <p className="text-gray-300 text-xs">{name}</p>
                          <div className="mt-3 space-y-1">
                            <div className="flex items-center text-gray-400 text-xs">
                              <Users className="w-3 h-3 mr-2" />
                              {classItem.teacherName}
                            </div>
                            <div className="flex items-center text-gray-400 text-xs">
                              <Clock className="w-3 h-3 mr-2" />
                              {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Empty slot
                  return (
                    <div
                      key={`${day}-${slot.startTime}`}
                      className="bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-xl p-3 flex items-center justify-center min-h-[100px]"
                    >
                      <span className="text-gray-300 text-xs">Free</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Table - Compact View */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
          <BookOpen className="w-4 h-4 mr-2" />
          Detailed Schedule
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {classes
            .sort((a, b) => a.day - b.day || a.startTime.localeCompare(b.startTime))
            .map((cls, idx) => {
              const colors = subjectColorMap.get(cls.subject);
              const [code] = cls.subjectName.split(' - ');
              const isPractical = cls.sessionType === 'practical';
              return (
                <div 
                  key={idx} 
                  className={`flex items-center p-3 rounded-lg ${colors?.bg} ${colors?.border} border`}
                >
                  <div className={`w-2 h-8 ${colors?.accent} rounded-full mr-3`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-sm ${colors?.text}`}>{code}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                          isPractical ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                        }`}>
                          {isPractical ? 'LAB' : 'LEC'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{daysOfWeek[cls.day]?.slice(0, 3)}</span>
                    </div>
                    <div className="flex items-center mt-1 text-xs text-gray-600">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTime(cls.startTime)} - {formatTime(cls.endTime)}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

const TimetableGenerationPage: React.FC = () => {
  const { addToast } = useToast();
  
  // Configuration State
  const [department, setDepartment] = useState('');
  const [semester, setSemester] = useState<number>(1);
  const [academicYear, setAcademicYear] = useState('2024-2025');
  
  // Data State
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  
  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTimetable, setGeneratedTimetable] = useState<GeneratedClass[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);


  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    fetchTimeSlots();
    fetchRooms();
  }, []);

  useEffect(() => {
    if (department && semester) {
      fetchTeachers();
      fetchSubjects();
    }
  }, [department, semester]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const teachersData = await dataManagementService.getTeachers();
      // Convert selected department name (e.g., "Information Technology") to code (e.g., "IT")
      const selectedDeptCode = getDepartmentCode(department);
      const filteredTeachers = teachersData.filter(t => {
        // Handle department as object (populated) or string
        const deptCode = typeof t.department === 'object' && (t.department as any)?.code 
          ? (t.department as any).code 
          : t.department;
        return deptCode === selectedDeptCode;
      });

      // Normalize service teacher shape to the local Teacher interface to avoid type mismatches
      const normalizedTeachers: Teacher[] = filteredTeachers.map((t: any) => ({
        _id: t._id,
        name: t.name,
        email: t.email ?? '', // provide a fallback if the service doesn't return email
        department: t.department,
        qualifications: t.qualifications ?? []
      }));

      setTeachers(normalizedTeachers);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      addToast({ title: 'Error', message: 'Failed to fetch teachers', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await roomsAPI.getAll();
      const roomData = (response as any)?.data || [];
      setRooms(Array.isArray(roomData) ? roomData : []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setRooms([]);
    }
  };

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      // Convert selected department name (e.g., "Information Technology") to code (e.g., "IT")
      const selectedDeptCode = getDepartmentCode(department);
      
      // Fetch subjects with filters
      const result = await subjectManagementService.getAllSubjects(
        { department: selectedDeptCode, semester },
        1,
        100 // Get up to 100 subjects
      );
      
      const subjectsData = result.subjects || [];
      
      // Map to local Subject interface
      const mappedSubjects: Subject[] = subjectsData.map((s: any) => ({
        _id: s._id,
        name: s.name,
        code: s.code,
        department: s.department,
        semester: s.semester,
        credits: s.credits,
        type: s.type
      }));
      
      setSubjects(mappedSubjects);
      
      // Initialize assignments for fetched subjects
      const initialAssignments = mappedSubjects.map((subject) => ({
        subject,
        teacher: null as any,
        allocatedHours: subject.credits || 3
      }));
      setAssignments(initialAssignments as Assignment[]);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      addToast({ title: 'Error', message: 'Failed to fetch subjects', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeSlots = async () => {
    try {
      const response = await timeSlotsAPI.getAll();
      if (response.success && response.data) {
        const activeSlots = response.data.filter(slot => slot.isActive);
        setTimeSlots(activeSlots);
      }
    } catch (error) {
      console.error('Error fetching time slots:', error);
    }
  };

  const handleAssignTeacher = (subjectId: string, teacherId: string) => {
    setAssignments(prev => prev.map(assignment => {
      if (assignment.subject._id === subjectId) {
        const teacher = teachers.find(t => t._id === teacherId);
        return { ...assignment, teacher: teacher! };
      }
      return assignment;
    }));
  };

  const handleUpdateHours = (subjectId: string, hours: number) => {
    setAssignments(prev => prev.map(assignment => {
      if (assignment.subject._id === subjectId) {
        return { ...assignment, allocatedHours: hours };
      }
      return assignment;
    }));
  };

  const generateTimetable = async () => {
    // Validate all subjects have teachers assigned
    const unassigned = assignments.filter(a => !a.teacher);
    if (unassigned.length > 0) {
      addToast({
        title: 'Incomplete Assignment',
        message: `Please assign teachers to all subjects. ${unassigned.length} subject(s) unassigned.`,
        type: 'warning'
      });
      return;
    }

    setIsGenerating(true);
    setConflicts([]);

    try {
      // Run the scheduling algorithm
      const { schedule, conflicts: detectedConflicts } = await scheduleClasses(
        assignments,
        timeSlots
      );

      setGeneratedTimetable(schedule);
      setConflicts(detectedConflicts);

      if (detectedConflicts.length === 0) {
        addToast({
          title: 'Success!',
          message: 'Timetable generated successfully with zero conflicts',
          type: 'success'
        });
      } else {
        addToast({
          title: 'Warning',
          message: `Generated with ${detectedConflicts.length} conflict(s)`,
          type: 'warning'
        });
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      addToast({
        title: 'Generation Failed',
        message: error.message || 'Failed to generate timetable',
        type: 'error'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Advanced constraint-based scheduling algorithm
  const scheduleClasses = async (
    assignments: Assignment[],
    slots: TimeSlot[]
  ): Promise<{ schedule: GeneratedClass[]; conflicts: string[] }> => {
    const schedule: GeneratedClass[] = [];
    const conflicts: string[] = [];
    
    // Track usage to prevent conflicts
    const teacherSchedule = new Map<string, Set<string>>(); // teacherId -> Set of "day-timeSlot" keys
    const slotUsage = new Map<string, boolean>(); // "day-timeSlot" -> used
    
    // Track schedule per day for constraint checking
    const daySchedule = new Map<number, GeneratedClass[]>(); // day -> classes scheduled that day
    
    // Working days (Monday to Friday)
    const workingDays = [1, 2, 3, 4, 5];
    
    // Initialize day schedule tracking
    workingDays.forEach(day => daySchedule.set(day, []));

    // Group slots by day and sort by time
    const slotsByDay = new Map<number, TimeSlot[]>();
    slots.forEach(slot => {
      if (!slotsByDay.has(slot.dayOfWeek)) {
        slotsByDay.set(slot.dayOfWeek, []);
      }
      slotsByDay.get(slot.dayOfWeek)!.push(slot);
    });
    
    // Sort slots by start time within each day
    slotsByDay.forEach((daySlots, day) => {
      daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
      slotsByDay.set(day, daySlots);
    });

    // Separate theory and practical subjects
    const theoryAssignments = assignments.filter(a => 
      a.subject.type?.toLowerCase() !== 'practical' && a.subject.type?.toLowerCase() !== 'lab'
    );
    const practicalAssignments = assignments.filter(a => 
      a.subject.type?.toLowerCase() === 'practical' || a.subject.type?.toLowerCase() === 'lab'
    );

    // Calculate total theory hours needed per subject for equal distribution
    const totalTheoryHours = theoryAssignments.reduce((sum, a) => sum + a.allocatedHours, 0);
    const theoryHoursPerDay = Math.ceil(totalTheoryHours / workingDays.length);
    
    // Track remaining hours for each assignment
    const remainingHours = new Map<string, number>();
    assignments.forEach(a => remainingHours.set(a.subject._id, a.allocatedHours));

    // Helper: Check if adding a class would create more than 2 consecutive same subjects
    const wouldExceedConsecutiveLimit = (day: number, subjectId: string, slotIndex: number): boolean => {
      const dayClasses = daySchedule.get(day) || [];
      const sortedClasses = [...dayClasses].sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      // Find classes immediately before and after the proposed slot
      let consecutiveCount = 1;
      
      // Check previous slots
      for (let i = slotIndex - 1; i >= 0 && i >= slotIndex - 2; i--) {
        const prevClass = sortedClasses.find(c => {
          const slots = slotsByDay.get(day) || [];
          return slots[i] && c.startTime === slots[i].startTime;
        });
        if (prevClass && prevClass.subject === subjectId) {
          consecutiveCount++;
        } else {
          break;
        }
      }
      
      // Check next slots
      for (let i = slotIndex + 1; i < (slotsByDay.get(day)?.length || 0) && i <= slotIndex + 2; i++) {
        const nextClass = sortedClasses.find(c => {
          const slots = slotsByDay.get(day) || [];
          return slots[i] && c.startTime === slots[i].startTime;
        });
        if (nextClass && nextClass.subject === subjectId) {
          consecutiveCount++;
        } else {
          break;
        }
      }
      
      return consecutiveCount > 2;
    };

    // Helper: Count practicals scheduled for a day
    const getPracticalsForDay = (day: number): number => {
      const dayClasses = daySchedule.get(day) || [];
      return dayClasses.filter(c => c.sessionType === 'practical').length;
    };

    // Helper: Get subject occurrences for a day
    const getSubjectCountForDay = (day: number, subjectId: string): number => {
      const dayClasses = daySchedule.get(day) || [];
      return dayClasses.filter(c => c.subject === subjectId).length;
    };

    // Helper: Schedule a class
    const scheduleClass = (
      assignment: Assignment,
      slot: TimeSlot,
      day: number,
      sessionType: 'theory' | 'practical'
    ): boolean => {
      const { subject, teacher } = assignment;
      const slotKey = `${day}-${slot._id}`;
      const teacherSlotKey = `${day}-${slot.startTime}-${slot.endTime}`;

      // Initialize teacher schedule if not exists
      if (!teacherSchedule.has(teacher._id)) {
        teacherSchedule.set(teacher._id, new Set());
      }

      // Check if slot is already used
      if (slotUsage.get(slotKey)) {
        return false;
      }

      // Check if teacher is already scheduled at this time
      if (teacherSchedule.get(teacher._id)!.has(teacherSlotKey)) {
        return false;
      }

      const newClass: GeneratedClass = {
        subject: subject._id,
        subjectName: `${subject.code} - ${subject.name}`,
        teacher: teacher._id,
        teacherName: teacher.name,
        timeSlot: slot._id,
        day: day,
        startTime: slot.startTime,
        endTime: slot.endTime,
        room: rooms[0]?._id,
        sessionType: sessionType
      };

      schedule.push(newClass);
      daySchedule.get(day)!.push(newClass);
      slotUsage.set(slotKey, true);
      teacherSchedule.get(teacher._id)!.add(teacherSlotKey);
      
      const currentRemaining = remainingHours.get(subject._id) || 0;
      remainingHours.set(subject._id, currentRemaining - 1);
      
      return true;
    };

    // PHASE 1: Schedule practicals first (1-2 per day)
    // Distribute practicals evenly across days
    for (const day of workingDays) {
      const daySlots = slotsByDay.get(day) || [];
      let practicalsScheduledToday = 0;
      
      // Shuffle practical assignments for variety
      const shuffledPracticals = [...practicalAssignments].sort(() => Math.random() - 0.5);
      
      for (const assignment of shuffledPracticals) {
        if (practicalsScheduledToday >= 2) break; // Max 2 practicals per day
        
        const remaining = remainingHours.get(assignment.subject._id) || 0;
        if (remaining <= 0) continue;
        
        // Find a suitable slot (preferably in the middle or end of day for practicals)
        const preferredSlotIndices = daySlots.length > 4 
          ? [Math.floor(daySlots.length / 2), Math.floor(daySlots.length / 2) + 1, daySlots.length - 1, daySlots.length - 2]
          : daySlots.map((_, i) => i);
        
        for (const slotIdx of preferredSlotIndices) {
          const slot = daySlots[slotIdx];
          if (!slot) continue;
          
          if (scheduleClass(assignment, slot, day, 'practical')) {
            practicalsScheduledToday++;
            break;
          }
        }
      }
      
      // Ensure minimum 1 practical per day if we have practicals left
      if (practicalsScheduledToday === 0) {
        for (const assignment of shuffledPracticals) {
          const remaining = remainingHours.get(assignment.subject._id) || 0;
          if (remaining <= 0) continue;
          
          for (const slot of daySlots) {
            if (scheduleClass(assignment, slot, day, 'practical')) {
              practicalsScheduledToday++;
              break;
            }
          }
          if (practicalsScheduledToday > 0) break;
        }
      }
    }

    // PHASE 2: Schedule theory classes with equal distribution
    // Calculate target hours per subject per day for even distribution
    const subjectDayTargets = new Map<string, Map<number, number>>();
    
    theoryAssignments.forEach(assignment => {
      const hoursPerSubjectPerDay = Math.ceil(assignment.allocatedHours / workingDays.length);
      const dayTargets = new Map<number, number>();
      workingDays.forEach(day => dayTargets.set(day, hoursPerSubjectPerDay));
      subjectDayTargets.set(assignment.subject._id, dayTargets);
    });

    // Round-robin scheduling for theory to ensure variety
    let schedulingComplete = false;
    let iterations = 0;
    const maxIterations = 100; // Prevent infinite loops
    
    while (!schedulingComplete && iterations < maxIterations) {
      iterations++;
      schedulingComplete = true;
      
      // Shuffle the order of subjects for each iteration to prevent clustering
      const shuffledTheory = [...theoryAssignments].sort(() => Math.random() - 0.5);
      
      for (const day of workingDays) {
        const daySlots = slotsByDay.get(day) || [];
        
        for (let slotIdx = 0; slotIdx < daySlots.length; slotIdx++) {
          const slot = daySlots[slotIdx];
          const slotKey = `${day}-${slot._id}`;
          
          // Skip if slot is already used
          if (slotUsage.get(slotKey)) continue;
          
          // Find the best subject for this slot
          let bestAssignment: Assignment | null = null;
          let bestScore = -Infinity;
          
          for (const assignment of shuffledTheory) {
            const subjectId = assignment.subject._id;
            const remaining = remainingHours.get(subjectId) || 0;
            
            if (remaining <= 0) continue;
            
            // Check consecutive constraint
            if (wouldExceedConsecutiveLimit(day, subjectId, slotIdx)) {
              continue;
            }
            
            // Check teacher availability
            const teacherSlotKey = `${day}-${slot.startTime}-${slot.endTime}`;
            if (!teacherSchedule.has(assignment.teacher._id)) {
              teacherSchedule.set(assignment.teacher._id, new Set());
            }
            if (teacherSchedule.get(assignment.teacher._id)!.has(teacherSlotKey)) {
              continue;
            }
            
            // Calculate score based on various factors
            let score = 0;
            
            // Prefer subjects with more remaining hours
            score += remaining * 10;
            
            // Prefer subjects that haven't been scheduled much today (variation)
            const todayCount = getSubjectCountForDay(day, subjectId);
            score -= todayCount * 20;
            
            // Prefer subjects that are below their daily target
            const dayTarget = subjectDayTargets.get(subjectId)?.get(day) || 0;
            if (todayCount < dayTarget) {
              score += 15;
            }
            
            if (score > bestScore) {
              bestScore = score;
              bestAssignment = assignment;
            }
          }
          
          if (bestAssignment) {
            scheduleClass(bestAssignment, slot, day, 'theory');
            schedulingComplete = false; // We scheduled something, keep going
          }
        }
      }
      
      // Check if any theory subjects still have remaining hours
      const hasRemainingTheory = theoryAssignments.some(a => 
        (remainingHours.get(a.subject._id) || 0) > 0
      );
      
      if (!hasRemainingTheory) {
        schedulingComplete = true;
      }
    }

    // PHASE 3: Schedule any remaining practical hours
    for (const assignment of practicalAssignments) {
      const remaining = remainingHours.get(assignment.subject._id) || 0;
      if (remaining <= 0) continue;
      
      for (const day of workingDays) {
        const practicalsToday = getPracticalsForDay(day);
        if (practicalsToday >= 2) continue; // Respect max 2 practicals per day
        
        const daySlots = slotsByDay.get(day) || [];
        for (const slot of daySlots) {
          const currentRemaining = remainingHours.get(assignment.subject._id) || 0;
          if (currentRemaining <= 0) break;
          if (getPracticalsForDay(day) >= 2) break;
          
          scheduleClass(assignment, slot, day, 'practical');
        }
      }
    }

    // Generate conflict reports for unscheduled hours
    assignments.forEach(assignment => {
      const remaining = remainingHours.get(assignment.subject._id) || 0;
      if (remaining > 0) {
        conflicts.push(
          `Could not schedule all hours for ${assignment.subject.name}. ` +
          `Scheduled ${assignment.allocatedHours - remaining}/${assignment.allocatedHours}`
        );
      }
    });

    // Validate practical constraints
    workingDays.forEach(day => {
      const practicalsToday = getPracticalsForDay(day);
      if (practicalsToday === 0 && practicalAssignments.length > 0) {
        conflicts.push(`Warning: No practical session scheduled for ${daysOfWeek[day]}`);
      }
    });

    // Sort schedule by day and time for clean output
    schedule.sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      return a.startTime.localeCompare(b.startTime);
    });

    return { schedule, conflicts };
  };

  const saveTimetable = async () => {
    if (generatedTimetable.length === 0) {
      addToast({ title: 'Error', message: 'No timetable to save', type: 'error' });
      return;
    }

    if (!rooms.length) {
      addToast({ title: 'Error', message: 'No rooms available. Please create rooms first.', type: 'error' });
      return;
    }

    try {
      const timetableName = `${department} - Semester ${semester} - ${academicYear}`;
      
      await timetableService.saveTimetable({
        name: timetableName,
        department,
        semester,
        academicYear,
        schedule: generatedTimetable
      });

      addToast({
        title: 'Saved',
        message: 'Timetable saved successfully',
        type: 'success'
      });
    } catch (error: any) {
      console.error('Error saving timetable:', error);
      addToast({ 
        title: 'Error', 
        message: error.response?.data?.message || 'Failed to save timetable', 
        type: 'error' 
      });
    }
  };

  const exportTimetable = () => {
    if (generatedTimetable.length === 0) {
      addToast({ title: 'Error', message: 'No timetable to export', type: 'error' });
      return;
    }

    // Create CSV content
    const headers = ['Day', 'Time', 'Subject', 'Teacher'];
    const rows = generatedTimetable.map(cls => [
      daysOfWeek[cls.day],
      `${cls.startTime} - ${cls.endTime}`,
      cls.subjectName,
      cls.teacherName
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timetable-${department}-sem${semester}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    addToast({ title: 'Success', message: 'Timetable exported', type: 'success' });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Timetable Generation</h1>
          <p className="text-gray-600">Create conflict-free timetables with intelligent scheduling</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Configuration' },
              { num: 2, label: 'Assignments' },
              { num: 3, label: 'Generate' },
              { num: 4, label: 'Review' }
            ].map((step, idx) => (
              <React.Fragment key={step.num}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold ${
                      currentStep >= step.num
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {step.num}
                  </div>
                  <span className="mt-2 text-sm text-gray-600">{step.label}</span>
                </div>
                {idx < 3 && (
                  <div
                    className={`flex-1 h-1 mx-4 ${
                      currentStep > step.num ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step 1: Configuration */}
        {currentStep === 1 && (
          <Card className="mb-6">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <Settings className="mr-2" />
                Timetable Configuration
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department *
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select Department</option>
                    {DEPARTMENT_LIST.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Semester *
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {semesters.map(sem => (
                      <option key={sem} value={sem}>Semester {sem}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Academic Year
                  </label>
                  <Input
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="2024-2025"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() => {
                    if (!department) {
                      addToast({ title: 'Error', message: 'Please select department', type: 'error' });
                      return;
                    }
                    setCurrentStep(2);
                  }}
                  disabled={!department || loading}
                >
                  Next: Assign Teachers
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Step 2: Teacher Assignments */}
        {currentStep === 2 && (
          <Card className="mb-6">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center">
                  <Users className="mr-2" />
                  Teacher-Subject Assignments
                </h2>
                <div className="text-sm text-gray-600">
                  {department} - Semester {semester}
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
              ) : subjects.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No subjects found for this department and semester</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.subject._id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div>
                          <div className="font-semibold text-gray-900">
                            {assignment.subject.code}
                          </div>
                          <div className="text-sm text-gray-600">
                            {assignment.subject.name}
                          </div>
                        </div>

                        <div>
                          <select
                            value={assignment.teacher?._id || ''}
                            onChange={(e) => handleAssignTeacher(assignment.subject._id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                          >
                            <option value="">Select Teacher</option>
                            {teachers.map(teacher => (
                              <option key={teacher._id} value={teacher._id}>
                                {teacher.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Hours/Week</label>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            value={assignment.allocatedHours}
                            onChange={(e) => handleUpdateHours(assignment.subject._id, parseInt(e.target.value))}
                            className="w-24"
                          />
                        </div>

                        <div className="flex items-center">
                          {assignment.teacher ? (
                            <div className="flex items-center text-green-600 text-sm">
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Assigned
                            </div>
                          ) : (
                            <div className="flex items-center text-orange-600 text-sm">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              Pending
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={() => {
                    const unassigned = assignments.filter(a => !a.teacher);
                    if (unassigned.length > 0) {
                      addToast({
                        title: 'Incomplete',
                        message: `Please assign teachers to all ${unassigned.length} subject(s)`,
                        type: 'warning'
                      });
                      return;
                    }
                    setCurrentStep(3);
                  }}
                  disabled={subjects.length === 0}
                >
                  Next: Generate
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Step 3: Generate */}
        {currentStep === 3 && (
          <Card className="mb-6">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <Play className="mr-2" />
                Generate Timetable
              </h2>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">Generation Summary</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Department: <strong>{department}</strong></li>
                  <li>• Semester: <strong>{semester}</strong></li>
                  <li>• Subjects: <strong>{subjects.length}</strong></li>
                  <li>• Teachers: <strong>{new Set(assignments.map(a => a.teacher._id)).size}</strong></li>
                  <li>• Available Time Slots: <strong>{timeSlots.length}</strong></li>
                  <li>• Total Classes to Schedule: <strong>{assignments.reduce((sum, a) => sum + a.allocatedHours, 0)}</strong></li>
                </ul>
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={generateTimetable}
                  disabled={isGenerating}
                  size="lg"
                  className="px-8"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Generate Timetable
                    </>
                  )}
                </Button>
              </div>

              {generatedTimetable.length > 0 && (
                <div className="mt-6">
                  <Button
                    onClick={() => setCurrentStep(4)}
                    className="w-full"
                  >
                    View Generated Timetable
                  </Button>
                </div>
              )}

              <div className="mt-6 flex justify-start">
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  Back to Assignments
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <div className="space-y-6">
            {/* Header Card */}
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Weekly Timetable</h2>
                      <p className="text-primary-100 text-sm">{department} • Semester {semester} • {academicYear}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={exportTimetable}
                      className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    <Button 
                      onClick={saveTimetable}
                      className="bg-white text-primary-700 hover:bg-primary-50"
                    >
                      Save Timetable
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Status Alerts */}
            {conflicts.length > 0 && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-start space-x-3">
                  <div className="bg-amber-100 p-2 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-900">Scheduling Conflicts Detected</h3>
                    <p className="text-amber-700 text-sm mt-1">{conflicts.length} conflict(s) found during generation</p>
                    <ul className="mt-3 space-y-1">
                      {conflicts.map((conflict, idx) => (
                        <li key={idx} className="text-sm text-amber-800 flex items-center">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-2"></span>
                          {conflict}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {conflicts.length === 0 && generatedTimetable.length > 0 && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-emerald-900">Perfect Schedule Generated</h3>
                    <p className="text-emerald-700 text-sm">All {generatedTimetable.length} classes scheduled without any conflicts</p>
                  </div>
                </div>
              </div>
            )}

            {/* Weekly Timetable Grid */}
            <Card className="overflow-hidden">
              <div className="p-6">
                <WeeklyTimetableGrid 
                  classes={generatedTimetable} 
                  timeSlots={timeSlots}
                  daysOfWeek={daysOfWeek}
                />
              </div>
            </Card>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-xs font-medium">Total Classes</p>
                    <p className="text-2xl font-bold mt-1">{generatedTimetable.length}</p>
                  </div>
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Calendar className="w-5 h-5" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-indigo-100 text-xs font-medium">Theory</p>
                    <p className="text-2xl font-bold mt-1">{generatedTimetable.filter(c => c.sessionType === 'theory').length}</p>
                  </div>
                  <div className="bg-white/20 p-2 rounded-lg">
                    <BookOpen className="w-5 h-5" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-xs font-medium">Practicals</p>
                    <p className="text-2xl font-bold mt-1">{generatedTimetable.filter(c => c.sessionType === 'practical').length}</p>
                  </div>
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Settings className="w-5 h-5" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-xs font-medium">Subjects</p>
                    <p className="text-2xl font-bold mt-1">{subjects.length}</p>
                  </div>
                  <div className="bg-white/20 p-2 rounded-lg">
                    <BookOpen className="w-5 h-5" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-xs font-medium">Teachers</p>
                    <p className="text-2xl font-bold mt-1">{new Set(assignments.map(a => a.teacher?._id)).size}</p>
                  </div>
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-xs font-medium">Weekly Hours</p>
                    <p className="text-2xl font-bold mt-1">{assignments.reduce((sum, a) => sum + a.allocatedHours, 0)}</p>
                  </div>
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(3)}>
                Back
              </Button>
              <Button onClick={() => setCurrentStep(1)} variant="outline">
                Start New Generation
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimetableGenerationPage;
