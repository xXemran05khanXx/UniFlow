import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAppDispatch } from '../hooks/redux';
import { logoutUser } from '../store/authSlice';
import NotificationBell from './NotificationBell';
import Sidebar, { SidebarNavItem } from './navigation/Sidebar';
import { 
  Home, 
  Calendar, 
  Users, 
  BookOpen, 
  Building, 
  Clock, 
  Settings, 
  LogOut,
  Menu,
  Bell,
  User,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, isAdmin, isTeacher, isStudent } = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const navigation: SidebarNavItem[] = [
    { name: 'Dashboard', href: '/', icon: Home, show: true },
    // Admin menu options
    { name: 'Timetables', href: '/timetables', icon: Calendar, show: isAdmin },
    { name: 'My Teachers', href: '/admin-teachers', icon: Users, show: isAdmin },
    { name: 'Data Management', href: '/data-management', icon: Settings, show: isAdmin },
    { name: 'User Management', href: '/user-management', icon: Users, show: isAdmin },
    { name: 'Subject Management', href: '/subject-management', icon: BookOpen, show: isAdmin },
    { name: 'Room Management', href: '/room-management', icon: Building, show: isAdmin },
    { name: 'Time Slots', href: '/time-slots', icon: Clock, show: isAdmin },
    { name: 'Admin Settings', href: '/admin-settings', icon: Settings, show: isAdmin },
    // Teacher menu options
    { name: 'My Timetable', href: '/teacher-timetable', icon: Calendar, show: isTeacher },
    { name: 'My Classes', href: '/teacher-classes', icon: BookOpen, show: isTeacher },
    { name: 'Settings', href: '/teacher-settings', icon: Settings, show: isTeacher },
    // Student menu options
    { name: 'My Timetable', href: '/student-timetable', icon: Calendar, show: isStudent },
    { name: 'My Teachers', href: '/student-teachers', icon: Users, show: isStudent },
    { name: 'My Notifications', href: '/student-notifications', icon: Bell, show: isStudent },
    { name: 'My Profile', href: '/student-profile', icon: User, show: isStudent },
  ].filter(item => item.show) as SidebarNavItem[];

  return (
    <div className="min-h-screen bg-secondary-50">
      <Sidebar
        navigation={navigation}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
      />

      {/* Main content */}
      <div className={`transition-all duration-200 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        {/* Top bar */}
        <div className="flex h-16 items-center bg-white border-b border-secondary-200 px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-secondary-500 hover:text-secondary-700 lg:hidden transition-colors duration-200"
            aria-label="Open sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>

          <button
            onClick={() => setSidebarCollapsed(prev => !prev)}
            className="hidden lg:inline-flex ml-1 p-1.5 rounded-md text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 transition-all duration-200"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
          
          <div className="flex items-center space-x-4 ml-auto">
            {/* Notification Bell - only for students */}
            {isStudent && <NotificationBell />}
            
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-secondary-900">{user?.name}</p>
              <p className="text-xs text-secondary-500 capitalize">{user?.role}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700">
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded-md p-1.5 transition-colors duration-200"
              aria-label="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
