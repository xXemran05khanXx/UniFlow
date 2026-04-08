import React from 'react';
import { Provider } from 'react-redux';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Layout from './components/Layout';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { NotificationProvider } from './contexts/NotificationContext';
import { ToastProvider } from './contexts/ToastContext';
import { useAuth } from './hooks/useAuth';
import AdminMyTeachersPage from './pages/Admin/AdminMyTeachersPage';
import AdminSettingsPage from './pages/Admin/AdminSettingsPage';
import AdminSwapsPage from './pages/Admin/adminswap';
import DataManagementPage from './pages/Admin/DataManagementPage';
import RoomManagementPage from './pages/Admin/RoomManagementPage';
import SubjectManagementPage from './pages/Admin/SubjectManagementPage';
import UserManagementPage from './pages/Admin/UserManagementPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentMyTeachersPage from './pages/Student/StudentMyTeachersPage';
import StudentNotificationsPage from './pages/Student/StudentNotificationsPage';
import StudentProfilePage from './pages/Student/StudentProfilePage';
import StudentTimetablePage from './pages/Student/StudentTimetablePage';
import TimeSlotsPage from './pages/Timetable/TimeSlotsPage';
import TimetableGenerationPage from './pages/Timetable/TimetableGenerationPage';
import TimetablePage from './pages/Timetable/TimetablePage';
import { store } from './store';
import { initializeAuth } from './store/authSlice';
// ── Teacher portal ────────────────────────────────────────────────────────────
import TeacherDashboard from './components/dashboards/TeacherDashboard';
import TeacherAbsencePage from './pages/Teacher/Teacherabsencepage';
import TeacherClassesPage from './pages/Teacher/TeacherClassesPage';
import TeacherLayout from './pages/Teacher/Teacherlayout';
import TeacherProfilePage from './pages/Teacher/Teacherprofile';
import TeacherSchedulePage from './pages/Teacher/Teacherschedule';
import TeacherSettingsPage from './pages/Teacher/TeacherSetting';
import TeacherSwapPage from './pages/Teacher/Teacherswappage'; // ← your existing swap page
// ── Admin portal ──────────────────────────────────────────────────────────────
import AdminAbsencePage from './pages/Admin/Adminabsence';
// ── Shared / Student ──────────────────────────────────────────────────────────
import DaySubstituteTimetable from './pages/Timetable/Daysubstitute';
// ─────────────────────────────────────────────────────────────────────────────
import AdminMasterTimetable from './pages/Admin/Adminmaster';
// Any logged-in user
import TeacherFreeSlots from './pages/Teacher/TeacherFreeslot';
import TimetableEditorPage from './pages/Timetable/TimetableEdit';
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

// Admin-only guard
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (user?.role !== 'admin') return <Navigate to="/dashboard" />;
  return <>{children}</>;
};

