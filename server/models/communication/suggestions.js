const mongoose = require('mongoose');

/**
 * 건의사항 (직원 → 관리자)
 * type='구매' or '기타' 등 분기 알림 로직과 대응
 */
const suggestionSchema = new mongoose.Schema(
  {
    employeeId: String,
    name: String, // 직원명 (비정규화)
    department: String, // 부서명 (비정규화)
    type: { type: String, enum: ['구매', '기타'], default: '기타' },
    title: String,
    content: String,
    status: {
      type: String,
      enum: ['대기', '승인', '반려', '취소'],
      default: '대기',
    },
    remark: String, // 승인/반려 사유
    approver: String,
    approvalDate: Date,
    applyDate: String, // 신청일 (YYYY-MM-DD)
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'suggestions' }
);

const Suggestion = mongoose.model('Suggestion', suggestionSchema);
module.exports = Suggestion;
