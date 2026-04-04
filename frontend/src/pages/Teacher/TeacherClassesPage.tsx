/**
 * pages/Teacher/TeacherClassesPage.tsx
 * Shows all unique courses/classes the teacher is assigned to,
 * grouped by type (Theory / Lab) with session details.
 * Data comes from GET /api/teachers/my-schedule — no extra API needed.
 */

import {
  BookOpen,
  Calendar,
  Clock,
  FlaskConical,
  GraduationCap,
  MapPin,
  Search,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useTeacherSchedule } from '../../hooks/useTeacherSchedule';
import { Session } from '../../types/teacher.types';
import Card from '../../components/ui/Card';

// ── Group sessions by courseCode ──────────────────────────────────────────────

interface CourseGroup {
  courseCode: string;
  courseName: string;
  type: 'Theory' | 'Lab';
  credits: number;
  sessions: Session[];
  departments: string[];
  semesters: number[];
  divisions: string[];
  totalHours: number;
}

function groupByCourse(sessions: Session[]): CourseGroup[] {
  const map = new Map<string, CourseGroup>();

  sessions.forEach(s => {
    const key = s.courseCode || s.courseName;
    if (!map.has(key)) {
      map.set(key, {
        courseCode:  s.courseCode,
        courseName:  s.courseName,
        type:        s.type,
        credits:     s.credits,
        sessions:    [],
        departments: [],
        semesters:   [],
        divisions:   [],
        totalHours:  0,
      });
    }
    const group = map.get(key)!;
    group.sessions.push(s);

    if (s.department && !group.departments.includes(s.department))
      group.departments.push(s.department);
    if (s.semester && !group.semesters.includes(s.semester))
      group.semesters.push(s.semester);
    if (s.division && !group.divisions.includes(s.division))
      group.divisions.push(s.division);

    const [sh, sm] = s.startTime.split(':').map(Number);
    const [eh, em] = s.endTime.split(':').map(Number);
    group.totalHours += ((eh * 60 + em) - (sh * 60 + sm)) / 60;
  });

  return Array.from(map.values()).sort((a, b) =>
    a.courseCode.localeCompare(b.courseCode)
  );
}

// ── Course Card ───────────────────────────────────────────────────────────────

const CourseCard: React.FC<{ course: CourseGroup }> = ({ course }) => {
  const [expanded, setExpanded] = useState(false);
  const isLab = course.type === 'Lab';

  return (
    <Card className="p-0 overflow-hidden">
      {/* Header */}
      <div
        className={`p-5 border-l-4 cursor-pointer hover:bg-gray-50 transition-colors
          ${isLab ? 'border-l-purple-500' : 'border-l-blue-500'}`}
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`p-2 rounded-lg shrink-0 ${isLab ? 'bg-purple-100' : 'bg-blue-100'}`}>
              {isLab
                ? <FlaskConical className={`h-5 w-5 ${isLab ? 'text-purple-600' : 'text-blue-600'}`} />
                : <BookOpen     className="h-5 w-5 text-blue-600" />
              }
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {course.courseCode}
              </p>
              <h3 className="font-semibold text-gray-900 leading-tight truncate">
                {course.courseName}
              </h3>
              <div className="flex flex-wrap gap-2 mt-1.5">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                  ${isLab ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                  {course.type}
                </span>
                {course.credits > 0 && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {course.credits} credits
                  </span>
                )}
                {course.departments.map(d => (
                  <span key={d} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="shrink-0 text-right">
            <p className="text-2xl font-bold text-gray-900">{course.sessions.length}</p>
            <p className="text-xs text-gray-500">sessions/week</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {Math.round(course.totalHours * 10) / 10}h total
            </p>
          </div>
        </div>

        {/* Semester + Division pills */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {course.semesters.map(sem => (
            <span key={sem} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              <GraduationCap className="h-3 w-3" />
              Sem {sem}
            </span>
          ))}
          {course.divisions.map(div => (
            <span key={div} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              Div {div}
            </span>
          ))}
        </div>

        {/* Expand hint */}
        <p className="text-xs text-gray-400 mt-2">
          {expanded ? '▲ Hide sessions' : '▼ Show all sessions'}
        </p>
      </div>

      {/* Expanded session list */}
      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {course.sessions.map((s, idx) => (
            <div key={idx} className="px-5 py-3 flex flex-wrap items-center gap-4 bg-gray-50">
              <span className="flex items-center gap-1 text-sm text-gray-700 font-medium">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                {s.dayOfWeek}
              </span>
              <span className="flex items-center gap-1 text-sm text-gray-600">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                {s.startTime} – {s.endTime}
              </span>
              {s.roomNumber && (
                <span className="flex items-center gap-1 text-sm text-gray-600">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" />
                  Room {s.roomNumber}{s.floor ? `, ${s.floor}F` : ''}
                </span>
              )}
              {s.batch && (
                <span className="text-xs bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                  Batch {s.batch}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const TeacherClassesPage: React.FC = () => {
  const { allSessions, weeklyStats, loading, error } = useTeacherSchedule();
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState<'All' | 'Theory' | 'Lab'>('All');

  const courses = useMemo(() => groupByCourse(allSessions), [allSessions]);

  const filtered = useMemo(() => courses.filter(c => {
    const matchesFilter = filter === 'All' || c.type === filter;
    const matchesSearch =
      c.courseName.toLowerCase().includes(search.toLowerCase()) ||
      c.courseCode.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  }), [courses, filter, search]);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-40 bg-gray-200 rounded-lg" />
        <div className="h-12 bg-gray-100 rounded-xl" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-xl" />
        ))}
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Classes</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {courses.length} course{courses.length !== 1 ? 's' : ''} · {allSessions.length} sessions/week
          {weeklyStats ? ` · ${weeklyStats.totalHours}h total` : ''}
        </p>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by course name or code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden bg-white">
          {(['All', 'Theory', 'Lab'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium transition-colors
                ${filter === f
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Course list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">
            {search || filter !== 'All' ? 'No courses match your search' : 'No classes assigned yet'}
          </p>
          {(search || filter !== 'All') && (
            <button
              onClick={() => { setSearch(''); setFilter('All'); }}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(course => (
            <CourseCard key={course.courseCode} course={course} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherClassesPage;