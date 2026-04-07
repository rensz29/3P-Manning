const mongoose = require("mongoose");

const assignmentSessionSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    status: {
      type: String,
      enum: ["draft", "submitted", "approved"],
      default: "draft",
      index: true,
    },
    assignments: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    submittedBy: { type: String, default: "" },
    submittedAt: { type: Date, default: null },
    approvedBy: { type: String, default: "" },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

assignmentSessionSchema.index({ date: 1 }, { unique: true });

module.exports = mongoose.model(
  "AssignmentSession",
  assignmentSessionSchema,
  "assignment_sessions"
);

