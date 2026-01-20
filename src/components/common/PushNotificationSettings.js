import React, { useState, useEffect } from 'react';
import {
  isPushNotificationSupported,
  requestNotificationPermission,
  getNotificationPermission,
  showLocalNotification,
  subscribeToPushNotifications,
  sendSubscriptionToBackend,
} from '../../utils/pushNotifications';

/**
 * PWA 푸시 알림 설정 컴포넌트
 * 사용자가 알림을 활성화/비활성화할 수 있는 UI 제공
 */
const PushNotificationSettings = ({ employeeId, employeeName }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState('');

  useEffect(() => {
    // 푸시 알림 지원 여부 확인
    const supported = isPushNotificationSupported();
    setIsSupported(supported);

    if (supported) {
      setPermission(getNotificationPermission());
      fetchVapidPublicKey();
    }
  }, []);

  /**
   * VAPID 공개키 가져오기
   */
  const fetchVapidPublicKey = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_SERVER_URL}/api/push/vapid-public-key`
      );
      const data = await response.json();
      if (data.success && data.publicKey) {
        setVapidPublicKey(data.publicKey);
      }
    } catch (error) {
      console.error('VAPID 공개키 가져오기 실패:', error);
    }
  };

  /**
   * 알림 활성화 핸들러
   */
  const handleEnableNotifications = async () => {
    setLoading(true);
    try {
      // 1. 알림 권한 요청
      const granted = await requestNotificationPermission();

      if (!granted) {
        alert(
          '알림 권한이 거부되었습니다. 브라우저 설정에서 알림을 허용해주세요.'
        );
        setLoading(false);
        return;
      }

      setPermission('granted');

      // 2. 푸시 알림 구독
      if (vapidPublicKey) {
        const subscription = await subscribeToPushNotifications(vapidPublicKey);

        // 3. 구독 정보를 백엔드에 전송
        await sendSubscriptionToBackend(subscription, employeeId, employeeName);

        setIsSubscribed(true);

        // 4. 테스트 알림 표시
        await showLocalNotification('부성스틸 HR', {
          body: '알림이 활성화되었습니다! 🎉',
          icon: '/logo192.png',
          tag: 'activation-notification',
        });

        alert('알림이 활성화되었습니다!');
      } else {
        alert('서버 설정이 완료되지 않았습니다. VAPID 키를 확인하세요.');
      }
    } catch (error) {
      console.error('알림 활성화 실패:', error);
      alert('알림 활성화에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 테스트 알림 전송
   */
  const handleTestNotification = async () => {
    try {
      await showLocalNotification('테스트 알림', {
        body: '이것은 테스트 알림입니다. 📢',
        icon: '/logo192.png',
        badge: '/favicon.ico',
        tag: 'test',
        vibrate: [200, 100, 200],
        requireInteraction: false,
        data: { type: 'test' },
      });
    } catch (error) {
      console.error('테스트 알림 실패:', error);
      alert('테스트 알림 전송에 실패했습니다.');
    }
  };

  // 푸시 알림 미지원 브라우저
  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">
          ⚠️ 이 브라우저는 푸시 알림을 지원하지 않습니다.
        </p>
        <p className="text-sm text-yellow-600 mt-2">
          Chrome, Firefox, Edge 등 최신 브라우저를 사용해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">📱 푸시 알림 설정</h3>

      {/* 권한 상태 표시 */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">알림 권한 상태:</p>
        <div className="flex items-center gap-2">
          {permission === 'granted' && (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              ✅ 허용됨
            </span>
          )}
          {permission === 'denied' && (
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
              ❌ 거부됨
            </span>
          )}
          {permission === 'default' && (
            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
              ⏳ 미설정
            </span>
          )}
        </div>
      </div>

      {/* 알림 활성화 버튼 */}
      {permission !== 'granted' && (
        <button
          onClick={handleEnableNotifications}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '처리 중...' : '🔔 알림 활성화'}
        </button>
      )}

      {/* 테스트 알림 버튼 */}
      {permission === 'granted' && (
        <div className="space-y-3">
          <button
            onClick={handleTestNotification}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
          >
            📢 테스트 알림 보내기
          </button>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-medium mb-2">
              ✓ 알림이 활성화되었습니다!
            </p>
            <p className="text-sm text-blue-600">
              다음과 같은 경우 알림을 받을 수 있습니다:
            </p>
            <ul className="text-sm text-blue-600 mt-2 ml-4 list-disc">
              <li>연차 신청/승인/거부 시</li>
              <li>새 공지사항 등록 시</li>
              <li>급여 지급 시</li>
              <li>중요한 시스템 알림</li>
            </ul>
          </div>
        </div>
      )}

      {/* 권한 거부 시 안내 */}
      {permission === 'denied' && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 font-medium mb-2">
            알림이 차단되었습니다. 브라우저 설정에서 알림을 허용해주세요.
          </p>
          <ol className="text-sm text-red-700 mt-2 ml-4 list-decimal">
            <li>브라우저 주소창 왼쪽의 자물쇠 아이콘 클릭</li>
            <li>"알림" 또는 "권한" 선택</li>
            <li>알림을 "허용"으로 변경</li>
            <li>페이지 새로고침</li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default PushNotificationSettings;
