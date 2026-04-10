const router = require("express").Router();
const { z } = require("zod");
const { catchAsync, AppError } = require("../utils/errors");
const { sendSuccess } = require("../utils/response");
const AssignmentSession = require("../models/assignmentSessionSchema");
const AssignmentDailyReport = require("../models/assignmentDailyReportSchema");
const ScheduleDressing = require("../models/scheduleDressingSchema");
const ScheduleSavoury = require("../models/scheduleSavourySchema");
const { getSession, saveSession } = require("../services/assignmentStore");
const { getIo, roomForDate } = require("../realtime/socket");
const { getPool } = require('../config/pg');

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const getSchema = z.object({ date: dateSchema });

const upsertSchema = z.object({
  date: dateSchema,
  assignments: z.record(z.string(), z.any()),
  employees: z.array(z.any()).optional(),
  actor: z
    .object({
      username: z.string().optional(),
      displayName: z.string().optional(),
      role: z.enum(["admin", "user"]).optional(),
    })
    .optional(),
});

const submitSchema = z.object({
  date: dateSchema,
  actor: z.object({
    username: z.string().optional(),
    displayName: z.string().optional(),
    role: z.enum(["admin", "user"]),
  }),
  assignments: z.record(z.string(), z.any()).optional(),
  employees: z.array(z.any()).optional(),
  requiredBySkuShift: z.record(z.string(), z.coerce.number().int().min(0)).default({}),
});

const approveSchema = z.object({
  date: dateSchema,
  actor: z.object({
    username: z.string().optional(),
    displayName: z.string().optional(),
    role: z.enum(["admin", "user"]),
  }),
  excessSnapshot: z
    .object({
      currentShift: z.coerce.number().int().min(1).max(3).optional(),
      totalExcess: z.coerce.number().int().min(0).optional(),
      perShift: z.record(z.string(), z.coerce.number().int().min(0)).optional(),
      excessEmployees: z.array(z.any()).optional(),
    })
    .optional(),
});

const SHIFT_DEFINITIONS = {
  1: { shiftId: 1, label: "Shift 1", timeRange: "06:00-14:00", hours: 8 },
  2: { shiftId: 2, label: "Shift 2", timeRange: "14:00-22:00", hours: 8 },
  3: { shiftId: 3, label: "Shift 3", timeRange: "22:00-06:00", hours: 8 },
};

const EMPLOYEE_NAMES = [
  "Ana Reyes", "Ben Torres", "Carlo Musa", "Diana Santos", "Edwin Perez",
  "Faye Lim", "Greg Ordo", "Hannah Kim", "Ivan Cruz", "Jana Bato",
  "Karl Nilo", "Lena Franco", "Marco Vera", "Nina Quito", "Oscar Dela",
  "Pia Waldo", "Rex Javier", "Sara Ureta", "Tom Hizon", "Uma Xiao",
  "Victor Yap", "Wanda Zapata",
];

const RATE_CARD = {
  Supervisor: { dayPerHour: 81.25, nightPerHour: 89.38 },
  "Team Lead": { dayPerHour: 80, nightPerHour: 88 },
  "Forklift Operator": { dayPerHour: 86.82, nightPerHour: 95.5 },
  "RT Operator": { dayPerHour: 86.82, nightPerHour: 95.5 },
  "CB Operator": { dayPerHour: 86.82, nightPerHour: 95.5 },
  "FG Support": { dayPerHour: 86.82, nightPerHour: 95.5 },
  "ICA support": { dayPerHour: 89.81, nightPerHour: 98.79 },
  "Chem Tech": { dayPerHour: 196.57, nightPerHour: 216.23 },
  Palletizer: { dayPerHour: 68.86, nightPerHour: 75.74 },
  SAP: { dayPerHour: 75, nightPerHour: 82.5 },
  "QA Support": { dayPerHour: 84.49, nightPerHour: 92.93 },
  "Safety Marshal": { dayPerHour: 100, nightPerHour: 110 },
  "Engineering Support": { dayPerHour: 87.5, nightPerHour: 96.25 },
  "EOL Palletizer": { dayPerHour: 75, nightPerHour: 82.5 },
  "Material Requestor": { dayPerHour: 75, nightPerHour: 82.5 },
  "Waste Disposal": { dayPerHour: 75, nightPerHour: 82.5 },
  "Pallet Washer": { dayPerHour: 75, nightPerHour: 82.5 },
  "Filling Line Support": { dayPerHour: 75, nightPerHour: 82.5 },
  "Process Line Support": { dayPerHour: 75, nightPerHour: 82.5 },
};

