const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/best-practices-api";

const connect = async () => {
  mongoose.connection.on("connected", () =>
    console.log(`✅ MongoDB connected: ${mongoose.connection.host}`)
  );
  mongoose.connection.on("error", (err) =>
    console.error("MongoDB connection error:", err)
  );
  mongoose.connection.on("disconnected", () =>
    console.warn("MongoDB disconnected")
  );

  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });
};

const disconnect = async () => {
  await mongoose.connection.close();
  console.log("MongoDB connection closed.");
};

module.exports = { connect, disconnect };