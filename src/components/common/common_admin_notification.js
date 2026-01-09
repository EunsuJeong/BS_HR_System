/**
 * [2_관리자 모드] 2.4_알림 관리 통합 모듈
 * - Constants → Hook → Service → Util → Export
 * - UI 컴포넌트 제외, 지원 로직만 포함
 */

import { useCallback, useEffect, useState } from 'react';
import { COMPANY_STANDARDS } from './common_common';
import { NotificationAPI } from '../../api/communication';

// ============================================================
// [2_관리자 모드] 2.4_알림 관리 - CONSTANTS
// ============================================================

// *[2_관리자 모드] 2.4_반복주기 옵션*
export const repeatCycleOptions = [
  '특정일',
  '매일',
  '매주',
  '매월',
  '분기',
  '반기',
  '년',
];

// *[2_관리자 모드] 2.4_부서/직급/직책 옵션*
export const recipientOptions = {
  부서: COMPANY_STANDARDS.DEPARTMENTS,
  직급: COMPANY_STANDARDS.POSITIONS,
  직책: COMPANY_STANDARDS.ROLES,
};

// *[2_관리자 모드] 2.4_요일 목록*
export const 요일목록 = ['일', '월', '화', '수', '목', '금', '토'];

// ============================================================
// [2_관리자 모드] 2.4_알림 관리 - HOOKS
// ============================================================

/**
 * 알림 로그 state 관리 Hook
 * @returns {Object} 알림 로그 state 및 핸들러
 */
export const useNotificationLogState = () => {
  // 알림 로그 표시 개수 (7개씩 증가)
  const [visibleLogCount, setVisibleLogCount] = useState(7);

  // 더보기 핸들러 (7개씩 증가)
  const handleLoadMoreLogs = useCallback(() => {
    setVisibleLogCount((prev) => prev + 7);
  }, []);

  // 접기 핸들러 (7개로 리셋)
  const handleCollapseLogs = useCallback(() => {
    setVisibleLogCount(7);
  }, []);

  return {
    visibleLogCount,
    setVisibleLogCount,
    handleLoadMoreLogs,
    handleCollapseLogs,
  };
};

/**
 * 알림 반복 설정을 관리하는 커스텀 훅
 * @param {Object} params - 파라미터 객체
 * @param {Object} params.regularNotificationForm - 정기 알림 폼
 * @param {Function} params.setRegularNotificationForm - 정기 알림 폼 setter
 * @param {Object} params.realtimeNotificationForm - 실시간 알림 폼
 * @param {Function} params.setRealtimeNotificationForm - 실시간 알림 폼 setter
 * @param {Object} params.recurringSettings - 반복 설정
 * @param {Function} params.setRecurringSettings - 반복 설정 setter
 * @param {boolean} params.showRecurringSettingsModal - 반복 설정 모달 표시 여부
 * @param {Function} params.setShowRecurringSettingsModal - 반복 설정 모달 setter
 * @param {string} params.currentFormType - 현재 폼 타입
 * @param {Function} params.setCurrentFormType - 현재 폼 타입 setter
 * @returns {Object} 반복 설정 관리 함수들
 */
export const useNotificationRecurring = ({
  regularNotificationForm,
  setRegularNotificationForm,
  realtimeNotificationForm,
  setRealtimeNotificationForm,
  recurringSettings,
  setRecurringSettings,
  showRecurringSettingsModal,
  setShowRecurringSettingsModal,
  currentFormType,
  setCurrentFormType,
}) => {
  // *[2_관리자 모드] 2.4_반복 설정 모달 열기*
  const openRecurringSettingsModal = (formType) => {
    setCurrentFormType(formType);

    const currentForm =
      formType === 'regular'
        ? regularNotificationForm
        : realtimeNotificationForm;

    if (currentForm.recurringSettings) {
      setRecurringSettings({
        ...currentForm.recurringSettings,

        반복주기_숫자: currentForm.recurringSettings.반복주기_숫자 || 1,
        반복주기_단위: currentForm.recurringSettings.반복주기_단위 || '일',
        반복시작일:
          currentForm.recurringSettings.반복시작일 ||
          currentForm.startDate ||
          '',
        반복종료일:
          currentForm.recurringSettings.반복종료일 || currentForm.endDate || '',
        반복시간: currentForm.recurringSettings.반복시간 || '09:00',
        반복요일: currentForm.recurringSettings.반복요일 || [],
        반복일자: currentForm.recurringSettings.반복일자 || 1,
        반복월: currentForm.recurringSettings.반복월 || 1,
      });
    } else {
      setRecurringSettings({
        반복주기_숫자: 1,
        반복주기_단위: '일',
        반복시작일: currentForm.startDate || '',
        반복종료일: currentForm.endDate || '',
        반복시간: '09:00',
        반복요일: [],
        반복일자: 1,
        반복월: 1,

        매일: { 반복간격: 1 },
        매주: { 반복간격: 1, 반복요일: [] },
        매월: { 반복간격: 1, 반복일자: 1 },
        매년: { 반복간격: 1, 반복월: 1, 반복일자: 1 },
      });
    }

    setShowRecurringSettingsModal(true);
  };

  // *[2_관리자 모드] 2.4_반복 설정 모달 닫기*
  const closeRecurringSettingsModal = () => {
    setShowRecurringSettingsModal(false);
    setCurrentFormType('');
  };

  // *[2_관리자 모드] 2.4_반복 설정 완료*
  const handleRecurringSettingsComplete = () => {
    const 반복설정텍스트 = generateRecurringText();

    // repeatCycle은 enum 값만 저장 (날짜 정보 제외)
    let repeatCycleValue = '특정일';
    const { 반복주기_숫자, 반복주기_단위 } = recurringSettings;

    if (반복주기_단위 === '일') {
      repeatCycleValue = 반복주기_숫자 === 1 ? '매일' : '매일';
    } else if (반복주기_단위 === '주') {
      repeatCycleValue = '매주';
    } else if (반복주기_단위 === '월') {
      repeatCycleValue = '매월';
    } else if (반복주기_단위 === '년') {
      repeatCycleValue = '년';
    }

    if (currentFormType === 'regular') {
      setRegularNotificationForm((prev) => ({
        ...prev,
        repeatCycle: repeatCycleValue,
        startDate: recurringSettings.반복시작일,
        endDate: recurringSettings.반복종료일,
        recurringSettings: { ...recurringSettings },
      }));
    } else if (currentFormType === 'realtime') {
      setRealtimeNotificationForm((prev) => ({
        ...prev,
        repeatCycle: repeatCycleValue,
        startDate: recurringSettings.반복시작일,
        endDate: recurringSettings.반복종료일,
        recurringSettings: { ...recurringSettings },
      }));
    }

    closeRecurringSettingsModal();
  };

  // *[2_관리자 모드] 2.4_반복 텍스트 생성*
  const generateRecurringText = () => {
    const { 반복주기_숫자, 반복주기_단위, 반복시작일, 반복종료일, 반복요일 } =
      recurringSettings;

    let 텍스트;
    if (반복주기_단위 === '일') {
      if (반복주기_숫자 === 1) {
        텍스트 = '매일';
      } else {
        텍스트 = `${반복주기_숫자}일마다`;
      }
    } else {
      텍스트 = `${반복주기_숫자}${반복주기_단위}마다`;
    }

    if (반복주기_단위 === '주' && 반복요일.length > 0) {
      텍스트 += ` (${반복요일.join(', ')})`;
    }

    if (반복시작일) {
      텍스트 += ` [${반복시작일}부터`;
      if (반복종료일) {
        텍스트 += ` ${반복종료일}까지]`;
      } else {
        텍스트 += `]`;
      }
    } else if (반복종료일) {
      텍스트 += ` [${반복종료일}까지]`;
    }

    return 텍스트;
  };

  // *[2_관리자 모드] 2.4_요일 토글*
  const handleWeekdayToggle = (요일) => {
    setRecurringSettings((prev) => ({
      ...prev,
      반복요일: prev.반복요일.includes(요일)
        ? prev.반복요일.filter((d) => d !== 요일)
        : [...prev.반복요일, 요일],
    }));
  };

  return {
    openRecurringSettingsModal,
    closeRecurringSettingsModal,
    handleRecurringSettingsComplete,
    generateRecurringText,
    handleWeekdayToggle,
  };
};

// ============================================================
// useAdminNotifications.js
// ============================================================

// *[2_관리자 모드] 관리자 알림 관리 훅*

/**
 * 관리자 알림을 생성하고 관리하는 커스텀 훅
 * @param {Object} params - 파라미터 객체
 * @param {Object} params.currentUser - 현재 로그인한 사용자 정보
 * @param {Function} params.logSystemEvent - 시스템 이벤트 로그 함수
 * @returns {Object} 관리자 알림 관리 함수들
 */
export const useAdminNotifications = ({ currentUser, logSystemEvent }) => {
  // *[2_관리자 모드] 2.12_관리자 알림 상태*
  const [adminNotifications, setAdminNotifications] = useState([]);

  // *[2_관리자 모드] 2.12_알림 제목 생성*
  /**
   * 알림 유형과 우선순위에 따라 제목 생성
   * @param {string} type - 알림 유형
   * @param {string} priority - 우선순위 (CRITICAL, HIGH 등)
   * @returns {string} 생성된 알림 제목
   */
  const getNotificationTitle = (type, priority) => {
    const titles = {
      DB_CONNECTION_FAILED: 'DB/ERP 연결 실패',
      EXTERNAL_API_FAILED: '외부 API 호출 실패',
      API_KEY_TEST_ERROR: 'API 키 테스트 오류',
      AUTH_FAILURE: '인증 실패',
      DATA_ACCESS_DENIED: '데이터 접근 거부',
      MODEL_CHANGE: 'AI 모델 변경',
      BULK_DOWNLOAD: '대량 다운로드',
      REPEATED_ERROR: '반복 오류 발생',
    };

    const priorityPrefix =
      priority === 'CRITICAL'
        ? '🚨 긴급: '
        : priority === 'HIGH'
        ? '⚠️ 중요: '
        : '';

    return priorityPrefix + (titles[type] || '시스템 이벤트');
  };

  // *[2_관리자 모드] 2.12_관리자 알림 트리거*
  /**
   * 관리자 알림을 생성하고 브라우저 알림을 표시
   * @param {Object} logEntry - 알림 로그 항목
   * @param {string} logEntry.type - 알림 유형
   * @param {string} logEntry.priority - 우선순위
   * @param {string} logEntry.message - 알림 메시지
   * @param {Object} logEntry.details - 상세 정보
   * @param {string} logEntry.userId - 사용자 ID
   * @param {Object} logEntry.userInfo - 사용자 정보
   */
  const triggerAdminNotification = (logEntry) => {
    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: logEntry.type,
      priority: logEntry.priority,
      title: getNotificationTitle(logEntry.type, logEntry.priority),
      message: logEntry.message,
      details: logEntry.details,
      userId: logEntry.userId,
      userInfo: logEntry.userInfo,
      read: false,
      dismissed: false,
    };

    setAdminNotifications((prev) => {
      const newNotifications = [notification, ...prev];

      if (newNotifications.length > 50) newNotifications.pop();

      localStorage.setItem(
        'adminNotifications',
        JSON.stringify(newNotifications)
      );

      return newNotifications;
    });

    if (currentUser?.role === 'admin' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(`[${notification.priority}] HR 시스템 알림`, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.id,
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification(`[${notification.priority}] HR 시스템 알림`, {
              body: notification.message,
              icon: '/favicon.ico',
              tag: notification.id,
            });
          }
        });
      }
    }

    logSystemEvent(
      'ADMIN_NOTIFICATION',
      `관리자 알림 생성: ${notification.title}`,
      {
        notificationId: notification.id,
        priority: notification.priority,
      },
      'INFO'
    );
  };

  return {
    adminNotifications,
    setAdminNotifications,
    triggerAdminNotification,
    getNotificationTitle,
  };
};

// ============================================================
// useEmployeeNotifications.js
// ============================================================

// *[3_일반직원 모드] 일반직원 푸시 알림 및 읽음 상태 관리*

/**
 * 일반직원 푸시 알림 및 읽음 상태를 관리하는 커스텀 훅
 * @param {Object} params - 파라미터 객체
 * @param {Object} params.currentUser - 현재 사용자 정보
 * @param {Array} params.notices - 공지사항 배열
 * @param {Array} params.employeeNotifications - 직원 알림 배열
 * @param {Function} params.setEmployeeNotifications - 직원 알림 setter
 * @param {Object} params.payrollByMonth - 월별 급여 데이터
 * @param {Function} params.setPayrollByMonth - 급여 데이터 setter
 * @param {Function} params.showLocalNotification - 로컬 알림 표시 함수
 * @param {Array} params.regularNotifications - 정기 알림 배열
 * @param {Array} params.realtimeNotifications - 실시간 알림 배열
 * @param {Array} params.notificationLogs - 알림 로그 배열
 * @param {Set} params.readNotifications - 읽은 알림 Set
 * @param {Function} params.setReadNotifications - 읽은 알림 setter
 * @param {Set} params.readAnnouncements - 읽은 공지사항 Set
 * @param {Function} params.setReadAnnouncements - 읽은 공지사항 setter
 * @param {Function} params.updateEmployeeNotifications - 직원 알림 업데이트 함수
 * @param {Function} params.devLog - 개발 로그 함수
 * @returns {Object} 읽음 상태 관리 함수들
 */
