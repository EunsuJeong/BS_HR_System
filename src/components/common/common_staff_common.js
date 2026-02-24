/**
 * [3_일반직원 모드] 3.0_공통사항 통합 모듈
 * - Hook → Export
 * - UI 컴포넌트 제외, 지원 로직만 포함
 */

import { useEffect } from 'react';
import {
  requestFCMPermission,
  onForegroundMessage,
  showLocalNotification,
} from '../../firebase';

// ============================================================
// [3_일반직원 모드] 3.0_공통사항 - HOOKS
// ============================================================

/**
 * 일반직원 모드에서 PWA 및 FCM을 초기화하는 커스텀 훅
 * @param {Object} currentUser - 현재 로그인한 사용자 정보
 */
export const useStaffPWAInitializer = (currentUser) => {
  useEffect(() => {
    if (currentUser?.role === 'employee') {

      const initializeFCM = async () => {
        try {
          const token = await requestFCMPermission();
          if (token) {
          }
        } catch (error) {
          console.error('❌ [직원모드] FCM 초기화 실패:', error);
        }
      };
      initializeFCM();

      onForegroundMessage((payload) => {
        const { title, body } = payload.notification || {};
        if (title && body) {
          showLocalNotification(title, body);
        }
      });

    }
  }, [currentUser]);
};

// ============================================================
// [3_일반직원 모드] 3.0_공통사항 - EXPORTS (update-only)
// ============================================================

/**
 * EXPORTS:
 *
 * [Hooks]
 * - useStaffPWAInitializer: 일반직원 모드에서 PWA 및 FCM 초기화 Hook
 */