const ROLE_PROFILES = [
  { role: "Supervisor", site: "Dressings", area: "Production", company: "HRTA" },
  { role: "Team Lead", site: "Savoury", area: "Production", company: "HRTA" },
  { role: "Forklift Operator", site: "Dressings", area: "Warehouse", company: "PCL" },
  { role: "RT Operator", site: "Savoury", area: "Warehouse", company: "PCL" },
  { role: "CB Operator", site: "Dressings", area: "Warehouse", company: "PCL" },
  { role: "FG Support", site: "Savoury", area: "Warehouse", company: "PCL" },
  { role: "ICA support", site: "Dressings", area: "Warehouse", company: "PCL" },
  { role: "Chem Tech", site: "Dressings", area: "Others", company: "PCL" },
  { role: "Palletizer", site: "Savoury", area: "Warehouse", company: "PCL" },
  { role: "SAP", site: "Dressings", area: "Warehouse", company: "HRTA" },
  { role: "QA Support", site: "Savoury", area: "Others", company: "HRTA" },
  { role: "Safety Marshal", site: "Dressings", area: "Others", company: "HRTA" },
  { role: "Engineering Support", site: "Dressings", area: "Others", company: "HRTA" },
  { role: "EOL Palletizer", site: "Savoury", area: "Warehouse", company: "HRTA" },
  { role: "Material Requestor", site: "Savoury", area: "Warehouse", company: "HRTA" },
  { role: "Waste Disposal", site: "Savoury", area: "Warehouse", company: "HRTA" },
  { role: "Pallet Washer", site: "Dressings", area: "Warehouse", company: "HRTA" },
  { role: "Filling Line Support", site: "Dressings", area: "Production", company: "HRTA" },
  { role: "Process Line Support", site: "Savoury", area: "Production", company: "HRTA" },
];

const EMPLOYEE_CATALOG = new Map(
  EMPLOYEE_NAMES.map((name, i) => {
    const id = `emp-${i + 1}`;
    const profile = ROLE_PROFILES[i % ROLE_PROFILES.length];
    return [
      id,
      {
        id,
        name,
        ...profile,
        rates: RATE_CARD[profile.role] ?? { dayPerHour: 0, nightPerHour: 0 },
      },
    ];
  })
);

function normalizeEmployeesForAssignments(assignments, employees = []) {
  const employeeMap = new Map((employees ?? []).map((e) => [String(e.id), e]));
  const ids = new Set();
  for (const byShift of Object.values(assignments ?? {})) {
    for (const empIds of Object.values(byShift ?? {})) {
      for (const id of Array.isArray(empIds) ? empIds : []) ids.add(String(id));
    }
  }
  return [...ids].map((id) => {
    const existing = employeeMap.get(id);
    const fallback = EMPLOYEE_CATALOG.get(id);
    if (existing) {
      return {
        id,
        name: existing.name ?? fallback?.name ?? id,
        role: existing.role ?? fallback?.role ?? "",
        site: existing.site ?? fallback?.site ?? "",
        area: existing.area ?? fallback?.area ?? "",
        company: existing.company ?? fallback?.company ?? "",
        rates: {
          dayPerHour: Number(existing?.rates?.dayPerHour ?? fallback?.rates?.dayPerHour ?? 0),
          nightPerHour: Number(existing?.rates?.nightPerHour ?? fallback?.rates?.nightPerHour ?? 0),
        },
      };
    }
    if (fallback) return fallback;
    return {
      id,
      name: id,
      role: "",
      site: "",
      area: "",
      company: "",
      rates: { dayPerHour: 0, nightPerHour: 0 },
    };
  });
}

function emitSessionUpdated(date, session) {
  const io = getIo();
  if (!io) return;
  io.to(roomForDate(date)).emit("assignment.session.updated", {
    date,
    session: {
      date: session.date,
      status: session.status,
      assignments: session.assignments ?? {},
      employees: session.employees ?? [],
      submittedBy: session.submittedBy ?? "",
      submittedAt: session.submittedAt ?? null,
      approvedBy: session.approvedBy ?? "",
      approvedAt: session.approvedAt ?? null,
      updatedAt: session.updatedAt ?? new Date().toISOString(),
    },
  });
}

