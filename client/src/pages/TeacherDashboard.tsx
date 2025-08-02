import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import TimetableGrid from "@/components/TimetableGrid";
import NotificationCenter from "@/components/NotificationCenter";
import MeetingScheduler from "@/components/MeetingScheduler";
import { 
  GraduationCap, 
  Users, 
  Calendar, 
  Handshake, 
  RefreshCw, 
  Bell, 
  LogOut,
  Clock,
  CalendarPlus,
  UserCheck,
  CheckCircle,
  X
} from "lucide-react";

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const [myTimetables, setMyTimetables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchMyTimetables();
    }
  }, [user]);

  const fetchMyTimetables = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/timetables?userId=${user?.id}`);
      if (response.ok) {
        const data = await response.json();
        setMyTimetables(data);
      }
    } catch (error) {
      console.error('Failed to fetch timetables:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get today's classes
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayClasses = myTimetables.filter((t: any) => t.dayOfWeek === today);

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
          <div className="mt-4 p-3 bg-violet-50 rounded-lg">
            <div className="flex items-center">
              <Users className="text-violet-500 mr-3" />
              <div>
                <div className="font-semibold text-gray-900">{user?.name}</div>
                <div className="text-sm text-violet-600 capitalize">{user?.role}</div>
              </div>
            </div>
          </div>
        </div>
        
        <nav className="p-4">
          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-start text-violet-600 bg-violet-50">
              <Calendar className="mr-3" size={20} />
              My Schedule
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-700 hover:bg-gray-50">
              <Handshake className="mr-3" size={20} />
              Meetings
              <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">2</span>
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-700 hover:bg-gray-50">
              <RefreshCw className="mr-3" size={20} />
              Swap Requests
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-700 hover:bg-gray-50">
              <Bell className="mr-3" size={20} />
              Notifications
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
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {user?.name?.split(' ').slice(1).join(' ')}!
            </h2>
            <p className="text-gray-600">Manage your classes and meetings</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Available for meetings:</span>
              <Switch defaultChecked />
            </div>
            <NotificationCenter userId={user?.id || ''} />
          </div>
        </div>

        {/* Meeting Invitations */}
        <div className="mb-8">
          <Card className="bg-blue-50 border-l-4 border-blue-400">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex">
                  <Handshake className="text-blue-400 mr-3 mt-1" size={20} />
                  <div>
                    <p className="font-semibold text-blue-800">New Meeting Request</p>
                    <p className="text-blue-700 text-sm">Principal wants to meet tomorrow 3:00 PM - Discuss curriculum update</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" className="bg-emerald-500 text-white hover:bg-emerald-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Accept
                  </Button>
                  <Button size="sm" variant="secondary" className="bg-gray-500 text-white hover:bg-gray-600">
                    <X className="w-4 h-4 mr-1" />
                    Decline
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Today's Classes */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Today's Classes ({today})</h3>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading schedule...</p>
                </div>
              ) : todayClasses.length > 0 ? (
                <div className="space-y-4">
                  {todayClasses.map((classItem: any) => (
                    <div 
                      key={classItem.id}
                      className="flex items-center p-4 rounded-lg border-l-4 bg-violet-50 border-violet-500"
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-gray-900">{classItem.subject}</h4>
                          <span className="text-sm font-medium text-violet-600">
                            {classItem.startTime} - {classItem.endTime}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mt-1">
                          Room: {classItem.room} • {classItem.year} {classItem.division}
                        </p>
                      </div>
                      <div className="text-violet-500">
                        <Clock size={20} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="mx-auto mb-2" size={48} />
                  <p>No classes scheduled for today</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h3>
              <div className="space-y-4">
                <Button variant="outline" className="w-full justify-start p-4 h-auto hover:bg-gray-50">
                  <RefreshCw className="text-blue-500 mr-4" size={20} />
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">Request Lecture Swap</div>
                    <div className="text-sm text-gray-600">Exchange classes with another teacher</div>
                  </div>
                </Button>

                <Button variant="outline" className="w-full justify-start p-4 h-auto hover:bg-gray-50">
                  <Clock className="text-violet-500 mr-4" size={20} />
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">Update Availability</div>
                    <div className="text-sm text-gray-600">Set your meeting availability</div>
                  </div>
                </Button>

                <Button variant="outline" className="w-full justify-start p-4 h-auto hover:bg-gray-50">
                  <CalendarPlus className="text-emerald-500 mr-4" size={20} />
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">Schedule Meeting</div>
                    <div className="text-sm text-gray-600">Book a meeting with colleagues</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Full Teaching Schedule */}
        <div className="mt-8 mb-8">
          {isLoading ? (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading teaching schedule...</p>
              </CardContent>
            </Card>
          ) : myTimetables.length > 0 ? (
            <TimetableGrid 
              timetables={myTimetables} 
              title="My Teaching Schedule"
              showStudentInfo={true}
            />
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Calendar className="mx-auto mb-4" size={48} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Teaching Schedule</h3>
                <p className="text-gray-600">You don't have any assigned classes yet.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mt-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
                  <Users className="text-violet-500 text-xl" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">This Week</p>
                  <p className="text-2xl font-bold text-gray-900">{myTimetables.length} Classes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Handshake className="text-blue-500 text-xl" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Meetings</p>
                  <p className="text-2xl font-bold text-gray-900">2 Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <UserCheck className="text-emerald-500 text-xl" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Students</p>
                  <p className="text-2xl font-bold text-gray-900">156 Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <RefreshCw className="text-amber-500 text-xl" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Swaps</p>
                  <p className="text-2xl font-bold text-gray-900">1 Request</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Meeting Management */}
        <div className="mt-8">
          <Card>
            <CardContent className="p-6">
              <MeetingScheduler currentUserId={user?.id || ''} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
