import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Users, Calendar, Search, CheckCircle2,
  XCircle, AlertCircle, Zap, Filter, RefreshCw, Send
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES  — shaped to match what your Express routes actually return
// ─────────────────────────────────────────────────────────────────────────────

/** One entry inside weeklySchedule[day] from /timetable/teacher-detail/:id */
interface TeacherScheduleEntry {
  startTime:   string;
  endTime:     string;
  dayOfWeek?:  string;   // injected by us from the object key
  courseCode?: string;
  type?:       string;
}

/**
 * Shape of the "data" object inside:
 *   GET /api/timetable/teacher-detail/:id
 *   → { success, data: TeacherDetailResponse }
 */
interface TeacherDetailResponse {
  teacher: { _id: string; name: string; email?: string };
  weeklySchedule: Record<string, TeacherScheduleEntry[]>;   // key = day name
  freeSlots: Array<{ day: string; slot: { start: string; end: string; label: string } }>;
  weeklyStats: {
    totalSessions: number;
    theoryClasses: number;
    labClasses:    number;
    totalHours:    number;
  };
}

/**
 * Shape of one item in the array from:
 *   GET /api/timetable/teachers
 *   → { success, data: TeacherListItem[] }
 * NOTE: the backend returns "id" (not "_id")
 */
interface TeacherListItem {
  id:           string;
  name:         string;
  email?:       string;
  department?:  string;
  totalClasses: number;
}

/** Internal normalised shape */
interface Teacher {
  _id:          string;
  name:         string;
  email?:       string;
  department?:  string;
  totalClasses: number;
}

