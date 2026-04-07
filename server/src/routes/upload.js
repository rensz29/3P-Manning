const router = require("express").Router();
const { z } = require("zod");
const { catchAsync, AppError } = require("../utils/errors.js");
const { sendSuccess } = require("../utils/response.js");
const multer = require("multer");
const XLSX = require("xlsx");
const fs = require("fs");
const os = require("os");
const path = require("path");
const dressings = require('../models/scheduleDressingSchema.js');
const savoury = require('../models/scheduleSavourySchema.js');
const { parseSheet: parseSavouryPlan } = require("../parser/parse-production-plan-savoury.js");
const { parseProductionPlan: parseDressingsPlan } = require("../parser/parse-production-plan-dressings.js");
const upload = multer({ storage: multer.memoryStorage() });

const scheduleQuerySchema = z.object({
  tab: z.enum(['dressings', 'savoury']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  shift: z.coerce.number().int().min(1).max(3).optional(),
});

function getCurrentShift() {
  const h = new Date().getHours();
  if (h >= 6 && h < 14) return 1;
  if (h >= 14 && h < 22) return 2;
  return 3;
}

function formatDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseShift(raw) {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (raw >= 1 && raw <= 3) return Math.trunc(raw);
  }
  const s = String(raw ?? "").toLowerCase().trim();
  if (s.startsWith("1")) return 1;
  if (s.startsWith("2")) return 2;
  if (s.startsWith("3")) return 3;
  return 0;
}

