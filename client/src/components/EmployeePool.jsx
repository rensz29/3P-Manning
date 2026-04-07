import { useState, useMemo } from 'react';
import EmployeeCard from './EmployeeCard';

export default function EmployeePool({ employees, assignedIds, onDragStart, onDragEnd }) {
  const [search, setSearch] = useState('');
  const [tab, setTab]       = useState('available');

  const available = employees.filter(e => !assignedIds.has(e.id));
  const assigned  = employees.filter(e =>  assignedIds.has(e.id));
  const pct = employees.length > 0 ? Math.round((assignedIds.size / employees.length) * 100) : 0;

  const filtered = useMemo(() => {
    const base = tab === 'available' ? available : tab === 'assigned' ? assigned : employees;
    const q = search.trim().toLowerCase();
    return q ? base.filter(e => e.name.toLowerCase().includes(q)) : base;
  }, [employees, available, assigned, search, tab]);

  return (
    <aside style={{
      width: '210px', flexShrink: 0,
      display: 'flex', flexDirection: 'column', gap: '0',
      position: 'sticky', top: '110px',
      maxHeight: 'calc(100vh - 126px)',
    }}>

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 100%)',
        borderRadius: '14px 14px 0 0',
        padding: '14px 14px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '2px' }}>Employee Pool</div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.6rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{available.length} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>free</span></div>
          </div>
          {/* Donut summary */}
          <svg width="44" height="44" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="16" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4"/>
            <circle cx="22" cy="22" r="16" fill="none"
              stroke={pct === 100 ? '#4ade80' : '#60a5fa'} strokeWidth="4"
              strokeDasharray={`${pct / 100 * 100.53} 100.53`}
              strokeLinecap="round" transform="rotate(-90 22 22)"
              style={{ transition: 'stroke-dasharray 0.5s ease' }}/>
            <text x="22" y="25.5" textAnchor="middle" style={{ fontFamily: "'DM Mono',monospace", fontSize: '8px', fontWeight: 700, fill: '#fff' }}>{pct}%</text>
          </svg>
        </div>

        {/* Mini stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {[
            { label: 'Assigned',  value: assignedIds.size,                     color: '#60a5fa' },
            { label: 'Available', value: available.length,                      color: '#4ade80' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '6px 8px' }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.1rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.5rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '1px' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Search ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '8px 10px',
        background: '#f8fafc',
        border: '1px solid #e5e7eb', borderTop: 'none',
      }}>
        <span style={{ fontSize: '0.8rem', flexShrink: 0, opacity: 0.4 }}>🔍</span>
        <input
          type="text" placeholder="Search name…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, border: 'none', background: 'transparent', outline: 'none',
            fontFamily: "'DM Sans',sans-serif", fontSize: '0.73rem', color: '#111827',
          }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '0.8rem', padding: 0, lineHeight: 1 }}>✕</button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', background: '#f1f5f9', border: '1px solid #e5e7eb', borderTop: 'none' }}>
        {[
          { k: 'available', l: `Free (${available.length})` },
          { k: 'assigned',  l: `Done (${assigned.length})` },
          { k: 'all',       l: `All (${employees.length})` },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{
            flex: 1, border: 'none', padding: '6px 2px', cursor: 'pointer',
            fontFamily: "'DM Sans',sans-serif", fontSize: '0.58rem', fontWeight: 700,
            background: tab === t.k ? '#fff' : 'transparent',
            color: tab === t.k ? '#0f172a' : '#94a3b8',
            borderBottom: tab === t.k ? '2px solid #0f172a' : '2px solid transparent',
            transition: 'all 0.14s',
          }}>{t.l}</button>
        ))}
      </div>

      {/* ── Employee list ── */}
      <div style={{
        flex: 1, overflowY: 'auto', scrollbarWidth: 'thin',
        background: '#fff',
        border: '1px solid #e5e7eb', borderTop: 'none',
        borderRadius: '0 0 14px 14px',
        padding: '6px',
        display: 'flex', flexDirection: 'column', gap: '4px',
      }}>
        {filtered.length === 0 && (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#9ca3af', fontFamily: "'DM Sans',sans-serif", fontSize: '0.73rem' }}>
            {search ? 'No results' : 'All assigned ✓'}
          </div>
        )}
        {filtered.map(emp => (
          <EmployeeCard
            key={emp.id} employee={emp}
            isAssigned={assignedIds.has(emp.id)}
            onDragStart={onDragStart} onDragEnd={onDragEnd}
          />
        ))}
      </div>

      {/* ── How-to tip ── */}
      <div style={{
        marginTop: '8px', padding: '10px 12px',
        background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)',
        border: '1px solid #bfdbfe', borderRadius: '10px',
      }}>
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.68rem', fontWeight: 700, color: '#1d4ed8', marginBottom: '4px' }}>
          💡 How to assign
        </div>
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.62rem', color: '#3b82f6', lineHeight: 1.6 }}>
          Drag a card → drop on a shift cell. Tap <strong style={{ color: '#1d4ed8' }}>×</strong> on a chip to remove.
        </div>
      </div>
    </aside>
  );
}
