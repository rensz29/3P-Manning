const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const { errorHandler } = require("./middleware/errorHandler");
const { notFound } = require("./middleware/notFound");
const { requestId } = require("./middleware/requestId");
const usersRouter = require("./routes/users");
const productsRouter = require("./routes/products");
const uploadRouter = require("./routes/upload");

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") || "*" }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", message: "Too many requests, please try again later." },
});
app.use("/api", limiter);

// ── Request parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ── Observability ─────────────────────────────────────────────────────────────
app.use(requestId);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/upload", uploadRouter);
app.use("/api/v1/products", productsRouter);
// ── Error handling (must be last) ─────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
