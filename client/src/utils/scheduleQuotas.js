/**
 * Parse manpower count from schedule `variant` (first integer in the string).
 * Returns null if nothing parseable — caller falls back to static line quotas.
 */
export function parseVariantManpower(variant) {
  if (variant == null || variant === undefined) return null;
  const s = String(variant).trim();
  if (!s) return null;
  const m = s.match(/\d+/);
  if (!m) return null;
  const n = parseInt(m[0], 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** When multiple DB rows exist for one machine, use the highest variant value. */
function variantLineTotalFromRows(scheduleRows) {
  if (!scheduleRows?.length) return null;
  let best = null;
  for (const r of scheduleRows) {
    const n = parseVariantManpower(r.variant);
    if (n != null && (best === null || n > best)) best = n;
  }
  return best;
}

/**
 * Line-level effective manpower (required headcount) is resolved in this order:
 * 1) DB/operator override for `line.id` (lineManpowerOverrides)
 * 2) Schedule `variant` (max parsed integer found across rows for the machine)
 *
 * Then the resolved total is split across SKUs using SKU weights (`line.skus[].quota`).
 */
export function getEffectiveSkuQuotas(line, scheduleRows, lineManpowerOverrides = {}) {
  const vmOverride = lineManpowerOverrides?.[line.id];
  const vmDefault  = variantLineTotalFromRows(scheduleRows);
  const vm = vmOverride != null ? vmOverride : vmDefault;

  const weights = line.skus.map(sk => Number(sk.quota) || 0);
  const totalW  = weights.reduce((a, b) => a + b, 0);

  // No resolved total — fall back to SKU weights as-is.
  if (vm == null) {
    return line.skus.map((sk, idx) => ({ ...sk, effectiveQuota: weights[idx] }));
  }

  if (vm === 0) return line.skus.map(sk => ({ ...sk, effectiveQuota: 0 }));

  // Split evenly if weights are not usable.
  if (totalW === 0) {
    const n = line.skus.length;
    if (n === 0) return line.skus.map(sk => ({ ...sk, effectiveQuota: 0 }));
    const each = Math.floor(vm / n);
    let rem = vm - each * n;
    return line.skus.map((sk, i) => ({
      ...sk,
      effectiveQuota: each + (i < rem ? 1 : 0),
    }));
  }

  // Proportional split with integer correction.
  const raw = weights.map(w => (w / totalW) * vm);
  const floored = raw.map(x => Math.floor(x));
  let rem = vm - floored.reduce((a, b) => a + b, 0);
  const fracOrder = [...raw.keys()].sort(
    (a, b) => (raw[b] - Math.floor(raw[b])) - (raw[a] - Math.floor(raw[a])),
  );
  const adj = [...floored];
  let i = 0;
  while (rem > 0) {
    adj[fracOrder[i % fracOrder.length]]++;
    rem--;
    i++;
  }

  return line.skus.map((sk, idx) => ({ ...sk, effectiveQuota: adj[idx] }));
}

export function getEffectiveLineTotalQuota(line, scheduleRows, lineManpowerOverrides = {}) {
  return getEffectiveSkuQuotas(line, scheduleRows, lineManpowerOverrides).reduce(
    (s, sk) => s + sk.effectiveQuota,
    0,
  );
}

// Helper for UI defaults: max parsed variant integer across a machine's DB rows.
export function getVariantLineTotalFromRows(scheduleRows) {
  return variantLineTotalFromRows(scheduleRows);
}

const norm = (s) => String(s ?? '').trim().toLowerCase();

/**
 * Schedule row for this staffing slot (same pairing rules as labels).
 * Returns null if no schedule rows.
 */
export function getMatchedScheduleRow(line, lineSku, scheduleRows, skuIndex) {
  const rows = scheduleRows ?? [];
  if (!rows.length) return null;

  if (rows.length === line.skus.length) {
    return rows[skuIndex] ?? null;
  }

  const idMatch = rows.find(r => r.sku && norm(r.sku) === norm(lineSku.id));
  if (idMatch) return idMatch;

  const labelMatch = rows.find(r => r.sku && norm(r.sku) === norm(lineSku.label));
  if (labelMatch) return labelMatch;

  if (rows.length === 1 && line.skus.length === 1) return rows[0];

  return rows[skuIndex] ?? null;
}

/**
 * Staffing row label: use schedule `sku` when a DB row maps to this line SKU.
 */
export function getStaffingLabelFromSchedule(line, lineSku, scheduleRows, skuIndex) {
  const rows = scheduleRows ?? [];
  if (!rows.length) return lineSku.label;

  const r = getMatchedScheduleRow(line, lineSku, scheduleRows, skuIndex);
  const v = r?.sku;
  if (v != null && String(v).trim() !== '') return String(v).trim();

  return lineSku.label;
}
