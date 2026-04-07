const mongoose = require("mongoose");

const assignmentDailyReportSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    approvedBy: { type: String, default: "" },
    approvedAt: { type: Date, default: null },
    status: { type: String, enum: ["approved"], default: "approved" },
    summary: {
      totalAssigned: { type: Number, default: 0 },
      totalRequired: { type: Number, default: 0 },
      fillRatePct: { type: Number, default: 0 },
      totalDayCostPerHour: { type: Number, default: 0 },
      totalNightCostPerHour: { type: Number, default: 0 },
      totalEstimatedDailyCost: { type: Number, default: 0 },
      perShift: { type: [mongoose.Schema.Types.Mixed], default: [] },
      excessByShift: { type: [mongoose.Schema.Types.Mixed], default: [] },
      totalExcess: { type: Number, default: 0 },
    },
    shiftDefinitions: { type: [mongoose.Schema.Types.Mixed], default: [] },
    assignments: { type: mongoose.Schema.Types.Mixed, default: {} },
    employees: { type: [mongoose.Schema.Types.Mixed], default: [] },
    schedule: {
      dressings: { type: [mongoose.Schema.Types.Mixed], default: [] },
      savoury: { type: [mongoose.Schema.Types.Mixed], default: [] },
    },
    excessEmployees: { type: [mongoose.Schema.Types.Mixed], default: [] },
    assignmentDetails: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

assignmentDailyReportSchema.index({ date: 1 }, { unique: true });

module.exports = mongoose.model(
  "AssignmentDailyReport",
  assignmentDailyReportSchema,
  "assignment_daily_reports"
);
