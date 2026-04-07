export function slug(s) {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'line';
}

/**
 * Build departments, lines (machines), and SKUs from API schedule rows for one plant tab.
 * Departments = distinct `section` values (fallback DRESSINGS / SAVOURY).
 */
export function buildScheduleLayout(rows, plantKey) {
  if (!rows?.length) {
    return { departments: [], linesByDept: {}, allLines: [] };
  }

  const defaultSection = plantKey === 'dressings' ? 'DRESSINGS' : 'SAVOURY';

  const sectionMap = new Map();
  for (const r of rows) {
    const sec = (r.section && String(r.section).trim()) || defaultSection;
    if (!sectionMap.has(sec)) {
      sectionMap.set(sec, {
        id: `sec-${plantKey}-${slug(sec)}`,
        label: sec,
        sectionKey: sec,
        icon: '🏭',
        color: plantKey === 'dressings' ? '#0057B8' : '#b45309',
        plant: plantKey,
      });
    }
  }
  const departments = [...sectionMap.values()].sort((a, b) => a.label.localeCompare(b.label));

  const linesByDept = {};
  const allLines = [];

  for (const dept of departments) {
    const sec = dept.sectionKey;
    const rowsInSec = rows.filter(
      r => ((r.section && String(r.section).trim()) || defaultSection) === sec,
    );

    const machineMap = new Map();
    for (const r of rowsInSec) {
      const m = String(r.machine ?? '').trim();
      if (!m) continue;
      if (!machineMap.has(m)) machineMap.set(m, []);
      machineMap.get(m).push(r);
    }

    const lines = [];
    const sortedMachines = [...machineMap.keys()].sort((a, b) => a.localeCompare(b));

    for (const machine of sortedMachines) {
      const mRows = machineMap.get(machine);
      const lineId = `line-${plantKey}-${slug(sec)}-${slug(machine)}`;

      const skus = mRows.map((r, idx) => {
        const skuId = r._id != null
          ? `sch-${String(r._id)}`
          : `sch-${lineId}-${idx}-${slug(String(r.sku ?? 'sku'))}`;
        return {
          id: skuId,
          label: String(r.sku ?? `SKU ${idx + 1}`).trim() || `SKU ${idx + 1}`,
          uom: '',
          // Manpower is configured at the *line* level (machine). SKU quota here is only used
          // as a weight when splitting the line total across SKUs for UI/staffing.
          quota: 1,
        };
      });

      const line = {
        id: lineId,
        label: machine,
        dept: dept.id,
        machine,
        sectionKey: sec,
        plant: plantKey,
        skus,
      };
      lines.push(line);
      allLines.push(line);
    }
    linesByDept[dept.id] = lines;
  }

  return { departments, linesByDept, allLines };
}
