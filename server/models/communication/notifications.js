const mongoose = require('mongoose');

/**
 * 알림 스키마 (정기 알림, 실시간 알림, 시스템 로그 등)
 * - 정기/실시간 알림: 관리자가 생성하는 알림
 * - 시스템 로그: 연차, 건의, 근무시간 초과 등 자동 생성 알림
 */
const notificationSchema = new mongoose.Schema(
  {
    // 공통 필드
    notificationType: {
      type: String,
      enum: ['정기', '실시간', '시스템'],
      required: true,
    },
    title: { type: String, required: true },
    content: String,

    // 정기/실시간 알림 필드
    status: {
      type: String,
      enum: ['진행중', '완료', '중지'],
      default: '진행중',
    },
    startDate: String,
    endDate: String,
    repeatCycle: {
      type: String,
      enum: ['특정일', '매일', '매주', '매월', '분기', '반기', '년', '즉시'],
      required: false,
    },
    recipients: {
      type: {
        type: String,
        enum: ['전체', '부서', '직급', '직책', '개별', '개인'],
        default: '전체',
      },
      value: String, // '전체직원', '개발팀', 'S1', 등
      selectedEmployees: [String], // 개별 선택 시 사용
    },

    // 시스템 로그 필드
    message: String,
    sender: String,
    priority: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW', 'high', 'medium', 'low'],
      default: 'LOW',
    },
    related: {
      entity: String,
      refId: String,
    },
    readBy: [String],

    // 타임스탬프
    createdAt: { type: Date, default: Date.now },
    completedAt: Date,
  },
  { collection: 'notifications' }
);

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
