/**
 * pages/DaySubstituteTimetable.tsx
 *
 * Student / public facing — shows the published substitute schedule for today
 * or any date the user selects.
 *
 * Route: /substitute-schedule  (or /substitute-schedule/:date)
 *
 * API:
 *   GET /api/absences/schedule/:date  → getDaySubstituteSchedule
 */

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle, ArrowRight, BookOpen, Calendar,
  CheckCircle2, Clock, MapPin, RefreshCw, Users,
} from 'lucide-react';

// ─── API ──────────────────────────────────────────────────────────────────────

const BASE = '/api';

function headers() {
  const t = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  return { ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

interface ScheduleEntry {
  absentTeacher?: string;
  absentTeacherId?: string;
  substituteTeacher?: string;
  substituteId?: string;
  course?: string;
  courseCode?: string;
  room?: string;
  startTime?: string;
  endTime?: string;
  type?: string;
  semester?: number;
  division?: string;
  batch?: string;
  date?: string;
  dayOfWeek?: string;
}

interface ScheduleResponse {
  success: boolean;
  date?: string;
  totalAbsent?: number;
  totalCovered?: number;
  message?: string;
  data: ScheduleEntry[];
}

async function fetchSchedule(date: string): Promise<ScheduleResponse> {
  const r = await fetch(`${BASE}/absences/schedule/${date}`, { headers: headers() });
  return r.json();
}

async function fetchOverrides(date: string) {
  const r = await fetch(`${BASE}/swaps/overrides/${date}`, { headers: headers() });
  return r.json();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function fmtDateLong(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function timeToMins(t?: string) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

const TYPE_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  Theory: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  Lab:    { bg: '#f5f3ff', text: '#5b21b6', border: '#ddd6fe' },
  Swap:   { bg: '#fff7ed', text: '#ea580c', border: '#ffedd5' },
};

// ─── Entry Card ───────────────────────────────────────────────────────────────

function EntryCard({ entry }: { entry: ScheduleEntry }) {
  const typeStyle = TYPE_COLOR[entry.type || ''] ?? { bg: '#f9fafb', text: '#374151', border: '#e5e7eb' };
  const isNow = (() => {
    const now = new Date();
    const start = timeToMins(entry.startTime);
    const end   = timeToMins(entry.endTime);
    const cur   = now.getHours() * 60 + now.getMinutes();
    return cur >= start && cur < end;
  })();

  return (
    <div style={{
      background: '#fff',
      border: `1.5px solid ${isNow ? '#4f46e5' : '#f3f4f6'}`,
      borderRadius: 14,
      padding: '16px 20px',
      display: 'grid',
      gridTemplateColumns: '72px 1fr auto',
      gap: 16,
      alignItems: 'center',
      boxShadow: isNow ? '0 0 0 3px #e0e7ff, 0 4px 20px rgba(79,70,229,.12)' : '0 1px 3px rgba(0,0,0,.05)',
      transition: 'transform .15s, box-shadow .15s',
      position: 'relative',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
    >
      {/* Live indicator */}
      {isNow && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          display: 'flex', alignItems: 'center', gap: 4,
          background: '#ecfdf5', color: '#059669', borderRadius: 99,
          padding: '2px 8px', fontSize: 11, fontWeight: 700,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
          NOW
        </div>
      )}

      {/* Time */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 17, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{entry.startTime}</p>
        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>to</p>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#6b7280' }}>{entry.endTime}</p>
      </div>

      {/* Course info */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{entry.course}</p>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af' }}>({entry.courseCode})</span>
          {entry.type && (
            <span style={{ background: typeStyle.bg, color: typeStyle.text, border: `1px solid ${typeStyle.border}`, borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
              {entry.type}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {entry.division && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 99, padding: '2px 8px', fontSize: 12, color: '#6b7280' }}>
              <Users size={10} />Div {entry.division}
            </span>
          )}
          {entry.semester && (
            <span style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 99, padding: '2px 8px', fontSize: 12, color: '#6b7280' }}>
              Sem {entry.semester}
            </span>
          )}
          {entry.batch && (
            <span style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 99, padding: '2px 8px', fontSize: 12, color: '#6b7280' }}>
              Batch {entry.batch}
            </span>
          )}
          {entry.room && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 99, padding: '2px 8px', fontSize: 12, color: '#6b7280' }}>
              <MapPin size={10} />Room {entry.room}
            </span>
          )}
        </div>

        {/* Teacher swap line */}
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, textDecoration: 'line-through', opacity: .7 }}>
            {entry.absentTeacher}
          </span>
          <ArrowRight size={12} color="#9ca3af" />
          <span style={{ fontSize: 12, color: '#059669', fontWeight: 700 }}>
            {entry.substituteTeacher}
          </span>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>(substitute)</span>
        </div>
      </div>

      {/* Status badge */}
      <div style={{ textAlign: 'right' }}>
        <span style={{ 
          display: 'inline-flex', alignItems: 'center', gap: 4, 
          background: entry.type === 'Swap' ? '#fff7ed' : '#ecfdf5', 
          color: entry.type === 'Swap' ? '#ea580c' : '#065f46', 
          borderRadius: 99, padding: '4px 10px', fontSize: 12, fontWeight: 600, 
          border: `1px solid ${entry.type === 'Swap' ? '#ffedd5' : '#a7f3d0'}`, 
          flexShrink: 0 
        }}>
          <CheckCircle2 size={12} />
          {entry.type === 'Swap' ? 'Swapped' : 'Covered'}
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DaySubstituteTimetable() {
  const [date,     setDate]     = useState(todayISO());
  const [response, setResponse] = useState<ScheduleResponse | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  async function load(d: string) {
    setLoading(true);
    setError('');
    try {
      // Fetch both Absences and Swaps at the same time
      const [absencesRes, overridesRes] = await Promise.all([
        fetchSchedule(d),
        fetchOverrides(d).catch(() => ({ success: false, data: [] })) // Fallback if swaps fail
      ]);

      let combinedData = absencesRes.data || [];

      // If we have swaps, format them to match the absence entries and add them to the list
      if (overridesRes.success && overridesRes.data && overridesRes.data.length > 0) {
        const swapEntries: ScheduleEntry[] = overridesRes.data.map((override: any) => ({
          absentTeacher: override.originalTeacher?.user?.name || 'Original Teacher',
          substituteTeacher: override.newTeacher?.user?.name || 'Swap Teacher',
          course: override.course?.name || 'Lecture Swap',          // <-- Added real course name
          courseCode: override.course?.courseCode || 'SWAP',        // <-- Added real course code
          room: override.room?.roomNumber || '',                    // <-- Added real room
          division: override.division || '', 
          startTime: override.startTime,
          endTime: override.endTime,
          type: 'Swap', 
        }));

        combinedData = [...combinedData, ...swapEntries];

        // Sort the combined list chronologically by start time
        combinedData.sort((a, b) => timeToMins(a.startTime) - timeToMins(b.startTime));
      }

      setResponse({
        ...absencesRes,
        data: combinedData,
        // Update the totals to include the swaps
        totalCovered: (absencesRes.totalCovered || 0) + (overridesRes.data?.length || 0)
      });
    } catch (err: any) {
      setError('Failed to load schedule. Please try again.');
    }
    setLoading(false);
  }

  useEffect(() => { load(date); }, [date]);

  const entries = response?.data ?? [];
  const isToday = date === todayISO();

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f8f9fc', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '28px 20px 60px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 28, animation: 'slideUp .4s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg, #4f46e5, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px #6366f144' }}>
                <Calendar size={20} color="#fff" />
              </div>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>Substitute Timetable</h1>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Today's updated class schedule with substitute teachers</p>
              </div>
            </div>
          </div>

          {/* Date picker + stats bar */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: '14px 18px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, animation: 'slideUp .45s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em' }}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                style={{ padding: '7px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#111827', background: '#fafafa', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }} />
              {!isToday && (
                <button onClick={() => setDate(todayISO())} style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Today
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {response && response.totalAbsent !== undefined && (
                <>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 18, fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{response.totalAbsent}</p>
                    <p style={{ fontSize: 11, color: '#9ca3af' }}>Absent</p>
                  </div>
                  <div style={{ width: 1, height: 30, background: '#f3f4f6' }} />
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 18, fontWeight: 800, color: '#059669', lineHeight: 1 }}>{response.totalCovered}</p>
                    <p style={{ fontSize: 11, color: '#9ca3af' }}>Covered</p>
                  </div>
                  <div style={{ width: 1, height: 30, background: '#f3f4f6' }} />
                </>
              )}
              <button onClick={() => load(date)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                <RefreshCw size={13} />Refresh
              </button>
            </div>
          </div>

          {/* Date heading */}
          <div style={{ marginBottom: 16, animation: 'slideUp .5s ease' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
              {isToday ? "Today's Schedule — " : ''}{fmtDateLong(date)}
            </h2>
            {entries.length > 0 && (
              <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>
                {entries.length} class{entries.length !== 1 ? 'es' : ''} with substitute teachers
              </p>
            )}
          </div>

          {/* Content */}
          <div style={{ animation: 'slideUp .55s ease' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ width: 36, height: 36, border: '3px solid #e0e7ff', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 12px' }} />
                <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading schedule…</p>
              </div>
            ) : error ? (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10, color: '#991b1b', fontSize: 14, fontWeight: 500 }}>
                <AlertTriangle size={18} />
                {error}
              </div>
            ) : entries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6' }}>
                <div style={{ width: 56, height: 56, background: '#ecfdf5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <CheckCircle2 size={24} color="#10b981" />
                </div>
                <p style={{ fontWeight: 700, fontSize: 15, color: '#374151', marginBottom: 4 }}>
                  No substitute classes {isToday ? 'today' : 'on this date'}
                </p>
                <p style={{ fontSize: 13, color: '#9ca3af' }}>
                  {isToday
                    ? 'All teachers are present. Your regular timetable applies.'
                    : 'No published substitute schedule for this date.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {entries.map((entry, i) => <EntryCard key={i} entry={entry} />)}
              </div>
            )}
          </div>

          {/* Legend */}
          {entries.length > 0 && (
            <div style={{ marginTop: 24, background: '#fff', border: '1px solid #f3f4f6', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', animation: 'slideUp .6s ease' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.05em' }}>Legend</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, textDecoration: 'line-through' }}>Teacher name</span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>= absent teacher</span>
              </div>
              <ArrowRight size={12} color="#9ca3af" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 12, color: '#059669', fontWeight: 700 }}>Teacher name</span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>= substitute teacher</span>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                <span style={{ fontSize: 12, color: '#9ca3af' }}>= currently ongoing class</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}