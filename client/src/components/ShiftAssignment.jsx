import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAssignment } from '../hooks/useAssignment';
import { useTurnstile }  from '../hooks/useTurnstile';
import { useAuth }       from '../hooks/useAuth';
import EmployeePool      from './EmployeePool';
import ShiftBoard        from './ShiftBoard';
import ExcessPanel       from './ExcessPanel';
import AnalyticsDashboard from './AnalyticsDashboard';
import SettingsPage      from './SettingsPage';
import AdminPage         from './AdminPage';
import LoginPage         from './LoginPage';
import {
  SHIFTS,
  DRESSINGS_DEPARTMENTS, DRESSINGS_LINES_BY_DEPT, DRESSINGS_ALL_LINES,
  SAVOURY_DEPARTMENTS,   SAVOURY_LINES_BY_DEPT,   SAVOURY_ALL_LINES,
  ALL_LINES,
} from '../data/lineData';

const getCurrentShift = () => {
  const h = new Date().getHours();
  if (h >= 6 && h < 14) return 1;
  if (h >= 14 && h < 22) return 2;
  return 3;
};

// ── Pages ──────────────────────────────────────────────────────────────────────
const PAGES = {
  DRESSINGS: 'dressings',
  SAVOURY:   'savoury',
  ANALYTICS: 'analytics',
  SETTINGS:  'settings',
  ADMIN:     'admin',
};

// ── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2400); return () => clearTimeout(t); }, [onDone]);
  const styles = {
    success: { bg: '#052e16', accent: '#4ade80', icon: '✓' },
    info:    { bg: '#0c1a3d', accent: '#60a5fa', icon: 'i' },
    warn:    { bg: '#3b1c00', accent: '#fb923c', icon: '!' },
    excess:  { bg: '#451a03', accent: '#fbbf24', icon: '⚠' },
  };
  const s = styles[type] ?? styles.info;
  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 600,
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '12px 16px 12px 12px', borderRadius: '12px',
      background: s.bg, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      fontFamily: "'DM Sans',sans-serif", fontSize: '0.8rem', fontWeight: 500,
      color: '#fff', animation: 'toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      border: `1px solid ${s.accent}30`,
    }}>
      <div style={{
        width: '22px', height: '22px', borderRadius: '50%',
        background: s.accent + '20', border: `1.5px solid ${s.accent}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: s.accent, fontSize: '0.65rem', fontWeight: 800, flexShrink: 0,
      }}>{s.icon}</div>
      {msg}
    </div>
  );
}

function DragBanner({ active }) {
  if (!active) return null;
  return (
    <div style={{
      position: 'fixed', top: '112px', left: '50%', transform: 'translateX(-50%)',
      zIndex: 400, pointerEvents: 'none',
      background: 'rgba(15,23,42,0.88)', backdropFilter: 'blur(8px)',
      color: '#fff', padding: '7px 20px', borderRadius: '99px',
      fontFamily: "'DM Sans',sans-serif", fontSize: '0.72rem', fontWeight: 600,
      boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
      display: 'flex', alignItems: 'center', gap: '8px',
      animation: 'fadeIn 0.18s ease', border: '1px solid rgba(255,255,255,0.1)',
    }}>
      <span style={{ animation: 'bounce 0.6s ease infinite alternate', display: 'inline-block' }}>↓</span>
      Drop on a shift cell to assign
    </div>
  );
}

function StatPill({ label, value, highlight, warn }) {
  return (
    <div style={{ textAlign: 'center', minWidth: '52px' }}>
      <div style={{
        fontFamily: "'Barlow Condensed',sans-serif",
        fontSize: '1.4rem', fontWeight: 800, lineHeight: 1,
        color: warn ? '#fbbf24' : highlight ? '#4ade80' : '#fff',
        textShadow: warn ? '0 0 20px rgba(251,191,36,0.5)' : highlight ? '0 0 20px rgba(74,222,128,0.4)' : 'none',
      }}>{value}</div>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.48rem', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

// ── Plant tab config ───────────────────────────────────────────────────────────
const PLANT_CONFIG = {
  dressings: {
    label: 'Dressings', icon: '🥗', color: '#0057B8',
    depts: DRESSINGS_DEPARTMENTS, linesByDept: DRESSINGS_LINES_BY_DEPT,
    allLines: DRESSINGS_ALL_LINES, defaultDept: 'drs_flexibles',
  },
  savoury: {
    label: 'Savoury', icon: '🧂', color: '#b45309',
    depts: SAVOURY_DEPARTMENTS, linesByDept: SAVOURY_LINES_BY_DEPT,
    allLines: SAVOURY_ALL_LINES, defaultDept: 'sav_powders',
  },
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ShiftAssignment({ onBack } = {}) {
  const { session, isLoggedIn, isAdmin, displayName, login, logout } = useAuth();

  const {
    employees, assignments, assignedIds, dragEmpId,
    startDrag, endDrag,
    assignEmployee, unassignEmployee, getAssignedEmployees,
    getShiftTotal, getShiftRequired, getDeptShiftTotal, getDeptShiftRequired,
    getScheduledIdsForShift,
  } = useAssignment();

  // ── Page / navigation state ──────────────────────────────────────────────
  const [page, setPage]             = useState(PAGES.DRESSINGS);
  const [activePlant, setActivePlant] = useState('dressings'); // 'dressings' | 'savoury'
  const [activeDept,  setActiveDept]  = useState('drs_flexibles');

  // ── Settings: overridden quotas ──────────────────────────────────────────
  // { [skuId]: newQuotaValue }  — only stores changed values
  const [quotaOverrides, setQuotaOverrides] = useState({});
  const handleQuotaChange = (skuId, val) =>
    setQuotaOverrides(prev => ({ ...prev, [skuId]: val }));
  const handleResetAll = () => setQuotaOverrides({});

  // ── Other UI state ───────────────────────────────────────────────────────
  const [clock, setClock]           = useState(new Date());
  const [toast, setToast]           = useState(null);
  const [poolVisible, setPoolVisible] = useState(true);

  const curShift    = getCurrentShift();
  const curShiftObj = SHIFTS.find(s => s.id === curShift);

  const plantCfg   = PLANT_CONFIG[activePlant];
  const lines       = plantCfg.linesByDept[activeDept] ?? [];

  // ── Turnstile ────────────────────────────────────────────────────────────
  const scheduledIdsForCurrentShift = useMemo(
    () => getScheduledIdsForShift(curShift),
    [getScheduledIdsForShift, curShift, assignments]
  );
  const {
    excessEmployees, scheduledPresent, scheduledAbsent,
    totalIn, totalExcess,
    isLoading: turnstileLoading, isError: turnstileError,
    lastUpdated: turnstileLastUpdated, refetch: turnstileRefetch,
  } = useTurnstile(scheduledIdsForCurrentShift);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (totalExcess > 0)
      setToast({ msg: `${totalExcess} unscheduled employee${totalExcess > 1 ? 's' : ''} detected on-site`, type: 'excess' });
  }, [totalExcess]);

  const handleDrop = useCallback((skuId, shiftId, quota) => {
    assignEmployee(skuId, shiftId, quota);
    setToast({ msg: 'Employee assigned!', type: 'success' });
  }, [assignEmployee]);

  const handleRemove = useCallback((empId, skuId, shiftId) => {
    unassignEmployee(empId, skuId, shiftId);
    setToast({ msg: 'Employee unassigned', type: 'info' });
  }, [unassignEmployee]);

  // KPI totals (all plants combined)
  const totalEmp      = employees.length;
  const totalAssigned = assignedIds.size;
  const totalRequired = ALL_LINES.reduce((s, l) => s + l.skus.reduce((s2, sk) => s2 + (quotaOverrides[sk.id] ?? sk.quota) * SHIFTS.length, 0), 0);
  const overallPct    = totalRequired > 0 ? Math.min(Math.round((totalAssigned / totalRequired) * 100), 100) : 0;
  const linesFullyStaffed = ALL_LINES.filter(line =>
    line.skus.every(sku =>
      SHIFTS.every(sh => (quotaOverrides[sku.id] ?? sku.quota) === 0 || (getAssignedEmployees(sku.id, sh.id)?.length ?? 0) >= (quotaOverrides[sku.id] ?? sku.quota))
    )
  ).length;

  // Switch plant → reset dept to that plant's default
  const switchPlant = (plantId) => {
    setActivePlant(plantId);
    setActiveDept(PLANT_CONFIG[plantId].defaultDept);
    setPage(plantId === 'dressings' ? PAGES.DRESSINGS : PAGES.SAVOURY);
  };

  // ── Auth gate ────────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return <LoginPage onLogin={login} />;
  }

  // ── Admin page ───────────────────────────────────────────────────────────
  if (page === PAGES.ADMIN && isAdmin) {
    return (
      <AdminPage
        displayName={displayName}
        onBack={() => setPage(PAGES.DRESSINGS)}
        onGoAnalytics={() => setPage(PAGES.ANALYTICS)}
        onGoSettings={() => setPage(PAGES.SETTINGS)}
      />
    );
  }

  // ── Render special pages ─────────────────────────────────────────────────
  if (page === PAGES.ANALYTICS) {
    return (
      <AnalyticsDashboard
        assignments={assignments}
        quotaOverrides={quotaOverrides}
        turnstileData={{ excessEmployees, scheduledPresent, scheduledAbsent, totalIn, totalExcess }}
        onBack={() => setPage(activePlant === 'dressings' ? PAGES.DRESSINGS : PAGES.SAVOURY)}
      />
    );
  }

  if (page === PAGES.SETTINGS) {
    return (
      <SettingsPage
        quotas={quotaOverrides}
        onQuotaChange={handleQuotaChange}
        onResetAll={handleResetAll}
        onBack={() => setPage(activePlant === 'dressings' ? PAGES.DRESSINGS : PAGES.SAVOURY)}
      />
    );
  }

  // ── Main shift assignment view ────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #f1f5f9; min-height: 100vh; }
        input::placeholder { color: #9ca3af; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 99px; }
        @keyframes livepulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(1.5)} }
        @keyframes fadeIn     { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes toastIn    { from{opacity:0;transform:translateY(16px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes bounce     { from{transform:translateY(0)} to{transform:translateY(3px)} }
        @keyframes slideDown  { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes excessFlash{ 0%,100%{opacity:1} 50%{opacity:0.6} }
        @media (max-width:1100px){ .excess-aside{display:none!important} }
        @media (max-width:860px){ .app-body{flex-direction:column!important;padding:10px 12px!important} .pool-aside{width:100%!important;position:relative!important;top:0!important} .topbar-extras{display:none!important} }
        @media (max-width:520px){ .banner-kpis{display:none!important} }
      `}</style>

      <div style={{ fontFamily: "'DM Sans',sans-serif", minHeight: '100vh', background: '#f1f5f9' }}>

        {/* ══ HEADER ════════════════════════════════════════════════════════ */}
        <header style={{
          height: '62px', position: 'sticky', top: 0, zIndex: 200,
          background: 'linear-gradient(130deg, #0a0f2c 0%, #0d2260 50%, #0d4fa8 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px',
          boxShadow: '0 2px 20px rgba(0,0,0,0.3)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {onBack && (
              <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', padding: '6px 12px', fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>← Back</button>
            )}
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', boxShadow: '0 3px 10px rgba(56,189,248,0.35)' }}>👷</div>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.4rem', fontWeight: 800, color: '#fff', letterSpacing: '0.06em', lineHeight: 1 }}>3P SHIFT ASSIGN</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.49rem', color: 'rgba(255,255,255,0.32)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Unilever · HRTA Department</div>
            </div>
          </div>

          <div className="topbar-extras" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Excess flash */}
            {totalExcess > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', animation: 'excessFlash 2s ease infinite' }}>
                <span style={{ fontSize: '0.8rem' }}>🚨</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.62rem', color: '#fca5a5', fontWeight: 700 }}>{totalExcess} EXCESS</span>
              </div>
            )}
            {/* Admin-only buttons */}
            {isAdmin && (
              <>
                <button onClick={() => setPage(PAGES.ADMIN)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)', color: '#fcd34d', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: '0.72rem', fontWeight: 700, transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.25)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,158,11,0.15)'}
                ><span>🛡️</span> Admin</button>
                <button onClick={() => setPage(PAGES.ANALYTICS)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', color: '#a5b4fc', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: '0.72rem', fontWeight: 700, transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.25)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.15)'}
                ><span>📊</span> Analytics</button>
                <button onClick={() => setPage(PAGES.SETTINGS)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.35)', color: '#94a3b8', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: '0.72rem', fontWeight: 700, transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(100,116,139,0.25)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(100,116,139,0.15)'}
                ><span>⚙️</span> Settings</button>
              </>
            )}
            {/* User info + logout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)' }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)' }}>{displayName}</span>
              {isAdmin && <span style={{ fontSize: '0.6rem', background: 'rgba(245,158,11,0.2)', color: '#fcd34d', padding: '1px 5px', borderRadius: '99px', fontFamily: "'DM Mono',monospace", fontSize: '0.48rem', fontWeight: 700 }}>ADMIN</span>}
            </div>
            <button onClick={logout} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: '0.72rem', fontWeight: 600, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
            >Sign Out</button>
            {/* Shift mini-status */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {SHIFTS.map(s => {
                const isCur = s.id === curShift;
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '8px', background: isCur ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${isCur ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'}` }}>
                    <span style={{ fontSize: '0.8rem' }}>{s.icon}</span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', color: isCur ? '#fff' : 'rgba(255,255,255,0.45)', fontWeight: isCur ? 600 : 400 }}>{s.label}</span>
                    <span style={{ padding: '1px 5px', borderRadius: '99px', fontSize: '0.58rem', fontWeight: 700, fontFamily: "'DM Mono',monospace", background: isCur ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.07)', border: `1px solid ${isCur ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)'}`, color: isCur ? '#86efac' : 'rgba(255,255,255,0.4)' }}>{getShiftTotal(s.id)}/{getShiftRequired()}</span>
                  </div>
                );
              })}
            </div>
            {/* Clock */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', animation: 'livepulse 1.8s ease infinite', flexShrink: 0, display: 'inline-block' }}/>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)' }}>{clock.toLocaleTimeString('en-GB')}</span>
            </div>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #38bdf8, #0052b0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: "'DM Sans',sans-serif", fontSize: '0.65rem', fontWeight: 800 }}>UN</div>
          </div>
        </header>

        {/* ══ CONTEXT BANNER ════════════════════════════════════════════════ */}
        <div style={{
          background: totalExcess > 0 ? 'linear-gradient(90deg,#3b0764,#6b21a8)' : 'linear-gradient(90deg,#0e2a6e,#1354b6)',
          padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)', transition: 'background 1s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.2rem' }}>{curShiftObj?.icon}</span>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1rem', fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>
                {curShiftObj?.fullLabel} &nbsp;·&nbsp; {curShiftObj?.time}
              </div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.54rem', color: 'rgba(255,255,255,0.42)' }}>
                {clock.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '2px 10px', borderRadius: '99px', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4ade80', animation: 'livepulse 1.8s ease infinite', display: 'inline-block' }}/>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.54rem', color: '#4ade80', letterSpacing: '0.08em' }}>LIVE</span>
            </div>
          </div>
          <div className="banner-kpis" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', padding: '0 16px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
              <StatPill label="Turnstile IN" value={totalIn} />
              <StatPill label="Scheduled"   value={scheduledIdsForCurrentShift.size} highlight />
              <StatPill label="Excess"      value={totalExcess} warn={totalExcess > 0} />
            </div>
            <div style={{ display: 'flex', gap: '16px', padding: '0 16px 0 0', marginRight: '12px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
              <StatPill label="Total 3P"   value={totalEmp} />
              <StatPill label="Assigned"   value={totalAssigned} highlight={totalAssigned > 0} />
              <StatPill label="Lines Full" value={`${linesFullyStaffed}/${ALL_LINES.length}`} highlight={linesFullyStaffed === ALL_LINES.length} />
            </div>
            <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '7px 14px', minWidth: '130px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.5rem', color: 'rgba(255,255,255,0.38)' }}>Overall slots</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.5rem', fontWeight: 700, color: overallPct === 100 ? '#4ade80' : 'rgba(255,255,255,0.65)' }}>{totalAssigned}/{totalRequired} · {overallPct}%</span>
              </div>
              <div style={{ height: '5px', borderRadius: '99px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: '99px', width: `${overallPct}%`, background: overallPct === 100 ? 'linear-gradient(90deg,#4ade80,#22c55e)' : 'linear-gradient(90deg,#60a5fa,#3b82f6)', transition: 'width 0.5s ease' }}/>
              </div>
            </div>
          </div>
        </div>

        {/* ══ PLANT + DEPT NAV ══════════════════════════════════════════════ */}
        <nav style={{
          background: '#fff', borderBottom: '1px solid #e5e7eb',
          padding: '0 20px', display: 'flex', alignItems: 'stretch',
          position: 'sticky', top: '62px', zIndex: 100,
          boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
        }}>
          {/* Plant switcher */}
          {[
            { id: 'dressings', label: 'Dressings', icon: '🥗', color: '#0057B8' },
            { id: 'savoury',   label: 'Savoury',   icon: '🧂', color: '#b45309' },
          ].map(plant => (
            <button key={plant.id} onClick={() => switchPlant(plant.id)} style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '12px 16px', border: 'none', cursor: 'pointer', background: 'transparent',
              borderBottom: activePlant === plant.id ? `3px solid ${plant.color}` : '3px solid transparent',
              marginBottom: '-1px', transition: 'all 0.16s',
            }}
              onMouseEnter={e => { if (activePlant !== plant.id) e.currentTarget.style.background = '#f8fafc'; }}
              onMouseLeave={e => { if (activePlant !== plant.id) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: '1rem' }}>{plant.icon}</span>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1rem', fontWeight: 800, color: activePlant === plant.id ? plant.color : '#6b7280', letterSpacing: '0.04em' }}>{plant.label}</span>
            </button>
          ))}

          {/* Divider */}
          <div style={{ width: '1px', background: '#e5e7eb', margin: '8px 8px' }}/>

          {/* Dept tabs for active plant */}
          {plantCfg.depts.map(dept => {
            const isActive   = dept.id === activeDept;
            const deptLines  = plantCfg.linesByDept[dept.id] ?? [];
            const dAssigned  = deptLines.reduce((s, l) => s + l.skus.reduce((s2, sk) => s2 + SHIFTS.reduce((s3, sh) => s3 + (getAssignedEmployees(sk.id, sh.id)?.length ?? 0), 0), 0), 0);
            const dRequired  = deptLines.reduce((s, l) => s + l.skus.reduce((s2, sk) => s2 + (quotaOverrides[sk.id] ?? sk.quota) * SHIFTS.length, 0), 0);
            const dPct       = dRequired > 0 ? Math.round((dAssigned / dRequired) * 100) : 0;
            const dFull      = dPct >= 100 && dRequired > 0;
            return (
              <button key={dept.id} onClick={() => setActiveDept(dept.id)} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 14px', border: 'none', cursor: 'pointer', background: 'transparent',
                borderBottom: isActive ? `3px solid ${dept.color}` : '3px solid transparent',
                marginBottom: '-1px', transition: 'all 0.16s',
              }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f8fafc'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: '0.95rem' }}>{dept.icon}</span>
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '0.9rem', fontWeight: 700, color: isActive ? dept.color : '#6b7280', letterSpacing: '0.03em' }}>{dept.label}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.48rem', color: isActive ? dept.color + 'cc' : '#9ca3af' }}>{deptLines.length} lines</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 7px', borderRadius: '99px', background: isActive ? dept.color : dFull ? '#f0fdf4' : '#f3f4f6', border: `1px solid ${isActive ? 'transparent' : dFull ? '#86efac' : '#e5e7eb'}` }}>
                  {dFull && <span style={{ fontSize: '0.55rem' }}>✓</span>}
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.52rem', fontWeight: 700, color: isActive ? '#fff' : dFull ? '#16a34a' : '#9ca3af' }}>{dPct}%</span>
                </div>
              </button>
            );
          })}

          {/* Pool toggle */}
          <button onClick={() => setPoolVisible(p => !p)} style={{ marginLeft: 'auto', padding: '0 14px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontFamily: "'DM Sans',sans-serif", fontSize: '0.7rem', fontWeight: 600, borderLeft: '1px solid #f1f5f9', transition: 'color 0.15s, background 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#111827'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280'; }}
          >
            <span>{poolVisible ? '◀' : '▶'}</span>
            <span>Pool</span>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.58rem', fontWeight: 700, color: '#4ade80', background: '#052e16', padding: '1px 6px', borderRadius: '99px' }}>{employees.length - assignedIds.size}</span>
          </button>
        </nav>

        {/* ══ BODY ══════════════════════════════════════════════════════════ */}
        <main style={{ display: 'flex', gap: '16px', padding: '16px 20px', alignItems: 'flex-start' }}>
          {poolVisible && (
            <div className="pool-aside" style={{ width: '210px', flexShrink: 0, position: 'sticky', top: '130px', maxHeight: 'calc(100vh - 146px)' }}>
              <EmployeePool employees={employees} assignedIds={assignedIds} onDragStart={startDrag} onDragEnd={endDrag} />
            </div>
          )}

          <ShiftBoard
            key={activeDept}
            lines={lines}
            deptId={activeDept}
            quotaOverrides={quotaOverrides}
            getAssignedEmployees={getAssignedEmployees}
            getDeptShiftTotal={getDeptShiftTotal}
            getDeptShiftRequired={(deptLines) =>
              deptLines.reduce((s, l) => s + l.skus.reduce((s2, sk) => s2 + (quotaOverrides[sk.id] ?? sk.quota), 0), 0)
            }
            isDragging={!!dragEmpId}
            onDrop={handleDrop}
            onRemove={handleRemove}
          />

          <div className="excess-aside">
            <ExcessPanel
              excessEmployees={excessEmployees}
              scheduledPresent={scheduledPresent}
              scheduledAbsent={scheduledAbsent}
              totalIn={totalIn}
              totalScheduled={scheduledIdsForCurrentShift.size}
              currentShift={curShift}
              isLoading={turnstileLoading}
              isError={turnstileError}
              lastUpdated={turnstileLastUpdated}
              onRefetch={turnstileRefetch}
            />
          </div>
        </main>

        <footer style={{ textAlign: 'center', padding: '12px 0 20px', color: '#cbd5e1', fontFamily: "'DM Mono',monospace", fontSize: '0.5rem', letterSpacing: '0.12em' }}>
          3P SHIFT ASSIGN · UNILEVER INDUSTRIAL PLATFORM · {new Date().getFullYear()}
        </footer>
      </div>

      <DragBanner active={!!dragEmpId} />
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </>
  );
}
