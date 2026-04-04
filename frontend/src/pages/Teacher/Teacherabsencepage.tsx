/**
 * pages/teacher/TeacherAbsencePage.tsx
 *
 * Standalone absence management page for teachers.
 * Routes: /teacher/absences
 *
 * API wiring:
 *   POST  /api/absences              → markAbsent
 *   GET   /api/absences/my-absences  → getMyAbsences
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, BadgeAlert, Calendar, CheckCircle2,
  ChevronDown, ChevronUp, Clock, RefreshCw, X, FileText,
} from 'lucide-react';

// ─── API ──────────────────────────────────────────────────────────────────────

const BASE = '/api';

function headers() {
  const t = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

async function apiPost<T>(path: string, body: unknown): Promise<{ data: T; message?: string }> {
  const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || 'Request failed');
  return { data: j.data as T, message: j.message };
}

async function apiGet<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { headers: headers() });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || 'Request failed');
  return j.data as T;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AffectedClass {
  _id: string;
  courseName?: string | null;
  courseCode?: string | null;
  startTime?: string;
  endTime?: string;
  division?: string;
  type?: string;
  semester?: number;
  substituteStatus?: string;
  substituteName?: string | null;
  suggestedTeachers?: { teacherName?: string; reason?: string }[];
}

interface AbsenceRequest {
  _id: string;
  absenceDate: string;
  dayOfWeek?: string;
  reason?: string;
  status: string;
  affectedClasses?: AffectedClass[];
  createdAt?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_META: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  substitutes_suggested: { label: 'Pending Admin',     dot: '#f59e0b', bg: '#fffbeb', text: '#92400e' },
  partially_assigned:    { label: 'Partially Covered', dot: '#3b82f6', bg: '#eff6ff', text: '#1e40af' },
  fully_assigned:        { label: 'Fully Assigned',    dot: '#6366f1', bg: '#eef2ff', text: '#3730a3' },
  published:             { label: 'Published ✓',       dot: '#10b981', bg: '#ecfdf5', text: '#065f46' },
  rejected:              { label: 'Rejected',           dot: '#ef4444', bg: '#fef2f2', text: '#991b1b' },
};

function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, dot: '#9ca3af', bg: '#f9fafb', text: '#374151' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
      background: m.bg, color: m.text,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.dot, display: 'inline-block', flexShrink: 0 }} />
      {m.label}
    </span>
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

// ─── Mark Absence Modal ───────────────────────────────────────────────────────

function MarkAbsenceModal({ onClose, onCreated }: { onClose: () => void; onCreated: (msg: string) => void }) {
  const [date,    setDate]    = useState('');
  const [reason,  setReason]  = useState('');
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;
    setLoading(true);
    try {
      const r = await apiPost('/absences', { absenceDate: date, reason });
      onCreated(r.message || 'Absence submitted. Admin has been notified.');
      onClose();
    } catch (err: any) {
      onCreated('ERROR:' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 200, padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480,
        boxShadow: '0 24px 80px rgba(0,0,0,.18)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #f97316, #ef4444)',
          padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 2 }}>Mark Absence</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.75)' }}>Admin will arrange substitutes for your classes</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>

        {/* Notice */}
        <div style={{ margin: '16px 24px 0', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>
          ⚠️ Your regular timetable stays <strong>unchanged</strong>. Substitution is for this date only. Admin approval is required before students see the updated schedule.
        </div>

        <form onSubmit={submit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Absence Date *
            </label>
            <input type="date" min={today} required value={date} onChange={e => setDate(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 14, color: '#111827', background: '#fafafa', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Reason <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
            </label>
            <textarea rows={3} placeholder="Medical, personal, workshop, conference…" value={reason} onChange={e => setReason(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 14, color: '#111827', background: '#fafafa', outline: 'none', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button type="submit" disabled={loading} style={{
              flex: 1, padding: '11px 16px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #f97316, #ef4444)',
              color: '#fff', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: loading ? .7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {loading ? <><Spinner />&nbsp;Submitting…</> : <>📋 Submit Absence</>}
            </button>
            <button type="button" onClick={onClose} style={{
              padding: '11px 18px', borderRadius: 10, border: '1.5px solid #e5e7eb',
              background: '#fff', color: '#6b7280', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Absence Card ─────────────────────────────────────────────────────────────

function AbsenceCard({ absence }: { absence: AbsenceRequest }) {
  const [open, setOpen] = useState(false);
  const assigned = absence.affectedClasses?.filter(c => c.substituteStatus === 'assigned').length ?? 0;
  const total    = absence.affectedClasses?.length ?? 0;

  return (
    <div style={{
      border: '1.5px solid #f3f4f6',
      borderRadius: 14, background: '#fff',
      overflow: 'hidden', transition: 'box-shadow .2s',
    }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,.07)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      {/* Summary row */}
      <div onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'linear-gradient(135deg, #f97316, #ef4444)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <BadgeAlert size={18} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 2 }}>
            {fmtDate(absence.absenceDate)}
            {absence.dayOfWeek && <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: 6, fontSize: 13 }}>· {absence.dayOfWeek}</span>}
          </p>
          <p style={{ fontSize: 12, color: '#9ca3af' }}>
            {total} class{total !== 1 ? 'es' : ''} · {assigned} covered
            {absence.reason && ` · ${absence.reason}`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <StatusPill status={absence.status} />
          <span style={{ color: '#9ca3af' }}>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
        </div>
      </div>

      {/* Expanded classes */}
      {open && absence.affectedClasses && (
        <div style={{ borderTop: '1px solid #f3f4f6', padding: '12px 16px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#9ca3af', marginBottom: 8 }}>
            Affected Classes
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {absence.affectedClasses.map(cls => (
              <div key={cls._id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#fafafa', border: '1px solid #f3f4f6', borderRadius: 10,
                padding: '10px 12px', gap: 12,
              }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 13, color: '#111827', marginBottom: 2 }}>
                    {cls.courseName || '—'}
                    <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12, marginLeft: 6 }}>({cls.courseCode})</span>
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {[`⏰ ${cls.startTime}–${cls.endTime}`, cls.division ? `Div ${cls.division}` : null, cls.type, cls.semester ? `Sem ${cls.semester}` : null].filter(Boolean).map(tag => (
                      <span key={tag!} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 99, padding: '1px 7px', fontSize: 11, color: '#6b7280' }}>{tag}</span>
                    ))}
                  </div>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  {cls.substituteStatus === 'assigned' && cls.substituteName ? (
                    <div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#ecfdf5', color: '#065f46', borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 600, border: '1px solid #a7f3d0' }}>
                        <CheckCircle2 size={12} />
                        {cls.substituteName}
                      </span>
                      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>Substitute</p>
                    </div>
                  ) : (
                    <div>
                      <span style={{ display: 'inline-block', background: '#fffbeb', color: '#92400e', borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 600, border: '1px solid #fde68a' }}>
                        Pending
                      </span>
                      {cls.suggestedTeachers && cls.suggestedTeachers.length > 0 && (
                        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>
                          {cls.suggestedTeachers.length} suggestion{cls.suggestedTeachers.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Published notice */}
          {absence.status === 'published' && (
            <div style={{ marginTop: 12, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#065f46' }}>
              ✅ Substitute schedule published. Students can see today's updated timetable.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: `2px solid rgba(255,255,255,.3)`, borderTopColor: '#fff',
      borderRadius: '50%', animation: 'spin .65s linear infinite',
    }} />
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TeacherAbsencePage() {
  const { list: toasts, push: toast } = useToast();

  const [absences,   setAbsences]   = useState<AbsenceRequest[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<AbsenceRequest[]>('/absences/my-absences');
      setAbsences(data);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleCreated(msg: string) {
    if (msg.startsWith('ERROR:')) toast(msg.replace('ERROR:', ''), 'err');
    else { toast(msg); load(); }
  }

  // Stats
  const pending   = absences.filter(a => ['substitutes_suggested', 'partially_assigned', 'fully_assigned'].includes(a.status)).length;
  const published = absences.filter(a => a.status === 'published').length;
  const totalClasses = absences.reduce((acc, a) => acc + (a.affectedClasses?.length ?? 0), 0);

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f8f9fc', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '28px 20px 60px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>

          {/* Page header */}
          <div style={{ marginBottom: 28, animation: 'slideUp .4s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: 'linear-gradient(135deg, #f97316, #ef4444)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 14px #ef444444',
                  }}>
                    <BadgeAlert size={18} color="#fff" />
                  </div>
                  <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0 }}>Absence Requests</h1>
                </div>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: 0, marginLeft: 48 }}>
                  Mark your absence · Admin assigns substitutes · Students see updated schedule
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: '#fff', color: '#6b7280', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
                  <RefreshCw size={14} />Refresh
                </button>
                <button onClick={() => setShowModal(true)} style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, border: 'none',
                  background: 'linear-gradient(135deg, #f97316, #ef4444)',
                  color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                  boxShadow: '0 4px 14px #ef444430',
                }}>
                  <BadgeAlert size={15} />Mark Absence
                </button>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24, animation: 'slideUp .45s ease' }}>
            {[
              { label: 'Pending Admin',   value: pending,      icon: Clock,       color: '#d97706', bg: '#fffbeb' },
              { label: 'Published',       value: published,    icon: CheckCircle2, color: '#059669', bg: '#ecfdf5' },
              { label: 'Total Classes',   value: totalClasses, icon: FileText,    color: '#4f46e5', bg: '#eff6ff' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} color={color} />
                </div>
                <div>
                  <p style={{ fontSize: 22, fontWeight: 800, color: '#111827', lineHeight: 1, marginBottom: 2 }}>{value}</p>
                  <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Flow explanation */}
          <div style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 14, padding: '14px 18px', marginBottom: 20, animation: 'slideUp .5s ease' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>How it works</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
              {[
                { step: '1', label: 'You mark absence',      color: '#f97316' },
                { step: '→', label: '',                      color: '#e5e7eb', isArrow: true },
                { step: '2', label: 'Admin assigns subs',    color: '#3b82f6' },
                { step: '→', label: '',                      color: '#e5e7eb', isArrow: true },
                { step: '3', label: 'Admin publishes',       color: '#6366f1' },
                { step: '→', label: '',                      color: '#e5e7eb', isArrow: true },
                { step: '4', label: 'Students see schedule', color: '#10b981' },
              ].map((item, i) => (
                item.isArrow
                  ? <span key={i} style={{ color: '#d1d5db', fontSize: 18, margin: '0 8px' }}>→</span>
                  : <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: item.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{item.step}</div>
                      <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{item.label}</span>
                    </div>
              ))}
            </div>
          </div>

          {/* Absence list */}
          <div style={{ animation: 'slideUp .55s ease' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ width: 36, height: 36, border: '3px solid #fee2e2', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 12px' }} />
                <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading absence history…</p>
              </div>
            ) : absences.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6' }}>
                <div style={{ width: 56, height: 56, background: '#fff7ed', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Calendar size={24} color="#f97316" />
                </div>
                <p style={{ fontWeight: 700, fontSize: 15, color: '#374151', marginBottom: 4 }}>No absence records</p>
                <p style={{ fontSize: 13, color: '#9ca3af' }}>Use "Mark Absence" to notify admin of your upcoming absence.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {absences.map(a => <AbsenceCard key={a._id} absence={a} />)}
              </div>
            )}
          </div>

        </div>
      </div>

      {showModal && (
        <MarkAbsenceModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}

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