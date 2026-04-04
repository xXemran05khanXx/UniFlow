/**
 * pages/admin/AdminAbsencePage.tsx
 *
 * Admin absence management — assign substitutes, approve, publish.
 * Publishing generates a one-day substitute timetable students can view.
 *
 * API routes used:
 *   GET   /api/absences/admin           → getAdminAbsences
 *   GET   /api/absences/admin?status=all
 *   GET   /api/absences/:id             → getAbsenceById
 *   PATCH /api/absences/:id/assign      → assignSubstitutes
 *   PATCH /api/absences/:id/publish     → publishSubstituteSchedule
 *   PATCH /api/absences/:id/reject      → rejectAbsence
 *   GET   /api/teachers                 → getTeachers (for substitute picker)
 *   GET   /api/absences/schedule/:date  → getDaySubstituteSchedule (preview)
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, BadgeAlert, Calendar, CheckCircle2, ChevronDown,
  ChevronUp, Eye, RefreshCw, Send, UserCheck, X, XCircle, Clock,
  BookOpen, Users,
} from 'lucide-react';

// ─── API ──────────────────────────────────────────────────────────────────────

const BASE = '/api';

function headers() {
  const t = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

async function apiGet<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { headers: headers() });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || 'Request failed');
  return j.data as T;
}

async function apiGetFull<T>(path: string): Promise<{ success: boolean; data: T; count?: number; message?: string; date?: string; totalAbsent?: number; totalCovered?: number }> {
  const r = await fetch(`${BASE}${path}`, { headers: headers() });
  return r.json();
}

async function apiPatch<T>(path: string, body: unknown): Promise<{ success: boolean; data: T; message?: string }> {
  const r = await fetch(`${BASE}${path}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(body) });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || 'Request failed');
  return j;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeacherRef {
  _id: string;
  user?: { name?: string; email?: string };
  primaryDepartment?: { name?: string };
}

interface AffectedClass {
  _id: string;
  courseName?: string | null;
  courseCode?: string | null;
  startTime?: string;
  endTime?: string;
  division?: string;
  type?: string;
  semester?: number;
  batch?: string | null;
  substituteStatus?: string;
  substituteTeacher?: string | null;
  substituteName?: string | null;
  suggestedTeachers?: { teacher?: string; teacherName?: string; reason?: string }[];
}

interface AbsenceRequest {
  _id: string;
  absenceDate: string;
  dayOfWeek?: string;
  reason?: string;
  status: string;
  affectedClasses?: AffectedClass[];
  teacher?: { _id: string; user?: { name?: string; email?: string } };
  adminNote?: string;
  createdAt?: string;
}

interface SubScheduleEntry {
  absentTeacher?: string;
  substituteTeacher?: string;
  course?: string;
  courseCode?: string;
  room?: string;
  startTime?: string;
  endTime?: string;
  type?: string;
  semester?: number;
  division?: string;
  date?: string;
  dayOfWeek?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_META: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  substitutes_suggested: { label: 'Needs Assignment', dot: '#f59e0b', bg: '#fffbeb', text: '#92400e' },
  partially_assigned:    { label: 'Partially Covered', dot: '#3b82f6', bg: '#eff6ff', text: '#1e40af' },
  fully_assigned:        { label: 'Ready to Publish',  dot: '#6366f1', bg: '#eef2ff', text: '#3730a3' },
  published:             { label: 'Published ✓',        dot: '#10b981', bg: '#ecfdf5', text: '#065f46' },
  rejected:              { label: 'Rejected',            dot: '#ef4444', bg: '#fef2f2', text: '#991b1b' },
};

function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, dot: '#9ca3af', bg: '#f9fafb', text: '#374151' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
      borderRadius: 99, fontSize: 12, fontWeight: 600, background: m.bg, color: m.text,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.dot, display: 'inline-block' }} />
      {m.label}
    </span>
  );
}

function Spinner({ size = 16, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: `2px solid ${color}44`, borderTopColor: color,
      borderRadius: '50%', animation: 'spin .65s linear infinite',
    }} />
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface Toast { id: number; msg: string; type: 'ok' | 'err' }

function useToast() {
  const [list, setList] = useState<Toast[]>([]);
  const push = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    const id = Date.now();
    setList(l => [...l, { id, msg, type }]);
    setTimeout(() => setList(l => l.filter(x => x.id !== id)), 4000);
  }, []);
  return { list, push };
}

// ─── Temp Timetable Preview Modal ─────────────────────────────────────────────

function TempTimetableModal({ date, onClose }: { date: string; onClose: () => void }) {
  const [schedule, setSchedule] = useState<SubScheduleEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [meta, setMeta]         = useState<{ totalAbsent: number; totalCovered: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await apiGetFull<SubScheduleEntry[]>(`/absences/schedule/${date}`);
        if (r.success) {
          setSchedule(r.data);
          setMeta({ totalAbsent: r.totalAbsent ?? 0, totalCovered: r.totalCovered ?? 0 });
        }
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, [date]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 200, padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 680,
        maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,.2)',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
          padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize: 17, fontWeight: 800, color: '#fff', marginBottom: 2 }}>
              📅 Substitute Timetable — {fmtDate(date)}
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.75)' }}>
              {meta ? `${meta.totalAbsent} absent · ${meta.totalCovered} classes covered` : 'Published schedule visible to students'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: 20, flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spinner size={28} color="#4f46e5" />
            </div>
          ) : schedule.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 14 }}>
              No published schedule for this date yet.
            </div>
          ) : (
            <>
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#9ca3af', marginBottom: 12 }}>
                Schedule entries sorted by time
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {schedule.map((entry, i) => (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 12,
                    background: '#fafafa', border: '1px solid #f3f4f6', borderRadius: 12, padding: '12px 16px',
                    alignItems: 'center',
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontWeight: 800, fontSize: 15, color: '#111827' }}>{entry.startTime}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af' }}>{entry.endTime}</p>
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{entry.course}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                        {[entry.courseCode, entry.division && `Div ${entry.division}`, entry.type, entry.semester && `Sem ${entry.semester}`, entry.room && `📍 ${entry.room}`].filter(Boolean).map(t => (
                          <span key={t!} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 99, padding: '1px 7px', fontSize: 11, color: '#6b7280' }}>{t}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Absent</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>{entry.absentTeacher}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, marginBottom: 2 }}>Substitute</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#059669' }}>{entry.substituteTeacher}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Assign & Manage Modal ────────────────────────────────────────────────────

function ManageAbsenceModal({ absence, teachers, onClose, onUpdated }: {
  absence: AbsenceRequest;
  teachers: TeacherRef[];
  onClose: () => void;
  onUpdated: (msg: string) => void;
}) {
  // Map classId → selected substitute teacher ID
  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    absence.affectedClasses?.forEach(cls => {
      if (cls.substituteTeacher) init[cls._id] = cls.substituteTeacher;
    });
    return init;
  });
  const [note,     setNote]     = useState(absence.adminNote || '');
  const [saving,   setSaving]   = useState(false);
  const [pubbing,  setPubbing]  = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const canPublish = (absence.affectedClasses?.filter(c => c.substituteStatus === 'assigned').length ?? 0) > 0
    || Object.keys(assignments).length > 0;

  async function saveAssignments() {
    const toAssign = Object.entries(assignments)
      .filter(([classId, subId]) => {
        const cls = absence.affectedClasses?.find(c => c._id === classId);
        return subId && cls?.substituteTeacher !== subId;
      })
      .map(([classId, substituteTeacherId]) => ({ classId, substituteTeacherId }));

    if (!toAssign.length) return;
    setSaving(true);
    try {
      const r = await apiPatch(`/absences/${absence._id}/assign`, { assignments: toAssign, note });
      onUpdated(r.message || 'Assignments saved!');
    } catch (err: any) {
      onUpdated('ERROR:' + err.message);
    }
    setSaving(false);
  }

  async function publish() {
    // Save pending assignments first
    const toAssign = Object.entries(assignments)
      .filter(([classId, subId]) => {
        const cls = absence.affectedClasses?.find(c => c._id === classId);
        return subId && cls?.substituteTeacher !== subId;
      })
      .map(([classId, substituteTeacherId]) => ({ classId, substituteTeacherId }));

    setPubbing(true);
    try {
      if (toAssign.length) {
        await apiPatch(`/absences/${absence._id}/assign`, { assignments: toAssign });
      }
      const r = await apiPatch(`/absences/${absence._id}/publish`, { note });
      onUpdated(r.message || 'Substitute schedule published! Students can now see it.');
      onClose();
    } catch (err: any) {
      onUpdated('ERROR:' + err.message);
    }
    setPubbing(false);
  }

  async function reject() {
    if (!window.confirm('Reject this absence request?')) return;
    setRejecting(true);
    try {
      const r = await apiPatch(`/absences/${absence._id}/reject`, { note });
      onUpdated(r.message || 'Absence request rejected.');
      onClose();
    } catch (err: any) {
      onUpdated('ERROR:' + err.message);
    }
    setRejecting(false);
  }

  const teacherName = absence.teacher?.user?.name || 'Unknown Teacher';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 200, padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 600,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,.18)',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #f97316, #ef4444)',
          padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize: 17, fontWeight: 800, color: '#fff', marginBottom: 2 }}>
              Manage Absence — {teacherName}
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.75)' }}>
              {fmtDate(absence.absenceDate)} · {absence.dayOfWeek}
              {absence.reason && ` · "${absence.reason}"`}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#9ca3af', marginBottom: 12 }}>
            Assign substitutes per class
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {(absence.affectedClasses || []).map(cls => (
              <div key={cls._id} style={{
                background: '#fafafa', border: '1.5px solid #f3f4f6',
                borderRadius: 12, padding: '12px 14px',
              }}>
                {/* Class info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 3 }}>
                      {cls.courseName}
                      <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12, marginLeft: 6 }}>({cls.courseCode})</span>
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {[`⏰ ${cls.startTime}–${cls.endTime}`, cls.division && `Div ${cls.division}`, cls.type, cls.semester && `Sem ${cls.semester}`].filter(Boolean).map(t => (
                        <span key={t!} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 99, padding: '1px 7px', fontSize: 11, color: '#6b7280' }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  {cls.substituteStatus === 'assigned' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#ecfdf5', color: '#065f46', borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 600, border: '1px solid #a7f3d0', flexShrink: 0 }}>
                      <CheckCircle2 size={12} />Assigned
                    </span>
                  )}
                </div>

                {/* Suggested teachers quick-pick */}
                {cls.suggestedTeachers && cls.suggestedTeachers.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 5 }}>💡 Suggested (free this slot):</p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {cls.suggestedTeachers.map(s => (
                        <button key={s.teacher} onClick={() => setAssignments(a => ({ ...a, [cls._id]: s.teacher! }))}
                          style={{
                            padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                            border: '1.5px solid',
                            borderColor: assignments[cls._id] === s.teacher ? '#4f46e5' : '#e5e7eb',
                            background: assignments[cls._id] === s.teacher ? '#eff6ff' : '#fff',
                            color: assignments[cls._id] === s.teacher ? '#4f46e5' : '#6b7280',
                          }}>
                          {s.teacherName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Full teacher picker */}
                <select
                  value={assignments[cls._id] || ''}
                  onChange={e => setAssignments(a => ({ ...a, [cls._id]: e.target.value }))}
                  style={{
                    width: '100%', padding: '8px 10px', border: '1.5px solid #e5e7eb',
                    borderRadius: 8, fontSize: 13, color: '#111827', background: '#fff',
                    fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
                  }}
                >
                  <option value="">— Select substitute teacher —</option>
                  {teachers.map(t => (
                    <option key={t._id} value={t._id}>
                      {t.user?.name} {t.primaryDepartment?.name ? `· ${t.primaryDepartment.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Admin note */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Admin Note <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
            </label>
            <textarea rows={2} value={note} onChange={e => setNote(e.target.value)}
              placeholder="Internal note for records…"
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 13, color: '#111827', background: '#fafafa', fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ borderTop: '1px solid #f3f4f6', padding: '14px 24px', display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
          {/* Reject */}
          {!['published', 'rejected'].includes(absence.status) && (
            <button onClick={reject} disabled={rejecting} style={{
              padding: '10px 16px', borderRadius: 9, border: '1.5px solid #fca5a5',
              background: '#fef2f2', color: '#dc2626', fontWeight: 600, fontSize: 13,
              cursor: rejecting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {rejecting ? <Spinner size={14} color="#dc2626" /> : <XCircle size={14} />}
              Reject
            </button>
          )}

          <div style={{ flex: 1 }} />

          {/* Save assignments */}
          {absence.status !== 'published' && (
            <button onClick={saveAssignments} disabled={saving} style={{
              padding: '10px 16px', borderRadius: 9, border: '1.5px solid #e5e7eb',
              background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13,
              cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {saving ? <Spinner size={14} color="#374151" /> : <UserCheck size={14} />}
              Save Assignments
            </button>
          )}

          {/* Publish → generates temp timetable */}
          {absence.status !== 'published' && (
            <button onClick={publish} disabled={pubbing || !canPublish} style={{
              padding: '10px 20px', borderRadius: 9, border: 'none',
              background: canPublish ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : '#e5e7eb',
              color: canPublish ? '#fff' : '#9ca3af', fontWeight: 700, fontSize: 13,
              cursor: pubbing || !canPublish ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: canPublish ? '0 4px 14px #6366f130' : 'none',
            }}>
              {pubbing ? <Spinner size={14} /> : <Send size={14} />}
              Publish Schedule
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Absence Card (admin view) ────────────────────────────────────────────────

function AbsenceCard({ absence, teachers, onRefresh, onToast }: {
  absence: AbsenceRequest;
  teachers: TeacherRef[];
  onRefresh: () => void;
  onToast: (msg: string, type?: 'ok' | 'err') => void;
}) {
  const [open,       setOpen]       = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [showTT,     setShowTT]     = useState(false);

  const assigned = absence.affectedClasses?.filter(c => c.substituteStatus === 'assigned').length ?? 0;
  const total    = absence.affectedClasses?.length ?? 0;
  const teacherName = absence.teacher?.user?.name || 'Unknown';

  function handleUpdated(msg: string) {
    if (msg.startsWith('ERROR:')) onToast(msg.replace('ERROR:', ''), 'err');
    else { onToast(msg); onRefresh(); }
  }

  return (
    <>
      <div style={{
        border: `1.5px solid ${absence.status === 'substitutes_suggested' ? '#fde68a' : '#f3f4f6'}`,
        borderRadius: 14, background: absence.status === 'substitutes_suggested' ? '#fffdf0' : '#fff',
        overflow: 'hidden', transition: 'box-shadow .2s',
      }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,.07)')}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
      >
        <div onClick={() => setOpen(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}>
          {/* Avatar */}
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'linear-gradient(135deg, #f97316, #ef4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0,
          }}>
            {teacherName.charAt(0).toUpperCase()}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 1 }}>{teacherName}</p>
            <p style={{ fontSize: 12, color: '#9ca3af' }}>
              {fmtDate(absence.absenceDate)} · {absence.dayOfWeek} · {total} class{total !== 1 ? 'es' : ''} · {assigned} covered
              {absence.reason && ` · ${absence.reason}`}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <StatusPill status={absence.status} />
            {absence.status === 'published' && (
              <button onClick={e => { e.stopPropagation(); setShowTT(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: '1.5px solid #c7d2fe', background: '#eff6ff', color: '#4f46e5', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Eye size={13} />Preview
              </button>
            )}
            {!['published', 'rejected'].includes(absence.status) && (
              <button onClick={e => { e.stopPropagation(); setShowManage(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #f97316, #ef4444)', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                <UserCheck size={13} />Assign
              </button>
            )}
            <span style={{ color: '#9ca3af' }}>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
          </div>
        </div>

        {/* Expanded */}
        {open && absence.affectedClasses && (
          <div style={{ borderTop: '1px solid #f3f4f6', padding: '12px 16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {absence.affectedClasses.map(cls => (
                <div key={cls._id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#fafafa', borderRadius: 9, padding: '9px 12px', gap: 12,
                }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>
                      {cls.courseName}
                      <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12, marginLeft: 5 }}>({cls.courseCode})</span>
                    </p>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                      {cls.startTime}–{cls.endTime} · Div {cls.division} · {cls.type}
                    </p>
                  </div>
                  {cls.substituteStatus === 'assigned' && cls.substituteName ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#ecfdf5', color: '#065f46', borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 600, border: '1px solid #a7f3d0', flexShrink: 0 }}>
                      <CheckCircle2 size={12} /> {cls.substituteName}
                    </span>
                  ) : (
                    <span style={{ background: '#fffbeb', color: '#92400e', borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 600, border: '1px solid #fde68a', flexShrink: 0 }}>
                      Pending
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showManage && (
        <ManageAbsenceModal
          absence={absence}
          teachers={teachers}
          onClose={() => { setShowManage(false); onRefresh(); }}
          onUpdated={handleUpdated}
        />
      )}

      {showTT && (
        <TempTimetableModal
          date={absence.absenceDate.split('T')[0]}
          onClose={() => setShowTT(false)}
        />
      )}
    </>
  );
}

// ─── Main Admin Absence Page ──────────────────────────────────────────────────

export default function AdminAbsencePage() {
  const { list: toasts, push: toast } = useToast();

  const [absences,  setAbsences]  = useState<AbsenceRequest[]>([]);
  const [teachers,  setTeachers]  = useState<TeacherRef[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState<string>('substitutes_suggested');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query  = filter === 'all' ? '?status=all' : `?status=${filter}`;
      const [abs, tch] = await Promise.all([
        apiGet<AbsenceRequest[]>(`/absences/admin${query}`),
        apiGet<TeacherRef[]>('/teachers'),
      ]);
      setAbsences(abs);
      setTeachers(tch);
    } catch (err: any) {
      toast(err.message, 'err');
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  // Stats
  const needsAction  = absences.filter(a => a.status === 'substitutes_suggested').length;
  const partial      = absences.filter(a => a.status === 'partially_assigned').length;
  const readyPub     = absences.filter(a => a.status === 'fully_assigned').length;
  const published    = absences.filter(a => a.status === 'published').length;

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f8f9fc', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '28px 20px 60px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 28, animation: 'slideUp .4s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #f97316, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px #ef444444' }}>
                    <BadgeAlert size={18} color="#fff" />
                  </div>
                  <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0 }}>Absence Management</h1>
                </div>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: 0, marginLeft: 48 }}>
                  Assign substitutes · Publish one-day timetable · Students see updated schedule
                </p>
              </div>
              <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: '#fff', color: '#6b7280', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
                <RefreshCw size={14} />Refresh
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24, animation: 'slideUp .45s ease' }}>
            {[
              { label: 'Needs Action',   value: needsAction, icon: AlertTriangle, color: '#d97706', bg: '#fffbeb' },
              { label: 'Partial Cover',  value: partial,     icon: Clock,         color: '#3b82f6', bg: '#eff6ff' },
              { label: 'Ready to Pub',   value: readyPub,    icon: CheckCircle2,  color: '#6366f1', bg: '#eef2ff' },
              { label: 'Published',      value: published,   icon: Send,          color: '#059669', bg: '#ecfdf5' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color={color} />
                </div>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#111827', lineHeight: 1, marginBottom: 2 }}>{value}</p>
                  <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filter pills + count */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', animation: 'slideUp .5s ease' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                ['substitutes_suggested', 'Needs Assignment'],
                ['partially_assigned',    'Partially Covered'],
                ['fully_assigned',        'Ready to Publish'],
                ['published',             'Published'],
                ['rejected',              'Rejected'],
                ['all',                   'All'],
              ].map(([k, l]) => (
                <button key={k} onClick={() => setFilter(k)} style={{
                  padding: '5px 12px', borderRadius: 99, border: '1.5px solid',
                  borderColor: filter === k ? '#f97316' : '#e5e7eb',
                  background: filter === k ? '#fff7ed' : 'transparent',
                  color: filter === k ? '#f97316' : '#9ca3af',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all .15s',
                }}>{l}</button>
              ))}
            </div>
            <p style={{ fontSize: 13, color: '#9ca3af', fontWeight: 500 }}>{absences.length} record{absences.length !== 1 ? 's' : ''}</p>
          </div>

          {/* List */}
          <div style={{ animation: 'slideUp .55s ease' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ width: 36, height: 36, border: '3px solid #fee2e2', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 12px' }} />
                <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading absence requests…</p>
              </div>
            ) : absences.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6' }}>
                <div style={{ width: 56, height: 56, background: '#fff7ed', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Calendar size={24} color="#f97316" />
                </div>
                <p style={{ fontWeight: 700, fontSize: 15, color: '#374151', marginBottom: 4 }}>No absence requests</p>
                <p style={{ fontSize: 13, color: '#9ca3af' }}>
                  {filter === 'all' ? 'No records in the system yet.' : 'No records matching this filter.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {absences.map(a => (
                  <AbsenceCard
                    key={a._id} absence={a} teachers={teachers}
                    onRefresh={load}
                    onToast={(msg, type) => toast(msg, type ?? 'ok')}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toasts */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 300, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: t.type === 'err' ? '#fef2f2' : '#ecfdf5',
            border: `1px solid ${t.type === 'err' ? '#fca5a5' : '#6ee7b7'}`,
            color: t.type === 'err' ? '#991b1b' : '#065f46',
            padding: '11px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,.10)', animation: 'slideUp .3s ease',
            display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto',
          }}>
            {t.type === 'err' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
            {t.msg}
          </div>
        ))}
      </div>
    </>
  );
}