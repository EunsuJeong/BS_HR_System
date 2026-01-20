const mongoose = require('mongoose');

/**
 * PWA 푸시 알림 구독 정보 스키마
 * - 사용자별 푸시 구독 엔드포인트 저장
 */
const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    employeeId: {
      type: String,
      required: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    subscription: {
      endpoint: {
        type: String,
        required: true,
        unique: true,
      },
      keys: {
        p256dh: {
          type: String,
          required: true,
        },
        auth: {
          type: String,
          required: true,
        },
      },
    },
    userAgent: String,
    platform: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUsed: {
      type: Date,
      default: Date.now,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: 'push_subscriptions' }
);

// 인덱스 설정
pushSubscriptionSchema.index({ employeeId: 1, isActive: 1 });
pushSubscriptionSchema.index({ 'subscription.endpoint': 1 }, { unique: true });

const PushSubscription = mongoose.model(
  'PushSubscription',
  pushSubscriptionSchema
);
module.exports = PushSubscription;