export const useEmployeeNotifications = ({
  currentUser,
  notices,
  employeeNotifications,
  setEmployeeNotifications,
  payrollByMonth,
  setPayrollByMonth,
  showLocalNotification,
  regularNotifications,
  realtimeNotifications,
  notificationLogs,
  readNotifications,
  setReadNotifications,
  readAnnouncements,
  setReadAnnouncements,
  updateEmployeeNotifications,
  devLog,
}) => {
  // *[3_일반직원 모드] 3.2_공지사항 푸시*
  useEffect(() => {
    if (currentUser?.role === 'employee' && notices && notices.length > 0) {
      const latestNotice = notices[0];
      if (latestNotice) {
        showLocalNotification(
          '📢 새 공지사항',
          `${latestNotice.title || '새로운 공지가 등록되었습니다.'}`
        );
      }
    }
  }, [notices, currentUser, showLocalNotification]);

  // *[3_일반직원 모드] 3.3_알림 푸시*
  useEffect(() => {
    if (
      currentUser?.role === 'employee' &&
      employeeNotifications &&
      employeeNotifications.length > 0
    ) {
      const latestNotification = employeeNotifications[0];
      if (latestNotification) {
        showLocalNotification(
          '🔔 새 알림',
          `${latestNotification.title || '새로운 알림이 도착했습니다.'}`
        );
      }
    }
  }, [employeeNotifications, currentUser, showLocalNotification]);

  // *[3_일반직원 모드] 3.5_급여 푸시*
  useEffect(() => {
    if (currentUser?.role === 'employee' && payrollByMonth) {
      const allPayrollData = Object.values(payrollByMonth).flat();
      const myPayroll = allPayrollData.filter(
        (p) => p.성명 === currentUser?.name
      );
      if (myPayroll.length > 0) {
        const latestPayroll = myPayroll[0];
        if (latestPayroll) {
          showLocalNotification(
            '💰 급여 내역 업데이트',
            `${latestPayroll.성명}님의 급여 내역이 등록/수정되었습니다.`
          );
        }
      }
    }
  }, [payrollByMonth, currentUser, showLocalNotification]);

  // *[3_일반직원 모드] 3.5_급여 초기 동기화*
  useEffect(() => {
    if (currentUser?.role === 'employee') {
      try {
        const savedPayroll = localStorage.getItem('payrollByMonth');
        if (savedPayroll) {
          const payrollData = JSON.parse(savedPayroll);
          setPayrollByMonth(payrollData);
        }
      } catch (error) {
        console.error('❌ 급여 로드 실패:', error);
      }
    }
  }, [currentUser, setPayrollByMonth]);

  // *[3_일반직원 모드] 3.3_직원 알림 자동 업데이트*
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      updateEmployeeNotifications();
    }
  }, [
    currentUser,
    regularNotifications,
    realtimeNotifications,
    notificationLogs,
    updateEmployeeNotifications,
  ]);

  // *[3_일반직원 모드] 3.3_알림 읽음 상태 초기화* (DB 기반)
  useEffect(() => {
    if (currentUser?.id) {
      try {
        // 공지사항: viewedBy 필드 확인
        const readNoticeIds = new Set(
          notices
            .filter((notice) => notice.viewedBy?.includes(currentUser.id))
            .map((notice) => notice.id || notice._id)
        );
        setReadAnnouncements(readNoticeIds);

        // 알림: readBy 필드 확인
        const readNotificationIds = new Set(
          employeeNotifications
            .filter((notification) =>
              notification.readBy?.includes(currentUser.id)
            )
            .map((notification) => notification._id || notification.id)
        );
        setReadNotifications(readNotificationIds);
      } catch (error) {
        devLog('Failed to load read states from DB:', error);
        setReadNotifications(new Set());
        setReadAnnouncements(new Set());
      }
    }
  }, [
    currentUser?.id,
    notices,
    employeeNotifications,
    setReadNotifications,
    setReadAnnouncements,
    devLog,
  ]);

  // *[3_일반직원 모드] 3.3_알림 읽음 처리* (DB에 저장)
  const markNotificationAsRead = useCallback(
    async (notificationId) => {
      if (!currentUser?.id) return;

      try {
        // DB에 읽음 상태 저장
        await NotificationAPI.markAsRead(notificationId, currentUser.id);

        // 로컬 state 업데이트
        setReadNotifications((prev) => {
          const newSet = new Set([...prev, notificationId]);
          return newSet;
        });
      } catch (error) {
        devLog('Failed to mark notification as read:', error);
      }
    },
    [currentUser?.id, setReadNotifications, devLog]
  );

  // *[3_일반직원 모드] 3.2_공지사항 읽음 처리* (조회수 API 사용 - 이미 viewedBy에 저장됨)
  const markNoticeAsRead = useCallback(
    async (noticeId) => {
      if (!currentUser?.id) return;

      try {
        // 조회수 증가 API는 이미 viewedBy에 저장하므로 추가 API 호출 불필요
        // 로컬 state만 업데이트
        setReadAnnouncements((prev) => {
          const newSet = new Set([...prev, noticeId]);
          return newSet;
        });
      } catch (error) {
        devLog('Failed to mark notice as read:', error);
      }
    },
    [currentUser?.id, setReadAnnouncements, devLog]
  );

  // *[3_일반직원 모드] 3.3_읽지 않은 알림 개수*
  const getUnreadNotificationCount = useCallback(() => {
    return employeeNotifications.filter(
      (notification) => !readNotifications.has(notification.id)
    ).length;
  }, [employeeNotifications, readNotifications]);

  // *[3_일반직원 모드] 3.2_읽지 않은 공지사항 개수*
  const getUnreadNoticeCount = useCallback(() => {
    const publishedNotices = notices.filter(
      (notice) => !notice.isScheduled || notice.isPublished
    );
    return publishedNotices.filter(
      (notice) => !readAnnouncements.has(notice.id)
    ).length;
  }, [notices, readAnnouncements]);

  return {
    markNotificationAsRead,
    markNoticeAsRead,
    getUnreadNotificationCount,
    getUnreadNoticeCount,
  };
};

// *[2_관리자 모드] 2.3_공지 관리 훅*
export const useNoticeManagement = (dependencies = {}) => {
  const {
    noticeFiles = [],
    setNoticeFiles = () => {},
    noticeForm = {},
    setNoticeForm = () => {},
    noticeSearch = {},
  } = dependencies;

  // [2_관리자 모드] 2.3_공지 관리 - 파일 업로드
  const handleNoticeFileUpload = useCallback(
    (e) => {
      const files = Array.from(e.target.files);
      setNoticeFiles((prev) => [...prev, ...files]);
    },
    [setNoticeFiles]
  );

  // [2_관리자 모드] 2.3_공지 관리 - 파일 제거
  const handleRemoveNoticeFile = useCallback(
    (fileName) => {
      setNoticeFiles((prev) => prev.filter((file) => file.name !== fileName));
    },
    [setNoticeFiles]
  );

  // [2_관리자 모드] 2.3_공지 관리 - 이미지 붙여넣기
  const handleNoticePasteImage = useCallback(
    (e) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const imageUrl = event.target.result;
                const currentContent = noticeForm.content;
                setNoticeForm((f) => ({
                  ...f,
                  content:
                    currentContent +
                    `\n<img src="${imageUrl}" alt="붙여넣기 이미지" style="max-width: 100%; height: auto;" />\n`,
                }));
              };
              reader.readAsDataURL(file);
            }
          }
        }
      }
    },
    [noticeForm, setNoticeForm]
  );

  // [2_관리자 모드] 2.3_공지 관리 - 공지 목록 필터링
  const getFilteredNotices = useCallback(
    (noticeList) => {
      return noticeList.filter((notice) => {
        if (noticeSearch.year || noticeSearch.month || noticeSearch.day) {
          const noticeDate = new Date(notice.date);
          if (
            noticeSearch.year &&
            noticeDate.getFullYear() !== parseInt(noticeSearch.year)
          ) {
            return false;
          }
          if (
            noticeSearch.month &&
            noticeDate.getMonth() + 1 !== parseInt(noticeSearch.month)
          ) {
            return false;
          }
          if (
            noticeSearch.day &&
            noticeDate.getDate() !== parseInt(noticeSearch.day)
          ) {
            return false;
          }
        }

        if (noticeSearch.keyword) {
          if (
            !notice.title?.includes(noticeSearch.keyword) &&
            !notice.content?.includes(noticeSearch.keyword)
          ) {
            return false;
          }
        }

        return true;
      });
    },
    [noticeSearch]
  );

  return {
    handleNoticeFileUpload,
    handleRemoveNoticeFile,
    handleNoticePasteImage,
    getFilteredNotices,
  };
};

// ============================================================
// [2_관리자 모드] 2.4_알림 관리 - SERVICES
// ============================================================

// ============ notificationService.js ============
// *[2_관리자 모드] 2.4_알림 관리 서비스*

/**
 * 알림 관리 관련 핸들러 함수들을 생성하는 Hook
 * @param {Object} deps - 의존성 객체
 * @returns {Object} 알림 핸들러 함수들
 */
