import React, { useState, useCallback, useEffect } from 'react';
import HolidayAPI from '../api/holiday';
import holidayService from '../components/common/common_common';

const devLog = (...args) => {
  //  if (process.env.NODE_ENV === 'development') console.log(...args);
};

/**
 * 공휴일 관리 커스텀 훅
 * App.js [1_공통] 1.3.2_공휴일 관리 STATE + 함수 블록에서 추출
 *
 * 반환값:
 *   holidayData, holidayLoadingStatus, holidayInFlightRef,
 *   customHolidays, setCustomHolidays,
 *   showHolidayPopup, setShowHolidayPopup,
 *   selectedHolidayDate, setSelectedHolidayDate,
 *   holidayForm, setHolidayForm,
 *   deletedSystemHolidays, setDeletedSystemHolidays,
 *   editedSystemHolidays, setEditedSystemHolidays,
 *   showDeletedHolidaysModal, setShowDeletedHolidaysModal,
 *   permanentlyDeletedSystemHolidays, setPermanentlyDeletedSystemHolidays,
 *   loadHolidayData, getKoreanHolidays,
 *   forceRefreshHolidays, restoreSystemHoliday, permanentlyDeleteSystemHoliday
 */
const useHolidayData = () => {
  // *[1_공통] 1.3.2.1_공휴일 데이터*
  const [holidayData, setHolidayData] = useState({});
  const [holidayLoadingStatus, setHolidayLoadingStatus] = useState({});
  // 로딩 중 여부를 ref로 추적 (함수 재생성 없이 중복 호출 방지)
  const holidayInFlightRef = React.useRef({});

  // *[1_공통] 1.3.2.2_커스텀 공휴일*
  const [customHolidays, setCustomHolidays] = useState({});
  const [showHolidayPopup, setShowHolidayPopup] = useState(false);
  const [selectedHolidayDate, setSelectedHolidayDate] = useState('');
  const [holidayForm, setHolidayForm] = useState({
    date: '',
    name: '',
    isEdit: false,
    originalDate: '',
  });

  // *[1_공통] 1.3.2.2.1_시스템 공휴일 수정/삭제 관리*
  const [deletedSystemHolidays, setDeletedSystemHolidays] = useState([]);
  const [editedSystemHolidays, setEditedSystemHolidays] = useState({});
  const [showDeletedHolidaysModal, setShowDeletedHolidaysModal] = useState(false);
  const [
    permanentlyDeletedSystemHolidays,
    setPermanentlyDeletedSystemHolidays,
  ] = useState([]);

  // *[1_공통] 1.3.2.3_공휴일 데이터 로드 함수 (DB 기반)*
  const loadHolidayData = useCallback(
    async (year) => {
      // 방어 코드: year가 유효한 숫자인지 확인
      if (!year || isNaN(year) || year < 2000 || year > 2100) {
        return {};
      }

      // ref 기반 중복 방지: 이미 로드됐거나 로딩 중이면 즉시 반환
      if (holidayInFlightRef.current[year] === 'loaded') {
        return holidayInFlightRef.current[`data_${year}`];
      }
      if (holidayInFlightRef.current[year] === 'loading') {
        return;
      }

      holidayInFlightRef.current[year] = 'loading';
      setHolidayLoadingStatus((prev) => ({ ...prev, [year]: 'loading' }));

      try {
        devLog(`🔄 [DB] ${year}년 공휴일 데이터 로딩 중...`);

        // DB에서 공휴일 데이터 로드
        const response = await HolidayAPI.getYearHolidays(year);
        let holidays = response.data || {};

        devLog(
          `✅ [DB] ${year}년 공휴일 ${
            Object.keys(holidays).length / 2
          }일 로드 완료`
        );

        // 삭제된 시스템 공휴일 제외
        const deleted = JSON.parse(
          localStorage.getItem('deletedSystemHolidays') || '[]'
        );
        deleted.forEach((date) => {
          const shortDate = date.substring(5); // MM-DD
          delete holidays[date];
          delete holidays[shortDate];
        });

        // 영구 삭제된 시스템 공휴일도 제외
        const permanentlyDeleted = JSON.parse(
          localStorage.getItem('permanentlyDeletedSystemHolidays') || '[]'
        );
        permanentlyDeleted.forEach((date) => {
          const shortDate = date.substring(5); // MM-DD
          delete holidays[date];
          delete holidays[shortDate];
        });

        // 수정된 시스템 공휴일 적용
        const edited = JSON.parse(
          localStorage.getItem('editedSystemHolidays') || '{}'
        );
        Object.entries(edited).forEach(([date, name]) => {
          const shortDate = date.substring(5); // MM-DD
          holidays[date] = name;
          holidays[shortDate] = name;
        });

        holidayInFlightRef.current[year] = 'loaded';
        holidayInFlightRef.current[`data_${year}`] = holidays; // ref에도 최신값 저장
        setHolidayData((prev) => ({ ...prev, [year]: holidays }));
        setHolidayLoadingStatus((prev) => ({ ...prev, [year]: 'loaded' }));

        return holidays;
      } catch (error) {
        devLog(
          `❌ [DB] ${year}년 공휴일 데이터 로드 실패, 로컬 폴백 사용:`,
          error.message
        );
        holidayInFlightRef.current[year] = 'error';
        setHolidayLoadingStatus((prev) => ({ ...prev, [year]: 'error' }));

        // 폴백: HolidayService의 로컬 데이터 사용
        const basicHolidays = holidayService.getBasicHolidays(year);
        setHolidayData((prev) => ({ ...prev, [year]: basicHolidays }));
        return basicHolidays;
      }
    },
    [] // ref 기반 가드로 함수 참조 안정화 (의존성 제거)
  );

  // *[1_공통] 1.3.2.4_공휴일 시스템 초기화 useEffect (DB 기반)*
  useEffect(() => {
    const initializeHolidaySystem = async () => {
      try {
        const currentYear = new Date().getFullYear();

        const priorityYears = [currentYear - 1, currentYear, currentYear + 1];
        devLog('🚀 [DB] 우선순위 공휴일 데이터 로드 시작:', priorityYears);

        await Promise.all(priorityYears.map((year) => loadHolidayData(year)));
        devLog('✅ [DB] 우선순위 공휴일 데이터 로드 완료');
      } catch (error) {
        devLog('❌ 공휴일 시스템 초기화 실패:', error);

        const currentYear = new Date().getFullYear();
        await loadHolidayData(currentYear);
      }
    };

    // [5차 패치] 300ms 지연 — 공지/알림이 먼저 HTTP 슬롯 확보
    const holidayInitTimer = setTimeout(() => initializeHolidaySystem(), 300);

    // 자정 자동 업데이트 이벤트 리스너 등록
    const handleHolidayUpdate = async (event) => {
      const { years } = event.detail;
      for (const year of years) {
        await loadHolidayData(year);
      }
    };

    window.addEventListener('holidayDataUpdated', handleHolidayUpdate);

    return () => {
      clearTimeout(holidayInitTimer);
      holidayService.stopPeriodicUpdate();
      window.removeEventListener('holidayDataUpdated', handleHolidayUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // *[1_공통] 1.3.2.5_공휴일 데이터 가져오기 (레거시 호환)*
  const getKoreanHolidays = (year) => {
    if (holidayData[year] && Object.keys(holidayData[year]).length > 0) {
      return holidayData[year];
    }

    try {
      return holidayService.getBasicHolidays(year) || {};
    } catch (error) {
      return {};
    }
  };

  // *[1_공통] 1.3.2.6_공휴일 강제 새로고침*
  const forceRefreshHolidays = async () => {
    const currentYear = new Date().getFullYear();
    const yearsToRefresh = [currentYear - 1, currentYear, currentYear + 1];

    try {
      yearsToRefresh.forEach((year) => {
        holidayService.clearCache(year);
        setHolidayLoadingStatus((prev) => ({ ...prev, [year]: null }));
      });

      const refreshPromises = yearsToRefresh.map(async (year) => {
        // ref 초기화 후 재로드
        holidayInFlightRef.current[year] = undefined;
        holidayInFlightRef.current[`data_${year}`] = undefined;
        const holidays = await loadHolidayData(year);
        return { year, holidays };
      });

      await Promise.all(refreshPromises);

      return true;
    } catch (error) {
      return false;
    }
  };

  // *[1_공통] 1.3.2.7_시스템 공휴일 복구*
  const restoreSystemHoliday = async (dateToRestore) => {
    try {
      // localStorage에서 삭제된 공휴일 목록 가져오기
      const deleted = JSON.parse(
        localStorage.getItem('deletedSystemHolidays') || '[]'
      );

      // 해당 날짜를 삭제 목록에서 제거
      const updatedDeleted = deleted.filter((date) => date !== dateToRestore);
      localStorage.setItem(
        'deletedSystemHolidays',
        JSON.stringify(updatedDeleted)
      );

      // 상태 업데이트
      setDeletedSystemHolidays(updatedDeleted);

      // 해당 연도의 공휴일 데이터 다시 로드
      const year = parseInt(dateToRestore.split('-')[0]);
      holidayService.clearCache(year);
      holidayInFlightRef.current[year] = undefined;
      holidayInFlightRef.current[`data_${year}`] = undefined;
      setHolidayLoadingStatus((prev) => ({ ...prev, [year]: null }));
      await loadHolidayData(year);

      return true;
    } catch (error) {
      return false;
    }
  };

  // *[1_공통] 1.3.2.8_시스템 공휴일 영구 삭제*
  const permanentlyDeleteSystemHoliday = async (dateToDelete) => {
    try {
      // 1. deletedSystemHolidays에서 제거
      const deleted = JSON.parse(
        localStorage.getItem('deletedSystemHolidays') || '[]'
      );
      const updatedDeleted = deleted.filter((date) => date !== dateToDelete);
      localStorage.setItem(
        'deletedSystemHolidays',
        JSON.stringify(updatedDeleted)
      );
      setDeletedSystemHolidays(updatedDeleted);

      // 2. permanentlyDeletedSystemHolidays에 추가
      const permanentlyDeleted = JSON.parse(
        localStorage.getItem('permanentlyDeletedSystemHolidays') || '[]'
      );
      if (!permanentlyDeleted.includes(dateToDelete)) {
        permanentlyDeleted.push(dateToDelete);
        localStorage.setItem(
          'permanentlyDeletedSystemHolidays',
          JSON.stringify(permanentlyDeleted)
        );
        setPermanentlyDeletedSystemHolidays(permanentlyDeleted);
      }

      // 3. editedSystemHolidays에서도 제거 (있다면)
      const edited = JSON.parse(
        localStorage.getItem('editedSystemHolidays') || '{}'
      );
      if (edited[dateToDelete]) {
        delete edited[dateToDelete];
        localStorage.setItem('editedSystemHolidays', JSON.stringify(edited));
      }

      return true;
    } catch (error) {
      return false;
    }
  };

  return {
    holidayData,
    setHolidayData,
    holidayLoadingStatus,
    setHolidayLoadingStatus,
    holidayInFlightRef,
    customHolidays,
    setCustomHolidays,
    showHolidayPopup,
    setShowHolidayPopup,
    selectedHolidayDate,
    setSelectedHolidayDate,
    holidayForm,
    setHolidayForm,
    deletedSystemHolidays,
    setDeletedSystemHolidays,
    editedSystemHolidays,
    setEditedSystemHolidays,
    showDeletedHolidaysModal,
    setShowDeletedHolidaysModal,
    permanentlyDeletedSystemHolidays,
    setPermanentlyDeletedSystemHolidays,
    loadHolidayData,
    getKoreanHolidays,
    forceRefreshHolidays,
    restoreSystemHoliday,
    permanentlyDeleteSystemHoliday,
  };
};

export default useHolidayData;
