// pages/Admin/TimetableEditorPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The page that lives at: /admin/timetable/edit/:id
// Wraps TimetableEditor.jsx with a polished full-page shell:
//   • Breadcrumb header with back navigation
//   • Sticky action bar (save, publish, conflict count)
//   • Responsive sidebar layout
//   • Gemini AI analysis panel (already wired in your backend)
//   • Keyboard shortcut: Ctrl+S to save
//
// ADD TO YOUR ROUTER (App.tsx / routes):
//   import TimetableEditorPage from './pages/Admin/TimetableEditorPage';
//   <Route path="/admin/timetable/edit/:id" element={<TimetableEditorPage />} />
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ScheduleEntry {
  _id?: string;
  Course?: any;
  teacher?: any;
  room?: any;
  courseCode:  string;
  courseName:  string;
  teacherName: string;
  roomNumber:  string;
  teacherEmail?: string | null;
  courseType?: string;
  credits?:    number | null;
  type:        'Theory' | 'Lab';
  dayOfWeek:   string;
  startTime:   string;
  endTime:     string;
  semester?:   number;
  division:    string;
  batch:       string | null;
}

interface TimetableDoc {
  _id:          string;
  name:         string;
  status:       'Draft' | 'Published' | 'Archived';
  academicYear: number;
  studentGroup: {
    semester:       number;
    division:       string;
    department?:    any;
    departmentName?: string;
  };
  schedule: ScheduleEntry[];
}

interface Conflict {
  type:     'error' | 'warning' | 'info';
  kind:     string;
  message:  string;
  entryIds?: number[];
}

interface AIAnalysis {
  summary:     string;
  suggestions: string[];
  highlights?: { busiestDay?: string; mostLoadedTeacher?: string; riskLevel?: string };
}

// ── Constants ─────────────────────────────────────────────────────────────────
const API = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

