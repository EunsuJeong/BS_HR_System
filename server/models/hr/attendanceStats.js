const mongoose = require('mongoose');

// 근태 월별 합계 통계 스키마
const attendanceStatsSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, index: true },
    year: { type: Number, required: true, index: true },
    month: { type: Number, required: true, index: true },

    // 근무 시간 통계
    totalWorkMinutes: { type: Number, default: 0 }, // 총 근무 시간 (분)
    regularHours: { type: Number, default: 0 }, // 기본 근무 시간
    earlyHours: { type: Number, default: 0 }, // 조출 시간
    overtimeHours: { type: Number, default: 0 }, // 연장 근무 시간
    nightHours: { type: Number, default: 0 }, // 심야 근무 시간
    holidayHours: { type: Number, default: 0 }, // 휴일 근무 시간

    // 근무일 통계
    workDays: { type: Number, default: 0 }, // 출근 일수
    lateDays: { type: Number, default: 0 }, // 지각 일수
    earlyLeaveDays: { type: Number, default: 0 }, // 조퇴 일수
    absentDays: { type: Number, default: 0 }, // 결근 일수

    // 연차 통계
    annualLeaveDays: { type: Number, default: 0 }, // 연차 사용 일수
    morningHalfDays: { type: Number, default: 0 }, // 반차(오전) 일수
    afternoonHalfDays: { type: Number, default: 0 }, // 반차(오후) 일수

    // 메타 정보
    lastCalculatedAt: { type: Date, default: Date.now }, // 마지막 계산 시간
    attendanceHash: { type: String }, // Attendance 데이터의 해시값 (변경 감지용)
    attendanceRecordCount: { type: Number, default: 0 }, // 참조한 Attendance 레코드 수
  },
  {
    collection: 'attendanceStats',
    timestamps: true, // createdAt, updatedAt 자동 생성
  }
);

// 복합 인덱스: 직원ID + 연도 + 월로 빠른 조회
attendanceStatsSchema.index(
  { employeeId: 1, year: 1, month: 1 },
  { unique: true }
);

const AttendanceStats = mongoose.model(
  'AttendanceStats',
  attendanceStatsSchema
);

module.exports = AttendanceStats;