// Teacher-only guard
const TeacherRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (user?.role !== 'teacher') return <Navigate to="/dashboard" />;
  return <>{children}</>;
};


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
              {/* ── Public ───────────────────────────────────────────────── */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* ── Substitute schedule — visible to all logged-in users ── */}
              <Route path="/substitute-schedule" element={
                <ProtectedRoute><Layout><DaySubstituteTimetable /></Layout></ProtectedRoute>
              } />
              <Route path="/substitute-schedule/:date" element={
                <ProtectedRoute><Layout><DaySubstituteTimetable /></Layout></ProtectedRoute>
              } />

              {/* ── Shared / Admin routes ─────────────────────────────────── */}
              <Route path="/" element={
                <ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>
              } />
              <Route path="/timetables" element={
                <ProtectedRoute><Layout><TimetablePage /></Layout></ProtectedRoute>
              } />
              <Route path="/data-management" element={
                <ProtectedRoute><Layout><DataManagementPage /></Layout></ProtectedRoute>
              } />
              <Route path="/user-management" element={
                <ProtectedRoute><Layout><UserManagementPage /></Layout></ProtectedRoute>
              } />

              {/* ── Admin: Swaps management ──────── */}
              <Route path="/admin/swaps" element={
                <AdminRoute><Layout><AdminSwapsPage /></Layout></AdminRoute>
              } />

              <Route path="/admin/master-timetable" element={
                <AdminRoute>
                  <Layout>
                    <AdminMasterTimetable />
                  </Layout>
                </AdminRoute>
              } />




              <Route
                path="/admin/timetable/edit/:id"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <TimetableEditorPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />



              <Route path="/admin/free-slots" element={<TeacherFreeSlots />} />

              <Route path="/subject-management" element={
                <ProtectedRoute><Layout><SubjectManagementPage /></Layout></ProtectedRoute>
              } />
              <Route path="/room-management" element={
                <ProtectedRoute><Layout><RoomManagementPage /></Layout></ProtectedRoute>
              } />
              <Route path="/time-slots" element={
                <ProtectedRoute><Layout><TimeSlotsPage /></Layout></ProtectedRoute>
              } />
              <Route path="/timetable-generation" element={
                <ProtectedRoute><Layout><TimetableGenerationPage /></Layout></ProtectedRoute>
              } />
              <Route path="/admin-settings" element={
                <ProtectedRoute><Layout><AdminSettingsPage /></Layout></ProtectedRoute>
              } />
              <Route path="/admin-teachers" element={
                <ProtectedRoute><Layout><AdminMyTeachersPage /></Layout></ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute><Layout><TeacherSettingsPage /></Layout></ProtectedRoute>
              } />

              {/* ── Admin: Absence management (inside shared Layout) ──────── */}
              <Route path="/admin/absences" element={
                <AdminRoute><Layout><AdminAbsencePage /></Layout></AdminRoute>
              } />

              {/* ── Old teacher flat routes (backward compat) ─────────────── */}
              <Route path="/teacher-timetable" element={
                <ProtectedRoute><Layout><TeacherSchedulePage /></Layout></ProtectedRoute>
              } />
              <Route path="/teacher-classes" element={
                <ProtectedRoute><Layout><TeacherClassesPage /></Layout></ProtectedRoute>
              } />
              <Route path="/teacher-settings" element={
                <ProtectedRoute><Layout><TeacherSettingsPage /></Layout></ProtectedRoute>
              } />

              {/* ── Student routes ────────────────────────────────────────── */}
              <Route path="/student-timetable" element={
                <ProtectedRoute><Layout><StudentTimetablePage /></Layout></ProtectedRoute>
              } />
              <Route path="/student-notifications" element={
                <ProtectedRoute><Layout><StudentNotificationsPage /></Layout></ProtectedRoute>
              } />
              <Route path="/student-profile" element={
                <ProtectedRoute><Layout><StudentProfilePage /></Layout></ProtectedRoute>
              } />
              <Route path="/student-teachers" element={
                <ProtectedRoute><Layout><StudentMyTeachersPage /></Layout></ProtectedRoute>
              } />

              {/* ── Teacher portal (/teacher/*) — inside TeacherLayout ──────
                  ALL teacher sub-pages live here so the sidebar is always shown.
                  TeacherRoute ensures only role==='teacher' can access.
              ─────────────────────────────────────────────────────────────── */}
              <Route
                path="/teacher"
                element={
                  <TeacherRoute>
                    <TeacherLayout />
                  </TeacherRoute>
                }
              >
                <Route index element={<TeacherDashboard />} />
                <Route path="dashboard" element={<TeacherDashboard />} />
                <Route path="schedule" element={<TeacherSchedulePage />} />
                <Route path="profile" element={<TeacherProfilePage />} />
                <Route path="classes" element={<TeacherClassesPage />} />
                <Route path="settings" element={<TeacherSettingsPage />} />
                {/* ✅ Swap & Absence now INSIDE TeacherLayout — sidebar visible */}
                <Route path="swaps" element={<TeacherSwapPage />} />
                <Route path="absences" element={<TeacherAbsencePage />} />
              </Route>

              {/* 404 fallback */}

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