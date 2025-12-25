const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true },
    name: String,
    password: String, // 비밀번호 필드 추가
    department: String,
    subDepartment: String,
    role: String,
    position: String,
    salaryType: { type: String, enum: ['시급', '월급', '연봉'] },
    workType: {
      type: String,
      enum: ['주간', '야간', '주간/야간'],
      default: '주간',
    },
    status: { type: String, enum: ['재직', '휴직', '퇴사'], default: '재직' },
    joinDate: Date,
    leaveDate: Date,
    phone: String,
    address: String,
    leaveEntitled: Number, // 부여된 연차
    leaveUsed: Number,     // 사용한 연차 (직접 수정 가능)
    evalScore: Number,
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'employees' }
);

const Employee = mongoose.model('Employee', employeeSchema);
module.exports = Employee;