export const useNotificationHandlers = (deps) => {
  const {
    regularNotifications,
    setRegularNotifications,
    realtimeNotifications,
    setRealtimeNotifications,
    regularNotificationForm,
    setRegularNotificationForm,
    realtimeNotificationForm,
    setRealtimeNotificationForm,
    notificationLogs,
    setNotificationLogs,
    employeeNotifications,
    setEmployeeNotifications,
    setShowAddRegularNotificationPopup,
    setShowAddRealtimeNotificationPopup,
    editingRegularNotification,
    setEditingRegularNotification,
    editingRealtimeNotification,
    setEditingRealtimeNotification,
    setShowEditRegularNotificationPopup,
    setShowEditRealtimeNotificationPopup,
    currentUser,
    shouldReceiveNotification,
    devLog,
  } = deps;

  // *[2_관리자 모드] 2.4_정기 알림 추가*
  const handleAddRegularNotification = async () => {
    if (!regularNotificationForm.title || !regularNotificationForm.content) {
      alert('제목과 내용을 입력해주세요.');
      return false;
    }
    if (
      !regularNotificationForm.startDate ||
      !regularNotificationForm.endDate
    ) {
      alert('시작일과 종료일을 입력해주세요.');
      return false;
    }

    try {
      // DB에 정기 알림 저장
      const notificationData = {
        notificationType: '정기',
        title: regularNotificationForm.title,
        content: regularNotificationForm.content,
        status: regularNotificationForm.status,
        startDate: regularNotificationForm.startDate,
        endDate: regularNotificationForm.endDate,
        repeatCycle: regularNotificationForm.repeatCycle,
        recipients: regularNotificationForm.recipients,
      };

      const savedNotification = await NotificationAPI.create(notificationData);

      // MongoDB의 _id를 id로 매핑
      const mappedNotification = {
        ...savedNotification,
        id: savedNotification._id || savedNotification.id,
      };

      // 로컬 state 업데이트
      setRegularNotifications([...regularNotifications, mappedNotification]);

      // 알림 로그 추가 (진행중 상태일 때만)
      if (regularNotificationForm.status === '진행중') {
        const newLog = {
          id: mappedNotification.id,
          type: '정기',
          title: regularNotificationForm.title,
          content: regularNotificationForm.content,
          recipients: getRecipientText(regularNotificationForm.recipients),
          repeatType: regularNotificationForm.repeatCycle,
          createdAt: new Date()
            .toLocaleString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })
            .replace(/\. /g, '-')
            .replace('.', ''),
          completedAt: null,
        };
        setNotificationLogs([newLog, ...notificationLogs]);
      }

      setRegularNotificationForm({
        title: '',
        content: '',
        status: '진행중',
        startDate: '',
        endDate: '',
        repeatCycle: '특정일',
        recipients: { type: '전체', value: '전체직원' },
      });
      setShowAddRegularNotificationPopup(false);

      devLog('✅ 정기 알림 생성 완료:', savedNotification);
      updateEmployeeNotifications();
      return true;
    } catch (error) {
      console.error('❌ 정기 알림 생성 실패:', error);
      alert('알림 생성 중 오류가 발생했습니다.');
      return false;
    }
  };

  // *[2_관리자 모드] 2.4_실시간 알림 추가*
  const handleAddRealtimeNotification = async () => {
    if (!realtimeNotificationForm.title || !realtimeNotificationForm.content) {
      alert('제목과 내용을 입력해주세요.');
      return false;
    }

    try {
      // DB에 실시간 알림 저장 (상태는 자동으로 '완료')
      const notificationData = {
        notificationType: '실시간',
        title: realtimeNotificationForm.title,
        content: realtimeNotificationForm.content,
        status: '완료',
        startDate: realtimeNotificationForm.startDate || '',
        endDate: realtimeNotificationForm.endDate || '',
        repeatCycle: realtimeNotificationForm.repeatCycle || '특정일',
        recipients: realtimeNotificationForm.recipients,
        completedAt: new Date(),
      };

      const savedNotification = await NotificationAPI.create(notificationData);

      // MongoDB의 _id를 id로 매핑
      const mappedNotification = {
        ...savedNotification,
        id: savedNotification._id || savedNotification.id,
      };

      // 로컬 state 업데이트
      setRealtimeNotifications([...realtimeNotifications, mappedNotification]);

      const newEmployeeNotification = {
        id: mappedNotification.id,
        title: savedNotification.title,
        content: savedNotification.content,
        type: '실시간',
        createdAt: savedNotification.createdAt,
        read: false,
      };
      setEmployeeNotifications((prev) => [newEmployeeNotification, ...prev]);

      // 알림 로그 추가
      const newLog = {
        id: mappedNotification.id,
        type: '실시간',
        title: realtimeNotificationForm.title,
        content: realtimeNotificationForm.content,
        recipients: getRecipientText(realtimeNotificationForm.recipients),
        createdAt: new Date()
          .toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })
          .replace(/\. /g, '-')
          .replace('.', ''),
        completedAt: new Date()
          .toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })
          .replace(/\. /g, '-')
          .replace('.', ''),
      };
      setNotificationLogs([newLog, ...notificationLogs]);

      setRealtimeNotificationForm({
        title: '',
        content: '',
        status: '진행중',
        startDate: '',
        endDate: '',
        repeatCycle: '특정일',
        recipients: { type: '전체', value: '전체직원' },
      });
      setShowAddRealtimeNotificationPopup(false);

      devLog('✅ 실시간 알림 생성 완료:', savedNotification);
      updateEmployeeNotifications();
      return true;
    } catch (error) {
      console.error('❌ 실시간 알림 생성 실패:', error);
      alert('알림 생성 중 오류가 발생했습니다.');
      return false;
    }
  };

  // *[2_관리자 모드] 2.4_실시간 알림 완료*
  const handleCompleteRealtimeNotification = async (id) => {
    try {
      // DB에 상태 업데이트
      await NotificationAPI.updateStatus(id, '완료');

      // 로컬 state 업데이트
      setRealtimeNotifications((prev) =>
        prev.map((notification) =>
          notification._id === id || notification.id === id
            ? {
                ...notification,
                status: '완료',
                completedAt: new Date().toLocaleString('ko-KR'),
              }
            : notification
        )
      );

      devLog('✅ 실시간 알림 완료 처리:', id);
      updateEmployeeNotifications();
    } catch (error) {
      console.error('❌ 실시간 알림 완료 처리 실패:', error);
      alert('알림 상태 변경 중 오류가 발생했습니다.');
    }
  };

  // *[2_관리자 모드] 2.4_정기 알림 삭제*
  const handleDeleteRegularNotification = async (id) => {
    try {
      // DB에서 삭제
      await NotificationAPI.delete(id);

      // 로컬 state 업데이트
      setRegularNotifications((prev) =>
        prev.filter((n) => n._id !== id && n.id !== id)
      );

      devLog('✅ 정기 알림 삭제 완료:', id);
      updateEmployeeNotifications();
    } catch (e) {
      console.error('❌ 정기알림 삭제 오류:', e);
      alert('알림 삭제 중 오류가 발생했습니다.');
    }
  };

  // *[2_관리자 모드] 2.4_실시간 알림 삭제*
  const handleDeleteRealtimeNotification = async (id) => {
    try {
      // DB에서 삭제
      await NotificationAPI.delete(id);

      // 로컬 state 업데이트
      setRealtimeNotifications((prev) =>
        prev.filter(
          (notification) => notification._id !== id && notification.id !== id
        )
      );

      devLog('✅ 실시간 알림 삭제 완료:', id);
      updateEmployeeNotifications();
    } catch (e) {
      console.error('❌ 실시간알림 삭제 오류:', e);
      alert('알림 삭제 중 오류가 발생했습니다.');
    }
  };

  // *[2_관리자 모드] 2.4_정기 알림 수정 시작*
  const handleEditRegularNotification = (notification) => {
    setEditingRegularNotification(notification);

    const recipients = notification.recipients || {
      type: '전체',
      value: '전체직원',
      selectedEmployees: [],
    };
    if (typeof recipients === 'string') {
      const recipientsObj = {
        type: recipients === '전체' ? '전체' : '개인',
        value: recipients,
        selectedEmployees: [],
      };
      setRegularNotificationForm({
        title: notification.title,
        content: notification.content,
        status: notification.status,
        startDate: notification.startDate,
        endDate: notification.endDate,
        repeatCycle: notification.repeatCycle,
        recipients: recipientsObj,
        recurringSettings: notification.recurringSettings || null,
      });
    } else {
      setRegularNotificationForm({
        title: notification.title,
        content: notification.content,
        status: notification.status,
        startDate: notification.startDate,
        endDate: notification.endDate,
        repeatCycle: notification.repeatCycle,
        recipients: recipients,
        recurringSettings: notification.recurringSettings || null,
      });
    }
    setShowEditRegularNotificationPopup(true);
  };

  // *[2_관리자 모드] 2.4_실시간 알림 수정 시작*
  const handleEditRealtimeNotification = (notification) => {
    setEditingRealtimeNotification(notification);

    const recipients = notification.recipients || {
      type: '전체',
      value: '전체직원',
      selectedEmployees: [],
    };
    if (typeof recipients === 'string') {
      const recipientsObj = {
        type: recipients === '전체' ? '전체' : '개인',
        value: recipients,
        selectedEmployees: [],
      };
      setRealtimeNotificationForm({
        title: notification.title,
        content: notification.content,
        status: notification.status,
        startDate: notification.startDate,
        endDate: notification.endDate,
        repeatCycle: notification.repeatCycle,
        recipients: recipientsObj,
      });
    } else {
      setRealtimeNotificationForm({
        title: notification.title,
        content: notification.content,
        status: notification.status,
        startDate: notification.startDate,
        endDate: notification.endDate,
        repeatCycle: notification.repeatCycle,
        recipients: recipients,
      });
    }
    setShowEditRealtimeNotificationPopup(true);
  };

  // *[2_관리자 모드] 2.4_정기 알림 수정 저장*
  const handleSaveRegularNotificationEdit = async () => {
    if (!regularNotificationForm.title || !regularNotificationForm.content) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }
    if (
      !regularNotificationForm.startDate ||
      !regularNotificationForm.endDate
    ) {
      alert('시작일과 종료일을 입력해주세요.');
      return;
    }

    try {
      const notificationId =
        editingRegularNotification._id || editingRegularNotification.id;

      // DB에 수정 사항 저장
      await NotificationAPI.update(notificationId, regularNotificationForm);

      // 로컬 state 업데이트
      setRegularNotifications((prev) =>
        prev.map((notification) =>
          notification._id === notificationId ||
          notification.id === notificationId
            ? { ...notification, ...regularNotificationForm }
            : notification
        )
      );

      setEditingRegularNotification(null);
      setRegularNotificationForm({
        title: '',
        content: '',
        status: '진행중',
        startDate: '',
        endDate: '',
        repeatCycle: '특정일',
        recipients: { type: '전체', value: '전체직원' },
      });
      setShowEditRegularNotificationPopup(false);
      devLog('✅ 정기 알림 수정 완료');
      updateEmployeeNotifications();
    } catch (error) {
      console.error('❌ 정기 알림 수정 실패:', error);
      alert('알림 수정 중 오류가 발생했습니다.');
    }
  };

  // *[2_관리자 모드] 2.4_실시간 알림 수정 저장*
  const handleSaveRealtimeNotificationEdit = async () => {
    if (!realtimeNotificationForm.title || !realtimeNotificationForm.content) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    try {
      const notificationId =
        editingRealtimeNotification._id || editingRealtimeNotification.id;

      // DB에 수정 사항 저장
      await NotificationAPI.update(notificationId, realtimeNotificationForm);

      // 로컬 state 업데이트
      setRealtimeNotifications((prev) =>
        prev.map((notification) =>
          notification._id === notificationId ||
          notification.id === notificationId
            ? { ...notification, ...realtimeNotificationForm }
            : notification
        )
      );

      setEditingRealtimeNotification(null);
      setRealtimeNotificationForm({
        title: '',
        content: '',
        status: '진행중',
        startDate: '',
        endDate: '',
        repeatCycle: '특정일',
        recipients: { type: '전체', value: '전체직원' },
      });
      setShowEditRealtimeNotificationPopup(false);
      devLog('✅ 실시간 알림 수정 완료');
      updateEmployeeNotifications();
    } catch (error) {
      console.error('❌ 실시간 알림 수정 실패:', error);
      alert('알림 수정 중 오류가 발생했습니다.');
    }
    updateEmployeeNotifications();
  };

  // *[2_관리자 모드] 2.4_알림 만료 판정 (연차 만료 알림: 30일, 일반 알림: 5일)*
  const isExpired5Days = (notification) => {
    // notification이 문자열이나 Date인 경우 (레거시 호환)
    if (typeof notification === 'string' || notification instanceof Date || !notification?.createdAt) {
      const createdAt = notification;
      if (!createdAt) return true;

      try {
        let timestamp;

        // Date 객체인 경우 직접 처리
        if (createdAt instanceof Date) {
          timestamp = createdAt.getTime();
        }
        // 문자열인 경우
        else if (typeof createdAt === 'string') {
          if (createdAt.includes('T') || createdAt.match(/^\d{4}-\d{2}-\d{2}$/)) {
            timestamp = new Date(createdAt).getTime();
          } else {
            const match = createdAt.match(
              /(\d{4})-(\d{2})-(\d{2})\s*(오전|오후)\s*(\d{1,2}):(\d{2})/
            );
            if (!match) {
              timestamp = new Date(createdAt).getTime();
            } else {
              const [, year, month, day, ampm, hour, minute] = match;
              let hours = parseInt(hour);
              if (ampm === '오후' && hours !== 12) hours += 12;
              if (ampm === '오전' && hours === 12) hours = 0;
              timestamp = new Date(year, month - 1, day, hours, minute).getTime();
            }
          }
        }
        // 그 외의 경우 (숫자 등)
        else {
          timestamp = new Date(createdAt).getTime();
        }

        if (isNaN(timestamp)) {
          return true;
        }

        const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
        const isExpired = Date.now() - timestamp >= FIVE_DAYS_MS;
        return isExpired;
      } catch (error) {
        return true;
      }
    }

    // notification 객체인 경우
    if (!notification?.createdAt) return true;

    const now = new Date();

    // 연차 만료 알림 특별 처리: 새 연차 시작일로부터 30일간 표시
    if (notification.related?.entity === 'annualLeave') {
      const nextAnnualStart = notification.related?.nextAnnualStart;

      if (!nextAnnualStart) {
        // nextAnnualStart 정보가 없으면 생성일 기준 30일 (fallback)
        const created = new Date(notification.createdAt);
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        return now.getTime() - created.getTime() > thirtyDaysInMs;
      }

      // 새 연차 시작일로부터 30일 경과 확인
      const annualStart = new Date(nextAnnualStart);
      const thirtyDaysLater = new Date(annualStart);
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

      return now > thirtyDaysLater;
    }

    // 일반 알림: 생성일로부터 5일간 표시
    try {
      const createdAt = notification.createdAt;
      let timestamp;

      if (createdAt instanceof Date) {
        timestamp = createdAt.getTime();
      } else if (typeof createdAt === 'string') {
        if (createdAt.includes('T') || createdAt.match(/^\d{4}-\d{2}-\d{2}$/)) {
          timestamp = new Date(createdAt).getTime();
        } else {
          const match = createdAt.match(
            /(\d{4})-(\d{2})-(\d{2})\s*(오전|오후)\s*(\d{1,2}):(\d{2})/
          );
          if (!match) {
            timestamp = new Date(createdAt).getTime();
          } else {
            const [, year, month, day, ampm, hour, minute] = match;
            let hours = parseInt(hour);
            if (ampm === '오후' && hours !== 12) hours += 12;
            if (ampm === '오전' && hours === 12) hours = 0;
            timestamp = new Date(year, month - 1, day, hours, minute).getTime();
          }
        }
      } else {
        timestamp = new Date(createdAt).getTime();
      }

      if (isNaN(timestamp)) return true;

      const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
      return Date.now() - timestamp >= FIVE_DAYS_MS;
    } catch (error) {
      return true;
    }
  };

  // *[2_관리자 모드] 2.4_직원 알림 업데이트*
  const updateEmployeeNotifications = useCallback(() => {
    if (!currentUser) {
      setEmployeeNotifications([]);
      return;
    }

    const activeRegular = regularNotifications.filter(
      (n) => n.status === '진행중'
    );
    const activeRealtime = realtimeNotifications.filter(
      (n) => n.status === '진행중'
    );
    const completedRealtime = realtimeNotifications.filter(
      (n) => n.status === '완료'
    );

    // *[2_관리자 모드] 2.4_날짜 timestamp 변환*
    const parseKoreanDate = (dateStr) => {
      if (!dateStr) return 0;

      const match = dateStr.match(
        /(\d{4})-(\d{2})-(\d{2})\s*(오전|오후)\s*(\d{1,2}):(\d{2})/
      );
      if (!match) return new Date(dateStr).getTime() || 0;

      const [, year, month, day, ampm, hour, minute] = match;
      let hours = parseInt(hour);
      if (ampm === '오후' && hours !== 12) hours += 12;
      if (ampm === '오전' && hours === 12) hours = 0;

      return new Date(year, month - 1, day, hours, minute).getTime();
    };

    const allNotifications = [
      ...activeRegular.map((n) => ({
        ...n,
        type: '정기',
        timestamp: parseKoreanDate(n.createdAt),
      })),
      ...activeRealtime.map((n) => ({
        ...n,
        type: '실시간',
        timestamp: parseKoreanDate(n.createdAt),
      })),
      ...completedRealtime.map((n) => ({
        ...n,
        type: '실시간',
        timestamp: parseKoreanDate(n.completedAt || n.createdAt),
      })),
    ]
      .filter((notification) => {
        const expired = isExpired5Days(notification);
        if (expired) {
          return false;
        }

        const shouldReceive = shouldReceiveNotification(notification, currentUser);
        if (!shouldReceive) {
          return false;
        }

        if (
          notification.isAutoGenerated &&
          notification.title &&
          (notification.title.includes('연차 신청') ||
            notification.title.includes('건의사항 신청')) &&
          notification.title.includes(currentUser.name)
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = a.timestamp || new Date(a.createdAt).getTime() || 0;
        const timeB = b.timestamp || new Date(b.createdAt).getTime() || 0;
        return timeB - timeA;
      });

    setEmployeeNotifications(allNotifications);
  }, [currentUser, regularNotifications, realtimeNotifications]);

  return {
    handleAddRegularNotification,
    handleAddRealtimeNotification,
    handleCompleteRealtimeNotification,
    handleDeleteRegularNotification,
    handleDeleteRealtimeNotification,
    handleEditRegularNotification,
    handleEditRealtimeNotification,
    handleSaveRegularNotificationEdit,
    handleSaveRealtimeNotificationEdit,
    isExpired5Days,
    updateEmployeeNotifications,
  };
};

