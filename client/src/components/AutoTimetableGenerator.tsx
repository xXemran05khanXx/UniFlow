import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TimetableGrid from "./TimetableGrid";
import { Upload, FileText, Cpu, Check, X, RefreshCw, AlertTriangle, Download } from "lucide-react";

interface AutoTimetableGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ExtractedSubject {
  name: string;
  code?: string;
  lectureHours: number;
  labHours: number;
  isLab: boolean;
  credits?: number;
}

interface GeneratedTimetableEntry {
  id: string;
  subject: {
    name: string;
    code: string;
  };
  teacher: {
    name: string;
  };
  room: {
    number: string;
  };
  timeSlot: {
    day: string;
    startTime: string;
    endTime: string;
  };
  type: string;
  department: string;
  year: string;
  division: string;
}

export default function AutoTimetableGenerator({ isOpen, onClose, onSuccess }: AutoTimetableGeneratorProps) {
  const [currentStep, setCurrentStep] = useState<'upload' | 'subjects' | 'generate' | 'review'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedSubjects, setExtractedSubjects] = useState<ExtractedSubject[]>([]);
  const [generatedTimetable, setGeneratedTimetable] = useState<GeneratedTimetableEntry[]>([]);
  const [fitnessScore, setFitnessScore] = useState<number>(0);
  const [generatedTimetableId, setGeneratedTimetableId] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    department: '',
    year: '',
    division: ''
  });

  const [gaParams, setGaParams] = useState({
    populationSize: 50,
    generations: 100,
    mutationRate: 0.1,
    crossoverRate: 0.8
  });

  const departments = ['Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology'];
  const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  const divisions = ['A', 'B', 'C'];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file);
      setError('');
    } else {
      setError('Please select a valid PDF file');
    }
  };

  const handleSyllabusUpload = async () => {
    if (!uploadedFile || !formData.department || !formData.year || !formData.division) {
      setError('Please fill all fields and select a PDF file');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('syllabus', uploadedFile);
      formDataToSend.append('department', formData.department);
      formDataToSend.append('year', formData.year);
      formDataToSend.append('division', formData.division);
      formDataToSend.append('uploadedBy', 'admin-user'); // TODO: Get actual user ID

      const response = await fetch('/api/syllabus/upload', {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();

      if (response.ok) {
        setExtractedSubjects(data.extractedSubjects);
        setCurrentStep('subjects');
        if (data.warning) {
          setError(data.warning);
        }
      } else {
        setError(data.error || 'Failed to upload syllabus');
      }
    } catch (error) {
      setError('Upload failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateTimetable = async () => {
    setIsLoading(true);
    setError('');
    setCurrentStep('generate');

    try {
      const response = await fetch('/api/timetables/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          department: formData.department,
          year: formData.year,
          division: formData.division,
          subjects: extractedSubjects,
          gaParams
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setGeneratedTimetable(data.timetableEntries);
        setFitnessScore(data.fitnessScore);
        setGeneratedTimetableId(data.generatedTimetable.id);
        setCurrentStep('review');
      } else {
        setError(data.error || 'Failed to generate timetable');
        setCurrentStep('subjects');
      }
    } catch (error) {
      setError('Generation failed. Please try again.');
      setCurrentStep('subjects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptTimetable = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/timetables/accept/${generatedTimetableId}`, {
        method: 'POST',
      });

      if (response.ok) {
        onSuccess();
        onClose();
        resetForm();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to accept timetable');
      }
    } catch (error) {
      setError('Failed to save timetable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep('upload');
    setUploadedFile(null);
    setExtractedSubjects([]);
    setGeneratedTimetable([]);
    setFitnessScore(0);
    setGeneratedTimetableId('');
    setError('');
    setFormData({ department: '', year: '', division: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFitnessColor = (score: number) => {
    if (score >= 800) return 'text-green-600 bg-green-100';
    if (score >= 600) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getFitnessLabel = (score: number) => {
    if (score >= 800) return 'Excellent';
    if (score >= 600) return 'Good';
    return 'Needs Improvement';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-2xl font-bold text-gray-900 mb-2">
          Automated Timetable Generator
        </DialogTitle>
        <DialogDescription className="text-gray-600 mb-6">
          Upload a syllabus PDF to automatically extract subjects and generate an optimized timetable using Genetic Algorithm
        </DialogDescription>

        {/* Progress Steps */}
        <div className="flex items-center mb-6">
          {[
            { step: 'upload', label: 'Upload Syllabus', icon: Upload },
            { step: 'subjects', label: 'Review Subjects', icon: FileText },
            { step: 'generate', label: 'Generate Timetable', icon: Cpu },
            { step: 'review', label: 'Review & Accept', icon: Check }
          ].map(({ step, label, icon: Icon }, index) => (
            <React.Fragment key={step}>
              <div className={`flex items-center ${
                currentStep === step ? 'text-blue-600' : 
                ['upload', 'subjects', 'generate', 'review'].indexOf(currentStep) > index ? 'text-green-600' : 'text-gray-400'
              }`}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                  currentStep === step ? 'border-blue-600 bg-blue-50' :
                  ['upload', 'subjects', 'generate', 'review'].indexOf(currentStep) > index ? 'border-green-600 bg-green-50' : 'border-gray-300'
                }`}>
                  <Icon size={16} />
                </div>
                <span className="ml-2 text-sm font-medium">{label}</span>
              </div>
              {index < 3 && <div className="flex-1 h-0.5 bg-gray-300 mx-4" />}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertTriangle className="text-red-500 mr-2" size={16} />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {/* Step 1: Upload Syllabus */}
        {currentStep === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="mr-2" size={20} />
                Upload Syllabus PDF
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Select value={formData.department} onValueChange={(value: string) => setFormData(prev => ({ ...prev, department: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Select value={formData.year} onValueChange={(value: string) => setFormData(prev => ({ ...prev, year: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(year => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="division">Division</Label>
                  <Select value={formData.division} onValueChange={(value: string) => setFormData(prev => ({ ...prev, division: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select division" />
                    </SelectTrigger>
                    <SelectContent>
                      {divisions.map(div => (
                        <SelectItem key={div} value={div}>Division {div}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="syllabus">Syllabus PDF</Label>
                <div className="mt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="syllabus"
                    title="Upload syllabus PDF file"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-20 border-2 border-dashed border-gray-300 hover:border-blue-400"
                  >
                    <div className="text-center">
                      <FileText className="mx-auto mb-2" size={24} />
                      <p className="text-sm font-medium">
                        {uploadedFile ? uploadedFile.name : 'Click to upload PDF syllabus'}
                      </p>
                      <p className="text-xs text-gray-500">PDF files only, max 10MB</p>
                    </div>
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleSyllabusUpload}
                disabled={isLoading || !uploadedFile || !formData.department || !formData.year || !formData.division}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 animate-spin" size={16} />
                    Extracting Subjects...
                  </>
                ) : (
                  'Upload & Extract Subjects'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Review Subjects */}
        {currentStep === 'subjects' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="mr-2" size={20} />
                  Extracted Subjects ({extractedSubjects.length})
                </div>
                <Badge variant="secondary">
                  {formData.department} - {formData.year} - Div {formData.division}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {extractedSubjects.map((subject, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900">{subject.name}</h4>
                      {subject.isLab && <Badge variant="outline">Lab</Badge>}
                    </div>
                    {subject.code && (
                      <p className="text-sm text-gray-600 mb-1">Code: {subject.code}</p>
                    )}
                    <div className="text-sm text-gray-600">
                      <span>Lecture: {subject.lectureHours}h</span>
                      {subject.labHours > 0 && <span> • Lab: {subject.labHours}h</span>}
                      {subject.credits && <span> • Credits: {subject.credits}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* GA Parameters */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Genetic Algorithm Parameters</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <Label htmlFor="populationSize" className="text-xs">Population Size</Label>
                    <Input
                      id="populationSize"
                      type="number"
                      value={gaParams.populationSize}
                      onChange={(e) => setGaParams(prev => ({ ...prev, populationSize: parseInt(e.target.value) || 50 }))}
                      min="10"
                      max="200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="generations" className="text-xs">Generations</Label>
                    <Input
                      id="generations"
                      type="number"
                      value={gaParams.generations}
                      onChange={(e) => setGaParams(prev => ({ ...prev, generations: parseInt(e.target.value) || 100 }))}
                      min="10"
                      max="500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mutationRate" className="text-xs">Mutation Rate</Label>
                    <Input
                      id="mutationRate"
                      type="number"
                      step="0.01"
                      value={gaParams.mutationRate}
                      onChange={(e) => setGaParams(prev => ({ ...prev, mutationRate: parseFloat(e.target.value) || 0.1 }))}
                      min="0.01"
                      max="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="crossoverRate" className="text-xs">Crossover Rate</Label>
                    <Input
                      id="crossoverRate"
                      type="number"
                      step="0.01"
                      value={gaParams.crossoverRate}
                      onChange={(e) => setGaParams(prev => ({ ...prev, crossoverRate: parseFloat(e.target.value) || 0.8 }))}
                      min="0.01"
                      max="1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button onClick={() => setCurrentStep('upload')} variant="outline" className="flex-1">
                  Back to Upload
                </Button>
                <Button onClick={handleGenerateTimetable} className="flex-1">
                  <Cpu className="mr-2" size={16} />
                  Generate Timetable
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Generate (Loading) */}
        {currentStep === 'generate' && (
          <Card>
            <CardContent className="p-8 text-center">
              <Cpu className="mx-auto mb-4 animate-pulse" size={48} />
              <h3 className="text-xl font-semibold mb-2">Generating Optimal Timetable</h3>
              <p className="text-gray-600 mb-4">
                Running Genetic Algorithm with {gaParams.populationSize} population size over {gaParams.generations} generations...
              </p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-4">This may take 30-60 seconds</p>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Review Generated Timetable */}
        {currentStep === 'review' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center">
                    <Check className="mr-2" size={20} />
                    Generated Timetable
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className={`px-3 py-1 rounded-lg text-sm font-medium ${getFitnessColor(fitnessScore)}`}>
                      Fitness: {fitnessScore}/1000 ({getFitnessLabel(fitnessScore)})
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <TimetableGrid 
              timetables={generatedTimetable.map(entry => ({
                id: entry.id,
                subject: entry.subject.name,
                room: entry.room.number,
                startTime: entry.timeSlot.startTime,
                endTime: entry.timeSlot.endTime,
                dayOfWeek: entry.timeSlot.day,
                department: entry.department,
                year: entry.year,
                division: entry.division
              }))} 
              title={`Generated Timetable - ${formData.department} ${formData.year} Div ${formData.division}`}
              showStudentInfo={true}
            />

            <div className="flex space-x-2">
              <Button onClick={() => setCurrentStep('subjects')} variant="outline" className="flex-1">
                <X className="mr-2" size={16} />
                Regenerate
              </Button>
              <Button onClick={handleAcceptTimetable} disabled={isLoading} className="flex-1">
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 animate-spin" size={16} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2" size={16} />
                    Accept & Save Timetable
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}