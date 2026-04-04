/**
 * pages/teacher/TeacherSwapPage.tsx
 *
 * UX-REDESIGN: Teachers no longer type MongoDB IDs.
 *
 * New "Create Swap" flow (3 clicks):
 *   Step 1 → Pick a teacher from a searchable list
 *   Step 2 → Click one of YOUR sessions (loaded from your schedule)
 *   Step 3 → Click one of THEIR sessions (loaded automatically)
 *   → Review summary → Send
 *
 * Backend wired to:
 *   GET  /api/swaps/teacher-schedule/:teacherId  ← new endpoint (see swapScheduleRoute.js)
 *   GET  /api/swaps/outgoing
 *   GET  /api/swaps/incoming?status=all
 *   GET  /api/teachers
 *   POST /api/swaps
 *   PATCH /api/swaps/:id/respond
 *   PATCH /api/swaps/:id/cancel
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight, Check, ChevronDown, ChevronUp, Clock,
  Inbox, Plus, RefreshCw, Search, Send, X, AlertCircle,
  CheckCircle2, Calendar, User, BookOpen, MapPin,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────
const BASE = '/api';

function hdrs() {
  const t = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { headers: hdrs(), ...init });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || j.message || 'Request failed');
  return j.data as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface Teacher {
  _id: string;
  user?: { name?: string; email?: string };
  primaryDepartment?: { name?: string };
}

interface PickableSession {
  timetableId:   string;
  scheduleIndex: number;
  courseCode:    string;
  courseName:    string;
  dayOfWeek:     string;
  startTime:     string;
  endTime:       string;
  type:          string;
  division:      string;
  batch:         string | null;
  semester:      string | number;
  roomNumber:    string;
}

interface SwapSession {
  courseCode?: string;
  courseName?: string;
  dayOfWeek?:  string;
  startTime?:  string;
  endTime?:    string;
  division?:   string;
  type?:       string;
  semester?:   string | number;
}

interface SwapRequest {
  _id:          string;
  status:       string;
  createdAt:    string;
  reason?:      string;
  teacherNote?: string;
  adminNote?:   string;
  requestedBy?: { _id?: string; user?: { name?: string } };
  requestedTo?: { _id?: string; user?: { name?: string } };
  fromSession?: SwapSession;
  toSession?:   SwapSession;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const DAY_SHORT: Record<string, string> = {
  Monday:'Mon', Tuesday:'Tue', Wednesday:'Wed', Thursday:'Thu', Friday:'Fri', Saturday:'Sat',
};

const STATUS_META: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  pending_teacher:  { label: 'Awaiting Response', bg: '#fefce8', color: '#854d0e', dot: '#ca8a04' },
  pending_admin:    { label: 'Pending Admin',      bg: '#eff6ff', color: '#1e40af', dot: '#3b82f6' },
  approved:         { label: 'Approved',           bg: '#f0fdf4', color: '#14532d', dot: '#22c55e' },
  rejected_teacher: { label: 'Declined',           bg: '#fef2f2', color: '#7f1d1d', dot: '#ef4444' },
  rejected_admin:   { label: 'Rejected by Admin',  bg: '#fef2f2', color: '#7f1d1d', dot: '#ef4444' },
  cancelled:        { label: 'Cancelled',          bg: '#f9fafb', color: '#6b7280', dot: '#9ca3af' },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function to12h(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${(h % 12) || 12}:${m.toString().padStart(2, '0')} ${ap}`;
}

function avatarColor(name = '') {
  const colors = ['#4f46e5','#0891b2','#059669','#d97706','#dc2626','#7c3aed','#db2777'];
  return colors[(name.charCodeAt(0) || 0) % colors.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState<{ id: number; msg: string; ok: boolean }[]>([]);
  const push = useCallback((msg: string, ok = true) => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, ok }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3800);
  }, []);
  return { toasts, push };
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION CARD — clickable chip used in the picker
// ─────────────────────────────────────────────────────────────────────────────
function SessionChip({
  session, selected, onSelect, disabled,
}: {
  session: PickableSession;
  selected: boolean;
  onSelect:  () => void;
  disabled?: boolean;
}) {
  const isLab = session.type?.toLowerCase().includes('lab');
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      style={{
        width: '100%', textAlign: 'left',
        padding: '12px 14px', borderRadius: 10,
        border: `2px solid ${selected ? '#4f46e5' : '#e5e7eb'}`,
        background: selected ? '#eef2ff' : '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all .15s',
        position: 'relative', overflow: 'hidden',
      }}
      onMouseEnter={e => { if (!selected && !disabled) (e.currentTarget as HTMLElement).style.borderColor = '#a5b4fc'; }}
      onMouseLeave={e => { if (!selected && !disabled) (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'; }}
    >
      {selected && (
        <div style={{
          position: 'absolute', top: 8, right: 8, width: 20, height: 20,
          borderRadius: '50%', background: '#4f46e5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={11} color="#fff" strokeWidth={3} />
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{
          fontSize: 12, fontWeight: 800, color: selected ? '#4f46e5' : '#374151',
          fontFamily: 'monospace', letterSpacing: '0.3px',
        }}>{session.courseCode}</span>
        <span style={{
          fontSize: 10, fontWeight: 700,
          background: isLab ? '#fef3c7' : '#dbeafe',
          color:      isLab ? '#92400e' : '#1e40af',
          padding: '1px 6px', borderRadius: 99,
        }}>{isLab ? 'LAB' : 'LEC'}</span>
        {session.batch && (
          <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 500 }}>Batch {session.batch}</span>
        )}
      </div>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, fontWeight: 500 }}>
        {session.courseName}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {[
          `📅 ${DAY_SHORT[session.dayOfWeek] || session.dayOfWeek}`,
          `⏰ ${to12h(session.startTime)}–${to12h(session.endTime)}`,
          `Div ${session.division}`,
          `🚪 ${session.roomNumber}`,
        ].map(t => (
          <span key={t} style={{
            fontSize: 11, color: '#9ca3af',
            background: '#f9fafb', border: '1px solid #f3f4f6',
            padding: '2px 7px', borderRadius: 99,
          }}>{t}</span>
        ))}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE SWAP WIZARD — 3-step, no manual IDs
// ─────────────────────────────────────────────────────────────────────────────
interface WizardProps {
  myTeacherId: string; // current user's Teacher._id
  onClose:   () => void;
  onCreated: (msg: string) => void;
}

type WizardStep = 'pick-teacher' | 'pick-my-session' | 'pick-their-session' | 'confirm';

function CreateSwapWizard({ myTeacherId, onClose, onCreated }: WizardProps) {
  const [step,          setStep]          = useState<WizardStep>('pick-teacher');
  const [teachers,      setTeachers]      = useState<Teacher[]>([]);
  const [search,        setSearch]        = useState('');
  const [targetTeacher, setTargetTeacher] = useState<Teacher | null>(null);
  const [mySessions,    setMySessions]    = useState<PickableSession[]>([]);
  const [theirSessions, setTheirSessions] = useState<PickableSession[]>([]);
  const [mySession,     setMySession]     = useState<PickableSession | null>(null);
  const [theirSession,  setTheirSession]  = useState<PickableSession | null>(null);
  const [reason,        setReason]        = useState('');
  const [loading,       setLoading]       = useState(false);
  const [loadingMsg,    setLoadingMsg]    = useState('');
  const [swapDate, setSwapDate] = useState('');
  // Load teachers + my sessions on mount
  useEffect(() => {
    const load = async () => {
      setLoading(true); setLoadingMsg('Loading teachers…');
      try {
        const [ts, myData] = await Promise.all([
          apiFetch<Teacher[]>('/teachers'),
          apiFetch<{ sessions: PickableSession[] }>(`/swaps/teacher-schedule/${myTeacherId}`),
        ]);
        setTeachers(ts.filter(t => t._id !== myTeacherId));
        setMySessions(myData.sessions);
      } catch (e: any) {
        onCreated('ERROR:' + e.message);
        onClose();
      }
      setLoading(false); setLoadingMsg('');
    };
    load();
  }, [myTeacherId]);

  // Load their sessions when teacher selected
  const selectTeacher = async (t: Teacher) => {
    setTargetTeacher(t);
    setLoading(true); setLoadingMsg(`Loading ${t.user?.name}'s schedule…`);
    try {
      const data = await apiFetch<{ sessions: PickableSession[] }>(`/swaps/teacher-schedule/${t._id}`);
      setTheirSessions(data.sessions);
    } catch {
      setTheirSessions([]);
    }
    setLoading(false); setLoadingMsg('');
    setStep('pick-my-session');
  };

const submit = async () => {
  if (!mySession || !theirSession || !targetTeacher) return;

  // ✅ validation
  if (!swapDate) {
    alert("Please select a date for the swap!");
    return;
  }

  setLoading(true);
  setLoadingMsg('Sending swap request…');

  try {
    const res = await apiFetch<{ message?: string }>('/swaps', {
      method: 'POST',
      body: JSON.stringify({
        requestedToTeacherId: targetTeacher._id,
        fromTimetableId:      mySession.timetableId,
        fromScheduleIndex:    mySession.scheduleIndex,
        toTimetableId:        theirSession.timetableId,
        toScheduleIndex:      theirSession.scheduleIndex,
        reason,
        swapDate:              swapDate ,
        
      }),
    });

    onCreated((res as any).message || 'Swap request sent!');
    onClose();
  } catch (e: any) {
    onCreated('ERROR:' + e.message);
  }

  setLoading(false);
};

  const filtered = useMemo(() =>
    teachers.filter(t =>
      t.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.primaryDepartment?.name?.toLowerCase().includes(search.toLowerCase())
    ), [teachers, search]
  );

  const stepNum = { 'pick-teacher': 1, 'pick-my-session': 2, 'pick-their-session': 3, 'confirm': 4 };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
      backdropFilter: 'blur(6px)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 640,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(0,0,0,.2)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginBottom: 4 }}>
              Request a Lecture Swap
            </div>
            {/* Stepper */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              {([
                [1, 'Choose Teacher'],
                [2, 'Your Session'],
                [3, 'Their Session'],
                [4, 'Confirm'],
              ] as [number, string][]).map(([n, label], i, arr) => {
                const current = stepNum[step];
                const done    = current > n;
                const active  = current === n;
                return (
                  <React.Fragment key={n}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 800,
                        background: done ? '#4f46e5' : active ? '#4f46e5' : '#e5e7eb',
                        color: done || active ? '#fff' : '#9ca3af',
                      }}>
                        {done ? <Check size={11} strokeWidth={3} /> : n}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: active ? 700 : 400, color: active ? '#4f46e5' : done ? '#6b7280' : '#d1d5db' }}>
                        {label}
                      </span>
                    </div>
                    {i < arr.length - 1 && (
                      <div style={{ width: 20, height: 1, background: done ? '#4f46e5' : '#e5e7eb', margin: '0 4px', flexShrink: 0 }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#f9fafb', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#9ca3af' }}>
            <X size={16} />
          </button>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e0e7ff', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 10px' }} />
            <p style={{ fontSize: 13, color: '#6b7280' }}>{loadingMsg}</p>
          </div>
        )}

        {/* Step content */}
        {!loading && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

            {/* ── STEP 1: Pick teacher ── */}
            {step === 'pick-teacher' && (
              <div>
                <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 14 }}>
                  Who do you want to swap a session with?
                </p>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    autoFocus
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name or department…"
                    style={inputSt}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
                  {filtered.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#9ca3af', padding: '30px 0', fontSize: 13 }}>No teachers found</p>
                  )}
                  {filtered.map(t => {
                    const name  = t.user?.name || 'Unknown';
                    const dept  = t.primaryDepartment?.name || '';
                    const color = avatarColor(name);
                    return (
                      <button
                        key={t._id}
                        onClick={() => selectTeacher(t)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 14px', borderRadius: 10,
                          border: '1.5px solid #e5e7eb', background: '#fff',
                          cursor: 'pointer', textAlign: 'left', transition: 'all .14s',
                          fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#a5b4fc'; (e.currentTarget as HTMLElement).style.background = '#fafbff'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLElement).style.background = '#fff'; }}
                      >
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg,${color}cc,${color})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                          {name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{name}</div>
                          {dept && <div style={{ fontSize: 12, color: '#9ca3af' }}>{dept}</div>}
                        </div>
                        <ChevronDown size={14} color="#d1d5db" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── STEP 2: Pick MY session ── */}
            {step === 'pick-my-session' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={13} color="#4f46e5" />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
                    Select <strong>your</strong> session to swap
                  </p>
                </div>
                {mySessions.length === 0 ? (
                  <EmptySchedule msg="No published sessions found in your timetable." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {mySessions.map((s, i) => (
                      <SessionChip
                        key={i} session={s}
                        selected={mySession?.timetableId === s.timetableId && mySession?.scheduleIndex === s.scheduleIndex}
                        onSelect={() => { setMySession(s); setStep('pick-their-session'); }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 3: Pick THEIR session ── */}
            {step === 'pick-their-session' && (
              <div>
                {/* Show my selection */}
                <div style={{ background: '#eef2ff', border: '1.5px solid #c7d2fe', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#4f46e5', letterSpacing: '.05em', textTransform: 'uppercase', flexShrink: 0, marginTop: 2 }}>Your session</div>
                  <div>
                    <span style={{ fontWeight: 700, color: '#111827', fontSize: 13 }}>{mySession?.courseCode}</span>
                    <span style={{ color: '#6b7280', fontSize: 12 }}> · {DAY_SHORT[mySession?.dayOfWeek || '']} {to12h(mySession?.startTime || '')} · Div {mySession?.division}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowLeftRight size={13} color="#0891b2" />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
                    Select <strong>{targetTeacher?.user?.name?.split(' ')[0]}'s</strong> session to swap with
                  </p>
                </div>

                {theirSessions.length === 0 ? (
                  <EmptySchedule msg={`${targetTeacher?.user?.name} has no published sessions available for swap.`} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {theirSessions.map((s, i) => (
                      <SessionChip
                        key={i} session={s}
                        selected={theirSession?.timetableId === s.timetableId && theirSession?.scheduleIndex === s.scheduleIndex}
                        onSelect={() => { setTheirSession(s); setStep('confirm'); }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 4: Confirm ── */}
            {step === 'confirm' && mySession && theirSession && targetTeacher && (
              
              <div>
                
                <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                  Review your swap and optionally add a reason.
                </p>

                {/* Swap summary */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'stretch', marginBottom: 16, flexWrap: 'wrap' }}>
                  <ConfirmSessionBox session={mySession} label="Your Session" color="#4f46e5" />
                  <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ArrowLeftRight size={14} color="#6b7280" />
                    </div>
                  </div>
                  <ConfirmSessionBox session={theirSession} label={`${targetTeacher.user?.name?.split(' ')[0]}'s Session`} color="#0891b2" />
                </div>

                {/* Notice */}
                <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', marginBottom: 14, lineHeight: 1.5 }}>
                  ℹ️ This swap applies to <strong>one occurrence only</strong> — the permanent timetable stays unchanged. Admin approval is required before it takes effect.
                </div>
                <div style={{ marginTop: 12 }}>
                <label style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#6b7280',
                  marginBottom: 6
                }}>
                  Swap Date <span style={{ color: 'red' }}>*</span>
                </label>

                <input
                  type="date"
                  value={swapDate}
                  onChange={(e) => setSwapDate(e.target.value)}
                  style={{
                    ...inputSt,
                    background: '#fff'
                  }}
                />
              </div>

                {/* Reason */}
                <div style={{ marginBottom: 4 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>
                    Reason <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span>
                  </label>
                  <textarea
                    value={reason} onChange={e => setReason(e.target.value)}
                    rows={2} placeholder="e.g. Medical appointment, conference attendance…"
                    style={{ ...inputSt, resize: 'vertical', minHeight: 60 }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer buttons */}
        {!loading && (
          <div style={{ padding: '14px 24px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            {step !== 'pick-teacher' && (
              <button onClick={() => {
                if (step === 'pick-my-session')    { setStep('pick-teacher'); setTargetTeacher(null); }
                if (step === 'pick-their-session') { setStep('pick-my-session'); setMySession(null); }
                if (step === 'confirm')            { setStep('pick-their-session'); setTheirSession(null); }
              }} style={ghostBtn}>
                ← Back
              </button>
            )}
            <button onClick={onClose} style={ghostBtn}>Cancel</button>

            {step === 'confirm' && (
              <button onClick={submit} disabled={loading} style={primaryBtn}>
                <Send size={14} /> Send Swap Request
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ConfirmSessionBox({ session, label, color }: { session: PickableSession; label: string; color: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: `${color}0d`, border: `1.5px solid ${color}30`, borderRadius: 10, padding: '12px 14px' }}>
      <p style={{ fontSize: 10, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
        {session.courseCode} <span style={{ fontSize: 12, fontWeight: 400, color: '#6b7280' }}>— {session.courseName}</span>
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {[
          `📅 ${session.dayOfWeek}`,
          `⏰ ${to12h(session.startTime)} – ${to12h(session.endTime)}`,
          `Div ${session.division}`,
          `🚪 ${session.roomNumber}`,
        ].map(t => (
          <span key={t} style={{ fontSize: 11, color: '#6b7280', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 99, padding: '2px 8px' }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

function EmptySchedule({ msg }: { msg: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '30px 0', background: '#fafafa', borderRadius: 10, border: '1px solid #f3f4f6' }}>
      <Calendar size={28} color="#d1d5db" style={{ marginBottom: 8 }} />
      <p style={{ fontSize: 13, color: '#9ca3af' }}>{msg}</p>
    </div>
  );
}

const inputSt: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  border: '1.5px solid #e5e7eb', borderRadius: 8,
  fontSize: 13, color: '#111827', background: '#fafafa',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};
const ghostBtn: React.CSSProperties = {
  padding: '9px 16px', borderRadius: 9, border: '1.5px solid #e5e7eb',
  background: '#fff', color: '#6b7280', cursor: 'pointer',
  fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
};
const primaryBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 7,
  padding: '9px 20px', borderRadius: 9, border: 'none',
  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
  color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
  boxShadow: '0 4px 14px rgba(79,70,229,.35)',
};

// ─────────────────────────────────────────────────────────────────────────────
// SWAP CARD (list view)
// ─────────────────────────────────────────────────────────────────────────────
function SwapCard({
  swap, type, onCancel, onRespond, actingId,
}: {
  swap: SwapRequest; type: 'outgoing' | 'incoming';
  onCancel:  (id: string) => Promise<void>;
  onRespond: (id: string, action: 'accept' | 'reject') => Promise<void>;
  actingId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const meta   = STATUS_META[swap.status] ?? { label: swap.status, bg: '#f9fafb', color: '#374151', dot: '#9ca3af' };
  const isActive = ['pending_teacher','pending_admin'].includes(swap.status);
  const other  = (type === 'outgoing' ? swap.requestedTo?.user?.name : swap.requestedBy?.user?.name) || 'Unknown';
  const color  = avatarColor(other);

  return (
    <div style={{
      background: '#fff',
      border: `1.5px solid ${isActive ? '#e0e7ff' : '#f3f4f6'}`,
      borderRadius: 14, overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,.04)',
      transition: 'box-shadow .2s',
    }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.08)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.04)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}
        onClick={() => setOpen(v => !v)}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg,${color}cc,${color})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 800 }}>
          {other.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: '#111827', margin: 0 }}>
            {type === 'outgoing' ? `→ ${other}` : `← ${other}`}
          </p>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>
            {swap.fromSession?.courseCode} ⇌ {swap.toSession?.courseCode}
            {' · '}{fmtDate(swap.createdAt)}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: meta.bg, color: meta.color }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.dot, display: 'inline-block', flexShrink: 0 }} />
            {meta.label}
          </span>
          <span style={{ color: '#d1d5db' }}>{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
        </div>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid #f9fafb', padding: '14px 16px' }}>
          {/* Session boxes */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <MiniSessionBox s={swap.fromSession} label={type === 'outgoing' ? 'Your Session' : 'Their Session'} color="#4f46e5" />
            <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <ArrowLeftRight size={14} color="#d1d5db" />
            </div>
            <MiniSessionBox s={swap.toSession} label={type === 'outgoing' ? 'Their Session' : 'Your Session'} color="#0891b2" />
          </div>

          {swap.reason && <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}><strong>Reason:</strong> {swap.reason}</p>}
          {swap.teacherNote && <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}><em>Note: {swap.teacherNote}</em></p>}
          {swap.adminNote   && <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}><em>Admin: {swap.adminNote}</em></p>}

          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {type === 'outgoing' && isActive && (
              <button disabled={actingId === swap._id + 'cancel'} onClick={() => onCancel(swap._id)}
                style={{ ...ghostBtn, fontSize: 12, padding: '6px 12px', color: '#dc2626', borderColor: '#fecaca' }}>
                Cancel Request
              </button>
            )}
            {type === 'incoming' && swap.status === 'pending_teacher' && (
              <>
                <button disabled={actingId === swap._id + 'accept'} onClick={() => onRespond(swap._id, 'accept')}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
                  <Check size={12} strokeWidth={3} />Accept
                </button>
                <button disabled={actingId === swap._id + 'reject'} onClick={() => onRespond(swap._id, 'reject')}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
                  <X size={12} strokeWidth={3} />Decline
                </button>
              </>
            )}
          </div>
          {swap.status === 'approved' && (
            <div style={{ marginTop: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#14532d' }}>
              ✅ Swap approved — teacher exchange applied to that session only.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MiniSessionBox({ s, label, color }: { s?: SwapSession; label: string; color: string }) {
  if (!s) return null;
  return (
    <div style={{ flex: 1, minWidth: 160, background: `${color}08`, border: `1px solid ${color}25`, borderRadius: 9, padding: '9px 12px' }}>
      <p style={{ fontSize: 9, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{label}</p>
      <p style={{ fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 3 }}>{s.courseName || '—'} <span style={{ fontWeight: 400, fontSize: 11, color: '#9ca3af' }}>({s.courseCode})</span></p>
      <div style={{ fontSize: 11, color: '#9ca3af' }}>
        {s.dayOfWeek} · {s.startTime}–{s.endTime} · Div {s.division}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function TeacherSwapPage() {
  const { toasts, push: toast } = useToast();

  const [tab,       setTab]       = useState<'outgoing' | 'incoming'>('outgoing');
  const [filter,    setFilter]    = useState('active');
  const [outgoing,  setOutgoing]  = useState<SwapRequest[]>([]);
  const [incoming,  setIncoming]  = useState<SwapRequest[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showWizard,setShowWizard]= useState(false);
  const [actingId,  setActingId]  = useState<string | null>(null);
  const [myTeacherId, setMyTeacherId] = useState<string>('');

  // Resolve my Teacher._id on mount
  useEffect(() => {
    apiFetch<{ id?: string; _id?: string }>('/teachers/me')
      .then(t => setMyTeacherId(t.id || t._id || ''))
      .catch(() => {
        // fallback: get from my-schedule endpoint
        apiFetch<{ teacher?: { id?: string } }>('/timetable/my-schedule')
          .then(d => setMyTeacherId(d.teacher?.id || ''))
          .catch(() => {});
      });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, i] = await Promise.all([
        apiFetch<SwapRequest[]>('/swaps/outgoing'),
        apiFetch<SwapRequest[]>('/swaps/incoming?status=all'),
      ]);
      setOutgoing(o);
      setIncoming(i);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (id: string) => {
    setActingId(id + 'cancel');
    try { const r = await apiFetch<{ message?: string }>(`/swaps/${id}/cancel`, { method: 'PATCH', body: '{}' }); toast((r as any).message || 'Cancelled'); await load(); }
    catch (e: any) { toast(e.message, false); }
    setActingId(null);
  };

  const handleRespond = async (id: string, action: 'accept' | 'reject') => {
    setActingId(id + action);
    try {
      const r = await apiFetch<{ message?: string }>(`/swaps/${id}/respond`, { method: 'PATCH', body: JSON.stringify({ action }) });
      toast((r as any).message || (action === 'accept' ? 'Accepted! Pending admin.' : 'Declined.'));
      await load();
    } catch (e: any) { toast(e.message, false); }
    setActingId(null);
  };

  const handleCreated = (msg: string) => {
    if (msg.startsWith('ERROR:')) toast(msg.replace('ERROR:', ''), false);
    else { toast(msg); load(); }
  };

  const ACTIVE = ['pending_teacher','pending_admin'];
  const display = (tab === 'outgoing' ? outgoing : incoming).filter(s => {
    if (filter === 'active')   return ACTIVE.includes(s.status);
    if (filter === 'approved') return s.status === 'approved';
    if (filter === 'rejected') return ['rejected_teacher','rejected_admin'].includes(s.status);
    return true;
  });

  const pendingOut = outgoing.filter(s => ACTIVE.includes(s.status)).length;
  const pendingIn  = incoming.filter(s => s.status === 'pending_teacher').length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f8f9fc', fontFamily: "'Sora', system-ui, sans-serif", padding: '28px 20px 60px' }}>
        <div style={{ maxWidth: 840, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 24, animation: 'slideUp .35s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(79,70,229,.35)' }}>
                  <ArrowLeftRight size={20} color="#fff" />
                </div>
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>Lecture Swaps</h1>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Exchange sessions · Admin approval required</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={load} style={ghostBtn}><RefreshCw size={13} /> Refresh</button>
                <button
                  onClick={() => setShowWizard(true)}
                  style={{ ...primaryBtn, boxShadow: '0 4px 14px rgba(79,70,229,.3)' }}
                >
                  <Plus size={14} /> New Request
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20, animation: 'slideUp .4s ease' }}>
            {[
              { label: 'Pending Response', value: pendingOut, color: '#d97706', bg: '#fffbeb', icon: Clock },
              { label: 'Awaiting You',     value: pendingIn,  color: '#4f46e5', bg: '#eff6ff', icon: Inbox },
              { label: 'Total',            value: outgoing.length + incoming.length, color: '#059669', bg: '#f0fdf4', icon: ArrowLeftRight },
            ].map(({ label, value, color, bg, icon: Icon }) => (
              <div key={label} style={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color={color} />
                </div>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#111827', lineHeight: 1, margin: 0 }}>{value}</p>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs + Filter */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6', padding: '12px 16px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, animation: 'slideUp .45s ease' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {([['outgoing','Sent', pendingOut, Send], ['incoming','Received', pendingIn, Inbox]] as any).map(([k, l, n, Icon]: any) => (
                <button key={k} onClick={() => setTab(k)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 8, border: 'none',
                  background: tab === k ? '#4f46e5' : 'transparent',
                  color: tab === k ? '#fff' : '#9ca3af',
                  cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                  transition: 'all .15s',
                }}>
                  <Icon size={13} />{l}
                  {n > 0 && <span style={{ background: tab === k ? 'rgba(255,255,255,.25)' : '#ef4444', color: '#fff', borderRadius: 99, fontSize: 10, padding: '1px 6px', fontWeight: 800 }}>{n}</span>}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[['active','Active'],['approved','Approved'],['rejected','Declined'],['all','All']].map(([k,l]) => (
                <button key={k} onClick={() => setFilter(k)} style={{
                  padding: '5px 11px', borderRadius: 99, border: `1.5px solid ${filter===k?'#4f46e5':'#e5e7eb'}`,
                  background: filter===k ? '#eff6ff' : 'transparent',
                  color: filter===k ? '#4f46e5' : '#9ca3af',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .14s',
                }}>{l}</button>
              ))}
            </div>
          </div>

          {/* List */}
          <div style={{ animation: 'slideUp .5s ease' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ width: 32, height: 32, border: '3px solid #e0e7ff', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 10px' }} />
                <p style={{ color: '#9ca3af', fontSize: 13 }}>Loading…</p>
              </div>
            ) : display.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 0', background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6' }}>
                <div style={{ width: 52, height: 52, background: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <ArrowLeftRight size={22} color="#4f46e5" />
                </div>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 4 }}>No swap requests yet</p>
                <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>
                  {tab === 'outgoing' ? 'Requests you send will appear here.' : 'Incoming requests will appear here.'}
                </p>
                {tab === 'outgoing' && (
                  <button onClick={() => setShowWizard(true)} style={{ ...primaryBtn, margin: '0 auto' }}>
                    <Plus size={13} /> Create First Request
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {display.map(s => (
                  <SwapCard key={s._id} swap={s} type={tab} onCancel={handleCancel} onRespond={handleRespond} actingId={actingId} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wizard */}
      {showWizard && myTeacherId && (
        <CreateSwapWizard
          myTeacherId={myTeacherId}
          onClose={() => setShowWizard(false)}
          onCreated={handleCreated}
        />
      )}
      {showWizard && !myTeacherId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '28px 32px', maxWidth: 380, textAlign: 'center' }}>
            <AlertCircle size={32} color="#f59e0b" style={{ marginBottom: 10 }} />
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Teacher Profile Not Found</p>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Your account isn't linked to a teacher profile. Contact admin.</p>
            <button onClick={() => setShowWizard(false)} style={ghostBtn}>Close</button>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div style={{ position: 'fixed', bottom: 22, right: 22, zIndex: 300, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: t.ok ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${t.ok ? '#86efac' : '#fca5a5'}`,
            color: t.ok ? '#14532d' : '#7f1d1d',
            padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,.1)', animation: 'slideUp .3s ease',
            display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto',
          }}>
            {t.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {t.msg}
          </div>
        ))}
      </div>
    </>
  );
}