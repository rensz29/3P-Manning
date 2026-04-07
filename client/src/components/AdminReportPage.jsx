import { useEffect, useMemo, useState } from 'react';

const toYMD = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

function money(n) {
  return Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminReportPage({ onBack }) {
  const [date, setDate] = useState(toYMD());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);
  const [query, setQuery] = useState('');

  const loadReport = async (d) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/v1/assignments/report?date=${encodeURIComponent(d)}`);
      if (!res.ok) throw new Error(`No approved report found (${res.status})`);
      const body = await res.json();
      setReport(body?.data ?? null);
    } catch (e) {
      setReport(null);
      setError(e.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(date);
  }, [date]);

  const details = useMemo(() => {
    const rows = report?.assignmentDetails ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      String(r.employeeName ?? '').toLowerCase().includes(q) ||
      String(r.role ?? '').toLowerCase().includes(q) ||
      String(r.assignmentLocation?.machine ?? '').toLowerCase().includes(q) ||
      String(r.assignmentLocation?.sku ?? '').toLowerCase().includes(q)
    );
  }, [report, query]);

  const excessByShift = useMemo(() => {
    const base = [
      { shiftId: 1, label: 'Shift 1', timeRange: '06:00-14:00', excessCount: 0 },
      { shiftId: 2, label: 'Shift 2', timeRange: '14:00-22:00', excessCount: 0 },
      { shiftId: 3, label: 'Shift 3', timeRange: '22:00-06:00', excessCount: 0 },
    ];
    const rows = report?.summary?.excessByShift;
    if (!Array.isArray(rows) || rows.length === 0) return base;
    const map = new Map(rows.map((r) => [Number(r.shiftId), r]));
    return base.map((b) => ({ ...b, ...(map.get(b.shiftId) ?? {}) }));
  }, [report]);

  const excessEmployees = report?.excessEmployees ?? [];

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", minHeight: '100vh', background: '#f0f4fa', padding: '0 0 20px' }}>
      <div style={{ background: 'linear-gradient(130deg, #0a0f2c 0%, #0d2260 50%, #0d4fa8 100%)', padding: '14px 20px', boxShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>
        <div style={{ maxWidth: '1260px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={onBack} style={{ border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer' }}>← Back</button>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.6rem', fontWeight: 800, color: '#fff', letterSpacing: '0.04em' }}>APPROVED COST REPORT</div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ marginLeft: 'auto', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '7px 10px', background: 'rgba(255,255,255,0.95)' }} />
        </div>
      </div>
      <div style={{ padding: '16px 20px' }}>
      <div style={{ maxWidth: '1260px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {!loading && error && (
          <div style={{ padding: '14px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}>{error}</div>
        )}

        {loading && <div style={{ padding: '14px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8' }}>Loading approved report...</div>}

        {report && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
              {[
                { k: 'assigned', label: 'Assigned', value: report.summary?.totalAssigned ?? 0 },
                { k: 'required', label: 'Required', value: report.summary?.totalRequired ?? 0 },
                { k: 'fill', label: 'Fill Rate', value: `${report.summary?.fillRatePct ?? 0}%` },
                { k: 'daily', label: 'Daily Cost', value: `PHP ${money(report.summary?.totalEstimatedDailyCost)}` },
              ].map((c) => (
                <div key={c.k} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.55rem', color: '#94a3b8', textTransform: 'uppercase' }}>{c.label}</div>
                  <div style={{ marginTop: '4px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{c.value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, marginBottom: '8px', color: '#0f172a' }}>Per Shift Cost</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                {(report.summary?.perShift ?? []).map((s) => (
                  <div key={s.shiftId} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', background: '#f8fafc' }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.58rem', color: '#64748b' }}>{s.label} · {s.timeRange}</div>
                    <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#334155' }}>{s.assignedHeadcount} people</div>
                    <div style={{ fontSize: '0.78rem', color: '#334155' }}>PHP {money(s.totalCostPerHour)}/hr</div>
                    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>PHP {money(s.totalShiftCost)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, marginBottom: '8px', color: '#0f172a' }}>Excess Employees by Shift</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                {excessByShift.map((s) => (
                  <div key={`ex-${s.shiftId}`} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', background: s.excessCount > 0 ? '#fffbeb' : '#f8fafc' }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.58rem', color: '#64748b' }}>{s.label} · {s.timeRange}</div>
                    <div style={{ marginTop: '4px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.4rem', fontWeight: 800, color: s.excessCount > 0 ? '#b45309' : '#0f172a' }}>
                      {s.excessCount}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>unscheduled on-site</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '8px', fontFamily: "'DM Mono',monospace", fontSize: '0.56rem', color: '#64748b' }}>
                Total excess captured: <strong style={{ color: '#0f172a' }}>{report.summary?.totalExcess ?? 0}</strong>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, marginBottom: '8px', color: '#0f172a' }}>Excess Employee Details</div>
              {excessEmployees.length === 0 ? (
                <div style={{ padding: '12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.76rem' }}>
                  No excess employee list was captured for this approval snapshot.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '760px' }}>
                    <thead>
                      <tr style={{ background: '#0f172a' }}>
                        {['Employee', 'Badge', 'Entry Time', 'Status'].map((h) => (
                          <th key={h} style={{ padding: '9px 10px', textAlign: 'left', color: 'rgba(255,255,255,0.7)', fontFamily: "'DM Mono',monospace", fontSize: '0.54rem' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {excessEmployees.map((e, i) => (
                        <tr key={`${e.id ?? e.badgeNo ?? i}`} style={{ background: i % 2 ? '#f8fafc' : '#fff', borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 10px', fontSize: '0.75rem', fontWeight: 600 }}>{e.name ?? e.employeeName ?? e.id ?? '-'}</td>
                          <td style={{ padding: '8px 10px', fontFamily: "'DM Mono',monospace", fontSize: '0.62rem' }}>{e.badgeNo ?? '-'}</td>
                          <td style={{ padding: '8px 10px', fontFamily: "'DM Mono',monospace", fontSize: '0.62rem' }}>{e.entryTime ?? '-'}</td>
                          <td style={{ padding: '8px 10px', fontFamily: "'DM Mono',monospace", fontSize: '0.62rem' }}>{Number(e.status) === 1 ? 'IN' : 'OUT'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, color: '#0f172a' }}>Assignment Details</div>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search employee, role, machine, sku..." style={{ marginLeft: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px', minWidth: '320px' }} />
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '1100px' }}>
                  <thead>
                    <tr style={{ background: '#0f172a' }}>
                      {['Shift', 'Employee', 'Role', 'Site/Area', 'Location', 'Rate/hr', 'Shift Cost'].map((h) => (
                        <th key={h} style={{ padding: '9px 10px', textAlign: 'left', color: 'rgba(255,255,255,0.7)', fontFamily: "'DM Mono',monospace", fontSize: '0.54rem' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {details.map((r, i) => (
                      <tr key={`${r.employeeId}-${i}`} style={{ background: i % 2 ? '#f8fafc' : '#fff', borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', fontFamily: "'DM Mono',monospace", fontSize: '0.56rem' }}>{r.shiftLabel} ({r.shiftTimeRange})</td>
                        <td style={{ padding: '8px 10px', fontSize: '0.75rem', fontWeight: 600 }}>{r.employeeName}</td>
                        <td style={{ padding: '8px 10px', fontSize: '0.72rem' }}>{r.role}</td>
                        <td style={{ padding: '8px 10px', fontSize: '0.72rem' }}>{r.site} / {r.area}</td>
                        <td style={{ padding: '8px 10px', fontSize: '0.72rem' }}>{r.assignmentLocation?.machine} · {r.assignmentLocation?.sku}</td>
                        <td style={{ padding: '8px 10px', fontFamily: "'DM Mono',monospace", fontSize: '0.62rem' }}>PHP {money(r.hourlyRate)}</td>
                        <td style={{ padding: '8px 10px', fontFamily: "'DM Mono',monospace", fontSize: '0.62rem' }}>PHP {money(r.shiftCost)}</td>
                      </tr>
                    ))}
                    {details.length === 0 && (
                      <tr><td colSpan={7} style={{ padding: '18px', textAlign: 'center', color: '#94a3b8' }}>No rows matched your search.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}

