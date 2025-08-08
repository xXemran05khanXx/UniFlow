import React, { useState, useRef } from 'react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import './css/GeneratePage.module.css';
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
  Save
} from 'lucide-react';

interface GeneratePageProps {}

const GeneratePage: React.FC<GeneratePageProps> = () => {
  const [activeTab, setActiveTab] = useState<'auto' | 'manual' | 'templates' | 'history'>('auto');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<'setup' | 'generating' | 'preview' | 'complete'>('setup');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for auto generation
  const [autoGenForm, setAutoGenForm] = useState({
    department: '',
    year: '',
    semester: '',
    algorithm: 'genetic',
    maxIterations: 100,
    populationSize: 50
  });

  // Manual form state
  const [manualForm, setManualForm] = useState({
    department: '',
    year: '',
    semester: '',
    subject: '',
    teacher: '',
    room: '',
    timeSlot: '',
    day: ''
  });

  const departments = [
    'Computer Engineering',
    'Information Technology', 
    'Electronics & Communication',
    'Mechanical Engineering',
    'Civil Engineering',
    'Electrical Engineering'
  ];

  const algorithms = [
    { value: 'genetic', label: 'Genetic Algorithm', description: 'Best for complex schedules' },
    { value: 'greedy', label: 'Greedy Algorithm', description: 'Fast and simple' },
    { value: 'constraint_satisfaction', label: 'Constraint Satisfaction', description: 'Rule-based approach' }
  ];

  const handleAutoGenerate = async () => {
    if (!autoGenForm.department || !autoGenForm.year || !autoGenForm.semester) {
      alert('Please fill all required fields');
      return;
    }

    setIsGenerating(true);
    setCurrentStep('generating');
    setGenerationProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setCurrentStep('preview');
          setIsGenerating(false);
          return 100;
        }
        return prev + 10;
      });
    }, 500);

    try {
      // Here you would call the actual API
      const response = await fetch('/api/timetable/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...autoGenForm,
          algorithm: autoGenForm.algorithm,
          maxIterations: autoGenForm.maxIterations,
          populationSize: autoGenForm.populationSize
        })
      });

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      const result = await response.json();
      console.log('Generation result:', result);
      // Handle success - result contains the generated timetable data
    } catch (error) {
      console.error('Generation error:', error);
      setIsGenerating(false);
      setCurrentStep('setup');
      clearInterval(interval);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Handle file upload logic
      console.log('File uploaded:', file.name);
    }
  };

  const renderAutoGeneration = () => (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Wand2 className="mr-2 h-5 w-5 text-blue-500" />
          Automatic Timetable Generation
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Department *</label>
            <select
              value={autoGenForm.department}
              onChange={(e) => setAutoGenForm({...autoGenForm, department: e.target.value})}
              className="w-full p-2 border rounded-md"
              aria-label="Select department"
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Year *</label>
            <select
              value={autoGenForm.year}
              onChange={(e) => setAutoGenForm({...autoGenForm, year: e.target.value})}
              className="w-full p-2 border rounded-md"
              aria-label="Select year"
            >
              <option value="">Select Year</option>
              <option value="1">First Year</option>
              <option value="2">Second Year</option>
              <option value="3">Third Year</option>
              <option value="4">Fourth Year</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Semester *</label>
            <select
              value={autoGenForm.semester}
              onChange={(e) => setAutoGenForm({...autoGenForm, semester: e.target.value})}
              className="w-full p-2 border rounded-md"
              aria-label="Select semester"
            >
              <option value="">Select Semester</option>
              <option value="odd">Odd Semester</option>
              <option value="even">Even Semester</option>
            </select>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Algorithm Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Algorithm</label>
              <select
                value={autoGenForm.algorithm}
                onChange={(e) => setAutoGenForm({...autoGenForm, algorithm: e.target.value})}
                className="w-full p-2 border rounded-md"
                aria-label="Select algorithm"
              >
                {algorithms.map(algo => (
                  <option key={algo.value} value={algo.value}>
                    {algo.label} - {algo.description}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-2">Max Iterations</label>
                <input
                  type="number"
                  value={autoGenForm.maxIterations}
                  onChange={(e) => setAutoGenForm({...autoGenForm, maxIterations: parseInt(e.target.value)})}
                  className="w-full p-2 border rounded-md"
                  min="10"
                  max="1000"
                  aria-label="Maximum iterations"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Population Size</label>
                <input
                  type="number"
                  value={autoGenForm.populationSize}
                  onChange={(e) => setAutoGenForm({...autoGenForm, populationSize: parseInt(e.target.value)})}
                  className="w-full p-2 border rounded-md"
                  min="10"
                  max="200"
                  aria-label="Population size"
                />
              </div>
            </div>
          </div>
        </div>

        {currentStep === 'generating' && (
          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <div className="flex items-center mb-2">
              <Cpu className="mr-2 h-5 w-5 text-blue-500 animate-spin" />
              <span className="font-medium">Generating Timetable...</span>
            </div>
            <div className="progress-bar-container">
              <div 
                className={`progress-bar-fill progress-${generationProgress}`}
                role="progressbar"
                aria-label={`Generation progress: ${generationProgress}%`}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">{generationProgress}% Complete</p>
          </div>
        )}

        <div className="flex gap-2 mt-6">
          <Button
            onClick={handleAutoGenerate}
            disabled={isGenerating || !autoGenForm.department || !autoGenForm.year || !autoGenForm.semester}
            className="flex items-center"
          >
            {isGenerating ? (
              <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {isGenerating ? 'Generating...' : 'Generate Timetable'}
          </Button>
          
          <Button variant="outline" onClick={() => setCurrentStep('setup')}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </Card>

      {currentStep === 'preview' && (
        <Card>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Eye className="mr-2 h-5 w-5 text-green-500" />
            Generated Timetable Preview
          </h3>
          
          <div className="bg-green-50 p-4 rounded-md mb-4">
            <p className="text-green-800">✅ Timetable generated successfully!</p>
            <p className="text-sm text-green-600">Fitness Score: 95% • 0 Conflicts Detected</p>
          </div>
          
          <div className="flex gap-2 mb-4">
            <Button className="flex items-center">
              <Save className="mr-2 h-4 w-4" />
              Save Timetable
            </Button>
            <Button variant="outline" className="flex items-center">
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button variant="outline" className="flex items-center">
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          </div>
          
          {/* Placeholder for timetable grid */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-2" />
            <p className="text-gray-500">Timetable grid would be displayed here</p>
          </div>
        </Card>
      )}
    </div>
  );

  const renderManualGeneration = () => (
    <Card>
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <FileText className="mr-2 h-5 w-5 text-purple-500" />
        Manual Timetable Entry
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Department</label>
          <select
            value={manualForm.department}
            onChange={(e) => setManualForm({...manualForm, department: e.target.value})}
            className="w-full p-2 border rounded-md"
            aria-label="Select department for manual entry"
          >
            <option value="">Select Department</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Subject</label>
          <input
            type="text"
            value={manualForm.subject}
            onChange={(e) => setManualForm({...manualForm, subject: e.target.value})}
            className="w-full p-2 border rounded-md"
            placeholder="Enter subject name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Teacher</label>
          <input
            type="text"
            value={manualForm.teacher}
            onChange={(e) => setManualForm({...manualForm, teacher: e.target.value})}
            className="w-full p-2 border rounded-md"
            placeholder="Enter teacher name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Room</label>
          <input
            type="text"
            value={manualForm.room}
            onChange={(e) => setManualForm({...manualForm, room: e.target.value})}
            className="w-full p-2 border rounded-md"
            placeholder="Enter room number"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Day</label>
          <select
            value={manualForm.day}
            onChange={(e) => setManualForm({...manualForm, day: e.target.value})}
            className="w-full p-2 border rounded-md"
            aria-label="Select day for manual entry"
          >
            <option value="">Select Day</option>
            <option value="monday">Monday</option>
            <option value="tuesday">Tuesday</option>
            <option value="wednesday">Wednesday</option>
            <option value="thursday">Thursday</option>
            <option value="friday">Friday</option>
            <option value="saturday">Saturday</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Time Slot</label>
          <select
            value={manualForm.timeSlot}
            onChange={(e) => setManualForm({...manualForm, timeSlot: e.target.value})}
            className="w-full p-2 border rounded-md"
            aria-label="Select time slot for manual entry"
          >
            <option value="">Select Time</option>
            <option value="9:00-10:00">9:00 AM - 10:00 AM</option>
            <option value="10:00-11:00">10:00 AM - 11:00 AM</option>
            <option value="11:00-12:00">11:00 AM - 12:00 PM</option>
            <option value="12:00-13:00">12:00 PM - 1:00 PM</option>
            <option value="14:00-15:00">2:00 PM - 3:00 PM</option>
            <option value="15:00-16:00">3:00 PM - 4:00 PM</option>
            <option value="16:00-17:00">4:00 PM - 5:00 PM</option>
          </select>
        </div>
      </div>
      
      <div className="flex gap-2 mt-6">
        <Button className="flex items-center">
          <FileText className="mr-2 h-4 w-4" />
          Add Entry
        </Button>
        <Button variant="outline">
          Clear Form
        </Button>
      </div>
    </Card>
  );

  const renderTemplates = () => (
    <Card>
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Download className="mr-2 h-5 w-5 text-orange-500" />
        Template Downloads
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-2">
            <FileText className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <h4 className="font-medium">Subject Template</h4>
              <p className="text-sm text-gray-500">CSV format for subjects</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
        
        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-2">
            <FileText className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <h4 className="font-medium">Teacher Template</h4>
              <p className="text-sm text-gray-500">CSV format for teachers</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
        
        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-2">
            <FileText className="h-8 w-8 text-purple-500 mr-3" />
            <div>
              <h4 className="font-medium">Room Template</h4>
              <p className="text-sm text-gray-500">CSV format for rooms</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </div>
      
      <div className="mt-6">
        <h4 className="font-medium mb-3">Upload Data Files</h4>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,.xlsx,.pdf"
            className="hidden"
            multiple
            aria-label="Upload data files"
          />
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-2" />
          <p className="text-gray-500 mb-2">Drop files here or click to upload</p>
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Select Files
          </Button>
        </div>
      </div>
    </Card>
  );

  const renderHistory = () => (
    <Card>
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Calendar className="mr-2 h-5 w-5 text-indigo-500" />
        Generation History
      </h3>
      
      <div className="space-y-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="border rounded-lg p-4 flex items-center justify-between">
            <div>
              <h4 className="font-medium">Computer Engineering - 3rd Year</h4>
              <p className="text-sm text-gray-500">Generated on Dec 15, 2024 • Genetic Algorithm</p>
              <p className="text-sm text-green-600">Fitness Score: 92% • 2 minor conflicts</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Eye className="mr-2 h-4 w-4" />
                View
              </Button>
              <Button size="sm" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Generate Timetables</h1>
          <p className="text-gray-600 mt-1">
            Create and manage timetables using automated algorithms or manual entry
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'auto', name: 'Auto Generate', icon: Wand2 },
            { id: 'manual', name: 'Manual Entry', icon: FileText },
            { id: 'templates', name: 'Templates', icon: Download },
            { id: 'history', name: 'History', icon: Calendar }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'auto' && renderAutoGeneration()}
      {activeTab === 'manual' && renderManualGeneration()}
      {activeTab === 'templates' && renderTemplates()}
      {activeTab === 'history' && renderHistory()}
    </div>
  );
};

export default GeneratePage;
