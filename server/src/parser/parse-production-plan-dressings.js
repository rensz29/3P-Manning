/**
 * parse-production-plan-dressings.js
 *
 * Parses the "Production PLan" sheet from the weekly DPP Excel file.
 * This format has machines as columns (Line A, Line B, Mespack, etc.)
 * and each date/shift occupies 3 rows (label row, data row, blank row).
 *
 * Usage:
 *   node parse-production-plan-dressings.js "<path-to-excel.xlsx>"
 *
 * Example:
 *   node parse-production-plan-dressings.js "C:\Users\UNILEVER\Downloads\dressings_new.xlsx"
 *
 * Install dependency first:
 *   npm install xlsx
 *
 * Output:
 *   - Console summary grouped by day → shift → machine
 *   - schedule-dressings.json saved next to the Excel file
 */

const XLSX = require("xlsx");
const fs   = require("fs");
const path = require("path");

// ─── Confirmed layout (from actual file inspection) ───────────────────────────
//
// Row 0: capacity totals (skip)
// Row 1: machine codes & names  → col 4=RTO, col 7=Line A, col 10=Line B,
//                                  col 13=Line C1, col 16=Mespack, col 19=Volpak,
//                                  col 22=Linear Doy, col 25=Boatopack 1&2,
//                                  col 28=Boatopack 2, col 31=Akash Halal,
//                                  col 34=Ilapak, col 37=Line 1, col 40=Line 2,
//                                  col 43=Akash NH, col 46=SERAC/Fryma,
//                                  col 49=FRYMA/ALLFILL
// Row 2: column headers → repeating pattern: Size | Sku | Qty  (every 3 cols from col 3)
// Row 3+: data rows in groups of 3:
//   Row N   : date | day_name | shift  (label row — date always present)
//   Row N+1 : date | tonnage  | shift  (data row — has Size/Sku/Qty values)
//   Row N+2 : date | null     | shift  (blank row — skip)

// ─── Helper: timezone-safe date string ───────────────────────────────────────
//
// FIX: The original code used dateRaw.toISOString().split("T")[0] which returns
// a UTC date string. In UTC+8 (Philippine time), Excel's "2026-04-06 00:00:00
// local" is stored as "2026-04-05T16:00:00Z" in UTC — causing every date to be
// off by one day (e.g. April 6 appears as April 5 in the JSON output).
//
// Solution: always extract the date using LOCAL time getters (getFullYear,
// getMonth, getDate) instead of the UTC-based toISOString().

function toLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseProductionPlan(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });

  if (!workbook.SheetNames.includes("Production PLan")) {
    throw new Error(
      '"Production PLan" sheet not found. Available: ' + workbook.SheetNames.join(", ")
    );
  }

  const sheet = workbook.Sheets["Production PLan"];
  const raw   = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw:    false,   // parse dates as strings
  });

  // Re-read with raw:true to get proper Date objects and numbers
  const rawData = XLSX.utils.sheet_to_json(
    workbook.Sheets["Production PLan"],
    { header: 1, defval: null, raw: true }
  );

  // ── Step 1: Auto-detect machine columns from row 1 ──
  // Row 2 (index 2) has repeating "Size | Sku | Qty" headers.
  // Wherever row2[c] === "Sku", that column is the SKU column for a machine.
  // The machine name is in row1 at c-1 or c-2 (the non-code, non-underscore string).

  const row1 = rawData[1] || [];
  const row2 = rawData[2] || [];

  const machineColumns = []; // { name, sizeCol, skuCol, qtyCol }

  for (let c = 0; c < row2.length; c++) {
    if (row2[c] === "Sku") {
      // Find machine name in row1 near this column
      let machineName = null;
      for (let back = c; back >= Math.max(0, c - 3); back--) {
        const v = row1[back];
        if (v && typeof v === "string" && !v.startsWith("_")) {
          machineName = v.trim();
          break;
        }
      }
      machineColumns.push({
        name:    machineName || `Machine@col${c}`,
        sizeCol: c - 1,
        skuCol:  c,
        qtyCol:  c + 1,
      });
    }
  }

  // ── Step 2: Parse data rows ──
  // Each shift block = 3 consecutive rows sharing the same date & shift label.
  // Row pattern:  [label_row, data_row, blank_row]
  // label_row: col0=Date, col1=day_name(string), col2=shift
  // data_row:  col0=Date, col1=tonnage(number),  col2=shift, then Size/Sku/Qty per machine

  const records = [];
  let lastDate    = null;
  let lastDayName = null;
  let i = 3; // skip the 3 header rows

  while (i < rawData.length) {
    const labelRow = rawData[i];
    if (!labelRow || labelRow[0] == null) { i++; continue; }

    // col0 must be a date
    const dateRaw = labelRow[0];
    let dateStr = null;

    if (dateRaw instanceof Date) {
      // FIX: use local time getters instead of toISOString() (which is UTC-based).
      // toISOString() was causing a -1 day shift in UTC+8 (Philippine timezone).
      dateStr = toLocalDateStr(dateRaw);
    } else if (typeof dateRaw === "number") {
      // XLSX serial date — parse_date_code is timezone-neutral, safe to use directly
      const d = XLSX.SSF.parse_date_code(dateRaw);
      dateStr = `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`;
    } else if (typeof dateRaw === "string" && dateRaw.match(/\d{4}-\d{2}-\d{2}/)) {
      dateStr = dateRaw.substring(0, 10);
    } else {
      i++; continue;
    }

    // col1: if it's a string it's the day name (Mon/Tue/...), if number it's tonnage
    if (typeof labelRow[1] === "string") {
      lastDayName = labelRow[1].trim();
    }
    lastDate = dateStr;

    const shiftLabel = labelRow[2] ? String(labelRow[2]).trim() : "";

    // The data is on the NEXT row (i+1)
    const dataRow = rawData[i + 1] || [];

    for (const mc of machineColumns) {
      const sku  = dataRow[mc.skuCol];
      const qty  = dataRow[mc.qtyCol];
      const size = dataRow[mc.sizeCol];

      if (!sku || qty == null) continue;

      const qtyNum = parseFloat(qty);
      if (isNaN(qtyNum) || qtyNum <= 0) continue;

      records.push({
        machine:  mc.name,
        date:     dateStr,
        day_name: lastDayName || "",
        shift:    shiftLabel,
        size:     size != null ? String(size).trim() : null,
        sku:      String(sku).trim(),
        qty:      Math.round(qtyNum),
      });
    }

    i += 3; // jump to next shift block
  }

  return records;
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

