import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import { SHIFTS } from '../data/lineData';
import { EXCESS_HISTORY } from '../hooks/useTurnstile';

const SHIFT_COLOR = { 1: '#38bdf8', 2: '#f59e0b', 3: '#a78bfa' };

function buildAnalytics(assignments, { allLines, departments, linesByDept, quotaOverrides = {} }) {
  // quotaOverrides is now line-level (keyed by line.id) — not SKU-level.
  // If a line doesn't exist in the map yet, we fall back to a neutral default.
  const qLine = (line) => {
    if (!line) return 0;
    const override = quotaOverrides?.[line.id];
    if (override != null) return Number(override);
    // Fallback: sum of SKU "weights" (with current schedule-driven setup, this is typically number of SKUs).
    return line.skus?.reduce((s, sk) => s + (Number(sk.quota) || 0), 0) ?? 0;
  };

  const deptCapacity = departments.map(dept => {
    const lines    = linesByDept[dept.id] ?? [];
    const quota    = lines.reduce((s, l) => s + qLine(l), 0);
    const total    = quota * SHIFTS.length;
    const assigned = lines.reduce((s, l) =>
      s + l.skus.reduce((s2, sk) =>
        s2 + SHIFTS.reduce((s3, sh) =>
          s3 + (assignments[sk.id]?.[sh.id]?.length ?? 0), 0), 0), 0);
    const pct = total > 0 ? Math.round((assigned / total) * 100) : 0;
    return { dept: dept.label, icon: dept.icon, color: dept.color, assigned, total, quota, pct };
  });

  const shiftStaffing = SHIFTS.map(sh => {
    const req      = allLines.reduce((s, l) => s + qLine(l), 0);
    const assigned = allLines.reduce((s, l) =>
      s + l.skus.reduce((s2, sk) => s2 + (assignments[sk.id]?.[sh.id]?.length ?? 0), 0), 0);
    return { shift: sh.fullLabel, icon: sh.icon, color: SHIFT_COLOR[sh.id], assigned, req, gap: Math.max(0, req - assigned) };
  });

  const deptColorById = Object.fromEntries(departments.map(d => [d.id, d.color]));

  const lineGaps = allLines.map(line => {
    const req      = qLine(line);
    const assigned = line.skus.reduce((s, sk) =>
      s + SHIFTS.reduce((s2, sh) => s2 + (assignments[sk.id]?.[sh.id]?.length ?? 0), 0), 0);
    const total = req * SHIFTS.length;
    const pct   = total > 0 ? Math.round((assigned / total) * 100) : 100;
    const deptId = line.dept ?? '';
    return {
      id: line.id,
      label: line.label,
      dept: deptId,
      color: deptColorById[deptId] ?? '#64748b',
      req,
      assigned,
      total,
      pct,
    };
  }).sort((a, b) => a.pct - b.pct);

  const skuByDept = departments.map(dept => {
    const lines = linesByDept[dept.id] ?? [];
    const quota = lines.reduce((s, l) => s + qLine(l), 0);
    return { name: dept.label, value: quota, color: dept.color };
  });

  const radar = SHIFTS.map(sh => {
    const obj = { shift: sh.label };
    departments.forEach(dept => {
      const lines = linesByDept[dept.id] ?? [];
      const req   = lines.reduce((s, l) => s + qLine(l), 0);
      const asgn  = lines.reduce((s, l) =>
        s + l.skus.reduce((s2, sk) => s2 + (assignments[sk.id]?.[sh.id]?.length ?? 0), 0), 0);
      obj[dept.label] = req > 0 ? Math.round((asgn / req) * 100) : 0;
    });
    return obj;
  });

  const currentShift = (() => {
    const h = new Date().getHours();
    if (h >= 6 && h < 14) return 1;
    if (h >= 14 && h < 22) return 2;
    return 3;
  })();

  return { deptCapacity, shiftStaffing, lineGaps, skuByDept, radar, currentShift };
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon, delay = 0, alert = false }) {
  return (
    <div style={{
      background: alert ? '#451a03' : '#fff',
      border: `1.5px solid ${alert ? '#92400e' : '#e8edf5'}`,
      borderRadius: '16px', padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: '6px',
      position: 'relative', overflow: 'hidden',
      animation: `fadeUp 0.45s ${delay}s both cubic-bezier(0.22,1,0.36,1)`,
      boxShadow: alert ? '0 4px 20px rgba(217,119,6,0.25)' : '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: `linear-gradient(90deg, ${color}, ${color}88)`,
        borderRadius: '16px 16px 0 0',
      }}/>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.52rem', color: alert ? '#fcd34d' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
        <span style={{ fontSize: '1.1rem', background: color + '22', borderRadius: '8px', padding: '4px 6px', lineHeight: 1 }}>{icon}</span>
      </div>
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '2.2rem', fontWeight: 800, lineHeight: 1, color: alert ? '#fbbf24' : '#0f172a' }}>{value}</div>
      {sub && <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.68rem', color: alert ? '#fcd34d99' : '#64748b' }}>{sub}</div>}
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: '#fff', border: '1.5px solid #e8edf5',
      borderRadius: '16px', padding: '20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      ...style,
    }}>{children}</div>
  );
}

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <h2 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>{children}</h2>
      {sub && <p style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.52rem', color: '#94a3b8', marginTop: '2px', letterSpacing: '0.06em' }}>{sub}</p>}
    </div>
  );
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0f172a', borderRadius: '10px', padding: '10px 14px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', color: '#94a3b8', marginBottom: '6px' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color || p.fill }}/>
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.7rem', color: '#e2e8f0' }}>
            {p.name}: <strong style={{ color: '#fff' }}>{p.value}</strong>
          </span>
        </div>
      ))}
    </div>
  );
}