// *[2_관리자 모드] 2.4_알림 수신자 텍스트 변환*
/**
 * 알림 수신자 정보를 텍스트로 변환
 * @param {Object} recipients - 수신자 정보 객체
 * @returns {string} 변환된 수신자 텍스트
 */
export const getRecipientText = (recipients) => {
  if (recipients.type === '전체') return '전체직원';
  if (recipients.type === '부서') return `${recipients.value}부서`;
  if (recipients.type === '직급') return `${recipients.value}`;
  if (recipients.type === '직책') return `${recipients.value}`;
  if (recipients.type === '개인') {
    if (
      recipients.selectedEmployees &&
      recipients.selectedEmployees.length > 0
    ) {
      if (recipients.selectedEmployees.length === 1) {
        return recipients.selectedEmployees[0];
      } else {
        return `${recipients.selectedEmployees[0]} 외 ${
          recipients.selectedEmployees.length - 1
        }명`;
      }
    }
    return recipients.value || '개인';
  }
  return recipients.value;
};

// *[1_공통] 알림 수신자 체크*
/**
 * 특정 직원이 알림을 받아야 하는지 체크
 * @param {Object} notification - 알림 객체
 * @param {Object} employee - 직원 객체
 * @returns {boolean} 수신 여부
 */
export const shouldReceiveNotification = (notification, employee) => {
  if (!notification.recipients || !employee) return true; // 기본값은 모든 알림 수신

  const { recipients } = notification;

  if (typeof recipients === 'string') {
    return recipients === '전체';
  }

  if (typeof recipients === 'object' && recipients.type) {
    switch (recipients.type) {
      case '전체':
        return true;
      case '부서':
        return employee.department === recipients.value;
      case '직급':
        return employee.position === recipients.value;
      case '직책':
        return employee.role === recipients.value;
      case '개인':
        if (
          recipients.selectedEmployees &&
          recipients.selectedEmployees.length > 0
        ) {
          return recipients.selectedEmployees.includes(employee.name);
        }
        return (
          employee.name === recipients.value || employee.id === recipients.value
        );
      default:
        return true;
    }
  }

  return true; // 알 수 없는 형태인 경우 기본값으로 수신
};

// *[2_관리자 모드] 2.4_관리자 알림 목록*
/**
 * 관리자용 알림 목록을 조회 (자동생성 및 만료된 알림 제외)
 * @param {Array} regularNotifications - 정기 알림 배열
 * @returns {Array} 필터링된 정기 알림 목록
 */
export const get관리자알림목록 = (regularNotifications) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const 정기알림목록 = regularNotifications
    .filter((notification) => {
      if (notification.isAutoGenerated) return false;
      if (notification.category === '근무시간관리') return false; // 52시간 위반 알림 제외

      const endDate = new Date(notification.endDate);
      endDate.setHours(23, 59, 59, 999);
      return endDate >= today;
    })
    .map((notification) => ({ ...notification, 알림유형: '정기' }))
    .sort((a, b) => {
      return b.id - a.id; // ID 기준 최신순 (ID가 클수록 최신)
    });

  return 정기알림목록;
};

// *[2_관리자 모드] 2.4_통합 알림 리스트*
/**
 * 정기 알림과 실시간 알림을 통합하여 반환
 * @param {Array} regularNotifications - 정기 알림 배열
 * @param {Array} realtimeNotifications - 실시간 알림 배열
 * @param {Function} devLog - 개발 로그 함수
 * @returns {Array} 통합 알림 목록
 */
export const get통합알림리스트 = (
  regularNotifications,
  realtimeNotifications,
  devLog
) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const 정기알림목록 = regularNotifications
    .filter((notification) => {
      const endDate = new Date(notification.endDate);
      endDate.setHours(23, 59, 59, 999);
      return endDate >= today;
    })
    .map((notification) => ({ ...notification, 알림유형: '정기' }))
    .sort((a, b) => {
      return b.id - a.id; // ID 기준 최신순 (ID가 클수록 최신)
    });

  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  const 실시간알림목록 = realtimeNotifications
    .filter((notification) => {
      try {
        let createdDate;
        if (notification.createdAt) {
          createdDate = new Date(notification.createdAt);

          if (isNaN(createdDate.getTime())) {
            createdDate = new Date();
          }
        } else {
          createdDate = new Date();
        }
        return createdDate > twentyFourHoursAgo;
      } catch (error) {
        devLog(
          'Date parsing error for realtime notification:',
          notification.createdAt
        );
        return true; // 파싱 오류 시 표시하도록 함
      }
    })
    .map((notification) => ({ ...notification, 알림유형: '실시간' }))
    .sort((a, b) => {
      return b.id - a.id; // ID 기준 최신순 (ID가 클수록 최신)
    });

  return [...정기알림목록, ...실시간알림목록];
};

// *[2_관리자 모드] 2.4_수신자 수 계산*
/**
 * 알림 로그의 수신자 수를 계산
 * @param {Object} log - 알림 로그 객체
 * @param {Array} employees - 직원 배열
 * @returns {number} 수신자 수
 */
export const calculateRecipientCount = (log, employees) => {
  if (log.recipientCount && log.recipientCount > 0) {
    return log.recipientCount;
  }

  if (typeof log.recipients === 'object' && log.recipients !== null) {
    const recipientsObj = log.recipients;

    if (recipientsObj.type === '전체') {
      return employees.length;
    }

    if (recipientsObj.type === '부서') {
      const deptName = recipientsObj.value;
      return employees.filter((emp) => emp.department === deptName).length;
    }

    if (recipientsObj.type === '직급') {
      const positionName = recipientsObj.value;
      return employees.filter((emp) => emp.position === positionName).length;
    }

    if (recipientsObj.type === '직책') {
      const roleName = recipientsObj.value;
      return employees.filter((emp) => emp.role === roleName).length;
    }

    if (
      recipientsObj.selectedEmployees &&
      Array.isArray(recipientsObj.selectedEmployees)
    ) {
      return recipientsObj.selectedEmployees.length;
    }

    if (recipientsObj.type === '개인' && recipientsObj.value) {
      const names = recipientsObj.value
        .split(',')
        .map((n) => n.trim())
        .filter((n) => n.length > 0);
      return names.length;
    }
  }

  if (typeof log.recipients === 'string') {
    if (log.recipients === '전체직원') {
      return employees.length;
    }
    if (log.recipients === '관리자') {
      return (
        employees.filter((emp) => emp.role && emp.role.includes('관리'))
          .length || 1
      );
    }

    const deptCount = employees.filter(
      (emp) => emp.department === log.recipients
    ).length;
    if (deptCount > 0) return deptCount;

    const positionCount = employees.filter(
      (emp) => emp.position === log.recipients
    ).length;
    if (positionCount > 0) return positionCount;

    const roleCount = employees.filter(
      (emp) => emp.role === log.recipients
    ).length;
    if (roleCount > 0) return roleCount;

    const recipientList = log.recipients
      .split(',')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);
    if (recipientList.length > 0) {
      return recipientList.length;
    }
  }

  return 1;
};

// *[2_관리자 모드] 2.4_알림 로그 필터링*
/**
 * 검색 조건에 따라 알림 로그를 필터링
 * @param {Array} notificationLogs - 알림 로그 배열
 * @param {Object} notificationLogSearch - 검색 조건 객체
 * @returns {Array} 필터링된 알림 로그 목록
 */
export const getFilteredNotificationLogs = (
  notificationLogs,
  notificationLogSearch
) => {
  return notificationLogs
    .filter((log) => {
      if (notificationLogSearch.year) {
        const logYear = new Date(log.createdAt).getFullYear().toString();
        if (!logYear.includes(notificationLogSearch.year)) return false;
      }

      if (notificationLogSearch.month) {
        const logMonth = (new Date(log.createdAt).getMonth() + 1).toString();
        if (!logMonth.includes(notificationLogSearch.month)) return false;
      }

      if (notificationLogSearch.recipient) {
        const searchTerm = notificationLogSearch.recipient.toLowerCase();
        let recipientText = '';

        if (typeof log.recipients === 'string') {
          recipientText = log.recipients.toLowerCase();
        } else if (
          typeof log.recipients === 'object' &&
          log.recipients !== null
        ) {
          recipientText = (log.recipients.value || '').toLowerCase();
        }

        if (!recipientText.includes(searchTerm)) return false;
      }

      if (notificationLogSearch.titleOrContent) {
        const searchTerm = notificationLogSearch.titleOrContent.toLowerCase();
        const titleMatch = log.title.toLowerCase().includes(searchTerm);
        const contentMatch =
          log.content && log.content.toLowerCase().includes(searchTerm);
        if (!titleMatch && !contentMatch) return false;
      }

      if (notificationLogSearch.type) {
        if (log.type !== notificationLogSearch.type) return false;
      }

      return true;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// *[2_관리자 모드] 2.4_알림 재시도*
/**
 * 지수 백오프 기반 알림 전송 재시도 로직
 * @param {Function} sendFunction - 실행할 전송 함수
 * @param {number} maxRetries - 최대 재시도 횟수 (기본값: 3)
 * @param {Function} devLog - 개발 로그 함수
 * @returns {Promise<boolean>} 전송 성공 여부
 */
export const retrySend = async (sendFunction, maxRetries = 3, devLog) => {
  const delays = [500, 1000, 2000]; // 500ms, 1s, 2s

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await sendFunction();
      return true; // 성공
    } catch (error) {
      devLog(`알림 전송 실패 (${attempt + 1}/${maxRetries}):`, error);

      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
      } else {
        devLog('알림 전송 최종 실패:', error);
        return false;
      }
    }
  }
  return false;
};

// *[2_관리자 모드] 2.4_자동 알림 전송*
/**
 * 처리유형에 따라 알림 대상자를 결정하고 자동 알림 전송
 * @param {Object} params - 파라미터 객체
 * @param {Object} params.알림정보 - 알림 정보 객체
 * @param {Array} params.notificationLogs - 알림 로그 배열
 * @param {Function} params.setNotificationLogs - 알림 로그 setter
 * @param {Function} params.setRealtimeNotifications - 실시간 알림 setter
 * @param {Function} params.isExpired5Days - 5일 만료 체크 함수
 * @param {Function} params.updateEmployeeNotifications - 직원 알림 업데이트 함수
 * @param {Function} params.get연차알림대상자 - 연차 알림 대상자 조회 함수
 * @param {Function} params.get건의사항알림대상자 - 건의사항 알림 대상자 조회 함수
 * @param {Function} params.get부서관리자및대표이사 - 부서 관리자 조회 함수
 * @param {Function} params.devLog - 개발 로그 함수
 */
