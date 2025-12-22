const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema(
  {
    title: String,
    date: String,
    type: {
      type: String,
      enum: ['업무', '행사', '교육', '회의', '휴무', '공휴일', '기타'],
    },
    description: String,
    createdBy: String,
    year: Number, // 공휴일 관리를 위한 년도 필드
    holidayType: {
      type: String,
      enum: ['solar', 'lunar', 'substitute', 'temporary', 'custom'],
    }, // 공휴일 타입
    isDeleted: { type: Boolean, default: false }, // 공휴일 삭제 플래그
    isCustom: { type: Boolean, default: false }, // 커스텀 공휴일 여부
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'schedules' }
);

// 인덱스 추가
scheduleSchema.index({ date: 1 });
scheduleSchema.index({ type: 1 });
scheduleSchema.index({ year: 1 });

const Schedule = mongoose.model('Schedule', scheduleSchema);
module.exports = Schedule;
