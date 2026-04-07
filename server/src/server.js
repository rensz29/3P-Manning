require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const { connect, disconnect } = require("./config/database");
const { initSocket, roomForDate } = require("./realtime/socket");
const { initAssignmentStore, closeAssignmentStore } = require("./services/assignmentStore");

const PORT = process.env.PORT || 3000;

// Connect to MongoDB, then start the HTTP server
connect()
  .then(() => {
    return initAssignmentStore();
  })
  .then(() => {
    const httpServer = http.createServer(app);
    const io = new Server(httpServer, {
      cors: { origin: process.env.ALLOWED_ORIGINS?.split(",") || "*" },
    });
    initSocket(io);

    io.on("connection", (socket) => {
      socket.on("assignment.join", ({ date }) => {
        if (!date) return;
        socket.join(roomForDate(date));
      });
      socket.on("assignment.leave", ({ date }) => {
        if (!date) return;
        socket.leave(roomForDate(date));
      });
    });

    const server = httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`   Environment : ${process.env.NODE_ENV || "development"}`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
    });

    // ── Graceful shutdown ─────────────────────────────────────────────────────
    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully…`);
      server.close(async () => {
        await closeAssignmentStore();
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