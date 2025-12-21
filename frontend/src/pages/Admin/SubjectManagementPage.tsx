/**
 * Subject Management Page
 * Comprehensive admin interface for managing subjects in Mumbai University engineering college
 */

import React, { useState, useEffect, useCallback } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Plus, Download, BookA, CheckLine, Target, Users, BarChart2, Book } from 'lucide-react';
import subjectManagementService, { 
  Subject, 
  SubjectFilters, 
  SubjectStats, 
  PaginatedSubjects 
} from '../../services/subjectManagementService';
import { 
  DEPARTMENT_LIST, 
  SEMESTERS, 
  COURSE_TYPE_LIST,
  DepartmentType,
  SemesterType,
  CourseType,
  getDepartmentCode
} from '../../constants';

const YEARS = [1, 2, 3, 4];

const SubjectManagementPage: React.FC = () => {
  // State management
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [stats, setStats] = useState<SubjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'subjects' | 'add' | 'import'>('overview');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter state
  const [filters, setFilters] = useState<SubjectFilters>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Selection state
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Form state
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [showSubjectDetails, setShowSubjectDetails] = useState<Subject | null>(null);

  // Subject form state
  const [subjectForm, setSubjectForm] = useState<Partial<Subject>>({
    code: '',
    name: '',
    credits: 3,
    semester: 1 as SemesterType,
    department: undefined,
    year: 1,
    type: undefined,
    description: '',
    prerequisites: [],
    isActive: true
  });

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  /**
   * Load subjects with current filters and pagination
   */
  const loadSubjects = useCallback(async () => {
    try {
      setLoading(true);
      const data: PaginatedSubjects = await subjectManagementService.getAllSubjects(
        { ...filters, search: searchTerm },
        currentPage,
        pageSize,
        'name',
        'asc'
      );
      
      setSubjects(data.subjects);
      setTotalPages(data.totalPages);
      setError(null);
    } catch (err) {
      console.error('Error loading subjects:', err);
      setError('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }, [filters, searchTerm, currentPage, pageSize]);

  /**
   * Load subject statistics
   */
  const loadStats = useCallback(async () => {
    try {
      const statsData = await subjectManagementService.getSubjectStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }, []);

  // Load data on component mount and when dependencies change
  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  /**
   * Handle search input change
   */
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  /**
   * Handle filter change
   */
  const handleFilterChange = (key: keyof SubjectFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }));
    setCurrentPage(1);
  };

  /**
   * Handle subject selection
   */
  const handleSelectSubject = (subjectId: string) => {
    setSelectedSubjects(prev => {
      const newSelection = prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId];
      
      setSelectAll(newSelection.length === (subjects?.length || 0));
      return newSelection;
    });
  };

  /**
   * Handle select all subjects
   */
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedSubjects([]);
      setSelectAll(false);
    } else {
      const allIds = (subjects || []).map(subject => subject._id!);
      setSelectedSubjects(allIds);
      setSelectAll(true);
    }
  };

  /**
   * Handle subject form submission
   */
  const handleSubmitSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const subjectData = {
        ...subjectForm,
        department: subjectForm.department ? getDepartmentCode(subjectForm.department as string) as DepartmentType : undefined
      };
      
      if (editingSubject) {
        await subjectManagementService.updateSubject(editingSubject._id!, subjectData as Partial<Subject>);
        setSuccess('Subject updated successfully');
      } else {
        await subjectManagementService.createSubject(subjectData as Omit<Subject, '_id' | 'createdAt' | 'updatedAt'>);
        setSuccess('Subject created successfully');
      }
      
      setEditingSubject(null);
      setSubjectForm({
        code: '',
        name: '',
        credits: 3,
        semester: 1 as SemesterType,
        department: undefined,
        year: 1,
        type: undefined,
        description: '',
        prerequisites: [],
        isActive: true
      });
      
      await loadSubjects();
      await loadStats();
      // Navigate back to subjects list after successful save
      setActiveTab('subjects');
    } catch (err) {
      setError('Failed to save subject');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle subject deletion
   */
  const handleDeleteSubject = async (subjectId: string) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    
    try {
      await subjectManagementService.deleteSubject(subjectId);
      await loadSubjects();
      await loadStats();
    } catch (err) {
      setError('Failed to delete subject');
    }
  };

  /**
   * Handle subject status toggle
   */
  const handleToggleStatus = async (subjectId: string, currentStatus: boolean) => {
    try {
      await subjectManagementService.toggleSubjectStatus(subjectId, !currentStatus);
      await loadSubjects();
      await loadStats();
    } catch (err) {
      setError('Failed to update subject status');
    }
  };

  /**
   * Handle bulk operations
   */
  const handleBulkOperation = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedSubjects.length === 0) return;
    
    const confirmMessage = action === 'delete' 
      ? `Are you sure you want to delete ${selectedSubjects.length} subjects?`
      : `Are you sure you want to ${action} ${selectedSubjects.length} subjects?`;
    
    if (!window.confirm(confirmMessage)) return;
    
    try {
      await subjectManagementService.bulkUpdateSubjects({
        subjectIds: selectedSubjects,
        action,
        data: action !== 'delete' ? { isActive: action === 'activate' } : undefined
      });
      
      setSelectedSubjects([]);
      setSelectAll(false);
      await loadSubjects();
      await loadStats();
    } catch (err) {
      setError(`Failed to ${action} subjects`);
    }
  };

  /**
   * Handle CSV import
   */
  const handleImport = async () => {
    if (!importFile) return;
    
    try {
      setImporting(true);
      const result = await subjectManagementService.importSubjects(importFile);
      
      alert(`Import completed! Imported: ${result.imported}, Failed: ${result.failed}`);
      if (result.errors.length > 0) {
        console.error('Import errors:', result.errors);
      }
      
      setImportFile(null);
      setActiveTab('subjects');
      await loadSubjects();
      await loadStats();
    } catch (err) {
      setError('Failed to import subjects');
    } finally {
      setImporting(false);
    }
  };

  /**
   * Handle export
   */
  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const blob = await subjectManagementService.exportSubjects(format, filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subjects.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export subjects');
    }
  };

  /**
   * Download import template
   */
  const handleDownloadTemplate = async () => {
    try {
      const blob = await subjectManagementService.getSubjectTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'subject_template.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download template');
    }
  };

  /**
   * Render statistics cards
   */
  const renderStatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Subjects</p>
            <p className="text-3xl font-bold text-blue-600">{stats?.totalSubjects || 0}</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-full">
            <BookA className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </Card>
      
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Active Subjects</p>
            <p className="text-3xl font-bold text-green-600">{stats?.activeSubjects || 0}</p>
          </div>
          <div className="p-3 bg-green-100 rounded-full">
            <CheckLine className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </Card>
      
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Average Credits</p>
            <p className="text-3xl font-bold text-purple-600">
              {stats?.averageCredits ? stats.averageCredits.toFixed(1) : '0.0'}
            </p>
          </div>
          <div className="p-3 bg-purple-100 rounded-full">
            <Target className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </Card>
      
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Departments</p>
            <p className="text-3xl font-bold text-orange-600">
              {stats?.departmentDistribution ? Object.keys(stats.departmentDistribution).length : 0}
            </p>
          </div>
          <div className="p-3 bg-orange-100 rounded-full">
            <Users className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </Card>
    </div>
  );

  /**
   * Render subjects table
   */
  const renderSubjectsTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                aria-label="Select all subjects"
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Code
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Department
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Semester
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Credits
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {(subjects || []).map((subject) => (
            <tr key={subject._id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={selectedSubjects.includes(subject._id!)}
                  onChange={() => handleSelectSubject(subject._id!)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  aria-label={`Select subject ${subject.name}`}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {subject.code}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {subject.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {typeof subject.department === 'object' ? (subject.department as any)?.name || (subject.department as any)?.code : subject.department}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                Sem {subject.semester}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {subject.credits}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  subject.type === 'Theory' 
                    ? 'bg-blue-100 text-blue-800'
                    : subject.type === 'Practical'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {subject.type}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  subject.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {subject.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowSubjectDetails(subject)}
                  className="text-blue-600 hover:text-blue-900"
                >
                  👁️
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditingSubject(subject);
                    setSubjectForm(subject);
                    setActiveTab('add');
                  }}
                  className="text-green-600 hover:text-green-900"
                >
                  ✏️
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleToggleStatus(subject._id!, subject.isActive)}
                  className={subject.isActive ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'}
                >
                  {subject.isActive ? '❌' : '✅'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDeleteSubject(subject._id!)}
                  className="text-red-600 hover:text-red-900"
                >
                  🗑️
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (loading && (subjects?.length || 0) === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subject Management</h1>
          <p className="text-gray-600 mt-1">
            Manage subjects for Mumbai University Engineering College
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => handleExport('csv')}
            variant="secondary"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={() => handleExport('json')}
            variant="secondary"
          >
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button
            onClick={() => setActiveTab('add')}
            variant="primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Subject
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <div className="mt-2 text-sm text-green-700">{success}</div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: <BarChart2 className="h-4 w-4 text-gray-600" /> },
            { id: 'subjects', name: 'Subjects', icon: <Book className="h-4 w-4 text-gray-600" /> },
            { id: 'add', name: 'Add Subject', icon: <Plus className="h-4 w-4 text-gray-600" /> },
            { id: 'import', name: 'Import', icon: <Download className="h-4 w-4 text-gray-600" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 '
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div>
          {renderStatsCards()}
          
          {/* Department Distribution */}
          {stats?.departmentDistribution && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Subject Distribution by Department</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats.departmentDistribution).map(([dept, count]) => (
                  <div key={dept} className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{count}</div>
                    <div className="text-sm text-gray-600">{dept}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'subjects' && (
        <div>
          {/* Filters and Search */}
          <Card className="p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <Input
                placeholder="Search subjects..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
              />
              
              <select
                value={filters.department || ''}
                onChange={(e) => handleFilterChange('department', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                aria-label="Filter by department"
              >
                <option value="">All Departments</option>
                {DEPARTMENT_LIST.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              
              <select
                value={filters.semester || ''}
                onChange={(e) => handleFilterChange('semester', e.target.value ? Number(e.target.value) : undefined)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                aria-label="Filter by semester"
              >
                <option value="">All Semesters</option>
                {SEMESTERS.map(sem => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
              
              <select
                value={filters.type || ''}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                aria-label="Filter by subject type"
              >
                <option value="">All Types</option>
                {COURSE_TYPE_LIST.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            {/* Bulk Actions */}
            {selectedSubjects.length > 0 && (
              <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-900">
                  {selectedSubjects.length} subject(s) selected
                </span>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => handleBulkOperation('activate')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Activate
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleBulkOperation('deactivate')}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Deactivate
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleBulkOperation('delete')}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Subjects Table */}
          <Card className="p-6">
            {renderSubjectsTable()}
            
            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">
                  Show
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="block px-3 py-1 border border-gray-300 rounded-md text-sm"
                  aria-label="Select page size"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-700">
                  entries
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'add' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">
            {editingSubject ? 'Edit Subject' : 'Add New Subject'}
          </h3>
          
          <form onSubmit={handleSubmitSubject} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject Code *
                </label>
                <Input
                  required
                  value={subjectForm.code || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubjectForm(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="e.g., CS101"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject Name *
                </label>
                <Input
                  required
                  value={subjectForm.name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubjectForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Introduction to Computer Science"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department *
                </label>
                <select
                  required
                  value={subjectForm.department || ''}
                  onChange={(e) => setSubjectForm(prev => ({ ...prev, department: e.target.value as DepartmentType }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  aria-label="Select department"
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
                  required
                  value={subjectForm.semester || ''}
                  onChange={(e) => setSubjectForm(prev => ({ ...prev, semester: Number(e.target.value) as SemesterType }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  aria-label="Select semester"
                >
                  <option value="">Select Semester</option>
                  {SEMESTERS.map(sem => (
                    <option key={sem} value={sem}>Semester {sem}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year *
                </label>
                <select
                  required
                  value={subjectForm.year || ''}
                  onChange={(e) => setSubjectForm(prev => ({ ...prev, year: Number(e.target.value) }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  aria-label="Select year"
                >
                  <option value="">Select Year</option>
                  {YEARS.map(year => (
                    <option key={year} value={year}>Year {year}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Credits *
                </label>
                <Input
                  type="number"
                  required
                  min="1"
                  max="10"
                  value={subjectForm.credits || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubjectForm(prev => ({ ...prev, credits: Number(e.target.value) }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type *
                </label>
                <select
                  required
                  value={subjectForm.type || ''}
                  onChange={(e) => setSubjectForm(prev => ({ ...prev, type: e.target.value as CourseType }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  aria-label="Select subject type"
                >
                  <option value="">Select Type</option>
                  {COURSE_TYPE_LIST.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={subjectForm.isActive || false}
                    onChange={(e) => setSubjectForm(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={subjectForm.description || ''}
                onChange={(e) => setSubjectForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description of the subject..."
              />
            </div>
            
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingSubject(null);
                  setActiveTab('subjects');
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : editingSubject ? 'Update Subject' : 'Create Subject'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {activeTab === 'import' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">Import Subjects</h3>
          
          <div className="space-y-6">
            <div>
              <Button
                onClick={handleDownloadTemplate}
                variant="secondary"
                className="mb-4"
              >
                 Download CSV Template
              </Button>
              <p className="text-sm text-gray-600">
                Download the template file to see the required format for importing subjects.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                aria-label="Select CSV file for import"
              />
            </div>
            
            {importFile && (
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  Selected file: {importFile.name}
                </p>
              </div>
            )}
            
            <Button
              onClick={handleImport}
              disabled={!importFile || importing}
              className="w-full"
            >
              {importing ? 'Importing...' : 'Import Subjects'}
            </Button>
          </div>
        </Card>
      )}

      {/* Subject Details Modal */}
      {showSubjectDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Subject Details</h3>
              <Button
                onClick={() => setShowSubjectDetails(null)}
                variant="secondary"
                size="sm"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Code:</strong> {showSubjectDetails.code}
                </div>
                <div>
                  <strong>Name:</strong> {showSubjectDetails.name}
                </div>
                <div>
                  <strong>Department:</strong> {typeof showSubjectDetails.department === 'object' ? (showSubjectDetails.department as any)?.name || (showSubjectDetails.department as any)?.code : showSubjectDetails.department}
                </div>
                <div>
                  <strong>Semester:</strong> {showSubjectDetails.semester}
                </div>
                <div>
                  <strong>Year:</strong> {showSubjectDetails.year}
                </div>
                <div>
                  <strong>Credits:</strong> {showSubjectDetails.credits}
                </div>
                <div>
                  <strong>Type:</strong> {showSubjectDetails.type}
                </div>
                <div>
                  <strong>Status:</strong> 
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    showSubjectDetails.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {showSubjectDetails.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              
              {showSubjectDetails.description && (
                <div>
                  <strong>Description:</strong>
                  <p className="mt-1 text-gray-600">{showSubjectDetails.description}</p>
                </div>
              )}
              
              {showSubjectDetails.prerequisites && showSubjectDetails.prerequisites.length > 0 && (
                <div>
                  <strong>Prerequisites:</strong>
                  <ul className="mt-1 list-disc list-inside text-gray-600">
                    {showSubjectDetails.prerequisites.map((prereq, index) => (
                      <li key={index}>{prereq}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectManagementPage;