function buildApprovedReport({ date, assignments, employees, requiredBySkuShift, scheduleDressings, scheduleSavoury, approvedBy, approvedAt, excessSnapshot }) {
  const employeeMap = new Map((employees ?? []).map((e) => [String(e.id), e]));
  const scheduleRows = [...(scheduleDressings ?? []), ...(scheduleSavoury ?? [])];
  const scheduleBySkuId = new Map(
    scheduleRows.map((r) => [`sch-${String(r._id)}`, r])
  );

  const details = [];
  let totalAssigned = 0;
  let totalDayCostPerHour = 0;
  let totalNightCostPerHour = 0;
  const perShift = {
    1: { ...SHIFT_DEFINITIONS[1], assignedHeadcount: 0, totalCostPerHour: 0, totalShiftCost: 0 },
    2: { ...SHIFT_DEFINITIONS[2], assignedHeadcount: 0, totalCostPerHour: 0, totalShiftCost: 0 },
    3: { ...SHIFT_DEFINITIONS[3], assignedHeadcount: 0, totalCostPerHour: 0, totalShiftCost: 0 },
  };

  for (const [skuId, byShift] of Object.entries(assignments ?? {})) {
    const schedule = scheduleBySkuId.get(skuId) || null;
    for (const [shiftKey, empIds] of Object.entries(byShift ?? {})) {
      const shiftId = Number(shiftKey);
      const ids = Array.isArray(empIds) ? empIds : [];
      const isNight = shiftId === 3;
      for (const empId of ids) {
        const employee = employeeMap.get(String(empId)) || { id: empId, name: String(empId) };
        const dayRate = Number(employee?.rates?.dayPerHour ?? 0);
        const nightRate = Number(employee?.rates?.nightPerHour ?? 0);
        const hourlyRate = isNight ? nightRate : dayRate;
        if (isNight) totalNightCostPerHour += hourlyRate;
        else totalDayCostPerHour += hourlyRate;
        if (perShift[shiftId]) {
          perShift[shiftId].assignedHeadcount += 1;
          perShift[shiftId].totalCostPerHour += hourlyRate;
        }
        totalAssigned += 1;
        details.push({
          skuId,
          shiftId,
          shiftLabel: SHIFT_DEFINITIONS[shiftId]?.label ?? `Shift ${shiftId}`,
          shiftTimeRange: SHIFT_DEFINITIONS[shiftId]?.timeRange ?? "",
          shiftHours: SHIFT_DEFINITIONS[shiftId]?.hours ?? 8,
          employeeId: employee.id,
          employeeName: employee.name,
          role: employee.role ?? "",
          site: employee.site ?? "",
          area: employee.area ?? "",
          company: employee.company ?? "",
          dayRatePerHour: dayRate,
          nightRatePerHour: nightRate,
          hourlyRate,
          shiftCost: hourlyRate * (SHIFT_DEFINITIONS[shiftId]?.hours ?? 8),
          assignmentLocation: schedule
            ? {
                section: schedule.section ?? "",
                machine: schedule.machine ?? "",
                sku: schedule.sku ?? "",
              }
            : null,
          schedule: schedule
            ? {
                section: schedule.section ?? "",
                machine: schedule.machine ?? "",
                sku: schedule.sku ?? "",
                description: schedule.description ?? "",
                qty: schedule.qty ?? 0,
                variant: schedule.variant ?? "",
              }
            : null,
        });
      }
    }
  }

  const totalRequired = Object.values(requiredBySkuShift ?? {}).reduce((s, n) => s + (Number(n) || 0), 0);
  const fillRatePct = totalRequired > 0 ? Math.round((totalAssigned / totalRequired) * 100) : 0;
  for (const shift of Object.values(perShift)) {
    shift.totalShiftCost = shift.totalCostPerHour * shift.hours;
  }
  const perShiftRows = [perShift[1], perShift[2], perShift[3]];
  const totalEstimatedDailyCost = perShiftRows.reduce((s, sh) => s + sh.totalShiftCost, 0);
  const excessByShift = { 1: 0, 2: 0, 3: 0 };
  if (excessSnapshot?.perShift) {
    for (const [k, v] of Object.entries(excessSnapshot.perShift)) {
      const sid = Number(k);
      if (sid >= 1 && sid <= 3) excessByShift[sid] = Number(v) || 0;
    }
  } else if (excessSnapshot?.currentShift && excessSnapshot?.totalExcess != null) {
    const sid = Number(excessSnapshot.currentShift);
    if (sid >= 1 && sid <= 3) excessByShift[sid] = Number(excessSnapshot.totalExcess) || 0;
  }
  const totalExcess = excessByShift[1] + excessByShift[2] + excessByShift[3];

  return {
    date,
    approvedBy,
    approvedAt,
    status: "approved",
    summary: {
      totalAssigned,
      totalRequired,
      fillRatePct,
      totalDayCostPerHour,
      totalNightCostPerHour,
      totalEstimatedDailyCost,
      perShift: perShiftRows,
      excessByShift: [
        { ...SHIFT_DEFINITIONS[1], excessCount: excessByShift[1] },
        { ...SHIFT_DEFINITIONS[2], excessCount: excessByShift[2] },
        { ...SHIFT_DEFINITIONS[3], excessCount: excessByShift[3] },
      ],
      totalExcess,
    },
    shiftDefinitions: [SHIFT_DEFINITIONS[1], SHIFT_DEFINITIONS[2], SHIFT_DEFINITIONS[3]],
    assignments,
    employees,
    schedule: {
      dressings: scheduleDressings ?? [],
      savoury: scheduleSavoury ?? [],
    },
    excessEmployees: excessSnapshot?.excessEmployees ?? [],
    assignmentDetails: details,
  };
}

