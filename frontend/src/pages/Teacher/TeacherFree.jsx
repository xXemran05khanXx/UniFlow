import { CheckCircle, Clock, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getApiBaseUrl } from '../../services/apiConfig';
// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const API = getApiBaseUrl();

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const ALL_SLOTS = [
  { start: '08:10', end: '10:00', label: '8:10–10:00', kind: 'Lab' },
  { start: '10:20', end: '11:15', label: '10:20–11:15', kind: 'Theory' },
  { start: '11:15', end: '12:10', label: '11:15–12:10', kind: 'Theory' },
  { start: '12:10', end: '13:05', label: '12:10–13:05', kind: 'Theory' },
  { start: '13:50', end: '14:45', label: '13:50–14:45', kind: 'Theory' },
  { start: '14:45', end: '15:40', label: '14:45–15:40', kind: 'Theory' },
  { start: '15:40', end: '16:35', label: '15:40–16:35', kind: 'Theory' },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function authHdr() {
  const t = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

const teacherName = (t) =>
  t?.name || t?.user?.name || t?.employeeId || 'Unknown';

const initials = (name = '') =>
  name.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';

const PALETTES = [
  { bg: '#EEEDFE', fg: '#534AB7', border: '#AFA9EC' },
  { bg: '#E1F5EE', fg: '#0F6E56', border: '#5DCAA5' },
  { bg: '#FAEEDA', fg: '#854F0B', border: '#EF9F27' },
  { bg: '#E6F1FB', fg: '#185FA5', border: '#85B7EB' },
  { bg: '#FBEAF0', fg: '#993556', border: '#ED93B1' },
  { bg: '#EAF3DE', fg: '#3B6D11', border: '#97C459' },
  { bg: '#FAECE7', fg: '#993C1D', border: '#F0997B' },
];
const palette = (name = '') => PALETTES[(name.charCodeAt(0) || 65) % PALETTES.length];

// ─────────────────────────────────────────────────────────────────────────────
// ICONS (inline SVG to keep zero deps)
// ─────────────────────────────────────────────────────────────────────────────
const Icon = {
  Search: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Check: ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  X: ({ size = 11 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Users: () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Calendar: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <polyline points="9 16 11 18 15 14" />
    </svg>
  ),
  Loader: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: 'fspin .8s linear infinite' }}>
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
    </svg>
  ),
  Clock: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Alert: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR
// ─────────────────────────────────────────────────────────────────────────────
function Avatar({ name = '', size = 28, selected = false }) {
  const p = palette(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: selected ? '#534AB7' : p.bg,
      color: selected ? '#fff' : p.fg,
      border: `1.5px solid ${selected ? '#AFA9EC' : p.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.34, fontWeight: 600, userSelect: 'none', letterSpacing: '-.3px',
      transition: 'all .15s',
    }}>
      {initials(name)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SLOT CELL — single availability cell in the grid
// ─────────────────────────────────────────────────────────────────────────────
export function SlotCell({ status, freeCount, total, selected, onClick, tooltip }) {
  const [showTip, setShowTip] = useState(false);

  const styles = {
    free: { bg: '#EAF3DE', border: '#639922', color: '#27500A' },
    partial: { bg: '#FAEEDA', border: '#BA7517', color: '#633806' },
    busy: { bg: '#FCEBEB', border: '#A32D2D', color: '#501313' },
    meeting: { bg: '#E6F1FB', border: '#185FA5', color: '#042C53' },
    sel: { bg: '#EEEDFE', border: '#534AB7', color: '#26215C' },
  };

  const s = selected ? styles.sel : styles[status] || styles.busy;
  const clickable = status === 'free' || status === 'partial';

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={clickable ? onClick : undefined}
        onMouseEnter={() => tooltip && setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        style={{
          height: 34, borderRadius: 7, border: `${selected ? 1.5 : 1}px solid ${s.border}`,
          background: s.bg, color: s.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 600, cursor: clickable ? 'pointer' : 'default',
          transition: 'all .12s', userSelect: 'none',
          transform: (clickable && !selected) ? undefined : undefined,
          boxShadow: selected ? `0 0 0 2px ${s.border}40` : 'none',
          gap: 3,
        }}
        onMouseDown={e => { if (clickable) e.currentTarget.style.transform = 'scale(.97)'; }}
        onMouseUp={e => { if (clickable) e.currentTarget.style.transform = ''; }}
      >
        {status === 'free' && (
          selected
            ? <><span style={{ fontSize: 11 }}>✓</span> Sel</>
            : <><span style={{ fontSize: 11 }}>✓</span> Free</>
        )}
        {status === 'partial' && `${freeCount}/${total}`}
        {status === 'busy' && <span style={{ fontSize: 9, letterSpacing: '.3px' }}>Class</span>}
        {status === 'meeting' && <span style={{ fontSize: 9 }}>📅 Mtg</span>}
      </div>

      {showTip && tooltip && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 5px)', left: '50%',
          transform: 'translateX(-50%)', zIndex: 999,
          background: '#1E1B2E', color: '#E8E6FF',
          padding: '6px 10px', borderRadius: 7, fontSize: 10, lineHeight: 1.5,
          pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,.25)',
          maxWidth: 220, whiteSpace: 'normal',
        }}>
          {tooltip}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMBINED GRID
// ─────────────────────────────────────────────────────────────────────────────
const CombinedGrid = ({ freeData, selectedTeachers, selectedSlot, onSelectSlot, bigView = false }) => {
  return (
    <div style={{
      overflowX: 'auto', // Enables horizontal scrolling
      background: '#fff',
      borderRadius: '12px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb',
      margin: '0 auto', // Centers the container
      width: '100%'
    }}>
      {/* Increased minWidth to 1400px and added tableLayout: 'fixed' to prevent squishing */}
      <table style={{ width: '100%', minWidth: '1400px', borderCollapse: 'collapse', tableLayout: 'fixed', textAlign: 'left' }}>

        {/* TABLE HEADER */}
        <thead>
          <tr>
            <th style={{ width: '100px', padding: '16px', background: '#f9fafb', borderBottom: '2px solid #e5e7eb', color: '#374151', fontWeight: '700', position: 'sticky', left: 0, zIndex: 10 }}>
              Day
            </th>
            {ALL_SLOTS.map(slot => (
              <th key={slot.start} style={{ padding: '16px 8px', background: '#f9fafb', borderBottom: '2px solid #e5e7eb', color: '#4b5563', fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <Clock size={16} color="#6b7280" />
                  <span>{slot.start} - {slot.end}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>

        {/* TABLE BODY */}
        <tbody>
          {DAYS.map(day => (
            <tr key={day} style={{ borderBottom: '1px solid #e5e7eb' }}>

              {/* Day Label (Left Column) */}
              <td style={{ padding: '16px', background: '#fff', fontWeight: '600', color: '#111827', position: 'sticky', left: 0, borderRight: '1px solid #e5e7eb', zIndex: 5 }}>
                {day}
              </td>

              {/* Data Cells */}
              {(freeData[day] || []).map((slot, idx) => {
                const isSelected = selectedSlot?.day === day && selectedSlot?.start === slot.start;
                const isAllFree = slot.allFree;

                return (
                  <td key={idx} style={{ padding: '8px', verticalAlign: 'top' }}>
                    <div
                      onClick={() => onSelectSlot(day, slot)}
                      title={slot.teacherStatuses
                        .map(t => `${t.name}: ${t.free ? 'Free' : 'Busy'}`)
                        .join('\n')
                      }
                      style={{
                        padding: '12px 8px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        border: isSelected ? '2px solid #6366f1' : `1px solid ${isAllFree ? '#a7f3d0' : '#fca5a5'}`,
                        background: isSelected
                          ? (isAllFree ? '#ecfdf5' : '#fef2f2')
                          : (isAllFree ? '#f0fdf4' : '#fff5f5'),
                        boxShadow: isSelected ? '0 0 0 3px rgba(99, 102, 241, 0.2)' : 'none',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      {/* Status Badge */}
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px',
                        color: isAllFree ? '#059669' : '#dc2626',
                        paddingBottom: '8px',
                        borderBottom: `1px solid ${isAllFree ? '#a7f3d0' : '#fca5a5'}`
                      }}>
                        {isAllFree ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {isAllFree ? 'All Free' : 'Busy'}
                      </div>

                      {/* Teacher Status List */}
                      {bigView && (
                        <div style={{ marginTop: 6, maxHeight: 80, overflowY: 'auto' }}>
                          {slot.teacherStatuses.map(ts => (
                            <div key={ts.teacherId} style={{ fontSize: '11px' }}>
                              {ts.name} {ts.free ? '✅' : '❌'}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PER-TEACHER GRID
// ─────────────────────────────────────────────────────────────────────────────
function IndividualGrid({ freeData, selectedTeachers, selectedSlot, onSelectSlot }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 10 }}>
        <thead>
          <tr>
            <th style={{ ...TH_STYLE, textAlign: 'left', width: 90, paddingLeft: 4 }}>Time</th>
            {DAYS.flatMap(day =>
              selectedTeachers.map(t => (
                <th key={`${day}-${t._id}`} style={{ ...TH_STYLE, textAlign: 'center', minWidth: 38 }}>
                  <div style={{ fontSize: 8, color: '#94A3B8', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 2 }}>
                    {day.slice(0, 2)}
                  </div>
                  <div title={teacherName(t)} style={{ display: 'flex', justifyContent: 'center' }}>
                    <Avatar name={teacherName(t)} size={18} selected />
                  </div>
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {ALL_SLOTS.map((slot, ri) => (
            <tr key={slot.start} style={{ background: ri % 2 === 0 ? '#fff' : '#FAFBFC' }}>
              <td style={{ padding: '3px 4px', borderBottom: '1px solid #F1F5F9', whiteSpace: 'nowrap' }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: '#374151', fontWeight: 500 }}>
                  {slot.label}
                </div>
              </td>
              {DAYS.flatMap(day =>
                selectedTeachers.map(t => {
                  const slotData = freeData?.[day]?.find(s => s.start === slot.start);
                  const ts = slotData?.teacherStatuses?.find(x => x.teacherId === (t._id || t.id));
                  const isFree = ts?.free ?? true;
                  const isMeeting = ts?.source === 'meeting';
                  const isSel = selectedSlot?.day === day && selectedSlot?.start === slot.start;

                  let bg, border, color, content;
                  if (isSel && isFree) {
                    bg = '#EEEDFE'; border = '#534AB7'; color = '#26215C'; content = '✓';
                  } else if (isMeeting) {
                    bg = '#E6F1FB'; border = '#185FA5'; color = '#042C53'; content = 'M';
                  } else if (isFree) {
                    bg = '#EAF3DE'; border = '#639922'; color = '#27500A'; content = '✓';
                  } else {
                    bg = '#FCEBEB'; border = '#A32D2D'; color = '#501313'; content = '✕';
                  }

                  return (
                    <td key={`${day}-${t._id}`} style={{ padding: '2px 3px', borderBottom: '1px solid #F1F5F9' }}>
                      <div
                        title={ts?.clash || (isFree ? `${teacherName(t)} free` : '')}
                        onClick={isFree ? () => onSelectSlot({ day, start: slot.start, end: slot.end, label: slot.label }) : undefined}
                        style={{
                          height: 28, borderRadius: 5, border: `1px solid ${border}`,
                          background: bg, color, fontSize: 10, fontWeight: 600,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: isFree ? 'pointer' : 'default',
                          transition: 'all .1s',
                        }}
                      >
                        {content}
                      </div>
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
}

const TH_STYLE = {
  padding: '6px 4px 10px',
  fontWeight: 600,
  color: '#94A3B8',
  background: '#fff',
  borderBottom: '2px solid #F1F5F9',
  position: 'sticky',
  top: 0,
  zIndex: 2,
};

// ─────────────────────────────────────────────────────────────────────────────
// LEGEND
// ─────────────────────────────────────────────────────────────────────────────
function Legend() {
  const items = [
    { bg: '#EAF3DE', border: '#639922', label: 'All free' },
    { bg: '#FAEEDA', border: '#BA7517', label: 'Partial' },
    { bg: '#FCEBEB', border: '#A32D2D', label: 'Class' },
    { bg: '#E6F1FB', border: '#185FA5', label: 'Meeting' },
    { bg: '#EEEDFE', border: '#534AB7', label: 'Selected' },
  ];
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '6px 14px', borderBottom: '1px solid #F1F5F9' }}>
      {items.map(({ bg, border, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#6B7280' }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: bg, border: `1.5px solid ${border}` }} />
          {label}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION BANNER — shown when a slot is selected
// ─────────────────────────────────────────────────────────────────────────────
function ActionBanner({ slot, freeData, selectedTeachers, onSchedule, onClear }) {
  if (!slot) return null;
  const slotData = freeData?.[slot.day]?.find(s => s.start === slot.start);
  const freeTeachers = slotData
    ? selectedTeachers.filter(t => slotData.teacherStatuses.find(ts => ts.teacherId === (t._id || t.id) && ts.free))
    : selectedTeachers;
  const busyTeachers = selectedTeachers.filter(t => !freeTeachers.find(f => f._id === t._id));

  return (
    <div style={{
      margin: '8px 14px 12px',
      background: 'linear-gradient(135deg, #EEEDFE 0%, #F5F3FF 100%)',
      border: '1px solid #C7D2FE',
      borderRadius: 12,
      padding: '12px 14px',
      position: 'relative',
    }}>
      <button
        onClick={onClear}
        style={{
          position: 'absolute', top: 10, right: 10, background: 'none', border: 'none',
          cursor: 'pointer', color: '#818CF8', padding: 2, lineHeight: 0,
        }}
      >
        <Icon.X size={12} />
      </button>

      <div style={{ fontSize: 15, fontWeight: 800, color: '#1E1B4B', letterSpacing: '-.2px' }}>
        {slot.day}
      </div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#4F46E5', marginTop: 1 }}>
        {slot.label}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 10, marginBottom: 12 }}>
        <div style={{ background: '#EAF3DE', border: '1px solid #86EFAC', borderRadius: 8, padding: '5px 10px', flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#15803D' }}>{freeTeachers.length}</div>
          <div style={{ fontSize: 9, color: '#15803D', textTransform: 'uppercase', letterSpacing: '.5px' }}>Available</div>
        </div>
        {busyTeachers.length > 0 && (
          <div style={{ background: '#FCEBEB', border: '1px solid #FCA5A5', borderRadius: 8, padding: '5px 10px', flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#B91C1C' }}>{busyTeachers.length}</div>
            <div style={{ fontSize: 9, color: '#B91C1C', textTransform: 'uppercase', letterSpacing: '.5px' }}>Busy</div>
          </div>
        )}
      </div>

      {/* Free teachers mini list */}
      {freeTeachers.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
          {freeTeachers.map(t => (
            <div key={t._id} title={teacherName(t)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fff', border: '1px solid #C7D2FE', borderRadius: 99, padding: '2px 7px 2px 3px', fontSize: 10, color: '#4F46E5' }}>
              <Avatar name={teacherName(t)} size={16} />
              <span style={{ fontWeight: 600 }}>{teacherName(t).split(' ')[0]}</span>
            </div>
          ))}
        </div>
      )}

      {busyTeachers.length > 0 && (
        <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 10 }}>
          {busyTeachers.map(t => {
            const ts = slotData?.teacherStatuses?.find(x => x.teacherId === (t._id || t.id));
            return (
              <div key={t._id} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                <span style={{ color: '#EF4444' }}>✕</span>
                <span style={{ fontWeight: 500 }}>{teacherName(t).split(' ')[0]}</span>
                {ts?.clash && <span style={{ color: '#9CA3AF' }}>— {ts.clash}</span>}
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => onSchedule(freeTeachers, slot)}
        style={{
          width: '100%', padding: '8px 0',
          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
          color: '#fff', border: 'none', borderRadius: 9,
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'opacity .12s',
        }}
        onMouseOver={e => e.currentTarget.style.opacity = '.88'}
        onMouseOut={e => e.currentTarget.style.opacity = '1'}
      >
        <Icon.Calendar />
        Schedule Meeting Here
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT — TeacherFreeSlots
// Drop this anywhere in your app.
//
// Props:
//   onOpenScheduler(teachers, slot) — called when "Schedule Meeting Here" clicked
//   embedded — if true, renders in compact panel mode (no outer card)
// ─────────────────────────────────────────────────────────────────────────────
export default function TeacherFreeSlots({ onOpenScheduler, embedded = false }) {
  const [allTeachers, setAllTeachers] = useState([]);
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [freeData, setFreeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [error, setError] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [viewMode, setViewMode] = useState('combined'); // 'combined' | 'individual'
  const fetchController = useRef(null);
  const [fullScreen, setFullScreen] = useState(false);
  // ── Load all teachers once ─────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/teachers`, { headers: authHdr() });
        const data = await res.json();
        if (data.success) setAllTeachers(data.data || []);
        else setError(data.message || 'Could not load teachers');
      } catch (e) {
        setError('Network error loading teachers');
      } finally {
        setLoadingTeachers(false);
      }
    })();
  }, []);

  // ── Fetch free slots whenever selection changes ────────────────────────────
  const fetchFreeSlots = useCallback(async (teachers) => {
    if (!teachers.length) { setFreeData(null); return; }

    // Cancel in-flight request
    if (fetchController.current) fetchController.current.abort();
    fetchController.current = new AbortController();

    setLoading(true);
    setError('');

    try {
      const ids = teachers.map(t => t._id || t.id).join(',');
      const res = await fetch(`${API}/meetings/free-slots?teacherIds=${ids}`, {
        headers: authHdr(),
        signal: fetchController.current.signal,
      });
      const data = await res.json();

      if (data.success) {
        setFreeData(data.data);
      } else {
        setError(data.message || 'Failed to load availability');
        setFreeData(null);
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        setError(e.message || 'Network error');
        setFreeData(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Toggle teacher selection ───────────────────────────────────────────────
  const toggleTeacher = (t) => {
    setSelectedTeachers(prev => {
      const next = prev.find(x => x._id === t._id)
        ? prev.filter(x => x._id !== t._id)
        : [...prev, t];
      setSelectedSlot(null);
      fetchFreeSlots(next);
      return next;
    });
  };

  const removeTeacher = (id) => {
    setSelectedTeachers(prev => {
      const next = prev.filter(x => x._id !== id);
      setSelectedSlot(null);
      fetchFreeSlots(next);
      return next;
    });
  };

  // ── Slot selection ─────────────────────────────────────────────────────────
  const handleSelectSlot = (slot) => {
    setSelectedSlot(prev =>
      prev?.day === slot.day && prev?.start === slot.start ? null : slot
    );
  };

  // ── Filtered teacher list ──────────────────────────────────────────────────
  const filteredTeachers = useMemo(() =>
    allTeachers.filter(t =>
      !searchQ || teacherName(t).toLowerCase().includes(searchQ.toLowerCase())
    ),
    [allTeachers, searchQ]);

  // ── Stats from free data ───────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!freeData || !selectedTeachers.length) return null;
    let totalFree = 0, totalPartial = 0, totalBusy = 0;
    DAYS.forEach(day => {
      ALL_SLOTS.forEach(slot => {
        const s = freeData[day]?.find(x => x.start === slot.start);
        if (!s || s.allFree) totalFree++;
        else {
          const freeCount = s.teacherStatuses.filter(ts => ts.free).length;
          if (freeCount === 0) totalBusy++;
          else totalPartial++;
        }
      });
    });
    return { totalFree, totalPartial, totalBusy };
  }, [freeData, selectedTeachers]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  const outerStyle = embedded
    ? { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }
    : {
      display: 'grid', gridTemplateColumns: '240px 1fr',
      border: '1px solid #E5E7EB', borderRadius: 16,
      overflow: 'hidden', background: '#fff',
      boxShadow: '0 2px 16px rgba(0,0,0,.06)',
      fontFamily: "'Outfit', 'DM Sans', system-ui, sans-serif",
      minHeight: 540,
    };

  return (
    <>
      <style>{`
        @keyframes fspin { to { transform: rotate(360deg); } }
        @keyframes fadein { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }
      `}</style>

      <div style={outerStyle}>

        {/* ── LEFT PANEL: teacher selector ───────────────────────────────── */}
        <div style={{
          borderRight: embedded ? 'none' : '1px solid #F1F5F9',
          borderBottom: embedded ? '1px solid #F1F5F9' : 'none',
          background: '#FAFBFC',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          ...(embedded ? { maxHeight: 280 } : {}),
        }}>
          {/* Header */}
          <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>

            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 10, letterSpacing: '-.2px' }}>
              Faculty
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', lineHeight: 0 }}>
                <Icon.Search />
              </span>
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search faculty…"
                style={{
                  width: '100%', paddingLeft: 28, paddingRight: 10, paddingTop: 7, paddingBottom: 7,
                  border: '1px solid #E5E7EB', borderRadius: 9, fontSize: 11,
                  outline: 'none', fontFamily: 'inherit', background: '#fff',
                  boxSizing: 'border-box', color: '#0F172A',
                }}
              />
            </div>
          </div>

          {/* Selected chips */}
          {selectedTeachers.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 10px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
              {selectedTeachers.map(t => (
                <div key={t._id} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: '#EEF2FF', border: '1px solid #C7D2FE',
                  borderRadius: 99, padding: '3px 7px 3px 4px', fontSize: 10, color: '#4338CA',
                }}>
                  <Avatar name={teacherName(t)} size={16} selected />
                  <span style={{ fontWeight: 600 }}>{teacherName(t).split(' ')[0]}</span>
                  <button onClick={() => removeTeacher(t._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#818CF8', padding: 0, lineHeight: 0 }}>
                    <Icon.X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Teacher list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
            {loadingTeachers ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0', gap: 8, color: '#6B7280', fontSize: 11 }}>
                <Icon.Loader /> Loading faculty…
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: '#9CA3AF', fontSize: 11 }}>No teachers found</div>
            ) : (
              filteredTeachers.map(t => {
                const name = teacherName(t);
                const isSel = !!selectedTeachers.find(x => x._id === t._id);
                return (
                  <button
                    key={t._id}
                    onClick={() => toggleTeacher(t)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 8px', borderRadius: 9, cursor: 'pointer', textAlign: 'left',
                      background: isSel ? '#EEF2FF' : 'transparent',
                      border: `1px solid ${isSel ? '#C7D2FE' : 'transparent'}`,
                      fontFamily: 'inherit', transition: 'all .1s', marginBottom: 2,
                    }}
                    onMouseOver={e => { if (!isSel) e.currentTarget.style.background = '#F3F4F6'; }}
                    onMouseOut={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Avatar name={name} size={28} selected={isSel} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: isSel ? '#4338CA' : '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name}
                      </div>
                      <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 1 }}>
                        {t.designation || 'Faculty'}
                      </div>
                    </div>
                    {isSel && (
                      <span style={{ color: '#6366F1', flexShrink: 0 }}><Icon.Check size={13} /></span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: availability grid ─────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Top bar */}
          <div style={{
            padding: '12px 14px 10px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 10, flexShrink: 0,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', letterSpacing: '-.2px' }}>
                Availability
              </div>
              <button
                onClick={() => setFullScreen(true)}
                style={{
                  padding: '6px 12px',
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: '1px solid #E5E7EB',
                  background: '#fff',
                  cursor: 'pointer'
                }}
              >
                Expand View
              </button>
              {selectedTeachers.length > 0 && (
                <div style={{ fontSize: 10, color: '#6B7280', marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon.Clock />
                  Timetable classes + scheduled meetings
                </div>
              )}
            </div>

            {selectedTeachers.length > 0 && (
              <div style={{ display: 'flex', gap: 3, background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, padding: 3 }}>
                {[['combined', 'Combined'], ['individual', 'Per teacher']].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setViewMode(id)}
                    style={{
                      padding: '4px 10px', fontSize: 10, fontWeight: 600,
                      borderRadius: 6, border: viewMode === id ? '1px solid #E5E7EB' : 'none',
                      background: viewMode === id ? '#fff' : 'transparent',
                      color: viewMode === id ? '#0F172A' : '#6B7280',
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all .1s',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Stats bar */}
          {stats && (
            <div style={{
              display: 'flex', gap: 10, padding: '8px 14px',
              borderBottom: '1px solid #F1F5F9', flexShrink: 0,
              animation: 'fadein .2s ease',
            }}>
              {[
                { val: stats.totalFree, label: 'Free slots', bg: '#EAF3DE', color: '#27500A' },
                { val: stats.totalPartial, label: 'Partial', bg: '#FAEEDA', color: '#633806' },
                { val: stats.totalBusy, label: 'Busy', bg: '#FCEBEB', color: '#501313' },
              ].map(({ val, label, bg, color }) => (
                <div key={label} style={{ background: bg, borderRadius: 8, padding: '4px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color, lineHeight: 1.1 }}>{val}</div>
                  <div style={{ fontSize: 9, color, opacity: .7, textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 1 }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          <Legend />

          {/* Grid area */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Empty state */}
            {selectedTeachers.length === 0 && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100%', padding: '40px 20px',
                textAlign: 'center', color: '#9CA3AF',
              }}>
                <div style={{ marginBottom: 12, opacity: .35 }}><Icon.Users /></div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Select faculty to view availability
                </div>
                <div style={{ fontSize: 11, lineHeight: 1.6 }}>
                  Availability combines timetable classes<br />and all scheduled meetings
                </div>
              </div>
            )}

            {/* Loading state */}
            {selectedTeachers.length > 0 && loading && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 10, padding: '48px 0', color: '#6B7280', fontSize: 12,
              }}>
                <Icon.Loader /> Checking availability…
              </div>
            )}

            {/* Error state */}
            {error && !loading && (
              <div style={{
                margin: 16, padding: '10px 14px', borderRadius: 10,
                background: '#FFF1F2', border: '1px solid #FECACA',
                color: '#B91C1C', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Icon.Alert />
                <div>
                  <div style={{ fontWeight: 700 }}>Could not load availability</div>
                  <div style={{ marginTop: 2, opacity: .8 }}>{error}</div>
                </div>
              </div>
            )}

            {/* Grid */}
            {selectedTeachers.length > 0 && !loading && freeData && (
              <div style={{ animation: 'fadein .2s ease' }}>
                {viewMode === 'combined' ? (
                  <CombinedGrid
                    freeData={freeData}
                    selectedTeachers={selectedTeachers}
                    selectedSlot={selectedSlot}
                    onSelectSlot={handleSelectSlot}
                    bigView={true}
                  />
                ) : (
                  <IndividualGrid
                    freeData={freeData}
                    selectedTeachers={selectedTeachers}
                    selectedSlot={selectedSlot}
                    onSelectSlot={handleSelectSlot}
                  />
                )}
              </div>
            )}
          </div>

          {/* Action banner */}
          {selectedSlot && freeData && (
            <ActionBanner
              slot={selectedSlot}
              freeData={freeData}
              selectedTeachers={selectedTeachers}
              onSchedule={(teachers, slot) => onOpenScheduler?.(teachers, slot)}
              onClear={() => setSelectedSlot(null)}
            />
          )}
        </div>
      </div>
      {fullScreen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: '#fff',
          zIndex: 9999,
          padding: 20,
          overflow: 'auto'
        }}>

          {/* Close Button */}
          <button
            onClick={() => setFullScreen(false)}
            style={{
              marginBottom: 10,
              padding: '6px 12px',
              border: '1px solid #E5E7EB',
              borderRadius: 6,
              cursor: 'pointer'
            }}
          >
            Close
          </button>

          {/* BIG GRID */}
          <CombinedGrid
            freeData={freeData}
            selectedTeachers={selectedTeachers}
            selectedSlot={selectedSlot}
            onSelectSlot={handleSelectSlot}
            bigView={true}
          />
        </div>
      )}
    </>
  );
}