interface MeetingSlot {
  day:               string;
  start:             string;
  end:               string;
  label:             string;
  availableTeachers: string[];
  busyTeachers:      string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const BASE = '/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ALL_SLOTS = [
  { start: '08:10', end: '10:00', label: '8:10 – 10:00'  },
  { start: '10:20', end: '11:15', label: '10:20 – 11:15' },
  { start: '11:15', end: '12:10', label: '11:15 – 12:10' },
  { start: '12:10', end: '13:05', label: '12:10 – 13:05' },
  { start: '13:50', end: '14:45', label: '13:50 – 14:45' },
  { start: '14:45', end: '15:40', label: '14:45 – 15:40' },
  { start: '15:40', end: '16:35', label: '15:40 – 16:35' },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function authHeaders(): Record<string, string> {
  const t = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const overlaps   = (s1: string, e1: string, s2: string, e2: string) => toMin(s1) < toMin(e2) && toMin(s2) < toMin(e1);
const isSlotFree = (sessions: TeacherScheduleEntry[], day: string, slotStart: string, slotEnd: string) =>
  !sessions.some(s => s.dayOfWeek === day && overlaps(slotStart, slotEnd, s.startTime, s.endTime));

// ─────────────────────────────────────────────────────────────────────────────
// HEAT CELL
// ─────────────────────────────────────────────────────────────────────────────
const HeatCell: React.FC<{ free: boolean; selected: boolean; onClick: () => void }> = ({ free, selected, onClick }) => (
  <div
    onClick={onClick}
    title={free ? 'Free' : 'Has class'}
    style={{
      cursor: 'pointer', minHeight: 44,
      background:     selected ? (free ? '#bbf7d0' : '#fecaca') : (free ? '#f0fdf4' : '#fff5f5'),
      borderBottom:   '1px solid #f3f4f6', borderLeft: '1px solid #f3f4f6',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all .12s', position: 'relative',
    }}
    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'scale(1.12)'; el.style.zIndex = '10'; el.style.boxShadow = '0 2px 10px rgba(0,0,0,.12)'; }}
    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'scale(1)';    el.style.zIndex = '1';  el.style.boxShadow = 'none'; }}
  >
    <div style={{
      width: 20, height: 20, borderRadius: 5,
      background: free ? (selected ? '#16a34a' : '#4ade80') : (selected ? '#dc2626' : '#fca5a5'),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {free ? <CheckCircle2 size={11} color="#fff" /> : <XCircle size={11} color="#fff" />}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MEETING CARD
// ─────────────────────────────────────────────────────────────────────────────
const MeetingCard: React.FC<{ slot: MeetingSlot; total: number; isSelected: boolean; onSelect: () => void }> = ({ slot, total, isSelected, onSelect }) => {
  const pct    = total > 0 ? Math.round((slot.availableTeachers.length / total) * 100) : 0;
  const isFull = slot.availableTeachers.length === total && total > 0;
  return (
    <div onClick={onSelect} style={{
      padding: '12px 14px', borderRadius: 12, cursor: 'pointer', transition: 'all .15s',
      position: 'relative', overflow: 'hidden',
      border:      `2px solid ${isSelected ? '#6366f1' : isFull ? '#bbf7d0' : '#e5e7eb'}`,
      background:  isSelected ? '#eef2ff' : isFull ? '#f0fdf4' : '#fafafa',
    }}>
      {isFull && (
        <div style={{ position: 'absolute', top: 6, right: 8, background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 99 }}>
          ✓ ALL FREE
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
        <div style={{ padding: '3px 8px', borderRadius: 7, background: '#ede9fe', color: '#6d28d9', fontSize: 10, fontWeight: 800 }}>
          {slot.day.substring(0, 3).toUpperCase()}
        </div>
        <span style={{ fontWeight: 700, fontSize: 12, color: '#111827' }}>{slot.label}</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: '#e5e7eb', marginBottom: 6, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, transition: 'width .3s', background: pct === 100 ? 'linear-gradient(90deg,#16a34a,#4ade80)' : 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />
      </div>
      <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>
        <span style={{ fontWeight: 700, color: '#111827' }}>{slot.availableTeachers.length}</span>/{total} free
        {slot.busyTeachers.length > 0 && (
          <span style={{ color: '#ef4444', marginLeft: 6 }}>
            · {slot.busyTeachers.slice(0, 2).join(', ')}{slot.busyTeachers.length > 2 ? ` +${slot.busyTeachers.length - 2}` : ''} busy
          </span>
        )}
      </p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
const TeacherFreeSlots: React.FC = () => {

  const [allTeachers,  setAllTeachers]  = useState<Teacher[]>([]);
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
  // detailCache[id] = the "data" object from /timetable/teacher-detail/:id
  const [detailCache,  setDetailCache]  = useState<Record<string, TeacherDetailResponse>>({});
  const [loadingIds,   setLoadingIds]   = useState<Set<string>>(new Set());
  const [loadingList,  setLoadingList]  = useState(true);
  const [listError,    setListError]    = useState<string | null>(null);

  const [search,               setSearch]               = useState('');
  const [filterDay,            setFilterDay]            = useState('all');
  const [activeTab,            setActiveTab]            = useState<'suggestions' | 'heatmap'>('suggestions');
  const [selectedHeatSlot,     setSelectedHeatSlot]     = useState<{ day: string; start: string } | null>(null);
  const [selectedMeetingSlot,  setSelectedMeetingSlot]  = useState<MeetingSlot | null>(null);
  const [meetingTitle,         setMeetingTitle]         = useState('');
  const [showModal,            setShowModal]            = useState(false);
  const [saving,               setSaving]               = useState(false);
  const [saveError,            setSaveError]            = useState<string | null>(null);
  const [saveSuccess,          setSaveSuccess]          = useState(false);

  // ── 1. Load teacher list ───────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingList(true); setListError(null);
      try {
        const res  = await fetch(`${BASE}/timetable/teachers`, { headers: authHeaders() });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || 'Failed to load teachers');
        // Normalise "id" → "_id"
        const teachers: Teacher[] = (json.data as TeacherListItem[]).map(t => ({
          _id:          t.id || (t as any)._id,
          name:         t.name         || '(no name)',
          email:        t.email,
          department:   t.department,
          totalClasses: t.totalClasses || 0,
        }));
        setAllTeachers(teachers);
      } catch (err: any) {
        setListError(err.message || 'Unknown error');
      } finally {
        setLoadingList(false);
      }
    })();
  }, []);

  // ── 2. Load one teacher's schedule (lazy) ─────────────────────────────
  const loadDetail = useCallback(async (id: string) => {
    if (detailCache[id]) return;
    setLoadingIds(prev => new Set(prev).add(id));
    try {
      const res  = await fetch(`${BASE}/timetable/teacher-detail/${id}`, { headers: authHeaders() });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to load detail');
      // json.data is the full TeacherDetailResponse object
      setDetailCache(prev => ({ ...prev, [id]: json.data as TeacherDetailResponse }));
    } catch (err) {
      console.error(`teacher-detail ${id}:`, err);
    } finally {
      setLoadingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }, [detailCache]);

  const toggleTeacher = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); loadDetail(id); }
      return next;
    });
  }, [loadDetail]);

  const filteredTeachers = useMemo(() =>
    allTeachers.filter(t =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.department || '').toLowerCase().includes(search.toLowerCase())
    ), [allTeachers, search]);

  const selectAllFiltered = () => {
    filteredTeachers.forEach(t => { if (!detailCache[t._id]) loadDetail(t._id); });
    setSelectedIds(prev => { const n = new Set(prev); filteredTeachers.forEach(t => n.add(t._id)); return n; });
  };

  // ── 3. Flat sessions per teacher (inject dayOfWeek from the object key) ─
  const sessionsByTeacher = useMemo(() => {
    const map: Record<string, TeacherScheduleEntry[]> = {};
    selectedIds.forEach(id => {
      const detail = detailCache[id];
      if (!detail?.weeklySchedule) return;
      const flat: TeacherScheduleEntry[] = [];
      Object.entries(detail.weeklySchedule).forEach(([day, entries]) =>
        (entries || []).forEach(e => flat.push({ ...e, dayOfWeek: day }))
      );
      map[id] = flat;
    });
    return map;
  }, [selectedIds, detailCache]);

  // ── 4. Ranked meeting suggestions ─────────────────────────────────────
  const loadedIds = useMemo(
    () => Array.from(selectedIds).filter(id => !!detailCache[id]),
    [selectedIds, detailCache]
  );

  const meetingSuggestions = useMemo((): MeetingSlot[] => {
    if (loadedIds.length === 0) return [];
    const days = filterDay === 'all' ? DAYS : [filterDay];
    const results: MeetingSlot[] = [];
    days.forEach(day => {
      ALL_SLOTS.forEach(slot => {
        const available: string[] = [], busy: string[] = [];
        loadedIds.forEach(id => {
          const name = allTeachers.find(t => t._id === id)?.name || id;
          if (isSlotFree(sessionsByTeacher[id] || [], day, slot.start, slot.end)) available.push(name);
          else busy.push(name);
        });
        results.push({ day, start: slot.start, end: slot.end, label: slot.label, availableTeachers: available, busyTeachers: busy });
      });
    });
    return results.sort((a, b) =>
      b.availableTeachers.length - a.availableTeachers.length || DAYS.indexOf(a.day) - DAYS.indexOf(b.day)
    );
  }, [loadedIds, sessionsByTeacher, allTeachers, filterDay]);

  const perfectSlots = useMemo(() =>
    meetingSuggestions.filter(s => s.availableTeachers.length === loadedIds.length && loadedIds.length > 0),
    [meetingSuggestions, loadedIds]
  );

  // ── 5. Save meeting ────────────────────────────────────────────────────
  const confirmMeeting = async () => {
    if (!selectedMeetingSlot || !meetingTitle.trim()) return;
    setSaving(true); setSaveError(null);
    try {
      const res  = await fetch(`${BASE}/meetings`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          title:      meetingTitle.trim(),
          day:        selectedMeetingSlot.day,
          startTime:  selectedMeetingSlot.start,
          endTime:    selectedMeetingSlot.end,
          teacherIds: Array.from(selectedIds),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to save');
      setSaveSuccess(true);
      setTimeout(() => { setShowModal(false); setSaveSuccess(false); setMeetingTitle(''); setSelectedMeetingSlot(null); }, 1400);
    } catch (err: any) {
      setSaveError(err.message || 'Server error');
    } finally {
      setSaving(false);
    }
  };

  const anyLoading       = loadingIds.size > 0;
  const selectedTeachers = useMemo(() => allTeachers.filter(t => selectedIds.has(t._id)), [allTeachers, selectedIds]);
  const heatDays         = filterDay === 'all' ? DAYS : [filterDay];
  const gridCols         = `200px repeat(${heatDays.length * ALL_SLOTS.length}, 36px)`;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", padding: '0 0 40px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Zap size={22} color="#fff" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>Teacher Free Slot Finder</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Select teachers → find common free slots → schedule a department meeting</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '270px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── LEFT: Selector ─────────────────────────────────────────────── */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
          <div style={{ padding: '13px 15px', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Users size={14} color="#6366f1" /> Teachers
              </h3>
              <div style={{ display: 'flex', gap: 5 }}>
                <button onClick={selectAllFiltered} style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', background: '#ede9fe', border: 'none', borderRadius: 7, padding: '3px 9px', cursor: 'pointer' }}>All</button>
                <button onClick={() => setSelectedIds(new Set())} style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', background: '#f3f4f6', border: 'none', borderRadius: 7, padding: '3px 9px', cursor: 'pointer' }}>Clear</button>
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or dept…" style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7, border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 12, outline: 'none' }} />
            </div>
          </div>

          <div style={{ maxHeight: 440, overflowY: 'auto', padding: '7px 9px' }}>
            {loadingList ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 13 }}>Loading teachers…</div>
            ) : listError ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#ef4444', fontSize: 12 }}>
                <AlertCircle size={18} style={{ marginBottom: 6 }} /><br />{listError}
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 13 }}>No teachers found</div>
            ) : filteredTeachers.map(teacher => {
              const sel     = selectedIds.has(teacher._id);
              const loading = loadingIds.has(teacher._id);
              return (
                <div key={teacher._id} onClick={() => toggleTeacher(teacher._id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, cursor: 'pointer', marginBottom: 3, transition: 'all .12s', background: sel ? '#eef2ff' : 'transparent', border: `1.5px solid ${sel ? '#c7d2fe' : 'transparent'}` }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: sel ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'linear-gradient(135deg,#d1d5db,#9ca3af)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 12 }}>
                    {loading ? <RefreshCw size={11} style={{ animation: 'spin .8s linear infinite' }} /> : teacher.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 12, color: sel ? '#4338ca' : '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teacher.name}</p>
                    <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>{teacher.totalClasses} classes/wk{teacher.department ? ` · ${teacher.department}` : ''}</p>
                  </div>
                  {sel && !loading && <CheckCircle2 size={14} color="#6366f1" />}
                </div>
              );
            })}
          </div>

          {selectedIds.size > 0 && (
            <div style={{ padding: '9px 14px', borderTop: '1px solid #f3f4f6', background: '#fafafa' }}>
              <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>
                <span style={{ fontWeight: 800, color: '#6366f1' }}>{selectedIds.size}</span> selected ·{' '}
                {anyLoading ? <span style={{ color: '#f59e0b' }}>Loading schedules…</span> : <span style={{ color: '#16a34a' }}>{loadedIds.length} loaded</span>}
              </p>
            </div>
          )}
        </div>

        {/* ── RIGHT: Main panel ──────────────────────────────────────────── */}
        <div>
          {selectedIds.size === 0 ? (
            <div style={{ background: '#fff', border: '1.5px dashed #d1d5db', borderRadius: 16, padding: 56, textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: 18, margin: '0 auto 16px', background: 'linear-gradient(135deg,#ede9fe,#ddd6fe)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={28} color="#7c3aed" />
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#374151' }}>Select Teachers to Begin</h3>
              <p style={{ margin: 0, fontSize: 13, color: '#9ca3af', maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>
                Pick 2 or more teachers from the panel to find common free slots and schedule a department meeting.
              </p>
            </div>
          ) : (
            <>
              {/* Tab bar */}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,.06)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f3f4f6', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 10, padding: 3 }}>
                    {(['suggestions', 'heatmap'] as const).map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, transition: 'all .15s', background: activeTab === tab ? '#fff' : 'transparent', color: activeTab === tab ? '#6366f1' : '#6b7280', boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}>
                        {tab === 'suggestions' ? '⚡ Best Slots' : '🗓 Heatmap'}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Filter size={13} color="#9ca3af" />
                    <select value={filterDay} onChange={e => setFilterDay(e.target.value)} style={{ border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '5px 10px', fontSize: 12, outline: 'none', cursor: 'pointer' }}>
                      <option value="all">All Days</option>
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                {perfectSlots.length > 0 && loadedIds.length > 0 && (
                  <div style={{ padding: '9px 16px', background: 'linear-gradient(90deg,#f0fdf4,#dcfce7)', borderBottom: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={14} color="#16a34a" />
                    <p style={{ margin: 0, fontSize: 12, color: '#15803d', fontWeight: 700 }}>
                      {perfectSlots.length} slot{perfectSlots.length > 1 ? 's' : ''} where ALL {loadedIds.length} teachers are free!
                    </p>
                  </div>
                )}
                {anyLoading && (
                  <div style={{ padding: '8px 16px', background: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#92400e' }}>⏳ Loading {loadingIds.size} schedule{loadingIds.size > 1 ? 's' : ''}…</p>
                  </div>
                )}
              </div>

              {/* ── Best Slots tab ─────────────────────────────────────────── */}
              {activeTab === 'suggestions' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: 16, alignItems: 'start' }}>
                  <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#374151' }}>Ranked Slots — {meetingSuggestions.length} combinations</h3>
                      <p style={{ margin: '3px 0 0', fontSize: 11, color: '#9ca3af' }}>Sorted by most teachers available. Click a card to select it.</p>
                    </div>
                    {loadedIds.length === 0 ? (
                      <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Waiting for schedules to load…</div>
                    ) : (
                      <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(175px,1fr))', gap: 8, maxHeight: 520, overflowY: 'auto' }}>
                        {meetingSuggestions.map((slot, i) => (
                          <MeetingCard key={i} slot={slot} total={loadedIds.length} isSelected={selectedMeetingSlot?.day === slot.day && selectedMeetingSlot?.start === slot.start} onSelect={() => setSelectedMeetingSlot(slot)} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Schedule panel */}
                  <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)', position: 'sticky', top: 16 }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 7 }}><Send size={13} /> Schedule Meeting</h3>
                    </div>

                    {!selectedMeetingSlot ? (
                      <div style={{ padding: 28, textAlign: 'center', color: '#9ca3af' }}>
                        <Calendar size={28} style={{ opacity: .35, marginBottom: 8 }} />
                        <p style={{ margin: 0, fontSize: 12 }}>Select a slot card on the left</p>
                      </div>
                    ) : (
                      <div style={{ padding: 16 }}>
                        <div style={{ background: '#eef2ff', border: '1.5px solid #c7d2fe', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                            <div style={{ background: '#6366f1', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 800 }}>{selectedMeetingSlot.day.substring(0, 3).toUpperCase()}</div>
                            <span style={{ fontWeight: 700, fontSize: 13, color: '#4338ca' }}>{selectedMeetingSlot.label}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: 11, color: '#6366f1', fontWeight: 600 }}>{selectedMeetingSlot.availableTeachers.length} / {loadedIds.length} teachers free</p>
                        </div>

                        <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 700, color: '#374151' }}>✅ Available ({selectedMeetingSlot.availableTeachers.length})</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                          {selectedMeetingSlot.availableTeachers.map(n => (
                            <span key={n} style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{n}</span>
                          ))}
                        </div>

                        {selectedMeetingSlot.busyTeachers.length > 0 && (
                          <>
                            <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 700, color: '#374151' }}>❌ Busy ({selectedMeetingSlot.busyTeachers.length})</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
                              {selectedMeetingSlot.busyTeachers.map(n => (
                                <span key={n} style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{n}</span>
                              ))}
                            </div>
                          </>
                        )}

                        <div style={{ marginBottom: 12 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>Meeting Title *</label>
                          <input value={meetingTitle} onChange={e => setMeetingTitle(e.target.value)} placeholder="e.g. Dept. Curriculum Review" style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 9, border: '1.5px solid #d1d5db', fontSize: 12, outline: 'none' }} />
                        </div>

                        <button onClick={() => { setSaveError(null); setShowModal(true); }} disabled={!meetingTitle.trim()} style={{ width: '100%', padding: 10, borderRadius: 10, border: 'none', background: meetingTitle.trim() ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#e5e7eb', color: meetingTitle.trim() ? '#fff' : '#9ca3af', fontWeight: 700, fontSize: 13, cursor: meetingTitle.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                          <Send size={13} /> Review &amp; Confirm
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Heatmap tab ────────────────────────────────────────────── */}
              {activeTab === 'heatmap' && (
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                    <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#374151' }}>Weekly Availability Heatmap</h3>
                    <p style={{ margin: '3px 0 0', fontSize: 11, color: '#9ca3af' }}>Green = free · Red = has a class. Click any cell to highlight that slot.</p>
                  </div>
                  <div style={{ overflowX: 'auto', padding: 12 }}>
                    {/* Column headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: gridCols }}>
                      <div style={{ padding: '6px 14px', fontSize: 10, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase' }}>Teacher</div>
                      {heatDays.map(day => ALL_SLOTS.map(slot => (
                        <div key={`h-${day}-${slot.start}`} style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textAlign: 'center', padding: '4px 2px', writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 58, overflow: 'hidden', borderLeft: '1px solid #f3f4f6' }}>
                          {day.substring(0, 3)} {slot.label.split('–')[0].trim()}
                        </div>
                      )))}
                    </div>

                    {/* Data rows */}
                    <div style={{ display: 'grid', gridTemplateColumns: gridCols }}>
                      {selectedTeachers.map(teacher => {
                        const sessions = sessionsByTeacher[teacher._id] || [];
                        const loading  = loadingIds.has(teacher._id);
                        const loaded   = !!detailCache[teacher._id];
                        return (
                          <React.Fragment key={teacher._id}>
                            <div style={{ padding: '9px 13px', background: '#fff', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 9, position: 'sticky', left: 0, zIndex: 2 }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 11 }}>
                                {loading ? <RefreshCw size={11} style={{ animation: 'spin .8s linear infinite' }} /> : teacher.name.charAt(0).toUpperCase()}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: 11, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teacher.name}</p>
                                <p style={{ margin: 0, fontSize: 9, color: '#9ca3af' }}>{loading ? 'Loading…' : loaded ? `${teacher.totalClasses} classes/wk` : 'Schedule unavailable'}</p>
                              </div>
                            </div>
                            {heatDays.map(day => ALL_SLOTS.map(slot => {
                              if (loading || !loaded) return (
                                <div key={`${day}-${slot.start}`} style={{ background: '#f9fafb', borderBottom: '1px solid #f3f4f6', borderLeft: '1px solid #f3f4f6', minHeight: 44, animation: 'pulse 1.4s ease-in-out infinite' }} />
                              );
                              return (
                                <HeatCell
                                  key={`${day}-${slot.start}`}
                                  free={isSlotFree(sessions, day, slot.start, slot.end)}
                                  selected={selectedHeatSlot?.day === day && selectedHeatSlot?.start === slot.start}
                                  onClick={() => setSelectedHeatSlot(prev => prev?.day === day && prev?.start === slot.start ? null : { day, start: slot.start })}
                                />
                              );
                            }))}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div style={{ display: 'flex', gap: 18, padding: '11px 14px', borderTop: '1px solid #f3f4f6', marginTop: 4 }}>
                      {[['#4ade80', 'Free'], ['#fca5a5', 'Has a class']].map(([color, label]) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 14, height: 14, borderRadius: 4, background: color }} />
                          <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Confirm modal ───────────────────────────────────────────────────── */}
      {showModal && selectedMeetingSlot && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }} onClick={() => !saving && setShowModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: 28, maxWidth: 420, width: '90%', boxShadow: '0 24px 64px rgba(0,0,0,.22)' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, margin: '0 auto 12px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={24} color="#fff" />
              </div>
              <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#111827' }}>Confirm Meeting</h2>
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Review before scheduling</p>
            </div>

            <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['Title', meetingTitle], ['Day', selectedMeetingSlot.day], ['Time', selectedMeetingSlot.label], ['Attendees', `${selectedMeetingSlot.availableTeachers.length} / ${loadedIds.length}`]].map(([label, value]) => (
                  <div key={label}>
                    <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {selectedMeetingSlot.busyTeachers.length > 0 && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 12px', marginBottom: 14, display: 'flex', gap: 8 }}>
                <AlertCircle size={14} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: 12, color: '#92400e' }}>
                  <strong>{selectedMeetingSlot.busyTeachers.join(', ')}</strong> {selectedMeetingSlot.busyTeachers.length === 1 ? 'has' : 'have'} a class at this time.
                </p>
              </div>
            )}

            {saveError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '9px 12px', marginBottom: 14, fontSize: 12, color: '#b91c1c', fontWeight: 600 }}>
                ❌ {saveError}
              </div>
            )}
            {saveSuccess && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '9px 12px', marginBottom: 14, fontSize: 12, color: '#15803d', fontWeight: 600, textAlign: 'center' }}>
                ✅ Meeting scheduled successfully!
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowModal(false)} disabled={saving} style={{ flex: 1, padding: 11, borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', color: '#374151' }}>Cancel</button>
              <button onClick={confirmMeeting} disabled={saving || saveSuccess} style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: saving || saveSuccess ? '#e5e7eb' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: saving || saveSuccess ? '#9ca3af' : '#fff', fontWeight: 700, fontSize: 13, cursor: saving || saveSuccess ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: saving || saveSuccess ? 'none' : '0 4px 14px #6366f130' }}>
                {saving ? <><RefreshCw size={13} style={{ animation: 'spin .8s linear infinite' }} /> Saving…</> : <><Send size={13} /> Confirm &amp; Notify</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .45; } }
      `}</style>
    </div>
  );
};

export default TeacherFreeSlots;