import { useState } from 'react';
import AssignedChip from './AssignedChip';

export default function DropZone({ skuId, shiftId, quota, assignedEmployees, isDragging, onDrop, onRemove, deptColor }) {
  const [over, setOver] = useState(false);
  const count   = assignedEmployees.length;
  const isFull  = quota > 0 && count >= quota;
  const isNA    = quota === 0;
  const canDrop = isDragging && !isFull && !isNA;

  // Slot dots — visual representation of open/filled slots
  const slots = quota > 0 ? Array.from({ length: quota }, (_, i) => i < count) : [];

  let bg      = 'transparent';
  let border  = '#f1f5f9';
  let outline = 'none';
  if (isNA)       { bg = '#fafafa'; border = '#f1f5f9'; }
  else if (isFull){ bg = '#f0fdf4'; border = '#bbf7d0'; }
  else if (over)  { bg = '#eff6ff'; border = deptColor; outline = `2px solid ${deptColor}40`; }
  else if (canDrop){ bg = `${deptColor}08`; border = `${deptColor}30`; }

  return (
    <div
      onDragOver={e => { if (!canDrop) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); onDrop(skuId, shiftId, quota); }}
      style={{
        minHeight: '54px', padding: '6px 8px',
        border: `1px solid ${border}`,
        borderRadius: '8px', background: bg,
        outline, transition: 'all 0.14s ease',
        display: 'flex', flexDirection: 'column', gap: '5px',
        cursor: isNA ? 'default' : canDrop ? 'copy' : 'default',
        position: 'relative',
      }}
    >
      {isNA ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.6rem', color: '#d1d5db', letterSpacing: '0.05em' }}>N/A</span>
        </div>
      ) : (
        <>
          {/* Slot indicators row */}
          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
            {slots.map((filled, i) => (
              <div key={i} style={{
                width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                background: filled ? deptColor : `${deptColor}22`,
                border: `1.5px solid ${filled ? deptColor : `${deptColor}40`}`,
                transition: 'all 0.2s',
              }} />
            ))}
          </div>

          {/* Assigned chips */}
          {count > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
              {assignedEmployees.map(emp => (
                <AssignedChip key={emp.id} employee={emp} onRemove={() => onRemove(emp.id, skuId, shiftId)} />
              ))}
            </div>
          )}

          {/* Drop cue */}
          {over && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${deptColor}12`, pointerEvents: 'none',
              animation: 'fadeIn 0.12s ease',
            }}>
              <span style={{
                fontFamily: "'DM Sans',sans-serif", fontSize: '0.7rem', fontWeight: 700,
                color: deptColor, background: '#fff',
                padding: '3px 10px', borderRadius: '6px',
                boxShadow: `0 2px 8px ${deptColor}30`,
              }}>+ Assign</span>
            </div>
          )}

          {!over && canDrop && count === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '4px' }}>
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.6rem', color: `${deptColor}60`, fontStyle: 'italic' }}>
                drag here
              </span>
            </div>
          )}

          {/* Quota label bottom right */}
          <span style={{
            position: 'absolute', bottom: '4px', right: '6px',
            fontFamily: "'DM Mono',monospace", fontSize: '0.55rem', fontWeight: 700,
            color: isFull ? '#16a34a' : count > 0 ? '#f59e0b' : '#d1d5db',
          }}>{count}/{quota}</span>
        </>
      )}
    </div>
  );
}
