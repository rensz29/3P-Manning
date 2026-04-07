const mongoose = require("mongoose");
const { AppError } = require("../utils/errors");

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let { statusCode = 500, message, code = "INTERNAL_ERROR" } = err;

  // Mongoose: invalid ObjectId (e.g. /users/not-an-id)
  if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    code = "INVALID_ID";
    message = `Invalid value for field '${err.path}'`;
  }

  // Mongoose: duplicate key (unique index violation)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    statusCode = 409;
    code = "CONFLICT";
    message = `${field} already exists`;
  }

  // Mongoose: schema validation errors
  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 422;
    code = "VALIDATION_ERROR";
    message = "Validation failed";
    return res.status(statusCode).json({
      status: "error",
      code,
      message,
      errors: Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message,
      })),
      requestId: req.id,
    });
  }

  // ── Zod validation errors → 422 ────────────────────────────────────────────
  if (err.name === "ZodError") {
    return res.status(422).json({
      status: "error",
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      errors: err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
      requestId: req.id,
    });
  }

  // ── Mongoose duplicate key (e.g. unique email) → 409 ──────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    statusCode = 409;
    code = "CONFLICT";
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already in use`;
  }

  // ── Mongoose validation error → 422 ───────────────────────────────────────
  if (err.name === "ValidationError") {
    statusCode = 422;
    code = "VALIDATION_ERROR";
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(statusCode).json({
      status: "error",
      code,
      message: "Validation failed",
      errors,
      requestId: req.id,
    });
  }

  // ── Mongoose bad ObjectId → 400 ────────────────────────────────────────────
  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 400;
    code = "INVALID_ID";
    message = `Invalid id: ${err.value}`;
  }

  // ── Malformed JSON body → 400 ──────────────────────────────────────────────
  if (err instanceof SyntaxError && err.status === 400) {
    statusCode = 400;
    code = "INVALID_JSON";
    message = "Malformed JSON in request body";
  }

  // ── Hide programmer errors in production ───────────────────────────────────
  if (process.env.NODE_ENV === "production" && !err.isOperational) {
    message = "Something went wrong";
    code = "INTERNAL_ERROR";
  }

  if (process.env.NODE_ENV !== "production") {
    console.error(`[${req.id}] ${err.stack || err}`);
  }

  res.status(statusCode).json({
    status: "error",
    code,
    message,
    requestId: req.id,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};

module.exports = { errorHandler };