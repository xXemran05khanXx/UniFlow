import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Download, 
  Upload, 
  Settings, 
  Shield, 
  Lock, 
  Unlock,
  UserCheck,
  UserX,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { userManagementService, User, UserForm, UserFilters, UserStats } from '../../services/userManagementService';
import { DEPARTMENT_LIST, getDepartmentCode } from '../../constants';

const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState<User | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Filters
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: '',
    isActive: undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    limit: 10
  });

  // Form state
  const [userForm, setUserForm] = useState<UserForm>({
    name: '',
    email: '',
    password: '',
    role: 'student',
    department: '',
    semester: undefined,
    isActive: true,
    employeeId: '',
    designation: '',
    profile: {
      firstName: '',
      lastName: '',
      phone: '',
      bio: '',
      location: '',
      website: ''
    }
  });

  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await userManagementService.getUsers({
        ...filters,
        page: currentPage
      });
      setUsers(response.users);
      setTotalPages(response.pages);
      setTotalUsers(response.total);
    } catch (error) {
      showMessage('error', 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage]);

  const fetchStats = React.useCallback(async () => {
    try {
      const statsData = await userManagementService.getUserStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch user stats');
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userData = {
        ...userForm,
        department: userForm.department ? getDepartmentCode(userForm.department) : undefined
      };
      await userManagementService.createUser(userData);
      showMessage('success', 'User created successfully');
      setUserForm({
        name: '',
        email: '',
        password: '',
        role: 'student',
        department: '',
        semester: undefined,
        isActive: true,
        employeeId: '',
        designation: '',
        profile: {
          firstName: '',
          lastName: '',
          phone: '',
          bio: '',
          location: '',
          website: ''
        }
      });
      setShowAddForm(false);
      fetchUsers();
      fetchStats();
    } catch (error) {
      showMessage('error', 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setLoading(true);
    try {
      const userData = {
        ...userForm,
        department: userForm.department ? getDepartmentCode(userForm.department) : undefined
      };
      await userManagementService.updateUser(editingUser._id!, userData);
      showMessage('success', 'User updated successfully');
      setEditingUser(null);
      setShowAddForm(false);
      fetchUsers();
    } catch (error) {
      showMessage('error', 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    setLoading(true);
    try {
      await userManagementService.deleteUser(userId);
      showMessage('success', 'User deleted successfully');
      fetchUsers();
      fetchStats();
    } catch (error) {
      showMessage('error', 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    setLoading(true);
    try {
      if (user.isActive) {
        await userManagementService.deactivateUser(user._id!);
        showMessage('success', 'User deactivated successfully');
      } else {
        await userManagementService.activateUser(user._id!);
        showMessage('success', 'User activated successfully');
      }
      fetchUsers();
      fetchStats();
    } catch (error) {
      showMessage('error', `Failed to ${user.isActive ? 'deactivate' : 'activate'} user`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockUser = async (userId: string) => {
    setLoading(true);
    try {
      await userManagementService.unlockUser(userId);
      showMessage('success', 'User unlocked successfully');
      fetchUsers();
    } catch (error) {
      showMessage('error', 'Failed to unlock user');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!window.confirm('Are you sure you want to reset this user\'s password?')) return;

    setLoading(true);
    try {
      const result = await userManagementService.resetUserPassword(userId);
      showMessage('success', `Password reset. Temporary password: ${result.tempPassword}`);
    } catch (error) {
      showMessage('error', 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedUsers.length === 0) return;

    const confirmMessage = action === 'delete' 
      ? 'Are you sure you want to delete the selected users?' 
      : `Are you sure you want to ${action} the selected users?`;
    
    if (!window.confirm(confirmMessage)) return;

    setLoading(true);
    try {
      if (action === 'delete') {
        await userManagementService.bulkDeleteUsers(selectedUsers);
      } else {
        await userManagementService.bulkUpdateUsers(selectedUsers, {
          isActive: action === 'activate'
        } as Partial<UserForm>);
      }
      showMessage('success', `Users ${action}d successfully`);
      setSelectedUsers([]);
      fetchUsers();
      fetchStats();
    } catch (error) {
      showMessage('error', `Failed to ${action} users`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) return;

    setLoading(true);
    try {
      const result = await userManagementService.importUsers(uploadFile);
      showMessage('success', `Imported ${result.success} users successfully`);
      if (result.errors.length > 0) {
        console.warn('Import errors:', result.errors);
      }
      setUploadFile(null);
      fetchUsers();
      fetchStats();
    } catch (error) {
      showMessage('error', 'Failed to import users');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      await userManagementService.exportUsers(filters, format);
      showMessage('success', `Users exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
      showMessage('error', 'Failed to export users');
    }
  };

  const editUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      role: user.role,
      department: typeof user.department === 'string' ? user.department : user.department?.name || '',
      semester: user.semester,
      isActive: user.isActive,
      profile: {
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        phone: user.profile?.phone || '',
        bio: user.profile?.bio || '',
        location: user.profile?.location || '',
        website: user.profile?.website || ''
      }
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setEditingUser(null);
    setUserForm({
      name: '',
      email: '',
      password: '',
      role: 'student',
      department: '',
      semester: undefined,
      isActive: true,
      profile: {
        firstName: '',
        lastName: '',
        phone: '',
        bio: '',
        location: '',
        website: ''
      }
    });
  };

  const renderStatsCards = () => {
    if (!stats) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center">
            <UserCheck className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Admins</p>
              <p className="text-2xl font-bold text-gray-900">{stats.roles.admins}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-indigo-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Teachers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.roles.teachers}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const renderFilters = () => (
    <Card className="p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search users..."
            className="pl-10"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>

        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filters.role}
          onChange={(e) => setFilters({ ...filters, role: e.target.value })}
          aria-label="Filter by role"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="teacher">Teacher</option>
          <option value="student">Student</option>
        </select>

        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filters.isActive === undefined ? '' : filters.isActive.toString()}
          onChange={(e) => setFilters({ 
            ...filters, 
            isActive: e.target.value === '' ? undefined : e.target.value === 'true' 
          })}
          aria-label="Filter by status"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>

        <Button onClick={fetchUsers} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    </Card>
  );

  const renderAddUserForm = () => {
    if (!showAddForm) return null;

    return (
      <Card className="mb-6">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingUser ? 'Edit User' : 'Add New User'}
          </h3>
          
          <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Name"
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                required
              />
              
              <Input
                label="Email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                required
              />

              {!editingUser && (
                <Input
                  label="Password"
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  required
                  placeholder="Minimum 6 characters"
                />
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  aria-label="User Role"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <Input
                label="First Name"
                value={userForm.profile.firstName}
                onChange={(e) => setUserForm({ 
                  ...userForm, 
                  profile: { ...userForm.profile, firstName: e.target.value }
                })}
              />

              <Input
                label="Last Name"
                value={userForm.profile.lastName}
                onChange={(e) => setUserForm({ 
                  ...userForm, 
                  profile: { ...userForm.profile, lastName: e.target.value }
                })}
              />

              <Input
                label="Phone"
                value={userForm.profile.phone}
                onChange={(e) => setUserForm({ 
                  ...userForm, 
                  profile: { ...userForm.profile, phone: e.target.value }
                })}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department {(userForm.role === 'student' || userForm.role === 'teacher') && '*'}
                </label>
                <select
                  value={userForm.department || ''}
                  onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={userForm.role === 'student' || userForm.role === 'teacher'}
                >
                  <option value="">Select Department</option>
                  {DEPARTMENT_LIST.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {(userForm.role === 'student' || userForm.role === 'teacher') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Semester {userForm.role === 'student' && '*'}
                  </label>
                  <select
                    value={userForm.semester || ''}
                    onChange={(e) => setUserForm({ ...userForm, semester: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={userForm.role === 'student'}
                  >
                    <option value="">Select Semester</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                      <option key={sem} value={sem}>Semester {sem}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Teacher-specific fields */}
              {userForm.role === 'teacher' && (
                <>
                  <Input
                    label="Employee ID *"
                    value={userForm.employeeId || ''}
                    onChange={(e) => setUserForm({ ...userForm, employeeId: e.target.value })}
                    required
                    placeholder="e.g., EMP001"
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Designation *
                    </label>
                    <select
                      value={userForm.designation || ''}
                      onChange={(e) => setUserForm({ ...userForm, designation: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Designation</option>
                      <option value="Professor">Professor</option>
                      <option value="Associate Professor">Associate Professor</option>
                      <option value="Assistant Professor">Assistant Professor</option>
                      <option value="Lecturer">Lecturer</option>
                    </select>
                  </div>
                </>
              )}

              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={userForm.isActive}
                    onChange={(e) => setUserForm({ ...userForm, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Active User</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {editingUser ? 'Update User' : 'Create User'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    );
  };

  const renderUserTable = () => (
    <Card>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Users ({totalUsers})</h3>
          
          <div className="flex space-x-2">
            {selectedUsers.length > 0 && (
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('activate')}
                >
                  <UserCheck className="h-4 w-4 mr-1" />
                  Activate ({selectedUsers.length})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('deactivate')}
                >
                  <UserX className="h-4 w-4 mr-1" />
                  Deactivate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('delete')}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(users.map(u => u._id!));
                      } else {
                        setSelectedUsers([]);
                      }
                    }}
                    aria-label="Select all users"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user._id!)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers([...selectedUsers, user._id!]);
                        } else {
                          setSelectedUsers(selectedUsers.filter(id => id !== user._id));
                        }
                      }}
                      aria-label={`Select user ${user.name}`}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'teacher' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {user.lockUntil && new Date(user.lockUntil) > new Date() && (
                        <Lock className="h-4 w-4 text-red-500 ml-2" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowUserDetails(user)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => editUser(user)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Edit User"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleUserStatus(user)}
                        className={user.isActive ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"}
                        title={user.isActive ? "Deactivate User" : "Activate User"}
                      >
                        {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>
                      {user.lockUntil && new Date(user.lockUntil) > new Date() && (
                        <button
                          onClick={() => handleUnlockUser(user._id!)}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Unlock User"
                        >
                          <Unlock className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleResetPassword(user._id!)}
                        className="text-orange-600 hover:text-orange-900"
                        title="Reset Password"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user._id!)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete User"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * (filters.limit || 10)) + 1} to{' '}
              {Math.min(currentPage * (filters.limit || 10), totalUsers)} of {totalUsers} users
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="px-3 py-2 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <div className="flex space-x-3">
          <div className="flex items-center space-x-2">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="hidden"
              id="user-file-upload"
            />
            <label htmlFor="user-file-upload" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </label>
            {uploadFile && (
              <Button onClick={handleFileUpload} disabled={loading} size="sm">
                Upload {uploadFile.name}
              </Button>
            )}
          </div>

          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>

          <Button variant="outline" onClick={() => handleExport('json')}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>

          <Button onClick={() => userManagementService.downloadUserTemplate()}>
            <Download className="h-4 w-4 mr-2" />
            Template
          </Button>

          <Button onClick={() => {
            resetForm();
            setShowAddForm(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

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

      {/* Stats Cards */}
      {renderStatsCards()}

      {/* Filters */}
      {renderFilters()}

      {/* Add/Edit User Form */}
      {renderAddUserForm()}

      {/* Users Table */}
      {loading ? (
        <Card>
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading users...</p>
          </div>
        </Card>
      ) : (
        renderUserTable()
      )}

      {/* User Details Modal */}
      {showUserDetails && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">User Details</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium">Name:</span> {showUserDetails.name}
                </div>
                <div>
                  <span className="font-medium">Email:</span> {showUserDetails.email}
                </div>
                <div>
                  <span className="font-medium">Role:</span> {showUserDetails.role}
                </div>
                <div>
                  <span className="font-medium">Status:</span>{' '}
                  <span className={showUserDetails.isActive ? 'text-green-600' : 'text-red-600'}>
                    {showUserDetails.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {showUserDetails.profile?.firstName && (
                  <div>
                    <span className="font-medium">Full Name:</span>{' '}
                    {showUserDetails.profile.firstName} {showUserDetails.profile.lastName}
                  </div>
                )}
                {showUserDetails.profile?.phone && (
                  <div>
                    <span className="font-medium">Phone:</span> {showUserDetails.profile.phone}
                  </div>
                )}
                {showUserDetails.profile?.bio && (
                  <div>
                    <span className="font-medium">Bio:</span> {showUserDetails.profile.bio}
                  </div>
                )}
                <div>
                  <span className="font-medium">Email Verified:</span>{' '}
                  <span className={showUserDetails.isEmailVerified ? 'text-green-600' : 'text-red-600'}>
                    {showUserDetails.isEmailVerified ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Last Login:</span>{' '}
                  {showUserDetails.lastLogin ? new Date(showUserDetails.lastLogin).toLocaleString() : 'Never'}
                </div>
                <div>
                  <span className="font-medium">Created:</span>{' '}
                  {showUserDetails.createdAt ? new Date(showUserDetails.createdAt).toLocaleString() : ''}
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowUserDetails(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
