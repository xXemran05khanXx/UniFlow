import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import TimetableGrid from "@/components/TimetableGrid";
import CreateTimetableModal from "@/components/CreateTimetableModal";
import AutoTimetableGenerator from "@/components/AutoTimetableGenerator";
import NotificationCenter from "@/components/NotificationCenter";
import MeetingScheduler from "@/components/MeetingScheduler";
import { 
  GraduationCap, 
  UserCheck, 
  Calendar, 
  Handshake, 
  Users, 
  MapPin, 
  BarChart3, 
  LogOut,
  Gauge,
  Building,
  DoorOpen,
  CalendarPlus,
  UserPlus
} from "lucide-react";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [allTimetables, setAllTimetables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAutoGenerator, setShowAutoGenerator] = useState(false);

  useEffect(() => {
    fetchAllTimetables();
  }, []);

  const fetchAllTimetables = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/timetables');
      if (response.ok) {
        const data = await response.json();
        setAllTimetables(data);
      }
    } catch (error) {
      console.error('Failed to fetch timetables:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    fetchAllTimetables(); // Refresh the timetables
  };

  // Mock data for demonstration - TODO: Replace with real API calls
  const recentActivities = [
    {
      id: 1,
      type: 'timetable',
      title: 'Timetable Updated',
      description: 'Computer Science Dept. - Year 2',
      time: '2 hours ago',
      icon: Calendar,
      color: 'blue'
    },
    {
      id: 2,
      type: 'meeting',
      title: 'Meeting Scheduled',
      description: 'Faculty meeting - Tomorrow 3 PM',
      time: '4 hours ago',
      icon: Handshake,
      color: 'emerald'
    },
    {
      id: 3,
      type: 'faculty',
      title: 'New Faculty Added',
      description: 'Dr. Amanda Wilson - Physics Dept.',
      time: '1 day ago',
      icon: UserPlus,
      color: 'violet'
    }
  ];

  const departments = [
    { name: 'Computer Science', faculty: 18, students: 456, rooms: 12, status: 'Active', color: 'blue' },
    { name: 'Mathematics', faculty: 15, students: 392, rooms: 8, status: 'Active', color: 'emerald' },
    { name: 'Physics', faculty: 12, students: 284, rooms: 15, status: 'Active', color: 'violet' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg relative">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="text-white text-sm" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Uniflow</h1>
          </div>
          <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
            <div className="flex items-center">
              <UserCheck className="text-emerald-500 mr-3" />
              <div>
                <div className="font-semibold text-gray-900">{user?.name}</div>
                <div className="text-sm text-emerald-600">Administrator</div>
              </div>
            </div>
          </div>
        </div>
        
        <nav className="p-4">
          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-start text-emerald-600 bg-emerald-50">
              <Gauge className="mr-3" size={20} />
              Dashboard
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-700 hover:bg-gray-50">
              <Calendar className="mr-3" size={20} />
              Timetables
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-700 hover:bg-gray-50">
              <Handshake className="mr-3" size={20} />
              Meetings
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-700 hover:bg-gray-50">
              <Users className="mr-3" size={20} />
              Staff Management
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-700 hover:bg-gray-50">
              <MapPin className="mr-3" size={20} />
              Room Management
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-700 hover:bg-gray-50">
              <BarChart3 className="mr-3" size={20} />
              Analytics
            </Button>
          </div>
        </nav>
        
        <div className="absolute bottom-4 left-4 right-4">
          <Button 
            onClick={logout} 
            variant="ghost" 
            className="w-full justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          >
            <LogOut className="mr-2" size={16} />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Campus Overview</h2>
            <p className="text-gray-600">Manage your institution's operations efficiently</p>
          </div>
          <div className="flex items-center space-x-4">
            <NotificationCenter userId={user?.id || ''} />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="text-blue-500 text-xl" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">2,456</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
                  <UserCheck className="text-violet-500 text-xl" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Faculty</p>
                  <p className="text-2xl font-bold text-gray-900">156</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Building className="text-emerald-500 text-xl" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Departments</p>
                  <p className="text-2xl font-bold text-gray-900">12</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <DoorOpen className="text-amber-500 text-xl" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Rooms</p>
                  <p className="text-2xl font-bold text-gray-900">89</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h3>
              <div className="grid grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateModal(true)}
                  className="flex flex-col items-center p-4 h-auto border-2 border-dashed border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all duration-200"
                >
                  <CalendarPlus className="text-emerald-500 text-2xl mb-2" />
                  <span className="font-semibold text-gray-900">Manual Entry</span>
                  <span className="text-xs text-gray-600">Create single entry</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => setShowAutoGenerator(true)}
                  className="flex flex-col items-center p-4 h-auto border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                >
                  <div className="text-blue-500 text-2xl mb-2">🧬</div>
                  <span className="font-semibold text-gray-900">Auto Generate</span>
                  <span className="text-xs text-gray-600">AI-powered timetable</span>
                </Button>

                <Button 
                  variant="outline" 
                  className="flex flex-col items-center p-4 h-auto border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                >
                  <Handshake className="text-blue-500 text-2xl mb-2" />
                  <span className="font-semibold text-gray-900">Schedule Meeting</span>
                </Button>

                <Button 
                  variant="outline" 
                  className="flex flex-col items-center p-4 h-auto border-2 border-dashed border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-all duration-200"
                >
                  <UserPlus className="text-violet-500 text-2xl mb-2" />
                  <span className="font-semibold text-gray-900">Add Faculty</span>
                </Button>

                <Button 
                  variant="outline" 
                  className="flex flex-col items-center p-4 h-auto border-2 border-dashed border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition-all duration-200"
                >
                  <DoorOpen className="text-amber-500 text-2xl mb-2" />
                  <span className="font-semibold text-gray-900">Manage Rooms</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Recent Activities</h3>
              <div className="space-y-4">
                {recentActivities.map((activity) => {
                  const IconComponent = activity.icon;
                  const colorClassMap = {
                    blue: 'bg-blue-50 text-blue-500',
                    emerald: 'bg-emerald-50 text-emerald-500',
                    violet: 'bg-violet-50 text-violet-500'
                  };
                  const colorClass = colorClassMap[activity.color as keyof typeof colorClassMap];

                  return (
                    <div key={activity.id} className={`flex items-center p-3 ${colorClass?.replace('text-', 'bg-').replace('-500', '-50')} rounded-lg`}>
                      <IconComponent className={`${colorClass?.split(' ')[1]} mr-3`} size={20} />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{activity.title}</p>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                      </div>
                      <span className="text-xs text-gray-500">{activity.time}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Department Overview */}
        <div className="mt-8">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Department Overview</h3>
              <div className="grid md:grid-cols-3 gap-6">
                {departments.map((dept, index) => {
                  const statusColors = {
                    blue: 'bg-blue-100 text-blue-800',
                    emerald: 'bg-emerald-100 text-emerald-800',
                    violet: 'bg-violet-100 text-violet-800'
                  };

                  return (
                    <Card key={index} className="border border-gray-200 hover:shadow-md transition-shadow duration-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900">{dept.name}</h4>
                          <span className={`${statusColors[dept.color as keyof typeof statusColors]} text-xs px-2 py-1 rounded-full`}>
                            {dept.status}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span>Faculty:</span>
                            <span className="font-medium">{dept.faculty}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Students:</span>
                            <span className="font-medium">{dept.students}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Rooms:</span>
                            <span className="font-medium">{dept.rooms}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Master Timetable */}
        <div className="mt-8">
          {isLoading ? (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading master timetable...</p>
              </CardContent>
            </Card>
          ) : allTimetables.length > 0 ? (
            <TimetableGrid 
              timetables={allTimetables} 
              title="Master Timetable - All Departments"
              showStudentInfo={true}
            />
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Calendar className="mx-auto mb-4" size={48} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Timetable Entries</h3>
                <p className="text-gray-600 mb-4">Create your first timetable entry to get started.</p>
                <Button onClick={() => setShowCreateModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
                  <CalendarPlus className="mr-2" size={16} />
                  Create Timetable Entry
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      <CreateTimetableModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
      
      <AutoTimetableGenerator
        isOpen={showAutoGenerator}
        onClose={() => setShowAutoGenerator(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
