// Firebase Cloud Messaging 설정 및 푸쉬 알림 권한 요청
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Firebase 프로젝트 설정
// 주의: 실제 배포 시 Firebase Console에서 발급받은 값으로 대체 필요
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY', // Firebase Console > 프로젝트 설정 > 일반
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
  measurementId: 'YOUR_MEASUREMENT_ID',
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Firebase Cloud Messaging 인스턴스
let messaging = null;

// Service Worker 및 HTTPS 환경에서만 FCM 초기화
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.warn('⚠️ FCM 초기화 실패 (HTTPS 환경 필요):', error);
  }
}

/**
 * FCM 푸쉬 알림 권한 요청 및 토큰 발급
 * @returns {Promise<string|null>} FCM 토큰 또는 null
 */
export const requestFCMPermission = async () => {
  if (!messaging) {
    console.warn('⚠️ FCM을 사용할 수 없습니다 (HTTPS 환경 또는 Service Worker 필요)');
    return null;
  }

  try {
    // 알림 권한 요청
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {

      // FCM 토큰 발급 (VAPID 키는 Firebase Console > 프로젝트 설정 > Cloud Messaging에서 생성)
      const token = await getToken(messaging, {
        vapidKey: 'YOUR_VAPID_KEY', // Firebase Console에서 생성한 웹 푸시 인증서 키
      });

      if (token) {
        localStorage.setItem('fcmToken', token);
        return token;
      } else {
        console.warn('⚠️ FCM 토큰 발급 실패');
        return null;
      }
    } else if (permission === 'denied') {
      console.warn('❌ 푸쉬 알림 권한 거부됨');
      return null;
    } else {
      return null;
    }
  } catch (error) {
    console.error('❌ FCM 권한 요청 오류:', error);
    return null;
  }
};

/**
 * 포그라운드 메시지 수신 리스너 등록
 * @param {Function} callback 메시지 수신 시 실행할 콜백 함수
 */
export const onForegroundMessage = (callback) => {
  if (!messaging) {
    console.warn('⚠️ FCM을 사용할 수 없습니다');
    return;
  }

  onMessage(messaging, (payload) => {
    callback(payload);
  });
};

/**
 * 로컬 푸쉬 알림 표시 (브라우저 Notification API)
 * @param {string} title 알림 제목
 * @param {string} body 알림 본문
 * @param {string} icon 알림 아이콘 URL (옵션)
 */
export const showLocalNotification = (title, body, icon = '/icons/icon-192x192.png') => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon,
      badge: '/icons/icon-192x192.png',
      tag: 'hr-notification',
      requireInteraction: false,
    });
  } else {
    console.warn('⚠️ 브라우저 알림 권한이 없습니다');
  }
};

/**
 * FCM 토큰 조회 (localStorage에서)
 * @returns {string|null} 저장된 FCM 토큰
 */
export const getFCMToken = () => {
  return localStorage.getItem('fcmToken');
};

/**
 * FCM 토큰 삭제
 */
export const clearFCMToken = () => {
  localStorage.removeItem('fcmToken');
};

export { messaging };
export default app;
