import React, { useState, useEffect } from 'react';
import { Calendar, Users, BookOpen, Clock, Settings, Play, Download, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { dataManagementService } from '../../services/dataManagementService';
import { timeSlotsAPI } from '../../services/api';
import { timetableService } from '../../services/timetableService';
import { useToast } from '../../contexts/ToastContext';
import { DEPARTMENT_LIST } from '../../constants';

interface Teacher {
  _id: string;
  name: string;
  email: string;
  department: string;
  qualifications: string[];
}

interface Subject {
  _id: string;
  courseName: string;
  courseCode: string;
  department: string;
  semester: number;
  credits: number;
  courseType: string;
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
}

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
      const filteredTeachers = teachersData.filter(t => t.department === department);

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

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const coursesData = await dataManagementService.getCourses();
      const filteredCourses = coursesData.filter(
        (c: any) => c.department === department && c.semester === semester
      );
      
      // Map Course interface to Subject interface
      const mappedSubjects: Subject[] = filteredCourses.map((c: any) => ({
        _id: c._id,
        courseName: c.courseName,
        courseCode: c.courseCode,
        department: c.department,
        semester: c.semester,
        credits: c.credits,
        courseType: c.courseType
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

  // Constraint-based scheduling algorithm
  const scheduleClasses = async (
    assignments: Assignment[],
    slots: TimeSlot[]
  ): Promise<{ schedule: GeneratedClass[]; conflicts: string[] }> => {
    const schedule: GeneratedClass[] = [];
    const conflicts: string[] = [];
    
    // Track usage to prevent conflicts
    const teacherSchedule = new Map<string, Set<string>>(); // teacherId -> Set of "day-timeSlot" keys
    const slotUsage = new Map<string, boolean>(); // "day-timeSlot" -> used

    // Group slots by day
    const slotsByDay = new Map<number, TimeSlot[]>();
    slots.forEach(slot => {
      if (!slotsByDay.has(slot.dayOfWeek)) {
        slotsByDay.set(slot.dayOfWeek, []);
      }
      slotsByDay.get(slot.dayOfWeek)!.push(slot);
    });

    // Sort days to have consistent scheduling (Monday to Friday)
    const workingDays = [1, 2, 3, 4, 5]; // Monday to Friday

    // For each assignment, schedule the required hours
    for (const assignment of assignments) {
      const { subject, teacher, allocatedHours } = assignment;
      let hoursScheduled = 0;

      // Initialize teacher schedule if not exists
      if (!teacherSchedule.has(teacher._id)) {
        teacherSchedule.set(teacher._id, new Set());
      }

      // Try to schedule all required hours
      outerLoop: for (const day of workingDays) {
        const daySlots = slotsByDay.get(day) || [];
        
        for (const slot of daySlots) {
          if (hoursScheduled >= allocatedHours) {
            break outerLoop;
          }

          const slotKey = `${day}-${slot._id}`;
          const teacherSlotKey = `${day}-${slot.startTime}-${slot.endTime}`;

          // Check if slot is already used
          if (slotUsage.get(slotKey)) {
            continue;
          }

          // Check if teacher is already scheduled at this time
          if (teacherSchedule.get(teacher._id)!.has(teacherSlotKey)) {
            conflicts.push(
              `Teacher ${teacher.name} conflict at ${daysOfWeek[day]} ${slot.startTime}-${slot.endTime}`
            );
            continue;
          }

          // Assign the slot
          schedule.push({
            subject: subject._id,
            subjectName: `${subject.courseCode} - ${subject.courseName}`,
            teacher: teacher._id,
            teacherName: teacher.name,
            timeSlot: slot._id,
            day: day,
            startTime: slot.startTime,
            endTime: slot.endTime
          });

          // Mark as used
          slotUsage.set(slotKey, true);
          teacherSchedule.get(teacher._id)!.add(teacherSlotKey);
          hoursScheduled++;
        }
      }

      // Check if we scheduled all required hours
      if (hoursScheduled < allocatedHours) {
        conflicts.push(
          `Could not schedule all hours for ${subject.courseName}. Scheduled ${hoursScheduled}/${allocatedHours}`
        );
      }
    }

    return { schedule, conflicts };
  };

  const saveTimetable = async () => {
    if (generatedTimetable.length === 0) {
      addToast({ title: 'Error', message: 'No timetable to save', type: 'error' });
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
                            {assignment.subject.courseCode}
                          </div>
                          <div className="text-sm text-gray-600">
                            {assignment.subject.courseName}
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
          <Card className="mb-6">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center">
                  <Calendar className="mr-2" />
                  Generated Timetable
                </h2>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={exportTimetable}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button onClick={saveTimetable}>
                    Save Timetable
                  </Button>
                </div>
              </div>

              {/* Conflicts Display */}
              {conflicts.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-yellow-900 mb-2 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Conflicts Detected ({conflicts.length})
                  </h3>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    {conflicts.map((conflict, idx) => (
                      <li key={idx}>• {conflict}</li>
                    ))}
                  </ul>
                </div>
              )}

              {conflicts.length === 0 && generatedTimetable.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center text-green-900">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    <strong>Success! Zero conflicts detected</strong>
                  </div>
                </div>
              )}

              {/* Timetable Grid */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Day</th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Time</th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Subject</th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Teacher</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedTimetable
                      .sort((a, b) => a.day - b.day || a.startTime.localeCompare(b.startTime))
                      .map((cls, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2">{daysOfWeek[cls.day]}</td>
                          <td className="border border-gray-300 px-4 py-2">
                            {cls.startTime} - {cls.endTime}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 font-medium">
                            {cls.subjectName}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">{cls.teacherName}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(3)}>
                  Back
                </Button>
                <Button onClick={() => setCurrentStep(1)} variant="outline">
                  Start New Generation
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TimetableGenerationPage;
