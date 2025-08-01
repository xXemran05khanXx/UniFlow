import React from 'react';
import RoleBasedDashboard from '../components/dashboards/RoleBasedDashboard';

const DashboardPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <RoleBasedDashboard />
      </div>
    </div>
  );
};

export default DashboardPage;
