import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Calendar, Search, User, BookOpen,
  ChevronDown, ChevronRight, Users, Bell,
  Plus, X, Send, Loader2,
  CalendarCheck, AlertCircle, Check, Clock,
} from 'lucide-react';
import TeacherFreeSlots from '../Teacher/TeacherFree';
const API = 'http://localhost:5000/api';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface ScheduleEntry {
  _id?:        string;
  courseCode:  string;
  courseName?: string;
  teacherName: string;
  teacher?:    string | { _id: string };
  roomNumber:  string;
  dayOfWeek:   string;
  startTime:   string;
  endTime:     string;
  type:        'Theory' | 'Lab';
  division:    string;
  batch?:      string | null;
}

interface Timetable {
  _id:          string;
  name:         string;
  status:       string;
  academicYear?: number;
  studentGroup: {
    department?: { _id: string; name?: string; code?: string } | string;
    semester:    number | string;
    division:    string;
  };
  schedule: ScheduleEntry[];
}

interface Teacher {
  _id:          string;
  id?:          string;
  name?:        string;
  email?:       string;
  designation?: string;
  user?: { _id: string; name: string; email: string };
}

interface MeetingInvitee {
  teacher: { _id?: string; name?: string; user?: { name: string } } | string;
  status:  'pending' | 'accepted' | 'declined';
}

interface Meeting {
  _id:       string;
  title:     string;
  dayOfWeek: string;
  startTime: string;
  endTime:   string;
  venue?:    string;
  status:    'scheduled' | 'cancelled' | 'completed';
  invitees:  MeetingInvitee[];
}

interface SelectedSlot {
  day:   string;
  start: string;
  end:   string;
  label: string;
}

interface ToastState { msg: string; ok: boolean }

interface BusyEntry {
  start: string; end: string; code: string; type: string; room?: string;
}
type BusyMap = Record<string, BusyEntry[]>;

interface FreeSlotTeacherStatus {
  teacherId: string;
  name:      string;
  free:      boolean;
  clash:     string | null;
  source:    'timetable' | 'meeting' | null;
}

interface FreeSlotEntry {
  start: string; end: string; allFree: boolean;
  teacherStatuses: FreeSlotTeacherStatus[];
}
type FreeSlotData = Record<string, FreeSlotEntry[]>;

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const ALL_SLOTS = [
  { id: 1, start: '08:10', end: '10:00', label: '8:10–10:00',  kind: 'lab'    },
  { id: 2, start: '10:20', end: '11:15', label: '10:20–11:15', kind: 'theory' },
  { id: 3, start: '11:15', end: '12:10', label: '11:15–12:10', kind: 'theory' },
  { id: 4, start: '12:10', end: '13:05', label: '12:10–13:05', kind: 'theory' },
  { id: 5, start: '13:50', end: '14:45', label: '13:50–14:45', kind: 'theory' },
  { id: 6, start: '14:45', end: '15:40', label: '14:45–15:40', kind: 'theory' },
  { id: 7, start: '15:40', end: '16:35', label: '15:40–16:35', kind: 'theory' },
].sort((a, b) => a.start.localeCompare(b.start));

const toMin = (t: string) => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + m; };
const overlaps = (s1: string, e1: string, s2: string, e2: string) =>
  toMin(s1) < toMin(e2) && toMin(s2) < toMin(e1);

function authHdr(): Record<string, string> {
  const t = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

const teacherDisplayName = (t: Teacher | undefined): string =>
  t?.name || t?.user?.name || 'Unknown';

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR
// ─────────────────────────────────────────────────────────────────────────────
const AVATAR_COLORS: [string, string][] = [
  ['#EFF6FF','#1D4ED8'], ['#F0FDF4','#15803D'], ['#FDF4FF','#7E22CE'],
  ['#FFF7ED','#C2410C'], ['#FFF1F2','#BE123C'], ['#F0FDFA','#0F766E'],
];
const avatarColor = (name = '') => AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];

function Avatar({ name = '', size = 28, selected = false }: { name?: string; size?: number; selected?: boolean }) {
  const [bg, fg] = avatarColor(name);
  const inits = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: selected ? '#6366F1' : bg, color: selected ? '#fff' : fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, flexShrink: 0,
      border: selected ? '2px solid #6366F1' : `1.5px solid ${fg}25`,
      transition: 'all .15s', userSelect: 'none',
    }}>
      {inits || '?'}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS PILL
// ─────────────────────────────────────────────────────────────────────────────
type StatusKey = 'pending' | 'accepted' | 'declined' | 'scheduled' | 'cancelled';
function StatusPill({ status }: { status: string }) {
  const map: Record<StatusKey, { bg: string; color: string; label: string }> = {
    pending:   { bg: '#FFFBEB', color: '#A16207', label: 'Pending'   },
    accepted:  { bg: '#F0FDF4', color: '#15803D', label: 'Accepted'  },
    declined:  { bg: '#FFF1F2', color: '#BE123C', label: 'Declined'  },
    scheduled: { bg: '#EFF6FF', color: '#1D4ED8', label: 'Scheduled' },
    cancelled: { bg: '#F1F5F9', color: '#64748B', label: 'Cancelled' },
  };
  const s = map[status as StatusKey] || map.pending;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: toast.ok ? '#F0FDF4' : '#FFF1F2',
      color: toast.ok ? '#15803D' : '#B91C1C',
      border: `1px solid ${toast.ok ? '#BBF7D0' : '#FECACA'}`,
      borderRadius: 12, padding: '10px 18px', fontSize: 13, fontWeight: 600,
      boxShadow: '0 4px 20px rgba(0,0,0,.12)',
      display: 'flex', alignItems: 'center', gap: 8, animation: 'slideUp .3s ease',
    }}>
      {toast.ok ? <Check size={14}/> : <AlertCircle size={14}/>}
      {toast.msg}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FREE SLOT GRID  (used inside both MeetingScheduler and TeacherFreeSlots tab)
// ─────────────────────────────────────────────────────────────────────────────
interface FreeSlotGridProps {
  freeData:         FreeSlotData;
  selectedTeachers: Teacher[];
  onSelectSlot:     (slot: SelectedSlot) => void;
  selectedSlot:     SelectedSlot | null;
  compact?:         boolean;
}

