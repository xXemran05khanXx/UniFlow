/**
 * Room Management Page
 * Comprehensive admin interface for managing rooms in Mumbai University engineering college
 */

import React, { useState, useEffect, useCallback } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import roomManagementService, { 
  Room, 
  RoomFilters, 
  RoomStats, 
  PaginatedRooms 
} from '../../services/roomManagementService';
import { BarChart2, BookPlus, Building2, Users, Building, Plus, Download, SquareChartGantt } from 'lucide-react';

// Constants
const BUILDINGS = [
  'Main Building',
  'Computer Science Block',
  'Engineering Block A',
  'Engineering Block B',
  'Laboratory Complex',
  'Library Building',
  'Administration Block'
];

// Backend enum: classroom, laboratory, lecture_hall, seminar_room, auditorium, library, office, other
// We keep label for display while value matches schema exactly
const ROOM_TYPES = [
  { value: 'classroom', label: 'Classroom' },
  { value: 'laboratory', label: 'Laboratory' },
  { value: 'lecture_hall', label: 'Lecture Hall' },
  { value: 'seminar_room', label: 'Seminar Room' },
  { value: 'auditorium', label: 'Auditorium' },
  { value: 'library', label: 'Library' },
  { value: 'office', label: 'Office' },
  { value: 'other', label: 'Other' }
];

const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Data Science',
  'Artificial Intelligence & Machine Learning',
  'Mechanical Engineering',
  'Civil Engineering'
];

const FEATURES = [
  'Air Conditioning',
  'Projector',
  'Smart Board',
  'WiFi',
  'Audio System',
  'Whiteboard',
  'Blackboard',
  'Computer Lab',
  'Power Outlets',
];

const EQUIPMENT_CONDITIONS = [
  'excellent',
  'good', 
  'needs_repair'
];

