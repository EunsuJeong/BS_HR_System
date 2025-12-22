const mongoose = require('mongoose');

/**
 * 휴가 신청 스키마
 */
const leaveSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      ref: 'Employee',
    },

    employeeName: {
      type: String,
      required: true,
    },

    name: {
      type: String, // 한글명 (employeeName과 동일, 호환성)
    },

    department: {
      type: String,
    },

    // 휴가 타입 (한글)
    leaveType: {
      type: String,
      enum: [
        '연차',
        '반차(오전)',
        '반차(오후)',
        '외출',
        '조퇴',
        '경조',
        '공가',
        '휴직',
        '결근',
        '기타',
        'annual',
        'sick',
        'maternity',
        'paternity',
        'unpaid',
        'other',
      ],
      required: true,
    },

    type: {
      type: String, // leaveType 별칭 (호환성)
    },

    // 기간
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },

    // 일수
    days: {
      type: Number,
      required: true,
    },

    // 사유
    reason: {
      type: String,
      required: true,
    },

    // 연락처
    contact: {
      type: String,
    },

    // 승인 상태 (한글)
    status: {
      type: String,
      enum: [
        '대기',
        '승인',
        '반려',
        '취소',
        'pending',
        'approved',
        'rejected',
        'cancelled',
      ],
      default: '대기',
    },

    // 신청일
    requestDate: {
      type: Date,
      default: Date.now,
    },

    requestDateTime: {
      type: Date,
      default: Date.now,
    },

    // 승인자 정보
    approvedBy: {
      type: String,
    },

    approvedDate: {
      type: Date,
    },

    approver: {
      id: {
        type: String,
        ref: 'Employee',
      },
      name: String,
      comment: String,
      approvedAt: Date,
    },

    // 반려 정보
    rejectionReason: {
      type: String,
    },

    rejectedDate: {
      type: Date,
    },

    // 첨부 파일
    attachments: [
      {
        filename: String,
        url: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// 인덱스
leaveSchema.index({ employeeId: 1, startDate: -1 });
leaveSchema.index({ status: 1, startDate: -1 });

module.exports = mongoose.model('Leave', leaveSchema);
