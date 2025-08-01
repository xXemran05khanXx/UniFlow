import React, { useState } from 'react';
import { Calendar, Clock, Users, BookOpen, Settings, Download, Play, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import LoadingSpinner from '../ui/LoadingSpinner';
import { timetableAPI, TimetableGenerationResult } from '../../services/timetableService';
import { useAuth } from '../../hooks/useAuth';

interface TimetableGeneratorProps {
  onTimetableGenerated?: (result: TimetableGenerationResult) => void;
}

const TimetableGenerator: React.FC<TimetableGeneratorProps> = ({ onTimetableGenerated }) => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<TimetableGenerationResult | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Generation options
  const [options, setOptions] = useState({
    algorithm: 'greedy' as 'greedy' | 'genetic' | 'constraint',
    maxIterations: 1000,
    semester: 'fall',
    academicYear: new Date().getFullYear()
  });

  // Statistics
  const [stats] = useState({
    totalCourses: 5,
    totalTeachers: 4,
    totalRooms: 4,
    estimatedTime: '2-3 seconds'
  });

  const handleGenerate = async () => {
    console.log('🔍 Debug - User object:', user);
    console.log('🔍 Debug - User role:', user?.role);
    console.log('🔍 Debug - Token in localStorage:', localStorage.getItem('token'));
    console.log('🔍 Debug - User data in localStorage:', localStorage.getItem('user'));
    
    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
      setError('You do not have permission to generate timetables');
      return;
    }

    setIsGenerating(true);
    setError('');
    setSuccess('');

    try {
      console.log('🚀 Starting timetable generation with options:', options);
      
      const result = await timetableAPI.generateTimetable(options);
      
      console.log('✅ Timetable generated successfully:', result);
      
      // Extract the actual timetable data from the response
      const timetableData: TimetableGenerationResult = (result as any).data || result;
      
      setGenerationResult(timetableData);
      setSuccess(`Timetable generated successfully! ${timetableData.timetable?.length || 0} sessions scheduled with ${timetableData.conflicts?.length || 0} conflicts.`);
      
      if (onTimetableGenerated) {
        onTimetableGenerated(timetableData);
      }
      
    } catch (err: any) {
      console.error('❌ Timetable generation failed:', err);
      setError(err.response?.data?.error || err.message || 'Failed to generate timetable');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv' = 'json') => {
    try {
      setError('');
      
      if (format === 'csv') {
        // For CSV, download directly from backend
        const token = localStorage.getItem('token');
        const params = new URLSearchParams({
          format: 'csv',
          semester: options.semester
        });
        
        const response = await fetch(`http://localhost:5000/api/timetable/export?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Export failed');
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timetable-${options.semester}-${options.academicYear}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // For JSON, use the API request
        const exportData = await timetableAPI.exportTimetable({ 
          format, 
          semester: options.semester 
        });
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timetable-${options.semester}-${options.academicYear}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      setSuccess(`Timetable exported as ${format.toUpperCase()} successfully!`);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to export timetable');
    }
  };

  const algorithmOptions = [
    { value: 'greedy', label: 'Greedy Algorithm', description: 'Fast and efficient for most cases' },
    { value: 'genetic', label: 'Genetic Algorithm', description: 'Optimal solutions for complex scheduling' },
    { value: 'constraint', label: 'Constraint Satisfaction', description: 'Guaranteed feasible solutions' }
  ];

  const semesterOptions = [
    { value: 'fall', label: 'Fall Semester' },
    { value: 'spring', label: 'Spring Semester' },
    { value: 'summer', label: 'Summer Semester' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-8 w-8" />
              Automatic Timetable Generator
            </h2>
            <p className="text-blue-100 mt-2">
              Generate optimized class schedules using advanced algorithms
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{stats.totalCourses}</div>
            <div className="text-sm text-blue-200">Courses Ready</div>
          </div>
        </div>
      </div>

      {/* Generation Options */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Generation Settings
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Algorithm Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Algorithm
              </label>
              <select
                value={options.algorithm}
                onChange={(e) => setOptions({ ...options, algorithm: e.target.value as 'greedy' | 'genetic' | 'constraint' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Select generation algorithm"
              >
                {algorithmOptions.map(algo => (
                  <option key={algo.value} value={algo.value}>
                    {algo.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {algorithmOptions.find(a => a.value === options.algorithm)?.description}
              </p>
            </div>

            {/* Semester Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Semester
              </label>
              <select
                value={options.semester}
                onChange={(e) => setOptions({ ...options, semester: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Select semester"
              >
                {semesterOptions.map(sem => (
                  <option key={sem.value} value={sem.value}>
                    {sem.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Academic Year */}
            <div>
              <Input
                label="Academic Year"
                type="number"
                value={options.academicYear}
                onChange={(e) => setOptions({ ...options, academicYear: parseInt(e.target.value) })}
                min="2020"
                max="2030"
              />
            </div>

            {/* Max Iterations */}
            <div>
              <Input
                label="Max Iterations"
                type="number"
                value={options.maxIterations}
                onChange={(e) => setOptions({ ...options, maxIterations: parseInt(e.target.value) })}
                min="100"
                max="10000"
                step="100"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="p-4 text-center">
            <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{stats.totalCourses}</div>
            <div className="text-sm text-gray-600">Courses</div>
          </div>
        </Card>
        
        <Card>
          <div className="p-4 text-center">
            <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{stats.totalTeachers}</div>
            <div className="text-sm text-gray-600">Teachers</div>
          </div>
        </Card>
        
        <Card>
          <div className="p-4 text-center">
            <Settings className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{stats.totalRooms}</div>
            <div className="text-sm text-gray-600">Rooms</div>
          </div>
        </Card>
        
        <Card>
          <div className="p-4 text-center">
            <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-lg font-bold text-gray-900">{stats.estimatedTime}</div>
            <div className="text-sm text-gray-600">Est. Time</div>
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2"
          size="lg"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Play className="h-5 w-5" />
              Generate Timetable
            </>
          )}
        </Button>

        {generationResult && (
          <>
            <Button
              onClick={() => handleExport('json')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-5 w-5" />
              Export JSON
            </Button>
            
            <Button
              onClick={() => handleExport('csv')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-5 w-5" />
              Export CSV
            </Button>
          </>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          {success}
        </div>
      )}

      {/* Generation Result */}
      {generationResult && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Generation Results
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {generationResult?.metrics?.qualityScore || 0}/100
                </div>
                <div className="text-sm text-blue-800">Quality Score</div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {generationResult?.timetable?.length || 0}
                </div>
                <div className="text-sm text-green-800">Sessions Scheduled</div>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {generationResult?.conflicts?.length || 0}
                </div>
                <div className="text-sm text-orange-800">Conflicts Found</div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Generation Details:</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Algorithm:</strong> {generationResult?.metadata?.algorithm || 'N/A'}</p>
                <p><strong>Generated:</strong> {generationResult?.metadata?.generatedAt ? new Date(generationResult.metadata.generatedAt).toLocaleString() : 'N/A'}</p>
                <p><strong>Scheduling Rate:</strong> {generationResult?.metrics?.schedulingRate || 0}%</p>
                <p><strong>Courses Scheduled:</strong> {generationResult?.metrics?.coursesScheduled || 0}/{generationResult?.metrics?.totalCourses || 0}</p>
              </div>
            </div>

            {(generationResult?.conflicts?.length || 0) > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-orange-600 mb-2">⚠️ Conflicts Detected:</h4>
                <div className="bg-orange-50 p-3 rounded-lg max-h-40 overflow-y-auto">
                  {(generationResult?.conflicts || []).map((conflict, index) => (
                    <div key={index} className="text-sm text-orange-700 mb-1">
                      • {conflict.message || `${conflict.type}: ${conflict.course || 'Unknown'}`}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Loading State */}
      {isGenerating && (
        <Card>
          <div className="p-8 text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Generating Timetable...
            </h3>
            <p className="text-gray-600">
              Please wait while we optimize your class schedule using the {options.algorithm} algorithm.
            </p>
            <div className="mt-4 bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse w-3/5"></div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default TimetableGenerator;