router.get(
  "/session",
  catchAsync(async (req, res) => {
    const parsed = getSchema.safeParse(req.query);
    if (!parsed.success) throw new AppError("Invalid date", 400);

    const { date } = parsed.data;
    const session = await getSession(date);
    sendSuccess(res, {
      date,
      status: session?.status ?? "draft",
      assignments: session?.assignments ?? {},
      employees: session?.employees ?? [],
      submittedBy: session?.submittedBy ?? "",
      submittedAt: session?.submittedAt ?? null,
      approvedBy: session?.approvedBy ?? "",
      approvedAt: session?.approvedAt ?? null,
      updatedAt: session?.updatedAt ?? null,
    });
  })
);

router.put(
  "/session",
  catchAsync(async (req, res) => {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError("Invalid session payload", 400);

    const { date, assignments, employees } = parsed.data;
    const existing = await getSession(date);

    if (existing && (existing.status === "submitted" || existing.status === "approved")) {
      throw new AppError("Session is locked; cannot edit after submit/approve", 409);
    }

    const session = await saveSession(date, {
      date,
      assignments,
      employees: employees ?? existing?.employees ?? [],
      status: "draft",
      submittedBy: "",
      submittedAt: null,
      approvedBy: "",
      approvedAt: null,
    });

    emitSessionUpdated(date, session);
    sendSuccess(res, { date, status: session.status, assignments: session.assignments, source: "redis-or-memory" });
  })
);

