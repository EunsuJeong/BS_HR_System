const mongoose = require("mongoose");

const attendanceSummarySchema = new mongoose.Schema({
  employeeId: String,
  yearMonth: String,
  weeklyOver52Rate: Number,
  stressIndex: Number,
  attendanceRate: Number,
  lateRate: Number,
  leaveRate: Number,
  violationDetails: [
    {
      weekPeriod: String,
      violationHours: Number,
    },
  ],
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'attendanceSummaries' });

const AttendanceSummary = mongoose.model("AttendanceSummary", attendanceSummarySchema);
module.exports = AttendanceSummary;
