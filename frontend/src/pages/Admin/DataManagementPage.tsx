import React, { useState, useEffect } from 'react';
import { Upload, Plus, Users, Building, BookOpen, Download, AlertCircle, CheckCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { dataManagementService, Room, Subject, Teacher } from '../../services/dataManagementService';
import { 
  DEPARTMENT_LIST, 
  SEMESTERS, 
  ROOM_TYPE_LIST, 
  COURSE_TYPE_LIST, 
  TEACHER_DESIGNATION_LIST,
  DepartmentType,
  SemesterType,
  CourseType,
  getDepartmentCode
} from '../../constants';

const DataManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'teachers' | 'rooms' | 'subjects'>('teachers');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Form data
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    email: '',
    employeeId: '',
    department: '' as DepartmentType | '',
    designation: '' as string,
    qualifications: '',
    staffRoom: '',
    maxHoursPerWeek: 18,
    minHoursPerWeek: 8
  });

  const [roomForm, setRoomForm] = useState<Room>({
    roomNumber: '',
    floor: 1,
    capacity: 40,
    type: '' as any,
    availabilityNotes: 'Available during college hours'
  });

  const [subjectForm, setSubjectForm] = useState({
    code: '',
    name: '',
    department: '' as DepartmentType | '',
    semester: 1 as SemesterType,
    type: '' as CourseType | '',
    year: 1,
    credits: 4,
    hoursPerWeek: 4,
    description: '',
    topics: '',
    syllabusLink: ''
  });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'teachers':
          const teachersData = await dataManagementService.getTeachers();
          setTeachers(teachersData);
          break;
        case 'rooms':
          const roomsData = await dataManagementService.getRooms();
          setRooms(roomsData);
          break;
        case 'subjects':
          const subjectsData = await dataManagementService.getSubjects();
          setSubjects(subjectsData);
          break;
      }
    } catch (error) {
      showMessage('error', `Failed to fetch ${activeTab}`);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await dataManagementService.addTeacher({
        ...teacherForm,
        department: getDepartmentCode(teacherForm.department),
        qualifications: teacherForm.qualifications.split(',').map(s => s.trim()).filter(s => s)
      });
      showMessage('success', 'Teacher added successfully');
      setTeacherForm({
        name: '',
        email: '',
        employeeId: '',
        department: 'Computer Science' as DepartmentType,
        designation: 'Assistant Professor',
        qualifications: '',
        staffRoom: '',
        maxHoursPerWeek: 18,
        minHoursPerWeek: 8
      });
      setShowAddForm(false);
      fetchData();
    } catch (error: any) {
      console.error('Add teacher error:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to add teacher';
      showMessage('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await dataManagementService.addRoom(roomForm);
      showMessage('success', 'Room added successfully');
      setRoomForm({
        roomNumber: '',
        floor: 1,
        capacity: 40,
        type: 'Theory Classroom',
        availabilityNotes: 'Available during college hours'
      });
      setShowAddForm(false);
      fetchData();
    } catch (error) {
      showMessage('error', 'Failed to add room');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await dataManagementService.addSubject({
        code: subjectForm.code,
        name: subjectForm.name,
        department: getDepartmentCode(subjectForm.department) as DepartmentType,
        semester: subjectForm.semester,
        year: Math.ceil(subjectForm.semester / 2),
        type: subjectForm.type as CourseType,
        credits: subjectForm.credits,
        hoursPerWeek: subjectForm.hoursPerWeek,
        description: subjectForm.description,
        isActive: true,
        syllabus: {
          topics: subjectForm.topics.split(',').map(t => t.trim()).filter(t => t),
          syllabusLink: subjectForm.syllabusLink
        }
      });
      showMessage('success', 'Subject added successfully');
      setSubjectForm({
        code: '',
        name: '',
        department: 'Computer Science' as DepartmentType,
        semester: 1 as SemesterType,
        type: 'Theory' as CourseType,
        year: 1,
        credits: 4,
        hoursPerWeek: 4,
        description: '',
        topics: '',
        syllabusLink: ''
      });
      setShowAddForm(false);
      fetchData();
    } catch (error: any) {
      console.error('Add subject error:', error);
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Failed to add subject';
      showMessage('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) return;

    setLoading(true);
    try {
      await dataManagementService.uploadFile(activeTab, uploadFile);
      showMessage('success', `${activeTab} uploaded successfully`);
      setUploadFile(null);
      fetchData();
    } catch (error) {
      showMessage('error', `Failed to upload ${activeTab}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await dataManagementService.downloadTemplate(activeTab);
    } catch (error) {
      showMessage('error', `Failed to download ${activeTab} template`);
    }
  };

  const renderAddForm = () => {
    if (!showAddForm) return null;

    return (
      <Card className="mb-6">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Add New {activeTab.slice(0, -1).charAt(0).toUpperCase() + activeTab.slice(1, -1)}
          </h3>
          
          {activeTab === 'teachers' && (
            <form onSubmit={handleAddTeacher} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Name"
                  value={teacherForm.name}
                  onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={teacherForm.email}
                  onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                  required
                />
                <Input
                  label="Employee ID"
                  value={teacherForm.employeeId}
                  onChange={(e) => setTeacherForm({ ...teacherForm, employeeId: e.target.value })}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={teacherForm.department}
                    onChange={(e) => setTeacherForm({ ...teacherForm, department: e.target.value as DepartmentType })}
                    aria-label="Teacher Department"
                  >
                    <option value="">Select Department</option>
                    {DEPARTMENT_LIST.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={teacherForm.designation}
                    onChange={(e) => setTeacherForm({ ...teacherForm, designation: e.target.value })}
                    aria-label="Teacher Designation"
                  >
                    <option value="">Select Designation</option>
                    {TEACHER_DESIGNATION_LIST.map((designation) => (
                      <option key={designation} value={designation}>{designation}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Qualifications (comma-separated)"
                  value={teacherForm.qualifications}
                  onChange={(e) => setTeacherForm({ ...teacherForm, qualifications: e.target.value })}
                  placeholder="M.E. Computer, Ph.D. in AI"
                />
                <Input
                  label="Staff Room"
                  value={teacherForm.staffRoom}
                  onChange={(e) => setTeacherForm({ ...teacherForm, staffRoom: e.target.value })}
                  placeholder="Room 101, Building A"
                />
                <Input
                  label="Max Hours per Week"
                  type="number"
                  value={teacherForm.maxHoursPerWeek}
                  onChange={(e) => setTeacherForm({ ...teacherForm, maxHoursPerWeek: parseInt(e.target.value) })}
                  min="8"
                  max="25"
                />
                <Input
                  label="Min Hours per Week"
                  type="number"
                  value={teacherForm.minHoursPerWeek}
                  onChange={(e) => setTeacherForm({ ...teacherForm, minHoursPerWeek: parseInt(e.target.value) })}
                  min="1"
                  max="18"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  Add Teacher
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'rooms' && (
            <form onSubmit={handleAddRoom} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Room Number"
                  value={roomForm.roomNumber}
                  onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                  required
                />
                <Input
                  label="Floor"
                  type="number"
                  value={roomForm.floor}
                  onChange={(e) => setRoomForm({ ...roomForm, floor: parseInt(e.target.value) })}
                  min="0"
                  max="10"
                  required
                />
                <Input
                  label="Capacity"
                  type="number"
                  value={roomForm.capacity}
                  onChange={(e) => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) })}
                  min="1"
                  max="200"
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Room Type</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={roomForm.type}
                    onChange={(e) => setRoomForm({ ...roomForm, type: e.target.value as Room['type'] })}
                    aria-label="Room Type"
                  >
                    <option value="">Select Room Type</option>
                    {ROOM_TYPE_LIST.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Input
                    label="Availability Notes"
                    value={roomForm.availabilityNotes || ''}
                    onChange={(e) => setRoomForm({ ...roomForm, availabilityNotes: e.target.value })}
                    placeholder="Available during college hours"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  Add Room
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'subjects' && (
            <form onSubmit={handleAddSubject} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Subject Code"
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                  placeholder="CS101"
                  required
                />
                <Input
                  label="Subject Name"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={subjectForm.department}
                    onChange={(e) => setSubjectForm({ ...subjectForm, department: e.target.value as DepartmentType })}
                    aria-label="Subject Department"
                  >
                    <option value="">Select Department</option>
                    {DEPARTMENT_LIST.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={subjectForm.semester}
                    onChange={(e) => setSubjectForm({ ...subjectForm, semester: parseInt(e.target.value) as SemesterType, year: Math.ceil(parseInt(e.target.value) / 2) })}
                    aria-label="Subject Semester"
                  >
                    <option value="">Select Semester</option>
                    {SEMESTERS.map((sem) => (
                      <option key={sem} value={sem}>Semester {sem}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject Type</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={subjectForm.type}
                    onChange={(e) => setSubjectForm({ ...subjectForm, type: e.target.value as CourseType })}
                    aria-label="Subject Type"
                  >
                    <option value="">Select Course Type</option>
                    {COURSE_TYPE_LIST.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Credits"
                  type="number"
                    value={subjectForm.credits}
                    onChange={(e) => setSubjectForm({ ...subjectForm, credits: parseInt(e.target.value) })}
                  min="1"
                  max="6"
                  required
                />
                <Input
                  label="Hours per Week"
                  type="number"
                    value={subjectForm.hoursPerWeek}
                    onChange={(e) => setSubjectForm({ ...subjectForm, hoursPerWeek: parseInt(e.target.value) })}
                  min="1"
                  max="10"
                  required
                />
                  <Input
                    label="Description"
                    value={subjectForm.description}
                    onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                    placeholder="Subject overview"
                  />
                <div className="md:col-span-2">
                  <Input
                    label="Topics (comma-separated)"
                    value={subjectForm.topics}
                    onChange={(e) => setSubjectForm({ ...subjectForm, topics: e.target.value })}
                    placeholder="Introduction, Basic Concepts, Advanced Topics"
                  />
                </div>
                <div className="md:col-span-2">
                  <Input
                    label="Syllabus Link (optional)"
                    type="url"
                    value={subjectForm.syllabusLink}
                    onChange={(e) => setSubjectForm({ ...subjectForm, syllabusLink: e.target.value })}
                    placeholder="https://university.edu/syllabus/cs101.pdf"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  Add Subject
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>
    );
  };

  const renderDataTable = () => {
    const data = activeTab === 'teachers' ? teachers : activeTab === 'rooms' ? rooms : subjects;

    if (data.length === 0) {
      return (
        <Card>
          <div className="p-8 text-center text-gray-500">
            No {activeTab} found. Add some data to get started.
          </div>
        </Card>
      );
    }

    return (
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {activeTab === 'teachers' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Workload</th>
                  </>
                )}
                {activeTab === 'rooms' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Floor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                  </>
                )}
                {activeTab === 'subjects' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item: any, index) => (
                <tr key={item._id || index}>
                  {activeTab === 'teachers' && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.employeeId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{typeof item.department === 'object' ? item.department?.name || item.department?.code : item.department}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.designation}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.workload?.minHoursPerWeek}-{item.workload?.maxHoursPerWeek} hrs/week
                      </td>
                    </>
                  )}
                  {activeTab === 'rooms' && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.roomNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.floor}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.capacity}</td>
                    </>
                  )}
                  {activeTab === 'subjects' && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.code || item.courseCode}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.name || item.courseName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.department?.name || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.semester}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.credits}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Data Management</h1>
      
      {/* Message Alert */}
      {message && (
        <div className={`mb-6 p-4 rounded-md flex items-center ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 mr-2" />
          ) : (
            <AlertCircle className="h-5 w-5 mr-2" />
          )}
          {message.text}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {(['teachers', 'rooms', 'subjects'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                {tab === 'teachers' && <Users className="h-5 w-5 mr-2" />}
                {tab === 'rooms' && <Building className="h-5 w-5 mr-2" />}
                {tab === 'subjects' && <BookOpen className="h-5 w-5 mr-2" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add {activeTab.slice(0, -1)}
        </Button>
        
        <div className="flex items-center space-x-2">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer">
            <Upload className="h-4 w-4 mr-2" />
            Choose CSV File
          </label>
          {uploadFile && (
            <Button onClick={handleFileUpload} disabled={loading}>
              Upload {uploadFile.name}
            </Button>
          )}
        </div>

        <Button variant="outline" onClick={handleDownloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </Button>
      </div>

      {/* Add Form */}
      {renderAddForm()}

      {/* Data Table */}
      {loading ? (
        <Card>
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading {activeTab}...</p>
          </div>
        </Card>
      ) : (
        renderDataTable()
      )}
    </div>
  );
};

export default DataManagementPage;