function FreeSlotGrid({ freeData, selectedTeachers, onSelectSlot, selectedSlot, compact = false }: FreeSlotGridProps) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: compact ? 420 : 500, fontSize: compact ? 10 : 11 }}>
        <thead>
          <tr style={{ background: '#F8FAFC' }}>
            <th style={{ padding: compact ? '6px 10px' : '8px 12px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #E5E7EB', width: compact ? 80 : 90 }}>Time</th>
            {DAYS.map(d => (
              <th key={d} style={{ padding: compact ? '6px 4px' : '8px 8px', textAlign: 'center', fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #E5E7EB' }}>
                {d.slice(0, 3)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ALL_SLOTS.map((slot, ri) => (
            <tr key={slot.id} style={{ background: ri % 2 === 0 ? '#fff' : '#FAFAFA' }}>
              <td style={{ padding: compact ? '4px 10px' : '6px 12px', fontSize: 9, fontWeight: 600, color: '#374151', fontFamily: 'monospace', borderBottom: '1px solid #F1F5F9', whiteSpace: 'nowrap' }}>
                {slot.label}
              </td>
              {DAYS.map(day => {
                const slotData   = freeData[day]?.find(s => s.start === slot.start);
                const allFree    = slotData?.allFree;
                const partFree   = slotData && !allFree && slotData.teacherStatuses.some(t => t.free);
                const isSelected = selectedSlot?.day === day && selectedSlot?.start === slot.start;
                const freeCount  = slotData?.teacherStatuses.filter(t => t.free).length ?? 0;

                return (
                  <td key={day} style={{ padding: compact ? 3 : 4, borderBottom: '1px solid #F1F5F9', textAlign: 'center' }}>
                    {allFree ? (
                      <button onClick={() => onSelectSlot({ day, start: slot.start, end: slot.end, label: slot.label })}
                        style={{ width: '100%', padding: compact ? '4px 2px' : '6px 4px', borderRadius: 7,
                          background: isSelected ? '#6366F1' : '#F0FDF4',
                          border: isSelected ? '2px solid #6366F1' : '1.5px solid #86EFAC',
                          color: isSelected ? '#fff' : '#15803D',
                          fontSize: 9, fontWeight: 700, cursor: 'pointer', transition: 'all .12s', fontFamily: 'inherit' }}>
                        {isSelected ? '✓ Sel' : '✓ Free'}
                      </button>
                    ) : partFree ? (
                      <button onClick={() => onSelectSlot({ day, start: slot.start, end: slot.end, label: slot.label })}
                        title={slotData?.teacherStatuses.filter(t => !t.free).map(t => `${t.name}: ${t.clash}`).join('\n')}
                        style={{ width: '100%', padding: compact ? '4px 2px' : '6px 4px', borderRadius: 7,
                          background: isSelected ? '#FEF9C3' : '#FFFBEB',
                          border: isSelected ? '2px solid #EAB308' : '1.5px solid #FDE68A',
                          color: '#A16207', fontSize: 9, fontWeight: 600, cursor: 'pointer', transition: 'all .12s', fontFamily: 'inherit' }}>
                        {freeCount}/{selectedTeachers.length}
                      </button>
                    ) : (
                      <div title={slotData?.teacherStatuses.filter(t => !t.free).map(t => `${t.name}: ${t.clash}`).join('\n')}
                        style={{ padding: compact ? '4px 2px' : '6px 4px', borderRadius: 7, background: '#FFF1F2', border: '1.5px solid #FECACA' }}>
                        <span style={{ fontSize: 9, color: '#FCA5A5' }}>Busy</span>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: 12, padding: '8px 12px', fontSize: 9, color: '#6B7280', flexWrap: 'wrap' }}>
        {[
          { color: '#86EFAC', bg: '#F0FDF4', label: 'All free'    },
          { color: '#FDE68A', bg: '#FFFBEB', label: 'Partial'     },
          { color: '#FECACA', bg: '#FFF1F2', label: 'Busy'        },
          { color: '#6366F1', bg: '#6366F1', label: 'Selected'    },
        ].map(({ color, bg, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: bg, border: `1.5px solid ${color}` }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEACHER FREE SLOTS TAB  (embedded in right panel)
// Fetches from /api/meetings/free-slots which now pulls BOTH timetable + meetings
// ─────────────────────────────────────────────────────────────────────────────
interface TeacherFreeSlotsTabProps {
  teachers:         Teacher[];
  onOpenScheduler:  (preselectedTeachers: Teacher[], preselectedSlot: SelectedSlot | null) => void;
}

function TeacherFreeSlotsTab({ teachers, onOpenScheduler }: TeacherFreeSlotsTabProps) {
  const [searchQ,          setSearchQ]          = useState('');
  const [selectedTeachers, setSelectedTeachers] = useState<Teacher[]>([]);
  const [freeData,         setFreeData]         = useState<FreeSlotData | null>(null);
  const [loading,          setLoading]          = useState(false);
  const [selectedSlot,     setSelectedSlot]     = useState<SelectedSlot | null>(null);
  const [viewMode,         setViewMode]         = useState<'combined' | 'individual'>('combined');
  const [error,            setError]            = useState('');

  const filteredTeachers = useMemo(() =>
    teachers.filter(t => !searchQ || teacherDisplayName(t).toLowerCase().includes(searchQ.toLowerCase())),
  [teachers, searchQ]);

  const fetchFreeSlots = useCallback(async (selected: Teacher[]) => {
    if (!selected.length) { setFreeData(null); return; }
    setLoading(true);
    setError('');
    try {
      const ids  = selected.map(t => t._id || t.id).join(',');
      const res  = await fetch(`${API}/meetings/free-slots?teacherIds=${ids}`, { headers: authHdr() });
      const data = await res.json();
      if (data.success) setFreeData(data.data);
      else setError(data.message || 'Failed to load availability');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleTeacher = (t: Teacher) => {
    setSelectedTeachers(prev => {
      const next = prev.find(x => x._id === t._id)
        ? prev.filter(x => x._id !== t._id)
        : [...prev, t];
      setSelectedSlot(null);
      fetchFreeSlots(next);
      return next;
    });
  };

  const handleSelectSlot = (slot: SelectedSlot) => {
    setSelectedSlot(prev => prev?.day === slot.day && prev?.start === slot.start ? null : slot);
  };

  // ── Individual mode: per-teacher per-day columns ─────────────────────────
  const renderIndividualGrid = () => {
    if (!freeData) return null;
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #E5E7EB', width: 80 }}>Time</th>
              {DAYS.map(day =>
                selectedTeachers.map(t => (
                  <th key={`${day}-${t._id}`} style={{ padding: '4px 3px', textAlign: 'center', borderBottom: '2px solid #E5E7EB', minWidth: 44 }}>
                    <div style={{ fontSize: 8, color: '#94A3B8', textTransform: 'uppercase' }}>{day.slice(0, 3)}</div>
                    <Avatar name={teacherDisplayName(t)} size={16} />
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {ALL_SLOTS.map((slot, ri) => (
              <tr key={slot.id} style={{ background: ri % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                <td style={{ padding: '4px 10px', fontSize: 9, fontWeight: 600, color: '#374151', borderBottom: '1px solid #F1F5F9', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  {slot.label}
                </td>
                {DAYS.map(day =>
                  selectedTeachers.map(t => {
                    const entry  = freeData[day]?.find(s => s.start === slot.start);
                    const ts     = entry?.teacherStatuses.find(x => x.teacherId === (t._id || t.id));
                    const isFree = ts?.free ?? true;
                    const isMtg  = ts?.source === 'meeting';
                    const isSelected = selectedSlot?.day === day && selectedSlot?.start === slot.start;
                    return (
                      <td key={`${day}-${t._id}`} style={{ padding: 2, borderBottom: '1px solid #F1F5F9' }}>
                        {isMtg ? (
                          <div title={ts?.clash || ''} style={{ padding: '3px 2px', borderRadius: 5, background: '#EEF2FF', border: '1px solid #C7D2FE', fontSize: 8, color: '#4F46E5', textAlign: 'center' }}>Mtg</div>
                        ) : isFree ? (
                          <button onClick={() => handleSelectSlot({ day, start: slot.start, end: slot.end, label: slot.label })}
                            style={{ width: '100%', padding: '3px 2px', borderRadius: 5, fontSize: 8, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: '1px solid',
                              background: isSelected ? '#6366F1' : '#F0FDF4',
                              borderColor: isSelected ? '#6366F1' : '#86EFAC',
                              color: isSelected ? '#fff' : '#15803D' }}>✓</button>
                        ) : (
                          <div title={ts?.clash || ''} style={{ padding: '3px 2px', borderRadius: 5, background: '#FFF1F2', border: '1px solid #FECACA', fontSize: 8, color: '#EF4444', textAlign: 'center' }}>✕</div>
                        )}
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Teacher search + chips */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search teachers..."
            style={{ width: '100%', paddingLeft: 28, paddingRight: 10, paddingTop: 6, paddingBottom: 6, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 11, outline: 'none', fontFamily: 'inherit', background: '#F9FAFB', boxSizing: 'border-box' }} />
        </div>

        {/* Selected chips */}
        {selectedTeachers.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
            {selectedTeachers.map(t => (
              <div key={t._id} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 99, padding: '3px 7px 3px 5px', fontSize: 10, color: '#4338CA' }}>
                <Avatar name={teacherDisplayName(t)} size={16} selected />
                <span style={{ fontWeight: 600 }}>{teacherDisplayName(t).split(' ')[0]}</span>
                <button onClick={() => toggleTeacher(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#818CF8', padding: 0, lineHeight: 0 }}><X size={10} /></button>
              </div>
            ))}
          </div>
        )}

        {/* Teacher grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, maxHeight: 140, overflowY: 'auto' }}>
          {filteredTeachers.map(t => {
            const name       = teacherDisplayName(t);
            const isSelected = !!selectedTeachers.find(x => x._id === t._id);
            return (
              <button key={t._id} onClick={() => toggleTeacher(t)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px',
                background: isSelected ? '#EEF2FF' : '#F9FAFB',
                border: `1.5px solid ${isSelected ? '#6366F1' : '#E5E7EB'}`,
                borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              }}>
                <Avatar name={name} size={22} selected={isSelected} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: isSelected ? '#4338CA' : '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                  <div style={{ fontSize: 8, color: '#9CA3AF' }}>{t.designation || 'Faculty'}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid area */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {selectedTeachers.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF', padding: '32px 16px', textAlign: 'center' }}>
            <Users size={28} style={{ marginBottom: 8, color: '#D1D5DB' }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Select teachers</div>
            <div style={{ fontSize: 11, marginTop: 3 }}>Availability is pulled from<br/>timetables + scheduled meetings</div>
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '32px 0', color: '#6B7280', fontSize: 12 }}>
            <Loader2 size={14} style={{ animation: 'spin .8s linear infinite' }} /> Loading availability…
          </div>
        ) : error ? (
          <div style={{ padding: 16, fontSize: 11, color: '#EF4444' }}>{error}</div>
        ) : freeData ? (
          <div>
            {/* View mode toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} /> Sources: timetable + meetings
              </div>
              <div style={{ display: 'flex', gap: 3 }}>
                {(['combined', 'individual'] as const).map(m => (
                  <button key={m} onClick={() => setViewMode(m)} style={{
                    padding: '3px 9px', fontSize: 9, fontWeight: 600, borderRadius: 6,
                    background: viewMode === m ? '#4F46E5' : '#F3F4F6',
                    color: viewMode === m ? '#fff' : '#6B7280',
                    border: viewMode === m ? '1px solid #4F46E5' : '1px solid #E5E7EB',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>{m === 'combined' ? 'Combined' : 'Per Teacher'}</button>
                ))}
              </div>
            </div>

            {viewMode === 'combined'
              ? <FreeSlotGrid freeData={freeData} selectedTeachers={selectedTeachers} onSelectSlot={handleSelectSlot} selectedSlot={selectedSlot} compact />
              : renderIndividualGrid()
            }

            {/* Selected slot action banner */}
            {selectedSlot && (
              <div style={{ margin: '8px 12px 12px', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#1E1B4B', marginBottom: 2 }}>
                  {selectedSlot.day} · {selectedSlot.label}
                </div>
                <div style={{ fontSize: 10, color: '#6366F1', marginBottom: 8 }}>
                  {(() => {
                    const entry = freeData[selectedSlot.day]?.find(s => s.start === selectedSlot.start);
                    const free  = entry?.teacherStatuses.filter(ts => ts.free).length ?? 0;
                    return `${free}/${selectedTeachers.length} teacher${selectedTeachers.length > 1 ? 's' : ''} free`;
                  })()}
                </div>
                <button
                  onClick={() => onOpenScheduler(selectedTeachers, selectedSlot)}
                  style={{ width: '100%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 0', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <CalendarCheck size={12} /> Schedule Meeting Here
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MEETING SCHEDULER MODAL
// ─────────────────────────────────────────────────────────────────────────────
interface MeetingSchedulerProps {
  allTeachers:         Teacher[];
  onClose:             () => void;
  onCreated:           (meeting: Meeting) => void;
  preselectedTeachers?: Teacher[];
  preselectedSlot?:     SelectedSlot | null;
}
type FormKey = 'title' | 'description' | 'venue' | 'meetingDate';

function MeetingScheduler({ allTeachers, onClose, onCreated, preselectedTeachers = [], preselectedSlot = null }: MeetingSchedulerProps) {
  const [step,             setStep]         = useState<number>(preselectedSlot ? 3 : 1);
  const [selectedTeachers, setSelected]     = useState<Teacher[]>(preselectedTeachers);
  const [freeData,         setFreeData]     = useState<FreeSlotData | null>(null);
  const [loadingSlots,     setLoadingSlots] = useState(false);
  const [selectedSlot,     setSelectedSlot] = useState<SelectedSlot | null>(preselectedSlot);
  const [form,             setForm]         = useState<Record<FormKey, string>>({ title: '', description: '', venue: '', meetingDate: '' });
  const [saving,           setSaving]       = useState(false);
  const [toast,            setToast]        = useState<ToastState | null>(null);
  const [searchQ,          setSearchQ]      = useState('');

  const flash = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const filteredTeachers = allTeachers.filter(t =>
    !searchQ || teacherDisplayName(t).toLowerCase().includes(searchQ.toLowerCase())
  );

  const toggleTeacher = (t: Teacher) => {
    setSelected(prev => prev.find(x => x._id === t._id) ? prev.filter(x => x._id !== t._id) : [...prev, t]);
    setFreeData(null); setSelectedSlot(null);
  };

  const fetchFreeSlots = async () => {
    if (!selectedTeachers.length) return;
    setLoadingSlots(true);
    try {
      const ids  = selectedTeachers.map(t => t._id).join(',');
      const res  = await fetch(`${API}/meetings/free-slots?teacherIds=${ids}`, { headers: authHdr() });
      const data = await res.json();
      if (data.success) { setFreeData(data.data); setStep(2); }
      else flash(data.message || 'Failed to fetch slots', false);
    } catch (e) { flash((e as Error).message, false); }
    finally { setLoadingSlots(false); }
  };

  const handleSelectSlot = (slot: SelectedSlot) => { setSelectedSlot(slot); setStep(3); };

  const handleSubmit = async () => {
    if (!form.title.trim()) { flash('Please enter a meeting title', false); return; }
    if (!selectedSlot) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/meetings`, {
        method: 'POST', headers: authHdr(),
        body: JSON.stringify({
          title: form.title, description: form.description,
          dayOfWeek: selectedSlot.day, startTime: selectedSlot.start, endTime: selectedSlot.end,
          venue: form.venue || 'TBD', teacherIds: selectedTeachers.map(t => t._id),
          meetingDate: form.meetingDate || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) { onCreated(data.data); onClose(); }
      else flash(data.message || 'Error creating meeting', false);
    } catch (e) { flash((e as Error).message, false); }
    finally { setSaving(false); }
  };

  // Dynamic step label based on whether we jumped straight to step 3
  const stepLabel = preselectedSlot && step === 3
    ? 'Add meeting details'
    : step === 1 ? 'Select teachers' : step === 2 ? 'Pick a free slot' : 'Add meeting details';
  const totalSteps = preselectedSlot ? 1 : 3;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 860, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,.2)', animation: 'modalIn .2s ease' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', borderRadius: 12, width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CalendarCheck size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#0F172A' }}>Schedule a Meeting</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>
                {preselectedSlot
                  ? `${selectedTeachers.length} teacher${selectedTeachers.length !== 1 ? 's' : ''} · ${preselectedSlot.day} ${preselectedSlot.label}`
                  : `Step ${step} of 3 — ${stepLabel}`}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
            <X size={15} />
          </button>
        </div>

        {/* Progress bar (only shown in full 3-step flow) */}
        {!preselectedSlot && (
          <div style={{ height: 3, background: '#F1F5F9' }}>
            <div style={{ height: '100%', width: `${(step / 3) * 100}%`, background: 'linear-gradient(90deg,#6366F1,#8B5CF6)', transition: 'width .4s ease', borderRadius: 99 }} />
          </div>
        )}

        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {/* STEP 1 */}
          {step === 1 && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                  Select teachers to invite ({selectedTeachers.length} selected)
                </div>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                  <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search teachers..."
                    style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: '1px solid #E5E7EB', borderRadius: 9, fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: '#F9FAFB' }} />
                </div>
              </div>
              {selectedTeachers.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                  {selectedTeachers.map(t => (
                    <div key={t._id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 99, padding: '4px 10px 4px 6px' }}>
                      <Avatar name={teacherDisplayName(t)} size={20} selected />
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#4F46E5' }}>{teacherDisplayName(t)}</span>
                      <button onClick={() => toggleTeacher(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#818CF8', padding: 0, lineHeight: 0 }}><X size={11} /></button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                {filteredTeachers.map(t => {
                  const name = teacherDisplayName(t);
                  const isSelected = !!selectedTeachers.find(x => x._id === t._id);
                  return (
                    <button key={t._id} onClick={() => toggleTeacher(t)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: isSelected ? '#EEF2FF' : '#F9FAFB', border: `1.5px solid ${isSelected ? '#6366F1' : '#E5E7EB'}`, borderRadius: 11, cursor: 'pointer', textAlign: 'left', transition: 'all .12s', fontFamily: 'inherit' }}>
                      <Avatar name={name} size={32} selected={isSelected} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: isSelected ? '#4F46E5' : '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                        <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{t.designation || 'Faculty'}</div>
                      </div>
                      {isSelected && <Check size={14} color="#6366F1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && freeData && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 4 }}>
                Availability for {selectedTeachers.length} teacher{selectedTeachers.length > 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} color="#94A3B8" />
                Blocked times include both timetable classes and existing meetings
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                {selectedTeachers.map(t => (
                  <span key={t._id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#F1F5F9', borderRadius: 99, padding: '3px 9px 3px 5px', fontSize: 10 }}>
                    <Avatar name={teacherDisplayName(t)} size={16} /> {teacherDisplayName(t)}
                  </span>
                ))}
              </div>
              {loadingSlots ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '40px 0', color: '#6B7280', fontSize: 13 }}>
                  <Loader2 size={18} style={{ animation: 'spin .8s linear infinite' }} /> Checking availability…
                </div>
              ) : (
                <FreeSlotGrid freeData={freeData} selectedTeachers={selectedTeachers} onSelectSlot={handleSelectSlot} selectedSlot={selectedSlot} />
              )}
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && selectedSlot && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 14, padding: '16px 18px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Selected Slot</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>{selectedSlot.day}</div>
                  <div style={{ fontSize: 14, color: '#4F46E5', fontWeight: 600, marginTop: 2, fontFamily: 'monospace' }}>{selectedSlot.label}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Inviting</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedTeachers.map(t => (
                    <div key={t._id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F9FAFB', borderRadius: 9, padding: '8px 10px', border: '1px solid #F3F4F6' }}>
                      <Avatar name={teacherDisplayName(t)} size={28} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{teacherDisplayName(t)}</div>
                        <div style={{ fontSize: 10, color: '#9CA3AF' }}>{t.designation || 'Faculty'}</div>
                      </div>
                      <StatusPill status="pending" />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {([
                  { label: 'Meeting Title *', key: 'title'       as FormKey, type: 'text',     placeholder: 'e.g. Curriculum Review' },
                  { label: 'Description',     key: 'description' as FormKey, type: 'textarea',  placeholder: 'Agenda, notes...' },
                  { label: 'Venue / Room',    key: 'venue'       as FormKey, type: 'text',     placeholder: 'e.g. Room 201 or Zoom link' },
                  { label: 'Meeting Date',    key: 'meetingDate' as FormKey, type: 'date',     placeholder: '' },
                ]).map(({ label, key, type, placeholder }) => (
                  <div key={key}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.4, display: 'block', marginBottom: 5 }}>{label}</label>
                    {type === 'textarea' ? (
                      <textarea value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} rows={3}
                        style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 9, padding: '8px 11px', fontSize: 12, fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box', background: '#F9FAFB' }} />
                    ) : (
                      <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                        style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 9, padding: '8px 11px', fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: '#F9FAFB' }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => {
            if (preselectedSlot) { onClose(); return; }
            step > 1 ? setStep(s => s - 1) : onClose();
          }} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 9, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151', fontFamily: 'inherit' }}>
            {(preselectedSlot || step === 1) ? 'Cancel' : '← Back'}
          </button>

          {step === 1 && (
            <button onClick={fetchFreeSlots} disabled={selectedTeachers.length === 0 || loadingSlots}
              style={{ background: selectedTeachers.length ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : '#E5E7EB', color: selectedTeachers.length ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 9, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: selectedTeachers.length ? 'pointer' : 'not-allowed', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
              {loadingSlots ? <><Loader2 size={14} style={{ animation: 'spin .8s linear infinite' }} /> Checking…</> : <>Check Free Slots →</>}
            </button>
          )}
          {step === 2 && !selectedSlot && (
            <div style={{ fontSize: 12, color: '#6B7280' }}>← Click a green slot to proceed</div>
          )}
          {step === 3 && (
            <button onClick={handleSubmit} disabled={saving}
              style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 7 }}>
              {saving ? <><Loader2 size={14} style={{ animation: 'spin .8s linear infinite' }} /> Sending…</> : <><Send size={14} /> Send Invitations</>}
            </button>
          )}
        </div>
      </div>
      <Toast toast={toast} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MEETINGS LIST
// ─────────────────────────────────────────────────────────────────────────────
function MeetingsList({ meetings, onCancel, loading }: { meetings: Meeting[]; onCancel: (id: string) => void; loading: boolean; onRefresh: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6B7280', fontSize: 12, padding: '12px 0' }}>
          <Loader2 size={14} style={{ animation: 'spin .8s linear infinite' }} /> Loading meetings…
        </div>
      )}
      {!loading && meetings.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94A3B8' }}>
          <CalendarCheck size={28} style={{ margin: '0 auto 8px', display: 'block', color: '#D1D5DB' }} />
          <div style={{ fontSize: 13, fontWeight: 600 }}>No meetings scheduled</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Use the button above to schedule one.</div>
        </div>
      )}
      {meetings.map(m => {
        const accepted = m.invitees?.filter(i => i.status === 'accepted').length ?? 0;
        const declined = m.invitees?.filter(i => i.status === 'declined').length ?? 0;
        const total    = m.invitees?.length ?? 0;
        return (
          <div key={m._id} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: '12px 14px', borderLeft: m.status === 'cancelled' ? '3px solid #D1D5DB' : '3px solid #6366F1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: m.status === 'cancelled' ? '#9CA3AF' : '#0F172A', textDecoration: m.status === 'cancelled' ? 'line-through' : 'none' }}>{m.title}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3, fontFamily: 'monospace' }}>{m.dayOfWeek} · {m.startTime}–{m.endTime}</div>
                {m.venue && m.venue !== 'TBD' && <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>📍 {m.venue}</div>}
              </div>
              <StatusPill status={m.status} />
            </div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex' }}>
                {(m.invitees || []).slice(0, 5).map((inv, i) => {
                  const tObj = inv.teacher as { _id?: string; name?: string; user?: { name: string } };
                  const name = tObj?.name || tObj?.user?.name || '?';
                  return (
                    <div key={i} title={name} style={{ marginLeft: i > 0 ? -8 : 0, border: '2px solid #fff', borderRadius: '50%', zIndex: 5 - i }}>
                      <Avatar name={name} size={24} selected={inv.status === 'accepted'} />
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 10, color: '#6B7280', display: 'flex', gap: 8 }}>
                {accepted > 0 && <span style={{ color: '#15803D' }}>✓ {accepted} accepted</span>}
                {declined > 0 && <span style={{ color: '#BE123C' }}>✕ {declined} declined</span>}
                {total - accepted - declined > 0 && <span>{total - accepted - declined} pending</span>}
              </div>
              {m.status === 'scheduled' && (
                <button onClick={() => onCancel(m._id)}
                  style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: '#EF4444', background: '#FFF1F2', border: '1px solid #FECACA', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEACHER WEEK GRID
// ─────────────────────────────────────────────────────────────────────────────
function TeacherWeekGrid({ teacher, allTimetables, meetings }: { teacher: Teacher; allTimetables: Timetable[]; meetings: Meeting[] }) {
  const name = teacherDisplayName(teacher);
  const busyMap: BusyMap = Object.fromEntries(DAYS.map(d => [d, [] as BusyEntry[]]));

  allTimetables.forEach(tt => {
    (tt.schedule || []).forEach(slot => {
      const slotTeacherId = typeof slot.teacher === 'object' ? slot.teacher?._id : slot.teacher;
      const nameMatches   = slot.teacherName?.toLowerCase().includes(name.toLowerCase().trim());
      const idMatches     = slotTeacherId === teacher._id || slotTeacherId === teacher.id;
      if ((idMatches || nameMatches) && busyMap[slot.dayOfWeek]) {
        busyMap[slot.dayOfWeek].push({ start: slot.startTime, end: slot.endTime, code: slot.courseCode, type: slot.type, room: slot.roomNumber });
      }
    });
  });

  meetings.forEach(m => {
    if (m.status === 'cancelled') return;
    const inv = m.invitees?.find(i => {
      const tObj = i.teacher as { _id?: string };
      const tid  = tObj?._id || (i.teacher as string);
      return tid === teacher._id || tid === teacher.id;
    });
    if (inv && busyMap[m.dayOfWeek]) {
      busyMap[m.dayOfWeek].push({ start: m.startTime, end: m.endTime, code: '📅 Meeting', type: 'Meeting', room: m.venue });
    }
  });

  const allBusy = Object.values(busyMap).flat();
  const totalSlots = DAYS.length * ALL_SLOTS.length;
  const freeCount  = totalSlots - allBusy.length;
  const workingDays = new Set(Object.entries(busyMap).filter(([, v]) => (v as BusyEntry[]).length > 0).map(([k]) => k)).size;

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          { label: 'Sessions',     val: allBusy.length, color: '#4F46E5', bg: '#EEF2FF' },
          { label: 'Free slots',   val: freeCount,       color: '#15803D', bg: '#F0FDF4' },
          { label: 'Working days', val: workingDays,     color: '#A16207', bg: '#FFFBEB' },
        ].map(({ label, val, color, bg }) => (
          <div key={label} style={{ background: bg, borderRadius: 10, padding: '7px 14px', border: `1px solid ${color}20` }}>
            <div style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560, fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #E5E7EB', width: 100 }}>Slot</th>
              {DAYS.map(d => (
                <th key={d} style={{ padding: '8px 6px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #E5E7EB' }}>
                  {d.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_SLOTS.map((slot, ri) => (
              <tr key={slot.id} style={{ background: ri % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                <td style={{ padding: '5px 10px', fontSize: 10, fontWeight: 600, color: '#374151', borderBottom: '1px solid #F1F5F9', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{slot.label}</td>
                {DAYS.map(day => {
                  const sessions = (busyMap[day] as BusyEntry[])?.filter(b => overlaps(slot.start, slot.end, b.start, b.end)) || [];
                  const isBusy    = sessions.length > 0;
                  const isMeeting = sessions.some(s => s.type === 'Meeting');
                  return (
                    <td key={day} style={{ padding: 4, borderBottom: '1px solid #F1F5F9', verticalAlign: 'top' }}>
                      {isBusy ? sessions.map((s, i) => (
                        <div key={i} style={{ padding: '4px 6px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                          background: isMeeting ? '#EEF2FF' : s.type === 'Lab' ? '#FFF7ED' : '#F0F9FF',
                          color:      isMeeting ? '#4F46E5' : s.type === 'Lab' ? '#C2410C' : '#0369A1',
                          border:     `1px solid ${isMeeting ? '#C7D2FE' : s.type === 'Lab' ? '#FED7AA' : '#BAE6FD'}`,
                          marginBottom: 2, lineHeight: 1.4 }}>
                          {s.code}
                          {s.room && <div style={{ fontSize: 9, fontWeight: 400, opacity: 0.75, marginTop: 1 }}>🚪 {s.room}</div>}
                        </div>
                      )) : (
                        <div style={{ height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 20, height: 2, background: '#D1FAE5', borderRadius: 99 }} />
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION BELL
// ─────────────────────────────────────────────────────────────────────────────
function NotificationBell({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      position: 'relative', background: count > 0 ? '#EEF2FF' : '#F9FAFB',
      border: `1px solid ${count > 0 ? '#C7D2FE' : '#E5E7EB'}`, borderRadius: 9,
      padding: '7px 11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
      color: count > 0 ? '#4F46E5' : '#6B7280', fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
    }}>
      <Bell size={15} />
      Meetings
      {count > 0 && <span style={{ background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 99, lineHeight: 1.4 }}>{count}</span>}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
type RightTab = 'teacher' | 'freeslots' | 'meetings';

const AdminMasterTimetable: React.FC = () => {
  const [allTimetables,      setAllTimetables]      = useState<Timetable[]>([]);
  const [selectedTT,         setSelectedTT]         = useState<Timetable | null>(null);
  const [teachers,           setTeachers]           = useState<Teacher[]>([]);
  const [meetings,           setMeetings]           = useState<Meeting[]>([]);
  const [selectedTeacherId,  setSelectedTeacherId]  = useState<string>('');
  const [loading,            setLoading]            = useState(true);
  const [loadingMeetings,    setLoadingMeetings]    = useState(false);
  const [semFilter,          setSemFilter]          = useState('all');
  const [divFilter,          setDivFilter]          = useState('all');
  const [searchTerm,         setSearchTerm]         = useState('');
  const [expandedSems,       setExpandedSems]       = useState<Set<string>>(new Set(['1','2','3','4','5','6','7','8']));
  const [rightTab,           setRightTab]           = useState<RightTab>('teacher');
  const [showScheduler,      setShowScheduler]      = useState(false);
  const [schedulerTeachers,  setSchedulerTeachers]  = useState<Teacher[]>([]);
  const [schedulerSlot,      setSchedulerSlot]      = useState<SelectedSlot | null>(null);
  const [toast,              setToast]              = useState<ToastState | null>(null);

  const flash = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const loadMeetings = useCallback(async () => {
    setLoadingMeetings(true);
    try {
      const res  = await fetch(`${API}/meetings`, { headers: authHdr() });
      const data = await res.json();
      if (data.success) setMeetings(data.data || []);
    } catch (_) {}
    finally { setLoadingMeetings(false); }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [ttRes, teacherRes] = await Promise.all([
          fetch(`${API}/timetable/all-published`, { headers: authHdr() }),
          fetch(`${API}/teachers`,                { headers: authHdr() }),
        ]);
        const ttData      = await ttRes.json();
        const teacherData = await teacherRes.json();
        setAllTimetables(ttData.success ? ttData.data : []);
        setTeachers(teacherData.success ? (teacherData.data || []) : []);
      } catch (_) { flash('Failed to load data', false); }
      finally { setLoading(false); }
    })();
    loadMeetings();
  }, [loadMeetings]);

  const handleCancelMeeting = async (id: string) => {
    try {
      const res  = await fetch(`${API}/meetings/${id}/cancel`, { method: 'PATCH', headers: authHdr() });
      const data = await res.json();
      if (data.success) {
        setMeetings(prev => prev.map(m => m._id === id ? { ...m, status: 'cancelled' as const } : m));
        flash('Meeting cancelled');
      } else flash(data.message, false);
    } catch (e) { flash((e as Error).message, false); }
  };

  // Open scheduler — optionally pre-fill from Free Slots tab
  const openScheduler = (preTeachers: Teacher[] = [], preSlot: SelectedSlot | null = null) => {
    setSchedulerTeachers(preTeachers);
    setSchedulerSlot(preSlot);
    setShowScheduler(true);
  };

  const filteredTTs = useMemo(() => allTimetables.filter(tt => {
    const ttSem = String(tt.studentGroup?.semester || '');
    const ttDiv = String(tt.studentGroup?.division || '');
    return (semFilter === 'all' || ttSem === semFilter)
        && (divFilter === 'all' || ttDiv.toLowerCase() === divFilter.toLowerCase())
        && (searchTerm === '' || tt.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }), [allTimetables, semFilter, divFilter, searchTerm]);

  const timetablesBySemester = useMemo(() => {
    const groups: Record<string, Timetable[]> = {};
    filteredTTs.forEach(tt => {
      const sem = String(tt.studentGroup?.semester || 'Unknown');
      groups[sem] = [...(groups[sem] || []), tt];
    });
    return Object.keys(groups).sort((a, b) => Number(a) - Number(b)).map(sem => ({ sem, timetables: groups[sem] }));
  }, [filteredTTs]);

  const toggleSem = (sem: string) => {
    const next = new Set(expandedSems);
    next.has(sem) ? next.delete(sem) : next.add(sem);
    setExpandedSems(next);
  };

  const selectedTeacherObj = useMemo<Teacher | undefined>(
    () => teachers.find(t => t._id === selectedTeacherId || t.id === selectedTeacherId),
    [teachers, selectedTeacherId]
  );

  const isHighlighted = (session: ScheduleEntry) =>
    !!(selectedTeacherObj && session.teacherName?.toLowerCase().includes(teacherDisplayName(selectedTeacherObj).toLowerCase().trim()));

  const pendingMeetings = meetings.filter(m => m.status === 'scheduled').length;

  const RIGHT_TABS: { id: RightTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'teacher',   label: 'Teacher',   icon: <User size={12} /> },
    { id: 'freeslots', label: 'Free Slots', icon: <Clock size={12} /> },
    { id: 'meetings',  label: 'Meetings',  icon: <Bell size={12} />, badge: pendingMeetings > 0 ? pendingMeetings : undefined },
  ];

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',system-ui,sans-serif", background: '#F8FAFC', minHeight: '100vh' }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes modalIn { from { opacity:0; transform:scale(.97); } to { opacity:1; transform:scale(1); } }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:#F1F5F9; }
        ::-webkit-scrollbar-thumb { background:#CBD5E1; border-radius:3px; }
      `}</style>

      {/* TOP BAR */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ background: 'linear-gradient(135deg,#1E40AF,#3B82F6)', borderRadius: 14, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Calendar size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-.3px' }}>Master Timetables</h1>
            <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0' }}>
              {loading ? 'Loading…' : `${allTimetables.length} timetables · ${teachers.length} teachers`}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <NotificationBell count={pendingMeetings} onClick={() => setRightTab('meetings')} />
          <button onClick={() => openScheduler()}
            style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Schedule Meeting
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ display: 'flex', height: 'calc(100vh - 77px)', overflow: 'hidden' }}>

        {/* LEFT SIDEBAR */}
        <div style={{ width: 240, flexShrink: 0, background: '#fff', borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <BookOpen size={13} /> Directory
            </div>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', paddingLeft: 28, paddingRight: 10, paddingTop: 7, paddingBottom: 7, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 11, outline: 'none', fontFamily: 'inherit', background: '#F9FAFB', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <select value={semFilter} onChange={e => setSemFilter(e.target.value)}
                style={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 10, padding: '5px 6px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', background: '#F9FAFB' }}>
                <option value="all">All Sems</option>
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={String(s)}>Sem {s}</option>)}
              </select>
              <select value={divFilter} onChange={e => setDivFilter(e.target.value)}
                style={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 10, padding: '5px 6px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', background: '#F9FAFB' }}>
                <option value="all">All Divs</option>
                {['A','B','C'].map(d => <option key={d} value={d}>Div {d}</option>)}
              </select>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#9CA3AF', fontSize: 12 }}>Loading...</div>
            ) : timetablesBySemester.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#9CA3AF', fontSize: 12 }}>No timetables found</div>
            ) : timetablesBySemester.map(group => (
              <div key={group.sem} style={{ marginBottom: 4 }}>
                <button onClick={() => toggleSem(group.sem)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#374151', borderRadius: 7, fontFamily: 'inherit' }}>
                  Semester {group.sem}
                  {expandedSems.has(group.sem) ? <ChevronDown size={13} color="#9CA3AF" /> : <ChevronRight size={13} color="#9CA3AF" />}
                </button>
                {expandedSems.has(group.sem) && (
                  <div style={{ paddingLeft: 8, borderLeft: '2px solid #F1F5F9', marginLeft: 8 }}>
                    {group.timetables.map(tt => (
                      <button key={tt._id} onClick={() => setSelectedTT(tt)} style={{
                        width: '100%', textAlign: 'left', padding: '6px 8px', borderRadius: 8,
                        background: selectedTT?._id === tt._id ? '#EFF6FF' : 'transparent',
                        border: 'none', cursor: 'pointer', fontSize: 11,
                        color: selectedTT?._id === tt._id ? '#1D4ED8' : '#4B5563',
                        fontWeight: selectedTT?._id === tt._id ? 700 : 400,
                        display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', transition: 'all .1s',
                      }}>
                        <Users size={11} />
                        Div {tt.studentGroup.division} · {tt.studentGroup.semester}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CENTER */}
        <div style={{ flex: 1, overflow: 'auto', background: '#F8FAFC' }}>
          {selectedTT ? (
            <div style={{ padding: '20px', minWidth: 700 }}>
              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#0F172A' }}>{selectedTT.name}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                    Sem {selectedTT.studentGroup.semester} · Div {selectedTT.studentGroup.division} · {selectedTT.schedule.length} sessions
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, background: '#F0FDF4', color: '#15803D', border: '1px solid #DCFCE7', padding: '4px 12px', borderRadius: 99 }}>
                  {selectedTT.status}
                </span>
              </div>
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,.04)' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC' }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB', width: 110 }}>TIME</th>
                        {DAYS.map((d, i) => (
                          <th key={d} style={{ padding: '10px 8px', textAlign: 'center', fontSize: 10, fontWeight: 800, color: '#0F172A', borderBottom: '2px solid #E5E7EB', borderRight: i < DAYS.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                            {d.slice(0, 3).toUpperCase()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ALL_SLOTS.map((slot, ri) => (
                        <tr key={slot.id} style={{ background: ri % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                          <td style={{ padding: '8px 14px', borderBottom: '1px solid #F1F5F9', borderRight: '1px solid #F1F5F9', verticalAlign: 'top' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{slot.label}</div>
                            <span style={{ fontSize: 9, fontWeight: 700, background: slot.kind === 'lab' ? '#FEF3C7' : '#EFF6FF', color: slot.kind === 'lab' ? '#B45309' : '#1D4ED8', padding: '1px 6px', borderRadius: 99, display: 'inline-block', marginTop: 3 }}>
                              {slot.kind === 'lab' ? '🔬 Lab' : '📖 Theory'}
                            </span>
                          </td>
                          {DAYS.map((day, di) => {
                            const sessions = selectedTT.schedule.filter(s => s.dayOfWeek === day && s.startTime === slot.start);
                            return (
                              <td key={day} style={{ padding: 5, borderBottom: '1px solid #F1F5F9', borderRight: di < DAYS.length - 1 ? '1px solid #F1F5F9' : 'none', verticalAlign: 'top', minWidth: 120 }}>
                                {sessions.length === 0 ? (
                                  <div style={{ minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: 16, height: 1, background: '#E5E7EB' }} />
                                  </div>
                                ) : sessions.map((session, idx) => {
                                  const hl = isHighlighted(session);
                                  return (
                                    <div key={idx} style={{ padding: '6px 8px', borderRadius: 8, marginBottom: 3, background: hl ? '#EEF2FF' : '#F9FAFB', border: `1.5px solid ${hl ? '#6366F1' : '#E5E7EB'}`, boxShadow: hl ? '0 0 0 2px #C7D2FE' : 'none', transition: 'all .12s' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                                        <span style={{ fontSize: 11, fontWeight: 800, color: hl ? '#4F46E5' : '#0F172A', fontFamily: 'monospace' }}>{session.courseCode}</span>
                                        <span style={{ fontSize: 8, fontWeight: 700, background: session.type === 'Lab' ? '#FEF3C7' : '#EFF6FF', color: session.type === 'Lab' ? '#B45309' : '#1D4ED8', padding: '1px 5px', borderRadius: 99, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                          {session.type}
                                        </span>
                                      </div>
                                      <div style={{ fontSize: 10, color: '#6B7280', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        👤 {(session.teacherName || '').split(' ')[0]}
                                      </div>
                                      <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2 }}>🚪 {session.roomNumber}</div>
                                    </div>
                                  );
                                })}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF', textAlign: 'center', padding: 40 }}>
              <Calendar size={48} style={{ marginBottom: 14, color: '#D1D5DB', display: 'block' }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 6 }}>No Timetable Selected</div>
              <div style={{ fontSize: 13 }}>Pick one from the directory on the left</div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL — 3 tabs */}
        <div style={{ width: 320, flexShrink: 0, background: '#fff', borderLeft: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
            {RIGHT_TABS.map(({ id, label, icon, badge }) => (
              <button key={id} onClick={() => setRightTab(id)} style={{
                flex: 1, padding: '10px 4px', fontSize: 11, fontWeight: 600,
                color:      rightTab === id ? '#6366F1' : '#6B7280',
                background: rightTab === id ? '#F5F3FF' : 'transparent',
                border: 'none', borderBottom: rightTab === id ? '2px solid #6366F1' : '2px solid transparent',
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
                {icon} {label}
                {badge !== undefined && badge > 0 && (
                  <span style={{ background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 99 }}>{badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* Teacher tab */}
          {rightTab === 'teacher' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
                <select value={selectedTeacherId} onChange={e => setSelectedTeacherId(e.target.value)}
                  style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 9, fontSize: 12, padding: '8px 11px', outline: 'none', fontFamily: 'inherit', background: '#F9FAFB', cursor: 'pointer' }}>
                  <option value="">— Select a teacher —</option>
                  {teachers.map(t => (
                    <option key={t._id || t.id} value={t._id || t.id}>{teacherDisplayName(t)}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                {selectedTeacherObj ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, background: '#F9FAFB', borderRadius: 12, padding: '10px 12px', border: '1px solid #F3F4F6' }}>
                      <Avatar name={teacherDisplayName(selectedTeacherObj)} size={40} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{teacherDisplayName(selectedTeacherObj)}</div>
                        <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>{selectedTeacherObj.designation || 'Faculty'}</div>
                        {selectedTeacherObj.email && <div style={{ fontSize: 10, color: '#9CA3AF' }}>{selectedTeacherObj.email}</div>}
                      </div>
                    </div>
                    <TeacherWeekGrid teacher={selectedTeacherObj} allTimetables={allTimetables} meetings={meetings} />
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF', textAlign: 'center', padding: '40px 16px' }}>
                    <User size={32} style={{ marginBottom: 10, color: '#D1D5DB', display: 'block' }} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Select a teacher</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>See their full week including free slots and scheduled meetings</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Free Slots tab */}
          {rightTab === 'freeslots' && (
  <TeacherFreeSlots
  embedded={true}
  onOpenScheduler={(teachers: Teacher[], slot: any) => { 
    // This hooks directly into your existing Adminmaster state
    setSchedulerTeachers(teachers);      
    setSchedulerSlot(slot);
      setShowScheduler(true);
    }}
  />
)}

          {/* Meetings tab */}
          {rightTab === 'meetings' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Scheduled Meetings</div>
                <button onClick={() => openScheduler()}
                  style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 11px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Plus size={11} /> New
                </button>
              </div>
              <MeetingsList meetings={meetings} onCancel={handleCancelMeeting} onRefresh={loadMeetings} loading={loadingMeetings} />
            </div>
          )}
        </div>
      </div>

      {showScheduler && (
        <MeetingScheduler
          allTeachers={teachers}
          onClose={() => { setShowScheduler(false); setSchedulerTeachers([]); setSchedulerSlot(null); }}
          onCreated={(meeting: Meeting) => {
            setMeetings(prev => [meeting, ...prev]);
            setRightTab('meetings');
            flash(`Meeting "${meeting.title}" scheduled — ${meeting.invitees.length} teachers notified`);
            loadMeetings(); // refresh so free slots re-check picks up the new meeting
          }}
          preselectedTeachers={schedulerTeachers}
          preselectedSlot={schedulerSlot}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
};

export default AdminMasterTimetable;