const router = require("express").Router();
const { z } = require("zod");
const { catchAsync } = require("../utils/errors.js");
const { sendSuccess } = require("../utils/response.js");
const ManpowerLineSettings = require("../models/manpowerLineSettingsSchema.js");

const bulkSkuSchema = z.object({
  lineIds: z.array(z.string().min(1)).nonempty(),
});

const scopeUpdateSchema = z.object({
  scopeLineIds: z.array(z.string().min(1)).nonempty(),
  items: z
    .array(
      z.object({
        lineId: z.string().min(1),
        quota: z.coerce.number().int().min(0).max(99_999),
      })
    )
    .default([]),
});

const normalizeMap = (rows) => {
  const map = {};
  for (const r of rows) map[r.lineId] = r.quota;
  return map;
};

// POST /api/v1/settings/lines/bulk
// Body: { lineIds: [...] }
router.post(
  "/lines/bulk",
  catchAsync(async (req, res) => {
    const parsed = bulkSkuSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ status: "error", message: parsed.error.message });
    }

    const rows = await ManpowerLineSettings.find({
      lineId: { $in: parsed.data.lineIds },
    })
      .lean();

    sendSuccess(res, normalizeMap(rows), 200);
  })
);

// PUT /api/v1/settings/lines/scope
// Body: { scopeLineIds: [...], items: [{ lineId, quota }, ...] }
// - deletes all existing rows for `scopeLineIds`
// - inserts only `items` (empty items = "reset all" for the scope)
router.put(
  "/lines/scope",
  catchAsync(async (req, res) => {
    console.log(req.body);
    const parsed = scopeUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ status: "error", message: parsed.error.message });
    }

    const { scopeLineIds, items } = parsed.data;

    await ManpowerLineSettings.deleteMany({
      lineId: { $in: scopeLineIds },
    });

    if (items.length) {
      // Upsert not needed because we just deleted the scope.
      await ManpowerLineSettings.insertMany(
        items.map((it) => ({ lineId: it.lineId, quota: it.quota })),
        { ordered: false }
      );
    }

    sendSuccess(res, { saved: items.length }, 200);
  })
);

module.exports = router;