/**
 * Groups flat records into:
 * {
 *   "2026-04-06": {
 *     date: "2026-04-06",
 *     day_name: "Mon",
 *     total_qty: 12345,
 *     shifts: {
 *       "1st": { total_qty: 4000, machines: { "Line A": [...], ... } },
 *       "2nd": { ... },
 *       "3rd": { ... },
 *     }
 *   },
 *   ...
 * }
 */
function groupByDay(records) {
  const grouped = {};

  for (const rec of records) {
    const { date, day_name, shift } = rec;

    if (!grouped[date]) {
      grouped[date] = { date, day_name, total_qty: 0, shifts: {} };
    }
    if (!grouped[date].shifts[shift]) {
      grouped[date].shifts[shift] = { total_qty: 0, machines: {} };
    }
    if (!grouped[date].shifts[shift].machines[rec.machine]) {
      grouped[date].shifts[shift].machines[rec.machine] = [];
    }

    grouped[date].total_qty += rec.qty;
    grouped[date].shifts[shift].total_qty += rec.qty;
    grouped[date].shifts[shift].machines[rec.machine].push(rec);
  }

  return grouped;
}

// ─── Console Summary ──────────────────────────────────────────────────────────

function printSummary(grouped) {
  const SEP  = "═".repeat(70);
  const sep2 = "─".repeat(70);

  console.log(`\n${SEP}`);
  console.log("  PRODUCTION PLAN SCHEDULE");
  console.log(SEP);

  for (const [date, day] of Object.entries(grouped)) {
    console.log(`\n  📅  ${date}  (${day.day_name})   Total qty: ${day.total_qty.toLocaleString()}`);
    console.log("  " + sep2);

    for (const [shiftLabel, shiftData] of Object.entries(day.shifts)) {
      console.log(`\n    [ ${shiftLabel.toUpperCase()} SHIFT ]   qty: ${shiftData.total_qty.toLocaleString()}`);
      for (const [machineName, items] of Object.entries(shiftData.machines)) {
        for (const item of items) {
          console.log(
            `      ${machineName.padEnd(20)} size=${String(item.size || "").padEnd(6)}` +
            `  ${item.sku.padEnd(25)}  qty=${String(item.qty).padStart(5)}`
          );
        }
      }
    }
  }

  console.log(`\n${SEP}\n`);
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node parse-production-plan-dressings.js "<path-to-excel.xlsx>"');
    process.exit(1);
  }

  const filePath   = path.resolve(args[0]);
  const outputPath = path.join(path.dirname(filePath), "schedule-dressings.json");

  console.log(`\nParsing: ${filePath}`);

  let records;
  try {
    records = parseProductionPlan(filePath);
  } catch (err) {
    console.error("Failed to parse file:", err.message);
    process.exit(1);
  }

  const grouped = groupByDay(records);

  printSummary(grouped);

  // Collect summary stats
  const machines = [...new Set(records.map(r => r.machine))].sort();
  const dates    = [...new Set(records.map(r => r.date))].sort();

  const output = {
    generated_at:  new Date().toISOString(),
    source_file:   path.basename(filePath),
    total_records: records.length,
    dates,
    machines,
    // Flat list — ready for DB inserts / API payloads
    flat: records,
    // Grouped: date → shift → machine
    by_day: grouped,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`✅  Saved to: ${outputPath}`);
  console.log(`    Total records : ${records.length}`);
  console.log(`    Dates covered : ${dates.join(", ")}`);
  console.log(`    Machines found: ${machines.join(", ")}\n`);
}

if (require.main === module) {
  main();
}

// ─── Module exports ───────────────────────────────────────────────────────────

module.exports = { parseProductionPlan, groupByDay };