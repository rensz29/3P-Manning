import { useState, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const INITIAL_LOG = [];

// ── Upload zone ────────────────────────────────────────────────────────────────
function UploadZone({ onFile, isDragging, setIsDragging, disabled = false }) {
  const inputRef = useRef();
  const handleDrop = useCallback(e => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile, setIsDragging]);
  return (
    <div
      onDragOver={e => { if (!disabled) { e.preventDefault(); setIsDragging(true); } }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={e => { if (!disabled) handleDrop(e); }}
      onClick={() => !disabled && inputRef.current.click()}
      style={{ border: `2px dashed ${isDragging ? '#0057B8' : '#cbd5e1'}`, borderRadius: '14px', padding: '48px 24px', textAlign: 'center', cursor: disabled ? 'not-allowed' : 'pointer', background: isDragging ? '#eff6ff' : '#f8fafc', transition: 'all 0.2s', opacity: disabled ? 0.6 : 1 }}
    >
      <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} disabled={disabled} onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]); }} />
      <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📋</div>
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>Drop your schedule Excel file here</div>
      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.78rem', color: '#64748b', marginBottom: '16px' }}>
        Supports both <strong>Savoury</strong> and <strong>Dressings</strong> excel formats — auto-detected
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 20px', borderRadius: '8px', background: disabled ? '#94a3b8' : '#0057B8', color: '#fff', fontFamily: "'DM Sans',sans-serif", fontSize: '0.78rem', fontWeight: 700 }}>
        <span>📂</span> Browse File
      </div>
    </div>
  );
}

