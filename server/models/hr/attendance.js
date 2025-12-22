const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: String, index: true },
  date: { type: String, index: true },
  checkIn: String,
  checkOut: String,
  shiftType: { type: String, enum: ["주간", "야간"] },
  status: {
    type: String,
    enum: [
      "출근", "지각", "조퇴", "결근",
      "연차", "반차(오전)", "반차(오후)", "휴직", "휴일", "기타",
    ],
  },
  totalWorkMinutes: Number,
  overtimeHours: Number,
  holidayHours: Number,
  nightHours: Number,
  remarks: String,
  autoDetermined: Boolean,
  createdAt: { type: Date, default: Date.now },
}, { collection: 'attendance' });

const Attendance = mongoose.model("Attendance", attendanceSchema);
module.exports = Attendance;