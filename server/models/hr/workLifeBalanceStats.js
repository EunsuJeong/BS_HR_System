const mongoose = require('mongoose');

/**
 * 워라밸 지표 통계 스키마
 * - 월별 회사 전체 워라밸 지표를 저장
 * - 평균 특근시간, 연차 사용률, 주52시간 위반율, 스트레스 지수
 */
const workLifeBalanceStatsSchema = new mongoose.Schema(
  {
    year: { type: Number, required: true, index: true },
    month: { type: Number, required: true, index: true }, // 1-12

    // [워라밸 지표 1] 평균 특근시간 (시간 단위)
    averageOvertimeHours: {
      type: Number,
      default: 0,
      min: 0,
    },

    // [워라밸 지표 2] 연차 사용률 (%)
    leaveUsageRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // [워라밸 지표 3] 주 52시간 위반율 (%)
    weekly52HoursViolation: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // [워라밸 지표 4] 스트레스 지수 (0-100점)
    stressIndex: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // 상세 통계 (선택사항 - 추후 분석용)
    details: {
      // 평균 특근시간 상세
      overtime: {
        totalEmployees: { type: Number, default: 0 },
        totalOvertimeHours: { type: Number, default: 0 },
      },

      // 연차 사용률 상세
      leave: {
        totalEmployees: { type: Number, default: 0 },
        totalUsedLeave: { type: Number, default: 0 },
        totalAvailableLeave: { type: Number, default: 0 },
      },

      // 주 52시간 위반 상세
      violations: {
        totalEmployees: { type: Number, default: 0 },
        violatedEmployees: { type: Number, default: 0 },
        violationCount: { type: Number, default: 0 },
      },

      // 스트레스 지수 상세
      stress: {
        totalEmployees: { type: Number, default: 0 },
        totalStressScore: { type: Number, default: 0 },
        highStressCount: { type: Number, default: 0 }, // 70점 이상
        mediumStressCount: { type: Number, default: 0 }, // 40-69점
        lowStressCount: { type: Number, default: 0 }, // 40점 미만
      },
    },

    // 메타 정보
    calculatedAt: { type: Date, default: Date.now }, // 계산 시간
    attendanceRecordCount: { type: Number, default: 0 }, // 참조한 근태 레코드 수
    employeeCount: { type: Number, default: 0 }, // 계산에 포함된 직원 수
    dataHash: { type: String }, // 데이터 무결성 검증용 해시

    // 계산 메타데이터
    calculationDuration: { type: Number }, // 계산 소요 시간 (ms)
    calculationType: {
      type: String,
      enum: ['scheduled', 'manual', 'auto'],
      default: 'auto',
    }, // 계산 유형
  },
  {
    collection: 'workLifeBalanceStats',
    timestamps: true, // createdAt, updatedAt 자동 생성
  }
);

// 복합 인덱스: 연도 + 월로 빠른 조회 (유니크)
workLifeBalanceStatsSchema.index({ year: 1, month: 1 }, { unique: true });

// 계산 시간 인덱스 (최신 데이터 조회용)
workLifeBalanceStatsSchema.index({ calculatedAt: -1 });

// 정적 메서드: 특정 월의 통계 조회
workLifeBalanceStatsSchema.statics.findByYearMonth = function (year, month) {
  return this.findOne({ year, month });
};

// 정적 메서드: 연도별 통계 조회
workLifeBalanceStatsSchema.statics.findByYear = function (year) {
  return this.find({ year }).sort({ month: 1 });
};

// 정적 메서드: 최근 N개월 통계 조회
workLifeBalanceStatsSchema.statics.findRecent = function (months = 12) {
  return this.find().sort({ year: -1, month: -1 }).limit(months);
};

const WorkLifeBalanceStats = mongoose.model(
  'WorkLifeBalanceStats',
  workLifeBalanceStatsSchema
);

module.exports = WorkLifeBalanceStats;
