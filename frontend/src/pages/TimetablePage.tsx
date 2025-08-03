import React from 'react';
import { useAuth } from '../hooks/useAuth';
import TimetableCalendar from '../components/timetable/TimetableCalendar';

const TimetablePage: React.FC = () => {
  const { user } = useAuth();

  // Determine view mode based on user role
  const getViewMode = () => {
    if (!user) return 'all';
    
    switch (user.role) {
      case 'admin':
        return 'all';
      case 'teacher':
        return 'teacher';
      case 'student':
        return 'student';
      default:
        return 'all';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <TimetableCalendar viewMode={getViewMode()} />
      </div>
    </div>
  );
};

export default TimetablePage;
