require("dotenv").config();
const app = require("./app");
const { connect, disconnect } = require("./config/database");

const PORT = process.env.PORT || 3000;

// Connect to MongoDB, then start the HTTP server
connect()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`   Environment : ${process.env.NODE_ENV || "development"}`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
    });

    // ── Graceful shutdown ─────────────────────────────────────────────────────
    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully…`);
      server.close(async () => {
        await disconnect();
        console.log("HTTP server closed.");
        process.exit(0);
      });

      setTimeout(() => {
        console.error("Forcing exit after timeout.");
        process.exit(1);
      }, 10_000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT",  () => shutdown("SIGINT"));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });

// ── Unhandled rejections / exceptions ──────────────────────────────────────────
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});