// ── Format diff explainer ──────────────────────────────────────────────────────
function FormatBadge({ format }) {
  const cfg = {
    savoury:   { label: 'Savoury format',   color: '#b45309', bg: '#fffbeb', border: '#fde68a', icon: '🧂' },
    dressings: { label: 'Dressings format', color: '#0057B8', bg: '#eff6ff', border: '#bfdbfe', icon: '🥗' },
    mixed:     { label: 'Mixed format',     color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4', icon: '🔀' },
    unknown:   { label: 'Unknown format',   color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', icon: '❓' },
  }[format] ?? { label: format, color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', icon: '📄' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '99px', background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <span style={{ fontSize: '0.8rem' }}>{cfg.icon}</span>
      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.55rem', fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
    </div>
  );
}

function filterScheduleRecords(records, search) {
  if (!search) return records;
  const q = search.toLowerCase();
  return records.filter(r =>
    r.machine.toLowerCase().includes(q) ||
    r.sku.toLowerCase().includes(q) ||
    r.description.toLowerCase().includes(q) ||
    r.section.toLowerCase().includes(q),
  );
}

// ── Schedule table ─────────────────────────────────────────────────────────────
function ScheduleTable({ records, search }) {
  const filtered = filterScheduleRecords(records, search);

  // Group by date for summary
  const dates = [...new Set(records.map(r => r.date))].sort();
  const shiftColors = {
    1: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', label: 'S1' },
    2: { bg: '#fffbeb', text: '#92400e', border: '#fde68a', label: 'S2' },
    3: { bg: '#f5f3ff', text: '#5b21b6', border: '#ddd6fe', label: 'S3' },
  };

  return (
    <div>
      {/* Date summary pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {dates.map(date => {
          const dateRecords = records.filter(r => r.date === date);
          const day = dateRecords[0]?.day_name ?? date;
          const totalQty = dateRecords.reduce((s, r) => s + r.qty, 0);
          return (
            <div key={date} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '7px 12px', textAlign: 'center', minWidth: '80px' }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1rem', fontWeight: 800, color: '#0057B8' }}>{day.slice(0, 3)}</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.48rem', color: '#94a3b8' }}>{date.slice(5)}</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.52rem', color: '#0f172a', fontWeight: 700, marginTop: '2px' }}>{totalQty.toLocaleString()} cs</div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1.5px solid #e2e8f0' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '700px' }}>
          <thead>
            <tr style={{ background: '#0f172a' }}>
              {['Section', 'Machine', 'SKU', 'Description', 'Date', 'Day', 'Shift', 'Qty (cs)'].map((h, i) => (
                <th key={i} style={{ padding: '10px 12px', textAlign: 'left', fontFamily: "'DM Mono',monospace", fontSize: '0.55rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontFamily: "'DM Sans',sans-serif", fontSize: '0.8rem' }}>No records match your search</td></tr>
            )}
            {filtered.map((r, i) => {
              const sc = shiftColors[r.shift] ?? shiftColors[1];
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.58rem', fontWeight: 700, color: r.section === 'DRESSINGS' ? '#0057B8' : '#b45309', background: r.section === 'DRESSINGS' ? '#eff6ff' : '#fffbeb', padding: '2px 7px', borderRadius: '99px', border: `1px solid ${r.section === 'DRESSINGS' ? '#bfdbfe' : '#fde68a'}` }}>{r.section}</span>
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: "'DM Sans',sans-serif", fontSize: '0.78rem', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>{r.machine}</td>
                  <td style={{ padding: '8px 12px', fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', color: '#64748b', whiteSpace: 'nowrap' }}>{r.sku}</td>
                  <td style={{ padding: '8px 12px', fontFamily: "'DM Sans',sans-serif", fontSize: '0.72rem', color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</td>
                  <td style={{ padding: '8px 12px', fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{r.date}</td>
                  <td style={{ padding: '8px 12px', fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', color: '#94a3b8' }}>{r.day_name.slice(0, 3)}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.55rem', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{sc.label}</span>
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>{r.qty.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.52rem', color: '#94a3b8', marginTop: '8px', textAlign: 'right' }}>
        Showing {filtered.length} of {records.length} records · Total: {filtered.reduce((s, r) => s + r.qty, 0).toLocaleString()} cs
      </div>
    </div>
  );
}

function CalendarPreview({ records, search }) {
  const filtered = filterScheduleRecords(records, search);
  const sortedDates = [...new Set(filtered.map(r => r.date))].sort();
  const shifts = [1, 2, 3];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {sortedDates.length === 0 && (
        <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', border: '1.5px solid #e2e8f0', borderRadius: '10px', background: '#fff' }}>
          No records match your search
        </div>
      )}

      {sortedDates.map((date) => {
        const rowsOnDate = filtered.filter(r => r.date === date);
        const dayName = rowsOnDate[0]?.day_name?.slice(0, 3) || '--';
        const totalQty = rowsOnDate.reduce((s, r) => s + (Number(r.qty) || 0), 0);

        return (
          <div key={date} style={{ border: '1.5px solid #e2e8f0', borderRadius: '12px', background: '#fff', overflow: 'hidden' }}>
            <div style={{ padding: '10px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{dayName} · {date}</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.52rem', color: '#94a3b8' }}>{rowsOnDate.length} rows</div>
              </div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.58rem', fontWeight: 700, color: '#0f172a' }}>
                Total {totalQty.toLocaleString()} cs
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0', borderTop: '0' }}>
              {shifts.map((shift) => {
                const rows = rowsOnDate.filter(r => Number(r.shift) === shift);
                const shiftQty = rows.reduce((s, r) => s + (Number(r.qty) || 0), 0);
                const shiftColor = shift === 1 ? '#1d4ed8' : shift === 2 ? '#92400e' : '#5b21b6';
                const shiftBg = shift === 1 ? '#eff6ff' : shift === 2 ? '#fffbeb' : '#f5f3ff';

                return (
                  <div key={shift} style={{ borderLeft: shift === 1 ? 'none' : '1px solid #e2e8f0', minHeight: '160px' }}>
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', background: shiftBg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.55rem', fontWeight: 700, color: shiftColor }}>
                        SHIFT {shift}
                      </span>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.52rem', color: shiftColor }}>
                        {shiftQty.toLocaleString()} cs
                      </span>
                    </div>
                    <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
                      {rows.length === 0 && (
                        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.68rem', color: '#94a3b8' }}>No plan</div>
                      )}
                      {rows.map((r, idx) => (
                        <div key={`${r.machine}-${r.sku}-${idx}`} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 8px', background: '#fff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.7rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {r.machine}
                            </span>
                            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                              {Number(r.qty || 0).toLocaleString()}
                            </span>
                          </div>
                          <div style={{ marginTop: '2px', fontFamily: "'DM Mono',monospace", fontSize: '0.5rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {r.sku} · {r.section}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main AdminPage ─────────────────────────────────────────────────────────────
export default function AdminPage({ onBack, onGoAnalytics, onGoSettings, onGoReport, displayName }) {
  const [tab, setTab]             = useState('schedule');
  const [file, setFile]           = useState(null);
  const [rawFlat, setRawFlat]     = useState(null);   // raw rows from preview
  const [schedule, setSchedule]   = useState(null);   // normalised by backend
  const [detectedFormat, setDetectedFormat] = useState('unknown');
  const [parseError, setParseError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [applyState, setApplyState] = useState('idle');
  const [auditLog, setAuditLog]   = useState(INITIAL_LOG);
  const [search, setSearch]       = useState('');
  const [previewSheet, setPreviewSheet] = useState('');
  const [previewState, setPreviewState] = useState('idle'); // idle | parsing | done
  const [previewView, setPreviewView] = useState('calendar'); // calendar | table

  // ── Handle file ──────────────────────────────────────────────────────────────
  const handleFile = useCallback(async (f) => {
    setFile(f);
    setApplyState('idle');
    setParseError(null);
    setApplyError(null);
    setPreviewState('parsing');

    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await fetch('/api/v1/upload/preview-excel', {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Failed to preview excel (${res.status})${errText ? `: ${errText}` : ''}`);
      }
      const body = await res.json();
      const data = body?.data ?? {};
      const rows = Array.isArray(data.rows) ? data.rows : [];
      if (!rows.length) throw new Error('No valid rows found in the uploaded worksheet.');

      setRawFlat(rows);
      setDetectedFormat(data.detectedFormat ?? 'unknown');
      setSchedule(rows);
      setPreviewSheet(data.sheet ?? '');
      setPreviewState('done');
    } catch (err) {
      setParseError(err.message);
      setSchedule(null);
      setRawFlat(null);
      setPreviewSheet('');
      setPreviewState('idle');
    }
  }, []);

  // ── Apply schedule ───────────────────────────────────────────────────────────
  const [applyError, setApplyError] = useState(null);

  const handleApply = async () => {
    setApplyState('applying');
    setApplyError(null);

    const payload = {
      filename:    file?.name ?? 'upload',
      uploaded_by: displayName,
      format:      detectedFormat,
      records:     schedule,   // normalised unified array
    };

    try {
      const res = await fetch('/api/v1/upload', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => `HTTP ${res.status}`);
        throw new Error(`Server responded ${res.status}: ${errText}`);
      }

      const data = await res.json();

      setApplyState('done');
      setAuditLog(prev => [{
        id:         data?.data?.id ?? prev.length + 1,
        filename:   file?.name ?? 'upload',
        uploadedAt: data?.data?.uploaded_at
          ?? new Date().toLocaleString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }).replace(',', ''),
        uploadedBy: displayName,
        rows:       data?.data?.saved_rows ?? schedule?.length ?? 0,
        status:     'Applied',
        format:     detectedFormat.charAt(0).toUpperCase() + detectedFormat.slice(1),
      }, ...prev]);

    } catch (err) {
      setApplyState('idle');
      setApplyError(err.message);
      console.error('[AdminPage] Schedule upload failed:', err);
    }
  };

  // ── Unique sections in the loaded file ──────────────────────────────────────
  const sections = schedule ? [...new Set(schedule.map(r => r.section))] : [];
  const uniqueMachines = schedule ? [...new Set(schedule.map(r => r.machine))] : [];
  const uniqueSkus = schedule ? [...new Set(schedule.map(r => r.sku))] : [];
  const invalidRows = schedule ? schedule.filter(r => !r.date || !r.machine || !r.shift || r.qty <= 0).length : 0;
  const totalQty = schedule ? schedule.reduce((s, r) => s + r.qty, 0) : 0;
  const hasWarnings = invalidRows > 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #f0f4fa; min-height: 100vh; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .admin-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.1) !important; transform: translateY(-2px) !important; }
      `}</style>

      <div style={{ fontFamily: "'DM Sans',sans-serif", minHeight: '100vh', background: '#f0f4fa' }}>

        {/* ── Header ── */}
        <header style={{ height: '62px', position: 'sticky', top: 0, zIndex: 200, background: 'linear-gradient(130deg,#0a0f2c 0%,#0d2260 50%,#0d4fa8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', boxShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', padding: '6px 12px', fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>← Back</button>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', boxShadow: '0 3px 10px rgba(245,158,11,0.4)' }}>🛡️</div>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.4rem', fontWeight: 800, color: '#fff', letterSpacing: '0.06em', lineHeight: 1 }}>ADMIN PANEL</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.49rem', color: 'rgba(255,255,255,0.32)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>3P Shift Assign · Restricted Access</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '99px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <span style={{ fontSize: '0.8rem' }}>🔑</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.62rem', color: '#fcd34d', fontWeight: 700 }}>ADMIN</span>
            </div>
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>{displayName}</div>
          </div>
        </header>

        {/* ── Quick-access cards ── */}
        <div style={{ padding: '24px 24px 0', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', maxWidth: '1200px', margin: '0 auto' }}>
          {[
            { icon: '📊', label: 'Analytics Dashboard', sub: 'Turnstile, excess trends, staffing', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', onClick: onGoAnalytics },
            { icon: '⚙️', label: 'Settings & Quotas',   sub: 'Configure manpower per line/SKU',  color: '#0057B8', bg: '#eff6ff', border: '#bfdbfe', onClick: onGoSettings },
            { icon: '🧾', label: 'Approved Report',      sub: 'Cost and assignment reporting',    color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', onClick: onGoReport },
            { icon: '📋', label: 'Schedule Upload',      sub: 'Currently viewing',                color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4', onClick: null },
          ].map(c => (
            <div key={c.label} className={c.onClick ? 'admin-card' : ''} onClick={c.onClick ?? undefined} style={{ background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: '14px', padding: '18px 20px', cursor: c.onClick ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', transition: 'box-shadow 0.2s, transform 0.2s' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: c.color + '20', border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>{c.icon}</div>
              <div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1rem', fontWeight: 700, color: c.color }}>{c.label}</div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>{c.sub}</div>
              </div>
              {c.onClick && <span style={{ marginLeft: 'auto', color: c.color, opacity: 0.5 }}>→</span>}
            </div>
          ))}
        </div>

        {/* ── Main panel ── */}
        <div style={{ padding: '20px 24px', maxWidth: '1200px', margin: '0 auto' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', background: '#fff', borderRadius: '12px 12px 0 0', border: '1.5px solid #e2e8f0', borderBottom: 'none', overflow: 'hidden' }}>
            {[
              { k: 'schedule', label: '📋 Schedule Upload' },
              { k: 'log',      label: '🕑 Upload History' },
            ].map(t => (
              <button key={t.k} onClick={() => setTab(t.k)} style={{ flex: 1, border: 'none', padding: '14px 20px', cursor: 'pointer', background: tab === t.k ? '#fff' : '#f8fafc', borderBottom: tab === t.k ? '3px solid #0057B8' : '3px solid transparent', transition: 'all 0.15s', fontFamily: "'Barlow Condensed',sans-serif", fontSize: '0.95rem', fontWeight: 700, color: tab === t.k ? '#0057B8' : '#64748b', letterSpacing: '0.03em' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Schedule tab ── */}
          {tab === 'schedule' && (
            <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 14px 14px', padding: '24px' }}>
              {(previewState === 'parsing' || applyState === 'applying') && (
                <div style={{ position: 'sticky', top: '72px', zIndex: 30, marginBottom: '14px', padding: '10px 14px', borderRadius: '10px', border: '1px solid #bfdbfe', background: 'linear-gradient(90deg,#eff6ff,#f8fafc)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '16px', height: '16px', border: '2px solid #93c5fd', borderTopColor: '#1d4ed8', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.76rem', color: '#1e3a8a', fontWeight: 700 }}>
                    {previewState === 'parsing' ? 'Uploading and parsing Excel preview...' : 'Saving schedule to database...'}
                  </span>
                </div>
              )}

              {!schedule && !parseError && (
                <>
                  <UploadZone onFile={handleFile} isDragging={isDragging} setIsDragging={setIsDragging} disabled={previewState === 'parsing' || applyState === 'applying'} />

                  {/* Format guide */}
                  <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {[
                      {
                        title: '🧂 Savoury format', color: '#b45309', bg: '#fffbeb', border: '#fde68a',
                        fields: ['section', 'machine', 'sku_code', 'description', 'variant', 'date', 'day_name', 'shift (integer)', 'qty_cs'],
                        example: '{ "section":"CUBES", "machine":"FD12A", "shift":1, "qty_cs":777 }'
                      },
                      {
                        title: '🥗 Dressings format', color: '#0057B8', bg: '#eff6ff', border: '#bfdbfe',
                        fields: ['machine', 'date', 'day_name', 'shift ("1st"|"2nd"|"3rd")', 'size', 'sku', 'qty'],
                        example: '{ "machine":"Volpak", "shift":"1st", "size":"220", "qty":644 }'
                      },
                    ].map(f => (
                      <div key={f.title} style={{ background: f.bg, border: `1.5px solid ${f.border}`, borderRadius: '12px', padding: '16px' }}>
                        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '0.95rem', fontWeight: 700, color: f.color, marginBottom: '10px' }}>{f.title}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                          {f.fields.map(field => (
                            <span key={field} style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.52rem', background: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: '4px', color: f.color }}>{field}</span>
                          ))}
                        </div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.52rem', color: '#64748b', background: 'rgba(0,0,0,0.04)', padding: '8px', borderRadius: '6px', wordBreak: 'break-all' }}>{f.example}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '12px', fontFamily: "'DM Sans',sans-serif", fontSize: '0.68rem', color: '#94a3b8', textAlign: 'center' }}>
                    Excel is parsed server-side, auto-detected, and normalised before you apply it.
                  </div>
                </>
              )}

              {/* Parse error */}
              {parseError && (
                <div style={{ padding: '20px', background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '12px', marginBottom: '16px' }}>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1rem', fontWeight: 700, color: '#dc2626', marginBottom: '6px' }}>⚠ Failed to parse file</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.65rem', color: '#9f1239' }}>{parseError}</div>
                  <button onClick={() => { setFile(null); setParseError(null); }} style={{ marginTop: '12px', padding: '6px 14px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fff', cursor: 'pointer', fontFamily: "'DM Mono',monospace", fontSize: '0.62rem', color: '#dc2626' }}>Try another file</button>
                </div>
              )}

              {/* Loaded schedule */}
              {schedule && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(120px,1fr))', gap: '10px', marginBottom: '14px' }}>
                    {[
                      { k: 'rows', label: 'Rows Parsed', value: schedule.length.toLocaleString(), color: '#0369a1', bg: '#e0f2fe' },
                      { k: 'machines', label: 'Machines', value: uniqueMachines.length, color: '#166534', bg: '#dcfce7' },
                      { k: 'skus', label: 'SKUs', value: uniqueSkus.length, color: '#7c2d12', bg: '#ffedd5' },
                      { k: 'qty', label: 'Total Qty', value: totalQty.toLocaleString(), color: '#5b21b6', bg: '#ede9fe' },
                    ].map(card => (
                      <div key={card.k} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px' }}>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.5rem', color: '#94a3b8', textTransform: 'uppercase' }}>{card.label}</div>
                        <div style={{ marginTop: '4px', display: 'inline-flex', padding: '2px 8px', borderRadius: '99px', background: card.bg, color: card.color, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: '1rem' }}>{card.value}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ padding: '10px 14px', background: hasWarnings ? '#fffbeb' : '#f0fdf4', border: `1px solid ${hasWarnings ? '#fde68a' : '#86efac'}`, borderRadius: '8px', marginBottom: '12px', fontFamily: "'DM Sans',sans-serif", fontSize: '0.68rem', color: hasWarnings ? '#92400e' : '#15803d' }}>
                    {hasWarnings
                      ? `⚠ ${invalidRows} row(s) look incomplete/invalid and should be checked before Apply.`
                      : '✓ Quick validation passed: all preview rows have date, machine, shift and qty > 0.'}
                  </div>

                  {/* File info bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1.5px solid #e2e8f0' }}>
                    <span style={{ fontSize: '1.4rem' }}>📊</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{file?.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.55rem', color: '#94a3b8' }}>{schedule.length} records · {[...new Set(schedule.map(r => r.date))].length} days · 3 shifts</span>
                        {previewSheet && (
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.5rem', fontWeight: 700, padding: '1px 7px', borderRadius: '99px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}>
                            Sheet: {previewSheet}
                          </span>
                        )}
                        <FormatBadge format={detectedFormat} />
                        {sections.map(s => (
                          <span key={s} style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.5rem', fontWeight: 700, padding: '1px 7px', borderRadius: '99px', background: s === 'DRESSINGS' ? '#eff6ff' : '#fffbeb', color: s === 'DRESSINGS' ? '#1d4ed8' : '#92400e', border: `1px solid ${s === 'DRESSINGS' ? '#bfdbfe' : '#fde68a'}` }}>{s}</span>
                        ))}
                      </div>
                    </div>

                    {applyState === 'done' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', background: '#f0fdf4', border: '1.5px solid #86efac' }}>
                        <span style={{ color: '#15803d', fontWeight: 700 }}>✓</span>
                        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', fontWeight: 700, color: '#15803d' }}>Applied</span>
                      </div>
                    ) : (
                      <button onClick={handleApply} disabled={applyState === 'applying' || previewState === 'parsing'} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 18px', borderRadius: '8px', background: 'linear-gradient(135deg,#0057B8,#0ea5e9)', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: '0.78rem', fontWeight: 700, opacity: applyState === 'applying' ? 0.7 : 1 }}>
                        {applyState === 'applying'
                          ? <><span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}/> Applying…</>
                          : '✅ Apply Schedule'}
                      </button>
                    )}

                    <button onClick={() => { setFile(null); setSchedule(null); setRawFlat(null); setApplyState('idle'); setParseError(null); setPreviewSheet(''); setPreviewState('idle'); }} style={{ background: 'none', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontFamily: "'DM Mono',monospace", fontSize: '0.62rem', color: '#94a3b8' }}>↩ Replace</button>
                  </div>

                  {/* Apply error */}
                  {applyError && (
                    <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div>
                        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '0.85rem', fontWeight: 700, color: '#dc2626' }}>⚠ Upload failed — </span>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', color: '#9f1239' }}>{applyError}</span>
                      </div>
                      <button onClick={() => setApplyError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '0.75rem', flexShrink: 0 }}>✕</button>
                    </div>
                  )}

                  {/* Normalisation note */}
                  <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', marginBottom: '16px', fontFamily: "'DM Sans',sans-serif", fontSize: '0.68rem', color: '#15803d' }}>
                    ✓ Both formats normalised to unified schema — <strong>section · machine · sku · description · date · day · shift · qty</strong>
                  </div>

                  {/* Search */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff', maxWidth: '340px', flex: '1 1 320px' }}>
                      <span style={{ opacity: 0.4 }}>🔍</span>
                      <input type="text" placeholder="Filter by machine, SKU, section…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', fontFamily: "'DM Sans',sans-serif", fontSize: '0.75rem', color: '#0f172a', background: 'transparent' }} />
                      {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>✕</button>}
                    </div>

                    <div style={{ display: 'inline-flex', border: '1.5px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
                      <button
                        onClick={() => setPreviewView('calendar')}
                        style={{
                          border: 'none',
                          padding: '7px 12px',
                          cursor: 'pointer',
                          background: previewView === 'calendar' ? '#eff6ff' : '#fff',
                          color: previewView === 'calendar' ? '#1d4ed8' : '#64748b',
                          fontFamily: "'DM Mono',monospace",
                          fontSize: '0.62rem',
                          fontWeight: 700,
                        }}
                      >
                        Calendar View
                      </button>
                      <button
                        onClick={() => setPreviewView('table')}
                        style={{
                          border: 'none',
                          borderLeft: '1px solid #e2e8f0',
                          padding: '7px 12px',
                          cursor: 'pointer',
                          background: previewView === 'table' ? '#eff6ff' : '#fff',
                          color: previewView === 'table' ? '#1d4ed8' : '#64748b',
                          fontFamily: "'DM Mono',monospace",
                          fontSize: '0.62rem',
                          fontWeight: 700,
                        }}
                      >
                        Table View
                      </button>
                    </div>
                  </div>

                  {previewView === 'calendar' ? (
                    <CalendarPreview records={schedule} search={search} />
                  ) : (
                    <ScheduleTable records={schedule} search={search} />
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Log tab ── */}
          {tab === 'log' && (
            <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 14px 14px', padding: '24px' }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1rem', fontWeight: 700, color: '#0f172a', letterSpacing: '0.04em', marginBottom: '16px', textTransform: 'uppercase' }}>Upload History</div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 60px 90px 100px', gap: '8px', padding: '8px 14px', fontFamily: "'DM Mono',monospace", fontSize: '0.52rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1.5px solid #f1f5f9' }}>
                <span>Filename</span><span>Uploaded At</span><span>By</span><span>Rows</span><span>Format</span><span style={{ textAlign: 'center' }}>Status</span>
              </div>
              {auditLog.map((entry, i) => (
                <div key={entry.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 60px 90px 100px', gap: '8px', padding: '11px 14px', background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f8fafc', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1rem' }}>📊</span>
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>{entry.filename}</span>
                  </div>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', color: '#64748b' }}>{entry.uploadedAt}</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', color: '#64748b' }}>{entry.uploadedBy}</span>
                  <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1rem', fontWeight: 800, color: '#0057B8' }}>{entry.rows}</span>
                  <FormatBadge format={entry.format?.toLowerCase() ?? 'unknown'} />
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.52rem', fontWeight: 700, padding: '2px 10px', borderRadius: '99px', background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac' }}>{entry.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer style={{ textAlign: 'center', padding: '16px 0 24px', fontFamily: "'DM Mono',monospace", fontSize: '0.5rem', color: '#cbd5e1', letterSpacing: '0.12em' }}>
          3P SHIFT ASSIGN · ADMIN PANEL · UNILEVER INDUSTRIAL PLATFORM · {new Date().getFullYear()}
        </footer>
      </div>
    </>
  );
}