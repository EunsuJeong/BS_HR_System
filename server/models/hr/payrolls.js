const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema(
  {
    // 기본 정보
    employeeId: { type: String, required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    yearMonth: { type: String, required: true }, // "YYYY-MM" 형식

    // 직원 정보 (비정규화)
    name: String,
    department: String,
    position: String,
    joinDate: String,

    // 기본 급여 정보
    hourlyWage: { type: Number, default: 0 },
    basicHours: { type: Number, default: 209 },
    basicPay: { type: Number, default: 0 },

    // 연장/휴일/야간 근무
    overtimeHours: { type: Number, default: 0 },
    overtimePay: { type: Number, default: 0 },
    holidayWorkHours: { type: Number, default: 0 },
    holidayWorkPay: { type: Number, default: 0 },
    nightWorkHours: { type: Number, default: 0 },
    nightWorkPay: { type: Number, default: 0 },

    // 공제 항목
    lateEarlyHours: { type: Number, default: 0 },
    lateEarlyDeduction: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    absentDeduction: { type: Number, default: 0 },

    // 수당 항목
    carAllowance: { type: Number, default: 0 },
    transportAllowance: { type: Number, default: 0 },
    phoneAllowance: { type: Number, default: 0 },
    otherAllowance: { type: Number, default: 0 },
    annualLeaveDays: { type: Number, default: 0 },
    annualLeavePay: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },

    // 급여 합계
    totalSalary: { type: Number, default: 0 },

    // 세금 및 보험
    incomeTax: { type: Number, default: 0 },
    localTax: { type: Number, default: 0 },
    nationalPension: { type: Number, default: 0 },
    healthInsurance: { type: Number, default: 0 },
    longTermCare: { type: Number, default: 0 },
    employmentInsurance: { type: Number, default: 0 },

    // 기타 공제
    advanceDeduction: { type: Number, default: 0 },
    irpMatching: { type: Number, default: 0 },
    otherDeduction: { type: Number, default: 0 },
    dormitory: { type: Number, default: 0 },

    // 연말정산
    healthYearEnd: { type: Number, default: 0 },
    longTermYearEnd: { type: Number, default: 0 },
    taxYearEnd: { type: Number, default: 0 },

    // 최종 금액
    totalDeduction: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },

    // 메타 정보
    uploadDate: { type: Date, default: Date.now },
    lastModified: { type: Date, default: Date.now },
  },
  {
    collection: 'payrolls',
    timestamps: true,
  }
);

// 복합 인덱스: employeeId + yearMonth로 빠른 조회
payrollSchema.index({ employeeId: 1, yearMonth: 1 }, { unique: true });
payrollSchema.index({ year: 1, month: 1 });

module.exports =
  mongoose.models.Payroll || mongoose.model('Payroll', payrollSchema);
