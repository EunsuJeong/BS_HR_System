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

    // 연차 관련 필드
    leaveEntitled: Number,      // 부여된 연차
    leaveUsed: Number,          // 사용한 연차 (관리자가 직접 설정한 기준값, 기본값 0)
    annualLeaveStart: String,   // 연차 시작일 (YYYY-MM-DD)
    annualLeaveEnd: String,     // 연차 종료일 (YYYY-MM-DD)
    baseAnnual: Number,         // 기본 연차
    carryOverLeave: Number,     // 이월 연차
    remainAnnual: Number,       // 남은 연차
    totalAnnual: Number,        // 총 연차
    usedAnnual: Number,         // 사용한 연차 (계산값)

    evalScore: Number,
    lastLogin: Date, // 마지막 로그인 시간 (KST)
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'employees' }
);

const Employee = mongoose.model('Employee', employeeSchema);
module.exports = Employee;
