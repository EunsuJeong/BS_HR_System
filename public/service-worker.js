// 부성스틸 HR - Service Worker (오프라인 캐싱 + PWA 지원)
// 직원 모드 전용: 네트워크 끊김 시에도 기본 화면 표시

const CACHE_NAME = 'buseongsteel-hr-cache-v1';

// 오프라인에서도 사용 가능하도록 캐싱할 파일 목록
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/static/css/main.css', // 빌드 시 생성되는 CSS
  '/static/js/main.js',   // 빌드 시 생성되는 JS
];

// Service Worker 설치 이벤트
self.addEventListener('install', (event) => {
  console.log('[Service Worker] 설치 중...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] 파일 캐싱 중...');
        // 필수 파일은 addAll로 한번에, 선택적 파일은 개별 add로
        return cache.addAll(urlsToCache.slice(0, 6)) // 기본 파일만 필수
          .catch((error) => {
            console.warn('[Service Worker] 일부 파일 캐싱 실패:', error);
            // 빌드 파일은 개발 환경에서 없을 수 있으므로 무시
          });
      })
      .then(() => {
        console.log('[Service Worker] 설치 완료');
        return self.skipWaiting(); // 즉시 활성화
      })
  );
});

// Service Worker 활성화 이벤트
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] 활성화 중...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] 이전 캐시 삭제:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] 활성화 완료');
        return self.clients.claim(); // 즉시 제어 시작
      })
  );
});

// Fetch 이벤트 (네트워크 요청 가로채기)
self.addEventListener('fetch', (event) => {
  // Chrome extension이나 외부 요청은 무시
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[Service Worker] 캐시에서 반환:', event.request.url);
          return cachedResponse;
        }

        // 캐시에 없으면 네트워크에서 가져오기
        return fetch(event.request)
          .then((response) => {
            // 유효한 응답인지 확인
            if (!response || response.status !== 200 || response.type === 'opaque') {
              return response;
            }

            // 응답 복사 (한 번만 읽을 수 있으므로)
            const responseToCache = response.clone();

            // 동적으로 캐시에 추가 (정적 파일만)
            if (event.request.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico)$/)) {
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }

            return response;
          })
          .catch((error) => {
            console.error('[Service Worker] Fetch 실패:', error);

            // 오프라인일 때 HTML 요청이면 캐싱된 index.html 반환
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// 백그라운드 동기화 (나중에 확장 가능)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] 백그라운드 동기화:', event.tag);

  if (event.tag === 'sync-payroll') {
    event.waitUntil(
      // TODO: 서버와 급여 데이터 동기화
      Promise.resolve()
    );
  }
});

// 푸시 알림 수신 (Firebase Messaging과 별도)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '부성스틸 HR';
  const options = {
    body: data.body || '새로운 알림이 있습니다.',
    icon: data.icon || '/logo192.png',
    badge: '/logo192.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 알림 클릭 이벤트
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] 알림 클릭됨:', event.notification.tag);

  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 이미 열린 창이 있으면 포커스
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
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

console.log('[Service Worker] 로드 완료');
