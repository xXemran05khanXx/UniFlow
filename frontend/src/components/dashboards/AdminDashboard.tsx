import React, { useState, useEffect } from 'react';
import { Users, Calendar, BookOpen, Settings, BarChart3, Plus } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { usersAPI, timetablesAPI } from '../../services/api';
import { userManagementService, UserStats } from '../../services/userManagementService';
import { User, Timetable } from '../../types';
import './AdminDashboard.css';

interface Department {
  id: string;
  name: string;
  code: string;
  totalStudents: number;
  totalTeachers: number;
  color: string;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTeachers: 0,
    totalStudents: 0,
    totalTimetables: 0,
    activeTimetables: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    adminUsers: 0,
    teacherUsers: 0,
    studentUsers: 0,
    recentSignups: 0
  });
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [recentTimetables, setRecentTimetables] = useState<Timetable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTimetableGenerator, setShowTimetableGenerator] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  // Department color mapping
  const departmentColors: { [key: string]: string } = {
    'Computer Science': 'from-blue-500 to-cyan-500',
    'Information Technology': 'from-purple-500 to-pink-500',
    'First Year Engineering': 'from-green-500 to-lime-500',
    'IT': 'from-purple-500 to-pink-500',
    'CS': 'from-blue-500 to-cyan-500',
    'FE': 'from-green-500 to-lime-500'
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch user statistics from the API
      const userStatsData = await userManagementService.getUserStats();
      console.log('📊 User Stats Response:', userStatsData);
      
      // Initialize variables
      let totalTimetables = 0;
      let activeTimetables = 0;
      let recentUsersList: User[] = [];

      // Fetch users data
      try {
        const usersResponse = await usersAPI.getAll();
        console.log('👥 Users Response:', usersResponse);
        
        if (usersResponse.success && usersResponse.data) {
          const users = usersResponse.data;
          recentUsersList = users.slice(-5).reverse();
          
          // Calculate department statistics from users
          calculateDepartmentStats(users);
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch users list:', error);
      }

      // Try to fetch timetables data (may not exist yet)
      try {
        const timetablesResponse = await timetablesAPI.getAll();
        console.log('📅 Timetables Response:', timetablesResponse);
        
        if (timetablesResponse.success && timetablesResponse.data) {
          const timetables = timetablesResponse.data;
          totalTimetables = timetables.length;
          activeTimetables = timetables.filter((t: Timetable) => t.status === 'published').length;
          setRecentTimetables(timetables.slice(-5).reverse());
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch timetables (endpoint may not exist yet):', error);
      }

      // Update stats with real data from API
      const newStats = {
        totalUsers: userStatsData.totalUsers || 0,
        activeUsers: userStatsData.activeUsers || 0,
        inactiveUsers: userStatsData.inactiveUsers || 0,

        // NEW API structure
        adminUsers: userStatsData.roles?.admins || 0,
        totalTeachers: userStatsData.roles?.teachers || 0,
        totalStudents: userStatsData.roles?.students || 0,

        teacherUsers: userStatsData.roles?.teachers || 0,
        studentUsers: userStatsData.roles?.students || 0,

        recentSignups: userStatsData.recentSignups || 0,

        totalTimetables,
        activeTimetables
      };
      
      console.log('✅ Final Stats:', newStats);
      setStats(newStats);
      setRecentUsers(recentUsersList);

    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentCode = (deptName: any): string => {
    if (!deptName) return 'N/A';
    const name = String(deptName);
    if (name.includes('Computer Science') || name === 'CS') return 'CS';
    if (name.includes('Information Technology') || name === 'IT') return 'IT';
    if (name.includes('First Year') || name === 'FE') return 'FE';
    return name.substring(0, 2).toUpperCase();
  };

  const calculateDepartmentStats = (users: User[]) => {
    // Group users by department
    const deptMap = new Map<string, { students: number; teachers: number }>();
    
    users.forEach((user: User) => {
      if (!user.department) return;
      
      // Extract department info - handle both string and object formats
      let deptCode = '';
      let deptName = '';
      
      if (typeof user.department === 'string') {
        deptName = user.department;
        deptCode = user.department;
      } else if (user.department && typeof user.department === 'object') {
        deptCode = (user.department as any).code || '';
        deptName = (user.department as any).name || '';
      }
      
      // Use code as primary key for grouping
      const deptKey = deptCode || deptName;
      if (!deptKey) return;
      
      if (!deptMap.has(deptKey)) {
        deptMap.set(deptKey, { students: 0, teachers: 0 });
      }
      
      const counts = deptMap.get(deptKey)!;
      if (user.role === 'student') {
        counts.students++;
      } else if (user.role === 'teacher') {
        counts.teachers++;
      }
    });
    
    console.log('🗺️ Department Map:', Array.from(deptMap.entries()));
    
    // Always create all three default departments
    const defaultDepartments = [
      { id: 'cs', name: 'Computer Science', code: 'CS', color: 'from-blue-500 to-cyan-500' },
      { id: 'it', name: 'Information Technology', code: 'IT', color: 'from-purple-500 to-pink-500' },
      { id: 'fe', name: 'First Year Engineering', code: 'FE', color: 'from-green-500 to-lime-500' }
    ];
    
    const updatedDepts: Department[] = defaultDepartments.map(dept => {
      // Try to find matching data from the map
      let counts = { students: 0, teachers: 0 };
      
      // Check for exact matches or variations
      deptMap.forEach((deptCounts, deptKey) => {
        const normalizedKey = deptKey.toLowerCase().trim();
        const normalizedCode = dept.code.toLowerCase();
        const normalizedName = dept.name.toLowerCase();
        
        // Match by code (priority) or name
        if (normalizedKey === normalizedCode || 
            normalizedKey === normalizedName ||
            normalizedKey.includes(normalizedCode) ||
            normalizedName.includes(normalizedKey)) {
          counts.students += deptCounts.students;
          counts.teachers += deptCounts.teachers;
        }
      });
      
      return {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        totalStudents: counts.students,
        totalTeachers: counts.teachers,
        color: dept.color
      };
    });
    
    console.log('📊 Department Stats:', updatedDepts);
    setDepartments(updatedDepts);
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      subtitle: `${stats.activeUsers} active`
    },
    {
      title: 'Teachers',
      value: stats.totalTeachers,
      icon: BookOpen,
      color: 'bg-green-500',
      subtitle: 'Faculty members'
    },
    {
      title: 'Students',
      value: stats.totalStudents,
      icon: Users,
      color: 'bg-purple-500',
      subtitle: `${stats.recentSignups} new (30 days)`
    },
    {
      title: 'Active Timetables',
      value: stats.activeTimetables,
      icon: Calendar,
      color: 'bg-orange-500',
      subtitle: `${stats.totalTimetables} total`
    }
  ];

  const renderDepartmentOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {departments.map((dept) => (
        <Card 
          key={dept.id}
          className="relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:scale-105 dept-card-glow border-0"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${dept.color} opacity-15`}></div>
          <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${dept.color}`}></div>
          
          <div className="relative p-6">
            <div className="flex items-center justify-center mb-4">
              <div className={`p-3 rounded-2xl bg-gradient-to-br ${dept.color} shadow-lg`}>
                <BookOpen className="h-6 w-6 text-white" />
              </div>
            </div>
            
            <div className="text-center mb-4">
              <h3 className="font-bold text-xl text-gray-900 mb-1">{dept.code}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{dept.name}</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="p-1 bg-blue-100 rounded">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-gray-600 text-sm">Students</span>
                </div>
                <span className="font-bold text-lg text-gray-900">{dept.totalStudents}</span>
              </div>
              
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="p-1 bg-purple-100 rounded">
                    <BookOpen className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="text-gray-600 text-sm">Faculty</span>
                </div>
                <span className="font-bold text-lg text-gray-900">{dept.totalTeachers}</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  Ratio
                </div>
                <div className="font-semibold text-sm text-gray-700">
                  {dept.totalTeachers > 0 
                    ? `${Math.round(dept.totalStudents / dept.totalTeachers)}:1`
                    : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your university's academic system</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500 font-medium">{stat.subtitle}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-full`}>
                  <IconComponent className="h-6 w-6 text-white" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Department Overview */}
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-2xl mr-4">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              Department Overview
            </h2>
            <p className="text-gray-600 text-lg">
              Comprehensive statistics and insights for all academic departments
            </p>
          </div>
          <Button variant="outline" className="flex items-center enhanced-button">
            <BarChart3 className="h-4 w-4 mr-2" />
            View Analytics
          </Button>
        </div>
        {renderDepartmentOverview()}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Users</h3>
            <Button variant="outline" size="sm">View All</Button>
          </div>
          <div className="space-y-3">
            {recentUsers.map((user) => (
              <div key={user._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  user.role === 'admin' ? 'bg-red-100 text-red-800' :
                  user.role === 'teacher' ? 'bg-green-100 text-green-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {user.role}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Timetables */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Timetables</h3>
            <Button variant="outline" size="sm">View All</Button>
          </div>
          <div className="space-y-3">
            {recentTimetables.map((timetable) => (
              <div key={timetable._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{timetable.name}</p>
                  <p className="text-sm text-gray-500">
                    {typeof timetable.department === 'string' ? timetable.department : `${timetable.department.code} - ${timetable.department.name}`} - Semester {timetable.semester}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  timetable.status === 'published' ? 'bg-green-100 text-green-800' :
                  timetable.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {timetable.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="flex items-center justify-center p-4 h-auto">
            <Users className="h-5 w-5 mr-2" />
            Manage Users
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center justify-center p-4 h-auto"
            onClick={() => setShowTimetableGenerator(true)}
          >
            <Calendar className="h-5 w-5 mr-2" />
            Create Timetable
          </Button>
          <Button variant="outline" className="flex items-center justify-center p-4 h-auto">
            <BarChart3 className="h-5 w-5 mr-2" />
            View Reports
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;
