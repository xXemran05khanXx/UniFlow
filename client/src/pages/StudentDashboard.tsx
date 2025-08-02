import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import TimetableGrid from "@/components/TimetableGrid";
import { 
  GraduationCap, 
  University, 
  Calendar, 
  Bell, 
  MapPin, 
  LogOut,
  Clock,
  CalendarX,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [timetables, setTimetables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.department) {
      fetchTimetables();
    }
  }, [user]);

  const fetchTimetables = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/timetables?department=${user?.department}`);
      if (response.ok) {
        const data = await response.json();
        setTimetables(data);
      }
    } catch (error) {
      console.error('Failed to fetch timetables:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get today's classes
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayClasses = timetables.filter((t: any) => t.dayOfWeek === today);

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
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center">
              <University className="text-blue-500 mr-3" />
              <div>
                <div className="font-semibold text-gray-900">{user?.name}</div>
                <div className="text-sm text-blue-600 capitalize">{user?.role}</div>
              </div>
            </div>
          </div>
        </div>
        
        <nav className="p-4">
          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-start text-blue-600 bg-blue-50">
              <Calendar className="mr-3" size={20} />
              My Timetable
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-700 hover:bg-gray-50">
              <Bell className="mr-3" size={20} />
              Notifications
              <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">3</span>
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-700 hover:bg-gray-50">
              <MapPin className="mr-3" size={20} />
              Room Finder
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
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Good morning, {user?.name?.split(' ')[0]}!
          </h2>
          <p className="text-gray-600">Here's your schedule for today</p>
        </div>

        {/* Notifications */}
        <div className="mb-8">
          <Card className="bg-amber-50 border-l-4 border-amber-400">
            <CardContent className="p-4">
              <div className="flex">
                <AlertTriangle className="text-amber-400 mr-3 mt-1" size={20} />
                <div>
                  <p className="font-semibold text-amber-800">Room Change Alert</p>
                  <p className="text-amber-700 text-sm">Physics Lab session moved from Lab-101 to Lab-203</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Schedule */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Today's Classes ({today})</h3>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading schedule...</p>
              </div>
            ) : todayClasses.length > 0 ? (
              <div className="space-y-4">
                {todayClasses.map((classItem: any) => (
                  <div 
                    key={classItem.id}
                    className="flex items-center p-4 rounded-lg border-l-4 bg-blue-50 border-blue-500"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900">{classItem.subject}</h4>
                        <span className="text-sm font-medium text-blue-600">
                          {classItem.startTime} - {classItem.endTime}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mt-1">
                        Room: {classItem.room} • {classItem.year} {classItem.division}
                      </p>
                    </div>
                    <div className="text-blue-500">
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

        {/* Full Timetable */}
        <div className="mb-8">
          {isLoading ? (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading timetable...</p>
              </CardContent>
            </Card>
          ) : (
            <TimetableGrid 
              timetables={timetables} 
              title={`${user?.department} Department - Weekly Schedule`}
              showStudentInfo={true}
            />
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CalendarX className="text-blue-500 text-xl" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">This Week</p>
                  <p className="text-2xl font-bold text-gray-900">18 Classes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="text-emerald-500 text-xl" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Attendance</p>
                  <p className="text-2xl font-bold text-gray-900">94%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Bell className="text-amber-500 text-xl" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Notifications</p>
                  <p className="text-2xl font-bold text-gray-900">3 New</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