const RoomManagementPage: React.FC = () => {
  // State management
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stats, setStats] = useState<RoomStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'rooms' | 'add' | 'import' | 'utilization'>('overview');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter state
  const [filters, setFilters] = useState<RoomFilters>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Selection state
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Form state
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [showRoomDetails, setShowRoomDetails] = useState<Room | null>(null);

  // Room form state
  const [roomForm, setRoomForm] = useState<Partial<Room>>({
    roomNumber: '',
    name: '',
    building: '',
    floor: 1,
    capacity: 30,
    type: 'classroom',
    department: '',
    features: [],
    equipment: [],
    accessibility: {
      wheelchairAccessible: false,
      elevatorAccess: false,
      disabledParking: false,
      accessibleRestroom: false
    },
    airConditioning: false,
    projector: false,
    smartBoard: false,
    wifi: false,
    powerOutlets: 0,
    isActive: true,
    isAvailable: true,
    notes: ''
  });

  // Equipment form state
  const [newEquipment, setNewEquipment] = useState({
    name: '',
    quantity: 1,
    condition: 'good' as const
  });

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  /**
   * Load rooms with current filters and pagination
   */
  const loadRooms = useCallback(async () => {
    try {
      setLoading(true);
      const data: PaginatedRooms = await roomManagementService.getAllRooms(
        { ...filters, search: searchTerm },
        currentPage,
        pageSize,
        'roomNumber',
        'asc'
      );
      
      setRooms(data.rooms);
      setTotalPages(data.totalPages);
      setError(null);
    } catch (err) {
      console.error('Error loading rooms:', err);
      setError('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, [filters, searchTerm, currentPage, pageSize]);

  /**
   * Load room statistics
   */
  const loadStats = useCallback(async () => {
    try {
      const statsData = await roomManagementService.getRoomStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }, []);

  // Load data on component mount and when dependencies change
  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

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
  const handleFilterChange = (key: keyof RoomFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }));
    setCurrentPage(1);
  };

  /**
   * Handle room selection
   */
  const handleSelectRoom = (roomId: string) => {
    setSelectedRooms(prev => {
      const newSelection = prev.includes(roomId)
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId];
      
      setSelectAll(newSelection.length === rooms.length);
      return newSelection;
    });
  };

  /**
   * Handle select all rooms
   */
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRooms([]);
      setSelectAll(false);
    } else {
      const allIds = rooms.map(room => room._id!);
      setSelectedRooms(allIds);
      setSelectAll(true);
    }
  };

  /**
   * Handle feature toggle
   */
  const handleFeatureToggle = (feature: string) => {
    setRoomForm(prev => {
      const currentFeatures = prev.features || [];
      const newFeatures = currentFeatures.includes(feature)
        ? currentFeatures.filter(f => f !== feature)
        : [...currentFeatures, feature];
      
      return { ...prev, features: newFeatures };
    });
  };

  /**
   * Handle equipment addition
   */
  const handleAddEquipment = () => {
    if (!newEquipment.name.trim()) return;
    
    setRoomForm(prev => ({
      ...prev,
      equipment: [
        ...(prev.equipment || []),
        { ...newEquipment }
      ]
    }));
    
    setNewEquipment({
      name: '',
      quantity: 1,
      condition: 'good'
    });
  };

  /**
   * Handle equipment removal
   */
  const handleRemoveEquipment = (index: number) => {
    setRoomForm(prev => ({
      ...prev,
      equipment: (prev.equipment || []).filter((_, i) => i !== index)
    }));
  };

  /**
   * Handle room form submission
   */
  const handleSubmitRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      if (editingRoom) {
        await roomManagementService.updateRoom(editingRoom._id!, roomForm);
        setSuccess('Room updated successfully');
      } else {
        await roomManagementService.createRoom(roomForm as Omit<Room, '_id' | 'createdAt' | 'updatedAt'>);
        setSuccess('Room created successfully');
      }
      
      setEditingRoom(null);
      setRoomForm({
        roomNumber: '',
        name: '',
        building: '',
        floor: 1,
        capacity: 30,
        type: 'classroom',
        department: '',
        features: [],
        equipment: [],
        accessibility: {
          wheelchairAccessible: false,
          elevatorAccess: false,
          disabledParking: false,
          accessibleRestroom: false
        },
        airConditioning: false,
        projector: false,
        smartBoard: false,
        wifi: false,
        powerOutlets: 0,
        isActive: true,
        isAvailable: true,
        notes: ''
      });
      
      await loadRooms();
      await loadStats();
      setActiveTab('rooms');
    } catch (err) {
      console.error('Error saving room:', err);
      let errorMessage = 'Failed to save room';
      if (typeof err === 'object' && err !== null) {
        if ('response' in err && typeof (err as any).response === 'object' && (err as any).response !== null) {
          errorMessage = (err as any).response?.data?.message || (err as any).message || errorMessage;
        } else if ('message' in err) {
          errorMessage = (err as any).message || errorMessage;
        }
      }
      setError(`Failed to save room: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle room deletion
   */
  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm('Are you sure you want to delete this room?')) return;
    
    try {
      await roomManagementService.deleteRoom(roomId);
      await loadRooms();
      await loadStats();
    } catch (err) {
      setError('Failed to delete room');
    }
  };

  /**
   * Handle room status toggle
   */
  const handleToggleStatus = async (roomId: string, currentStatus: boolean) => {
    try {
      await roomManagementService.toggleRoomStatus(roomId, !currentStatus);
      await loadRooms();
      await loadStats();
    } catch (err) {
      setError('Failed to update room status');
    }
  };

  /**
   * Handle room availability toggle
   */
  const handleToggleAvailability = async (roomId: string, currentAvailability: boolean) => {
    try {
      await roomManagementService.toggleRoomAvailability(roomId, !currentAvailability);
      await loadRooms();
      await loadStats();
    } catch (err) {
      setError('Failed to update room availability');
    }
  };

  /**
   * Handle bulk operations
   */
  const handleBulkOperation = async (action: 'activate' | 'deactivate' | 'delete' | 'makeAvailable' | 'makeUnavailable') => {
    if (selectedRooms.length === 0) return;
    
    const confirmMessage = action === 'delete' 
      ? `Are you sure you want to delete ${selectedRooms.length} rooms?`
      : `Are you sure you want to ${action.replace(/([A-Z])/g, ' $1').toLowerCase()} ${selectedRooms.length} rooms?`;
    
    if (!window.confirm(confirmMessage)) return;
    
    try {
      await roomManagementService.bulkUpdateRooms({
        roomIds: selectedRooms,
        action,
        data: action !== 'delete' ? {
          isActive: action === 'activate',
          isAvailable: action === 'makeAvailable'
        } : undefined
      });
      
      setSelectedRooms([]);
      setSelectAll(false);
      await loadRooms();
      await loadStats();
    } catch (err) {
      setError(`Failed to ${action} rooms`);
    }
  };

  /**
   * Handle CSV import
   */
  const handleImport = async () => {
    if (!importFile) return;
    
    try {
      setImporting(true);
      const result = await roomManagementService.importRooms(importFile);
      
      alert(`Import completed! Imported: ${result.imported}, Failed: ${result.failed}`);
      if (result.errors.length > 0) {
        console.error('Import errors:', result.errors);
      }
      
      setImportFile(null);
      setActiveTab('rooms');
      await loadRooms();
      await loadStats();
    } catch (err) {
      setError('Failed to import rooms');
    } finally {
      setImporting(false);
    }
  };

  /**
   * Handle export
   */
  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const blob = await roomManagementService.exportRooms(format, filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rooms.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export rooms');
    }
  };

  /**
   * Download import template
   */
  const handleDownloadTemplate = async () => {
    try {
      const blob = await roomManagementService.getRoomTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'room_template.csv';
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
            <p className="text-sm font-medium text-gray-600">Total Rooms</p>
            <p className="text-3xl font-bold text-blue-600">{stats?.totalRooms || 0}</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-full">
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </Card>
      
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Available Rooms</p>
            <p className="text-3xl font-bold text-green-600">{stats?.availableRooms || 0}</p>
          </div>
          <div className="p-3 bg-green-100 rounded-full">
            <BookPlus className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </Card>
      
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Capacity</p>
            <p className="text-3xl font-bold text-purple-600">{stats?.totalCapacity || 0}</p>
          </div>
          <div className="p-3 bg-purple-100 rounded-full">
            <Users className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </Card>
      
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Average Capacity</p>
            <p className="text-3xl font-bold text-orange-600">
              {stats?.averageCapacity ? Math.round(stats.averageCapacity) : 0}
            </p>
          </div>
          <div className="p-3 bg-orange-100 rounded-full">
            <BarChart2 className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </Card>
    </div>
  );

  /**
   * Render rooms table
   */
  const renderRoomsTable = () => (
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
                aria-label="Select all rooms"
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Room Number
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Building
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Floor
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Capacity
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Availability
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rooms.map((room) => (
            <tr key={room._id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={selectedRooms.includes(room._id!)}
                  onChange={() => handleSelectRoom(room._id!)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  aria-label={`Select room ${room.roomNumber}`}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {room.roomNumber}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {room.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {room.building}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                Floor {room.floor}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  room.type === 'classroom' 
                    ? 'bg-blue-100 text-blue-800'
                    : room.type === 'laboratory'
                    ? 'bg-green-100 text-green-800'
                    : room.type === 'lecture_hall'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {room.type.replace('_', ' ')}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {room.capacity}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  room.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {room.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  room.isAvailable 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {room.isAvailable ? 'Available' : 'Unavailable'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowRoomDetails(room)}
                  className="text-blue-600 hover:text-blue-900"
                >
                  👁️
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditingRoom(room);
                    setRoomForm(room);
                    setActiveTab('add');
                  }}
                  className="text-green-600 hover:text-green-900"
                >
                  ✏️
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleToggleStatus(room._id!, room.isActive)}
                  className={room.isActive ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'}
                >
                  {room.isActive ? '❌' : '✅'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleToggleAvailability(room._id!, room.isAvailable)}
                  className={room.isAvailable ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}
                >
                  {room.isAvailable ? '🚫' : '🔓'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDeleteRoom(room._id!)}
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

  if (loading && rooms.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-900">Room Management</h1>
          <p className="text-gray-600 mt-1">
            Manage rooms and facilities for Mumbai University Engineering College
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
            Add Room
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
            { id: 'overview', name: 'Overview', icon: <SquareChartGantt className="h-4 w-4 text-gray-600" /> },
            { id: 'rooms', name: 'Rooms', icon: <Building className="h-4 w-4 text-gray-600" /> },
            { id: 'add', name: 'Add Room', icon: <Plus className="h-4 w-4 text-gray-600" /> },
            { id: 'import', name: 'Import', icon: <Download className="h-4 w-4 text-gray-600" /> },
            { id: 'utilization', name: 'Utilization', icon: <BarChart2 className="h-4 w-4 text-gray-600" /> }
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
          
          {/* Building Distribution */}
          {stats?.buildingDistribution && (
            <Card className="p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Room Distribution by Building</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats.buildingDistribution).map(([building, count]) => (
                  <div key={building} className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{count}</div>
                    <div className="text-sm text-gray-600">{building}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          
          {/* Room Type Distribution */}
          {stats?.typeDistribution && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Room Distribution by Type</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats.typeDistribution).map(([type, count]) => (
                  <div key={type} className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{count}</div>
                    <div className="text-sm text-gray-600 capitalize">{type.replace('_', ' ')}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'rooms' && (
        <div>
          {/* Filters and Search */}
          <Card className="p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <Input
                placeholder="Search rooms..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
              />
              
              <select
                value={filters.building || ''}
                onChange={(e) => handleFilterChange('building', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                aria-label="Filter by building"
              >
                <option value="">All Buildings</option>
                {BUILDINGS.map(building => (
                  <option key={building} value={building}>{building}</option>
                ))}
              </select>
              
              <select
                value={filters.type || ''}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                aria-label="Filter by room type"
              >
                <option value="">All Types</option>
                {ROOM_TYPES.map(rt => (
                  <option key={rt.value} value={rt.value}>
                    {rt.label}
                  </option>
                ))}
              </select>
              
              <select
                value={filters.department || ''}
                onChange={(e) => handleFilterChange('department', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                aria-label="Filter by department"
              >
                <option value="">All Departments</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            
            {/* Bulk Actions */}
            {selectedRooms.length > 0 && (
              <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-900">
                  {selectedRooms.length} room(s) selected
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
                    onClick={() => handleBulkOperation('makeAvailable')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Make Available
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleBulkOperation('makeUnavailable')}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    Make Unavailable
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

          {/* Rooms Table */}
          <Card className="p-6">
            {renderRoomsTable()}
            
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
            {editingRoom ? 'Edit Room' : 'Add New Room'}
          </h3>
          
          <form onSubmit={handleSubmitRoom} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Number *
                </label>
                <Input
                  required
                  value={roomForm.roomNumber || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoomForm(prev => ({ ...prev, roomNumber: e.target.value }))}
                  placeholder="e.g., A101, Lab-CS-01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Name *
                </label>
                <Input
                  required
                  value={roomForm.name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoomForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Computer Science Lab 1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Building *
                </label>
                <select
                  required
                  value={roomForm.building || ''}
                  onChange={(e) => setRoomForm(prev => ({ ...prev, building: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  aria-label="Select building"
                >
                  <option value="">Select Building</option>
                  {BUILDINGS.map(building => (
                    <option key={building} value={building}>{building}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Floor *
                </label>
                <Input
                  type="number"
                  required
                  min="0"
                  max="20"
                  value={roomForm.floor || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoomForm(prev => ({ ...prev, floor: Number(e.target.value) }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Type *
                </label>
                <select
                  required
                  value={roomForm.type || ''}
                  onChange={(e) => setRoomForm(prev => ({ ...prev, type: e.target.value as any }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  aria-label="Select room type"
                >
                  <option value="">Select Type</option>
                  {ROOM_TYPES.map(rt => (
                    <option key={rt.value} value={rt.value}>
                      {rt.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Capacity *
                </label>
                <Input
                  type="number"
                  required
                  min="1"
                  max="1000"
                  value={roomForm.capacity || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoomForm(prev => ({ ...prev, capacity: Number(e.target.value) }))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <select
                  value={roomForm.department || ''}
                  onChange={(e) => setRoomForm(prev => ({ ...prev, department: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  aria-label="Select department"
                >
                  <option value="">No specific department</option>
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Power Outlets
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={roomForm.powerOutlets || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoomForm(prev => ({ ...prev, powerOutlets: Number(e.target.value) }))}
                />
              </div>
            </div>

            {/* Features */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room Features
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {FEATURES.map(feature => (
                  <label key={feature} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={(roomForm.features || []).includes(feature)}
                      onChange={() => handleFeatureToggle(feature)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Equipment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Equipment
              </label>
              <div className="space-y-4">
                {/* Add Equipment Form */}
                <div className="flex space-x-2">
                  <Input
                    placeholder="Equipment name"
                    value={newEquipment.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEquipment(prev => ({ ...prev, name: e.target.value }))}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={newEquipment.quantity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEquipment(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                    className="w-20"
                  />
                  <select
                    value={newEquipment.condition}
                    onChange={(e) => setNewEquipment(prev => ({ ...prev, condition: e.target.value as any }))}
                    className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    aria-label="Select equipment condition"
                  >
                    {EQUIPMENT_CONDITIONS.map(condition => (
                      <option key={condition} value={condition}>
                        {condition.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    onClick={handleAddEquipment}
                    size="sm"
                  >
                    Add
                  </Button>
                </div>
                
                {/* Equipment List */}
                <div className="space-y-2">
                  {(roomForm.equipment || []).map((equipment, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">
                        {equipment.name} (Qty: {equipment.quantity}, Condition: {equipment.condition.replace('_', ' ')})
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRemoveEquipment(index)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Accessibility Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Accessibility Features
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={roomForm.accessibility?.wheelchairAccessible || false}
                    onChange={(e) => setRoomForm(prev => ({
                      ...prev,
                      accessibility: {
                        ...prev.accessibility!,
                        wheelchairAccessible: e.target.checked
                      }
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Wheelchair Accessible</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={roomForm.accessibility?.elevatorAccess || false}
                    onChange={(e) => setRoomForm(prev => ({
                      ...prev,
                      accessibility: {
                        ...prev.accessibility!,
                        elevatorAccess: e.target.checked
                      }
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Elevator Access</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={roomForm.accessibility?.disabledParking || false}
                    onChange={(e) => setRoomForm(prev => ({
                      ...prev,
                      accessibility: {
                        ...prev.accessibility!,
                        disabledParking: e.target.checked
                      }
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Disabled Parking</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={roomForm.accessibility?.accessibleRestroom || false}
                    onChange={(e) => setRoomForm(prev => ({
                      ...prev,
                      accessibility: {
                        ...prev.accessibility!,
                        accessibleRestroom: e.target.checked
                      }
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Accessible Restroom</span>
                </label>
              </div>
            </div>

            {/* Technology Features */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Technology Features
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={roomForm.airConditioning || false}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, airConditioning: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Air Conditioning</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={roomForm.projector || false}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, projector: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Projector</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={roomForm.smartBoard || false}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, smartBoard: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Smart Board</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={roomForm.wifi || false}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, wifi: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">WiFi</span>
                </label>
              </div>
            </div>

            {/* Status */}
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={roomForm.isActive || false}
                  onChange={(e) => setRoomForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={roomForm.isAvailable || false}
                  onChange={(e) => setRoomForm(prev => ({ ...prev, isAvailable: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Available</span>
              </label>
            </div>
            
            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={roomForm.notes || ''}
                onChange={(e) => setRoomForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes about the room..."
              />
            </div>
            
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingRoom(null);
                  setActiveTab('rooms');
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : editingRoom ? 'Update Room' : 'Create Room'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {activeTab === 'import' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">Import Rooms</h3>
          
          <div className="space-y-6">
            <div>
              <Button
                onClick={handleDownloadTemplate}
                variant="secondary"
                className="mb-4"
              >
                📥 Download CSV Template
              </Button>
              <p className="text-sm text-gray-600">
                Download the template file to see the required format for importing rooms.
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
                aria-label="Select CSV file for room import"
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
              {importing ? 'Importing...' : 'Import Rooms'}
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'utilization' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-6">Room Utilization Report</h3>
          <p className="text-gray-600">
            Room utilization reporting will be available once the timetable system is integrated.
          </p>
        </Card>
      )}

      {/* Room Details Modal */}
      {showRoomDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Room Details - {showRoomDetails.roomNumber}</h3>
              <Button
                onClick={() => setShowRoomDetails(null)}
                variant="secondary"
                size="sm"
              >
                ✕
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Basic Information</h4>
                <div className="space-y-2">
                  <div><strong>Room Number:</strong> {showRoomDetails.roomNumber}</div>
                  <div><strong>Name:</strong> {showRoomDetails.name}</div>
                  <div><strong>Building:</strong> {showRoomDetails.building}</div>
                  <div><strong>Floor:</strong> {showRoomDetails.floor}</div>
                  <div><strong>Type:</strong> {showRoomDetails.type.replace('_', ' ')}</div>
                  <div><strong>Capacity:</strong> {showRoomDetails.capacity}</div>
                  {showRoomDetails.department && (
                    <div><strong>Department:</strong> {showRoomDetails.department}</div>
                  )}
                </div>
              </div>
              
              {/* Features & Technology */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Features & Technology</h4>
                <div className="space-y-2">
                  <div><strong>Air Conditioning:</strong> {showRoomDetails.airConditioning ? 'Yes' : 'No'}</div>
                  <div><strong>Projector:</strong> {showRoomDetails.projector ? 'Yes' : 'No'}</div>
                  <div><strong>Smart Board:</strong> {showRoomDetails.smartBoard ? 'Yes' : 'No'}</div>
                  <div><strong>WiFi:</strong> {showRoomDetails.wifi ? 'Yes' : 'No'}</div>
                  <div><strong>Power Outlets:</strong> {showRoomDetails.powerOutlets}</div>
                </div>
                
                {showRoomDetails.features && showRoomDetails.features.length > 0 && (
                  <div>
                    <strong>Additional Features:</strong>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {showRoomDetails.features.map((feature, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Equipment */}
              {showRoomDetails.equipment && showRoomDetails.equipment.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Equipment</h4>
                  <div className="space-y-2">
                    {showRoomDetails.equipment.map((equipment, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span>{equipment.name}</span>
                        <span className="text-sm text-gray-600">
                          Qty: {equipment.quantity}, Condition: {equipment.condition.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Accessibility */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Accessibility</h4>
                <div className="space-y-2">
                  <div><strong>Wheelchair Accessible:</strong> {showRoomDetails.accessibility?.wheelchairAccessible ? 'Yes' : 'No'}</div>
                  <div><strong>Elevator Access:</strong> {showRoomDetails.accessibility?.elevatorAccess ? 'Yes' : 'No'}</div>
                  <div><strong>Disabled Parking:</strong> {showRoomDetails.accessibility?.disabledParking ? 'Yes' : 'No'}</div>
                  <div><strong>Accessible Restroom:</strong> {showRoomDetails.accessibility?.accessibleRestroom ? 'Yes' : 'No'}</div>
                </div>
              </div>
              
              {/* Status & Notes */}
              <div className="space-y-4 md:col-span-2">
                <h4 className="font-semibold text-gray-900">Status & Notes</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Status:</strong>
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      showRoomDetails.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {showRoomDetails.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <strong>Availability:</strong>
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      showRoomDetails.isAvailable 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {showRoomDetails.isAvailable ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                </div>
                
                {showRoomDetails.notes && (
                  <div>
                    <strong>Notes:</strong>
                    <p className="mt-1 text-gray-600">{showRoomDetails.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomManagementPage;
