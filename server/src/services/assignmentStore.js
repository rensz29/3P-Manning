const { createClient } = require("redis");

const memoryStore = new Map();
let redisClient = null;
let redisEnabled = false;

function keyForDate(date) {
  return `assign:session:${date}`;
}

function expireAtForSessionDate(date) {
  // Expire at the end of that session day (23:59:59 local server time).
  const d = new Date(`${date}T23:59:59`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor(d.getTime() / 1000);
}

async function initAssignmentStore() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn("Assignment store: REDIS_URL not set, using in-memory fallback.");
    return;
  }

  try {
    redisClient = createClient({ url: redisUrl });
    redisClient.on("error", (err) => {
      console.error("Redis client error:", err.message);
    });
    await redisClient.connect();
    redisEnabled = true;
    console.log("✅ Redis connected for assignment sessions.");
  } catch (err) {
    redisEnabled = false;
    redisClient = null;
    console.warn(`Assignment store: Redis unavailable (${err.message}), using in-memory fallback.`);
  }
}

async function closeAssignmentStore() {
  if (redisClient && redisEnabled) {
    try {
      await redisClient.quit();
    } catch (_e) {
      // ignore
    }
  }
}

function normalizeSession(date, raw = {}) {
  return {
    date,
    status: raw.status || "draft",
    assignments: raw.assignments || {},
    submittedBy: raw.submittedBy || "",
    submittedAt: raw.submittedAt || null,
    approvedBy: raw.approvedBy || "",
    approvedAt: raw.approvedAt || null,
    updatedAt: raw.updatedAt || null,
  };
}

async function getSession(date) {
  const k = keyForDate(date);
  if (redisEnabled && redisClient) {
    const raw = await redisClient.get(k);
    if (!raw) return normalizeSession(date);
    try {
      return normalizeSession(date, JSON.parse(raw));
    } catch {
      return normalizeSession(date);
    }
  }
  return normalizeSession(date, memoryStore.get(k));
}

async function saveSession(date, session) {
  const k = keyForDate(date);
  const payload = normalizeSession(date, {
    ...session,
    updatedAt: new Date().toISOString(),
  });
  if (redisEnabled && redisClient) {
    await redisClient.set(k, JSON.stringify(payload));
    if (payload.status === "approved") {
      const ts = expireAtForSessionDate(date);
      if (ts) {
        await redisClient.expireAt(k, ts);
      }
    }
  } else {
    memoryStore.set(k, payload);
  }
  return payload;
}

async function deleteSession(date) {
  const k = keyForDate(date);
  if (redisEnabled && redisClient) {
    await redisClient.del(k);
  } else {
    memoryStore.delete(k);
  }
}

module.exports = {
  initAssignmentStore,
  closeAssignmentStore,
  getSession,
  saveSession,
  deleteSession,
};

