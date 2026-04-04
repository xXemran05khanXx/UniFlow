// pages/Admin/TimetablePage.tsx
// ── COMPLETE REWRITE ─────────────────────────────────────────────────────────
// Fixes:
//  1. Reads populated fields (courseCode, courseName, teacherName, roomNumber)
//     that the fixed /list backend now returns
//  2. Filters by semester, division, academicYear server-side via query params
//  3. Shows one tab per (semester × division) timetable doc — not one flat list
//  4. Fixed canonical slot grid matching TimetableGenerator exactly
//  5. Lab sessions grouped per batch, rendered distinctly
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Calendar, Search, RefreshCw, Download, ChevronDown, ChevronRight,
  AlertCircle, Zap, BookOpen, FlaskConical, X, GraduationCap,
  Building2, Clock3, Users2, Eye, Filter, Layers
} from 'lucide-react';

const API = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL SLOTS — mirrors TimetableGenerator exactly
// ─────────────────────────────────────────────────────────────────────────────
const FIXED_SLOTS = [
  { id: 1,  start: '08:10', end: '10:00', label: '8:10 – 10:00',   kind: 'lab'    },
  { id: 3,  start: '10:20', end: '11:15', label: '10:20 – 11:15',  kind: 'theory' },
  { id: 4,  start: '11:15', end: '12:10', label: '11:15 – 12:10',  kind: 'theory' },
  { id: 5,  start: '12:10', end: '13:05', label: '12:10 – 1:05',   kind: 'theory' },
  { id: 9,  start: '12:50', end: '14:45', label: '12:50 – 2:45',   kind: 'lab'    },
  { id: 6,  start: '13:50', end: '14:45', label: '1:50 – 2:45',    kind: 'theory' },
  { id: 7,  start: '14:45', end: '15:40', label: '2:45 – 3:40',    kind: 'theory' },
  { id: 8,  start: '15:40', end: '16:35', label: '3:40 – 4:35',    kind: 'theory' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface ScheduleEntry {
  courseCode:   string;
  courseName:   string;
  courseType:   string;
  credits:      number | null;
  teacherName:  string;
  teacherEmail: string | null;
  roomNumber:   string;
  roomType:     string | null;
  type:         'Theory' | 'Lab';
  dayOfWeek:    string;
  startTime:    string;
  endTime:      string;
  semester:     number;
  division:     string;
  batch:        string | null;
}

interface TimetableDoc {
  _id:          string;
  name:         string;
  status:       'Draft' | 'Published' | 'Archived';
  academicYear: number;
  studentGroup: {
    semester:        number;
    division:        string;
    department?:     any;
    departmentName?: string;
  };
  schedule: ScheduleEntry[];
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const toMin = (t: string) => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + m; };
const overlaps = (s1: string, e1: string, s2: string, e2: string) =>
  toMin(s1) < toMin(e2) && toMin(s2) < toMin(e1);

function slotForSession(entry: ScheduleEntry) {
  return FIXED_SLOTS.find(sl => overlaps(entry.startTime, entry.endTime, sl.start, sl.end));
}

function authHeader() {
  const t = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ─────────────────────────────────────────────────────────────────────────────
// COLOUR PALETTE
// ─────────────────────────────────────────────────────────────────────────────
const PALETTE = [
  { bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8', badge: '#DBEAFE' },
  { bg: '#F0FDF4', border: '#22C55E', text: '#15803D', badge: '#DCFCE7' },
  { bg: '#FDF4FF', border: '#A855F7', text: '#7E22CE', badge: '#F3E8FF' },
  { bg: '#FFF7ED', border: '#F97316', text: '#C2410C', badge: '#FFEDD5' },
  { bg: '#FFF1F2', border: '#F43F5E', text: '#BE123C', badge: '#FFE4E6' },
  { bg: '#F0FDFA', border: '#14B8A6', text: '#0F766E', badge: '#CCFBF1' },
  { bg: '#FFFBEB', border: '#EAB308', text: '#A16207', badge: '#FEF9C3' },
  { bg: '#F5F3FF', border: '#8B5CF6', text: '#6D28D9', badge: '#EDE9FE' },
  { bg: '#FFF5F5', border: '#FC8181', text: '#C53030', badge: '#FED7D7' },
  { bg: '#F0FFF4', border: '#68D391', text: '#276749', badge: '#C6F6D5' },
];
const colorMap: Record<string, typeof PALETTE[0]> = {};
let ci = 0;
const courseColor = (code: string) => {
  if (!colorMap[code]) colorMap[code] = PALETTE[ci++ % PALETTE.length];
  return colorMap[code];
};

// ─────────────────────────────────────────────────────────────────────────────
// SESSION CARD
// ─────────────────────────────────────────────────────────────────────────────
const SessionCard: React.FC<{ entry: ScheduleEntry; onClick: () => void }> = ({ entry, onClick }) => {
  const c = courseColor(entry.courseCode);
  const isLab = entry.type === 'Lab';

  // FIX: Provide a fallback string if teacherName is missing
  const displayName = entry.teacherName 
    ? entry.teacherName.split(' ').slice(0, 2).join(' ') 
    : 'No Teacher';

  // FIX: Provide a fallback for courseName to prevent the previous 'length' error
  const displayCourse = (entry.courseName || 'Untitled Course');

  return (
    <button
      onClick={onClick}
      className="tt-card"
      style={{
        background:      c.bg,
        borderLeft:      `3px solid ${c.border}`,
        border:          `1px solid ${c.border}30`,
        borderLeftWidth: 3,
        borderLeftColor: c.border,
        borderRadius:    8,
        padding:         '7px 9px',
        width:           '100%',
        textAlign:       'left',
        cursor:          'pointer',
        marginBottom:    3,
        display:         'block',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: c.text, fontFamily: "'DM Mono', monospace", letterSpacing: '-.2px' }}>
          {entry.courseCode}
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, background: c.badge, color: c.text, padding: '1px 6px', borderRadius: 99, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {isLab ? '🧪' : '📖'} {entry.type}{entry.batch ? ` · ${entry.batch}` : ''}
        </span>
      </div>
      <div style={{ fontSize: 10, color: '#374151', marginTop: 3, lineHeight: 1.3, fontWeight: 500 }}>
        {displayCourse.length > 26 ? displayCourse.slice(0, 26) + '…' : displayCourse}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 5, fontSize: 9, color: '#6B7280' }}>
        <span>👤 {displayName}</span>
        {entry.roomNumber !== '—' && <span>🚪 {entry.roomNumber}</span>}
      </div>
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DETAIL MODAL
// ─────────────────────────────────────────────────────────────────────────────
const DetailModal: React.FC<{ entry: ScheduleEntry; onClose: () => void }> = ({ entry, onClose }) => {
  const c    = courseColor(entry.courseCode);
  const slot = slotForSession(entry);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 28, maxWidth: 460, width: '100%', boxShadow: '0 32px 80px rgba(0,0,0,.2)', border: `2px solid ${c.border}30`, animation: 'ttModalIn .2s ease' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ background: c.bg, border: `2px solid ${c.border}`, borderRadius: 12, width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {entry.type === 'Lab' ? <FlaskConical size={22} color={c.text} /> : <BookOpen size={22} color={c.text} />}
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: c.text, fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase' }}>{entry.courseCode}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginTop: 1, lineHeight: 1.2 }}>{entry.courseName}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { icon: <GraduationCap size={13} />, label: 'Teacher',  val: entry.teacherName || 'No Teacher Assigned' },
            { icon: <Building2     size={13} />, label: 'Room',     val: entry.roomNumber !== '—' ? entry.roomNumber : 'Not assigned' },
            { icon: <Calendar      size={13} />, label: 'Day',      val: entry.dayOfWeek },
            { icon: <Clock3        size={13} />, label: 'Time',     val: slot?.label || `${entry.startTime} – ${entry.endTime}` },
            { icon: <Users2        size={13} />, label: 'Division', val: `Div ${entry.division}${entry.batch ? ` · Batch ${entry.batch}` : ''}` },
            { icon: <Layers        size={13} />, label: 'Semester', val: `Semester ${entry.semester}` },
          ].map(({ icon, label, val }) => (
            <div key={label} style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 12px', border: '1px solid #F3F4F6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#9CA3AF', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>{icon}{label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{val}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, padding: '10px 14px', background: c.bg, borderRadius: 10, border: `1px solid ${c.border}40`, display: 'flex', alignItems: 'center', gap: 8 }}>
          {entry.type === 'Lab' ? <FlaskConical size={14} color={c.text} /> : <BookOpen size={14} color={c.text} />}
          <span style={{ fontSize: 12, fontWeight: 700, color: c.text }}>{entry.type === 'Lab' ? 'Laboratory Session' : 'Theory Lecture'}</span>
          {entry.credits && <span style={{ marginLeft: 'auto', fontSize: 11, color: c.text, opacity: .7 }}>{entry.credits} credits</span>}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TIMETABLE GRID
// ─────────────────────────────────────────────────────────────────────────────
const TimetableGrid: React.FC<{
  doc: TimetableDoc;
  onSessionClick: (e: ScheduleEntry) => void;
  onEdit: (id: string) => void;
}> = ({ doc, onSessionClick, onEdit }) => {
  const usedStarts = new Set(doc.schedule.map(s => slotForSession(s)?.start).filter(Boolean));
  const visSlots   = FIXED_SLOTS.filter(sl => sl.kind === 'theory' || usedStarts.has(sl.start));

  const grid: Record<string, Record<string, ScheduleEntry[]>> = {};
  DAYS.forEach(d => { grid[d] = {}; });
  doc.schedule.forEach(entry => {
    const slot = slotForSession(entry);
    if (!slot || !DAYS.includes(entry.dayOfWeek as any)) return;
    if (!grid[entry.dayOfWeek][slot.start]) grid[entry.dayOfWeek][slot.start] = [];
    grid[entry.dayOfWeek][slot.start].push(entry);
  });

  const stats = {
    theory:   doc.schedule.filter(s => s.type === 'Theory').length,
    lab:      doc.schedule.filter(s => s.type === 'Lab').length,
    teachers: new Set(doc.schedule.map(s => s.teacherName)).size,
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          { label: 'Theory', val: stats.theory,          color: '#3B82F6', bg: '#EFF6FF' },
          { label: 'Labs',   val: stats.lab,             color: '#8B5CF6', bg: '#F5F3FF' },
          { label: 'Teachers', val: stats.teachers,      color: '#10B981', bg: '#F0FDF4' },
          { label: 'Total',  val: doc.schedule.length,   color: '#F59E0B', bg: '#FFFBEB' },
        ].map(({ label, val, color, bg }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${color}20`, borderRadius: 10, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{val}</span>
            <span style={{ fontSize: 11, color: '#6B7280' }}>{label}</span>
          </div>
        ))}
      </div>

      {doc.schedule.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
          <AlertCircle size={32} style={{ margin: '0 auto 10px', display: 'block', color: '#D1D5DB' }} />
          <p style={{ fontSize: 14 }}>No sessions in this timetable</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                <th style={{ width: 130, padding: '11px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB', borderRight: '1px solid #F1F5F9' }}>
                  TIME SLOT
                </th>
                {DAYS.map((day, i) => (
                  <th key={day} style={{ padding: '11px 8px', textAlign: 'center', borderBottom: '2px solid #E5E7EB', borderRight: i < DAYS.length - 1 ? '1px solid #F1F5F9' : 'none', minWidth: 152 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{day.slice(0, 3).toUpperCase()}</div>
                    <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 400, marginTop: 1 }}>{day.slice(3)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visSlots.map((slot, ri) => {
                const isLab = slot.kind === 'lab';
                return (
                  <tr key={slot.id} style={{ background: ri % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9', borderRight: '1px solid #F1F5F9', verticalAlign: 'top', background: isLab ? '#FFFCF0' : undefined }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: isLab ? '#92400E' : '#374151', fontFamily: "'DM Mono', monospace", lineHeight: 1.5, whiteSpace: 'nowrap' }}>
                        {slot.label}
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, background: isLab ? '#FEF3C7' : '#EFF6FF', color: isLab ? '#B45309' : '#1D4ED8', padding: '2px 7px', borderRadius: 99, display: 'inline-block', marginTop: 4, letterSpacing: .3 }}>
                        {isLab ? '🧪 Lab block' : '📖 Theory'}
                      </span>
                    </td>
                    {DAYS.map((day, di) => {
                      const cells = grid[day]?.[slot.start] || [];
                      return (
                        <td key={day} style={{ padding: '5px', borderBottom: '1px solid #F1F5F9', borderRight: di < DAYS.length - 1 ? '1px solid #F1F5F9' : 'none', verticalAlign: 'top' }}>
                          {cells.length === 0 ? (
                            <div style={{ minHeight: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ width: 18, height: 1, background: '#E5E7EB' }} />
                            </div>
                          ) : (
                            cells.map((entry, ei) => (
                              <SessionCard key={ei} entry={entry} onClick={() => onEdit(doc._id)} />
                            ))
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
const TimetablePage: React.FC = () => {
  const navigate = useNavigate();

  const [docs,         setDocs]         = useState<TimetableDoc[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  const [filterSem,    setFilterSem]    = useState<string>('all');
  const [filterDiv,    setFilterDiv]    = useState<string>('all');
  const [filterYear,   setFilterYear]   = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search,       setSearch]       = useState('');
  const [activeId,     setActiveId]     = useState<string>('');
  const [modal,        setModal]        = useState<ScheduleEntry | null>(null);

  // ── LOAD ────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (filterSem    !== 'all') params.semester     = filterSem;
      if (filterDiv    !== 'all') params.division     = filterDiv;
      if (filterYear   !== 'all') params.academicYear = filterYear;
      if (filterStatus !== 'all') params.status       = filterStatus;

      const res = await axios.get(`${API}/timetable/list`, {
        headers: authHeader(),
        params,
      });

      const fetched: TimetableDoc[] = res.data?.data || [];
      setDocs(fetched);
      if (fetched.length > 0 && !fetched.find(d => d._id === activeId)) {
        setActiveId(fetched[0]._id);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [filterSem, filterDiv, filterYear, filterStatus]);

  useEffect(() => { load(); }, [load]);

  // ── DERIVED ─────────────────────────────────────────────────────────────────
  const semOptions  = useMemo(() => Array.from(new Set(docs.map(d => d.studentGroup.semester).filter(Boolean))).sort((a, b) => a - b), [docs]);
  const divOptions  = useMemo(() => Array.from(new Set(docs.map(d => d.studentGroup.division).filter(Boolean))).sort(), [docs]);
  const yearOptions = useMemo(() => Array.from(new Set(docs.map(d => d.academicYear).filter(Boolean))).sort((a, b) => b - a), [docs]);

  const activeDoc = docs.find(d => d._id === activeId) || docs[0];

  const filteredSchedule: ScheduleEntry[] = useMemo(() => {
    if (!activeDoc) return [];
    if (!search) return activeDoc.schedule;
    const q = search.toLowerCase();
    return activeDoc.schedule.filter(s =>
      s.courseCode.toLowerCase().includes(q)  ||
      s.courseName.toLowerCase().includes(q)  ||
      s.teacherName.toLowerCase().includes(q) ||
      s.roomNumber.toLowerCase().includes(q)
    );
  }, [activeDoc, search]);

  const displayDoc: TimetableDoc | null = activeDoc ? { ...activeDoc, schedule: filteredSchedule } : null;

  const deptName = (doc: TimetableDoc) =>
    doc.studentGroup?.departmentName ||
    (typeof doc.studentGroup?.department === 'object' ? doc.studentGroup.department?.name || doc.studentGroup.department?.code : null) ||
    'Dept';

  const statusColor = (s: string) =>
    s === 'Published' ? { bg: '#F0FDF4', text: '#15803D', border: '#DCFCE7' } :
    s === 'Draft'     ? { bg: '#FFFBEB', text: '#A16207', border: '#FEF9C3' } :
                        { bg: '#F1F5F9', text: '#64748B', border: '#E2E8F0' };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Outfit','DM Sans',system-ui,sans-serif" }}>
      <style>{PAGE_STYLES}</style>

      {/* TOP BAR */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '18px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ background: 'linear-gradient(135deg,#1E40AF,#3B82F6)', borderRadius: 14, width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px #3B82F625', flexShrink: 0 }}>
            <Calendar size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 21, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-.4px' }}>Timetable Management</h1>
            <p style={{ fontSize: 12, color: '#94A3B8', margin: '2px 0 0' }}>
              {loading ? 'Loading…' : `${docs.length} timetable${docs.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} className="tt-btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={13} className={loading ? 'tt-spin-icon' : ''} /> Refresh
          </button>
          <button className="tt-btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={13} /> Export
          </button>
          <button onClick={() => navigate('/timetable-generation')} className="tt-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={13} /> Generate New
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '22px 28px' }}>

        {/* FILTER BAR */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={14} color="#9CA3AF" />
          <TtSelect value={filterSem} onChange={v => { setFilterSem(v); }}>
            <option value="all">All Semesters</option>
            {semOptions.map(s => <option key={s} value={s}>Semester {s}</option>)}
          </TtSelect>
          <TtSelect value={filterDiv} onChange={v => setFilterDiv(v)}>
            <option value="all">All Divisions</option>
            {divOptions.map(d => <option key={d} value={d}>Division {d}</option>)}
          </TtSelect>
          <TtSelect value={filterYear} onChange={v => setFilterYear(v)}>
            <option value="all">All Years</option>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </TtSelect>
          <TtSelect value={filterStatus} onChange={v => setFilterStatus(v)}>
            <option value="all">All Status</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
            <option value="Archived">Archived</option>
          </TtSelect>
          <div style={{ position: 'relative', marginLeft: 'auto' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search in timetable…"
              style={{ paddingLeft: 30, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: '1px solid #E5E7EB', borderRadius: 9, fontSize: 12, outline: 'none', fontFamily: 'inherit', background: '#F9FAFB', width: 200 }} />
          </div>
          {(filterSem !== 'all' || filterDiv !== 'all' || filterYear !== 'all' || filterStatus !== 'all' || search) && (
            <button onClick={() => { setFilterSem('all'); setFilterDiv('all'); setFilterYear('all'); setFilterStatus('all'); setSearch(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#EF4444', background: '#FFF1F2', border: '1px solid #FECACA', borderRadius: 7, padding: '5px 10px', cursor: 'pointer' }}>
              <X size={11} /> Clear
            </button>
          )}
        </div>

        {/* ERROR */}
        {error && (
          <div style={{ background: '#FFF1F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', color: '#B91C1C', fontSize: 13 }}>
            <AlertCircle size={15} /> {error}
            <button onClick={load} style={{ marginLeft: 'auto', fontSize: 12, color: '#B91C1C', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Retry</button>
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div className="tt-spin" style={{ width: 38, height: 38, margin: '0 auto 14px' }} />
            <p style={{ color: '#94A3B8', fontSize: 14 }}>Loading timetables…</p>
          </div>
        )}

        {/* EMPTY */}
        {!loading && !error && docs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB' }}>
            <Calendar size={40} color="#D1D5DB" style={{ margin: '0 auto 14px', display: 'block' }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#374151', marginBottom: 6 }}>No timetables found</h3>
            <p style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 20 }}>
              {filterSem !== 'all' || filterDiv !== 'all' ? 'Try changing the filters above.' : 'Generate a timetable first.'}
            </p>
            <button onClick={() => navigate('/timetable-generation')} className="tt-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Zap size={13} /> Generate Timetable
            </button>
          </div>
        )}

        {/* MAIN CONTENT */}
        {!loading && docs.length > 0 && (
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

            {/* SIDEBAR */}
            <div style={{ width: 242, flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, paddingLeft: 4 }}>
                TIMETABLES ({docs.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {docs.map(doc => {
                  const active = doc._id === (activeId || docs[0]?._id);
                  const sc = statusColor(doc.status);
                  return (
                    <button key={doc._id} onClick={() => setActiveId(doc._id)} className="tt-doc-tab"
                      style={{ background: active ? '#EFF6FF' : '#fff', border: active ? '1.5px solid #3B82F6' : '1px solid #E5E7EB', borderRadius: 12, padding: '11px 13px', textAlign: 'left', cursor: 'pointer', width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: active ? '#1D4ED8' : '#0F172A' }}>
                          Sem {doc.studentGroup.semester} · Div {doc.studentGroup.division}
                        </span>
                        <ChevronRight size={12} color={active ? '#3B82F6' : '#D1D5DB'} />
                      </div>
                      <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 6, lineHeight: 1.4 }}>{deptName(doc)} · {doc.academicYear}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, padding: '1px 7px', borderRadius: 99 }}>
                          {doc.status}
                        </span>
                        <span style={{ fontSize: 10, color: '#9CA3AF' }}>{doc.schedule.length} sessions</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GRID PANEL */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {displayDoc ? (
                <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,.04)' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC' }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
                        Semester {displayDoc.studentGroup.semester} · Division {displayDoc.studentGroup.division}
                      </div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                        {deptName(displayDoc)} · {displayDoc.academicYear} · {displayDoc.name}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
  <div
    style={{
      ...statusColor(displayDoc.status),
      fontSize: 11,
      fontWeight: 700,
      padding: '4px 12px',
      borderRadius: 99,
      border: `1px solid ${statusColor(displayDoc.status).border}`
    }}
  >
    {displayDoc.status}
  </div>

  <button
    onClick={() => navigate(`/admin/timetable/edit/${displayDoc._id}`)}
    className="tt-btn-primary"
  >
    ✏️ Edit
  </button>
</div>
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    <TimetableGrid
  doc={displayDoc}
  onSessionClick={setModal}
  onEdit={(id) => navigate(`/admin/timetable/edit/${id}`)}
/>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8' }}>
                  <Eye size={32} style={{ margin: '0 auto 10px', display: 'block', color: '#D1D5DB' }} />
                  <p>Select a timetable from the left</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {modal && <DetailModal entry={modal} onClose={() => setModal(null)} />}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SELECT HELPER
// ─────────────────────────────────────────────────────────────────────────────
const TtSelect: React.FC<{ value: string; onChange: (v: string) => void; children: React.ReactNode }> = ({ value, onChange, children }) => (
  <div style={{ position: 'relative' }}>
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ appearance: 'none', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 9, padding: '7px 28px 7px 11px', fontSize: 12, color: '#374151', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>
      {children}
    </select>
    <ChevronDown size={12} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const PAGE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; }
  .tt-btn-primary {
    background: linear-gradient(135deg,#1E40AF,#3B82F6); color:#fff; border:none;
    border-radius:9px; padding:8px 15px; font-size:13px; font-weight:700;
    cursor:pointer; font-family:inherit; transition:opacity .15s,transform .15s;
    box-shadow:0 2px 10px #3B82F625;
  }
  .tt-btn-primary:hover { opacity:.9; transform:translateY(-1px); }
  .tt-btn-outline {
    background:#fff; color:#374151; border:1px solid #E5E7EB; border-radius:9px;
    padding:7px 13px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; transition:background .12s;
  }
  .tt-btn-outline:hover { background:#F9FAFB; }
  .tt-card { transition:transform .12s,box-shadow .12s; }
  .tt-card:hover { transform:translateY(-2px); box-shadow:0 4px 14px rgba(0,0,0,.1); }
  .tt-doc-tab { transition:all .15s; }
  .tt-doc-tab:hover { box-shadow:0 2px 10px rgba(0,0,0,.06); }
  .tt-spin { border-radius:50%; border:3px solid #E5E7EB; border-top-color:#3B82F6; animation:ttSpin .8s linear infinite; }
  .tt-spin-icon { animation:ttSpin .8s linear infinite; }
  @keyframes ttSpin { to { transform:rotate(360deg); } }
  @keyframes ttModalIn { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }
  ::-webkit-scrollbar { width:5px; height:5px; }
  ::-webkit-scrollbar-track { background:#F1F5F9; }
  ::-webkit-scrollbar-thumb { background:#CBD5E1; border-radius:3px; }
`;

export default TimetablePage;