export const send자동알림 = async ({
  알림정보,
  notificationLogs,
  setNotificationLogs,
  setRealtimeNotifications,
  isExpired5Days,
  updateEmployeeNotifications,
  get연차알림대상자,
  get건의사항알림대상자,
  get부서관리자및대표이사,
  devLog,
}) => {
  const { 처리유형, 대상자, 처리자, 알림내용, 건의유형 } = 알림정보;

  let 알림대상자들;
  if (처리유형.includes('연차')) {
    알림대상자들 = get연차알림대상자(대상자, 대상자, 처리유형);
  } else if (처리유형.includes('건의사항') && 건의유형) {
    알림대상자들 = get건의사항알림대상자(대상자, 대상자, 처리유형, 건의유형);
  } else if (처리유형 === '직원평가 수신' || 처리유형 === '급여 수신') {
    알림대상자들 = [대상자];
  } else {
    알림대상자들 = get부서관리자및대표이사(
      대상자.department,
      대상자,
      처리유형,
      대상자.subDepartment
    );
  }

  const utcCreatedAt = new Date().toISOString();

  const 새로운알림로그 = {
    id: notificationLogs.length + 1,
    type: '자동알림',
    title: `${처리유형} 알림 - ${대상자.name}`,
    recipients: 알림대상자들
      .map((대상) => `${대상.name}(${대상.position || '직책없음'})`)
      .join(', '),
    content: 알림내용,
    createdAt: utcCreatedAt, // UTC ISO 형식으로 저장
    completedAt: null,
    처리유형: 처리유형,
    대상자: 대상자.name,
    대상자부서: 대상자.department,
    대상자세부부서: 대상자.subDepartment || '미지정',
    처리자: 처리자,
    recipientCount: 알림대상자들.length,
  };

  const sendNotification = async () => {
    try {
      // DB에 알림 로그 저장
      let savedNotification = null;
      try {
        const notificationLogData = {
          notificationType: '시스템',
          title: `${처리유형} 알림 - ${대상자.name}`,
          content: 알림내용,
          status: '진행중', // 직원들이 볼 수 있도록 '진행중' 상태로 저장
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          repeatCycle: '즉시',
          recipients: {
            type: '개인',
            value: 알림대상자들.map((대상) => 대상.name).join(', '),
            selectedEmployees: 알림대상자들.map((대상) => 대상.name),
          },
          priority: 처리유형.includes('승인') ? 'high' : 'medium',
          // createdAt은 서버에서 자동 생성되므로 보내지 않음
        };

        savedNotification = await NotificationAPI.create(notificationLogData);
      } catch (dbError) {
        // DB 저장 실패 시 로컬 데이터 사용
      }

      setNotificationLogs((prev) => [새로운알림로그, ...prev]);

      // DB에 저장된 실제 데이터를 사용 (savedNotification이 있으면 사용, 없으면 로컬 데이터 사용)
      const 실시간알림 = savedNotification ? {
        ...savedNotification,
        id: savedNotification._id || savedNotification.id,
        처리유형: 처리유형,
        대상자: 대상자.name,
        대상자부서: 대상자.department,
        처리자: 처리자,
        isAutoGenerated: true, // 자동 생성된 알림임을 표시
      } : {
        id: Date.now() + Math.random(),
        title: `${처리유형} 알림 - ${대상자.name}`,
        content: 알림내용,
        status: '진행중',
        createdAt: utcCreatedAt, // UTC ISO 형식으로 저장
        completedAt: null,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        repeatCycle: '즉시',
        recipients: {
          type: '개인',
          value: 알림대상자들.map((대상) => 대상.name).join(', '),
          selectedEmployees: 알림대상자들.map((대상) => 대상.name),
        },
        처리유형: 처리유형,
        대상자: 대상자.name,
        대상자부서: 대상자.department,
        처리자: 처리자,
        isAutoGenerated: true, // 자동 생성된 알림임을 표시
      };

      const createdAtToCheck = 실시간알림.createdAt || utcCreatedAt;
      if (!isExpired5Days(createdAtToCheck)) {
        setRealtimeNotifications((prev) => [실시간알림, ...prev]);
      }
    } catch (error) {
      throw error;
    }
  };

  await retrySend(sendNotification, 3, devLog);

  devLog('🔔 자동알림 전송:', {
    알림대상자들: 알림대상자들.map(
      (대상) => `${대상.name}(${대상.position || '직책없음'})`
    ),
    알림내용: 알림내용,
  });

  setTimeout(() => {
    updateEmployeeNotifications();
  }, 100);
};

// *[2_관리자 모드] 2.4_알림 관리 - useNotification Hook (통합)*

/**
 * 알림 관리 Custom Hook
 * @param {Object} params - Hook 파라미터
 * @param {Array} params.employees - 전체 직원 목록
 * @param {Object} params.currentUser - 현재 로그인한 사용자 정보
 * @param {Function} params.devLog - 개발 로그 함수
 * @param {Function} params.showLocalNotification - Firebase 푸시 알림 함수
 * @returns {Object} 알림 관련 상태 및 함수들
 */
