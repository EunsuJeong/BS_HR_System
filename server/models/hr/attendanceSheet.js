const mongoose = require('mongoose');

// 근태 시트 스키마 (월별 집계 데이터)
const attendanceSheetSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, index: true },
    year: { type: Number, required: true, index: true },
    month: { type: Number, required: true, index: true },

    // 근무 시간 통계
    earlyHours: { type: Number, default: 0 }, // 조출 시간
    overtimeHours: { type: Number, default: 0 }, // 연장 근무 시간
    holidayHours: { type: Number, default: 0 }, // 휴일 근무 시간
    nightHours: { type: Number, default: 0 }, // 심야 근무 시간
    overtimeNightHours: { type: Number, default: 0 }, // 연장 심야 근무 시간
    earlyHolidayHours: { type: Number, default: 0 }, // 조출 휴일 근무 시간
    holidayOvertimeHours: { type: Number, default: 0 }, // 휴일 연장 근무 시간
    regularHours: { type: Number, default: 0 }, // 기본 근무 시간
    totalWorkHours: { type: Number, default: 0 }, // 총 근무 시간
    totalWorkDays: { type: Number, default: 0 }, // 총 근무 일수

    // 메타 정보
    lastCalculatedAt: { type: Date, default: Date.now }, // 마지막 계산 시간
  },
  {
    collection: 'attendanceSheets',
    timestamps: true, // createdAt, updatedAt 자동 생성
  }
);

// 복합 인덱스: 직원ID + 연도 + 월로 빠른 조회
attendanceSheetSchema.index(
  { employeeId: 1, year: 1, month: 1 },
  { unique: true }
);

const AttendanceSheet = mongoose.model(
  'AttendanceSheet',
  attendanceSheetSchema
);

module.exports = AttendanceSheet;