function normalizeKey(k) {
  return String(k ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeObjKeys(row) {
  const out = {};
  Object.keys(row ?? {}).forEach((k) => {
    out[normalizeKey(k)] = row[k];
  });
  return out;
}

function pick(row, keys = []) {
  for (const k of keys) {
    const v = row[normalizeKey(k)];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return null;
}

function toYmd(value) {
  if (value == null || value === "") return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = XLSX.SSF.parse_date_code(value);
    if (!d) return "";
    const y = d.y;
    const m = String(d.m).padStart(2, "0");
    const day = String(d.d).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dt = new Date(s);
  if (!Number.isNaN(dt.getTime())) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return s;
}

function toNumber(value) {
  if (value == null || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function detectFormatFromRows(rows) {
  if (!rows.length) return "unknown";
  let hasSavoury = false;
  let hasDressings = false;
  rows.forEach((r) => {
    if (pick(r, ["sku_code", "qty_cs", "variant", "section"])) hasSavoury = true;
    if (pick(r, ["size", "sku", "qty"])) hasDressings = true;
  });
  if (hasSavoury && hasDressings) return "mixed";
  if (hasSavoury) return "savoury";
  if (hasDressings) return "dressings";
  return "unknown";
}

function normalizeExcelRows(rawRows) {
  const keyed = rawRows.map(normalizeObjKeys);
  const detectedFormat = detectFormatFromRows(keyed);

  const rows = keyed.map((r) => {
    const rowLooksSavoury = pick(r, ["sku_code", "qty_cs", "variant", "section"]) != null;
    const rowLooksDressings = pick(r, ["size", "sku", "qty"]) != null;

    if (rowLooksSavoury) {
      return {
        section: String(pick(r, ["section"]) ?? "SAVOURY").trim(),
        machine: String(pick(r, ["machine", "line", "lineid"]) ?? "").trim(),
        sku: String(pick(r, ["sku_code", "sku"]) ?? "").trim(),
        description: String(pick(r, ["description"]) ?? "").trim(),
        date: toYmd(pick(r, ["date"])),
        day_name: String(pick(r, ["day_name", "day"]) ?? "").toUpperCase().slice(0, 3),
        shift: parseShift(pick(r, ["shift", "shift_label"])),
        qty: toNumber(pick(r, ["qty_cs", "qty"])),
        variant: String(pick(r, ["variant"]) ?? "").trim(),
        total_cs: toNumber(pick(r, ["total_cs"])),
        batches: toNumber(pick(r, ["batches"])),
      };
    }

    if (rowLooksDressings) {
      return {
        section: "DRESSINGS",
        machine: String(pick(r, ["machine", "line", "lineid"]) ?? "").trim(),
        sku: String(pick(r, ["sku", "sku_code"]) ?? "").trim(),
        description: String(pick(r, ["description"]) ?? "").trim() || (pick(r, ["size"]) != null ? `Size ${pick(r, ["size"])}` : ""),
        date: toYmd(pick(r, ["date"])),
        day_name: String(pick(r, ["day_name", "day"]) ?? "").toUpperCase().slice(0, 3),
        shift: parseShift(pick(r, ["shift", "shift_label"])),
        qty: toNumber(pick(r, ["qty", "qty_cs"])),
        variant: String(pick(r, ["variant"]) ?? "").trim(),
        total_cs: null,
        batches: null,
      };
    }

    return {
      section: String(pick(r, ["section"]) ?? "UNKNOWN").trim(),
      machine: String(pick(r, ["machine", "line", "lineid"]) ?? "").trim(),
      sku: String(pick(r, ["sku_code", "sku"]) ?? "").trim(),
      description: String(pick(r, ["description", "size"]) ?? "").trim(),
      date: toYmd(pick(r, ["date"])),
      day_name: String(pick(r, ["day_name", "day"]) ?? "").toUpperCase().slice(0, 3),
      shift: parseShift(pick(r, ["shift", "shift_label"])),
      qty: toNumber(pick(r, ["qty_cs", "qty"])),
      variant: String(pick(r, ["variant"]) ?? "").trim(),
      total_cs: null,
      batches: null,
    };
  }).filter((r) => r.machine && r.shift >= 1 && r.shift <= 3 && r.date);

  return { detectedFormat, rows };
}

function detectPlanTypeFromWorkbook(workbook) {
  if (workbook.SheetNames.includes("DPP")) return "savoury";
  if (workbook.SheetNames.includes("Production PLan")) return "dressings";
  return "unknown";
}

function normalizeFromScriptRows(type, rows) {
  if (type === "savoury") {
    return rows.map((r) => ({
      section: String(r.section ?? "SAVOURY").trim(),
      machine: String(r.machine ?? "").trim(),
      sku: String(r.sku_code ?? r.sku ?? "").trim(),
      description: String(r.description ?? "").trim(),
      date: String(r.date ?? "").trim(),
      day_name: String(r.day_name ?? "").toUpperCase().slice(0, 3),
      shift: Number(r.shift ?? 0),
      qty: toNumber(r.qty_cs ?? r.qty ?? 0),
      variant: String(r.variant ?? "").trim(),
      total_cs: r.total_cs ?? null,
      batches: r.batches ?? null,
    })).filter((r) => r.machine && r.date && r.shift >= 1 && r.shift <= 3);
  }

  if (type === "dressings") {
    return rows.map((r) => ({
      section: "DRESSINGS",
      machine: String(r.machine ?? "").trim(),
      sku: String(r.sku ?? "").trim(),
      description: r.size != null ? `Size ${String(r.size).trim()}` : "",
      date: String(r.date ?? "").trim(),
      day_name: String(r.day_name ?? "").toUpperCase().slice(0, 3),
      shift: parseShift(r.shift),
      qty: toNumber(r.qty ?? 0),
      variant: "",
      total_cs: null,
      batches: null,
    })).filter((r) => r.machine && r.date && r.shift >= 1 && r.shift <= 3);
  }

  return [];
}

// const listSchema = z.object({
//   lineID:  z.string().min(1).max(200).trim(),
//   SKU_Running: z.string().min(1).max(200).trim(),
//   CL_Destination_Desc: z.string().min(1).max(200).trim(),
//   CL_Destination:z.number().int().nonnegative().default(0),
//   ESM_HT_Level:z.number().int().nonnegative().default(0),
// });

// ── Handlers ──────────────────────────────────────────────────────────────────

router.post("/", catchAsync(async (req, res) => {
  const { format, records } = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    throw new AppError("No records provided", 400);
  }
  if (format === "dressings") {
    await dressings.insertMany(records);
  } else {
    await savoury.insertMany(records);
  }
  sendSuccess(res, { saved_rows: records.length }, 201);
}));

router.post(
  "/preview-excel",
  upload.single("file"),
  catchAsync(async (req, res) => {
    if (!req.file?.buffer) throw new AppError("Excel file is required", 400);
    const wb = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
    const firstSheetName = wb.SheetNames[0];
    if (!firstSheetName) throw new AppError("No worksheet found", 400);

    const detectedFormat = detectPlanTypeFromWorkbook(wb);
    let rows = [];

    if (detectedFormat === "savoury" || detectedFormat === "dressings") {
      // Use the exact user-provided parser scripts (path-based parsers).
      const ext = path.extname(req.file.originalname || ".xlsx") || ".xlsx";
      const tempPath = path.join(
        os.tmpdir(),
        `upload-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
      );
      try {
        fs.writeFileSync(tempPath, req.file.buffer);
        const parsed = detectedFormat === "savoury"
          ? parseSavouryPlan(tempPath)
          : parseDressingsPlan(tempPath);
        rows = normalizeFromScriptRows(detectedFormat, parsed);
      } finally {
        try { fs.unlinkSync(tempPath); } catch (_) {}
      }
    } else {
      // Fallback for unknown workbook types.
      const ws = wb.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });
      if (!rawRows.length) throw new AppError("No rows found in worksheet", 400);
      rows = normalizeExcelRows(rawRows).rows;
    }

    if (!rows.length) {
      throw new AppError("No valid schedule rows parsed from excel file", 400);
    }

    sendSuccess(
      res,
      {
        filename: req.file.originalname,
        sheet: firstSheetName,
        detectedFormat,
        count: rows.length,
        rows,
      },
      200
    );
  })
);

router.get(
  "/schedule",
  catchAsync(async (req, res) => {
    const parsed = scheduleQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError("Invalid schedule query parameters", 400);
    }

    const { tab } = parsed.data;
    const date = parsed.data.date ?? formatDate();
    const shift = parsed.data.shift ?? getCurrentShift();

    let rows = [];
    if (tab === 'dressings') {
      rows = await dressings.find({ date, shift }).lean();
    } else {
      rows = await savoury.find({ date, shift }).lean();
    }

    sendSuccess(
      res,
      {
        filters: { tab, date, shift },
        count: rows.length,
        rows,
      },
      200
    );
  })
);

module.exports = router;