const useNotification = ({
  employees,
  currentUser,
  devLog,
  showLocalNotification,
}) => {
  /* ========== STATE - 알림 관리 ========== */
  const [regularNotifications, setRegularNotifications] = useState([]);
  const [realtimeNotifications, setRealtimeNotifications] = useState([]);
  const [notificationLogs, setNotificationLogs] = useState([]);
  const [showAllNotificationLogs, setShowAllNotificationLogs] = useState(false);

  // 알림 로그 검색 상태
  const [notificationLogSearch, setNotificationLogSearch] = useState({
    year: '',
    month: '',
    recipient: '',
    titleOrContent: '',
    type: '',
  });

  // 팝업 상태
  const [showAddRegularNotificationPopup, setShowAddRegularNotificationPopup] =
    useState(false);
  const [
    showAddRealtimeNotificationPopup,
    setShowAddRealtimeNotificationPopup,
  ] = useState(false);
  const [showAddNotificationPopup, setShowAddNotificationPopup] =
    useState(false);
  const [알림유형, set알림유형] = useState('정기');
  const [
    showEditRegularNotificationPopup,
    setShowEditRegularNotificationPopup,
  ] = useState(false);
  const [
    showEditRealtimeNotificationPopup,
    setShowEditRealtimeNotificationPopup,
  ] = useState(false);

  // 편집 중인 알림
  const [editingRegularNotification, setEditingRegularNotification] =
    useState(null);
  const [editingRealtimeNotification, setEditingRealtimeNotification] =
    useState(null);

  // 알림 폼 데이터
  const [regularNotificationForm, setRegularNotificationForm] = useState({
    title: '',
    content: '',
    status: '진행중',
    startDate: '',
    endDate: '',
    repeatCycle: '특정일',
    recipients: { type: '전체', value: '전체직원', selectedEmployees: [] },
  });

  const [realtimeNotificationForm, setRealtimeNotificationForm] = useState({
    title: '',
    content: '',
    status: '진행중',
    startDate: '',
    endDate: '',
    repeatCycle: '특정일',
    recipients: { type: '전체', value: '전체직원', selectedEmployees: [] },
  });

  // 반복 설정 모달 상태
  const [showRecurringSettingsModal, setShowRecurringSettingsModal] =
    useState(false);
  const [recurringSettings, setRecurringSettings] = useState({
    반복주기_숫자: 1,
    반복주기_단위: '일',
    반복시작일: '',
    반복종료일: '',
    반복시간: '09:00',
    반복요일: [],
    반복일자: 1,
    반복월: 1,
  });
  const [currentFormType, setCurrentFormType] = useState(''); // 'regular' 또는 'realtime'

  // 직원 모드 알림
  const [employeeNotifications, setEmployeeNotifications] = useState([]);
  const [readNotifications, setReadNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(
        `readNotifications_${currentUser?.id}`
      );
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (error) {
      devLog('Failed to load read notifications:', error);
      return new Set();
    }
  });

  // 관리자 알림
  const [adminNotifications, setAdminNotifications] = useState([]);

  // 사용자 친화적 알림
  const [notifications, setNotifications] = useState([]);

  // 직원 검색 상태
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  /* ========== CONSTANTS ========== */
  const repeatCycleOptions = [
    '특정일',
    '매일',
    '매주',
    '매월',
    '분기',
    '반기',
    '년',
  ];

  const recipientOptions = {
    부서: COMPANY_STANDARDS.DEPARTMENTS,
    직급: COMPANY_STANDARDS.POSITIONS,
    직책: COMPANY_STANDARDS.ROLES,
  };

  const 요일목록 = ['일', '월', '화', '수', '목', '금', '토'];

  /* ========== UTILITY FUNCTIONS ========== */

  // 알림 만료 판정 유틸 함수 (연차 만료 알림: 30일, 일반 알림: 5일)
  const isNotificationExpired = useCallback(
    (notification) => {
      // notification이 객체가 아닌 경우 (레거시 호환)
      if (typeof notification === 'string' || !notification) {
        const createdAt = notification;
        if (!createdAt) return true;

        try {
          let timestamp;
          if (createdAt.includes('T') || createdAt.match(/^\d{4}-\d{2}-\d{2}$/)) {
            timestamp = new Date(createdAt).getTime();
          } else {
            const match = createdAt.match(
              /(\d{4})-(\d{2}-\d{2})\s*(오전|오후)\s*(\d{1,2}):(\d{2})/
            );
            if (!match) {
              timestamp = new Date(createdAt).getTime();
            } else {
              const [, year, month, day, ampm, hour, minute] = match;
              let hours = parseInt(hour);
              if (ampm === '오후' && hours !== 12) hours += 12;
              if (ampm === '오전' && hours === 12) hours = 0;
              timestamp = new Date(year, month - 1, day, hours, minute).getTime();
            }
          }

          if (isNaN(timestamp)) return true;

          const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
          return Date.now() - timestamp >= FIVE_DAYS_MS;
        } catch (error) {
          devLog('날짜 파싱 오류:', error);
          return true;
        }
      }

      // 알림 객체인 경우
      if (!notification?.createdAt) return true;

      const now = new Date();

      // 연차 만료 알림 특별 처리: 새 연차 시작일로부터 30일간 표시
      if (notification.related?.entity === 'annualLeave') {
        const nextAnnualStart = notification.related?.nextAnnualStart;

        if (!nextAnnualStart) {
          // nextAnnualStart 정보가 없으면 생성일 기준 30일 (fallback)
          const created = new Date(notification.createdAt);
          const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
          return now.getTime() - created.getTime() > thirtyDaysInMs;
        }

        // 새 연차 시작일로부터 30일 경과 확인
        const annualStart = new Date(nextAnnualStart);
        const thirtyDaysLater = new Date(annualStart);
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

        return now > thirtyDaysLater;
      }

      // 일반 알림: 생성일로부터 5일간 표시
      try {
        const createdAt = notification.createdAt;
        let timestamp;
        if (createdAt.includes('T') || createdAt.match(/^\d{4}-\d{2}-\d{2}$/)) {
          timestamp = new Date(createdAt).getTime();
        } else {
          const match = createdAt.match(
            /(\d{4})-(\d{2}-\d{2})\s*(오전|오후)\s*(\d{1,2}):(\d{2})/
          );
          if (!match) {
            timestamp = new Date(createdAt).getTime();
          } else {
            const [, year, month, day, ampm, hour, minute] = match;
            let hours = parseInt(hour);
            if (ampm === '오후' && hours !== 12) hours += 12;
            if (ampm === '오전' && hours === 12) hours = 0;
            timestamp = new Date(year, month - 1, day, hours, minute).getTime();
          }
        }

        if (isNaN(timestamp)) return true;

        const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
        return Date.now() - timestamp >= FIVE_DAYS_MS;
      } catch (error) {
        devLog('날짜 파싱 오류:', error);
        return true;
      }
    },
    [devLog]
  );

  // 정기 알림 만료 판단
  const isRegularExpired = useCallback((n) => {
    if (!n?.endDate) return false;
    const del = new Date(n.endDate);
    del.setDate(del.getDate() + 1);
    del.setHours(0, 0, 0, 0);
    return new Date() >= del;
  }, []);

  // 알림 로그 3년 초과 체크
  const isLogOlderThan3Years = useCallback((createdAt) => {
    if (!createdAt) return false;
    try {
      const logDate = new Date(createdAt);
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
      return logDate < threeYearsAgo;
    } catch (e) {
      return false;
    }
  }, []);

  // 알림 로그 3년 이상 된 항목 자동 삭제
  const cleanupOldLogs = useCallback(() => {
    setNotificationLogs((prev) =>
      prev.filter((log) => !isLogOlderThan3Years(log.createdAt))
    );
  }, [isLogOlderThan3Years]);

  // 만료된 알림 정리
  const cleanupExpiredNotifications = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 정기 알림 클린업
    setRegularNotifications((prev) =>
      prev.filter((n) => {
        if (isExpired5Days(n)) return false;
        if (n.endDate) {
          const endDate = new Date(n.endDate);
          endDate.setHours(23, 59, 59, 999);
          if (endDate < today) return false;
        }
        return true;
      })
    );

    // 실시간 알림 클린업
    setRealtimeNotifications((prev) =>
      prev.filter((n) => !isExpired5Days(n))
    );
  }, [isExpired5Days]);

  // 만료된 정기 알림 삭제 및 로그 기록
  const cleanupExpiredRegulars = useCallback(() => {
    try {
      const now = new Date().toLocaleString('ko-KR');

      setRegularNotifications((prev) => {
        const expired = prev.filter((n) => isRegularExpired(n));
        const active = prev.filter((n) => !isRegularExpired(n));

        if (expired.length > 0) {
          const expiredLogs = expired.map((n) => ({
            id: `expire_${n.id}`,
            type: '정기알림',
            title: n.title,
            status: '만료됨',
            createdAt: now,
          }));

          setNotificationLogs((prevLogs) => [...expiredLogs, ...prevLogs]);
        }

        return active;
      });

      cleanupOldLogs();
    } catch (e) {
      console.error('만료 정기알림 정리 오류', e);
    }
  }, [isRegularExpired, cleanupOldLogs]);

  // 알림 수신자 체크 함수
  const shouldReceiveNotification = useCallback((notification, employee) => {
    if (!notification.recipients || !employee) return true;

    const { recipients } = notification;

    if (typeof recipients === 'string') {
      return recipients === '전체';
    }

    if (typeof recipients === 'object' && recipients.type) {
      switch (recipients.type) {
        case '전체':
          return true;
        case '부서':
          return employee.department === recipients.value;
        case '직급':
          return employee.position === recipients.value;
        case '직책':
          return employee.role === recipients.value;
        case '개인':
          if (
            recipients.selectedEmployees &&
            recipients.selectedEmployees.length > 0
          ) {
            return recipients.selectedEmployees.includes(employee.name);
          }
          return (
            employee.name === recipients.value ||
            employee.id === recipients.value
          );
        default:
          return true;
      }
    }

    return true;
  }, []);

  /* ========== NOTIFICATION HANDLERS ========== */

  // 정기 알림 추가
  const handleAddRegularNotification = useCallback(() => {
    if (!regularNotificationForm.title || !regularNotificationForm.content) {
      alert('제목과 내용을 입력해주세요.');
      return false;
    }
    if (
      !regularNotificationForm.startDate ||
      !regularNotificationForm.endDate
    ) {
      alert('시작일과 종료일을 입력해주세요.');
      return false;
    }

    const newNotification = {
      id: `regular-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...regularNotificationForm,
      createdAt: (() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours24 = now.getHours();
        const ampm = hours24 >= 12 ? '오후' : '오전';
        const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${ampm} ${hours12}:${minutes}`;
      })(),
      completedAt: null,
    };

    setRegularNotifications([...regularNotifications, newNotification]);
    setRegularNotificationForm({
      title: '',
      content: '',
      status: '진행중',
      startDate: '',
      endDate: '',
      repeatCycle: '특정일',
      recipients: { type: '전체', value: '전체직원' },
    });
    setShowAddRegularNotificationPopup(false);

    if (regularNotificationForm.status === '진행중') {
      const newLog = {
        id: Math.max(...notificationLogs.map((n) => n.id), 0) + 1,
        type: '정기',
        title: regularNotificationForm.title,
        content: regularNotificationForm.content,
        recipients: regularNotificationForm.recipients.value,
        repeatType: regularNotificationForm.repeatCycle,
        createdAt: (() => {
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const hours24 = now.getHours();
          const ampm = hours24 >= 12 ? '오후' : '오전';
          const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
          const minutes = String(now.getMinutes()).padStart(2, '0');
          return `${year}-${month}-${day} ${ampm} ${hours12}:${minutes}`;
        })(),
        completedAt: null,
      };
      setNotificationLogs([newLog, ...notificationLogs]);
    }
    return true;
  }, [regularNotificationForm, regularNotifications, notificationLogs]);

  // 실시간 알림 추가
  const handleAddRealtimeNotification = useCallback(() => {
    if (!realtimeNotificationForm.title || !realtimeNotificationForm.content) {
      alert('제목과 내용을 입력해주세요.');
      return false;
    }

    const notificationId = `realtime-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const notificationCreatedAt = (() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours24 = now.getHours();
      const ampm = hours24 >= 12 ? '오후' : '오전';
      const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
      const minutes = String(now.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${ampm} ${hours12}:${minutes}`;
    })();

    const newNotification = {
      id: notificationId,
      ...realtimeNotificationForm,
      createdAt: notificationCreatedAt,
      status: '완료',
    };
    setRealtimeNotifications([...realtimeNotifications, newNotification]);

    const newEmployeeNotification = {
      id: notificationId,
      title: realtimeNotificationForm.title,
      content: realtimeNotificationForm.content,
      type: '실시간',
      createdAt: notificationCreatedAt,
      read: false,
    };
    setEmployeeNotifications((prev) => [newEmployeeNotification, ...prev]);

    setRealtimeNotificationForm({
      title: '',
      content: '',
      status: '진행중',
      startDate: '',
      endDate: '',
      repeatCycle: '특정일',
      recipients: { type: '전체', value: '전체직원' },
    });
    setShowAddRealtimeNotificationPopup(false);

    const newLog = {
      id: Math.max(...notificationLogs.map((n) => n.id), 0) + 1,
      type: '실시간',
      title: realtimeNotificationForm.title,
      content: realtimeNotificationForm.content,
      recipients: realtimeNotificationForm.recipients.value,
      createdAt: (() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours24 = now.getHours();
        const ampm = hours24 >= 12 ? '오후' : '오전';
        const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${ampm} ${hours12}:${minutes}`;
      })(),
      completedAt:
        realtimeNotificationForm.status === '완료'
          ? (() => {
              const now = new Date();
              const year = now.getFullYear();
              const month = String(now.getMonth() + 1).padStart(2, '0');
              const day = String(now.getDate()).padStart(2, '0');
              const hours24 = now.getHours();
              const ampm = hours24 >= 12 ? '오후' : '오전';
              const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
              const minutes = String(now.getMinutes()).padStart(2, '0');
              return `${year}-${month}-${day} ${ampm} ${hours12}:${minutes}`;
            })()
          : null,
    };
    setNotificationLogs([newLog, ...notificationLogs]);
    return true;
  }, [realtimeNotificationForm, realtimeNotifications, notificationLogs]);

  // 정기 알림 삭제
  const handleDeleteRegularNotification = useCallback((id) => {
    try {
      const now = new Date().toLocaleString('ko-KR');

      setRegularNotifications((prev) => {
        const target = prev.find((n) => n.id === id);
        if (!target) return prev;

        const deleteLog = {
          id: `manualdel_${id}`,
          type: '정기알림',
          title: target.title,
          status: '삭제됨',
          deletedAt: now,
          createdAt: now,
        };

        setNotificationLogs((prevLogs) => [deleteLog, ...prevLogs]);
        return prev.filter((n) => n.id !== id);
      });
    } catch (e) {
      console.error('정기알림 수동 삭제 오류', e);
    }
  }, []);

  // 정기 알림 편집
  const handleEditRegularNotification = useCallback((notification) => {
    setEditingRegularNotification(notification);
    const recipients = notification.recipients || {
      type: '전체',
      value: '전체직원',
      selectedEmployees: [],
    };
    if (typeof recipients === 'string') {
      const recipientsObj = {
        type: recipients === '전체' ? '전체' : '개인',
        value: recipients,
        selectedEmployees: [],
      };
      setRegularNotificationForm({
        title: notification.title,
        content: notification.content,
        status: notification.status,
        startDate: notification.startDate,
        endDate: notification.endDate,
        repeatCycle: notification.repeatCycle,
        recipients: recipientsObj,
        recurringSettings: notification.recurringSettings || null,
      });
    } else {
      setRegularNotificationForm({
        title: notification.title,
        content: notification.content,
        status: notification.status,
        startDate: notification.startDate,
        endDate: notification.endDate,
        repeatCycle: notification.repeatCycle,
        recipients: recipients,
        recurringSettings: notification.recurringSettings || null,
      });
    }
    setShowEditRegularNotificationPopup(true);
  }, []);

  // 정기 알림 저장
  const handleSaveRegularNotificationEdit = useCallback(() => {
    if (!regularNotificationForm.title || !regularNotificationForm.content) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }
    if (
      !regularNotificationForm.startDate ||
      !regularNotificationForm.endDate
    ) {
      alert('시작일과 종료일을 입력해주세요.');
      return;
    }
    setRegularNotifications((prev) =>
      prev.map((notification) =>
        notification.id === editingRegularNotification.id
          ? { ...notification, ...regularNotificationForm }
          : notification
      )
    );
    setEditingRegularNotification(null);
    setRegularNotificationForm({
      title: '',
      content: '',
      status: '진행중',
      startDate: '',
      endDate: '',
      repeatCycle: '특정일',
      recipients: { type: '전체', value: '전체직원' },
    });
    setShowEditRegularNotificationPopup(false);
  }, [regularNotificationForm, editingRegularNotification]);

  // 실시간 알림 저장
  const handleSaveRealtimeNotificationEdit = useCallback(() => {
    if (!realtimeNotificationForm.title || !realtimeNotificationForm.content) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }
    setRealtimeNotifications((prev) =>
      prev.map((notification) =>
        notification.id === editingRealtimeNotification.id
          ? { ...notification, ...realtimeNotificationForm }
          : notification
      )
    );
    setEditingRealtimeNotification(null);
    setRealtimeNotificationForm({
      title: '',
      content: '',
      status: '진행중',
      startDate: '',
      endDate: '',
      repeatCycle: '특정일',
      recipients: { type: '전체', value: '전체직원' },
    });
    setShowEditRealtimeNotificationPopup(false);
  }, [realtimeNotificationForm, editingRealtimeNotification]);

  // 직원 알림 업데이트
  const updateEmployeeNotifications = () => {
    if (!currentUser) {
      setEmployeeNotifications([]);
      return;
    }

    const activeRegular = regularNotifications.filter(
      (n) => n.status === '진행중'
    );
    const activeRealtime = realtimeNotifications.filter(
      (n) => n.status === '진행중'
    );
    const completedRealtime = realtimeNotifications.filter(
      (n) => n.status === '완료'
    );

    const parseKoreanDate = (dateStr) => {
      if (!dateStr) return 0;

      const match = dateStr.match(
        /(\d{4})-(\d{2})-(\d{2})\s*(오전|오후)\s*(\d{1,2}):(\d{2})/
      );
      if (!match) return new Date(dateStr).getTime() || 0;

      const [, year, month, day, ampm, hour, minute] = match;
      let hours = parseInt(hour);
      if (ampm === '오후' && hours !== 12) hours += 12;
      if (ampm === '오전' && hours === 12) hours = 0;

      return new Date(year, month - 1, day, hours, minute).getTime();
    };

    const allNotifications = [
      ...activeRegular.map((n) => ({
        ...n,
        type: '정기',
        timestamp: parseKoreanDate(n.createdAt),
      })),
      ...activeRealtime.map((n) => ({
        ...n,
        type: '실시간',
        timestamp: parseKoreanDate(n.createdAt),
      })),
      ...completedRealtime.map((n) => ({
        ...n,
        type: '실시간',
        timestamp: parseKoreanDate(n.completedAt || n.createdAt),
      })),
    ]
      .filter((notification) => {
        if (isExpired5Days(notification)) {
          return false;
        }

        if (!shouldReceiveNotification(notification, currentUser)) return false;

        if (
          notification.isAutoGenerated &&
          notification.title &&
          (notification.title.includes('연차 신청') ||
            notification.title.includes('건의사항 신청')) &&
          notification.title.includes(currentUser.name)
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = a.timestamp || new Date(a.createdAt).getTime() || 0;
        const timeB = b.timestamp || new Date(b.createdAt).getTime() || 0;
        return timeB - timeA;
      });

    setEmployeeNotifications(allNotifications);
  };

  // 알림 읽음 처리
  const markNotificationAsRead = useCallback(
    (notificationId) => {
      setReadNotifications((prev) => {
        const newSet = new Set([...prev, notificationId]);
        try {
          localStorage.setItem(
            `readNotifications_${currentUser?.id}`,
            JSON.stringify([...newSet])
          );
        } catch (error) {
          devLog('Failed to save read notifications:', error);
        }
        return newSet;
      });
    },
    [currentUser, devLog]
  );

  // 읽지 않은 알림 개수
  const getUnreadNotificationCount = useCallback(() => {
    return employeeNotifications.filter(
      (notification) => !readNotifications.has(notification.id)
    ).length;
  }, [employeeNotifications, readNotifications]);

  // 수신자 텍스트 생성
  const getRecipientText = useCallback((recipients) => {
    if (recipients.type === '전체') return '전체직원';
    if (recipients.type === '부서') return `${recipients.value}부서`;
    if (recipients.type === '직급') return `${recipients.value}`;
    if (recipients.type === '직책') return `${recipients.value}`;
    if (recipients.type === '개인') {
      if (
        recipients.selectedEmployees &&
        recipients.selectedEmployees.length > 0
      ) {
        if (recipients.selectedEmployees.length === 1) {
          return recipients.selectedEmployees[0];
        } else {
          return `${recipients.selectedEmployees[0]} 외 ${
            recipients.selectedEmployees.length - 1
          }명`;
        }
      }
      return recipients.value || '개인';
    }
    return recipients.value;
  }, []);

  /* ========== RECURRING SETTINGS ========== */

  const openRecurringSettingsModal = useCallback(
    (formType) => {
      setCurrentFormType(formType);

      const currentForm =
        formType === 'regular'
          ? regularNotificationForm
          : realtimeNotificationForm;

      if (currentForm.recurringSettings) {
        setRecurringSettings({
          ...currentForm.recurringSettings,
          반복주기_숫자: currentForm.recurringSettings.반복주기_숫자 || 1,
          반복주기_단위: currentForm.recurringSettings.반복주기_단위 || '일',
          반복시작일:
            currentForm.recurringSettings.반복시작일 ||
            currentForm.startDate ||
            '',
          반복종료일:
            currentForm.recurringSettings.반복종료일 ||
            currentForm.endDate ||
            '',
          반복시간: currentForm.recurringSettings.반복시간 || '09:00',
          반복요일: currentForm.recurringSettings.반복요일 || [],
          반복일자: currentForm.recurringSettings.반복일자 || 1,
          반복월: currentForm.recurringSettings.반복월 || 1,
        });
      } else {
        setRecurringSettings({
          반복주기_숫자: 1,
          반복주기_단위: '일',
          반복시작일: currentForm.startDate || '',
          반복종료일: currentForm.endDate || '',
          반복시간: '09:00',
          반복요일: [],
          반복일자: 1,
          반복월: 1,
          매일: { 반복간격: 1 },
          매주: { 반복간격: 1, 반복요일: [] },
          매월: { 반복간격: 1, 반복일자: 1 },
          매년: { 반복간격: 1, 반복월: 1, 반복일자: 1 },
        });
      }

      setShowRecurringSettingsModal(true);
    },
    [regularNotificationForm, realtimeNotificationForm]
  );

  const closeRecurringSettingsModal = useCallback(() => {
    setShowRecurringSettingsModal(false);
    setCurrentFormType('');
  }, []);

  const generateRecurringText = useCallback(() => {
    const { 반복주기_숫자, 반복주기_단위, 반복시작일, 반복종료일, 반복요일 } =
      recurringSettings;

    let 텍스트;
    if (반복주기_단위 === '일') {
      if (반복주기_숫자 === 1) {
        텍스트 = '매일';
      } else {
        텍스트 = `${반복주기_숫자}일마다`;
      }
    } else {
      텍스트 = `${반복주기_숫자}${반복주기_단위}마다`;
    }

    if (반복주기_단위 === '주' && 반복요일.length > 0) {
      텍스트 += ` (${반복요일.join(', ')})`;
    }

    if (반복시작일) {
      텍스트 += ` [${반복시작일}부터`;
      if (반복종료일) {
        텍스트 += ` ${반복종료일}까지]`;
      } else {
        텍스트 += `]`;
      }
    } else if (반복종료일) {
      텍스트 += ` [${반복종료일}까지]`;
    }

    return 텍스트;
  }, [recurringSettings]);

  const handleRecurringSettingsComplete = useCallback(() => {
    const 반복설정텍스트 = generateRecurringText();

    if (currentFormType === 'regular') {
      setRegularNotificationForm((prev) => ({
        ...prev,
        repeatCycle: 반복설정텍스트,
        startDate: recurringSettings.반복시작일,
        endDate: recurringSettings.반복종료일,
        recurringSettings: { ...recurringSettings },
      }));
    } else if (currentFormType === 'realtime') {
      setRealtimeNotificationForm((prev) => ({
        ...prev,
        repeatCycle: 반복설정텍스트,
        startDate: recurringSettings.반복시작일,
        endDate: recurringSettings.반복종료일,
        recurringSettings: { ...recurringSettings },
      }));
    }

    closeRecurringSettingsModal();
  }, [
    currentFormType,
    recurringSettings,
    generateRecurringText,
    closeRecurringSettingsModal,
  ]);

  const handleWeekdayToggle = useCallback((요일) => {
    setRecurringSettings((prev) => ({
      ...prev,
      반복요일: prev.반복요일.includes(요일)
        ? prev.반복요일.filter((d) => d !== 요일)
        : [...prev.반복요일, 요일],
    }));
  }, []);

  /* ========== EMPLOYEE SEARCH ========== */

  const handleEmployeeSearch = useCallback(
    (searchTerm) => {
      setEmployeeSearchTerm(searchTerm);
      if (searchTerm.trim() === '') {
        setSearchResults([]);
        return;
      }

      const filtered = employees.filter((employee) =>
        employee.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(filtered);
    },
    [employees]
  );

  const addEmployeeToRecipients = useCallback((employee, formType) => {
    const updateForm = (prev) => {
      const selectedEmployees = prev.recipients.selectedEmployees || [];
      if (selectedEmployees.includes(employee.name)) {
        return prev;
      }

      const newSelectedEmployees = [...selectedEmployees, employee.name];
      return {
        ...prev,
        recipients: {
          ...prev.recipients,
          selectedEmployees: newSelectedEmployees,
          value: newSelectedEmployees.join(', '),
        },
      };
    };

    if (formType === 'regular') {
      setRegularNotificationForm(updateForm);
    } else if (formType === 'realtime') {
      setRealtimeNotificationForm(updateForm);
    }

    setEmployeeSearchTerm('');
    setSearchResults([]);
  }, []);

  const removeEmployeeFromRecipients = useCallback((employeeName, formType) => {
    const updateForm = (prev) => {
      const selectedEmployees = prev.recipients.selectedEmployees || [];
      const newSelectedEmployees = selectedEmployees.filter(
        (name) => name !== employeeName
      );

      return {
        ...prev,
        recipients: {
          ...prev.recipients,
          selectedEmployees: newSelectedEmployees,
          value: newSelectedEmployees.join(', '),
        },
      };
    };

    if (formType === 'regular') {
      setRegularNotificationForm(updateForm);
    } else if (formType === 'realtime') {
      setRealtimeNotificationForm(updateForm);
    }
  }, []);

  const handleEmployeeToggle = useCallback((employeeName, formType) => {
    const updateForm = (prev) => {
      const selectedEmployees = prev.recipients.selectedEmployees || [];
      const newSelectedEmployees = selectedEmployees.includes(employeeName)
        ? selectedEmployees.filter((name) => name !== employeeName)
        : [...selectedEmployees, employeeName];

      return {
        ...prev,
        recipients: {
          ...prev.recipients,
          selectedEmployees: newSelectedEmployees,
          value:
            newSelectedEmployees.length > 0
              ? newSelectedEmployees.join(', ')
              : '',
        },
      };
    };

    if (formType === 'regular') {
      setRegularNotificationForm(updateForm);
    } else if (formType === 'realtime') {
      setRealtimeNotificationForm(updateForm);
    }
  }, []);

  /* ========== FILTERING FUNCTIONS ========== */

  // 관리자용 알림 목록
  const get관리자알림목록 = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const 정기알림목록 = regularNotifications
      .filter((notification) => {
        if (notification.isAutoGenerated) return false;
        if (notification.category === '근무시간관리') return false;

        const endDate = new Date(notification.endDate);
        endDate.setHours(23, 59, 59, 999);
        return endDate >= today;
      })
      .map((notification) => ({ ...notification, 알림유형: '정기' }))
      .sort((a, b) => {
        return b.id - a.id;
      });

    return 정기알림목록;
  }, [regularNotifications]);

  // 알림 로그 필터링
  const getFilteredNotificationLogs = useCallback(() => {
    return notificationLogs
      .filter((log) => {
        if (notificationLogSearch.year) {
          const logYear = new Date(log.createdAt).getFullYear().toString();
          if (!logYear.includes(notificationLogSearch.year)) return false;
        }

        if (notificationLogSearch.month) {
          const logMonth = (new Date(log.createdAt).getMonth() + 1).toString();
          if (!logMonth.includes(notificationLogSearch.month)) return false;
        }

        if (notificationLogSearch.recipient) {
          const searchTerm = notificationLogSearch.recipient.toLowerCase();
          let recipientText = '';

          if (typeof log.recipients === 'string') {
            recipientText = log.recipients.toLowerCase();
          } else if (
            typeof log.recipients === 'object' &&
            log.recipients !== null
          ) {
            recipientText = (log.recipients.value || '').toLowerCase();
          }

          if (!recipientText.includes(searchTerm)) return false;
        }

        if (notificationLogSearch.titleOrContent) {
          const searchTerm = notificationLogSearch.titleOrContent.toLowerCase();
          const titleMatch = log.title.toLowerCase().includes(searchTerm);
          const contentMatch =
            log.content && log.content.toLowerCase().includes(searchTerm);
          if (!titleMatch && !contentMatch) return false;
        }

        if (notificationLogSearch.type) {
          if (log.type !== notificationLogSearch.type) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [notificationLogs, notificationLogSearch]);

  // 수신자 수 계산
  const calculateRecipientCount = useCallback(
    (log) => {
      if (log.recipientCount && log.recipientCount > 0) {
        return log.recipientCount;
      }

      if (typeof log.recipients === 'object' && log.recipients !== null) {
        const recipientsObj = log.recipients;

        if (recipientsObj.type === '전체') {
          return employees.length;
        }

        if (recipientsObj.type === '부서') {
          const deptName = recipientsObj.value;
          return employees.filter((emp) => emp.department === deptName).length;
        }

        if (recipientsObj.type === '직급') {
          const positionName = recipientsObj.value;
          return employees.filter((emp) => emp.position === positionName)
            .length;
        }

        if (recipientsObj.type === '직책') {
          const roleName = recipientsObj.value;
          return employees.filter((emp) => emp.role === roleName).length;
        }

        if (recipientsObj.type === '개인') {
          if (
            recipientsObj.selectedEmployees &&
            recipientsObj.selectedEmployees.length > 0
          ) {
            return recipientsObj.selectedEmployees.length;
          }
          return 1;
        }
      }

      if (typeof log.recipients === 'string') {
        if (log.recipients === '전체' || log.recipients === '전체직원') {
          return employees.length;
        }

        const recipientList = log.recipients
          .split(',')
          .map((r) => r.trim())
          .filter((r) => r.length > 0);
        if (recipientList.length > 0) {
          return recipientList.length;
        }
      }

      return 1;
    },
    [employees]
  );

  /* ========== ADMIN NOTIFICATION SYSTEM ========== */

  const triggerAdminNotification = useCallback(
    (logEntry) => {
      const notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        type: logEntry.type,
        priority: logEntry.priority,
        title: getNotificationTitle(logEntry.type, logEntry.priority),
        message: logEntry.message,
        details: logEntry.details,
        userId: logEntry.userId,
        userInfo: logEntry.userInfo,
        read: false,
        dismissed: false,
      };

      setAdminNotifications((prev) => {
        const newNotifications = [notification, ...prev];
        if (newNotifications.length > 50) newNotifications.pop();

        localStorage.setItem(
          'adminNotifications',
          JSON.stringify(newNotifications)
        );

        return newNotifications;
      });

      if (currentUser?.role === 'admin' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(`[${notification.priority}] HR 시스템 알림`, {
            body: notification.message,
            icon: '/favicon.ico',
            tag: notification.id,
          });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              new Notification(`[${notification.priority}] HR 시스템 알림`, {
                body: notification.message,
                icon: '/favicon.ico',
                tag: notification.id,
              });
            }
          });
        }
      }
    },
    [currentUser]
  );

  const getNotificationTitle = useCallback((type, priority) => {
    const titles = {
      DB_CONNECTION_FAILED: 'DB/ERP 연결 실패',
      EXTERNAL_API_FAILED: '외부 API 호출 실패',
      API_KEY_TEST_ERROR: 'API 키 테스트 오류',
      AUTH_FAILURE: '인증 실패',
      DATA_ACCESS_DENIED: '데이터 접근 거부',
      MODEL_CHANGE: 'AI 모델 변경',
      BULK_DOWNLOAD: '대량 다운로드',
      REPEATED_ERROR: '반복 오류 발생',
    };

    const priorityPrefix =
      priority === 'CRITICAL'
        ? '🚨 긴급: '
        : priority === 'HIGH'
        ? '⚠️ 중요: '
        : '';

    return priorityPrefix + (titles[type] || '시스템 이벤트');
  }, []);

  /* ========== USER NOTIFICATION SYSTEM ========== */

  const showUserNotification = useCallback(
    (type, title, message, duration = 5000) => {
      const notification = {
        id: Date.now(),
        type,
        title,
        message,
        timestamp: new Date().toISOString(),
      };

      setNotifications((prev) => [notification, ...prev.slice(0, 4)]);

      setTimeout(() => {
        setNotifications((prev) =>
          prev.filter((n) => n.id !== notification.id)
        );
      }, duration);
    },
    []
  );

  /* ========== ACCIDENT FREE NOTIFICATION ========== */

  const checkAccidentFreeNotification = useCallback(
    (accidentFreeDays) => {
      if (accidentFreeDays > 0 && accidentFreeDays % 10 === 0) {
        const lastNotificationKey = `lastAccidentFreeNotification_${accidentFreeDays}`;
        const lastNotified = localStorage.getItem(lastNotificationKey);
        const today = new Date().toISOString().slice(0, 10);

        if (lastNotified !== today) {
          const celebrationMessage = `🎉 무사고 ${accidentFreeDays}일 달성! 모두의 노력에 감사합니다.`;

          const 축하알림 = {
            id: Date.now() + Math.random(),
            title: `무사고 ${accidentFreeDays}일 달성 축하`,
            content: celebrationMessage,
            recipients: { type: '전체', value: '전체직원' },
            createdAt: new Date().toISOString(),
            status: '진행중',
          };

          setRealtimeNotifications((prev) => [축하알림, ...prev]);

          // DB에 알림 로그 저장
          (async () => {
            try {
              const notificationLogData = {
                notificationType: '시스템',
                title: `무사고 ${accidentFreeDays}일 달성`,
                content: celebrationMessage,
                status: '진행중', // 직원들이 볼 수 있도록 '진행중' 상태로 저장
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
                repeatCycle: '즉시',
                recipients: { type: '전체', value: '전체직원' },
                priority: 'high',
                createdAt: new Date(),
              };

              await NotificationAPI.create(notificationLogData);
            } catch (error) {
              console.error('❌ 무사고 달성 알림 로그 DB 저장 실패:', error);
            }
          })();

          const newNotificationLog = {
            id: Date.now() + Math.random() + 1,
            type: '안전알림',
            title: `무사고 ${accidentFreeDays}일 달성`,
            recipients: '전체직원',
            content: celebrationMessage,
            createdAt: new Date().toLocaleString('ko-KR'),
            completedAt: null,
          };

          setNotificationLogs((prev) => [newNotificationLog, ...prev]);

          localStorage.setItem(lastNotificationKey, today);

          devLog(`🎉 무사고 ${accidentFreeDays}일 달성 알림 전송 완료`);
        }
      }
    },
    [devLog]
  );

  /* ========== EFFECTS ========== */

  // 초기 클린업 및 정기 클린업 실행
  useEffect(() => {
    cleanupExpiredNotifications();

    const cleanupInterval = setInterval(() => {
      cleanupExpiredNotifications();
    }, 6 * 60 * 60 * 1000); // 6시간마다

    return () => clearInterval(cleanupInterval);
  }, [cleanupExpiredNotifications]);

  // 직원 알림 자동 업데이트
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      updateEmployeeNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentUser,
    regularNotifications,
    realtimeNotifications,
    notificationLogs,
  ]);

  // 사용자 변경 시 읽음 상태 초기화
  useEffect(() => {
    if (currentUser?.id) {
      try {
        const savedNotifications = localStorage.getItem(
          `readNotifications_${currentUser.id}`
        );

        setReadNotifications(
          savedNotifications
            ? new Set(JSON.parse(savedNotifications))
            : new Set()
        );
      } catch (error) {
        devLog('Failed to load read states:', error);
        setReadNotifications(new Set());
      }
    }
  }, [currentUser?.id, devLog]);

  /* ========== RETURN ========== */

  return {
    // States
    regularNotifications,
    setRegularNotifications,
    realtimeNotifications,
    setRealtimeNotifications,
    notificationLogs,
    setNotificationLogs,
    showAllNotificationLogs,
    setShowAllNotificationLogs,
    notificationLogSearch,
    setNotificationLogSearch,
    showAddRegularNotificationPopup,
    setShowAddRegularNotificationPopup,
    showAddRealtimeNotificationPopup,
    setShowAddRealtimeNotificationPopup,
    showAddNotificationPopup,
    setShowAddNotificationPopup,
    알림유형,
    set알림유형,
    showEditRegularNotificationPopup,
    setShowEditRegularNotificationPopup,
    showEditRealtimeNotificationPopup,
    setShowEditRealtimeNotificationPopup,
    editingRegularNotification,
    setEditingRegularNotification,
    editingRealtimeNotification,
    setEditingRealtimeNotification,
    regularNotificationForm,
    setRegularNotificationForm,
    realtimeNotificationForm,
    setRealtimeNotificationForm,
    showRecurringSettingsModal,
    setShowRecurringSettingsModal,
    recurringSettings,
    setRecurringSettings,
    currentFormType,
    setCurrentFormType,
    employeeNotifications,
    setEmployeeNotifications,
    readNotifications,
    setReadNotifications,
    adminNotifications,
    setAdminNotifications,
    notifications,
    setNotifications,
    employeeSearchTerm,
    setEmployeeSearchTerm,
    searchResults,
    setSearchResults,

    // Constants
    repeatCycleOptions,
    recipientOptions,
    요일목록,

    // Functions
    cleanupExpiredNotifications,
    isRegularExpired,
    isLogOlderThan3Years,
    cleanupOldLogs,
    cleanupExpiredRegulars,
    handleAddRegularNotification,
    handleAddRealtimeNotification,
    handleDeleteRegularNotification,
    handleEditRegularNotification,
    handleSaveRegularNotificationEdit,
    handleSaveRealtimeNotificationEdit,
    isExpired5Days,
    updateEmployeeNotifications,
    markNotificationAsRead,
    getUnreadNotificationCount,
    getRecipientText,
    shouldReceiveNotification,
    openRecurringSettingsModal,
    closeRecurringSettingsModal,
    handleRecurringSettingsComplete,
    generateRecurringText,
    handleWeekdayToggle,
    handleEmployeeSearch,
    get관리자알림목록,
    calculateRecipientCount,
    getFilteredNotificationLogs,
    addEmployeeToRecipients,
    removeEmployeeFromRecipients,
    handleEmployeeToggle,
    triggerAdminNotification,
    getNotificationTitle,
    showUserNotification,
    checkAccidentFreeNotification,
  };
};

// ============================================================
// [2_관리자 모드] 2.4_알림 관리 - UTILS
// ============================================================

/**
 * 날짜를 "YYYY-MM-DD 오전/오후 HH:MM" 형식으로 포맷
 * @param {string|Date} createdAt - 포맷할 날짜
 * @returns {string} 포맷된 날짜 문자열
 */
export const formatCreatedAt = (createdAt) => {
  try {
    let date;
    if (createdAt) {
      if (typeof createdAt === 'string' && createdAt.includes('오')) {
        return createdAt;
      }
      date = new Date(createdAt);
    } else {
      date = new Date();
    }

    if (isNaN(date.getTime())) {
      return createdAt || '날짜 오류';
    }

    // UTC를 한국 시간(KST, UTC+9)으로 변환
    const kstOffset = 9 * 60; // 9시간을 분으로
    const kstDate = new Date(date.getTime() + kstOffset * 60 * 1000);

    const year = kstDate.getUTCFullYear();
    const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(kstDate.getUTCDate()).padStart(2, '0');
    const hours24 = kstDate.getUTCHours();
    const ampm = hours24 >= 12 ? '오후' : '오전';
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    const minutes = String(kstDate.getUTCMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${ampm} ${hours12}:${minutes}`;
  } catch (error) {
    return createdAt || '날짜 오류';
  }
};

