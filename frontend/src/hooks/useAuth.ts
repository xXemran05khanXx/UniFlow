import { useAppSelector } from './redux';

export const useAuth = () => {
  const { user, token, isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  
  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    isAdmin: user?.role === 'admin',
    isTeacher: user?.role === 'teacher',
    isStudent: user?.role === 'student',
  };
};
