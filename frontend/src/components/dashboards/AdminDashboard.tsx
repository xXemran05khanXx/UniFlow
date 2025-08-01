import React, { useState, useEffect } from 'react';
import { Users, Calendar, BookOpen, Settings, BarChart3, Plus } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { usersAPI, timetablesAPI } from '../../services/api';
import { User, Timetable } from '../../types';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTeachers: 0,
    totalStudents: 0,
    totalTimetables: 0,
    activeTimetables: 0
  });
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [recentTimetables, setRecentTimetables] = useState<Timetable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [usersResponse, timetablesResponse] = await Promise.all([
        usersAPI.getAll(),
        timetablesAPI.getAll()
      ]);

      if (usersResponse.success && usersResponse.data) {
        const users = usersResponse.data;
        setStats(prev => ({
          ...prev,
          totalUsers: users.length,
          totalTeachers: users.filter((u: User) => u.role === 'teacher').length,
          totalStudents: users.filter((u: User) => u.role === 'student').length
        }));
        setRecentUsers(users.slice(-5).reverse());
      }

      if (timetablesResponse.success && timetablesResponse.data) {
        const timetables = timetablesResponse.data;
        setStats(prev => ({
          ...prev,
          totalTimetables: timetables.length,
          activeTimetables: timetables.filter((t: Timetable) => t.status === 'published').length
        }));
        setRecentTimetables(timetables.slice(-5).reverse());
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      change: '+12%'
    },
    {
      title: 'Teachers',
      value: stats.totalTeachers,
      icon: BookOpen,
      color: 'bg-green-500',
      change: '+8%'
    },
    {
      title: 'Students',
      value: stats.totalStudents,
      icon: Users,
      color: 'bg-purple-500',
      change: '+15%'
    },
    {
      title: 'Active Timetables',
      value: stats.activeTimetables,
      icon: Calendar,
      color: 'bg-orange-500',
      change: '+5%'
    }
  ];

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
          <Button className="flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Generate Timetable
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
                  <p className="text-sm text-green-600 font-medium">{stat.change}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-full`}>
                  <IconComponent className="h-6 w-6 text-white" />
                </div>
              </div>
            </Card>
          );
        })}
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
                    {timetable.department} - Semester {timetable.semester}
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
          <Button variant="outline" className="flex items-center justify-center p-4 h-auto">
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
