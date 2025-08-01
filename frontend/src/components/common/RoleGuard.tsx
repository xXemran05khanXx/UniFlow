import React from 'react';
import { useAuth } from '../../hooks/useAuth';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: Array<'admin' | 'teacher' | 'student'>;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  fallback = null,
  showFallback = false
}): React.ReactElement | null => {
  const { user } = useAuth();

  if (!user) {
    if (showFallback) {
      return (
        <div className="text-center py-8">
          <h3 className="text-lg font-medium text-gray-900">Access Denied</h3>
          <p className="text-gray-600 mt-2">Please log in to access this content.</p>
        </div>
      );
    }
    return null;
  }

  if (!allowedRoles.includes(user.role)) {
    if (showFallback) {
      return (
        <>
          {fallback || (
            <div className="text-center py-8">
              <h3 className="text-lg font-medium text-gray-900">Access Restricted</h3>
              <p className="text-gray-600 mt-2">
                You don't have permission to access this content.
              </p>
            </div>
          )}
        </>
      );
    }
    return null;
  }

  return <>{children}</>;
};

export default RoleGuard;