/**
 * D-day 계산
 * @param {string|Date} endDate - 종료 날짜
 * @returns {string} D-day 텍스트 ("D-X", "d-day", "종료")
 */
export const calculateDDay = (endDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const diffTime = end - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 0) return `D-${diffDays}`;
  if (diffDays === 0) return 'd-day';
  return '종료';
};

/**
 * 반복 설정을 텍스트로 변환
 * @param {Object} recurringSettings - 반복 설정 객체
 * @param {string} repeatCycle - 반복 주기
 * @returns {string} 반복 설정 텍스트
 */
export const getRecurringSettingsDisplay = (recurringSettings, repeatCycle) => {
  if (!recurringSettings || !repeatCycle || repeatCycle === '특정일') {
    return '기본 설정';
  }

  // 매일
  if (recurringSettings.매일?.반복간격) {
    return `${recurringSettings.매일.반복간격}일마다`;
  }

  // 매주
  if (recurringSettings.매주?.반복요일?.length > 0) {
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const selectedDays = recurringSettings.매주.반복요일
      .map((d) => dayNames[d])
      .join(',');
    const weeks = recurringSettings.매주.반복간격 || 1;
    return `${weeks}주마다 (${selectedDays})`;
  }

  // 매월
  if (recurringSettings.매월?.반복일자) {
    const months = recurringSettings.매월.반복간격 || 1;
    return `${months}개월마다 (${recurringSettings.매월.반복일자}일)`;
  }

  // 매년
  if (recurringSettings.매년?.반복월) {
    const years = recurringSettings.매년.반복간격 || 1;
    return `${years}년마다 (${recurringSettings.매년.반복월}월 ${
      recurringSettings.매년.반복일자 || 1
    }일)`;
  }

  return repeatCycle;
};

