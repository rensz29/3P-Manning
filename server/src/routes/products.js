const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const { z } = require("zod");
const { validate } = require("../middleware/validate");
const { catchAsync, AppError } = require("../utils/errors");
const { sendSuccess, sendPaginated } = require("../utils/response");

// ── In-memory store ───────────────────────────────────────────────────────────
let products = [
  { id: "p-1", name: "Widget Pro",  price: 29.99, stock: 100, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "p-2", name: "Gadget Plus", price: 49.99, stock: 50,  createdAt: "2024-02-01T00:00:00.000Z" },
];

// ── Schemas ───────────────────────────────────────────────────────────────────
const createSchema = z.object({
  name:  z.string().min(1).max(200).trim(),
  price: z.number().positive(),
  stock: z.number().int().nonnegative().default(0),
});

const updateSchema = createSchema.partial();

const listSchema = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// ── Handlers ──────────────────────────────────────────────────────────────────
router.get("/", validate(listSchema, "query"), catchAsync(async (req, res) => {
  const { page, limit } = req.query;
  const total = products.length;
  const start = (page - 1) * limit;
  sendPaginated(res, products.slice(start, start + limit), { page, limit, total });
}));

router.get("/:id", catchAsync(async (req, res) => {
  const p = products.find((x) => x.id === req.params.id);
  if (!p) throw new AppError("Product not found", 404, "NOT_FOUND");
  sendSuccess(res, p);
}));

router.post("/", validate(createSchema), catchAsync(async (req, res) => {
  const product = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString() };
  products.push(product);
  sendSuccess(res, product, 201);
}));

router.patch("/:id", validate(updateSchema), catchAsync(async (req, res) => {
  const idx = products.findIndex((x) => x.id === req.params.id);
  if (idx === -1) throw new AppError("Product not found", 404, "NOT_FOUND");
  products[idx] = { ...products[idx], ...req.body, updatedAt: new Date().toISOString() };
  sendSuccess(res, products[idx]);
}));

router.delete("/:id", catchAsync(async (req, res) => {
  const idx = products.findIndex((x) => x.id === req.params.id);
  if (idx === -1) throw new AppError("Product not found", 404, "NOT_FOUND");
  products.splice(idx, 1);
  res.status(204).end();
}));

module.exports = router;
