const mongoose = require('mongoose');

/**
 * 회사 공지사항 (관리자 등록, 직원 조회)
 */
const noticeSchema = new mongoose.Schema(
  {
    title: String,
    content: String,
    author: String, // 작성자 ID or 이름
    departmentTarget: [String],
    attachments: [
      {
        name: String,
        url: String,
        size: String,
      },
    ],
    isImportant: { type: Boolean, default: false },
    // 게시 예약 관련 필드
    isScheduled: { type: Boolean, default: false },
    scheduledDateTime: { type: Date },
    isPublished: { type: Boolean, default: true }, // 즉시 게시는 true, 예약 게시는 false로 시작
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'notices' }
);

const Notice = mongoose.model('Notice', noticeSchema);
module.exports = Notice;
