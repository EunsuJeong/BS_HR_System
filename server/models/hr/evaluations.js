const mongoose = require('mongoose');

/**
 * 직원 평가 (관리자 평가 관리)
 * - 연도별 직원 성과 평가
 * - 등급(S/A/B/C), 평가 내용, 진행 상태 관리
 */
const evaluationSchema = new mongoose.Schema(
  {
    year: { type: Number, required: true, index: true },
    employeeId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    department: { type: String, required: true },
    grade: {
      type: String,
      required: true,
      enum: ['S', 'A', 'B', 'C'],
      default: 'A',
    },
    content: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ['예정', '진행중', '완료'],
      default: '예정',
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: 'evaluations',
    timestamps: true,
  }
);

// 복합 인덱스: 연도-직원ID 조합으로 중복 방지
evaluationSchema.index({ year: 1, employeeId: 1 }, { unique: true });

const Evaluation = mongoose.model('Evaluation', evaluationSchema);
module.exports = Evaluation;
