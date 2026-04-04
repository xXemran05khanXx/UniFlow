// pages/TimetableGenerationPage.tsx
//
// ── WHAT THIS FILE DOES ──────────────────────────────────────────────────────
// Replaces the old 4-step flow that required manual teacher assignment.
// The backend TimetableGenerator (v2) auto-extracts teachers from
// Course.qualifiedFaculties — so the UI only needs:
//   1. Semester(s) to generate
//   2. Division(s)
//   3. Department
//   4. Academic year
// Then it calls POST /api/timetable/generate and displays the result grid.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface Session {
  id:          string;
  courseCode:  string;
  courseName:  string;
  teacherName: string;
  roomNumber:  string;
  dayOfWeek:   string;
  startTime:   string;
  endTime:     string;
  type:        'theory' | 'lab';
  division:    string;
  batch:       string | null;
  semester:    number | string;
  credits:     number;
  timeSlot?:   { id: number; label: string };
}

interface GenerateResult {
  division:  string;
  semester:  number | string;
  timetable: Session[];
  metrics:   {
    qualityScore:      number;
    schedulingRate:    number;
    totalSessions:     number;
    coursesScheduled:  number;
    totalCourses:      number;
    totalConflicts:    number;
  };
}

interface Conflict {
  type:    string;
  course?: string;
  batch?:  string;
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS — matches TimetableGenerator exactly
// ─────────────────────────────────────────────────────────────────────────────
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const ALL_SLOTS = [
  { id: 1,  start: '08:10', end: '10:00', label: '8:10–10:00',  type: 'lab'    },
  { id: 3,  start: '10:20', end: '11:15', label: '10:20–11:15', type: 'theory' },
  { id: 4,  start: '11:15', end: '12:10', label: '11:15–12:10', type: 'theory' },
  { id: 5,  start: '12:10', end: '13:05', label: '12:10–1:05',  type: 'theory' },
  { id: 6,  start: '13:50', end: '14:45', label: '1:50–2:45',   type: 'theory' },
  { id: 7,  start: '14:45', end: '15:40', label: '2:45–3:40',   type: 'theory' },
  { id: 8,  start: '15:40', end: '16:35', label: '3:40–4:35',   type: 'theory' },
  { id: 9,  start: '12:50', end: '14:45', label: '12:50–2:45',  type: 'lab'    },
];

const PALETTE = [
  { bg: '#05172e', border: '#2563eb', text: '#93c5fd', pill: '#1e3a6e' },
  { bg: '#052e1a', border: '#16a34a', text: '#86efac', pill: '#14532d' },
  { bg: '#1e0d30', border: '#7c3aed', text: '#c4b5fd', pill: '#3b0764' },
  { bg: '#2e1a05', border: '#c2410c', text: '#fdba74', pill: '#431407' },
  { bg: '#1a0d22', border: '#be185d', text: '#f9a8d4', pill: '#500724' },
  { bg: '#04242e', border: '#0e7490', text: '#67e8f9', pill: '#083344' },
  { bg: '#1e1905', border: '#a16207', text: '#fde68a', pill: '#451a03' },
  { bg: '#1a0a0a', border: '#b91c1c', text: '#fca5a5', pill: '#450a0a' },
];
const colorCache: Record<string, typeof PALETTE[0]> = {};
let ci = 0;
const courseColor = (code: string) => {
  if (!colorCache[code]) colorCache[code] = PALETTE[ci++ % PALETTE.length];
  return colorCache[code];
};

const toMin = (t: string) => {
  const [h, m] = (t || '0:0').split(':').map(Number);
  return h * 60 + m;
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
const TimetableGenerationPage: React.FC = () => {
  const navigate = useNavigate();

  // ── Config ────────────────────────────────────────────────────────────────
  const [semesters,  setSemesters]  = useState<number[]>([8]);
  const [divisions,  setDivisions]  = useState<string[]>(['A']);
  const [dept,       setDept]       = useState('Information Technology');
  const [year,       setYear]       = useState(new Date().getFullYear());
  const [algo,       setAlgo]       = useState<'genetic' | 'greedy'>('genetic');

  // ── Status ────────────────────────────────────────────────────────────────
  const [status,     setStatus]     = useState<{ courses: number; teachers: number; rooms: number } | null>(null);
  const [phase,      setPhase]      = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [log,        setLog]        = useState<string[]>([]);
  const [errMsg,     setErrMsg]     = useState('');

  // ── Results ───────────────────────────────────────────────────────────────
  const [results,    setResults]    = useState<GenerateResult[]>([]);
  const [savedIds,   setSavedIds]   = useState<Record<string, string>>({});
  const [conflicts,  setConflicts]  = useState<Conflict[]>([]);
  const [activeDiv,  setActiveDiv]  = useState('');
  const [saveState,  setSaveState]  = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});

