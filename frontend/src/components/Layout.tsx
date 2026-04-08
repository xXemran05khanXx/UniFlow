import {
  ArrowLeftRight,
  Bell,
  BookOpen,
  Building,
  Calendar,
  Clock,
  Home,
  LogOut,
  Menu,
  Settings,
  User,
  Users,
} from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../hooks/redux';
import { useAuth } from '../hooks/useAuth';
import { logoutUser } from '../store/authSlice';
import NotificationBell from './NotificationBell';
import Sidebar, { SidebarNavItem } from './navigation/Sidebar';

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
    { name: 'Timetables', href: '/timetables', icon: Calendar, show: isAdmin },
    { name: 'My Teachers', href: '/admin-teachers', icon: Users, show: isAdmin },
    { name: 'Data Management', href: '/data-management', icon: Settings, show: isAdmin },
    { name: 'User Management', href: '/user-management', icon: Users, show: isAdmin },
    { name: 'Subject Management', href: '/subject-management', icon: BookOpen, show: isAdmin },
    { name: 'Room Management', href: '/room-management', icon: Building, show: isAdmin },
    { name: 'Time Slots', href: '/time-slots', icon: Clock, show: isAdmin },
    { name: 'Admin Settings', href: '/admin-settings', icon: Settings, show: isAdmin },
    { name: 'Lecture Swaps', href: '/admin/swaps', icon: ArrowLeftRight, show: isAdmin },
    { name: 'Room Booking', href: '/room-management', icon: Building, show: isTeacher },
    { name: 'My Timetable', href: '/teacher-timetable', icon: Calendar, show: isTeacher },
    { name: 'My Classes', href: '/teacher-classes', icon: BookOpen, show: isTeacher },
    { name: 'Settings', href: '/teacher-settings', icon: Settings, show: isTeacher },
    { name: 'My Timetable', href: '/student-timetable', icon: Calendar, show: isStudent },
    { name: 'My Teachers', href: '/student-teachers', icon: Users, show: isStudent },
    { name: 'My Notifications', href: '/student-notifications', icon: Bell, show: isStudent },
    { name: 'My Profile', href: '/student-profile', icon: User, show: isStudent },
  ].filter((item) => item.show) as SidebarNavItem[];

  return (
    <div className="min-h-screen bg-secondary-50">
      <Sidebar
        navigation={navigation}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      <div className={`relative transition-all duration-200 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <div className="flex h-16 items-center bg-white border-b border-secondary-200 px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-secondary-500 hover:text-secondary-700 lg:hidden transition-colors duration-200"
            aria-label="Open sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="ml-auto flex items-center gap-3">
            {isStudent && <NotificationBell />}

            <div className="hidden sm:flex sm:flex-col sm:items-end sm:justify-center leading-tight">
              <p className="text-sm font-semibold text-secondary-900">{user?.name || 'User'}</p>
              <p className="text-xs text-secondary-500 capitalize">{user?.role}</p>
            </div>

            <div className="h-9 w-9 shrink-0 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary-700">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-md p-1.5 text-secondary-500 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
              aria-label="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
};

export default Layout;