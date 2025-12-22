const mongoose = require('mongoose');

const safetyAccidentSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    severity: { type: String, required: true },
    description: { type: String, required: true },
    employeeId: String,
    department: String,
    type: String,
    reporter: String,
    createdAt: { type: Date, default: Date.now },
  },
  {
    collection: 'safetyAccidents',
    strict: false, // DB에 있는 모든 필드를 허용
  }
);

const SafetyAccident = mongoose.model('SafetyAccident', safetyAccidentSchema);
module.exports = SafetyAccident;