  // ── Drag state ────────────────────────────────────────────────────────────
  const [dragSrc,    setDragSrc]    = useState<{ session: Session; fromDay: string; fromStart: string } | null>(null);
  const [dropOver,   setDropOver]   = useState<{ day: string; start: string } | null>(null);

  // ── Detail modal ──────────────────────────────────────────────────────────
  const [modal,      setModal]      = useState<Session | null>(null);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null);

  const logRef = useRef<HTMLDivElement>(null);

  const flash = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  };

  const addLog = (m: string) => setLog(p => [...p, m]);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  // Load system status on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API}/timetable/status`);
        setStatus(res.data.data?.overview || null);
      } catch { /* ignore */ }
    };
    load();
  }, []);

  // ── Toggle helpers ────────────────────────────────────────────────────────
  const toggleSem = (n: number) =>
    setSemesters(p => p.includes(n) ? p.filter(x => x !== n) : [...p, n].sort());
  const toggleDiv = (d: string) =>
    setDivisions(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d].sort());

  // ── GENERATE ──────────────────────────────────────────────────────────────
  const generate = async () => {
    if (!semesters.length || !divisions.length) {
      flash('Select at least one semester and division', false);
      return;
    }

    setPhase('running');
    setLog([]);
    setResults([]);
    setConflicts([]);

    addLog('🔌 Connecting to UniFlow backend…');
    await tick(200);
    addLog(`📚 Loading Semester ${semesters.join(', ')} courses…`);
    await tick(350);
    addLog(`👥 Teachers auto-resolved from Course.qualifiedFaculties…`);
    await tick(300);
    addLog(`🏫 Loading rooms…`);
    await tick(250);
    addLog(`⚙️  Running ${algo === 'genetic' ? 'Genetic' : 'Greedy'} algorithm…`);
    addLog(`📐 ScheduleTracker: time-range overlap detection active…`);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API}/timetable/generate`,
        {
          semesters,
          divisions,
          departmentId: dept,
          academicYear: year,
          algorithm:    algo,
          autoSave:     true,
          respectExisting: true,
        },
        { headers: { Authorization: token ? `Bearer ${token}` : '' } }
      );

      const data = res.data;
      if (!data.success) throw new Error(data.message || 'Generation failed');

      const apiResults: GenerateResult[] = data.data?.results || [];
      const apiSaved   = data.data?.saved    || [];
      const apiConflicts: Conflict[] = data.data?.conflicts || [];

      const total = apiResults.reduce((a: number, r: GenerateResult) => a + r.timetable.length, 0);
      addLog(`✅ Complete — ${total} sessions across ${apiResults.length} timetable(s)`);
      if (apiConflicts.length) addLog(`⚠️  ${apiConflicts.length} conflict(s) (see panel below)`);
      else addLog(`✓ Zero clashes detected`);

      // Build savedIds map: division → doc _id
      const ids: Record<string, string> = {};
      apiSaved.forEach((s: any) => { ids[s.division] = s.id; });

      setResults(apiResults);
      setSavedIds(ids);
      setConflicts(apiConflicts);
      setActiveDiv(apiResults[0]?.division || divisions[0]);
      setPhase('done');
      flash(`Generated ${apiResults.length} timetable(s) — ${total} sessions`);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Unknown error';
      addLog(`❌ Error: ${msg}`);
      setErrMsg(msg);
      setPhase('error');
      flash(msg, false);
    }
  };

  // ── PUBLISH ───────────────────────────────────────────────────────────────
  const publish = async (div: string) => {
    const id = savedIds[div];
    if (!id) return flash('No saved ID — generate first', false);
    setSaveState(p => ({ ...p, [div]: 'saving' }));
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API}/timetable/${id}/publish`, {}, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      setSaveState(p => ({ ...p, [div]: 'saved' }));
      flash(`Div ${div} published ✓`);
    } catch (err: any) {
      setSaveState(p => ({ ...p, [div]: 'error' }));
      flash(err.response?.data?.message || err.message, false);
    }
  };

  // ── DRAG & DROP ───────────────────────────────────────────────────────────
  const onDragStart = (session: Session, day: string, start: string) =>
    setDragSrc({ session, fromDay: day, fromStart: start });

  const onDrop = (toDay: string, toStart: string) => {
    setDropOver(null);
    if (!dragSrc) return;
    const { session, fromDay, fromStart } = dragSrc;
    setDragSrc(null);
    if (toDay === fromDay && toStart === fromStart) return;

    const toSlot = ALL_SLOTS.find(s => s.start === toStart);
    if (!toSlot) return;
    if (session.type === 'theory' && toSlot.type === 'lab')
      return flash('Cannot move theory → lab slot', false);
    if (session.type === 'lab' && toSlot.type === 'theory')
      return flash('Cannot move lab → theory slot', false);

    setResults(prev => prev.map(r => {
      if (r.division !== activeDiv) return r;
      return {
        ...r,
        timetable: r.timetable.map(s =>
          s.id === session.id
            ? { ...s, dayOfWeek: toDay, startTime: toSlot.start, endTime: toSlot.end,
                timeSlot: { id: toSlot.id, label: toSlot.label } }
            : s
        ),
      };
    }));
    flash(`Moved ${session.courseCode} → ${toDay} ${toSlot.label}`);
  };

  // ── Current division data ─────────────────────────────────────────────────
  const activeSessions: Session[] = results.find(r => r.division === activeDiv)?.timetable || [];
  const activeMetrics = results.find(r => r.division === activeDiv)?.metrics;

  // Slots that have data OR are theory (always visible)
  const usedStarts = new Set(activeSessions.map(s => s.startTime));
  const visSlots = ALL_SLOTS.filter(sl => sl.type === 'theory' || usedStarts.has(sl.start));

  // Build grid
  const grid: Record<string, Record<string, Session[]>> = {};
  DAYS.forEach(d => { grid[d] = {}; });
  activeSessions.forEach(s => {
    if (!grid[s.dayOfWeek]) grid[s.dayOfWeek] = {};
    if (!grid[s.dayOfWeek][s.startTime]) grid[s.dayOfWeek][s.startTime] = [];
    grid[s.dayOfWeek][s.startTime].push(s);
  });

  return (
    <div style={P.root}>
      <style>{CSS}</style>

      {/* Toast */}
      {toast && (
        <div style={{ ...P.toast, background: toast.ok ? '#052e1a' : '#1a0505', borderColor: toast.ok ? '#16a34a' : '#b91c1c', color: toast.ok ? '#86efac' : '#fca5a5' }}>
          {toast.ok ? '✓ ' : '✕ '}{toast.msg}
        </div>
      )}

      {/* ── HEADER ── */}
      <header style={P.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={P.brandMark}>UF</div>
          <div>
            <div style={P.brandName}>Timetable Generation</div>
            <div style={P.brandSub}>UniFlow · Auto-assigns teachers from course qualifications</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {phase === 'done' && (
            <button style={P.btnGhost} onClick={() => { setPhase('idle'); setResults([]); setLog([]); }}>
              ← Regenerate
            </button>
          )}
          <button style={P.btnGhost} onClick={() => navigate('/timetable')}>View All →</button>
        </div>
      </header>

      {/* ── STATUS BAR ── */}
      {status && (
        <div style={P.statusBar}>
          {[['Courses', status.courses], ['Teachers', status.teachers], ['Rooms', status.rooms]].map(([k, v]) => (
            <span key={k as string} style={P.statusChip}>
              <span style={{ color: '#2563eb', fontWeight: 800 }}>{v}</span>
              <span style={{ color: '#374151', marginLeft: 4 }}>{k} loaded</span>
            </span>
          ))}
          <span style={{ ...P.statusChip, color: '#16a34a' }}>✓ Teachers auto-resolved</span>
        </div>
      )}

      <div style={P.body}>
        {/* ════════════════════════════════════════════════
            CONFIG PANEL  (always visible on left / top)
        ════════════════════════════════════════════════ */}
        <aside style={P.configPanel} className="config-panel">
          <div style={P.configTitle}>Configure</div>

          {/* Semester */}
          <div style={P.fieldGroup}>
            <div style={P.fieldLabel}>SEMESTER(S)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7 }}>
              {[1,2,3,4,5,6,7,8].map(n => (
                <button key={n} style={{ ...P.togBtn, ...(semesters.includes(n) ? P.togActive : {}) }} onClick={() => toggleSem(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Divisions */}
          <div style={P.fieldGroup}>
            <div style={P.fieldLabel}>DIVISION(S)</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['A','B','C','D'].map(d => (
                <button key={d} style={{ ...P.divBtn, ...(divisions.includes(d) ? P.togActive : {}) }} onClick={() => toggleDiv(d)}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Department */}
          <div style={P.fieldGroup}>
            <div style={P.fieldLabel}>DEPARTMENT</div>
            <input style={P.input} value={dept} onChange={e => setDept(e.target.value)} placeholder="e.g. Information Technology" />
          </div>

          {/* Year */}
          <div style={P.fieldGroup}>
            <div style={P.fieldLabel}>ACADEMIC YEAR</div>
            <input style={P.input} type="number" value={year} onChange={e => setYear(Number(e.target.value))} />
          </div>

          {/* Algorithm */}
          <div style={P.fieldGroup}>
            <div style={P.fieldLabel}>ALGORITHM</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['genetic','greedy'] as const).map(a => (
                <button key={a} style={{ ...P.algoBtn, ...(algo === a ? P.togActive : {}) }} onClick={() => setAlgo(a)}>
                  {a === 'genetic' ? '🧬 Genetic' : '⚡ Greedy'}
                </button>
              ))}
            </div>
          </div>

          {/* Info note */}
          <div style={P.infoNote}>
            ℹ️ No manual teacher assignment needed. Teachers are auto-selected from each course's <code style={{ background: '#0d1e38', padding: '1px 4px', borderRadius: 3 }}>qualifiedFaculties</code> field with load balancing.
          </div>

          {/* Summary */}
          <div style={P.summaryRow}>
            {[['Sems', semesters.join(',') || '–'],['Divs', divisions.join(',') || '–'],['Batches', String(divisions.length*3)]].map(([k,v]) => (
              <div key={k} style={P.summaryCell}>
                <span style={P.summaryK}>{k}</span>
                <span style={P.summaryV}>{v}</span>
              </div>
            ))}
          </div>

          {/* Generate Button */}
          <button
            style={{ ...P.btnGenerate, ...(phase === 'running' || !semesters.length || !divisions.length ? P.btnDisabled : {}) }}
            onClick={generate}
            disabled={phase === 'running' || !semesters.length || !divisions.length}
            className="generate-btn"
          >
            {phase === 'running' ? (
              <><div className="spin-sm" />Generating…</>
            ) : (
              <>⚡ Generate Timetable</>
            )}
          </button>
        </aside>

        {/* ════════════════════════════════════════════════
            RIGHT PANEL
        ════════════════════════════════════════════════ */}
        <div style={P.rightPanel}>

          {/* ── IDLE STATE ── */}
          {phase === 'idle' && (
            <div style={P.emptyState}>
              <div style={P.emptyIcon}>📅</div>
              <div style={P.emptyTitle}>Ready to Generate</div>
              <div style={P.emptySub}>Configure parameters on the left, then click Generate. Teachers are assigned automatically — no manual steps required.</div>
            </div>
          )}

          {/* ── LOG / RUNNING ── */}
          {(phase === 'running' || phase === 'error') && (
            <div style={P.logCard} className="fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                {phase === 'running' && <div className="spin-lg" />}
                {phase === 'error'   && <span style={{ fontSize: 24 }}>❌</span>}
                <div style={{ fontSize: 16, fontWeight: 800, color: '#e2eaf4' }}>
                  {phase === 'running' ? 'Generating…' : 'Generation Failed'}
                </div>
              </div>
              <div ref={logRef} style={P.logBox}>
                {log.map((l, i) => (
                  <div key={i} style={{ ...P.logLine, opacity: i === log.length-1 ? 1 : 0.4, fontWeight: i === log.length-1 ? 600 : 400 }}>
                    {l}
                  </div>
                ))}
              </div>
              {phase === 'error' && errMsg && (
                <div style={{ marginTop: 16, background: '#1a0505', border: '1px solid #7f1d1d', color: '#f87171', padding: '12px 14px', borderRadius: 8, fontSize: 13 }}>
                  {errMsg}
                </div>
              )}
            </div>
          )}

          {/* ── DONE — RESULTS ── */}
          {phase === 'done' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>

              {/* Top bar */}
              <div style={P.resultTopbar}>
                {/* Division tabs */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {results.map(r => (
                    <button
                      key={r.division}
                      style={{ ...P.divTab, ...(activeDiv === r.division ? P.divTabActive : {}) }}
                      onClick={() => setActiveDiv(r.division)}
                    >
                      <span style={{ fontSize: 15, fontWeight: 900, color: activeDiv === r.division ? '#60a5fa' : '#3d5470' }}>
                        {r.division}
                      </span>
                      <span style={{ fontSize: 9, color: activeDiv === r.division ? '#3b82f6' : '#1e3050' }}>
                        {r.timetable.length} sessions
                      </span>
                    </button>
                  ))}
                </div>

                {/* Metrics + publish */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginLeft: 'auto' }}>
                  {activeMetrics && (
                    <>
                      <div style={P.metricChip}>{activeMetrics.qualityScore}/100 <span style={{ opacity: 0.5 }}>score</span></div>
                      <div style={{ ...P.metricChip, background: '#052e1a', borderColor: '#16a34a', color: '#86efac' }}>
                        {activeMetrics.coursesScheduled}/{activeMetrics.totalCourses} <span style={{ opacity: 0.5 }}>courses</span>
                      </div>
                    </>
                  )}
                  <button
                    style={{ ...P.btnPublish, ...(saveState[activeDiv] === 'saved' ? P.btnPublished : {}) }}
                    onClick={() => publish(activeDiv)}
                    disabled={saveState[activeDiv] === 'saving'}
                  >
                    {saveState[activeDiv] === 'saving' ? '…' : saveState[activeDiv] === 'saved' ? '✓ Published' : '🚀 Publish'}
                  </button>
                </div>
              </div>

              {/* Conflicts */}
              {conflicts.length > 0 && (
                <div style={P.conflictBanner}>
                  <span style={{ color: '#f59e0b', fontWeight: 700, marginRight: 8 }}>⚠ {conflicts.length} conflict(s)</span>
                  {conflicts.slice(0, 2).map((c, i) => <span key={i} style={{ fontSize: 11, color: '#78716c', marginRight: 10 }}>{c.message}</span>)}
                  {conflicts.length > 2 && <span style={{ fontSize: 11, color: '#78716c' }}>+{conflicts.length-2} more</span>}
                </div>
              )}

              {/* Log output collapsed */}
              <details style={{ padding: '6px 16px', borderBottom: '1px solid #0a0f1a' }}>
                <summary style={{ fontSize: 10, color: '#1e3050', cursor: 'pointer', letterSpacing: 1, fontWeight: 700 }}>GENERATION LOG</summary>
                <div style={{ ...P.logBox, maxHeight: 120, marginTop: 8 }}>
                  {log.map((l, i) => <div key={i} style={{ ...P.logLine, opacity: 0.5 }}>{l}</div>)}
                </div>
              </details>

              {/* ── TIMETABLE GRID ── */}
              <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
                <table style={P.table}>
                  <thead>
                    <tr>
                      <th style={P.thTime}>TIME</th>
                      {DAYS.map(d => (
                        <th key={d} style={P.th}>
                          <div>{d.slice(0,3).toUpperCase()}</div>
                          <div style={{ fontSize: 8, fontWeight: 400, color: '#1e3050', letterSpacing: 1 }}>{d.slice(3)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visSlots.map(slot => (
                      <tr key={slot.id}>
                        <td style={P.tdTime}>
                          <div style={P.timeLabel}>{slot.label}</div>
                          <span style={{ ...P.slotBadge, background: slot.type === 'lab' ? '#2d1800' : '#0d1e38', color: slot.type === 'lab' ? '#f59e0b' : '#2563eb' }}>
                            {slot.type}
                          </span>
                        </td>
                        {DAYS.map(day => {
                          const cells = grid[day]?.[slot.start] || [];
                          const isOver = dropOver?.day === day && dropOver?.start === slot.start;
                          return (
                            <td
                              key={day}
                              style={{ ...P.td, ...(isOver ? P.tdOver : {}) }}
                              onDragOver={e => { e.preventDefault(); setDropOver({ day, start: slot.start }); }}
                              onDragLeave={() => setDropOver(null)}
                              onDrop={() => onDrop(day, slot.start)}
                            >
                              {cells.length === 0 && !isOver && <div style={{ height: 52 }} />}
                              {cells.length === 0 && isOver && <div style={P.dropHint}>Drop here</div>}
                              {cells.map(session => (
                                <SessionCard
                                  key={session.id}
                                  session={session}
                                  onDragStart={() => onDragStart(session, day, slot.start)}
                                  onClick={() => setModal(session)}
                                />
                              ))}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── DETAIL MODAL ── */}
      {modal && <DetailModal session={modal} onClose={() => setModal(null)} />}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SESSION CARD
// ─────────────────────────────────────────────────────────────────────────────
const SessionCard: React.FC<{ session: Session; onDragStart: () => void; onClick: () => void }> = ({ session, onDragStart, onClick }) => {
  const c    = courseColor(session.courseCode);
  const isLab = session.type === 'lab';
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="session-card"
      style={{ background: c.bg, borderLeft: `3px solid ${c.border}`, borderRadius: 7, padding: '8px 9px', marginBottom: 3, cursor: 'grab', userSelect: 'none' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: c.text, fontFamily: 'monospace', letterSpacing: '0.3px' }}>
          {session.courseCode}
        </span>
        <span style={{ fontSize: 8, fontWeight: 700, background: c.pill, color: c.text, padding: '1px 5px', borderRadius: 3, flexShrink: 0 }}>
          {isLab ? 'LAB' : 'LEC'}{session.batch ? ` · ${session.batch}` : ''}
        </span>
      </div>
      <div style={{ fontSize: 10, color: '#6b85a0', marginTop: 3, lineHeight: 1.3 }}>
        {(session.courseName || '').slice(0, 22)}{(session.courseName || '').length > 22 ? '…' : ''}
      </div>
      <div style={{ fontSize: 9, color: '#374151', marginTop: 4, fontFamily: 'monospace' }}>
        👤 {(session.teacherName || '').split(' ')[0]}
        {session.roomNumber ? ` · 🚪 ${session.roomNumber}` : ''}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DETAIL MODAL
// ─────────────────────────────────────────────────────────────────────────────
const DetailModal: React.FC<{ session: Session; onClose: () => void }> = ({ session, onClose }) => {
  const c = courseColor(session.courseCode);
  return (
    <div style={P.modalBg} onClick={onClose}>
      <div style={{ ...P.modal, borderColor: `${c.border}44` }} onClick={e => e.stopPropagation()} className="modal-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: c.text, fontFamily: 'monospace' }}>{session.courseCode}</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#e2eaf4', marginTop: 2 }}>{session.courseName}</div>
          </div>
          <button onClick={onClose} style={P.modalClose}>✕</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
          {([
            ['Teacher',  session.teacherName],
            ['Room',     session.roomNumber || '—'],
            ['Day',      session.dayOfWeek],
            ['Time',     `${session.startTime} – ${session.endTime}`],
            ['Type',     session.type.toUpperCase()],
            ['Division', session.division + (session.batch ? ` · ${session.batch}` : '')],
            ['Semester', String(session.semester)],
            ['Credits',  String(session.credits || '—')],
          ] as [string,string][]).map(([k, v]) => (
            <div key={k} style={{ background: '#06090e', border: '1px solid #0e1826', borderRadius: 7, padding: '9px 11px' }}>
              <div style={{ fontSize: 8, color: '#1e3050', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{k}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const P: Record<string, React.CSSProperties> = {
  root:        { minHeight: '100vh', background: '#05080f', color: '#c4d4e8', fontFamily: "'Syne','DM Sans',system-ui,sans-serif", display: 'flex', flexDirection: 'column' },
  header:      { position: 'sticky', top: 0, zIndex: 50, background: '#06090eee', backdropFilter: 'blur(16px)', borderBottom: '1px solid #0a0f1a', padding: '13px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  brandMark:   { width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 12, color: '#fff', flexShrink: 0 },
  brandName:   { fontSize: 16, fontWeight: 800, color: '#e2eaf4', letterSpacing: '-0.5px' },
  brandSub:    { fontSize: 9, color: '#1e3050', letterSpacing: '0.3px', marginTop: 1 },
  btnGhost:    { background: 'transparent', border: '1px solid #0e1826', color: '#3d5470', padding: '6px 14px', borderRadius: 7, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 },

  statusBar:   { background: '#06090f', borderBottom: '1px solid #0a0f1a', padding: '7px 24px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  statusChip:  { fontSize: 11, background: '#090f1c', border: '1px solid #0a0f1a', padding: '3px 10px', borderRadius: 20, fontFamily: 'monospace' },

  body:        { flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 },

  // Config panel
  configPanel: { width: 260, minWidth: 260, background: '#07090f', borderRight: '1px solid #0a0f1a', padding: '20px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 },
  configTitle: { fontSize: 10, fontWeight: 800, color: '#1e3050', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 18 },
  fieldGroup:  { marginBottom: 18 },
  fieldLabel:  { fontSize: 9, fontWeight: 800, color: '#1e3050', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8 },
  togBtn:      { padding: '9px 0', background: '#060c18', border: '1px solid #0e1826', color: '#1e3050', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' },
  togActive:   { background: '#0d1e38', borderColor: '#2563eb', color: '#60a5fa' },
  divBtn:      { width: 50, height: 50, background: '#060c18', border: '2px solid #0e1826', color: '#1e3050', borderRadius: 9, cursor: 'pointer', fontSize: 18, fontWeight: 800, fontFamily: 'inherit' },
  algoBtn:     { flex: 1, padding: '8px 0', background: '#060c18', border: '1px solid #0e1826', color: '#1e3050', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit' },
  input:       { width: '100%', background: '#060c18', border: '1px solid #0e1826', color: '#c4d4e8', padding: '9px 11px', borderRadius: 7, fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
  infoNote:    { background: '#05172e', border: '1px solid #1e3a5f', borderRadius: 8, padding: '10px 12px', fontSize: 11, color: '#3b82f6', lineHeight: 1.6, marginBottom: 18 },
  summaryRow:  { display: 'flex', background: '#060c18', border: '1px solid #0e1826', borderRadius: 9, padding: '11px 14px', marginBottom: 16 },
  summaryCell: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 },
  summaryK:    { fontSize: 8, color: '#1e3050', textTransform: 'uppercase', letterSpacing: '0.5px' },
  summaryV:    { fontSize: 14, fontWeight: 800, color: '#c4d4e8' },
  btnGenerate: { width: '100%', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: 'none', color: '#fff', padding: '13px', borderRadius: 9, fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnDisabled: { opacity: 0.4, cursor: 'not-allowed' },

  // Right panel
  rightPanel:  { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 },

  emptyState:  { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 40 },
  emptyIcon:   { fontSize: 48, marginBottom: 4 },
  emptyTitle:  { fontSize: 20, fontWeight: 800, color: '#c4d4e8' },
  emptySub:    { fontSize: 13, color: '#1e3050', textAlign: 'center', maxWidth: 360, lineHeight: 1.7 },

  logCard:     { padding: 28, maxWidth: 560, margin: '32px auto', width: '100%' },
  logBox:      { background: '#05080f', border: '1px solid #0a0f1a', borderRadius: 9, padding: '14px 16px', fontFamily: 'monospace', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 200, overflowY: 'auto' },
  logLine:     { color: '#c4d4e8', lineHeight: 1.5 },

  // Results
  resultTopbar: { display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #0a0f1a', background: '#07090f', gap: 8, flexWrap: 'wrap' },
  divTab:       { background: '#060c18', border: '1px solid #0a0f1a', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  divTabActive: { background: '#0d1e38', borderColor: '#2563eb' },
  metricChip:   { background: '#05172e', border: '1px solid #1e3a5f', color: '#60a5fa', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontFamily: 'monospace' },
  btnPublish:   { background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  btnPublished: { background: 'linear-gradient(135deg,#065f46,#059669)' },
  conflictBanner: { padding: '7px 16px', background: '#1a0e05', borderBottom: '1px solid #2d1800', fontSize: 11, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 },

  // Table
  table:   { width: '100%', borderCollapse: 'collapse', minWidth: 820 },
  thTime:  { width: 110, padding: '11px 14px', background: '#06090e', color: '#1e3050', fontSize: 8, fontWeight: 800, letterSpacing: '1.5px', borderBottom: '1px solid #0a0f1a', textAlign: 'left', position: 'sticky', top: 0, zIndex: 10 },
  th:      { padding: '11px 7px', background: '#06090e', color: '#2563eb', fontSize: 9, fontWeight: 800, letterSpacing: '1.5px', borderBottom: '1px solid #0a0f1a', textAlign: 'center', position: 'sticky', top: 0, zIndex: 10 },
  tdTime:  { padding: '8px 8px 8px 14px', background: '#07090f', borderRight: '1px solid #0a0f1a', borderBottom: '1px solid #060b14', verticalAlign: 'top', minWidth: 110 },
  timeLabel: { fontSize: 10, color: '#374151', fontFamily: 'monospace', lineHeight: 1.4 },
  slotBadge: { fontSize: 7, fontWeight: 700, padding: '1px 6px', borderRadius: 3, display: 'inline-block', marginTop: 3, textTransform: 'uppercase' },
  td:      { padding: 5, borderBottom: '1px solid #060b14', verticalAlign: 'top', minWidth: 142 },
  tdOver:  { background: '#0a1e38', outline: '2px dashed #1d4ed8', outlineOffset: -2 },
  dropHint:{ height: 52, border: '2px dashed #1a3a6e', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e3050', fontSize: 10 },

  // Modal
  modalBg:    { position: 'fixed', inset: 0, background: '#000000bb', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal:      { background: '#090f1c', border: '1px solid #1a2d4a', borderRadius: 14, padding: 26, maxWidth: 430, width: '100%', boxShadow: '0 32px 80px #000000cc' },
  modalClose: { background: '#060c18', border: '1px solid #0e1826', color: '#374151', width: 26, height: 26, borderRadius: 6, cursor: 'pointer', fontSize: 12 },

  toast: { position: 'fixed', bottom: 22, right: 22, zIndex: 9999, padding: '11px 18px', borderRadius: 9, fontSize: 12, fontWeight: 600, border: '1px solid', boxShadow: '0 8px 30px #00000055', animation: 'slideUp 0.3s ease' },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width:5px; height:5px; }
  ::-webkit-scrollbar-thumb { background:#0e1826; border-radius:3px; }
  .session-card { transition: transform 0.14s, box-shadow 0.14s; }
  .session-card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px #00000055; }
  .generate-btn:not([disabled]):hover { opacity: 0.9; transform: translateY(-1px); transition: all 0.15s; }
  .fade-in { animation: fadeIn 0.35s ease; }
  .modal-in { animation: modalIn 0.22s ease; }
  .spin-sm { width:16px; height:16px; border-radius:50%; border:2px solid #0e1826; border-top-color:#2563eb; animation:spin 0.7s linear infinite; flex-shrink:0; }
  .spin-lg { width:28px; height:28px; border-radius:50%; border:3px solid #0e1826; border-top-color:#2563eb; animation:spin 0.8s linear infinite; }
  @keyframes spin    { to { transform:rotate(360deg); } }
  @keyframes fadeIn  { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
  @keyframes modalIn { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
  @keyframes slideUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  select option { background: #090f1c; color: #c4d4e8; }
  details summary::-webkit-details-marker { display:none; }
`;

const tick = (ms: number) => new Promise(r => setTimeout(r, ms));

export default TimetableGenerationPage;