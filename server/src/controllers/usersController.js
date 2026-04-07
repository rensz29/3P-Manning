const { UserStore } = require("../models/userStore");
const { AppError, catchAsync } = require("../utils/errors");
const { sendSuccess, sendPaginated } = require("../utils/response");

/**
 * GET /api/v1/users
 */
const list = catchAsync(async (req, res) => {
  const { page, limit, role } = req.query;
  const { items, total } = UserStore.findAll({ page, limit, role });
  sendPaginated(res, items, { page, limit, total });
});

/**
 * GET /api/v1/users/:id
 */
const getOne = catchAsync(async (req, res) => {
  const user = UserStore.findById(req.params.id);
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");
  sendSuccess(res, user);
});

/**
 * POST /api/v1/users
 */
const create = catchAsync(async (req, res) => {
  if (UserStore.findByEmail(req.body.email)) {
    throw new AppError("Email already in use", 409, "CONFLICT");
  }
  const user = UserStore.create(req.body);
  sendSuccess(res, user, 201);
});

/**
 * PATCH /api/v1/users/:id
 */
const update = catchAsync(async (req, res) => {
  if (req.body.email) {
    const existing = UserStore.findByEmail(req.body.email);
    if (existing && existing.id !== req.params.id) {
      throw new AppError("Email already in use", 409, "CONFLICT");
    }
  }
  const user = UserStore.update(req.params.id, req.body);
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");
  sendSuccess(res, user);
});

/**
 * DELETE /api/v1/users/:id
 */
const remove = catchAsync(async (req, res) => {
  const deleted = UserStore.delete(req.params.id);
  if (!deleted) throw new AppError("User not found", 404, "NOT_FOUND");
  res.status(204).end();
});

module.exports = { list, getOne, create, update, remove };
