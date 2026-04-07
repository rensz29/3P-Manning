import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { io }            from 'socket.io-client';
import { SHIFTS } from '../data/lineData';
import { buildScheduleLayout } from '../utils/scheduleLines';
import { getVariantLineTotalFromRows, getEffectiveSkuQuotas } from '../utils/scheduleQuotas';

const getCurrentShift = () => {
  const h = new Date().getHours();
  if (h >= 6 && h < 14) return 1;
  if (h >= 14 && h < 22) return 2;
  return 3;
};

const toYMD = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const normalizeMachineName = (v = '') =>
  String(v).toLowerCase().replace(/[^a-z0-9]/g, '');

const machineMatchesLine = (machine, lineLabel) => {
  const m = normalizeMachineName(machine);
  const l = normalizeMachineName(lineLabel);
  if (!m || !l) return false;
  return m === l || m.startsWith(l) || l.startsWith(m) || m.includes(l) || l.includes(m);
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ShiftAssignment({ onBack } = {}) {
  const { session, isLoggedIn, isAdmin, displayName, login, logout } = useAuth();

  // ── Page / navigation state ──────────────────────────────────────────────
  const [page, setPage]             = useState(PAGES.DRESSINGS);
  const [activePlant, setActivePlant] = useState('dressings'); // 'dressings' | 'savoury'
  const [activeDept,  setActiveDept]  = useState('');

  // ── Settings: overridden line manpower ────────────────────────────────
  // { [lineId]: newManpowerValue } — only stores changed values
  const [lineManpowerOverrides, setLineManpowerOverrides] = useState({});
  const handleLineQuotaChange = (lineId, val) => {
    setLineManpowerOverrides(prev => {
      const next = { ...prev };
      if (val == null || val === '') {
        delete next[lineId];
      } else {
        next[lineId] = val;
      }
      return next;
    });
  };
  const handleResetAll = () => setLineManpowerOverrides({});

  // ── Other UI state ───────────────────────────────────────────────────────
  const [clock, setClock]           = useState(new Date());
  const [toast, setToast]           = useState(null);
  const [poolVisible, setPoolVisible] = useState(true);
  const [scheduleByPlant, setScheduleByPlant] = useState({ dressings: [], savoury: [] });
  const [dbScheduleLoading, setDbScheduleLoading] = useState(false);
  const [dbScheduleError, setDbScheduleError] = useState(null);
  const [sessionStatus, setSessionStatus] = useState('draft'); // draft | submitted | approved
  const [sessionSubmittedBy, setSessionSubmittedBy] = useState('');
  const [sessionApprovedBy, setSessionApprovedBy] = useState('');

  const curShift    = getCurrentShift();
  const curShiftObj = SHIFTS.find(s => s.id === curShift);
  const currentDate = toYMD(clock);

  const layoutDressings = useMemo(
    () => buildScheduleLayout(scheduleByPlant.dressings, 'dressings'),
    [scheduleByPlant.dressings],
  );
  const layoutSavoury = useMemo(
    () => buildScheduleLayout(scheduleByPlant.savoury, 'savoury'),
    [scheduleByPlant.savoury],
  );
  const allLinesCombined = useMemo(
    () => [...layoutDressings.allLines, ...layoutSavoury.allLines],
    [layoutDressings, layoutSavoury],
  );

  const lineIdsKey = useMemo(() => allLinesCombined.map(l => l.id).join('|'), [allLinesCombined]);

  // Default required manpower per line (resolved from DB schedule variants).
  const lineTotalsById = useMemo(() => {
    const norm = (s) => String(s ?? '').trim().toLowerCase();
    const defaultSectionForPlant = (plantKey) =>
      plantKey === 'dressings' ? 'DRESSINGS' : 'SAVOURY';

    const map = {};
    for (const line of allLinesCombined) {
      const rows = (scheduleByPlant[line.plant] ?? []).filter((r) => {
        const secRow = ((r.section && String(r.section).trim()) || defaultSectionForPlant(line.plant));
        return norm(r.machine) === norm(line.machine) && norm(secRow) === norm(line.sectionKey);
      });

      const variantTotal = getVariantLineTotalFromRows(rows);
      map[line.id] = variantTotal ?? line.skus.reduce((s, sk) => s + (Number(sk.quota) || 0), 0);
    }
    return map;
  }, [scheduleByPlant, allLinesCombined]);

  // Load persisted operator overrides for required manpower per line.
  const seededForLineIdsKeyRef = useRef(null);
  useEffect(() => {
    let ignore = false;

    const loadLineOverrides = async () => {
      if (!allLinesCombined.length) {
        if (!ignore) setLineManpowerOverrides({});
        return;
      }

      try {
        const lineIds = allLinesCombined.map(l => l.id);
        const res = await fetch('/api/v1/settings/lines/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lineIds }),
        });
        if (!res.ok) throw new Error(`Failed to load line settings (${res.status})`);
        const body = await res.json().catch(() => null);
        const overridesMap = body?.data ?? body ?? {};

        if (ignore) return;

        // If nothing exists in DB yet, seed it with schedule-derived defaults
        // for all discovered machine lines (line-level quota only).
        if (
          (!overridesMap || Object.keys(overridesMap).length === 0) &&
          seededForLineIdsKeyRef.current !== lineIdsKey
        ) {
          try {
            const scopeLineIds = allLinesCombined.map(l => l.id);
            const items = scopeLineIds.map(lineId => ({
              lineId,
              quota: Number(lineTotalsById?.[lineId] ?? 0),
            }));

            const seedRes = await fetch('/api/v1/settings/lines/scope', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ scopeLineIds, items }),
            });
            if (!seedRes.ok) throw new Error(`Failed to seed settings (${seedRes.status})`);

            const seededMap = {};
            for (const it of items) seededMap[it.lineId] = it.quota;
            setLineManpowerOverrides(seededMap);
            seededForLineIdsKeyRef.current = lineIdsKey;
            return;
          } catch (_seedErr) {
            // Fall back to schedule variant defaults via empty overrides map.
          }
        }

        setLineManpowerOverrides(overridesMap || {});
      } catch (err) {
        if (!ignore) setLineManpowerOverrides({});
      }
    };

    loadLineOverrides();
    return () => {
      ignore = true;
    };
  }, [lineIdsKey, allLinesCombined, lineTotalsById]);

  const {
    employees, assignments, assignedIds, dragEmpId,
    startDrag, endDrag,
    assignEmployee, unassignEmployee, getAssignedEmployees,
    getShiftTotal, getShiftRequired, getDeptShiftTotal,
    getScheduledIdsForShift,
    replaceAssignments,
    assignRevision,
  } = useAssignment(allLinesCombined);

  const applyingRemoteUpdateRef = useRef(false);
  const sessionLoadedRef = useRef(false);
  const lastPersistedSignatureRef = useRef('');

  const currentLayout = activePlant === 'dressings' ? layoutDressings : layoutSavoury;
  const plantCfg = useMemo(() => ({
    depts: currentLayout.departments,
    linesByDept: currentLayout.linesByDept,
    allLines: currentLayout.allLines,
  }), [currentLayout]);

  const filteredLines = useMemo(
    () => plantCfg.linesByDept[activeDept] ?? [],
    [plantCfg.linesByDept, activeDept],
  );
  const hasAvailableSchedule = filteredLines.length > 0;

  const dbScheduleRows = activePlant === 'dressings' ? scheduleByPlant.dressings : scheduleByPlant.savoury;

  const scheduleByLineId = useMemo(() => {
    const map = {};
    for (const line of filteredLines) {
      const norm = (s) => String(s ?? '').trim().toLowerCase();
      const defaultSection = activePlant === 'dressings' ? 'DRESSINGS' : 'SAVOURY';
      map[line.id] = dbScheduleRows.filter(row => {
        const secRow = ((row.section && String(row.section).trim()) || defaultSection);
        return machineMatchesLine(row.machine, line.label) && norm(secRow) === norm(line.sectionKey);
      });
    }
    return map;
  }, [filteredLines, dbScheduleRows]);

  const analyticsDepartments = useMemo(
    () => [...layoutDressings.departments, ...layoutSavoury.departments],
    [layoutDressings, layoutSavoury],
  );
  const analyticsLinesByDept = useMemo(() => ({
    ...layoutDressings.linesByDept,
    ...layoutSavoury.linesByDept,
  }), [layoutDressings.linesByDept, layoutSavoury.linesByDept]);

  const assignmentsSignature = useMemo(() => {
    try {
      return JSON.stringify(assignments ?? {});
    } catch {
      return '';
    }
  }, [assignments]);

  const allScheduleByLineId = useMemo(() => {
    const map = {};
    const norm = (s) => String(s ?? '').trim().toLowerCase();
    const defaultSectionForPlant = (plantKey) => (plantKey === 'dressings' ? 'DRESSINGS' : 'SAVOURY');
    for (const line of allLinesCombined) {
      const rows = (scheduleByPlant[line.plant] ?? []).filter((row) => {
        const secRow = ((row.section && String(row.section).trim()) || defaultSectionForPlant(line.plant));
        return machineMatchesLine(row.machine, line.label) && norm(secRow) === norm(line.sectionKey);
      });
      map[line.id] = rows;
    }
    return map;
  }, [allLinesCombined, scheduleByPlant]);

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
    let ignore = false;

    const loadSchedule = async () => {
      setDbScheduleLoading(true);
      setDbScheduleError(null);

      try {
        const qs = new URLSearchParams({ date: currentDate, shift: String(curShift) });
        const [dRes, sRes] = await Promise.all([
          fetch(`/api/v1/upload/schedule?tab=dressings&${qs}`),
          fetch(`/api/v1/upload/schedule?tab=savoury&${qs}`),
        ]);
        if (!dRes.ok || !sRes.ok) {
          throw new Error(`Failed to fetch schedule (${dRes.status}/${sRes.status})`);
        }
        const dJson = await dRes.json();
        const sJson = await sRes.json();

        console.log(dJson, sJson);
        if (!ignore) {
          setScheduleByPlant({
            dressings: dJson?.data?.rows ?? [],
            savoury: sJson?.data?.rows ?? [],
          });
        }
      } catch (err) {
        if (!ignore) {
          setScheduleByPlant({ dressings: [], savoury: [] });
          setDbScheduleError(err.message || 'Failed to fetch schedule');
        }
      } finally {
        if (!ignore) setDbScheduleLoading(false);
      }
    };

    loadSchedule();
    return () => { ignore = true; };
  }, [currentDate, curShift]);

  useEffect(() => {
    const depts = plantCfg.depts;
    if (!depts.length) return;
    if (!depts.some(d => d.id === activeDept)) {
      setActiveDept(depts[0].id);
    }
  }, [activePlant, plantCfg.depts, activeDept]);

  // Load persisted assignment session for selected date.
  useEffect(() => {
    let ignore = false;
    sessionLoadedRef.current = false;

    const loadSession = async () => {
      try {
        const res = await fetch(`/api/v1/assignments/session?date=${encodeURIComponent(currentDate)}`);
        if (!res.ok) throw new Error(`Failed to load assignment session (${res.status})`);
        const body = await res.json();
        const data = body?.data ?? {};
        if (ignore) return;
        applyingRemoteUpdateRef.current = true;
        replaceAssignments(data.assignments ?? {});
        lastPersistedSignatureRef.current = JSON.stringify(data.assignments ?? {});
        setSessionStatus(data.status ?? 'draft');
        setSessionSubmittedBy(data.submittedBy ?? '');
        setSessionApprovedBy(data.approvedBy ?? '');
        sessionLoadedRef.current = true;
        setTimeout(() => { applyingRemoteUpdateRef.current = false; }, 0);
      } catch (_err) {
        if (ignore) return;
        sessionLoadedRef.current = true;
      }
    };

    loadSession();
    return () => { ignore = true; };
  }, [currentDate, replaceAssignments]);

  // Realtime updates across all users.
  useEffect(() => {
    const socket = io('/', { transports: ['websocket', 'polling'] });
    socket.emit('assignment.join', { date: currentDate });
    socket.on('assignment.session.updated', ({ date, session: nextSession }) => {
      if (date !== currentDate || !nextSession) return;
      applyingRemoteUpdateRef.current = true;
      replaceAssignments(nextSession.assignments ?? {});
      lastPersistedSignatureRef.current = JSON.stringify(nextSession.assignments ?? {});
      setSessionStatus(nextSession.status ?? 'draft');
      setSessionSubmittedBy(nextSession.submittedBy ?? '');
      setSessionApprovedBy(nextSession.approvedBy ?? '');
      setTimeout(() => { applyingRemoteUpdateRef.current = false; }, 0);
    });
    return () => {
      socket.emit('assignment.leave', { date: currentDate });
      socket.disconnect();
    };
  }, [currentDate, replaceAssignments]);

  // Persist assignment edits (debounced) to backend session.
  useEffect(() => {
    if (!sessionLoadedRef.current) return;
    if (applyingRemoteUpdateRef.current) return;
    if (sessionStatus !== 'draft') return;
    if (assignmentsSignature === lastPersistedSignatureRef.current) return;

    const t = setTimeout(async () => {
      try {
        await fetch('/api/v1/assignments/session', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: currentDate,
            assignments,
            actor: {
              username: session?.username ?? '',
              displayName: session?.displayName ?? '',
              role: isAdmin ? 'admin' : 'user',
            },
          }),
        });
        lastPersistedSignatureRef.current = assignmentsSignature;
      } catch (_err) {
        // Keep UI responsive even if sync momentarily fails.
      }
    }, 250);

    return () => clearTimeout(t);
  }, [assignRevision, assignments, assignmentsSignature, currentDate, session, isAdmin, sessionStatus]);

  useEffect(() => {
    if (totalExcess > 0)
      setToast({ msg: `${totalExcess} unscheduled employee${totalExcess > 1 ? 's' : ''} detected on-site`, type: 'excess' });
  }, [totalExcess]);

  const isLocked = sessionStatus !== 'draft';

  const handleDrop = useCallback((skuId, shiftId, quota) => {
    if (isLocked) return;
    assignEmployee(skuId, shiftId, quota);
    setToast({ msg: 'Employee assigned!', type: 'success' });
  }, [assignEmployee, isLocked]);

  const handleRemove = useCallback((empId, skuId, shiftId) => {
    if (isLocked) return;
    unassignEmployee(empId, skuId, shiftId);
    setToast({ msg: 'Employee unassigned', type: 'info' });
  }, [unassignEmployee, isLocked]);

  const buildRequiredBySkuShift = useCallback(() => {
    const map = {};
    for (const line of allLinesCombined) {
      const rows = allScheduleByLineId[line.id] ?? [];
      const effective = getEffectiveSkuQuotas(line, rows, lineManpowerOverrides);
      for (const sku of effective) {
        // Submit validation should match the editable scope in UI:
        // assignment board allows staffing only the current shift.
        map[`${sku.id}|${curShift}`] = sku.effectiveQuota;
      }
    }
    return map;
  }, [allLinesCombined, allScheduleByLineId, lineManpowerOverrides, curShift]);

  const submitForApproval = useCallback(async () => {
    try {
      const requiredBySkuShift = buildRequiredBySkuShift();
      const res = await fetch('/api/v1/assignments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: currentDate,
          assignments,
          requiredBySkuShift,
          actor: {
            username: session?.username ?? '',
            displayName: session?.displayName ?? '',
            role: isAdmin ? 'admin' : 'user',
          },
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `Submit failed (${res.status})`);
      }
      setToast({ msg: 'Session submitted for admin approval', type: 'success' });
    } catch (err) {
      setToast({ msg: err.message || 'Submit failed', type: 'warn' });
    }
  }, [buildRequiredBySkuShift, currentDate, assignments, session, isAdmin]);

  const approveSession = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/assignments/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: currentDate,
          actor: {
            username: session?.username ?? '',
            displayName: session?.displayName ?? '',
            role: isAdmin ? 'admin' : 'user',
          },
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `Approve failed (${res.status})`);
      }
      setToast({ msg: 'Session approved by admin', type: 'success' });
    } catch (err) {
      setToast({ msg: err.message || 'Approve failed', type: 'warn' });
    }
  }, [currentDate, session, isAdmin]);

  // KPI totals (all plants combined — schedule-driven lines)
  const totalEmp      = employees.length;
  const totalAssigned = assignedIds.size;
  const totalRequiredPerShift = allLinesCombined.reduce((s, l) => s + (lineManpowerOverrides?.[l.id] ?? lineTotalsById?.[l.id] ?? 0), 0);
  const totalRequired = totalRequiredPerShift * SHIFTS.length;
  const overallPct    = totalRequired > 0 ? Math.min(Math.round((totalAssigned / totalRequired) * 100), 100) : 0;
  const linesFullyStaffed = allLinesCombined.filter(line => {
    const req = lineManpowerOverrides?.[line.id] ?? lineTotalsById?.[line.id] ?? 0;
    return SHIFTS.every(sh => {
      const assignedForLineInShift = line.skus.reduce(
        (s, sku) => s + (getAssignedEmployees(sku.id, sh.id)?.length ?? 0),
        0,
      );
      return req === 0 || assignedForLineInShift >= req;
    });
  }).length;

  const switchPlant = (plantId) => {
    const lay = plantId === 'dressings' ? layoutDressings : layoutSavoury;
    setActivePlant(plantId);
    setActiveDept(lay.departments[0]?.id ?? '');
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
        quotaOverrides={lineManpowerOverrides}
        allLines={allLinesCombined}
        departments={analyticsDepartments}
        linesByDept={analyticsLinesByDept}
        turnstileData={{ excessEmployees, scheduledPresent, scheduledAbsent, totalIn, totalExcess }}
        onBack={() => setPage(activePlant === 'dressings' ? PAGES.DRESSINGS : PAGES.SAVOURY)}
      />
    );
  }

  if (page === PAGES.SETTINGS) {
    return (
      <SettingsPage
        lineQuotas={lineManpowerOverrides}
        onLineQuotaChange={handleLineQuotaChange}
        onResetAll={handleResetAll}
        dressingsLayout={layoutDressings}
        savouryLayout={layoutSavoury}
        lineTotalsById={lineTotalsById}
        initialPlant={activePlant}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: sessionStatus === 'approved' ? 'rgba(16,185,129,0.2)' : sessionStatus === 'submitted' ? 'rgba(245,158,11,0.18)' : 'rgba(148,163,184,0.18)' }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.58rem', color: '#fff', fontWeight: 700 }}>
                {sessionStatus.toUpperCase()}
              </span>
              {sessionStatus === 'submitted' && sessionSubmittedBy && (
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>
                  by {sessionSubmittedBy}
                </span>
              )}
              {sessionStatus === 'approved' && sessionApprovedBy && (
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>
                  by {sessionApprovedBy}
                </span>
              )}
            </div>
            {sessionStatus === 'draft' && (
              <button onClick={submitForApproval} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', background: 'rgba(14,165,233,0.18)', border: '1px solid rgba(14,165,233,0.35)', color: '#bae6fd', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: '0.72rem', fontWeight: 700 }}>
                <span>📨</span> Submit
              </button>
            )}
            {isAdmin && sessionStatus === 'submitted' && (
              <button onClick={approveSession} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.35)', color: '#bbf7d0', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: '0.72rem', fontWeight: 700 }}>
                <span>✅</span> Approve
              </button>
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
                    <span style={{ padding: '1px 5px', borderRadius: '99px', fontSize: '0.58rem', fontWeight: 700, fontFamily: "'DM Mono',monospace", background: isCur ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.07)', border: `1px solid ${isCur ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)'}`, color: isCur ? '#86efac' : 'rgba(255,255,255,0.4)' }}>{getShiftTotal(s.id)}/{totalRequiredPerShift}</span>
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
              <StatPill label="Lines Full" value={`${linesFullyStaffed}/${allLinesCombined.length}`} highlight={allLinesCombined.length > 0 && linesFullyStaffed === allLinesCombined.length} />
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
            const dRequired  = deptLines.reduce((s, l) => s + (lineManpowerOverrides?.[l.id] ?? lineTotalsById?.[l.id] ?? 0), 0) * SHIFTS.length;
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

          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {dbScheduleLoading ? (
              <div style={{
                flex: 1,
                minHeight: '260px',
                border: '1.5px solid #e2e8f0',
                borderRadius: '14px',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                fontFamily: "'DM Sans',sans-serif",
                fontSize: '0.85rem',
              }}>
                Loading schedule from database...
              </div>
            ) : !dbScheduleError && hasAvailableSchedule ? (
              <ShiftBoard
                key={activeDept}
                lines={filteredLines}
                deptId={activeDept}
                deptLabel={plantCfg.depts.find(d => d.id === activeDept)?.label ?? ''}
                deptAccentColor={plantCfg.depts.find(d => d.id === activeDept)?.color ?? (activePlant === 'dressings' ? '#0057B8' : '#b45309')}
                scheduleByLineId={scheduleByLineId}
                lineManpowerOverrides={lineManpowerOverrides}
                getAssignedEmployees={getAssignedEmployees}
                getDeptShiftTotal={getDeptShiftTotal}
                isDragging={!!dragEmpId}
                onDrop={handleDrop}
                onRemove={handleRemove}
              />
            ) : (
              <div style={{
                flex: 1,
                minHeight: '260px',
                border: '1.5px solid #e2e8f0',
                borderRadius: '14px',
                background: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '20px',
                textAlign: 'center',
              }}>
                <div style={{
                  fontFamily: "'Barlow Condensed',sans-serif",
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  letterSpacing: '0.03em',
                }}>
                  {dbScheduleError ? 'Schedule Fetch Failed' : 'No Available Schedule'}
                </div>
                <div style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: '0.6rem',
                  color: '#94a3b8',
                }}>
                  {activePlant.toUpperCase()} · {currentDate} · SHIFT {curShift}
                </div>
                {dbScheduleError && (
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.72rem', color: '#dc2626' }}>
                    {dbScheduleError}
                  </div>
                )}
              </div>
            )}
          </div>

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
