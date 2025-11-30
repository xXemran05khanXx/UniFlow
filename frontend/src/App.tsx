import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { useAuth } from './hooks/useAuth';
import { initializeAuth } from './store/authSlice';
import { NotificationProvider } from './contexts/NotificationContext';
import { ToastProvider } from './contexts/ToastContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TimetablePage from './pages/Timetable/TimetablePage';
import TeacherTimetablePage from './pages/Teacher/TeacherTimetablePage';
import TeacherClassesPage from './pages/Teacher/TeacherClassesPage';
import TeacherSettingsPage from './pages/Teacher/TeacherSettingsPage';
import StudentTimetablePage from './pages/Student/StudentTimetablePage';
import StudentNotificationsPage from './pages/Student/StudentNotificationsPage';
import StudentProfilePage from './pages/Student/StudentProfilePage';
import StudentMyTeachersPage from './pages/Student/StudentMyTeachersPage';
import AdminMyTeachersPage from './pages/Admin/AdminMyTeachersPage';
import DataManagementPage from './pages/Admin/DataManagementPage';
import UserManagementPage from './pages/Admin/UserManagementPage';
import SubjectManagementPage from './pages/Admin/SubjectManagementPage';
import RoomManagementPage from './pages/Admin/RoomManagementPage';
import TimeSlotsPage from './pages/Timetable/TimeSlotsPage';
import TimetableGenerationPage from './pages/Timetable/TimetableGenerationPage';
import AdminSettingsPage from './pages/Admin/AdminSettingsPage';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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

  return (
    <NotificationProvider>
      <ToastProvider>
        <ToastContainer position="top-right" autoClose={3000} />
        {isLoading ? (
          <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
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
            path="/teacher-timetable"
            element={
              <ProtectedRoute>
                <Layout>
                  <TeacherTimetablePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher-classes"
            element={
              <ProtectedRoute>
                <Layout>
                  <TeacherClassesPage />
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
          <Route
            path="/time-slots"
            element={
              <ProtectedRoute>
                <Layout>
                  <TimeSlotsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/timetable-generation"
            element={
              <ProtectedRoute>
                <Layout>
                  <TimetableGenerationPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <AdminSettingsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-teachers"
            element={
              <ProtectedRoute>
                <Layout>
                  <AdminMyTeachersPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher-settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <TeacherSettingsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <TeacherSettingsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Student Routes - Placeholder pages for now */}
          <Route
            path="/student-timetable"
            element={
              <ProtectedRoute>
                <Layout>
                  <StudentTimetablePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student-notifications"
            element={
              <ProtectedRoute>
                <Layout>
                  <StudentNotificationsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student-profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <StudentProfilePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student-teachers"
            element={
              <ProtectedRoute>
                <Layout>
                  <StudentMyTeachersPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        </Router>
        )}
      </ToastProvider>
    </NotificationProvider>
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
