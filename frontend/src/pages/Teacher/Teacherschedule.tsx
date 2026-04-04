/**
 * pages/Teacher/TeacherSchedulePage.tsx
 *
 * Merged: Weekly schedule (day-tabs + stats) + Daily timetable (date-picker, timeline).
 * Two view modes toggled via a segmented control in the page header.
 */

import {
  AlertCircle,
  BookOpen,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FlaskConical,
  Info,
  MapPin,
  RefreshCw,
  Users,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { StatsGrid } from '../../components/common/StatsGrid';
import { useTeacherSchedule } from '../../hooks/useTeacherSchedule';
import { DayOfWeek, Session } from '../../types/teacher.types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DAYS: DayOfWeek[] = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

const DAY_SHORT: Record<DayOfWeek, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat',
};

type ViewMode = 'weekly' | 'daily';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DailyClass {
  startTime: string;
  endTime: string;
  course?: { name: string; courseCode: string };
  room?: { roomNumber: string };
  type?: string;
  division?: string;
  status: 'Regular' | 'Swapped In' | 'Substitute';
}

// ─────────────────────────────────────────────────────────────────────────────
// SessionCard (Weekly View)
// ─────────────────────────────────────────────────────────────────────────────

const SessionCard: React.FC<{ session: Session }> = ({ session }) => {
  const isLab = session.type === 'Lab';

  return (
    <div
      className={`
        border-l-4 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow
        ${isLab ? 'border-l-purple-500' : 'border-l-blue-500'}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide truncate">
            {session.courseCode}
          </p>
          <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
            {session.courseName}
          </p>
        </div>
        <span
          className={`
            shrink-0 text-xs font-medium px-2 py-0.5 rounded-full
            ${isLab ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}
          `}
        >
          {session.type}
        </span>
      </div>

      {/* Time */}
      <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium">{session.startTime} – {session.endTime}</span>
      </div>

      {/* Room */}
      {session.roomNumber && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>Room {session.roomNumber}{session.floor ? `, ${session.floor}F` : ''}</span>
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {session.department && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {session.department}
          </span>
        )}
        {session.semester && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            Sem {session.semester}
          </span>
        )}
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
          Div {session.division}
        </span>
        {session.batch && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            Batch {session.batch}
          </span>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DailyClassCard (Daily View)
// ─────────────────────────────────────────────────────────────────────────────

const getStatusStyles = (status: string) => {
  switch (status) {
    case 'Swapped In':
      return {
        card:   'bg-green-50/70 border-green-300',
        accent: 'bg-green-500',
        badge:  'bg-green-100 text-green-800 border-green-200',
      };
    case 'Substitute':
      return {
        card:   'bg-orange-50/70 border-orange-300',
        accent: 'bg-orange-500',
        badge:  'bg-orange-100 text-orange-800 border-orange-200',
      };
    default:
      return {
        card:   'bg-white border-gray-200',
        accent: 'bg-blue-500',
        badge:  'bg-blue-50 text-blue-700 border-blue-100',
      };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// WeeklyView
// ─────────────────────────────────────────────────────────────────────────────

interface WeeklyViewProps {
  todayName: DayOfWeek;
  statusFilter: 'Published' | 'Draft' | 'any';
  setStatusFilter: (v: 'Published' | 'Draft' | 'any') => void;
  yearFilter: string;
  setYearFilter: (v: string) => void;
}

const WeeklyView: React.FC<WeeklyViewProps> = ({
  todayName,
  statusFilter,
  setStatusFilter,
  yearFilter,
  setYearFilter,
}) => {
  const [activeDay, setActiveDay] = useState<DayOfWeek>(
    DAYS.includes(todayName) ? todayName : 'Monday',
  );

  const {
    teacher,
    weeklySchedule,
    weeklyStats,
    allSessions,
    loading,
    error,
    message,
    refetch,
  } = useTeacherSchedule({
    status:       statusFilter,
    academicYear: yearFilter ? Number(yearFilter) : undefined,
  });

  const activeSessions: Session[] = weeklySchedule[activeDay] ?? [];

  const statsConfig = weeklyStats
    ? [
        {
          title: 'Total Hours', value: `${weeklyStats.totalHours}h`,
          icon: Clock, color: 'bg-blue-500',
          change: `${weeklyStats.workingDays} working days`, changeType: 'neutral' as const,
        },
        {
          title: 'Total Sessions', value: weeklyStats.totalSessions,
          icon: Calendar, color: 'bg-green-500', changeType: 'neutral' as const,
        },
        {
          title: 'Theory Classes', value: weeklyStats.theoryClasses,
          icon: BookOpen, color: 'bg-indigo-500', changeType: 'neutral' as const,
        },
        {
          title: 'Lab Classes', value: weeklyStats.labClasses,
          icon: FlaskConical, color: 'bg-purple-500', changeType: 'neutral' as const,
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
        <div className="h-16 bg-gray-100 rounded-xl" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Teacher sub-info */}
      {teacher && (
        <p className="text-sm text-gray-500 -mt-3">
          {teacher.name} · {teacher.department ?? teacher.employeeId}
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700">Could not load schedule</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
            <button onClick={refetch} className="mt-2 text-sm text-red-600 underline font-medium">
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Info banner */}
      {!error && message && allSessions.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">{message}</p>
        </div>
      )}

      {/* Weekly stats */}
      {statsConfig.length > 0 && <StatsGrid stats={statsConfig} />}

      {/* Schedule Card */}
      <Card className="p-5">
        {/* Day tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5">
          {DAYS.map(day => {
            const count    = weeklySchedule[day]?.length ?? 0;
            const isActive = day === activeDay;
            const isToday  = day === todayName;

            return (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`
                  relative shrink-0 flex flex-col items-center px-4 py-2.5 rounded-xl
                  text-sm font-medium transition-all duration-200 min-w-[64px]
                  ${isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }
                `}
              >
                <span className={`text-xs font-semibold ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>
                  {DAY_SHORT[day]}
                </span>
                <span className="text-base font-bold leading-none mt-0.5">{count}</span>
                {isToday && (
                  <span className={`
                    absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2
                    bg-amber-400 ${isActive ? 'border-blue-600' : 'border-white'}
                  `} />
                )}
              </button>
            );
          })}
        </div>

        {/* Day label */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">
            {activeDay}
            {activeDay === todayName && (
              <span className="ml-2 text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                Today
              </span>
            )}
          </h3>
          <span className="text-sm text-gray-500">
            {activeSessions.length} session{activeSessions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Sessions */}
        {activeSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <Calendar className="h-10 w-10 text-gray-300 mb-2" />
            <p className="text-gray-400 text-sm font-medium">No classes on {activeDay}</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeSessions.map((session, idx) => (
              <SessionCard key={`${session.timetableId}-${idx}`} session={session} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DailyView
// ─────────────────────────────────────────────────────────────────────────────

const DailyView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    new Date().toISOString().split('T')[0],
  );
  const [classes, setClasses]   = useState<DailyClass[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    fetchDailySchedule(selectedDate);
  }, [selectedDate]);

  const fetchDailySchedule = async (dateStr: string) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res   = await fetch(`/api/teachers/daily-schedule/${dateStr}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setClasses(data.data);
      } else {
        setError(data.error || 'Failed to load schedule');
      }
    } catch {
      setError('Network error occurred while fetching schedule.');
    }
    setLoading(false);
  };

  const changeDays = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const displayDate = new Date(selectedDate).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="space-y-6">

      {/* Date Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div>
          <p className="text-sm text-gray-500">View your classes, substitutions, and swaps for any date.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => changeDays(-1)}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
            title="Previous Day"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors text-gray-700"
          >
            Today
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-gray-700"
          />

          <button
            onClick={() => changeDays(1)}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
            title="Next Day"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Date heading */}
      <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">{displayDate}</h2>
        {loading && (
          <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        )}
      </div>

      {/* Schedule list */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4" />
            <p className="font-medium">Loading schedule...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-5 rounded-xl flex items-center gap-3">
            <AlertCircle size={24} />
            <div>
              <p className="font-bold">Error loading schedule</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        ) : classes.length === 0 ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center">
            <CheckCircle2 size={56} className="mx-auto text-green-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-1">No Classes Scheduled</h3>
            <p className="text-gray-500">You have a free schedule for {displayDate}. Enjoy your day!</p>
          </div>
        ) : (
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
            {classes.map((cls, idx) => {
              const styles = getStatusStyles(cls.status);
              return (
                <div
                  key={idx}
                  className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                >
                  {/* Timeline dot */}
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white ${styles.accent} shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10`}>
                    <Clock size={16} className="text-white" />
                  </div>

                  {/* Card */}
                  <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] border p-5 rounded-2xl shadow-sm hover:shadow-md transition-all ${styles.card}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-gray-900">{cls.startTime}</span>
                        <span className="text-sm text-gray-400 font-medium">to</span>
                        <span className="text-lg font-black text-gray-600">{cls.endTime}</span>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${styles.badge}`}>
                        {cls.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-lg text-gray-800 mb-1">
                      {cls.course?.name || 'Unknown Subject'}
                    </h3>

                    <div className="flex flex-wrap gap-2 text-sm font-medium text-gray-600">
                      {cls.course?.courseCode && (
                        <span className="bg-white/60 border border-gray-200 px-2 py-1 rounded-md">
                          {cls.course.courseCode}
                        </span>
                      )}
                      {cls.type && (
                        <span className="flex items-center gap-1 bg-white/60 border border-gray-200 px-2 py-1 rounded-md">
                          <BookOpen size={14} className="text-gray-400" /> {cls.type}
                        </span>
                      )}
                      <span className="flex items-center gap-1 bg-white/60 border border-gray-200 px-2 py-1 rounded-md">
                        <MapPin size={14} className="text-gray-400" /> Room {cls.room?.roomNumber || 'TBD'}
                      </span>
                      {cls.division && (
                        <span className="bg-white/60 border border-gray-200 px-2 py-1 rounded-md">
                          Div {cls.division}
                        </span>
                      )}
                    </div>

                    {cls.status === 'Substitute' && (
                      <p className="mt-3 text-xs text-orange-700 bg-orange-100/50 p-2 rounded border border-orange-200/50">
                        You are covering this class for an absent teacher.
                      </p>
                    )}
                    {cls.status === 'Swapped In' && (
                      <p className="mt-3 text-xs text-green-700 bg-green-100/50 p-2 rounded border border-green-200/50">
                        You agreed to swap and take this class.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

const TeacherSchedulePage: React.FC = () => {
  const todayName = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
  }) as DayOfWeek;

  const [viewMode,     setViewMode]     = useState<ViewMode>('weekly');
  const [statusFilter, setStatusFilter] = useState<'Published' | 'Draft' | 'any'>('Published');
  const [yearFilter,   setYearFilter]   = useState('');

  // refetch is only relevant for the weekly view; we keep it available via a ref approach
  // by letting WeeklyView manage its own data. The refresh button triggers a re-mount key trick.
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {viewMode === 'weekly'
              ? <Calendar className="h-6 w-6 text-blue-600" />
              : <CalendarDays className="h-6 w-6 text-blue-600" />
            }
            My Schedule
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">

          {/* View mode toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('weekly')}
              className={`
                px-3 py-1.5 rounded-md text-sm font-medium transition-all
                ${viewMode === 'weekly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }
              `}
            >
              Weekly
            </button>
            <button
              onClick={() => setViewMode('daily')}
              className={`
                px-3 py-1.5 rounded-md text-sm font-medium transition-all
                ${viewMode === 'daily'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }
              `}
            >
              Daily
            </button>
          </div>

          {/* Filters (weekly only) */}
          {viewMode === 'weekly' && (
            <>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
                className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
                <option value="any">All</option>
              </select>

              <input
                type="number"
                placeholder="Year e.g. 2025"
                value={yearFilter}
                onChange={e => setYearFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-700 w-36 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />

              <Button variant="outline" onClick={() => setRefreshKey(k => k + 1)} title="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── View ─────────────────────────────────────────────────────────────── */}
      {viewMode === 'weekly' ? (
        <WeeklyView
          key={refreshKey}
          todayName={todayName}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          yearFilter={yearFilter}
          setYearFilter={setYearFilter}
        />
      ) : (
        <DailyView />
      )}
    </div>
  );
};

export default TeacherSchedulePage;