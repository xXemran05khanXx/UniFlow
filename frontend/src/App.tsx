import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { useAuth } from './hooks/useAuth';
import { initializeAuth } from './store/authSlice';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TimetablePage from './pages/TimetablePage';
import DataManagementPage from './pages/DataManagementPage';
import UserManagementPage from './pages/UserManagementPage';
import SubjectManagementPage from './pages/SubjectManagementPage';
import RoomManagementPage from './pages/RoomManagementPage';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

// App Content Component (needs to be inside Provider)
const AppContent: React.FC = () => {
  const { isLoading } = useAuth();

  React.useEffect(() => {
    store.dispatch(initializeAuth());
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <DashboardPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <DashboardPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/timetables"
          element={
            <ProtectedRoute>
              <Layout>
                <TimetablePage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/data-management"
          element={
            <ProtectedRoute>
              <Layout>
                <DataManagementPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/user-management"
          element={
            <ProtectedRoute>
              <Layout>
                <UserManagementPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/subject-management"
          element={
            <ProtectedRoute>
              <Layout>
                <SubjectManagementPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/room-management"
          element={
            <ProtectedRoute>
              <Layout>
                <RoomManagementPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
