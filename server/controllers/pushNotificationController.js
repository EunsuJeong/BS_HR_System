/**
 * PWA 푸시 알림 백엔드 API
 * web-push 라이브러리 사용
 */

const webpush = require('web-push');
const PushSubscription = require('../models/communication/pushSubscription');

// VAPID 키 설정
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:admin@buseongsteel.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('✅ [푸시 알림] VAPID 설정 완료');
} else {
  console.warn('⚠️ [푸시 알림] VAPID 키가 설정되지 않았습니다.');
}

const getVapidPublicKey = (req, res) => {
  if (!VAPID_PUBLIC_KEY) {
    return res
      .status(500)
      .json({ success: false, error: 'VAPID 공개키가 설정되지 않았습니다.' });
  }
  res.json({ success: true, publicKey: VAPID_PUBLIC_KEY });
};

const subscribePushNotification = async (req, res) => {
  try {
    const {
      subscription,
      userId,
      employeeId,
      employeeName,
      userAgent,
      platform,
    } = req.body;

    if (!subscription || !employeeId) {
      return res
        .status(400)
        .json({ success: false, error: '구독 정보와 직원 ID가 필요합니다.' });
    }

    let pushSub = await PushSubscription.findOne({
      'subscription.endpoint': subscription.endpoint,
    });

    if (pushSub) {
      pushSub.userId = userId || employeeId;
      pushSub.employeeId = employeeId;
      pushSub.employeeName = employeeName;
      pushSub.userAgent = userAgent;
      pushSub.platform = platform;
      pushSub.isActive = true;
      pushSub.lastUsed = new Date();
      await pushSub.save();
      console.log(`✅ [푸시 알림] 구독 업데이트: ${employeeName}`);
    } else {
      pushSub = await PushSubscription.create({
        userId: userId || employeeId,
        employeeId,
        employeeName,
        subscription,
        userAgent,
        platform,
        isActive: true,
      });
      console.log(`✅ [푸시 알림] 신규 구독: ${employeeName}`);
    }

    res.json({
      success: true,
      message: '푸시 알림 구독이 등록되었습니다.',
      subscriptionId: pushSub._id,
    });
  } catch (error) {
    console.error('[푸시 알림] 구독 등록 실패:', error);
    if (error.code === 11000) {
      return res
        .status(200)
        .json({ success: true, message: '이미 등록된 구독입니다.' });
    }
    res
      .status(500)
      .json({ success: false, error: '구독 등록에 실패했습니다.' });
  }
};

const sendPushNotification = async (employeeId, payload) => {
  try {
    const subscriptions = await PushSubscription.find({
      employeeId,
      isActive: true,
    });

    if (!subscriptions || subscriptions.length === 0) {
      console.warn(`⚠️ [푸시 알림] ${employeeId}의 활성 구독이 없습니다.`);
      return { success: false, error: 'No active subscription found' };
    }

    const notificationPayload = JSON.stringify({
      title: payload.title || '부성스틸 HR',
      body: payload.body || payload.message,
      icon: payload.icon || '/logo192.png',
      badge: payload.badge || '/favicon.ico',
      data: payload.data || {},
      tag: payload.tag || 'default',
      requireInteraction: payload.requireInteraction || false,
      vibrate: payload.vibrate || [200, 100, 200],
      actions: payload.actions || [],
      image: payload.image,
      timestamp: Date.now(),
    });

    const results = [];

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(sub.subscription, notificationPayload);
        sub.lastUsed = new Date();
        await sub.save();
        results.push({ success: true, subscriptionId: sub._id });
        console.log(`✅ [푸시 알림] 전송 성공: ${employeeId}`);
      } catch (error) {
        console.error(`❌ [푸시 알림] 전송 실패: ${employeeId}`, error.message);
        if (error.statusCode === 410 || error.statusCode === 404) {
          sub.isActive = false;
          await sub.save();
        }
        results.push({
          success: false,
          subscriptionId: sub._id,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    return {
      success: successCount > 0,
      results,
      totalSent: successCount,
      totalFailed: results.length - successCount,
    };
  } catch (error) {
    console.error(`❌ [푸시 알림] 전송 오류: ${employeeId}`, error);
    return { success: false, error: error.message };
  }
};

const sendPushNotificationToAll = async (payload) => {
  try {
    const subscriptions = await PushSubscription.find({ isActive: true });

    if (!subscriptions || subscriptions.length === 0) {
      console.warn('⚠️ [푸시 알림] 활성 구독이 없습니다.');
      return { success: false, error: 'No active subscriptions', results: [] };
    }

    console.log(
      `📢 [푸시 알림] 전체 알림 전송 시작: ${subscriptions.length}명`
    );

    const notificationPayload = JSON.stringify({
      title: payload.title || '부성스틸 HR',
      body: payload.body || payload.message,
      icon: payload.icon || '/logo192.png',
      badge: payload.badge || '/favicon.ico',
      data: payload.data || {},
      tag: payload.tag || 'broadcast',
      requireInteraction: payload.requireInteraction || false,
      vibrate: payload.vibrate || [200, 100, 200],
      actions: payload.actions || [],
      image: payload.image,
      timestamp: Date.now(),
    });

    const results = [];
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(sub.subscription, notificationPayload);
        sub.lastUsed = new Date();
        await sub.save();
        results.push({
          success: true,
          employeeId: sub.employeeId,
          employeeName: sub.employeeName,
        });
      } catch (error) {
        console.error(
          `❌ [푸시 알림] 전송 실패: ${sub.employeeName}`,
          error.message
        );
        if (error.statusCode === 410 || error.statusCode === 404) {
          sub.isActive = false;
          await sub.save();
        }
        results.push({
          success: false,
          employeeId: sub.employeeId,
          employeeName: sub.employeeName,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(
      `✅ [푸시 알림] 전체 알림 전송 완료: ${successCount}/${results.length} 성공`
    );

    return {
      success: true,
      results,
      totalSent: successCount,
      totalFailed: results.length - successCount,
      totalRecipients: results.length,
    };
  } catch (error) {
    console.error('❌ [푸시 알림] 전체 알림 전송 오류:', error);
    return { success: false, error: error.message, results: [] };
  }
};

const unsubscribePushNotification = async (req, res) => {
  try {
    const { employeeId, endpoint } = req.body;
    if (!employeeId && !endpoint) {
      return res
        .status(400)
        .json({ success: false, error: '직원 ID 또는 endpoint가 필요합니다.' });
    }

    const query = endpoint
      ? { 'subscription.endpoint': endpoint }
      : { employeeId };
    const result = await PushSubscription.updateMany(query, {
      isActive: false,
    });

    console.log(
      `✅ [푸시 알림] 구독 해제: ${employeeId || endpoint} (${
        result.modifiedCount
      }건)`
    );
    res.json({
      success: true,
      message: '푸시 알림 구독이 해제되었습니다.',
      unsubscribedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('[푸시 알림] 구독 해제 실패:', error);
    res
      .status(500)
      .json({ success: false, error: '구독 해제에 실패했습니다.' });
  }
};

const getUserSubscriptions = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const subscriptions = await PushSubscription.find({
      employeeId,
      isActive: true,
    });
    res.json({ success: true, subscriptions, count: subscriptions.length });
  } catch (error) {
    console.error('[푸시 알림] 구독 조회 실패:', error);
    res
      .status(500)
      .json({ success: false, error: '구독 조회에 실패했습니다.' });
  }
};

module.exports = {
  subscribePushNotification,
  unsubscribePushNotification,
  getUserSubscriptions,
  sendPushNotification,
  sendPushNotificationToAll,
  getVapidPublicKey,
};
