import React, { useCallback, useEffect, useState } from 'react';
import {
  Users, Calendar, BookOpen, Settings, BarChart3,
  BadgeAlert, CheckCircle2, Clock, AlertTriangle,
  ArrowRight, RefreshCw, Send,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { usersAPI, timetablesAPI } from '../../services/api';
import { userManagementService, UserStats } from '../../services/userManagementService';
import { User, Timetable } from '../../types';
import './AdminDashboard.css';
import DailyOverridesPanel from '../dailyOverrides';
import AdminMyTeachersPage from '../../pages/Admin/Adminmaster'
// ─── Absence API helpers ──────────────────────────────────────────────────────

const BASE = '/api';

function authHeaders() {
  const t = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

interface AbsenceSummary {
  _id: string;
  absenceDate: string;
  dayOfWeek?: string;
  reason?: string;
  status: string;
  teacher?: { _id: string; user?: { name?: string } };
  affectedClasses?: { substituteStatus?: string }[];
}

async function fetchPendingAbsences(): Promise<AbsenceSummary[]> {
  try {
    const r = await fetch(`${BASE}/absences/admin?status=substitutes_suggested`, { headers: authHeaders() });
    const j = await r.json();
    return j.success ? j.data : [];
  } catch { return []; }
}

// ─── Types (unchanged) ────────────────────────────────────────────────────────

interface Department {
  id: string;
  name: string;
  code: string;
  totalStudents: number;
  totalTeachers: number;
  color: string;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ─── Absence Panel ────────────────────────────────────────────────────────────

function AbsencePanel() {
  const navigate = useNavigate();
  const [absences, setAbsences] = useState<AbsenceSummary[]>([]);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchPendingAbsences();
    setAbsences(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const total    = absences.length;
  const urgent   = absences.filter(a => {
    const d = new Date(a.absenceDate);
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    return d <= tomorrow;
  }).length;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#f97316,#ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BadgeAlert className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 leading-tight">Absence Requests</h3>
            {urgent > 0 && (
              <p className="text-xs text-red-600 font-medium">{urgent} need action today/tomorrow</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <Button size="sm" variant="outline" onClick={() => navigate('/admin/absences')}>
            View All
          </Button>
        </div>
      </div>

      {/* Mini stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Pending',  value: total,  color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Urgent',   value: urgent, color: '#ef4444', bg: '#fef2f2' },
          { label: 'Today',    value: absences.filter(a => new Date(a.absenceDate).toDateString() === new Date().toDateString()).length, color: '#6366f1', bg: '#eef2ff' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ background: bg, borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
            <p style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1, marginBottom: 2 }}>{value}</p>
            <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>{label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : absences.length === 0 ? (
        <div className="text-center py-6">
          <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-500">All clear — no pending absences</p>
        </div>
      ) : (
        <div className="space-y-2">
          {absences.slice(0, 4).map(a => {
            const pending  = a.affectedClasses?.filter(c => c.substituteStatus === 'pending').length ?? 0;
            const total    = a.affectedClasses?.length ?? 0;
            const isUrgent = (() => {
              const d = new Date(a.absenceDate);
              const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
              return d <= tomorrow;
            })();
            return (
              <div key={a._id}
                onClick={() => navigate('/admin/absences')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                  background: isUrgent ? '#fff7ed' : '#fafafa',
                  border: `1px solid ${isUrgent ? '#fed7aa' : '#f3f4f6'}`,
                  transition: 'box-shadow .15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,.07)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg,#f97316,#ef4444)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 13,
                }}>
                  {(a.teacher?.user?.name || 'T').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 13, color: '#111827', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.teacher?.user?.name || 'Unknown Teacher'}
                  </p>
                  <p style={{ fontSize: 11, color: '#9ca3af' }}>
                    {fmtDate(a.absenceDate)} · {a.dayOfWeek} · {total} class{total !== 1 ? 'es' : ''}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {pending > 0 ? (
                    <span style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                      {pending} unassigned
                    </span>
                  ) : (
                    <span style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                      ✓ Assigned
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {absences.length > 4 && (
            <button onClick={() => navigate('/admin/absences')}
              style={{ width: '100%', padding: '8px', borderRadius: 9, border: '1.5px dashed #e5e7eb', background: 'transparent', color: '#9ca3af', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              View {absences.length - 4} more <ArrowRight size={12} />
            </button>
          )}
        </div>
      )}

      {/* CTA */}
      <button onClick={() => navigate('/admin/absences')}
        style={{
          width: '100%', marginTop: 12, padding: '10px', borderRadius: 10, border: 'none',
          background: 'linear-gradient(135deg,#f97316,#ef4444)',
          color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          boxShadow: '0 4px 14px #ef444430',
        }}>
        <BadgeAlert size={14} />
        Manage Absences &amp; Assign Substitutes
      </button>
    </Card>
  );
}

// ─── Main AdminDashboard ──────────────────────────────────────────────────────

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalUsers: 0, totalTeachers: 0, totalStudents: 0,
    totalTimetables: 0, activeTimetables: 0,
    activeUsers: 0, inactiveUsers: 0,
    adminUsers: 0, teacherUsers: 0, studentUsers: 0, recentSignups: 0,
  });
  const [recentUsers,      setRecentUsers]      = useState<User[]>([]);
  const [recentTimetables, setRecentTimetables] = useState<Timetable[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [departments,      setDepartments]      = useState<Department[]>([]);

  const departmentColors: { [key: string]: string } = {
    'Computer Science':          'from-blue-500 to-cyan-500',
    'Information Technology':    'from-purple-500 to-pink-500',
    'First Year Engineering':    'from-green-500 to-lime-500',
    'IT': 'from-purple-500 to-pink-500',
    'CS': 'from-blue-500 to-cyan-500',
    'FE': 'from-green-500 to-lime-500',
  };

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const userStatsData = await userManagementService.getUserStats();
      let totalTimetables = 0, activeTimetables = 0;
      let recentUsersList: User[] = [];

      try {
        const usersResponse = await usersAPI.getAll();
        if (usersResponse.success && usersResponse.data) {
          recentUsersList = usersResponse.data.slice(-5).reverse();
          calculateDepartmentStats(usersResponse.data);
        }
      } catch { /* silent */ }

      try {
        const [statsRes, ttRes] = await Promise.all([
          timetablesAPI.getDashboardStats(),
          timetablesAPI.getAll(),
        ]);
        if (statsRes.success && statsRes.data) {
          totalTimetables  = statsRes.data.totalTimetables  || 0;
          activeTimetables = statsRes.data.activeTimetables || 0;
        }
        if (ttRes.success && ttRes.data) {
          const tts = ttRes.data;
          if (!statsRes.success || !statsRes.data) {
            totalTimetables  = tts.length;
            activeTimetables = tts.filter((t: Timetable) => String((t as any).status || '').toLowerCase() === 'published').length;
          }
          setRecentTimetables(tts.slice(-5).reverse());
        }
      } catch { /* silent */ }

      setStats({
        totalUsers:      userStatsData.totalUsers      || 0,
        activeUsers:     userStatsData.activeUsers     || 0,
        inactiveUsers:   userStatsData.inactiveUsers   || 0,
        adminUsers:      userStatsData.roles?.admins   || 0,
        totalTeachers:   userStatsData.roles?.teachers || 0,
        totalStudents:   userStatsData.roles?.students || 0,
        teacherUsers:    userStatsData.roles?.teachers || 0,
        studentUsers:    userStatsData.roles?.students || 0,
        recentSignups:   userStatsData.recentSignups   || 0,
        totalTimetables,
        activeTimetables,
      });
      setRecentUsers(recentUsersList);
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDepartmentStats = (users: User[]) => {
    const deptMap = new Map<string, { students: number; teachers: number }>();
    users.forEach((user: User) => {
      if (!user.department) return;
      let deptCode = '', deptName = '';
      if (typeof user.department === 'string') { deptName = user.department; deptCode = user.department; }
      else if (user.department && typeof user.department === 'object') {
        deptCode = (user.department as any).code || '';
        deptName = (user.department as any).name || '';
      }
      const deptKey = deptCode || deptName;
      if (!deptKey) return;
      if (!deptMap.has(deptKey)) deptMap.set(deptKey, { students: 0, teachers: 0 });
      const counts = deptMap.get(deptKey)!;
      if (user.role === 'student') counts.students++;
      else if (user.role === 'teacher') counts.teachers++;
    });

    const defaultDepts = [
      { id: 'cs', name: 'Computer Science',       code: 'CS', color: 'from-blue-500 to-cyan-500'   },
      { id: 'it', name: 'Information Technology', code: 'IT', color: 'from-purple-500 to-pink-500' },
      { id: 'fe', name: 'First Year Engineering', code: 'FE', color: 'from-green-500 to-lime-500'  },
    ];

    setDepartments(defaultDepts.map(dept => {
      let counts = { students: 0, teachers: 0 };
      deptMap.forEach((c, k) => {
        const nk = k.toLowerCase().trim();
        const nc = dept.code.toLowerCase();
        const nn = dept.name.toLowerCase();
        if (nk === nc || nk === nn || nk.includes(nc) || nn.includes(nk)) {
          counts.students += c.students;
          counts.teachers += c.teachers;
        }
      });
      return { id: dept.id, name: dept.name, code: dept.code, color: dept.color, totalStudents: counts.students, totalTeachers: counts.teachers };
    }));
  };

  const statCards = [
    { title: 'Total Users',        value: stats.totalUsers,        icon: Users,     color: 'bg-blue-500',   subtitle: `${stats.activeUsers} active` },
    { title: 'Teachers',           value: stats.totalTeachers,     icon: BookOpen,  color: 'bg-green-500',  subtitle: 'Faculty members' },
    { title: 'Students',           value: stats.totalStudents,     icon: Users,     color: 'bg-purple-500', subtitle: `${stats.recentSignups} new (30 days)` },
    { title: 'Active Timetables',  value: stats.activeTimetables,  icon: Calendar,  color: 'bg-orange-500', subtitle: `${stats.totalTimetables} total` },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your university's academic system</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="flex items-center" onClick={() => navigate('/admin-settings')}>
            <Settings className="h-4 w-4 mr-2" />Settings
          </Button>
        </div>
      </div>

      <div className="mt-8">
  <DailyOverridesPanel />
</div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500 font-medium">{stat.subtitle}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-full`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </Card>
            
          );
        })}
      </div>
      


      {/* Department Overview */}
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-2xl mr-4">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              Department Overview
            </h2>
            <p className="text-gray-600 text-lg">Comprehensive statistics and insights for all academic departments</p>
          </div>
          <Button variant="outline" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />View Analytics
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => (
            <Card key={dept.id} className="relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:scale-105 dept-card-glow border-0">
              <div className={`absolute inset-0 bg-gradient-to-br ${dept.color} opacity-15`} />
              <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${dept.color}`} />
              <div className="relative p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className={`p-3 rounded-2xl bg-gradient-to-br ${dept.color} shadow-lg`}>
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="text-center mb-4">
                  <h3 className="font-bold text-xl text-gray-900 mb-1">{dept.code}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{dept.name}</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="p-1 bg-blue-100 rounded"><Users className="h-4 w-4 text-blue-600" /></div>
                      <span className="text-gray-600 text-sm">Students</span>
                    </div>
                    <span className="font-bold text-lg text-gray-900">{dept.totalStudents}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="p-1 bg-purple-100 rounded"><BookOpen className="h-4 w-4 text-purple-600" /></div>
                      <span className="text-gray-600 text-sm">Faculty</span>
                    </div>
                    <span className="font-bold text-lg text-gray-900">{dept.totalTeachers}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">Ratio</div>
                    <div className="font-semibold text-sm text-gray-700">
                      {dept.totalTeachers > 0 ? `${Math.round(dept.totalStudents / dept.totalTeachers)}:1` : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>


      {/* ─── MAIN CONTENT ROW: Recent tables + Absence panel ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Users */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Users</h3>
            <Button variant="outline" size="sm" onClick={() => navigate('/user-management')}>View All</Button>
          </div>
          <div className="space-y-3">
            {recentUsers.map((user) => (
              <div key={user._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">{user.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  user.role === 'admin'   ? 'bg-red-100 text-red-800' :
                  user.role === 'teacher' ? 'bg-green-100 text-green-800' :
                  'bg-blue-100 text-blue-800'
                }`}>{user.role}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Timetables */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Timetables</h3>
            <Button variant="outline" size="sm" onClick={() => navigate('/timetables')}>View All</Button>
          </div>
          <div className="space-y-3">
            {recentTimetables.map((tt) => (
              <div key={tt._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{tt.name}</p>
                  <p className="text-sm text-gray-500">
                    {(() => {
                      const dept = (tt as any)?.department ?? (tt as any)?.studentGroup?.department;
                      const deptLabel = typeof dept === 'string' ? dept
                        : ((dept as any)?.code && (dept as any)?.name ? `${(dept as any).code} - ${(dept as any).name}` : ((dept as any)?.name || (dept as any)?.code || 'N/A'));
                      const sem = (tt as any)?.semester ?? ((tt as any)?.studentGroup?.year ? Number((tt as any).studentGroup.year) * 2 - 1 : null);
                      return `${deptLabel} - Semester ${sem ?? 'N/A'}`;
                    })()}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  String((tt as any)?.status || '').toLowerCase() === 'published' ? 'bg-green-100 text-green-800' :
                  String((tt as any)?.status || '').toLowerCase() === 'draft'     ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>{tt.status}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* ✅ Absence Management Panel — live data */}
        <AbsencePanel />
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  <Button variant="outline" className="flex items-center justify-center p-4 h-auto"
    onClick={() => navigate('/user-management')}>
    <Users className="h-5 w-5 mr-2" />Manage Users
  </Button>

  <Button variant="outline" className="flex items-center justify-center p-4 h-auto"
    onClick={() => navigate('/timetable-generation')}>
    <Calendar className="h-5 w-5 mr-2" />Create Timetable
  </Button>

  <Button variant="outline" className="flex items-center justify-center p-4 h-auto"
    onClick={() => navigate('/substitute-schedule')}>
    <BookOpen className="h-5 w-5 mr-2" />Sub Schedule
  </Button>

  {/* ✅ ADD THIS */}
  <Button variant="outline" className="flex items-center justify-center p-4 h-auto"
    onClick={() => navigate('/admin/master-timetable')}>
    <Calendar className="h-5 w-5 mr-2 text-blue-600" />
    Master Timetables
  </Button>

  {/* Existing */}
  <Button
    className="flex items-center justify-center p-4 h-auto bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 border-0"
    onClick={() => navigate('/admin/absences')}>
    <BadgeAlert className="h-5 w-5 mr-2" />Manage Absences
  </Button>
</div>
      </Card>
    </div>
  );
};

export default AdminDashboard;