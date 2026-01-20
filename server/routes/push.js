/**
 * PWA 푸시 알림 라우트
 */

const express = require('express');
const router = express.Router();
const {
  subscribePushNotification,
  unsubscribePushNotification,
  getUserSubscriptions,
  getVapidPublicKey,
} = require('../controllers/pushNotificationController');

// VAPID 공개키 가져오기
router.get('/vapid-public-key', getVapidPublicKey);

// 푸시 알림 구독 등록
router.post('/subscribe', subscribePushNotification);

// 푸시 알림 구독 해제
router.post('/unsubscribe', unsubscribePushNotification);

// 사용자 구독 목록 조회
router.get('/subscriptions/:employeeId', getUserSubscriptions);

module.exports = router;
