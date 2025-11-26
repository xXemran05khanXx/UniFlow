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

const GeneratePage: React.FC = () => {
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

  // Load available semesters on component mount
  useEffect(() => {
    fetchAvailableSemesters();
  }, []);

  const fetchAvailableSemesters = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/timetable-simple/semesters', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableSemesters(data.semesters || []);
      }
    } catch (error) {
      console.error('Failed to fetch semesters:', error);
    }
  };

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
      const token = localStorage.getItem('token');
      const payload: any = {
        algorithm: autoGenForm.algorithm,
        academicYear: autoGenForm.academicYear
      };

      // Only include semester if one is selected
      if (autoGenForm.semester) {
        payload.semester = parseInt(autoGenForm.semester);
      }

      console.log('🚀 Generating timetable with payload:', payload);

      const response = await fetch('http://localhost:5000/api/timetable-simple/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);

      const result: TimetableResult = await response.json();

      console.log('🔍 Frontend received API response:', result);
      console.log('🔍 Frontend data structure:', {
        success: result.success,
        dataExists: !!result.data,
        metadata: result.data?.metadata,
        metrics: result.data?.metrics,
        conflictsLength: result.data?.conflicts?.length
      });

      if (result.success) {
        setTimetableResult(result);
        console.log('🔍 Frontend set timetableResult state:', result);
        const semesterText = autoGenForm.semester ? `semester ${autoGenForm.semester}` : 'all semesters';
        setSuccess(`✅ Timetable generated successfully for ${semesterText}! ${result.data?.metadata.totalSessions || 0} sessions scheduled with ${result.data?.conflicts?.length || 0} conflicts.`);
      } else {
        throw new Error(result.message || 'Generation failed');
      }

    } catch (error: any) {
      console.error('❌ Generation failed:', error);
      setError(error.message || 'Failed to generate timetable');
      clearInterval(progressInterval);
    } finally {
      setIsGenerating(false);
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
                value={autoGenForm.semester}
                onChange={(e) => setAutoGenForm({...autoGenForm, semester: e.target.value})}
                className="w-full p-2 border rounded-md"
                aria-label="Select semester"
              >
                <option value="">All Semesters</option>
                {availableSemesters.map(sem => (
                  <option key={sem.semester} value={sem.semester}>
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
      </div>
    </div>
  );
};

export default GeneratePage;