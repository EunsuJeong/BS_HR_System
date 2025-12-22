// Firebase Cloud Messaging Service Worker
// 백그라운드에서 푸쉬 알림을 수신하고 표시합니다

// Firebase SDK 로드 (compat 버전 사용 - Service Worker 환경)
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase 프로젝트 설정
// 주의: 실제 배포 시 Firebase Console에서 발급받은 값으로 대체 필요
firebase.initializeApp({
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
});

// Firebase Messaging 인스턴스 생성
const messaging = firebase.messaging();

// 백그라운드 메시지 수신 리스너
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] 백그라운드 메시지 수신:', payload);

  // 알림 데이터 추출
  const notificationTitle = payload.notification?.title || '부성스틸 HR';
  const notificationOptions = {
    body: payload.notification?.body || '새로운 알림이 도착했습니다.',
    icon: payload.notification?.icon || '/logo192.png',
    badge: '/logo192.png',
    tag: payload.data?.tag || 'hr-notification',
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: payload.data || {},
  };

  // OS 알림 표시
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// 알림 클릭 이벤트 처리
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] 알림 클릭됨:', event.notification);

  event.notification.close();

  // 알림 클릭 시 앱 열기
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 이미 열린 창이 있으면 포커스
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // 열린 창이 없으면 새 창 열기
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Service Worker 설치 이벤트
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker 설치됨');
  self.skipWaiting();
});

// Service Worker 활성화 이벤트
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker 활성화됨');
  event.waitUntil(clients.claim());
});
