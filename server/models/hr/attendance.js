const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  date: { type: String, required: true },
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

// 복합 인덱스 추가 (성능 최적화)
attendanceSchema.index({ employeeId: 1, date: 1 }); // 특정 직원의 특정 날짜 조회
attendanceSchema.index({ date: 1 }); // 날짜 범위 조회 (월별 조회)
attendanceSchema.index({ date: -1 }); // 최신 날짜 우선 정렬

const Attendance = mongoose.model("Attendance", attendanceSchema);
module.exports = Attendance;