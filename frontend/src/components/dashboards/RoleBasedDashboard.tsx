import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import AdminDashboard from './AdminDashboard';
import TeacherDashboard from './TeacherDashboard';
import StudentDashboard from './StudentDashboard';
import LoadingSpinner from '../ui/LoadingSpinner';

const RoleBasedDashboard: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">No User Found</h2>
        <p className="text-gray-600 mt-2">Please log in to access the dashboard.</p>
      </div>
    );
  }

  // Render dashboard based on user role
  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'teacher':
      return <TeacherDashboard />;
    case 'student':
      return <StudentDashboard />;
    default:
      return (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900">Unknown Role</h2>
          <p className="text-gray-600 mt-2">Your user role is not recognized. Please contact support.</p>
        </div>
      );
  }
};

export default RoleBasedDashboard;
