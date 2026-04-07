import { useState, useMemo } from 'react';

function getLinesForPlantDept(activePlant, deptId, dressingsLayout, savouryLayout) {
  const lay = activePlant === 'dressings' ? dressingsLayout : savouryLayout;
  return lay?.linesByDept?.[deptId] ?? [];
}

// ── Small number input ─────────────────────────────────────────────────────────
function QuotaInput({ value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        style={{
          width: '22px', height: '22px', borderRadius: '6px',
          border: '1.5px solid #e2e8f0', background: '#f8fafc',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '0.9rem', color: '#64748b',
          lineHeight: 1, padding: 0,
          transition: 'border-color 0.14s',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#94a3b8'}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
      >−</button>

      <input
        type="number" min={0} max={999} value={value}
        onChange={e => onChange(Math.max(0, Math.min(999, Number(e.target.value) || 0)))}
        style={{
          width: '44px', height: '28px', textAlign: 'center',
          border: '1.5px solid #e2e8f0', borderRadius: '8px',
          fontFamily: "'DM Mono',monospace", fontSize: '0.78rem', fontWeight: 700,
          color: value === 0 ? '#94a3b8' : '#0f172a',
          background: value === 0 ? '#f8fafc' : '#fff',
          outline: 'none', padding: '0 4px',
          transition: 'border-color 0.14s',
        }}
        onFocus={e => e.currentTarget.style.borderColor = '#0057B8'}
        onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
      />

      <button
        onClick={() => onChange(Math.min(999, value + 1))}
        style={{
          width: '22px', height: '22px', borderRadius: '6px',
          border: '1.5px solid #e2e8f0', background: '#f8fafc',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '0.9rem', color: '#64748b',
          lineHeight: 1, padding: 0,
          transition: 'border-color 0.14s',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#94a3b8'}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
      >+</button>
    </div>
  );
}

// ── Line section (collapsible) ─────────────────────────────────────────────────
function LineSection({ line, deptColor, lineQuota, defaultQuota, onLineQuotaChange }) {
  const [open, setOpen] = useState(true);
  const current = lineQuota ?? defaultQuota ?? 0;
  const changed = lineQuota != null && defaultQuota != null && lineQuota !== defaultQuota;

  return (
    <div style={{
      border: '1.5px solid #e8edf5', borderRadius: '12px',
      overflow: 'hidden', background: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {/* Header */}
      <div
        onClick={() => setOpen(p => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 14px', cursor: 'pointer',
          background: open ? '#fafbfc' : '#fff',
          borderBottom: open ? '1px solid #f1f5f9' : 'none',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
        onMouseLeave={e => e.currentTarget.style.background = open ? '#fafbfc' : '#fff'}
      >
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
          background: deptColor,
        }}/>
        <span style={{
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1rem',
          fontWeight: 700, color: '#0f172a', letterSpacing: '0.02em', flex: 1,
        }}>{line.label}</span>

        {line.remark && (
          <span style={{
            fontFamily: "'DM Sans',sans-serif", fontSize: '0.58rem',
            color: '#92400e', background: '#fef3c7',
            padding: '1px 6px', borderRadius: '20px', border: '1px solid #fde68a',
          }}>⚠ {line.remark}</span>
        )}

        {/* Total quota badge */}
        <div style={{
          padding: '2px 10px', borderRadius: '99px',
          background: deptColor + '15', border: `1px solid ${deptColor}30`,
          fontFamily: "'DM Mono',monospace", fontSize: '0.55rem', fontWeight: 700,
          color: deptColor,
        }}>
          {current} req/shift
        </div>

        <span style={{
          color: '#d1d5db', fontSize: '0.7rem',
          transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          transition: 'transform 0.2s', display: 'inline-block',
        }}>▾</span>
      </div>

      {open && (
        <div style={{ padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.52rem', color: '#64748b', lineHeight: 1.35 }}>
            Default: {defaultQuota ?? 0} req/shift
            {changed && <span style={{ marginLeft: '8px', color: '#1d4ed8', fontWeight: 700 }}>· modified</span>}
          </div>
          <QuotaInput
            value={current}
            onChange={val => onLineQuotaChange(line.id, defaultQuota != null && val === defaultQuota ? null : val)}
          />
        </div>
      )}
    </div>
  );
}

// ── Main Settings Page ─────────────────────────────────────────────────────────
export default function SettingsPage({
  onBack,
  lineQuotas,
  onLineQuotaChange,
  onResetAll,
  dressingsLayout = { departments: [], linesByDept: {}, allLines: [] },
  savouryLayout = { departments: [], linesByDept: {}, allLines: [] },
  lineTotalsById = {},
  initialPlant = 'dressings',
}) {
  const [activePlant, setActivePlant] = useState(initialPlant);
  const [activeDept,  setActiveDept]  = useState(null);
  const [search,      setSearch]      = useState('');
  const [saved,       setSaved]       = useState(false);
  const [saveError,   setSaveError]   = useState(null);

  const plantsConfig = [
    { id: 'dressings', label: 'Dressings', icon: '🥗', color: '#0057B8', depts: dressingsLayout.departments ?? [] },
    { id: 'savoury',   label: 'Savoury',   icon: '🧂', color: '#b45309', depts: savouryLayout.departments ?? [] },
  ];

  const currentPlant = plantsConfig.find(p => p.id === activePlant);
  const currentDepts = currentPlant?.depts ?? [];

  // Default dept when switching plants
  const effectiveDept = activeDept ?? currentDepts[0]?.id ?? null;
  const deptObj = currentDepts.find(d => d.id === effectiveDept);
  const lines   = getLinesForPlantDept(activePlant, effectiveDept ?? '', dressingsLayout, savouryLayout);

  // Filter by search
  const filteredLines = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lines;
    return lines.filter(l =>
      l.label.toLowerCase().includes(q) ||
      l.skus.some(sk => sk.label.toLowerCase().includes(q))
    );
  }, [lines, search]);

  // Count total changes
  const changedCount = Object.keys(lineQuotas ?? {}).length;

  const handleSave = async () => {
    setSaveError(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);

    try {
      const lay = activePlant === 'dressings' ? dressingsLayout : savouryLayout;
      const scopeLineIds = lay?.allLines?.map(l => l.id) ?? [];
      if (!scopeLineIds.length) return;

      const scopeSet = new Set(scopeLineIds);
      // Persist a row for every machine line in this plant scope.
      // If the operator didn't change it, we save the schedule-derived default.
      const items = scopeLineIds.map((lineId) => ({
        lineId,
        quota: Number(
          (lineQuotas?.[lineId] ?? lineTotalsById?.[lineId] ?? 0),
        ),
      }));

      const res = await fetch('/api/v1/settings/lines/scope', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scopeLineIds, items }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Failed to save settings (${res.status})${txt ? `: ${txt}` : ''}`);
      }
      await res.json().catch(() => {});
    } catch (err) {
      setSaved(false);
      setSaveError(err.message || 'Failed to save settings');
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #f0f4fa; min-height: 100vh; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes popIn   { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
      `}</style>

      <div style={{ fontFamily: "'DM Sans',sans-serif", minHeight: '100vh', background: '#f0f4fa' }}>

        {/* ── Header ── */}
        <header style={{
          height: '62px', position: 'sticky', top: 0, zIndex: 200,
          background: 'linear-gradient(130deg, #0a0f2c 0%, #0d2260 50%, #0d4fa8 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px',
          boxShadow: '0 2px 20px rgba(0,0,0,0.3)',
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
              background: 'linear-gradient(135deg, #64748b, #475569)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', boxShadow: '0 3px 10px rgba(100,116,139,0.4)',
            }}>⚙️</div>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.4rem', fontWeight: 800, color: '#fff', letterSpacing: '0.06em', lineHeight: 1 }}>
                MANPOWER SETTINGS
              </div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.49rem', color: 'rgba(255,255,255,0.32)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                Configure 3P headcount requirements per line · per shift
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {changedCount > 0 && (
              <button onClick={onResetAll} style={{
                padding: '6px 14px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
                fontFamily: "'DM Sans',sans-serif", fontSize: '0.72rem', fontWeight: 600,
              }}>↩ Reset All ({changedCount})</button>
            )}
            <button onClick={handleSave} style={{
              padding: '6px 18px', borderRadius: '8px',
              border: 'none',
              background: saved ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#0057B8,#0ea5e9)',
              color: '#fff', cursor: 'pointer',
              fontFamily: "'DM Sans',sans-serif", fontSize: '0.78rem', fontWeight: 700,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              transition: 'background 0.3s',
            }}>{saved ? '✓ Saved!' : 'Save Changes'}</button>
          </div>
        </header>

        {/* ── Plant tabs ── */}
        <div style={{
          background: '#fff', borderBottom: '1.5px solid #e2e8f0',
          padding: '0 24px', display: 'flex', alignItems: 'stretch',
          position: 'sticky', top: '62px', zIndex: 100,
          boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
        }}>
          {plantsConfig.map(plant => (
            <button key={plant.id} onClick={() => { setActivePlant(plant.id); setActiveDept(null); }} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '14px 20px', border: 'none', cursor: 'pointer',
              background: 'transparent',
              borderBottom: activePlant === plant.id ? `3px solid ${plant.color}` : '3px solid transparent',
              marginBottom: '-1px', transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: '1.1rem' }}>{plant.icon}</span>
              <span style={{
                fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1rem', fontWeight: 700,
                color: activePlant === plant.id ? plant.color : '#64748b', letterSpacing: '0.04em',
              }}>{plant.label}</span>
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div style={{ display: 'flex', height: 'calc(100vh - 125px)' }}>

          {/* Left sidebar: dept list */}
          <aside style={{
            width: '200px', flexShrink: 0,
            borderRight: '1.5px solid #e2e8f0',
            background: '#fff',
            overflowY: 'auto',
            padding: '12px 8px',
            display: 'flex', flexDirection: 'column', gap: '4px',
          }}>
            {currentDepts.map(dept => {
              const deptLines = getLinesForPlantDept(activePlant, dept.id, dressingsLayout, savouryLayout);
              const changedInDept = deptLines.reduce((s, l) => s + (lineQuotas?.[l.id] != null ? 1 : 0), 0);
              const isActive = effectiveDept === dept.id;
              return (
                <button key={dept.id} onClick={() => setActiveDept(dept.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '9px 10px', borderRadius: '10px', border: 'none',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  background: isActive ? dept.color + '15' : 'transparent',
                  transition: 'background 0.14s',
                }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: '1rem', flexShrink: 0 }}>{dept.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "'Barlow Condensed',sans-serif", fontSize: '0.9rem', fontWeight: 700,
                      color: isActive ? dept.color : '#374151', letterSpacing: '0.03em',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{dept.label}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.48rem', color: '#94a3b8' }}>
                      {deptLines.length} lines
                    </div>
                  </div>
                  {changedInDept > 0 && (
                    <div style={{
                      width: '16px', height: '16px', borderRadius: '50%',
                      background: dept.color, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'DM Mono',monospace", fontSize: '0.45rem', fontWeight: 800, color: '#fff',
                    }}>{changedInDept}</div>
                  )}
                </button>
              );
            })}
          </aside>

          {/* Main content */}
          <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

            {/* Dept header + search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '1.4rem' }}>{deptObj?.icon}</span>
              <div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.04em' }}>
                  {deptObj?.label}
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', fontWeight: 400, color: '#94a3b8', marginLeft: '10px' }}>
                    {filteredLines.length} lines
                  </span>
                </div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.52rem', color: '#94a3b8' }}>
                  Set the required 3P headcount per line per shift
                </div>
              </div>

              {/* Search */}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', minWidth: '180px' }}>
                <span style={{ fontSize: '0.8rem', opacity: 0.4 }}>🔍</span>
                <input
                  type="text" placeholder="Search lines…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontFamily: "'DM Sans',sans-serif", fontSize: '0.73rem', color: '#111827' }}
                />
                {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.8rem', padding: 0 }}>✕</button>}
              </div>
            </div>

            {/* Info banner */}
            <div style={{
              padding: '10px 14px', borderRadius: '10px',
              background: 'linear-gradient(90deg, #eff6ff, #f0fdf4)',
              border: '1px solid #bfdbfe', marginBottom: '16px',
              fontFamily: "'DM Sans',sans-serif", fontSize: '0.68rem', color: '#1d4ed8',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span>💡</span>
              <span>Changes here update the <strong>required headcount</strong> for shift assignment and analytics. Click <strong>Save Changes</strong> to apply.</span>
              {changedCount > 0 && (
                <span style={{ marginLeft: 'auto', fontFamily: "'DM Mono',monospace", fontWeight: 700, color: '#0057B8' }}>
                  {changedCount} modification{changedCount !== 1 ? 's' : ''} pending
                </span>
              )}
            </div>

            {/* Lines */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredLines.length === 0 && (
                <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontFamily: "'DM Sans',sans-serif", fontSize: '0.85rem' }}>
                  No lines match your search
                </div>
              )}
              {filteredLines.map((line, i) => (
                <div key={line.id} style={{ animation: `fadeUp 0.3s ${i * 0.04}s both` }}>
                  <LineSection
                    line={line}
                    lineQuota={lineQuotas?.[line.id]}
                    defaultQuota={lineTotalsById?.[line.id] ?? line.skus.reduce((s, sk) => s + (Number(sk.quota) || 0), 0)}
                    deptColor={deptObj?.color ?? '#0057B8'}
                    onLineQuotaChange={onLineQuotaChange}
                  />
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