const SLOTS = [
  { id: 1,  start: '08:10', end: '10:00', label: '8:10 – 10:00',  kind: 'lab'    },
  { id: 3,  start: '10:20', end: '11:15', label: '10:20 – 11:15', kind: 'theory' },
  { id: 4,  start: '11:15', end: '12:10', label: '11:15 – 12:10', kind: 'theory' },
  { id: 5,  start: '12:10', end: '13:05', label: '12:10 – 1:05',  kind: 'theory' },
  { id: 9,  start: '12:50', end: '14:45', label: '12:50 – 2:45',  kind: 'lab'    },
  { id: 6,  start: '13:50', end: '14:45', label: '1:50 – 2:45',   kind: 'theory' },
  { id: 7,  start: '14:45', end: '15:40', label: '2:45 – 3:40',   kind: 'theory' },
  { id: 8,  start: '15:40', end: '16:35', label: '3:40 – 4:35',   kind: 'theory' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// ── Helpers ───────────────────────────────────────────────────────────────────
const toMin = (t: string) => {
  const [h, m] = (t || '0:0').split(':').map(Number);
  return h * 60 + m;
};
const overlaps = (s1: string, e1: string, s2: string, e2: string) =>
  toMin(s1) < toMin(e2) && toMin(s2) < toMin(e1);

const slotFor = (entry: ScheduleEntry) =>
  SLOTS.find(sl => overlaps(entry.startTime, entry.endTime, sl.start, sl.end));

function authHdr(): Record<string, string> {
  const t = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

// ── Course color cache ────────────────────────────────────────────────────────
const PAL = [
  { bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8', pill: '#DBEAFE' },
  { bg: '#F0FDF4', border: '#22C55E', text: '#15803D', pill: '#DCFCE7' },
  { bg: '#FDF4FF', border: '#A855F7', text: '#7E22CE', pill: '#F3E8FF' },
  { bg: '#FFF7ED', border: '#F97316', text: '#C2410C', pill: '#FFEDD5' },
  { bg: '#FFF1F2', border: '#F43F5E', text: '#BE123C', pill: '#FFE4E6' },
  { bg: '#F0FDFA', border: '#14B8A6', text: '#0F766E', pill: '#CCFBF1' },
  { bg: '#FFFBEB', border: '#EAB308', text: '#A16207', pill: '#FEF9C3' },
  { bg: '#F5F3FF', border: '#8B5CF6', text: '#6D28D9', pill: '#EDE9FE' },
];
const colorCache: Record<string, typeof PAL[0]> = {};
let colorIdx = 0;
const courseColor = (code: string) => {
  if (!colorCache[code]) colorCache[code] = PAL[colorIdx++ % PAL.length];
  return colorCache[code];
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function TimetableEditorPage() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [doc,       setDoc]       = useState<TimetableDoc | null>(null);
  const [teachers,  setTeachers]  = useState<any[]>([]);
  const [rooms,     setRooms]     = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);

  // ── Edit state ────────────────────────────────────────────────────────────
  const [dragSrc,   setDragSrc]   = useState<{ entry: ScheduleEntry; idx: number } | null>(null);
  const [dropOver,  setDropOver]  = useState<{ day: string; slotId: number } | null>(null);
  const [editModal, setEditModal] = useState<{ entry: ScheduleEntry; idx: number } | null>(null);
  const [dirty,     setDirty]     = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [publishing, setPublishing] = useState(false);

  // ── Validation ────────────────────────────────────────────────────────────
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [checking,  setChecking]  = useState(false);

  // ── AI ────────────────────────────────────────────────────────────────────
  const [panel,     setPanel]     = useState<'conflicts' | 'ai'>('conflicts');
  const [analysis,  setAnalysis]  = useState<AIAnalysis | null>(null);
  const [aiQuality, setAiQuality] = useState<number | null>(null);
  const [analysing, setAnalysing] = useState(false);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null);

  const flash = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3400);
  };

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => { if (id) load(); }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const [ttRes, tRes, rRes] = await Promise.all([
        fetch(`${API}/timetable/${id}`,  { headers: authHdr() }),
        fetch(`${API}/teachers`,         { headers: authHdr() }),
        fetch(`${API}/rooms`,            { headers: authHdr() }),
      ]);
      const [ttData, tData, rData] = await Promise.all([
        ttRes.json(), tRes.json().catch(() => ({})), rRes.json().catch(() => ({})),
      ]);
      if (ttData.success) {
        setDoc(ttData.data);
        runClientValidation(ttData.data.schedule);
      } else {
        flash('Failed to load timetable', false);
      }
      setTeachers(tData.data || []);
      setRooms(rData.data?.rooms || rData.data || []);
    } catch (e: any) {
      flash(e.message, false);
    } finally {
      setLoading(false);
    }
  };

  // ── Keyboard shortcut Ctrl+S ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); if (dirty) saveAll(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dirty, doc]);

  // ── Client-side validation ────────────────────────────────────────────────
  const runClientValidation = useCallback((schedule: ScheduleEntry[]) => {
    const out: Conflict[] = [];
    const byTeacher: Record<string, (ScheduleEntry & { _i: number })[]> = {};
    const byRoom:    Record<string, (ScheduleEntry & { _i: number })[]> = {};
    const byDiv:     Record<string, (ScheduleEntry & { _i: number })[]> = {};

    schedule.forEach((e, i) => {
      const tid = (e.teacher?._id || e.teacher)?.toString() || 'noTeacher';
      const rid = (e.room?._id   || e.room  )?.toString() || 'noRoom';
      const tk = `${tid}_${e.dayOfWeek}`;
      const rk = `${rid}_${e.dayOfWeek}`;
      const dk = `${e.division}_${e.dayOfWeek}`;
      if (!byTeacher[tk]) byTeacher[tk] = [];
      if (!byRoom[rk])    byRoom[rk]    = [];
      byTeacher[tk].push({ ...e, _i: i });
      byRoom[rk].push({ ...e, _i: i });
      if (e.type === 'Theory') {
        if (!byDiv[dk]) byDiv[dk] = [];
        byDiv[dk].push({ ...e, _i: i });
      }
    });

    const check = (
      groups: Record<string, (ScheduleEntry & { _i: number })[]>,
      makeMsg: (a: any, b: any) => string
    ) => {
      Object.values(groups).forEach(slots => {
        for (let a = 0; a < slots.length; a++) {
          for (let b = a + 1; b < slots.length; b++) {
            if (overlaps(slots[a].startTime, slots[a].endTime, slots[b].startTime, slots[b].endTime)) {
              out.push({ type: 'error', kind: 'clash', message: makeMsg(slots[a], slots[b]), entryIds: [slots[a]._i, slots[b]._i] });
            }
          }
        }
      });
    };

    check(byTeacher, (a, b) => `Teacher clash: ${a.teacherName || '?'} — ${a.courseCode} & ${b.courseCode} on ${a.dayOfWeek}`);
    check(byRoom,    (a, b) => `Room clash: ${a.roomNumber || '?'} — ${a.courseCode} & ${b.courseCode} on ${a.dayOfWeek}`);
    check(byDiv,     (a, b) => `Student clash: Div ${a.division} — ${a.courseCode} & ${b.courseCode} on ${a.dayOfWeek}`);

    // Workload warnings
    const load: Record<string, number> = {};
    schedule.forEach(e => { const n = e.teacherName || '?'; load[n] = (load[n] || 0) + 1; });
    Object.entries(load).forEach(([name, n]) => {
      if (n > 18) out.push({ type: 'warning', kind: 'load', message: `${name} has ${n} sessions (max 18 recommended)` });
    });

    setConflicts(out);
    return out;
  }, []);

  // ── Server-side validate ──────────────────────────────────────────────────
  const validate = async (schedule: ScheduleEntry[]) => {
    setChecking(true);
    try {
      const res  = await fetch(`${API}/timetable/${id}/validate`, {
        method: 'POST', headers: authHdr(), body: JSON.stringify({ schedule }),
      });
      const data = await res.json();
      if (data.success) setConflicts(data.conflicts || []);
      else runClientValidation(schedule);
    } catch {
      runClientValidation(schedule);
    } finally { setChecking(false); }
  };

  // ── AI Analysis ───────────────────────────────────────────────────────────
  const analyse = async () => {
    if (!doc) return;
    setAnalysing(true);
    setPanel('ai');
    setAnalysis(null);
    try {
      const res  = await fetch(`${API}/timetable/${id}/analyse`, {
        method: 'POST', headers: authHdr(), body: JSON.stringify({ schedule: doc.schedule }),
      });
      const data = await res.json();
      if (data.success) {
        setAnalysis(data.analysis);
        setAiQuality(data.quality ?? data.analysis?.quality ?? null);
      }
    } catch (e: any) {
      flash('AI analysis failed — using local analysis', false);
      buildLocalAnalysis(doc.schedule);
    } finally { setAnalysing(false); }
  };

  const buildLocalAnalysis = (schedule: ScheduleEntry[]) => {
    const load: Record<string, number> = {};
    schedule.forEach(e => { load[e.teacherName || '?'] = (load[e.teacherName || '?'] || 0) + 1; });
    const sorted = Object.entries(load).sort((a, b) => b[1] - a[1]);
    const labs = schedule.filter(s => s.type === 'Lab').length;
    const errs = conflicts.filter(c => c.type === 'error').length;
    const q = Math.max(0, 100 - errs * 15 - conflicts.filter(c => c.type === 'warning').length * 5);
    setAiQuality(q);
    setAnalysis({
      summary: `${schedule.length} sessions (${schedule.filter(s => s.type === 'Theory').length} theory, ${labs} lab). Top load: ${sorted[0]?.[0] || 'N/A'} with ${sorted[0]?.[1] || 0} sessions.`,
      suggestions: [
        errs > 0 ? `🔴 ${errs} hard conflict(s) must be resolved before publishing.` : '✅ No hard conflicts detected.',
        sorted[0]?.[1] > 14 ? `⚠️ ${sorted[0][0]} is overloaded at ${sorted[0][1]} sessions.` : '✅ Teacher loads are balanced.',
        labs < 3 ? '🔬 Very few lab sessions — check if all practicals are scheduled.' : `✅ ${labs} lab sessions look complete.`,
      ],
    });
  };

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  const onDragStart = (entry: ScheduleEntry, idx: number) => setDragSrc({ entry, idx });
  const onDragOver  = (e: React.DragEvent, day: string, slotId: number) => { e.preventDefault(); setDropOver({ day, slotId }); };
  const onDragLeave = () => setDropOver(null);

  const onDrop = (day: string, slotId: number) => {
    setDropOver(null);
    if (!dragSrc || !doc) return;
    const { entry, idx } = dragSrc;
    setDragSrc(null);
    const slot = SLOTS.find(s => s.id === slotId)!;
    if (day === entry.dayOfWeek && slot.start === entry.startTime) return;
    if (entry.type === 'Theory' && slot.kind === 'lab')    return flash('Cannot place theory in a lab slot', false);
    if (entry.type === 'Lab'    && slot.kind === 'theory') return flash('Cannot place lab in a theory slot', false);

    const updated = doc.schedule.map((e, i) =>
      i === idx ? { ...e, dayOfWeek: day, startTime: slot.start, endTime: slot.end } : e
    );
    setDoc({ ...doc, schedule: updated });
    setDirty(true);
    runClientValidation(updated);
    flash(`Moved ${entry.courseCode} → ${day} ${slot.label}`);
  };

  // ── Save single entry ─────────────────────────────────────────────────────
  const saveEntry = async (patch: Partial<ScheduleEntry & { teacher: string; room: string }>) => {
    if (!editModal || !doc) return;
    setSaving(true);
    try {
      const entryId = editModal.entry._id;
      const res  = await fetch(`${API}/timetable/${id}/entry/${entryId}`, {
        method: 'PATCH', headers: authHdr(), body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      const updated = doc.schedule.map((e, i) => i === editModal.idx ? { ...e, ...patch } : e);
      setDoc({ ...doc, schedule: updated });
      setEditModal(null);
      setDirty(true);
      runClientValidation(updated);
      flash('Entry saved ✓');
    } catch (e: any) {
      flash(e.message, false);
    } finally { setSaving(false); }
  };

  // ── Save all (bulk) ───────────────────────────────────────────────────────
  const saveAll = async () => {
    if (!doc) return;
    setSaving(true);
    try {
      const res  = await fetch(`${API}/timetable/${id}/bulk-update`, {
        method: 'PATCH', headers: authHdr(), body: JSON.stringify({ schedule: doc.schedule }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setDirty(false);
      flash('All changes saved ✓');
    } catch (e: any) {
      flash(e.message, false);
    } finally { setSaving(false); }
  };

  // ── Publish ───────────────────────────────────────────────────────────────
  const publish = async () => {
    const errs = conflicts.filter(c => c.type === 'error').length;
    if (errs > 0) return flash(`Fix ${errs} conflict(s) before publishing`, false);
    setPublishing(true);
    try {
      const res  = await fetch(`${API}/timetable/${id}/publish`, {
        method: 'PATCH', headers: authHdr(), body: '{}',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setDoc(prev => prev ? { ...prev, status: 'Published' } : prev);
      flash('Timetable published ✓');
    } catch (e: any) {
      flash(e.message, false);
    } finally { setPublishing(false); }
  };

  // ── Build grid ────────────────────────────────────────────────────────────
  const buildGrid = () => {
    const grid: Record<string, Record<number, { entry: ScheduleEntry; idx: number }[]>> = {};
    DAYS.forEach(d => { grid[d] = {}; SLOTS.forEach(s => { grid[d][s.id] = []; }); });
    (doc?.schedule || []).forEach((entry, idx) => {
      const slot = slotFor(entry);
      if (!slot || !DAYS.includes(entry.dayOfWeek)) return;
      grid[entry.dayOfWeek][slot.id].push({ entry, idx });
    });
    return grid;
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const errCount  = conflicts.filter(c => c.type === 'error').length;
  const warnCount = conflicts.filter(c => c.type === 'warning').length;
  const conflictSet = new Set(conflicts.flatMap(c => c.entryIds || []));

  if (loading) return <LoadingScreen />;
  if (!doc)    return <div style={{ padding: 40, color: '#6B7280', textAlign: 'center' }}>Timetable not found.</div>;

  const grid = buildGrid();

  return (
    <div style={css.root}>
      <style>{INJECT_CSS}</style>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{ ...css.toast, background: toast.ok ? '#F0FDF4' : '#FFF1F2', borderColor: toast.ok ? '#BBF7D0' : '#FECACA', color: toast.ok ? '#166534' : '#991B1B' }}>
          <span style={{ fontWeight: 800 }}>{toast.ok ? '✓' : '✕'}</span> {toast.msg}
        </div>
      )}

      {/* ════════════════════════════════════════
          TOP BAR
      ════════════════════════════════════════ */}
      <header style={css.topbar}>
        {/* Left: breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={css.backBtn} onClick={() => navigate(-1)} title="Back">
            ← Back
          </button>
          <span style={{ color: '#D1D5DB', fontSize: 14 }}>/</span>
          <span style={css.breadCrumb}>Timetables</span>
          <span style={{ color: '#D1D5DB', fontSize: 14 }}>/</span>
          <span style={{ ...css.breadCrumb, color: '#0F172A', fontWeight: 700 }}>
            Sem {doc.studentGroup.semester} · Div {doc.studentGroup.division}
          </span>
          <StatusChip status={doc.status} />
          {dirty && <span style={css.unsavedPill}>● unsaved</span>}
        </div>

        {/* Right: actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* conflict badge */}
          <button
            style={{ ...css.actionBtn, background: errCount > 0 ? '#FEF2F2' : '#F0FDF4', color: errCount > 0 ? '#B91C1C' : '#15803D', borderColor: errCount > 0 ? '#FECACA' : '#BBF7D0' }}
            onClick={() => { validate(doc.schedule); setPanel('conflicts'); }}
          >
            {checking ? '…' : errCount > 0 ? `🔴 ${errCount} error${errCount > 1 ? 's' : ''}` : warnCount > 0 ? `🟡 ${warnCount} warning${warnCount > 1 ? 's' : ''}` : '✅ Valid'}
          </button>

          <button style={{ ...css.actionBtn, color: '#7C3AED', borderColor: '#C4B5FD', background: '#F5F3FF' }} onClick={analyse}>
            ✦ AI
          </button>

          <button
            style={{ ...css.actionBtn, opacity: dirty ? 1 : .45, cursor: dirty ? 'pointer' : 'not-allowed' }}
            onClick={saveAll}
            disabled={saving || !dirty}
            title="Ctrl+S"
          >
            {saving ? '…' : '💾 Save'}
          </button>

          <button
            style={{ ...css.publishBtn, opacity: doc.status === 'Published' ? .55 : 1 }}
            onClick={publish}
            disabled={publishing || doc.status === 'Published'}
          >
            {publishing ? '…' : doc.status === 'Published' ? '✓ Published' : '🚀 Publish'}
          </button>
        </div>
      </header>

      {/* ════════════════════════════════════════
          BODY
      ════════════════════════════════════════ */}
      <div style={css.body}>

        {/* ── TIMETABLE GRID ── */}
        <main style={css.main}>
          <p style={css.hint}>Drag a session to a new slot · Click to edit details · Red = conflict</p>

          <div style={{ overflowX: 'auto', borderRadius: 16, border: '1px solid #E5E7EB', boxShadow: '0 1px 6px rgba(0,0,0,.04)', background: '#fff' }}>
            <table style={css.table}>
              <thead>
                <tr>
                  <th style={css.thTime}>TIME</th>
                  {DAYS.map(day => (
                    <th key={day} style={css.th}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#0F172A' }}>{day.slice(0, 3)}</span>
                      <span style={{ fontSize: 9, color: '#94A3B8', display: 'block', fontWeight: 400, marginTop: 1 }}>{day.slice(3)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SLOTS.map((slot, ri) => (
                  <tr key={slot.id} style={{ background: ri % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    {/* Time column */}
                    <td style={{ ...css.tdTime, background: slot.kind === 'lab' ? '#FFFCF0' : '#FAFAFA' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: slot.kind === 'lab' ? '#92400E' : '#374151', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {slot.label}
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, display: 'inline-block', marginTop: 4, letterSpacing: 0.3, background: slot.kind === 'lab' ? '#FEF3C7' : '#EFF6FF', color: slot.kind === 'lab' ? '#B45309' : '#1D4ED8' }}>
                        {slot.kind === 'lab' ? '🔬 Lab' : '📖 Theory'}
                      </span>
                    </td>

                    {/* Day cells */}
                    {DAYS.map((day, di) => {
                      const cells = grid[day]?.[slot.id] || [];
                      const isOver = dropOver?.day === day && dropOver?.slotId === slot.id;
                      const wrongType = !!dragSrc && (
                        (dragSrc.entry.type === 'Theory' && slot.kind === 'lab') ||
                        (dragSrc.entry.type === 'Lab'    && slot.kind === 'theory')
                      );
                      return (
                        <td
                          key={day}
                          style={{
                            ...css.td,
                            borderRight: di < DAYS.length - 1 ? '1px solid #F1F5F9' : 'none',
                            background: isOver ? (wrongType ? '#FFF1F2' : '#EFF6FF') : undefined,
                            outline: isOver ? `2px dashed ${wrongType ? '#FCA5A5' : '#93C5FD'}` : 'none',
                            outlineOffset: -2,
                          }}
                          onDragOver={e => onDragOver(e, day, slot.id)}
                          onDragLeave={onDragLeave}
                          onDrop={() => !wrongType && onDrop(day, slot.id)}
                        >
                          {cells.length === 0 ? (
                            <div style={{ minHeight: 58, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {isOver && !wrongType && <span style={{ fontSize: 10, color: '#93C5FD', fontWeight: 700 }}>Drop here</span>}
                            </div>
                          ) : (
                            cells.map(({ entry, idx }) => (
                              <SessionCard
                                key={idx}
                                entry={entry}
                                hasConflict={conflictSet.has(idx)}
                                onDragStart={() => onDragStart(entry, idx)}
                                onClick={() => setEditModal({ entry, idx })}
                              />
                            ))
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Theory',   val: doc.schedule.filter(s => s.type === 'Theory').length,  color: '#3B82F6', bg: '#EFF6FF' },
              { label: 'Labs',     val: doc.schedule.filter(s => s.type === 'Lab').length,     color: '#8B5CF6', bg: '#F5F3FF' },
              { label: 'Teachers', val: new Set(doc.schedule.map(s => s.teacherName)).size,    color: '#10B981', bg: '#F0FDF4' },
              { label: 'Errors',   val: errCount,                                               color: errCount > 0 ? '#EF4444' : '#10B981', bg: errCount > 0 ? '#FFF1F2' : '#F0FDF4' },
            ].map(({ label, val, color, bg }) => (
              <div key={label} style={{ background: bg, border: `1px solid ${color}20`, borderRadius: 10, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{val}</span>
                <span style={{ fontSize: 11, color: '#6B7280' }}>{label}</span>
              </div>
            ))}
          </div>
        </main>

        {/* ── SIDE PANEL ── */}
        <aside style={css.sidebar}>
          {/* Tabs */}
          <div style={css.tabs}>
            <TabBtn active={panel === 'conflicts'} onClick={() => setPanel('conflicts')}>
              Conflicts
              {errCount > 0 && <Dot color="#EF4444">{errCount}</Dot>}
              {errCount === 0 && warnCount > 0 && <Dot color="#F59E0B">{warnCount}</Dot>}
            </TabBtn>
            <TabBtn active={panel === 'ai'} onClick={() => setPanel('ai')}>
              ✦ AI Analysis
            </TabBtn>
          </div>

          {/* Conflicts panel */}
          {panel === 'conflicts' && (
            <div style={css.panelBody}>
              {checking && <PanelLoading>Checking…</PanelLoading>}

              {!checking && conflicts.length === 0 && (
                <div style={css.allClear}>
                  <span style={{ fontSize: 32 }}>✅</span>
                  <span style={{ fontWeight: 700, color: '#166534' }}>No conflicts</span>
                  <span style={{ fontSize: 11, color: '#6B7280', textAlign: 'center' }}>Ready to publish.</span>
                </div>
              )}

              {!checking && conflicts.map((c, i) => (
                <ConflictCard key={i} conflict={c} />
              ))}

              <button style={css.revalBtn} onClick={() => validate(doc.schedule)} disabled={checking}>
                {checking ? '…' : '↻ Re-validate'}
              </button>
            </div>
          )}

          {/* AI panel */}
          {panel === 'ai' && (
            <div style={css.panelBody}>
              {analysing && <PanelLoading>Gemini is analysing…</PanelLoading>}

              {!analysing && !analysis && (
                <div style={css.allClear}>
                  <span style={{ fontSize: 32 }}>✦</span>
                  <span style={{ fontWeight: 700 }}>AI Analysis</span>
                  <span style={{ fontSize: 11, color: '#6B7280', textAlign: 'center', lineHeight: 1.6 }}>
                    Powered by Gemini. Get specific suggestions on teacher load, room usage, and scheduling quality.
                  </span>
                  <button style={css.analyseBtn} onClick={analyse}>Run Analysis</button>
                </div>
              )}

              {!analysing && analysis && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Score */}
                  {aiQuality !== null && (
                    <div style={css.scoreCard}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Quality Score</div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                        <span style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, color: aiQuality >= 80 ? '#16A34A' : aiQuality >= 55 ? '#B45309' : '#B91C1C' }}>
                          {aiQuality}
                        </span>
                        <span style={{ fontSize: 16, color: '#D1D5DB', marginBottom: 4 }}>/100</span>
                      </div>
                      <div style={{ height: 6, background: '#F3F4F6', borderRadius: 99, marginTop: 10, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${aiQuality}%`, borderRadius: 99, transition: 'width .6s ease', background: aiQuality >= 80 ? '#22C55E' : aiQuality >= 55 ? '#F59E0B' : '#EF4444' }} />
                      </div>
                      {analysis.highlights && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                          {analysis.highlights.riskLevel && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: analysis.highlights.riskLevel === 'low' ? '#DCFCE7' : analysis.highlights.riskLevel === 'medium' ? '#FEF9C3' : '#FEE2E2', color: analysis.highlights.riskLevel === 'low' ? '#166534' : analysis.highlights.riskLevel === 'medium' ? '#854D0E' : '#991B1B' }}>
                              Risk: {analysis.highlights.riskLevel}
                            </span>
                          )}
                          {analysis.highlights.busiestDay && (
                            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#EFF6FF', color: '#1D4ED8' }}>
                              Busiest: {analysis.highlights.busiestDay}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Summary */}
                  <div style={css.aiSummary}>{analysis.summary}</div>

                  {/* Suggestions */}
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>Suggestions</div>
                  {(analysis.suggestions || []).map((sug, i) => (
                    <div key={i} style={css.suggestion}>{sug}</div>
                  ))}

                  <button style={{ ...css.revalBtn, marginTop: 4 }} onClick={analyse}>↻ Re-analyse</button>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* ── EDIT MODAL ── */}
      {editModal && (
        <EditModal
          entry={editModal.entry}
          teachers={teachers}
          rooms={rooms}
          saving={saving}
          onSave={saveEntry}
          onClose={() => setEditModal(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION CARD
// ─────────────────────────────────────────────────────────────────────────────
function SessionCard({
  entry, hasConflict, onDragStart, onClick,
}: {
  entry: ScheduleEntry; hasConflict: boolean;
  onDragStart: () => void; onClick: () => void;
}) {
  const c = courseColor(entry.courseCode);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="tt-edit-card"
      style={{
        background:      hasConflict ? '#FFF1F2' : c.bg,
        borderLeft:      `3px solid ${hasConflict ? '#EF4444' : c.border}`,
        border:          `1px solid ${hasConflict ? '#FECACA' : c.border + '40'}`,
        borderLeftWidth: 3,
        borderRadius:    8,
        padding:         '7px 9px',
        marginBottom:    3,
        cursor:          'grab',
        userSelect:      'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: hasConflict ? '#B91C1C' : c.text, fontFamily: 'monospace' }}>
          {entry.courseCode}
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, background: hasConflict ? '#FECACA' : c.pill, color: hasConflict ? '#B91C1C' : c.text, padding: '1px 6px', borderRadius: 99, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {entry.type === 'Lab' ? '🔬' : '📖'} {entry.type}{entry.batch ? ` · ${entry.batch}` : ''}
        </span>
      </div>
      <div style={{ fontSize: 10, color: '#374151', marginTop: 3, lineHeight: 1.3 }}>
        {(entry.courseName || '').slice(0, 26)}{(entry.courseName || '').length > 26 ? '…' : ''}
      </div>
      <div style={{ fontSize: 9, color: '#6B7280', marginTop: 4, display: 'flex', gap: 8 }}>
        <span>👤 {(entry.teacherName || '?').split(' ')[0]}</span>
        {(entry.roomNumber && entry.roomNumber !== '—') && <span>🚪 {entry.roomNumber}</span>}
      </div>
      {hasConflict && <div style={{ fontSize: 9, color: '#B91C1C', fontWeight: 700, marginTop: 4 }}>⚠ Click to fix</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EDIT MODAL
// ─────────────────────────────────────────────────────────────────────────────
function EditModal({
  entry, teachers, rooms, saving, onSave, onClose,
}: {
  entry: ScheduleEntry; teachers: any[]; rooms: any[];
  saving: boolean; onSave: (p: any) => void; onClose: () => void;
}) {
  const [day,        setDay]       = useState(entry.dayOfWeek);
  const [slotId,     setSlotId]    = useState(slotFor(entry)?.id ?? SLOTS[1].id);
  const [teacherId,  setTeacherId] = useState((entry.teacher?._id || entry.teacher)?.toString() || '');
  const [roomId,     setRoomId]    = useState((entry.room?._id   || entry.room  )?.toString() || '');

  const slot = SLOTS.find(s => s.id === Number(slotId)) ?? SLOTS[1];
  const isLab = entry.type === 'Lab';
  const filteredSlots = SLOTS.filter(s => s.kind === (isLab ? 'lab' : 'theory'));
  const filteredRooms = rooms.filter(r => isLab ? (r.type === 'laboratory' || r.isLab) : (r.type !== 'laboratory' && !r.isLab));

  const submit = () => {
    const patch: any = { dayOfWeek: day, startTime: slot.start, endTime: slot.end };
    if (teacherId) patch.teacher = teacherId;
    if (roomId)    patch.room    = roomId;
    onSave(patch);
  };

  const c = courseColor(entry.courseCode);

  return (
    <div style={css.modalBg} onClick={onClose}>
      <div style={css.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: c.text, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1.2 }}>{entry.courseCode}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginTop: 3, lineHeight: 1.2 }}>{entry.courseName}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 5 }}>
              {entry.type} · Div {entry.division}{entry.batch ? ` · Batch ${entry.batch}` : ''}
            </div>
          </div>
          <button onClick={onClose} style={css.closeBtn}>✕</button>
        </div>

        {/* Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <ModalField label="Day">
            <select style={css.sel} value={day} onChange={e => setDay(e.target.value)}>
              {['Monday','Tuesday','Wednesday','Thursday','Friday'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </ModalField>

          <ModalField label={`Time (${isLab ? 'Lab' : 'Theory'} slots)`}>
            <select style={css.sel} value={slotId} onChange={e => setSlotId(Number(e.target.value))}>
              {filteredSlots.map(sl => <option key={sl.id} value={sl.id}>{sl.label}</option>)}
            </select>
          </ModalField>

          <ModalField label="Teacher" style={{ gridColumn: '1/-1' }}>
            <select style={css.sel} value={teacherId} onChange={e => setTeacherId(e.target.value)}>
              <option value="">— keep current ({entry.teacherName || 'unassigned'}) —</option>
              {teachers.map(t => (
                <option key={t._id || t.id} value={t._id || t.id}>
                  {t.name || t.user?.name || 'Unknown'}
                  {t.department ? ` · ${t.department}` : ''}
                </option>
              ))}
            </select>
          </ModalField>

          <ModalField label={`Room (${isLab ? 'Lab rooms shown' : 'Classrooms shown'})`} style={{ gridColumn: '1/-1' }}>
            <select style={css.sel} value={roomId} onChange={e => setRoomId(e.target.value)}>
              <option value="">— keep current ({entry.roomNumber || 'unassigned'}) —</option>
              {(filteredRooms.length ? filteredRooms : rooms).map(r => (
                <option key={r._id || r.id} value={r._id || r.id}>
                  {r.roomNumber}{r.type ? ` (${r.type})` : ''}{r.capacity ? ` · cap ${r.capacity}` : ''}
                </option>
              ))}
            </select>
          </ModalField>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
          <button style={css.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={css.saveEntryBtn} onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : 'Save Entry'}
          </button>
        </div>
        <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 12 }}>
          Conflicts are re-checked automatically after saving.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; border: string }> = {
    Published: { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
    Draft:     { bg: '#FFFBEB', color: '#A16207', border: '#FDE68A' },
    Archived:  { bg: '#F1F5F9', color: '#64748B', border: '#E2E8F0' },
  };
  const c = map[status] || map.Draft;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {status}
    </span>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '12px 8px', fontSize: 12, fontWeight: 600, border: 'none',
        background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 5, fontFamily: 'inherit', transition: 'all .12s',
        color: active ? '#1D4ED8' : '#6B7280',
        borderBottom: active ? '2px solid #3B82F6' : '2px solid transparent',
      }}
    >
      {children}
    </button>
  );
}

function Dot({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{ background: color, color: '#fff', fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 99 }}>
      {children}
    </span>
  );
}

function ConflictCard({ conflict }: { conflict: Conflict }) {
  const col = conflict.type === 'error' ? '#EF4444' : conflict.type === 'warning' ? '#F59E0B' : '#3B82F6';
  return (
    <div style={{ borderLeft: `3px solid ${col}`, background: '#F9FAFB', border: `1px solid #F3F4F6`, borderLeftWidth: 3, borderRadius: 8, padding: '10px 12px' }}>
      <span style={{ fontSize: 12, color: '#1F2937', lineHeight: 1.5, fontWeight: 500 }}>
        {conflict.type === 'error' ? '🔴 ' : conflict.type === 'warning' ? '🟡 ' : '🔵 '}
        {conflict.message}
      </span>
    </div>
  );
}

function PanelLoading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6B7280', fontSize: 12, padding: '20px 0' }}>
      <div style={{ width: 16, height: 16, border: '2px solid #E5E7EB', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'tte-spin .7s linear infinite', flexShrink: 0 }} />
      {children}
    </div>
  );
}

function ModalField({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...style }}>
      <label style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</label>
      {children}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', flexDirection: 'column', gap: 14 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #E5E7EB', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'tte-spin .8s linear infinite' }} />
      <p style={{ color: '#94A3B8', fontSize: 14, fontFamily: 'system-ui' }}>Loading timetable…</p>
      <style>{`@keyframes tte-spin { to { transform: rotate(360deg); }}`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const css: Record<string, React.CSSProperties> = {
  root:       { minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Outfit','DM Sans',system-ui,sans-serif", display: 'flex', flexDirection: 'column' },
  topbar:     { background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, position: 'sticky', top: 0, zIndex: 40 },
  backBtn:    { background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' },
  breadCrumb: { fontSize: 13, color: '#6B7280', fontWeight: 500 },
  unsavedPill:{ fontSize: 11, background: '#FEF9C3', color: '#A16207', padding: '2px 9px', borderRadius: 99, fontWeight: 700 },
  actionBtn:  { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 13px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const },
  publishBtn: { background: 'linear-gradient(135deg,#1E40AF,#3B82F6)', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 10px #3B82F625' },
  body:       { display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 },
  main:       { flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '20px 24px', minWidth: 0 },
  hint:       { fontSize: 11, color: '#94A3B8', marginBottom: 14, fontStyle: 'italic' },
  table:      { width: '100%', borderCollapse: 'collapse', minWidth: 880 },
  thTime:     { width: 130, padding: '11px 14px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase', borderBottom: '2px solid #E5E7EB', borderRight: '1px solid #F1F5F9', background: '#F8FAFC' },
  th:         { padding: '11px 8px', textAlign: 'center', borderBottom: '2px solid #E5E7EB', background: '#F8FAFC', minWidth: 150 },
  tdTime:     { padding: '10px 8px 10px 14px', borderRight: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9', verticalAlign: 'top' },
  td:         { padding: 5, borderBottom: '1px solid #F1F5F9', verticalAlign: 'top', transition: 'background .1s' },
  sidebar:    { width: 300, minWidth: 300, background: '#fff', borderLeft: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  tabs:       { display: 'flex', borderBottom: '1px solid #E5E7EB' },
  panelBody:  { flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 },
  allClear:   { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '32px 16px', textAlign: 'center' },
  revalBtn:   { background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#374151', fontFamily: 'inherit', textAlign: 'center' },
  analyseBtn: { background: 'linear-gradient(135deg,#7C3AED,#8B5CF6)', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  scoreCard:  { background: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px' },
  aiSummary:  { background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: '#1D4ED8', lineHeight: 1.6 },
  suggestion: { background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#1F2937', lineHeight: 1.6 },
  toast:      { position: 'fixed', bottom: 20, right: 20, zIndex: 9999, padding: '11px 18px', borderRadius: 10, fontSize: 12, fontWeight: 600, border: '1px solid', boxShadow: '0 4px 20px rgba(0,0,0,.1)', animation: 'tte-slide .3s ease' },
  modalBg:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal:      { background: '#fff', borderRadius: 18, padding: 26, maxWidth: 480, width: '100%', boxShadow: '0 32px 80px rgba(0,0,0,.2)', animation: 'tte-modal .2s ease' },
  closeBtn:   { background: '#F3F4F6', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontSize: 12, flexShrink: 0 },
  sel:        { width: '100%', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 11px', fontSize: 13, color: '#374151', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' },
  cancelBtn:  { background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 9, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#374151' },
  saveEntryBtn:{ background: 'linear-gradient(135deg,#1E40AF,#3B82F6)', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
};

const INJECT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; }
  .tt-edit-card { transition: transform .12s, box-shadow .12s; }
  .tt-edit-card:hover { transform: translateY(-2px); box-shadow: 0 4px 14px rgba(0,0,0,.1); }
  @keyframes tte-spin  { to { transform: rotate(360deg); } }
  @keyframes tte-slide { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes tte-modal { from { opacity:0; transform:scale(.96); } to { opacity:1; transform:scale(1); } }
  ::-webkit-scrollbar { width:5px; height:5px; }
  ::-webkit-scrollbar-thumb { background:#CBD5E1; border-radius:3px; }
  select option { background:#fff; }
`;