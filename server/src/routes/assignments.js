const router = require("express").Router();
const { z } = require("zod");
const { catchAsync, AppError } = require("../utils/errors");
const { sendSuccess } = require("../utils/response");
const AssignmentSession = require("../models/assignmentSessionSchema");
const { getSession, saveSession } = require("../services/assignmentStore");
const { getIo, roomForDate } = require("../realtime/socket");

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const getSchema = z.object({ date: dateSchema });

const upsertSchema = z.object({
  date: dateSchema,
  assignments: z.record(z.string(), z.any()),
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
  requiredBySkuShift: z.record(z.string(), z.coerce.number().int().min(0)).default({}),
});

const approveSchema = z.object({
  date: dateSchema,
  actor: z.object({
    username: z.string().optional(),
    displayName: z.string().optional(),
    role: z.enum(["admin", "user"]),
  }),
});

function emitSessionUpdated(date, session) {
  const io = getIo();
  if (!io) return;
  io.to(roomForDate(date)).emit("assignment.session.updated", {
    date,
    session: {
      date: session.date,
      status: session.status,
      assignments: session.assignments ?? {},
      submittedBy: session.submittedBy ?? "",
      submittedAt: session.submittedAt ?? null,
      approvedBy: session.approvedBy ?? "",
      approvedAt: session.approvedAt ?? null,
      updatedAt: session.updatedAt ?? new Date().toISOString(),
    },
  });
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

    const { date, assignments } = parsed.data;
    const existing = await getSession(date);
    if (existing && (existing.status === "submitted" || existing.status === "approved")) {
      throw new AppError("Session is locked; cannot edit after submit/approve", 409);
    }

    const session = await saveSession(date, {
      date,
      assignments,
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
    const { date, actor, requiredBySkuShift } = parsed.data;

    const session = await getSession(date);
    if (!session) throw new AppError("No assignment session found", 404);
    if (session.status === "approved") throw new AppError("Already approved", 409);

    const assignments = session.assignments ?? {};
    for (const [key, required] of Object.entries(requiredBySkuShift)) {
      const [skuId, shiftStr] = key.split("|");
      const shiftId = Number(shiftStr);
      const assignedCount = (assignments?.[skuId]?.[shiftId] ?? []).length;
      if (assignedCount < required) {
        throw new AppError(`Cannot submit: ${skuId} shift ${shiftId} requires ${required}, assigned ${assignedCount}`, 400);
      }
    }

    const updated = await saveSession(date, {
      ...session,
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
    const { date, actor } = parsed.data;
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

    emitSessionUpdated(date, updated);
    sendSuccess(res, { date, status: updated.status, approvedBy: updated.approvedBy, approvedAt: updated.approvedAt, persisted: "mongo" });
  })
);

module.exports = router;

