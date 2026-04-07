/**
 * parse-production-plan.js
 *
 * Parses the "DPP" sheet from the Weekly Production Plan Excel file.
 * Extracts schedules from both sections:
 *   - WEEKLY PRODUCTION PLAN - RETAIL (CUBES)
 *   - WEEKLY PRODUCTION PLAN - RETAIL (POWDERS)
 *
 * Usage:
 *   node parse-production-plan.js "C:\Users\UNILEVER\Downloads\WEEK 13 DPP rev 01.xlsx"
 *
 * Install dependency first:
 *   npm install xlsx
 *
 * Output:
 *   - Console summary grouped by section → day → shift
 *   - schedule-output.json saved next to the Excel file
 */

const XLSX = require("xlsx");
const fs   = require("fs");
const path = require("path");

// ─── Confirmed layout (from actual file inspection) ───────────────────────────
//
// CUBES section
//   Row 0  : "WEEKLY PRODUCTION PLAN - RETAIL (CUBES)"
//   Row 6  : Date headers  → col 9=Mon, 12=Tue, 15=Wed, 18=Thu, 21=Fri, 24=Sat, 27=Sun
//   Row 7  : Day names     → MON / TUE / WED / THU / FRI / SAT / SUN
//   Row 8  : Column labels → MACHINE(0) PRODUCT(1) FOIL(2) ROUTING(3) SKU_CODE(4)
//                            SKU_DESC(5) VARIANT(6) TOTAL_CS(7) BATCHES(8)
//                            then shifts starting at col 9
//   Row 9–44: Data rows
//
// POWDERS section
//   Row 45 : "WEEKLY PRODUCTION PLAN - RETAIL (POWDERS)"
//   Row 51 : Date headers  → same column layout as CUBES
//   Row 52 : Day names
//   Row 53 : Column labels
//   Row 54–85: Data rows

const SECTIONS = [
  {
    name:         "CUBES",
    title:        "WEEKLY PRODUCTION PLAN - RETAIL (CUBES)",
    date_row:     6,
    data_start:   9,
    data_end:     44,
  },
  {
    name:         "POWDERS",
    title:        "WEEKLY PRODUCTION PLAN - RETAIL (POWDERS)",
    date_row:     55,
    data_start:   58,
    data_end:     90,
  },
];

// Fixed column indices (same for both sections)
const COL = {
  MACHINE:     0,
  PRODUCT:     1,
  FOIL:        2,
  ROUTING:     3,
  SKU_CODE:    4,
  SKU_DESC:    5,
  VARIANT:     6,
  TOTAL_CS:    7,
  BATCHES:     8,
  FIRST_SHIFT: 9,   // Mon 1ST — shifts repeat every 3 cols for 7 days
};

