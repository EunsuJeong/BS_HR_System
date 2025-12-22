const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
  {
    year: {
      type: Number,
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['solar', 'lunar', 'substitute', 'temporary', 'custom'],
      default: 'solar',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isCustom: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'holidays',
  }
);

// 복합 인덱스 (연도 + 날짜로 고유성 보장)
holidaySchema.index({ year: 1, date: 1 }, { unique: true });
holidaySchema.index({ date: 1 });
holidaySchema.index({ type: 1 });

module.exports = mongoose.model('Holiday', holidaySchema);
