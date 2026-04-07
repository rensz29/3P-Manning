import { useState } from 'react';
import { EMPLOYEE_COLORS } from '../data/lineData';

const REVIEW_STATUS = {
  pending:    { label: 'Pending Review', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  noted:      { label: 'Noted',          color: '#0057B8', bg: '#eff6ff', border: '#bfdbfe' },
  reassigned: { label: 'Reassigned',     color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  dismissed:  { label: 'Dismissed',      color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
};

function Avatar({ emp, size = 34 }) {
  const c       = EMPLOYEE_COLORS[emp.colorIndex ?? 0];
  const initials = emp.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28, flexShrink: 0,
      background: `linear-gradient(135deg, ${c.dot}, ${c.dot}cc)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans',sans-serif", fontSize: size * 0.28,
      fontWeight: 800, color: '#fff',
      boxShadow: `0 2px 6px ${c.dot}40`,
    }}>{initials}</div>
  );
}

function ExcessCard({ emp, reviewStatus, onSetStatus }) {
  const [open, setOpen] = useState(false);
  const rs = REVIEW_STATUS[reviewStatus] ?? REVIEW_STATUS.pending;

  return (
    <div style={{
      borderRadius: '10px', border: `1.5px solid ${rs.border}`,
      background: rs.bg, overflow: 'hidden',
      boxShadow: reviewStatus === 'pending' ? '0 2px 8px rgba(217,119,6,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', cursor: 'pointer' }}
        onClick={() => setOpen(p => !p)}>
        {/* Pulse ring for pending */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {reviewStatus === 'pending' && (
            <div style={{
              position: 'absolute', inset: '-4px', borderRadius: '50%',
              border: '2px solid #f59e0b',
              animation: 'excessPulse 1.8s ease infinite',
            }}/>
          )}
          <Avatar emp={emp} size={34}/>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {emp.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.52rem', color: '#64748b' }}>{emp.badgeNo}</span>
            {emp.entryTime && (
              <>
                <span style={{ color: '#cbd5e1', fontSize: '0.5rem' }}>·</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.52rem', color: '#94a3b8' }}>IN {emp.entryTime}</span>
              </>
            )}
          </div>
        </div>

        <div style={{
          padding: '2px 7px', borderRadius: '99px', flexShrink: 0,
          background: rs.bg, border: `1px solid ${rs.border}`,
          fontFamily: "'DM Mono',monospace", fontSize: '0.48rem', fontWeight: 700, color: rs.color,
        }}>{rs.label}</div>

        <span style={{
          color: '#cbd5e1', fontSize: '0.65rem', flexShrink: 0,
          transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', display: 'inline-block',
        }}>▾</span>
      </div>

      {open && (
        <div style={{ padding: '0 12px 12px', borderTop: `1px dashed ${rs.border}`, paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.5rem', color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Manager Action
          </div>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {Object.entries(REVIEW_STATUS).map(([key, val]) => (
              <button key={key} onClick={e => { e.stopPropagation(); onSetStatus(emp.id, key); }} style={{
                padding: '4px 10px', borderRadius: '99px', cursor: 'pointer',
                border: `1.5px solid ${reviewStatus === key ? val.color : '#e2e8f0'}`,
                background: reviewStatus === key ? val.color : '#fff',
                color: reviewStatus === key ? '#fff' : '#64748b',
                fontFamily: "'DM Mono',monospace", fontSize: '0.52rem', fontWeight: 600,
                transition: 'all 0.14s',
              }}>{val.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ExcessPanel ──────────────────────────────────────────────────────────
export default function ExcessPanel({
  excessEmployees,
  scheduledPresent,
  scheduledAbsent,
  totalIn,
  totalScheduled,
  isLoading,
  isError,
  lastUpdated,
  onRefetch,
}) {
  const [reviewStatuses, setReviewStatuses] = useState({});
  const [collapsed, setCollapsed]           = useState(false);
  const [tab, setTab]                       = useState('excess');

  const setStatus = (empId, status) =>
    setReviewStatuses(prev => ({ ...prev, [empId]: status }));

  const pendingCount  = excessEmployees.filter(e => !reviewStatuses[e.id] || reviewStatuses[e.id] === 'pending').length;
  const excessCount   = excessEmployees.length;
  const absentCount   = scheduledAbsent.length;

  // Format last-updated timestamp
  const lastUpdatedStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  return (
    <div style={{
      width: '290px', flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: '110px',
      maxHeight: 'calc(100vh - 126px)',
      borderRadius: '14px', overflow: 'hidden',
      border: isError ? '1.5px solid #fca5a5' : excessCount > 0 ? '1.5px solid #fde68a' : '1.5px solid #e2e8f0',
      boxShadow: isError ? '0 4px 24px rgba(239,68,68,0.12)' : excessCount > 0 ? '0 4px 24px rgba(217,119,6,0.15)' : '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <style>{`
        @keyframes excessPulse { 0%,100%{opacity:0.8;transform:scale(1)} 50%{opacity:0.2;transform:scale(1.4)} }
        @keyframes slideIn     { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin        { to{transform:rotate(360deg)} }
      `}</style>

      {/* ── Header ── */}
      <div
        style={{
          background: isError
            ? 'linear-gradient(135deg, #450a0a, #7f1d1d)'
            : excessCount > 0
              ? 'linear-gradient(135deg, #451a03, #78350f)'
              : 'linear-gradient(135deg, #0f172a, #1e3a5f)',
          padding: '14px', cursor: 'pointer',
        }}
        onClick={() => setCollapsed(p => !p)}
      >
        {/* Title + pending badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem' }}>{isError ? '⚠️' : '🚨'}</span>
            <div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.55rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Turnstile Monitor
              </div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1rem', fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
                Excess Detection
              </div>
            </div>
          </div>
          {pendingCount > 0 && !isError && (
            <div style={{
              minWidth: '24px', height: '24px', borderRadius: '50%',
              background: '#ef4444', border: '2px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', fontWeight: 800, color: '#fff',
            }}>{pendingCount}</div>
          )}
        </div>

        {/* Turnstile counts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '10px' }}>
          {[
            { label: 'Turnstile IN',  value: isLoading ? '…' : totalIn,        color: '#60a5fa' },
            { label: 'Scheduled',     value: isLoading ? '…' : totalScheduled,  color: '#4ade80' },
            { label: 'Excess',        value: isLoading ? '…' : excessCount,     color: excessCount > 0 ? '#fbbf24' : '#4ade80' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '8px', padding: '7px 6px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.5rem', fontWeight: 800, lineHeight: 1, color }}>
                {isLoading
                  ? <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: color, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}/>
                  : value}
              </div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.44rem', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Status message */}
        {isError ? (
          <div style={{ padding: '6px 10px', borderRadius: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.65rem', fontWeight: 600, color: '#fca5a5' }}>
              ⚠ DB connection failed
            </span>
            <button onClick={e => { e.stopPropagation(); onRefetch?.(); }} style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6px', color: '#fff', padding: '3px 8px',
              fontFamily: "'DM Mono',monospace", fontSize: '0.5rem', fontWeight: 700, cursor: 'pointer',
            }}>Retry</button>
          </div>
        ) : excessCount > 0 ? (
          <div style={{ padding: '6px 10px', borderRadius: '8px', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem' }}>⚠️</span>
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.65rem', fontWeight: 600, color: '#fcd34d' }}>
              {excessCount} unscheduled employee{excessCount !== 1 ? 's' : ''} on-site
            </span>
          </div>
        ) : (
          <div style={{ padding: '6px 10px', borderRadius: '8px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem' }}>✅</span>
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.65rem', fontWeight: 600, color: '#4ade80' }}>
              No excess employees detected
            </span>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      {!collapsed && (
        <div style={{ display: 'flex', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
          {[
            { k: 'excess', label: `Excess (${excessCount})`, alert: excessCount > 0 },
            { k: 'absent', label: `Absent (${absentCount})`, alert: false },
          ].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} style={{
              flex: 1, border: 'none', padding: '8px 4px', cursor: 'pointer', background: 'transparent',
              fontFamily: "'DM Sans',sans-serif", fontSize: '0.62rem', fontWeight: 700,
              color: tab === t.k ? (t.alert ? '#d97706' : '#0f172a') : '#94a3b8',
              borderBottom: tab === t.k ? `2px solid ${t.alert ? '#f59e0b' : '#0f172a'}` : '2px solid transparent',
              transition: 'all 0.14s',
            }}>{t.label}</button>
          ))}
        </div>
      )}

      {/* ── List ── */}
      {!collapsed && (
        <div style={{ flex: 1, overflowY: 'auto', background: '#fff', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {tab === 'excess' && (
            <>
              {excessEmployees.length === 0 && !isLoading && (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
                  All employees on-site are scheduled
                </div>
              )}
              {excessEmployees.map(emp => (
                <div key={emp.id} style={{ animation: 'slideIn 0.2s ease' }}>
                  <ExcessCard
                    emp={emp}
                    reviewStatus={reviewStatuses[emp.id] ?? 'pending'}
                    onSetStatus={setStatus}
                  />
                </div>
              ))}
            </>
          )}

          {tab === 'absent' && (
            <>
              {scheduledAbsent.length === 0 && (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎉</div>
                  All scheduled employees are present
                </div>
              )}
              {scheduledAbsent.map((emp, i) => (
                <div key={emp.id} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 12px', borderRadius: '10px',
                  background: '#fef2f2', border: '1.5px solid #fecaca',
                  animation: `slideIn 0.2s ${i * 0.04}s both ease`,
                }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '9px',
                    background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8',
                    fontFamily: "'DM Sans',sans-serif", flexShrink: 0,
                  }}>{emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.5rem', color: '#94a3b8' }}>{emp.badgeNo}</div>
                  </div>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.5rem', fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '2px 7px', borderRadius: '99px', border: '1px solid #fca5a5', flexShrink: 0 }}>ABSENT</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Footer: sync status ── */}
      {!collapsed && (
        <div style={{ padding: '8px 12px', background: '#fafbfc', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {isLoading
              ? <span style={{ display: 'inline-block', width: '7px', height: '7px', border: '1.5px solid #e2e8f0', borderTopColor: '#60a5fa', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}/>
              : isError
                ? <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}/>
                : <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'excessPulse 2s ease infinite' }}/>
            }
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.48rem', color: isError ? '#fca5a5' : '#94a3b8' }}>
              {isError ? 'DB error — last sync ' : 'Last sync '}{lastUpdatedStr}
            </span>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onRefetch?.(); }}
            title="Force refresh now"
            style={{
              background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px',
              padding: '2px 8px', cursor: 'pointer',
              fontFamily: "'DM Mono',monospace", fontSize: '0.5rem', color: '#64748b',
              transition: 'border-color 0.14s, color 0.14s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#0057B8'; e.currentTarget.style.color = '#0057B8'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
          >↻ Sync</button>
        </div>
      )}
    </div>
  );
}
