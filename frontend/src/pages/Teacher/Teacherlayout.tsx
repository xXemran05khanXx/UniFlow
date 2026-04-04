/**
 * pages/Teacher/TeacherLayout.tsx
 * Layout wrapper for all /teacher/* routes.
 * Uses RoleGuard from common/ and useAuth from hooks/ — same as rest of project.
 */

import {
  BookOpen,
  Calendar,
  Home,
  LogOut,
  Menu,
  Settings,
  User,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    to: '/teacher/dashboard',
    icon: <Home className="h-5 w-5" />,
  },
  {
    label: 'My Schedule',
    to: '/teacher/schedule',
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    label: 'My Profile',
    to: '/teacher/profile',
    icon: <User className="h-5 w-5" />,
  },
  {
    label: 'My Classes',
    to: '/teacher/classes',
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    label: 'Settings',
    to: '/teacher/settings',
    icon: <Settings className="h-5 w-5" />,
  },
];

const TeacherLayout: React.FC = () => {
  const { user } = useAuth();
  const navigate          = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    navigate('/login');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
    ${isActive
      ? 'bg-blue-50 text-blue-700'
      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`;

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Desktop Sidebar ──────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-gray-200 shrink-0">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">Teacher Portal</p>
              <p className="text-xs text-gray-400">UniFlow</p>
            </div>
          </div>
        </div>

        {/* User info */}
        {user && (
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(item => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile header */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <BookOpen className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">Teacher Portal</span>
          </div>
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="lg:hidden bg-white border-b border-gray-200 px-3 py-2 space-y-1">
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={navLinkClass}
                onClick={() => setMobileOpen(false)}
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;