// The 7 dates start at col 9, 12, 15, 18, 21, 24, 27 (every 3 cols)
const DAY_NAMES   = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const SHIFT_LABELS = ["1ST", "2ND", "3RD"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// FIX: The original toISODate() used d.toISOString().split("T")[0] which is
// UTC-based. In UTC+8 (Philippine time), Excel's midnight local date is stored
// as 4:00 PM the previous day in UTC — causing every date to appear 1 day
// behind in the output (e.g. April 6 → April 5).
//
// Solution: extract the date using LOCAL time getters (getFullYear, getMonth,
// getDate) so the timezone offset is never applied.

function toLocalDateStr(d) {
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toISODate(val) {
  if (!val) return null;
  // xlsx returns dates as JS Date objects (when cellDates:true) or serial numbers
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) return null;
  // FIX: was d.toISOString().split("T")[0] — off by 1 day in UTC+8
  return toLocalDateStr(d);
}

function isNumeric(val) {
  return val !== null && val !== undefined && val !== "" && !isNaN(Number(val));
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseSheet(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: true, dense: false });

  if (!workbook.SheetNames.includes("DPP")) {
    throw new Error('Sheet "DPP" not found. Available sheets: ' + workbook.SheetNames.join(", "));
  }

  const sheet = workbook.Sheets["DPP"];

  // Convert sheet to 2D array (rows × cols), values only
  const range  = XLSX.utils.decode_range(sheet["!ref"]);
  const maxRow = range.e.r;
  const maxCol = range.e.c;

  function cell(r, c) {
    const addr = XLSX.utils.encode_cell({ r, c });
    const node = sheet[addr];
    if (!node) return null;
    // Use .v (raw value), but for dates use .w or the Date object from cellDates
    if (node.t === "d") return node.v; // Date object
    return node.v ?? null;
  }

  const allRecords = [];

  for (const section of SECTIONS) {
    // Extract the 7 dates from the date row
    const dates = DAY_NAMES.map((_, d) => {
      const val = cell(section.date_row, COL.FIRST_SHIFT + d * 3);
      return toISODate(val);
    });
  console.log(dates);

    let lastMachine = null;

    for (let r = section.data_start; r <= section.data_end; r++) {
      const machine  = cell(r, COL.MACHINE);
      const skuCode  = cell(r, COL.SKU_CODE);
      const skuDesc  = cell(r, COL.SKU_DESC);
      const variant  = cell(r, COL.VARIANT);
      const totalCs  = cell(r, COL.TOTAL_CS);
      const batches  = cell(r, COL.BATCHES);

      // Skip rows with no SKU (blank or "NO PLAN" rows)
      if (!skuCode || String(skuDesc).trim() === "NO PLAN") continue;

      // Carry forward machine name across merged cells
      if (machine) lastMachine = String(machine).trim();

      // Iterate each day × shift
      for (let d = 0; d < 7; d++) {
        for (let s = 0; s < 3; s++) {
          const col = COL.FIRST_SHIFT + d * 3 + s;
          const qty = cell(r, col);

          // Only include cells with a real numeric quantity
          if (!isNumeric(qty) || Number(qty) === 0) continue;

          allRecords.push({
            section:     section.name,
            machine:     lastMachine || "",
            sku_code:    String(skuCode).trim(),
            description: String(skuDesc).trim(),
            variant:     String(variant || "").trim(),
            total_cs:    isNumeric(totalCs) ? Number(totalCs) : null,
            batches:     isNumeric(batches) ? Math.round(Number(batches) * 100) / 100 : null,
            date:        dates[d],
            day_name:    DAY_NAMES[d],
            shift:       s + 1,
            shift_label: SHIFT_LABELS[s],
            qty_cs:      Math.round(Number(qty)), // round formula results like =111*7
          });
        }
      }
    }
  }

  return allRecords;
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

function groupSchedule(records) {
  // Top level: by section (CUBES / POWDERS)
  // Then by date, then by shift
  const result = {};

  for (const rec of records) {
    const { section, date, day_name, shift_label } = rec;
    if (!date) continue;

    if (!result[section]) result[section] = {};

    if (!result[section][date]) {
      result[section][date] = {
        date,
        day_name,
        total_qty_cs: 0,
        shifts: { "1ST": [], "2ND": [], "3RD": [] },
        by_machine: {},
      };
    }

    const day = result[section][date];
    day.total_qty_cs += rec.qty_cs;
    day.shifts[shift_label].push(rec);

    if (!day.by_machine[rec.machine]) day.by_machine[rec.machine] = [];
    day.by_machine[rec.machine].push(rec);
  }

  return result;
}

// ─── Console Summary ──────────────────────────────────────────────────────────

function printSummary(grouped) {
  const SEP  = "═".repeat(65);
  const sep2 = "─".repeat(65);

  for (const [sectionName, days] of Object.entries(grouped)) {
    console.log(`\n${SEP}`);
    console.log(`  WEEKLY PRODUCTION PLAN - RETAIL (${sectionName})`);
    console.log(SEP);

    for (const [date, day] of Object.entries(days)) {
      console.log(`\n  📅  ${date}  (${day.day_name})   Total: ${day.total_qty_cs.toLocaleString()} CS`);
      console.log("  " + sep2);

      for (const [shiftLabel, items] of Object.entries(day.shifts)) {
        if (items.length === 0) continue;
        console.log(`\n    [ ${shiftLabel} SHIFT ]`);
        for (const item of items) {
          const desc = item.description.substring(0, 35).padEnd(36);
          console.log(
            `      ${item.machine.padEnd(12)} ${item.sku_code.padEnd(11)} ` +
            `${desc}  ${String(item.qty_cs).padStart(5)} CS`
          );
        }
      }
    }

    console.log("");
  }
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node parse-production-plan.js "<path-to-excel.xlsx>"');
    process.exit(1);
  }

  const filePath   = path.resolve(args[0]);
  const outputPath = path.join(path.dirname(filePath), "schedule-output.json");

  console.log(`\nParsing: ${filePath}`);

  let records;
  try {
    records = parseSheet(filePath);
  } catch (err) {
    console.error("Failed to parse file:", err.message);
    process.exit(1);
  }

  const grouped = groupSchedule(records);

  printSummary(grouped);

  // Build output JSON
  const output = {
    generated_at:  new Date().toISOString(),
    source_file:   path.basename(filePath),
    total_records: records.length,
    sections: {
      CUBES:   { dates: Object.keys(grouped.CUBES   || {}) },
      POWDERS: { dates: Object.keys(grouped.POWDERS || {}) },
    },
    // Flat list — best for DB inserts / API payloads
    flat: records,
    // Grouped: section → date → { shifts, by_machine }
    by_section_and_day: grouped,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n✅  Saved to: ${outputPath}`);
  console.log(`    CUBES records:   ${records.filter(r => r.section === "CUBES").length}`);
  console.log(`    POWDERS records: ${records.filter(r => r.section === "POWDERS").length}`);
  console.log(`    Total:           ${records.length}\n`);
}

if (require.main === module) {
  main();
}

// ─── Module exports ───────────────────────────────────────────────────────────

module.exports = { parseSheet, groupSchedule };