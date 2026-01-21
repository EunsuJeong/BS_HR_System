const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema(
  {
    // 직원 정보 (비정규화 - 히스토리 보존)
    employeeId: {
      type: String,
      required: [true, '직원 ID는 필수입니다'],
      index: true,
    },
    employeeName: {
      type: String,
      required: [true, '직원 이름은 필수입니다'],
    },
    department: String, // 신청 당시 소속 부서
    position: String, // 신청 당시 직급

    // 연차 신청 정보
    type: {
      type: String,
      required: [true, '연차 유형은 필수입니다'],
      enum: {
        values: [
          '연차',
          '반차(오전)',
          '반차(오후)',
          '외출',
          '조퇴',
          '경조',
          '경조사',
          '공가',
          '휴직',
          '결근',
          '기타',
          '병가',
          '특별휴가',
        ],
        message: '{VALUE}는 유효하지 않은 연차 유형입니다',
      },
    },
    reason: {
      type: String,
      required: [true, '신청 사유는 필수입니다'],
    },
    contact: String,

    // 날짜 정보 (Date 타입으로 통일, UTC 기준)
    requestDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    startDate: {
      type: Date,
      required: [true, '시작일은 필수입니다'],
    },
    endDate: {
      type: Date,
      required: [true, '종료일은 필수입니다'],
      validate: {
        validator: function (v) {
          // findOneAndUpdate 사용 시 this는 document가 아닐 수 있으므로
          // startDate가 없으면 검증을 통과시킴 (백엔드에서 별도 검증)
          if (!this.startDate) return true;

          // 날짜 비교 시 시간 부분을 제거하고 비교
          const endDate = new Date(v);
          const startDate = new Date(this.startDate);

          // 밀리초 단위로 비교
          return endDate.getTime() >= startDate.getTime();
        },
        message: '종료일은 시작일 이후여야 합니다',
      },
    },

    // 일수 정보 (경조, 공가, 휴직 등은 0일 허용)
    requestedDays: {
      type: Number,
      required: true,
      min: [0, '신청 일수는 0 이상이어야 합니다'],
    },
    approvedDays: {
      type: Number,
      min: 0,
    },

    // 승인 정보
    approver: String, // 승인자 ID
    approverName: String, // 승인자 이름
    approvedAt: Date, // 승인 시각
    status: {
      type: String,
      enum: ['대기', '승인', '반려', '취소'],
      default: '대기',
      required: true,
    },

    // 반려 정보
    rejectedBy: String, // 반려자 ID
    rejectedByName: String, // 반려자 이름
    rejectedAt: Date, // 반려 시각
    rejectionReason: String, // 반려 사유

    // 시스템 정보 (UTC 기준)
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },

    // 변경 이력 (선택사항)
    history: [
      {
        status: String,
        changedBy: String,
        changedByName: String,
        changedAt: { type: Date, default: Date.now },
        comment: String,
      },
    ],
  },
  {
    collection: 'leaves',
    timestamps: true, // createdAt, updatedAt 자동 관리
  }
);

// 인덱스 설정
leaveSchema.index({ employeeId: 1, startDate: -1 }); // 직원별 최근 연차 조회
leaveSchema.index({ status: 1, requestDate: -1 }); // 상태별 정렬
leaveSchema.index({ startDate: 1, endDate: 1 }); // 기간 조회

// 저장 전 미들웨어 - updatedAt 자동 갱신 (UTC)
leaveSchema.pre('save', function (next) {
  this.updatedAt = new Date();

  // 종료일 검증
  if (this.startDate && this.endDate) {
    const startTime = new Date(this.startDate).getTime();
    const endTime = new Date(this.endDate).getTime();

    if (endTime < startTime) {
      return next(new Error('종료일은 시작일 이후여야 합니다'));
    }
  }

  next();
});

// 업데이트 전 미들웨어 - updatedAt 자동 갱신 (UTC)
leaveSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });

  // 업데이트 데이터 가져오기
  const update = this.getUpdate();
  const updateData = update.$set || update;

  // 날짜 검증 (둘 다 있을 때만)
  if (updateData.startDate && updateData.endDate) {
    const startTime = new Date(updateData.startDate).getTime();
    const endTime = new Date(updateData.endDate).getTime();

    if (endTime < startTime) {
      return next(new Error('종료일은 시작일 이후여야 합니다'));
    }
  }

  next();
});

const Leave = mongoose.model('Leave', leaveSchema);
module.exports = Leave;