const RADIAN = Math.PI / 180;
function DonutLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.08) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central"
      style={{ fontFamily: "'DM Mono',monospace", fontSize: '11px', fontWeight: 700 }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ── Excess Employee Table ─────────────────────────────────────────────────────
function ExcessTable({ excessEmployees }) {
  if (!excessEmployees?.length) return (
    <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontFamily: "'DM Sans',sans-serif", fontSize: '0.8rem' }}>
      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
      No excess employees detected for this shift
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 100px 80px 100px',
        gap: '8px', padding: '6px 12px',
        fontFamily: "'DM Mono',monospace", fontSize: '0.5rem',
        color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em',
        borderBottom: '1.5px solid #f1f5f9',
      }}>
        <span>Employee</span><span>Badge No</span><span style={{ textAlign: 'center' }}>Entry Time</span><span style={{ textAlign: 'center' }}>Status</span>
      </div>
      {excessEmployees.map((emp, i) => (
        <div key={emp.id} style={{
          display: 'grid', gridTemplateColumns: '1fr 100px 80px 100px',
          gap: '8px', padding: '10px 12px',
          background: i % 2 === 0 ? '#fffbeb' : '#fff',
          borderBottom: '1px solid #fef9c3',
          alignItems: 'center',
          animation: `fadeUp 0.3s ${i * 0.05}s both`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'DM Sans',sans-serif", fontSize: '0.6rem', fontWeight: 800,
              color: '#fff', flexShrink: 0,
            }}>
              {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>{emp.name}</span>
          </div>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', color: '#64748b' }}>{emp.badgeNo}</span>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', color: '#0f172a', textAlign: 'center', fontWeight: 700 }}>
            {emp.entryTime ?? '—'}
          </span>
          <div style={{ textAlign: 'center' }}>
            <span style={{
              fontFamily: "'DM Mono',monospace", fontSize: '0.5rem', fontWeight: 700,
              color: '#92400e', background: '#fef3c7',
              padding: '2px 8px', borderRadius: '99px',
              border: '1px solid #fde68a',
            }}>UNSCHEDULED</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AnalyticsDashboard({
  onBack,
  assignments: extAssignments,
  quotaOverrides = {},
  allLines = [],
  departments = [],
  linesByDept = {},
  turnstileData,
}) {
  const assignments = extAssignments ?? {};
  const [clock, setClock]     = useState(new Date());
  const [filterDept, setFilterDept] = useState('all');

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const { deptCapacity, shiftStaffing, lineGaps, skuByDept, radar, currentShift }
    = useMemo(
      () => buildAnalytics(assignments, { allLines, departments, linesByDept, quotaOverrides }),
      [assignments, allLines, departments, linesByDept, quotaOverrides],
    );

  // Turnstile data (passed from ShiftAssignment or use defaults)
  const {
    presentEmployees = [],
    excessEmployees  = [],
    scheduledPresent = [],
    scheduledAbsent  = [],
    totalIn          = 0,
    totalExcess      = 0,
  } = turnstileData ?? {};

  const qLine = (line) => {
    const override = quotaOverrides?.[line.id];
    if (override != null) return Number(override);
    return line.skus?.reduce((s, sk) => s + (Number(sk.quota) || 0), 0) ?? 0;
  };
  // KPI summary
  const totalRequired = allLines.reduce((s, l) => s + qLine(l), 0);
  const totalAssigned = allLines.reduce((s, l) =>
    s + l.skus.reduce((s2, sk) =>
      s2 + SHIFTS.reduce((s3, sh) => s3 + (assignments[sk.id]?.[sh.id]?.length ?? 0), 0), 0), 0);
  const totalSlots    = totalRequired * SHIFTS.length;
  const overallPct    = totalSlots > 0 ? Math.round((totalAssigned / totalSlots) * 100) : 0;
  const fullyStaffed  = allLines.filter(line =>
    SHIFTS.every(sh => {
      const assignedForLineInShift = line.skus.reduce(
        (s, sk) => s + (assignments[sk.id]?.[sh.id]?.length ?? 0),
        0,
      );
      return assignedForLineInShift >= qLine(line);
    })
  ).length;
  const criticalLines = lineGaps.filter(l => l.pct < 50).length;

  const visibleGaps = filterDept === 'all' ? lineGaps : lineGaps.filter(l => l.dept === filterDept);

  // Excess history data for chart
  const excessChartData = EXCESS_HISTORY.map(d => ({
    ...d,
    total: d.shift1 + d.shift2 + d.shift3,
  }));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #f0f4fa; min-height: 100vh; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
        @keyframes fadeUp    { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes livepulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(1.6)} }
        .line-row:hover { background: #f8fafc !important; }
      `}</style>

      <div style={{ fontFamily: "'DM Sans',sans-serif", minHeight: '100vh', background: '#f0f4fa' }}>

        {/* ── Header ── */}
        <header style={{
          height: '62px', position: 'sticky', top: 0, zIndex: 200,
          background: 'linear-gradient(130deg, #0a0f2c 0%, #0d2260 50%, #0d4fa8 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px',
          boxShadow: '0 2px 20px rgba(0,0,0,0.3)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {onBack && (
              <button onClick={onBack} style={{
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px', color: '#fff', padding: '6px 12px',
                fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
              }}>← Back</button>
            )}
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', boxShadow: '0 3px 10px rgba(245,158,11,0.4)',
            }}>📊</div>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.4rem', fontWeight: 800, color: '#fff', letterSpacing: '0.06em', lineHeight: 1 }}>
                ANALYTICS DASHBOARD
              </div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.49rem', color: 'rgba(255,255,255,0.32)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                Unilever · HRTA · Shift Intelligence & Excess Monitoring
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {totalExcess > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '5px 12px', borderRadius: '99px',
                background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
              }}>
                <span>🚨</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.62rem', color: '#fca5a5', fontWeight: 700 }}>
                  {totalExcess} UNSCHEDULED ON-SITE
                </span>
              </div>
            )}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', animation: 'livepulse 1.8s ease infinite', display: 'inline-block' }}/>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)' }}>{clock.toLocaleTimeString('en-GB')}</span>
            </div>
          </div>
        </header>

        <main style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Date */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.02em' }}>
                {clock.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.55rem', color: '#94a3b8', marginTop: '2px' }}>
                REAL-TIME WORKFORCE ANALYTICS · TURNSTILE EXCESS MONITORING
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '99px',
              background: '#dcfce7', border: '1px solid #86efac',
            }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e', animation: 'livepulse 1.8s ease infinite' }}/>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.55rem', fontWeight: 700, color: '#15803d' }}>LIVE DATA</span>
            </div>
          </div>

          {/* ── Section A: Turnstile / Excess KPIs ── */}
          <div>
            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>🚨</span>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1rem', fontWeight: 800, color: '#92400e', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Turnstile & Excess Monitoring
              </div>
              <div style={{ flex: 1, height: '1px', background: '#fde68a' }}/>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
              <KpiCard label="Turnstile IN"     value={totalIn}             sub="Physically on-site now"           color="#38bdf8" icon="🚪" delay={0} />
              <KpiCard label="Scheduled In"     value={scheduledPresent.length} sub="Present & on the plan"        color="#22c55e" icon="✅" delay={0.05} />
              <KpiCard label="Excess On-Site"   value={totalExcess}         sub="Not on schedule — flag review"    color="#f59e0b" icon="⚠️" delay={0.1}  alert={totalExcess > 0} />
              <KpiCard label="Scheduled Absent" value={scheduledAbsent.length}  sub="On plan but not yet in"       color="#ef4444" icon="❌" delay={0.15} />
              <KpiCard label="Excess Rate"      value={totalIn > 0 ? `${Math.round((totalExcess / totalIn) * 100)}%` : '0%'} sub="Excess / Total present" color="#a78bfa" icon="📐" delay={0.2} />
            </div>
          </div>

          {/* ── Excess employees table ── */}
          {(excessEmployees.length > 0 || true) && (
            <Card style={{ border: '1.5px solid #fde68a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <span style={{ fontSize: '1.2rem' }}>🚨</span>
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.1rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Excess Employee Log — {SHIFTS.find(s => s.id === currentShift)?.fullLabel}
                  </div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.52rem', color: '#94a3b8' }}>
                    Employees who entered via turnstile but are not scheduled for this shift · Flagged for manager review
                  </div>
                </div>
                {excessEmployees.length > 0 && (
                  <div style={{
                    marginLeft: 'auto', padding: '4px 14px', borderRadius: '99px',
                    background: '#fef3c7', border: '1.5px solid #fde68a',
                    fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1rem',
                    fontWeight: 800, color: '#92400e',
                  }}>
                    {excessEmployees.length} flagged
                  </div>
                )}
              </div>
              <ExcessTable excessEmployees={excessEmployees} />
            </Card>
          )}

          {/* ── 7-day Excess History Chart ── */}
          <Card>
            <SectionTitle sub="Number of unscheduled employees detected per shift over the past 7 days">7-Day Excess Trend by Shift</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={excessChartData} barGap={3} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                <XAxis dataKey="day" tick={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontFamily: "'DM Mono',monospace", fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTip/>}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontFamily: "'DM Mono',monospace", fontSize: '0.6rem' }}/>
                <Bar dataKey="shift1" name="Shift 1" fill={SHIFT_COLOR[1]} radius={[4,4,0,0]}/>
                <Bar dataKey="shift2" name="Shift 2" fill={SHIFT_COLOR[2]} radius={[4,4,0,0]}/>
                <Bar dataKey="shift3" name="Shift 3" fill={SHIFT_COLOR[3]} radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* ── Section B: Staffing KPIs ── */}
          <div>
            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>📋</span>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Staffing & Assignment
              </div>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}/>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
              <KpiCard label="Overall Fill Rate"    value={`${overallPct}%`}                                    sub={`${totalAssigned} of ${totalSlots} slots filled`} color="#0057B8" icon="📈" delay={0} />
              <KpiCard label="Lines Fully Staffed"  value={`${fullyStaffed}/${allLines.length || 0}`}               sub={`${Math.max(0, allLines.length - fullyStaffed)} lines still need staff`}     color="#22c55e" icon="✅" delay={0.06} />
              <KpiCard label="Critical Lines"       value={criticalLines}                                       sub="Lines below 50% staffing"                                         color="#ef4444" icon="⚠️" delay={0.12} />
              <KpiCard label="Total Manpower Req"   value={totalRequired}                                       sub={`per shift · ${totalRequired * 3} across all 3 shifts`}           color="#f59e0b" icon="👷" delay={0.18} />
            </div>
          </div>

          {/* ── Dept capacity + shift staffing ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Card>
              <SectionTitle sub="Staffing progress across all shifts combined">Department Capacity</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {deptCapacity.map((d, i) => (
                  <div key={d.dept} style={{ animation: `fadeUp 0.4s ${0.1 + i * 0.08}s both` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.1rem' }}>{d.icon}</span>
                        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1rem', fontWeight: 700, color: '#0f172a', letterSpacing: '0.02em' }}>{d.dept}</span>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.5rem', fontWeight: 700, color: d.color, background: d.color + '15', padding: '1px 6px', borderRadius: '99px', border: `1px solid ${d.color}30` }}>{d.quota} req/shift</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.4rem', fontWeight: 800, color: d.pct >= 80 ? '#16a34a' : d.pct >= 50 ? '#d97706' : '#dc2626' }}>{d.pct}%</span>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.52rem', color: '#94a3b8', marginLeft: '4px' }}>{d.assigned}/{d.total}</span>
                      </div>
                    </div>
                    <div style={{ height: '8px', borderRadius: '99px', background: '#f1f5f9', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '99px', width: `${d.pct}%`,
                        background: d.pct >= 80 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : d.pct >= 50 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : 'linear-gradient(90deg,#f87171,#dc2626)',
                        transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)',
                      }}/>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <SectionTitle sub="Assigned vs gap per shift (all departments)">Shift Staffing Overview</SectionTitle>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={shiftStaffing} barGap={4} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                  <XAxis dataKey="shift" tick={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontFamily: "'DM Mono',monospace", fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}/>
                  <Tooltip content={<ChartTip/>}/>
                  <Bar dataKey="assigned" name="Assigned" radius={[6,6,0,0]}>
                    {shiftStaffing.map((_, i) => <Cell key={i} fill={SHIFT_COLOR[i + 1]}/>)}
                  </Bar>
                  <Bar dataKey="gap" name="Gap" radius={[6,6,0,0]} fill="#fee2e2"/>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: '14px', marginTop: '10px', justifyContent: 'center' }}>
                {shiftStaffing.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: SHIFT_COLOR[i + 1] }}/>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.55rem', color: '#64748b' }}>{s.shift}: {s.assigned}/{s.req}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* ── Donut + Radar ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Card>
              <SectionTitle sub="Manpower quota distribution by department (per shift)">Quota Allocation</SectionTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={skuByDept} cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={3} dataKey="value" labelLine={false} label={<DonutLabel/>}>
                      {skuByDept.map((entry, i) => <Cell key={i} fill={entry.color}/>)}
                    </Pie>
                    <Tooltip content={<ChartTip/>}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {skuByDept.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: d.color, flexShrink: 0 }}/>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>{d.name}</div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.52rem', color: '#94a3b8' }}>{d.value} heads/shift</div>
                      </div>
                      <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.2rem', fontWeight: 800, color: d.color }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <SectionTitle sub="% coverage of each department across all 3 shifts">Department × Shift Coverage</SectionTitle>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radar} cx="50%" cy="50%" outerRadius={75}>
                  <PolarGrid stroke="#e2e8f0"/>
                  <PolarAngleAxis dataKey="shift" tick={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fill: '#64748b' }}/>
                  {departments.map(dept => (
                    <Radar key={dept.id} name={dept.label} dataKey={dept.label}
                      stroke={dept.color} fill={dept.color} fillOpacity={0.12} strokeWidth={2}/>
                  ))}
                  <Tooltip content={<ChartTip/>}/>
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', paddingTop: '8px' }}/>
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* ── Line gaps table ── */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <SectionTitle sub="Staffing fill rate per production line across all shifts">Line-Level Staffing Status</SectionTitle>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['all', ...departments.map(d => d.id)].map(id => {
                  const dept = departments.find(d => d.id === id);
                  const isActive = filterDept === id;
                  return (
                    <button key={id} onClick={() => setFilterDept(id)} style={{
                      padding: '4px 12px', borderRadius: '99px',
                      border: `1.5px solid ${isActive ? (dept?.color ?? '#0f172a') : '#e2e8f0'}`,
                      background: isActive ? (dept?.color ?? '#0f172a') : '#fff',
                      color: isActive ? '#fff' : '#64748b',
                      fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', fontWeight: 600, cursor: 'pointer',
                    }}>{id === 'all' ? 'All' : dept?.label}</button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 140px 60px', gap: '8px', padding: '6px 12px', fontFamily: "'DM Mono',monospace", fontSize: '0.52rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1.5px solid #f1f5f9' }}>
              <span>Line</span><span style={{ textAlign: 'center' }}>Fill Rate</span><span>Progress</span><span style={{ textAlign: 'right' }}>Slots</span>
            </div>
            {visibleGaps.map((l, i) => {
              const statusColor = l.pct >= 80 ? '#16a34a' : l.pct >= 50 ? '#d97706' : '#dc2626';
              return (
                <div key={l.id} className="line-row" style={{
                  display: 'grid', gridTemplateColumns: '1fr 80px 140px 60px', gap: '8px',
                  padding: '9px 12px', borderBottom: '1px solid #f8fafc',
                  background: i % 2 === 0 ? '#fff' : '#fafbfc', alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color, flexShrink: 0 }}/>
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>{l.label}</span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.46rem', color: l.color, background: l.color + '12', padding: '1px 5px', borderRadius: '99px', border: `1px solid ${l.color}25` }}>
                      {departments.find(d => d.id === l.dept)?.label}
                    </span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.1rem', fontWeight: 800, color: statusColor, background: l.pct >= 80 ? '#f0fdf4' : l.pct >= 50 ? '#fffbeb' : '#fef2f2', padding: '2px 8px', borderRadius: '6px' }}>{l.pct}%</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '99px', background: '#f1f5f9', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '99px', width: `${l.pct}%`, background: l.pct >= 80 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : l.pct >= 50 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : 'linear-gradient(90deg,#f87171,#dc2626)', transition: 'width 0.5s ease' }}/>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', fontWeight: 600, color: statusColor }}>
                    {l.assigned}<span style={{ color: '#94a3b8', fontWeight: 400 }}>/{l.total}</span>
                  </div>
                </div>
              );
            })}
          </Card>

          <div style={{ textAlign: 'center', padding: '8px 0 20px', fontFamily: "'DM Mono',monospace", fontSize: '0.5rem', color: '#cbd5e1', letterSpacing: '0.12em' }}>
            3P SHIFT ASSIGN · ANALYTICS MODULE · UNILEVER INDUSTRIAL PLATFORM · {new Date().getFullYear()}
          </div>
        </main>
      </div>
    </>
  );
}
