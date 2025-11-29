import React, { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { 
  Calendar, 
  FileText, 
  Cpu, 
  Wand2, 
  Upload, 
  Download,
  Play,
  RotateCcw,
  Eye,
  Save,
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { timetableAPI } from '../../services/timetableService';
import { subjectManagementService } from '../../services/subjectManagementService';

// New departmental + semester-focused timetable generation page

interface TimetableResult {
  success: boolean;
  message: string;
  data?: {
    timetable: any[];
    metrics: {
      qualityScore: number;
      schedulingRate: number;
      totalSessions: number;
      totalConflicts: number;
    };
    conflicts: any[];
    metadata: {
      totalSessions: number;
      algorithm: string;
      generationTime: number;
      semester?: number;
    };
  };
}

interface SemesterData {
  semester: number;
  courseCount: number;
  departments: string[];
  totalHours: number;
}

const TimetableGeneratorPage: React.FC = () => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [timetableResult, setTimetableResult] = useState<TimetableResult | null>(null);
  const [availableSemesters, setAvailableSemesters] = useState<SemesterData[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state for auto generation
  const [autoGenForm, setAutoGenForm] = useState({
    algorithm: 'greedy' as 'greedy' | 'genetic' | 'constraint',
    semester: '' as string, // Will be 1, 2, 3, or '' for all
    academicYear: 2025,
    maxIterations: 1000
  });

  const algorithms = [
    { value: 'greedy', label: 'Greedy Algorithm', description: 'Fast and efficient - Best for quick results' },
    { value: 'genetic', label: 'Genetic Algorithm', description: 'Advanced optimization - Better quality' },
    { value: 'constraint', label: 'Constraint Satisfaction', description: 'Rule-based approach - Most flexible' }
  ];

  // Load available departments and semesters on mount
  useEffect(() => {
    (async () => {
      try {
        const deps = await subjectManagementService.getDepartments();
        setDepartments(deps || []);

        // derive semesters from subjects
        const subsResponse = await subjectManagementService.getAllSubjects({}, 1, 1000);
        const subs = subsResponse.subjects || [];
        const semSet = new Set<number>();
        subs.forEach((s: any) => { const sem = Number(s.semester); if (sem) semSet.add(sem); });
        const sems = Array.from(semSet).sort((a,b)=>a-b).map(n=>({ semester: n, courseCount: subs.filter((x:any)=>Number(x.semester)===n).length, departments: [], totalHours:0 }));
        setAvailableSemesters(sems);
      } catch (err) {
        console.error('Load deps/semesters failed', err);
      }
    })();
  }, []);

  const [departments, setDepartments] = useState<string[]>([]);

  const handleAutoGenerate = async () => {
    if (!user || user.role !== 'admin') {
      setError('Admin access required for timetable generation');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setError('');
    setSuccess('');

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 200);

    try {
      // require department and semester to be selected for departmental generation
      if (!departmentFilter) {
        setError('Please select a department before generating');
        clearInterval(progressInterval);
        setIsGenerating(false);
        return;
      }

      const payload: any = {
        department: departmentFilter,
        year: yearFilter || String(autoGenForm.academicYear),
        division: divisionFilter || undefined,
        gaParams: {
          populationSize: 50,
          generations: 100
        }
      };

      if (selectedSemester) payload.semester = Number(selectedSemester);

      const result: any = await timetableAPI.generateTimetable(payload);

      clearInterval(progressInterval);
      setGenerationProgress(100);

      if (result && result.generatedTimetable) {
        setSuccess(`Generated timetable (fitness ${result.generatedTimetable.fitnessScore || result.fitnessScore || 0}).`);
        // refresh list
        await fetchGeneratedList();
      } else if (result && result.timetableEntries) {
        setSuccess(`Generated timetable with ${result.timetableEntries.length} entries.`);
        await fetchGeneratedList();
      } else {
        setError('Generation completed but no timetable was returned');
      }

    } catch (err: any) {
      console.error('Generate error', err);
      setError(err?.message || 'Generation failed');
      clearInterval(progressInterval);
    } finally {
      setIsGenerating(false);
    }
  };

  // list generated timetables
  const [generatedList, setGeneratedList] = useState<any[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>(String(autoGenForm.academicYear));
  const [divisionFilter, setDivisionFilter] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string>('');

  const fetchGeneratedList = async () => {
    try {
      const resp = await timetableAPI.getGeneratedTimetables({ department: departmentFilter, year: yearFilter, division: divisionFilter });
      const list = resp || resp.generatedTimetables || resp.data || [];
      setGeneratedList(Array.isArray(list) ? list : (list.generatedTimetables || []));
    } catch (err) {
      console.error('Fetch generated list failed', err);
    }
  };

  useEffect(() => { fetchGeneratedList(); }, []);

  const handleAccept = async (id: string) => {
    if (!user || user.role !== 'admin') { setError('Admin access required'); return; }
    try {
      await timetableAPI.acceptGeneratedTimetable(id);
      setSuccess('Accepted generated timetable and saved to timetables.');
      await fetchGeneratedList();
    } catch (err: any) {
      console.error('Accept failed', err);
      setError(err?.message || 'Accept failed');
    }
  };

  const handleReset = () => {
    setTimetableResult(null);
    setError('');
    setSuccess('');
    setGenerationProgress(0);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Timetable Generator</h1>
        <p className="text-gray-600">Generate optimized class schedules using advanced algorithms</p>
      </div>

      <div className="space-y-6">
        <Card>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Wand2 className="mr-2 h-5 w-5 text-blue-500" />
            Automatic Timetable Generator
          </h3>
          
          {/* Statistics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Courses</p>
                  <p className="text-2xl font-bold text-blue-600">17</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Teachers</p>
                  <p className="text-2xl font-bold text-green-600">12</p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-purple-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Rooms</p>
                  <p className="text-2xl font-bold text-purple-600">6</p>
                </div>
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Semesters</p>
                  <p className="text-2xl font-bold text-orange-600">{availableSemesters.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Available Semesters Info */}
          {availableSemesters.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h4 className="font-medium mb-2">Available Semesters:</h4>
              <div className="flex flex-wrap gap-2">
                {availableSemesters.map(sem => (
                  <span key={sem.semester} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    Semester {sem.semester} ({sem.courseCount} courses)
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Algorithm *</label>
              <select
                value={autoGenForm.algorithm}
                onChange={(e) => setAutoGenForm({...autoGenForm, algorithm: e.target.value as any})}
                className="w-full p-2 border rounded-md"
                aria-label="Select algorithm"
              >
                {algorithms.map(algo => (
                  <option key={algo.value} value={algo.value}>
                    {algo.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {algorithms.find(a => a.value === autoGenForm.algorithm)?.description}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Semester</label>
              <select
                value={selectedSemester || autoGenForm.semester}
                onChange={(e) => { setSelectedSemester(e.target.value); setAutoGenForm({...autoGenForm, semester: e.target.value}); }}
                className="w-full p-2 border rounded-md"
                aria-label="Select semester"
              >
                <option value="">All Semesters</option>
                {availableSemesters.map(sem => (
                  <option key={sem.semester} value={String(sem.semester)}>
                    Semester {sem.semester} ({sem.courseCount} courses)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Academic Year</label>
              <input
                type="number"
                value={autoGenForm.academicYear}
                onChange={(e) => setAutoGenForm({...autoGenForm, academicYear: parseInt(e.target.value)})}
                className="w-full p-2 border rounded-md"
                min="2020"
                max="2030"
              />
            </div>
          </div>

          {/* Department / Year / Division Filters for departmental generation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Department *</label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Select department</option>
                {departments.map(dep => (
                  <option key={dep} value={dep}>{dep}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Year</label>
              <input
                type="text"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="e.g. 2025 or 1st Year"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Division</label>
              <input
                type="text"
                value={divisionFilter}
                onChange={(e) => setDivisionFilter(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="e.g. A"
              />
            </div>
          </div>

          {/* Error and Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-green-700">{success}</span>
            </div>
          )}

          {/* Generation Controls */}
          <div className="flex gap-4">
            <Button
              onClick={handleAutoGenerate}
              disabled={isGenerating || !user || user.role !== 'admin'}
              className="flex items-center"
            >
              <Play className="mr-2 h-4 w-4" />
              {isGenerating ? 'Generating...' : 'Generate Timetable'}
            </Button>
            
            <Button variant="secondary" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>

          {/* Progress Bar */}
          {isGenerating && (
            <div className="mt-4">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-blue-700">Generating Timetable...</span>
                <span className="text-sm font-medium text-blue-700">{generationProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${generationProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </Card>

        {/* Results Preview */}
        {timetableResult && timetableResult.success && (
          <Card>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
              Generation Results
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Quality Score</p>
                <p className="text-2xl font-bold text-green-600">
                  {timetableResult.data?.metrics.qualityScore || 0}/100
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-blue-600">
                  {timetableResult.data?.metadata.totalSessions || 0}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-purple-600">
                  {timetableResult.data?.metrics.schedulingRate || 0}%
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Conflicts</p>
                <p className="text-2xl font-bold text-orange-600">
                  {timetableResult.data?.conflicts?.length || 0}
                </p>
              </div>
            </div>

            {/* Sample Sessions Preview */}
            {timetableResult.data?.timetable && timetableResult.data.timetable.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Sample Sessions (First 5):</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Course</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Day</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Time</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Teacher</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Room</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timetableResult.data.timetable.slice(0, 5).map((session: any, index: number) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-2 text-sm">
                            <div>
                              <div className="font-medium">{session.courseCode}</div>
                              <div className="text-gray-500">{session.courseName}</div>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm capitalize">{session.day}</td>
                          <td className="px-4 py-2 text-sm">{session.timeSlot}</td>
                          <td className="px-4 py-2 text-sm">{session.teacherName || 'TBD'}</td>
                          <td className="px-4 py-2 text-sm">{session.roomNumber || session.room?.roomNumber}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {timetableResult.data.timetable.length > 5 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Showing 5 of {timetableResult.data.timetable.length} total sessions
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-4 mt-6">
              <Button>
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
              <Button variant="secondary">
                <Save className="mr-2 h-4 w-4" />
                Save Timetable
              </Button>
            </div>
          </Card>
        )}
        
        {/* Generated Timetables List */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Generated Timetables</h3>
            <div className="flex items-center gap-2">
              <Button onClick={fetchGeneratedList} variant="secondary">Refresh</Button>
            </div>
          </div>

          {generatedList.length === 0 ? (
            <p className="text-sm text-gray-500">No generated timetables yet for the selected filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Department</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Year</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Division</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Fitness</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Created</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedList.map((g: any) => (
                    <tr key={g.id} className="border-t">
                      <td className="px-4 py-2 text-sm">{g.department}</td>
                      <td className="px-4 py-2 text-sm">{g.year}</td>
                      <td className="px-4 py-2 text-sm">{g.division}</td>
                      <td className="px-4 py-2 text-sm">{g.fitnessScore ?? g.fitness ?? '-'}</td>
                      <td className="px-4 py-2 text-sm">{new Date(g.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-2 text-sm">
                        <div className="flex gap-2">
                          <Button onClick={() => setExpandedId(expandedId === g.id ? '' : g.id)} variant="secondary">
                            <Eye className="mr-2 h-4 w-4" /> View
                          </Button>
                          <Button onClick={() => handleAccept(g.id)}>
                            <CheckCircle className="mr-2 h-4 w-4" /> Accept
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {generatedList.map((g: any) => (
                expandedId === g.id ? (
                  <div key={g.id} className="mt-4 p-4 bg-gray-50 rounded-md">
                    <h4 className="font-medium mb-2">Timetable Preview ({g.department} {g.year} {g.division})</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white border">
                        <thead className="bg-white">
                          <tr>
                            <th className="px-3 py-2 text-left text-sm">Subject</th>
                            <th className="px-3 py-2 text-left text-sm">Day</th>
                            <th className="px-3 py-2 text-left text-sm">Time</th>
                            <th className="px-3 py-2 text-left text-sm">Room</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(g.timetableData || g.timetable || []).slice(0, 20).map((row: any, i: number) => (
                            <tr key={i} className="border-t">
                              <td className="px-3 py-2 text-sm">{row.subject || row.courseName || row.subjectName}</td>
                              <td className="px-3 py-2 text-sm">{row.dayOfWeek || row.day}</td>
                              <td className="px-3 py-2 text-sm">{row.startTime ? `${row.startTime} - ${row.endTime}` : row.timeSlot}</td>
                              <td className="px-3 py-2 text-sm">{row.room}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default TimetableGeneratorPage;