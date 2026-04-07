import { useState } from 'react';
import DropZone from './DropZone';
import { SHIFTS } from '../data/lineData';
import {
  getEffectiveSkuQuotas,
  getEffectiveLineTotalQuota,
  parseVariantManpower,
  getStaffingLabelFromSchedule,
  getMatchedScheduleRow,
} from '../utils/scheduleQuotas';

// ── Shift schedule logic ─────────────────────────────────────────────────────
function getCurrentShift() {
  const h = new Date().getHours();
  if (h >= 6 && h < 14) return 1;
  if (h >= 14 && h < 22) return 2;
  return 3;
}

function isShiftEnabled(shiftId) {
  return shiftId === getCurrentShift();
}

// ── Shift Tab Bar ─────────────────────────────────────────────────────────────
function ShiftTabBar({ active, onSelect, getTotal, getRequired, color }) {
  const curShift = getCurrentShift();

  return (
    <div style={{
      display: 'flex',
      background: '#f1f5f9',
      borderRadius: '14px 14px 0 0',
      border: '1.5px solid #e2e8f0',
      borderBottom: 'none',
      overflow: 'hidden',
    }}>
      {SHIFTS.map((s, idx) => {
        const isSel   = s.id === active;
        const isCur   = s.id === curShift;
        const enabled = isShiftEnabled(s.id);
        const tot     = getTotal(s.id);
        const req     = getRequired();
        const pct     = req > 0 ? Math.min(tot / req, 1) : 0;
        const full    = pct >= 1 && req > 0;
        const isLast  = idx === SHIFTS.length - 1;

        return (
          <button
            key={s.id}
            onClick={() => enabled && onSelect(s.id)}
            disabled={!enabled}
            title={!enabled ? `${s.fullLabel} (${s.time}) — not your current shift` : s.fullLabel}
            style={{
              flex: 1,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '4px',
              padding: isCur ? '18px 10px 10px' : '12px 10px 10px',
              border: 'none',
              borderRight: isLast ? 'none' : '1.5px solid #e2e8f0',
              borderBottom: isSel ? `3px solid ${color}` : '3px solid transparent',
              cursor: enabled ? 'pointer' : 'not-allowed',
              position: 'relative', overflow: 'hidden',
              transition: 'background 0.18s',
              background: isSel ? '#ffffff' : enabled ? '#f8fafc' : '#f1f5f9',
              opacity: enabled ? 1 : 0.48,
            }}
          >
            {/* Lock badge */}
            {!enabled && (
              <div style={{
                position: 'absolute', top: '6px', right: '8px',
                fontSize: '0.65rem', opacity: 0.5,
              }}>🔒</div>
            )}

            {/* LIVE badge */}
            {isCur && (
              <div style={{
                position: 'absolute', top: '5px', left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex', alignItems: 'center', gap: '3px',
                padding: '1px 6px', borderRadius: '99px',
                background: '#dcfce7', border: '1px solid #86efac',
                whiteSpace: 'nowrap',
              }}>
                <div style={{
                  width: '4px', height: '4px', borderRadius: '50%',
                  background: '#22c55e',
                  animation: 'livepulse 1.8s ease infinite',
                }}/>
                <span style={{
                  fontFamily: "'DM Mono',monospace", fontSize: '0.42rem',
                  fontWeight: 700, color: '#15803d', letterSpacing: '0.06em',
                }}>LIVE</span>
              </div>
            )}

            <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>

            <div style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: '1rem', fontWeight: 700, lineHeight: 1,
              color: isSel ? color : enabled ? '#374151' : '#9ca3af',
              letterSpacing: '0.03em',
            }}>{s.fullLabel}</div>

            <div style={{
              fontFamily: "'DM Mono',monospace", fontSize: '0.48rem',
              color: isSel ? color + 'bb' : '#9ca3af',
            }}>{s.time}</div>

            <div style={{
              width: '80%', height: '3px', borderRadius: '99px',
              background: '#e5e7eb', overflow: 'hidden', marginTop: '2px',
            }}>
              <div style={{
                height: '100%', borderRadius: '99px',
                width: `${pct * 100}%`,
                background: full ? '#22c55e' : color,
                transition: 'width 0.4s ease',
              }}/>
            </div>

            <div style={{
              fontFamily: "'DM Mono',monospace", fontSize: '0.55rem', fontWeight: 700,
              color: full ? '#16a34a' : isSel ? color : '#9ca3af',
            }}>
              {tot}<span style={{ fontWeight: 400, opacity: 0.7 }}>/{req}</span>
            </div>

            {!enabled && (
              <div style={{
                fontFamily: "'DM Sans',sans-serif", fontSize: '0.48rem',
                color: '#9ca3af', fontStyle: 'italic',
              }}>Locked</div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Line Sub-Tabs ─────────────────────────────────────────────────────────────
function LineSubTabs({
  lines, activeLine, onSelect, activeShift, getAssignedEmployees, deptColor,
  scheduleByLineId, lineManpowerOverrides,
}) {
  return (
    <div style={{
      display: 'flex', gap: '5px', flexWrap: 'wrap',
      padding: '10px 14px',
      background: '#fafbfc',
      borderLeft: '1.5px solid #e2e8f0',
      borderRight: '1.5px solid #e2e8f0',
      borderBottom: '1px solid #e2e8f0',
    }}>
      {lines.map(line => {
        const isActive  = line.id === activeLine;
        const rowsForLine = scheduleByLineId[line.id] ?? [];
        const assigned  = line.skus.reduce((s, sk) => s + (getAssignedEmployees(sk.id, activeShift)?.length ?? 0), 0);
        const required  = getEffectiveLineTotalQuota(line, rowsForLine, lineManpowerOverrides);
        const isFull    = required > 0 && assigned >= required;
        const partial   = assigned > 0 && !isFull;

        return (
          <button
            key={line.id}
            onClick={() => onSelect(line.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 10px 5px 8px',
              border: `1.5px solid ${isActive ? deptColor : isFull ? '#86efac' : partial ? '#fde68a' : '#e2e8f0'}`,
              borderRadius: '99px',
              cursor: 'pointer',
              background: isActive ? deptColor : isFull ? '#f0fdf4' : partial ? '#fffbeb' : '#fff',
              transition: 'all 0.15s',
              boxShadow: isActive ? `0 2px 8px ${deptColor}30` : 'none',
            }}
            onMouseEnter={e => {
              if (!isActive) {
                e.currentTarget.style.borderColor = deptColor + '70';
                e.currentTarget.style.background = deptColor + '0a';
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                e.currentTarget.style.borderColor = isFull ? '#86efac' : partial ? '#fde68a' : '#e2e8f0';
                e.currentTarget.style.background = isFull ? '#f0fdf4' : partial ? '#fffbeb' : '#fff';
              }
            }}
          >
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
              background: isActive ? 'rgba(255,255,255,0.8)' : isFull ? '#22c55e' : partial ? '#f59e0b' : '#d1d5db',
            }}/>
            <span style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: '0.88rem', fontWeight: 700, lineHeight: 1,
              color: isActive ? '#fff' : isFull ? '#15803d' : partial ? '#92400e' : '#374151',
              letterSpacing: '0.02em', whiteSpace: 'nowrap',
            }}>{line.label}</span>
            {required > 0 && (
              <span style={{
                fontFamily: "'DM Mono',monospace", fontSize: '0.48rem', fontWeight: 700,
                padding: '1px 5px', borderRadius: '99px',
                background: isActive ? 'rgba(255,255,255,0.2)' : isFull ? '#dcfce7' : partial ? '#fef3c7' : '#f3f4f6',
                color: isActive ? '#fff' : isFull ? '#15803d' : partial ? '#92400e' : '#9ca3af',
              }}>{assigned}/{required}</span>
            )}
            {isFull && <span style={{ fontSize: '0.58rem' }}>✓</span>}
          </button>
        );
      })}
    </div>
  );
}

// ── Line Detail Panel ─────────────────────────────────────────────────────────
function LineDetail({
  line, activeShift, isDragging, getAssignedEmployees, onDrop, onRemove, isProcess, deptColor,
  scheduleRows, lineManpowerOverrides,
}) {
  const effectiveSkus = getEffectiveSkuQuotas(line, scheduleRows, lineManpowerOverrides);
  const shiftAssigned = effectiveSkus.reduce(
    (s, sk) => s + (getAssignedEmployees(sk.id, activeShift)?.length ?? 0),
    0,
  );
  const shiftRequired = effectiveSkus.reduce((s, sk) => s + sk.effectiveQuota, 0);
  const variantParsed = (scheduleRows ?? []).map(r => parseVariantManpower(r.variant)).filter(n => n != null);
  const variantTotal  = variantParsed.length ? Math.max(...variantParsed) : null;
  const usesVariant   = variantTotal != null;
  const pct    = shiftRequired > 0 ? shiftAssigned / shiftRequired : 0;
  const isFull = pct >= 1 && shiftRequired > 0;
  const partial = shiftAssigned > 0 && !isFull;

  const statusColor  = isFull ? '#16a34a' : partial ? '#f59e0b' : '#94a3b8';
  const statusBorder = isFull ? '#bbf7d0' : partial ? '#fde68a' : '#e5e7eb';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '12px',
      padding: '16px',
      background: '#fff',
      border: `1.5px solid ${statusBorder}`,
      borderTop: 'none',
      borderRadius: '0 0 14px 14px',
      minHeight: '160px',
      animation: 'slideDown 0.18s ease',
    }}>
      {/* Line header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        paddingBottom: '12px',
        borderBottom: '1px solid #f1f5f9',
      }}>
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
          background: statusColor,
          boxShadow: isFull ? `0 0 0 3px ${statusColor}25` : 'none',
          transition: 'all 0.3s',
        }}/>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.2rem', fontWeight: 700,
              color: isFull ? '#15803d' : '#111827', letterSpacing: '0.02em',
            }}>{line.label}</span>
            {isFull && (
              <span style={{
                fontFamily: "'DM Sans',sans-serif", fontSize: '0.58rem', fontWeight: 700,
                color: '#16a34a', background: '#dcfce7',
                padding: '1px 7px', borderRadius: '20px', border: '1px solid #86efac',
              }}>✓ Fully Staffed</span>
            )}
            {line.remark && (
              <span style={{
                fontFamily: "'DM Sans',sans-serif", fontSize: '0.58rem',
                color: '#92400e', background: '#fef3c7',
                padding: '1px 6px', borderRadius: '20px', border: '1px solid #fde68a',
              }}>⚠ {line.remark}</span>
            )}
          </div>
          {!isProcess && (
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.54rem', color: '#9ca3af', marginTop: '2px' }}>
              {line.skus.length} SKU{line.skus.length !== 1 ? 's' : ''} · {shiftAssigned}/{shiftRequired} staffed
              {usesVariant && (
                <span style={{ marginLeft: '6px', color: '#0369a1' }}>
                  · variant manpower {variantTotal}
                </span>
              )}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.7rem', fontWeight: 800,
            color: statusColor, lineHeight: 1,
          }}>
            {shiftAssigned}
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.7rem', color: '#9ca3af', fontWeight: 400 }}>
              /{shiftRequired}
            </span>
          </div>
          <div style={{
            height: '4px', width: '64px', borderRadius: '99px',
            background: '#e5e7eb', overflow: 'hidden', marginTop: '4px',
          }}>
            <div style={{
              height: '100%', borderRadius: '99px',
              width: `${pct * 100}%`,
              background: statusColor, transition: 'width 0.3s',
            }}/>
          </div>
        </div>
      </div>

      {/* SKU rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {effectiveSkus.map((sku, skuIdx) => {
          const staffingLabel = getStaffingLabelFromSchedule(line, sku, scheduleRows, skuIdx);
          const matchedRow = getMatchedScheduleRow(line, sku, scheduleRows, skuIdx);
          const metaParts = [];
          if (matchedRow?.description != null && String(matchedRow.description).trim() !== '') {
            metaParts.push(String(matchedRow.description).trim());
          }
          if (matchedRow != null && matchedRow.qty != null && Number.isFinite(Number(matchedRow.qty))) {
            metaParts.push(`${Number(matchedRow.qty).toLocaleString()} cs`);
          }
          if (matchedRow != null && matchedRow.variant != null && String(matchedRow.variant).trim() !== '') {
            metaParts.push(`var ${String(matchedRow.variant).trim()}`);
          }
          const metaLine = metaParts.join(' · ');
          return (
          <div key={sku.id} style={{
            display: 'grid',
            gridTemplateColumns: isProcess ? '1fr' : 'minmax(112px, max-content) 1fr',
            gap: '8px', alignItems: 'start',
          }}>
            {!isProcess && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingTop: '6px', maxWidth: '220px' }}>
                <span style={{
                  fontFamily: "'DM Mono',monospace", fontSize: '0.68rem', fontWeight: 700,
                  color: deptColor, background: deptColor + '12',
                  border: `1px solid ${deptColor}30`,
                  borderRadius: '6px', padding: '2px 8px',
                  display: 'inline-block', whiteSpace: 'normal', wordBreak: 'break-word',
                }}>{staffingLabel}</span>
                {metaLine && (
                  <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: '0.52rem', color: '#64748b', lineHeight: 1.35 }}>
                    {metaLine}
                  </span>
                )}
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.5rem', color: '#9ca3af' }}>
                  {sku.effectiveQuota === 0 ? 'no manpower' : `${sku.effectiveQuota} req/shift${usesVariant ? ' (from variant)' : ''}`}
                </span>
              </div>
            )}
            <DropZone
              skuId={sku.id} shiftId={activeShift} quota={sku.effectiveQuota}
              assignedEmployees={getAssignedEmployees(sku.id, activeShift)}
              isDragging={isDragging} onDrop={onDrop} onRemove={onRemove}
              deptColor={deptColor}
            />
          </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ShiftBoard Export ────────────────────────────────────────────────────
export default function ShiftBoard({
  lines, deptId,
  deptLabel = '',
  deptAccentColor,
  scheduleByLineId = {},
  lineManpowerOverrides = {},
  getAssignedEmployees,
  getDeptShiftTotal,
  isDragging, onDrop, onRemove,
}) {
  const curShift = getCurrentShift();
  const [activeShift, setActiveShift] = useState(curShift);
  const [activeLine,  setActiveLine]  = useState(lines[0]?.id ?? null);

  const primary = deptAccentColor ?? '#0057B8';
  const dept = { primary, light: `${primary}18`, name: deptLabel || deptId };
  const dl = (deptLabel || '').toLowerCase();
  const isProcess = dl.includes('process') || dl.includes('warehouse');

  const activeLineObj = lines.find(l => l.id === activeLine) ?? lines[0];

  const getRequiredForLines = () =>
    lines.reduce(
      (s, l) => s + getEffectiveLineTotalQuota(l, scheduleByLineId[l.id] ?? [], lineManpowerOverrides),
      0,
    );

  const handleShiftSelect = (shiftId) => {
    if (!isShiftEnabled(shiftId)) return;
    setActiveShift(shiftId);
    setActiveLine(lines[0]?.id ?? null);
  };

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

      {/* Shift Tabs */}
      <ShiftTabBar
        active={activeShift}
        onSelect={handleShiftSelect}
        getTotal={sid => getDeptShiftTotal(lines, sid)}
        getRequired={getRequiredForLines}
        color={dept.primary}
      />

      {/* Active shift label bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 14px',
        background: dept.primary + '08',
        borderLeft: '1.5px solid #e2e8f0',
        borderRight: '1.5px solid #e2e8f0',
        borderBottom: '1px solid #e2e8f0',
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif", fontSize: '0.78rem', fontWeight: 700,
          color: dept.primary, letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          {SHIFTS.find(s => s.id === activeShift)?.fullLabel}
          &nbsp;·&nbsp;
          {SHIFTS.find(s => s.id === activeShift)?.time}
        </div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '0.55rem', color: '#9ca3af' }}>
          {lines.length} lines
        </div>
      </div>

      {/* Line Sub-Tabs */}
      <LineSubTabs
        lines={lines}
        activeLine={activeLine ?? lines[0]?.id}
        onSelect={setActiveLine}
        activeShift={activeShift}
        getAssignedEmployees={getAssignedEmployees}
        deptColor={dept.primary}
        scheduleByLineId={scheduleByLineId}
        lineManpowerOverrides={lineManpowerOverrides}
      />

      {/* Line Detail */}
      {activeLineObj && (
        <LineDetail
          key={`${activeLineObj.id}-${activeShift}`}
          line={activeLineObj}
          activeShift={activeShift}
          isDragging={isDragging}
          getAssignedEmployees={getAssignedEmployees}
          onDrop={onDrop}
          onRemove={onRemove}
          isProcess={isProcess}
          deptColor={dept.primary}
          scheduleRows={scheduleByLineId[activeLineObj.id] ?? []}
          lineManpowerOverrides={lineManpowerOverrides}
        />
      )}
    </div>
  );
}
