import { EMPLOYEE_COLORS } from '../data/lineData';

export default function AssignedChip({ employee, onRemove }) {
  const c = EMPLOYEE_COLORS[employee.colorIndex];
  const parts = employee.name.split(' ');
  const short = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];

  return (
    <div
      title={`${employee.name} — click × to unassign`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: '3px 4px 3px 7px', borderRadius: '20px',
        background: c.bg, border: `1.5px solid ${c.border}`,
        fontFamily: "'DM Sans',sans-serif", fontSize: '0.66rem',
        color: c.text, fontWeight: 600, lineHeight: 1,
        whiteSpace: 'nowrap', cursor: 'default',
        transition: 'box-shadow 0.15s',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'}
    >
      <span style={{
        width: '16px', height: '16px', borderRadius: '50%',
        background: c.dot, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: '0.5rem', fontWeight: 800,
        fontFamily: "'DM Sans',sans-serif",
      }}>
        {employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
      </span>
      <span style={{ maxWidth: '62px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{short}</span>
      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        style={{
          width: '16px', height: '16px', borderRadius: '50%',
          background: c.dot + '22', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: c.dot, fontSize: '0.65rem', fontWeight: 800, flexShrink: 0,
          transition: 'background 0.15s, transform 0.1s',
          lineHeight: 1, padding: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = c.dot; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'scale(1.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = c.dot + '22'; e.currentTarget.style.color = c.dot; e.currentTarget.style.transform = 'scale(1)'; }}
      >×</button>
    </div>
  );
}
