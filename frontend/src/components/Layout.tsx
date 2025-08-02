import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAppDispatch } from '../hooks/redux';
import { logoutUser } from '../store/authSlice';
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
  X
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, isAdmin, isTeacher } = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home, show: true },
    { name: 'Timetables', href: '/timetables', icon: Calendar, show: true },
    { name: 'Generate', href: '/generate', icon: Calendar, show: isAdmin || isTeacher },
    { name: 'Data Management', href: '/data-management', icon: Settings, show: isAdmin },
    { name: 'User Management', href: '/user-management', icon: Users, show: isAdmin },
    { name: 'Subject Management', href: '/subject-management', icon: BookOpen, show: isAdmin },
    { name: 'Room Management', href: '/room-management', icon: Building, show: isAdmin },
    { name: 'Time Slots', href: '/time-slot-management', icon: Clock, show: isAdmin },
    { name: 'Settings', href: '/settings', icon: Settings, show: true },
  ].filter(item => item.show);

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-secondary-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl">
          <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-secondary-200">
            <h1 className="text-xl font-bold text-primary-600">UniFlow</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-secondary-500 hover:text-secondary-700"
              title="Close sidebar"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 px-6 py-6">
            <ul className="space-y-2">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive(item.href)
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-secondary-700 hover:bg-secondary-100'
                    }`}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col bg-white border-r border-secondary-200 shadow-sm">
          <div className="flex h-16 shrink-0 items-center px-6 border-b border-secondary-200">
            <h1 className="text-xl font-bold text-primary-600">UniFlow</h1>
          </div>
          <nav className="flex-1 px-6 py-6">
            <ul className="space-y-2">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive(item.href)
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-secondary-700 hover:bg-secondary-100'
                    }`}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="flex h-16 items-center justify-between bg-white border-b border-secondary-200 px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-secondary-500 hover:text-secondary-700 lg:hidden"
            title="Open sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex items-center space-x-4">
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
              className="text-secondary-500 hover:text-secondary-700 p-1"
              title="Logout"
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
