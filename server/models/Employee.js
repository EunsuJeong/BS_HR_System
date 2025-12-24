const mongoose = require('mongoose');

/**
 * 직원 스키마
 */
const employeeSchema = new mongoose.Schema(
  {
    // 기본 정보
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
    },

    // 직무 정보
    department: {
      type: String,
      required: true,
      trim: true,
    },
    subDepartment: {
      type: String,
      trim: true,
    },
    position: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      trim: true,
    },

    // 급여 및 근무 정보
    salaryType: {
      type: String,
      enum: ['연봉', '시급'],
      trim: true,
    },
    workType: {
      type: String,
      enum: ['주간', '야간', '주간/야간'],
      trim: true,
    },

    // 입퇴사 정보
    joinDate: {
      type: Date,
      required: true,
    },
    leaveDate: {
      type: Date,
    },

    // 연락처
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },

    // 상태
    status: {
      type: String,
      enum: [
        '재직',
        '휴직',
        '퇴사',
        'active',
        'inactive',
        'on_leave',
        'terminated',
      ],
      default: '재직',
    },

    // 권한 (관리자용)
    adminRole: {
      type: String,
      enum: ['employee', 'manager', 'admin'],
      default: 'employee',
    },

    // 연차 정보
    annualLeave: {
      total: { type: Number, default: 15 },
      used: { type: Number, default: 0 },
      remaining: { type: Number, default: 15 },
    },

    // 사용연차 (직접 수정 가능)
    usedLeave: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt 자동 생성
  }
);

// 인덱스 생성
employeeSchema.index({ employeeId: 1 });
employeeSchema.index({ email: 1 });
employeeSchema.index({ department: 1, status: 1 });

// 비밀번호 제외하고 반환하는 메서드
employeeSchema.methods.toJSON = function () {
  const employee = this.toObject();
  delete employee.password;
  return employee;
};

module.exports = mongoose.model('Employee', employeeSchema);
