import { EMPLOYEE_COLORS } from '../data/lineData';

export default function EmployeeCard({ employee, isAssigned, onDragStart, onDragEnd }) {
  const c       = EMPLOYEE_COLORS[employee.colorIndex];
  const initials = employee.name.split(' ').map(n => n[0]).join('').slice(0, 2);

  if (isAssigned) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '7px 10px', borderRadius: '10px',
        background: '#f9fafb', border: '1.5px dashed #e5e7eb',
        opacity: 0.55, userSelect: 'none', cursor: 'not-allowed',
      }}>
        <div style={{
          width: '30px', height: '30px', borderRadius: '8px',
          background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'DM Sans',sans-serif", fontSize: '0.62rem', fontWeight: 800, color: '#9ca3af',
          flexShrink: 0,
        }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.73rem', fontWeight: 600, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{employee.name}</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.52rem', color: '#d1d5db', marginTop: '1px' }}>
            ✓ assigned
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart(employee.id); }}
      onDragEnd={onDragEnd}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '7px 10px', borderRadius: '10px',
        background: '#fff',
        border: `1.5px solid ${c.border}`,
        cursor: 'grab', userSelect: 'none',
        transition: 'box-shadow 0.15s, transform 0.12s, border-color 0.15s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = `0 4px 14px ${c.dot}30`;
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.borderColor = c.dot;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.borderColor = c.border;
      }}
    >
      {/* Avatar */}
      <div style={{
        width: '30px', height: '30px', borderRadius: '8px',
        background: `linear-gradient(135deg, ${c.dot}, ${c.dot}cc)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'DM Sans',sans-serif", fontSize: '0.62rem', fontWeight: 800,
        color: '#fff', flexShrink: 0,
        boxShadow: `0 2px 6px ${c.dot}40`,
      }}>{initials}</div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.73rem', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{employee.name}</div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.52rem', color: '#9ca3af', marginTop: '1px' }}>HRTA · 3P</div>
      </div>

      {/* Drag handle */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0, opacity: 0.3 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ display: 'flex', gap: '2px' }}>
            <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#6b7280' }}/>
            <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#6b7280' }}/>
          </div>
        ))}
      </div>
    </div>
  );
}