// ============================================================
// [2_관리자 모드] 2.3_공지 관리 - UTILS
// ============================================================

// [2_관리자 모드] 2.3_공지 관리 - UTILS
// ============================================================

/**
 * 공지사항 목록 필터링
 * @param {Array} noticeList - 공지사항 목록
 * @param {Object} noticeSearch - 검색 조건
 * @returns {Array} 필터링된 공지사항 목록
 */
export const filterNotices = (noticeList, noticeSearch) => {
  return noticeList.filter((notice) => {
    if (noticeSearch.year || noticeSearch.month || noticeSearch.day) {
      const noticeDate = new Date(notice.date);
      if (
        noticeSearch.year &&
        noticeDate.getFullYear() !== parseInt(noticeSearch.year)
      ) {
        return false;
      }
      if (
        noticeSearch.month &&
        noticeDate.getMonth() + 1 !== parseInt(noticeSearch.month)
      ) {
        return false;
      }
      if (
        noticeSearch.day &&
        noticeDate.getDate() !== parseInt(noticeSearch.day)
      ) {
        return false;
      }
    }

    if (noticeSearch.keyword) {
      if (
        !notice.title?.includes(noticeSearch.keyword) &&
        !notice.content?.includes(noticeSearch.keyword)
      ) {
        return false;
      }
    }

    return true;
  });
};

// ============================================================
// [2_관리자 모드] EXPORTS (update-only)
// ============================================================

/**
 * EXPORTS - 2.4_알림 관리:
 *
 * [Constants]
 * - repeatCycleOptions: 반복 주기 옵션 배열
 * - recipientOptions: 부서/직급/직책 옵션 객체
 * - 요일목록: 요일 배열
 *
 * [Hooks]
 * - useNotificationRecurring: 알림 반복 설정 관리 Hook
 * - useAdminNotifications: 관리자 알림 관리 Hook
 * - useEmployeeNotifications: 직원 알림 관리 Hook
 *
 * [Services]
 * - createNotificationHandlers: 알림 핸들러 생성 서비스
 *
 * [Utils]
 * - formatCreatedAt: 날짜 포맷팅 함수
 * - calculateDDay: D-day 계산 함수
 * - getRecurringSettingsDisplay: 반복 설정 표시 함수
 * - getRecipientText: 수신자 텍스트 반환
 * - shouldReceiveNotification: 알림 수신 여부 확인
 * - get관리자알림목록: 관리자 알림 목록 조회
 * - get통합알림리스트: 통합 알림 리스트 조회
 * - calculateRecipientCount: 수신자 수 계산
 * - getFilteredNotificationLogs: 필터링된 알림 로그 조회
 * - retrySend: 알림 재전송 (retry 로직)
 * - send자동알림: 자동 알림 전송
 *
 * EXPORTS - 2.3_공지 관리:
 *
 * [Hooks]
 * - useNoticeManagement: 공지 관리 Hook
 *
 * [Utils]
 * - filterNotices: 공지사항 목록 필터링 함수
 */
