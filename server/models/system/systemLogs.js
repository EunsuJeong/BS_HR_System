const mongoose = require("mongoose");

const systemLogSchema = new mongoose.Schema({
  eventType: String,
  message: String,
  level: { type: String, enum: ["INFO", "WARNING", "HIGH", "ERROR"] },
  data: Object,
  createdAt: { type: Date, default: Date.now },
}, { collection: 'systemLogs' });

const SystemLog = mongoose.model("SystemLog", systemLogSchema);
module.exports = SystemLog;