router.post(
  "/submit",
  catchAsync(async (req, res) => {
    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError("Invalid submit payload", 400);
    const { date, actor, requiredBySkuShift, assignments: submittedAssignments, employees: submittedEmployees } = parsed.data;

    const session = await getSession(date);
    if (!session) throw new AppError("No assignment session found", 404);
    if (session.status === "approved") throw new AppError("Already approved", 409);

    // Prefer the submit payload snapshot to avoid races with debounced autosave.
    const assignments = submittedAssignments ?? session.assignments ?? {};
    // Validate headcount at shift level to avoid false negatives when
    // operators distribute manpower differently across SKUs in the same shift.
    const requiredByShift = {};
    for (const [key, required] of Object.entries(requiredBySkuShift)) {
      const [, shiftStr] = key.split("|");
      const shiftId = Number(shiftStr);
      requiredByShift[shiftId] = (requiredByShift[shiftId] ?? 0) + required;
    }

    const assignedByShift = {};
    for (const skuAssignments of Object.values(assignments)) {
      if (!skuAssignments || typeof skuAssignments !== "object") continue;
      for (const [shiftKey, empIds] of Object.entries(skuAssignments)) {
        const shiftId = Number(shiftKey);
        if (!Number.isFinite(shiftId)) continue;
        const count = Array.isArray(empIds) ? empIds.length : 0;
        assignedByShift[shiftId] = (assignedByShift[shiftId] ?? 0) + count;
      }
    }

    for (const [shiftKey, required] of Object.entries(requiredByShift)) {
      const shiftId = Number(shiftKey);
      const assignedCount = assignedByShift[shiftId] ?? 0;
      if (assignedCount < required) {
        throw new AppError(`Cannot submit: shift ${shiftId} requires ${required}, assigned ${assignedCount}`, 400);
      }
    }

    const normalizedEmployees = normalizeEmployeesForAssignments(
      assignments,
      submittedEmployees ?? session.employees ?? []
    );
    const updated = await saveSession(date, {
      ...session,
      assignments,
      employees: normalizedEmployees,
      status: "submitted",
      submittedBy: actor.displayName || actor.username || "unknown",
      submittedAt: new Date().toISOString(),
      approvedBy: "",
      approvedAt: null,
    });

    emitSessionUpdated(date, updated);
    sendSuccess(res, { date, status: updated.status, submittedBy: updated.submittedBy, submittedAt: updated.submittedAt, source: "redis-or-memory" });
  })
);

router.post(
  "/approve",
  catchAsync(async (req, res) => {
    const parsed = approveSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError("Invalid approve payload", 400);
    const { date, actor, excessSnapshot } = parsed.data;
    if (actor.role !== "admin") throw new AppError("Only admin can approve", 403);

    const session = await getSession(date);
    if (!session) throw new AppError("No assignment session found", 404);
    if (session.status !== "submitted") throw new AppError("Only submitted sessions can be approved", 409);

    const updated = await saveSession(date, {
      ...session,
      status: "approved",
      approvedBy: actor.displayName || actor.username || "admin",
      approvedAt: new Date().toISOString(),
    });

    // Persist final approved snapshot to Mongo for audit/history.
    await AssignmentSession.findOneAndUpdate(
      { date },
      { $set: updated },
      { upsert: true, new: true }
    );

    const [scheduleDressings, scheduleSavoury] = await Promise.all([
      ScheduleDressing.find({ date }).lean(),
      ScheduleSavoury.find({ date }).lean(),
    ]);
    const requiredBySkuShift = {};
    for (const row of [...scheduleDressings, ...scheduleSavoury]) {
      const skuId = `sch-${String(row._id)}`;
      requiredBySkuShift[`${skuId}|${Number(row.shift)}`] = Number(row.variant?.match(/\d+/)?.[0] ?? 1);
    }
    const normalizedEmployees = normalizeEmployeesForAssignments(
      updated.assignments ?? {},
      updated.employees ?? []
    );
    const reportDoc = buildApprovedReport({
      date,
      assignments: updated.assignments ?? {},
      employees: normalizedEmployees,
      requiredBySkuShift,
      scheduleDressings,
      scheduleSavoury,
      approvedBy: updated.approvedBy,
      approvedAt: updated.approvedAt,
      excessSnapshot,
    });
    await AssignmentDailyReport.findOneAndUpdate(
      { date },
      { $set: reportDoc },
      { upsert: true, new: true }
    );

    emitSessionUpdated(date, updated);
    sendSuccess(res, { date, status: updated.status, approvedBy: updated.approvedBy, approvedAt: updated.approvedAt, persisted: "mongo" });
  })
);

router.get(
  "/report",
  catchAsync(async (req, res) => {
    const parsed = getSchema.safeParse(req.query);
    if (!parsed.success) throw new AppError("Invalid date", 400);
    const { date } = parsed.data;
    const report = await AssignmentDailyReport.findOne({ date }).lean();
    if (!report) throw new AppError("No approved report found for date", 404);
    sendSuccess(res, report);
  })
);


router.get("/employees",
  catchAsync(async (req, res) => {
    try {
      const pool = getPool();
      const result = await pool.query(`
        SELECT *
        FROM hkvision.tbhikvision
        WHERE "PersonGroup" ILIKE '%HRTA%'
          AND "L_TID" = '1'
          AND "C_Date" = CURRENT_DATE
        ORDER BY "C_Time";
      `);
      console.log(result.rows)
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  }))

module.exports = router;

