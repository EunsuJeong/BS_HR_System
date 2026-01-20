// PWA 푸시 알림 유틸리티
// 알림 권한 요청 및 구독 관리

/**
 * 브라우저가 푸시 알림을 지원하는지 확인
 */
export const isPushNotificationSupported = () => {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
};

/**
 * 알림 권한 요청
 */
export const requestNotificationPermission = async () => {
  if (!isPushNotificationSupported()) {
    console.warn('이 브라우저는 푸시 알림을 지원하지 않습니다.');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('알림 권한 상태:', permission);
    return permission === 'granted';
  } catch (error) {
    console.error('알림 권한 요청 실패:', error);
    return false;
  }
};

/**
 * 현재 알림 권한 상태 확인
 */
export const getNotificationPermission = () => {
  if (!isPushNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission; // 'granted', 'denied', 'default'
};

/**
 * 푸시 알림 구독 (백엔드에 VAPID 공개키 필요)
 * @param {string} vapidPublicKey - VAPID 공개키 (백엔드에서 생성)
 */
export const subscribeToPushNotifications = async (vapidPublicKey) => {
  if (!isPushNotificationSupported()) {
    throw new Error('푸시 알림이 지원되지 않습니다.');
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // 기존 구독 확인
    let subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      console.log('이미 푸시 알림 구독 중:', subscription);
      return subscription;
    }

    // 새 구독 생성
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    console.log('푸시 알림 구독 성공:', subscription);
    return subscription;
  } catch (error) {
    console.error('푸시 알림 구독 실패:', error);
    throw error;
  }
};

/**
 * 푸시 알림 구독 해제
 */
export const unsubscribeFromPushNotifications = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      console.log('푸시 알림 구독 해제 완료');
      return true;
    }

    return false;
  } catch (error) {
    console.error('푸시 알림 구독 해제 실패:', error);
    return false;
  }
};

/**
 * 로컬 알림 표시 (테스트용 - 푸시 서버 없이 알림 표시)
 */
export const showLocalNotification = async (title, options = {}) => {
  if (!isPushNotificationSupported()) {
    console.warn('알림이 지원되지 않습니다.');
    return;
  }

  const permission = await requestNotificationPermission();
  if (!permission) {
    console.warn('알림 권한이 거부되었습니다.');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    await registration.showNotification(title, {
      body: options.body || '새로운 알림이 있습니다.',
      icon: options.icon || '/logo192.png',
      badge: options.badge || '/favicon.ico',
      tag: options.tag || 'default',
      requireInteraction: options.requireInteraction || false,
      vibrate: options.vibrate || [200, 100, 200],
      data: options.data || {},
      actions: options.actions || [],
      ...options,
    });

    console.log('로컬 알림 표시 완료');
  } catch (error) {
    console.error('로컬 알림 표시 실패:', error);
  }
};

/**
 * VAPID 공개키를 Uint8Array로 변환 (내부 유틸)
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * 구독 정보를 백엔드로 전송
 */
export const sendSubscriptionToBackend = async (
  subscription,
  employeeId,
  employeeName
) => {
  try {
    const response = await fetch(
      `${process.env.REACT_APP_SERVER_URL}/api/push/subscribe`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          userId: employeeId,
          employeeId,
          employeeName,
          userAgent: navigator.userAgent,
          platform: navigator.platform,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('구독 정보 전송 실패');
    }

    const data = await response.json();
    console.log('구독 정보 백엔드 전송 완료:', data);
    return data;
  } catch (error) {
    console.error('구독 정보 백엔드 전송 실패:', error);
    throw error;
  }
};
