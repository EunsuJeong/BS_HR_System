/**
 * [2_관리자 모드] 2.7_일정 관리 통합 모듈
 * - Constants → Hook → Service → Util → Export
 * - UI 컴포넌트 제외, 지원 로직만 포함
 */

import { useCallback } from 'react';
import { ScheduleAPI } from '../../api/system';
import HolidayAPI from '../../api/holiday';

// ============================================================
// [2_관리자 모드] 2.7_일정 관리 - CONSTANTS
// ============================================================

/**
 * 이벤트 타입 목록
 */
export const EVENT_TYPES = ['업무', '행사', '교육', '회의', '휴무', '기타'];

/**
 * 이벤트 타입별 색상 맵핑
 */
export const EVENT_TYPE_COLORS = {
  업무: 'bg-green-100 text-green-800',
  행사: 'bg-purple-100 text-purple-800',
  교육: 'bg-blue-100 text-blue-800',
  회의: 'bg-orange-100 text-orange-800',
  휴무: 'bg-red-100 text-red-800',
  공휴일: 'bg-red-100 text-red-800',
  기타: 'bg-gray-100 text-gray-800',
};

// ============================================================
// [2_관리자 모드] 2.7_일정 관리 - HOOKS
// ============================================================

export const useHolidayManagement = (dependencies = {}) => {
  const {
    customHolidays = {},
    setCustomHolidays = () => {},
    holidayForm = {},
    setHolidayForm = () => {},
    setSelectedHolidayDate = () => {},
    setShowHolidayPopup = () => {},
    setWorkTypeSettings = () => {},
    attendanceSheetData = {},
    setAttendanceSheetData = () => {},
    employees = [],
    holidayData = {},
    setHolidayData = () => {},
  } = dependencies;

  // [2_관리자 모드] 2.5_일정관리 - 공휴일 추가 시작
  const handleAddHoliday = useCallback(
    (clickedDate = null) => {
      setHolidayForm({
        date: clickedDate || '',
        name: '',
        isEdit: false,
        originalDate: '',
      });
      setSelectedHolidayDate(clickedDate);
      setShowHolidayPopup(true);
    },
    [setHolidayForm, setSelectedHolidayDate, setShowHolidayPopup]
  );

  // [2_관리자 모드] 2.5_일정관리 - 공휴일 수정 시작
  const handleEditHoliday = useCallback(
    (date, name) => {
      setHolidayForm({
        date,
        name,
        isEdit: true,
        originalDate: date,
      });
      setSelectedHolidayDate(date);
      setShowHolidayPopup(true);
    },
    [setHolidayForm, setSelectedHolidayDate, setShowHolidayPopup]
  );

  // [2_관리자 모드] 2.5_일정관리 - 근무 시간 계산 (출퇴근 시간으로)
  const calculateWorkHoursFromTimes = useCallback((checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;

    const [inHour, inMin] = checkIn.split(':').map(Number);
    const [outHour, outMin] = checkOut.split(':').map(Number);

    let inMinutes = inHour * 60 + inMin;
    let outMinutes = outHour * 60 + outMin;

    // 퇴근 시간이 출근 시간보다 작으면 다음날로 간주 (야간 근무)
    if (outMinutes < inMinutes) {
      outMinutes += 24 * 60;
    }

    const totalMinutes = outMinutes - inMinutes;
    const hours = totalMinutes / 60;

    return Math.round(hours * 10) / 10; // 소수점 첫째자리까지
  }, []);

  // [2_관리자 모드] 2.5_일정관리 - 공휴일 저장
  const handleSaveHoliday = useCallback(async () => {
    if (!holidayForm.name || !holidayForm.name.trim() || !holidayForm.date) {
      alert('날짜와 공휴일명을 입력해주세요.');
      return;
    }

    try {
      // 날짜가 변경된 경우 이전 날짜 삭제
      if (holidayForm.isEdit && holidayForm.originalDate !== holidayForm.date) {
        await HolidayAPI.delete(holidayForm.originalDate);
      }

      // 수정 또는 생성
      if (holidayForm.isEdit) {
        await HolidayAPI.update(holidayForm.date, {
          name: holidayForm.name.trim(),
          type: 'custom',
        });
      } else {
        await HolidayAPI.create({
          date: holidayForm.date,
          name: holidayForm.name.trim(),
          type: 'custom',
        });
      }

      // holidayData state 업데이트
      const year = holidayForm.date.split('-')[0];
      const shortDate = holidayForm.date.substring(5);

      setHolidayData((prev) => {
        const updated = { ...prev };

        // 이전 날짜 데이터 제거
        if (
          holidayForm.isEdit &&
          holidayForm.originalDate !== holidayForm.date
        ) {
          const oldYear = holidayForm.originalDate.split('-')[0];
          const oldShortDate = holidayForm.originalDate.substring(5);
          if (updated[oldYear]) {
            const yearData = { ...updated[oldYear] };
            delete yearData[holidayForm.originalDate];
            delete yearData[oldShortDate];
            updated[oldYear] = yearData;
          }
        }

        // 새 날짜 데이터 추가
        if (!updated[year]) {
          updated[year] = {};
        }
        updated[year][holidayForm.date] = holidayForm.name.trim();
        updated[year][shortDate] = holidayForm.name.trim();

        return updated;
      });

      // customHolidays state 업데이트 (레거시 호환)
      setCustomHolidays((prev) => {
        const updated = { ...prev };
        if (
          holidayForm.isEdit &&
          holidayForm.originalDate !== holidayForm.date
        ) {
          delete updated[holidayForm.originalDate];
        }
        updated[holidayForm.date] = holidayForm.name.trim();
        return updated;
      });

      // 근태 관리 연동: workTypeSettings에서 해당 날짜 제거하여 자동 재계산되도록 함
      setWorkTypeSettings((prev) => {
        const updated = { ...prev };
        delete updated[holidayForm.date];
        if (
          holidayForm.isEdit &&
          holidayForm.originalDate !== holidayForm.date
        ) {
          delete updated[holidayForm.originalDate];
        }
        return updated;
      });

      // 근태 관리 연동: 공휴일 등록 시 출퇴근 기록을 특근으로 전환
      setAttendanceSheetData((prev) => {
        const updated = { ...prev };
        employees.forEach((emp) => {
          const employeeKey = `${emp.id}_${holidayForm.date}`;
          if (updated[employeeKey]) {
            const { checkIn, checkOut } = updated[employeeKey];
            if (checkIn && checkOut) {
              const workHours = calculateWorkHoursFromTimes(checkIn, checkOut);
              if (workHours > 0) {
                updated[employeeKey] = {
                  ...updated[employeeKey],
                  specialWorkHours: workHours.toString(),
                };
              }
            }
          }
        });
        return updated;
      });

      setShowHolidayPopup(false);
      setHolidayForm({ date: '', name: '', isEdit: false, originalDate: '' });
      setSelectedHolidayDate(null);
    } catch (error) {
      console.error('❌ [DB] 공휴일 저장 실패:', error);
      alert('공휴일 저장에 실패했습니다.');
    }
  }, [
    holidayForm,
    customHolidays,
    setCustomHolidays,
    setShowHolidayPopup,
    setHolidayForm,
    setSelectedHolidayDate,
    setWorkTypeSettings,
    setAttendanceSheetData,
    employees,
    calculateWorkHoursFromTimes,
    setHolidayData,
  ]);

  // [2_관리자 모드] 2.5_일정관리 - 공휴일 삭제
  const handleDeleteHoliday = useCallback(
    async (date) => {
      if (!window.confirm('이 공휴일을 삭제하시겠습니까?')) {
        return;
      }

      try {
        // DB에서 공휴일 삭제
        await HolidayAPI.delete(date);

        // 시스템 공휴일도 삭제 (각 연도별 데이터에서 제거)
        const year = date.split('-')[0];
        const shortDate = date.substring(5); // MM-DD 형식

        setHolidayData((prev) => {
          const updated = { ...prev };
          if (updated[year]) {
            const yearData = { ...updated[year] };
            delete yearData[date]; // YYYY-MM-DD 형식 삭제
            delete yearData[shortDate]; // MM-DD 형식 삭제
            updated[year] = yearData;
          }
          return updated;
        });

        // customHolidays state 업데이트 (레거시 호환)
        setCustomHolidays((prev) => {
          const updated = { ...prev };
          delete updated[date];
          return updated;
        });

        // 근태 관리 연동: workTypeSettings에서 해당 날짜 제거하여 자동 재계산되도록 함
        setWorkTypeSettings((prev) => {
          const updated = { ...prev };
          delete updated[date];
          return updated;
        });

        // 근태 관리 연동: 공휴일 삭제 시 특근 시간 제거 (평일로 전환)
        setAttendanceSheetData((prev) => {
          const updated = { ...prev };
          employees.forEach((emp) => {
            const employeeKey = `${emp.id}_${date}`;
            if (updated[employeeKey]) {
              updated[employeeKey] = {
                ...updated[employeeKey],
                specialWorkHours: '',
              };
            }
          });
          return updated;
        });
      } catch (error) {
        console.error('❌ [DB] 공휴일 삭제 실패:', error);
        alert('공휴일 삭제에 실패했습니다.');
      }
    },
    [
      customHolidays,
      setCustomHolidays,
      setWorkTypeSettings,
      setAttendanceSheetData,
      employees,
      setHolidayData,
    ]
  );

  // [2_관리자 모드] 2.5_일정관리 - 공휴일 취소
  const handleCancelHoliday = useCallback(() => {
    setShowHolidayPopup(false);
    setHolidayForm({ date: '', name: '', isEdit: false, originalDate: '' });
    setSelectedHolidayDate(null);
  }, [setShowHolidayPopup, setHolidayForm, setSelectedHolidayDate]);

  return {
    handleAddHoliday,
    handleEditHoliday,
    handleSaveHoliday,
    handleDeleteHoliday,
    handleCancelHoliday,
  };
};

// ============================================================
// useScheduleManagement.js
// ============================================================

export const useScheduleManagement = (dependencies = {}) => {
  const {
    scheduleEvents = [],
    setScheduleEvents = () => {},
    customHolidays = {},
    setCustomHolidays = () => {},
    selectedEventDate = null,
    setShowAddEventPopup = () => {},
    setEventForm = () => {},
    setShowUnifiedAddPopup = () => {},
    setUnifiedForm = () => {},
    setUnifiedAddType = () => {},
    setEditingEvent = () => {},
    setShowEditEventPopup = () => {},
    unifiedAddType = '일정',
    unifiedForm = {},
    holidayData = {},
    setHolidayData = () => {},
  } = dependencies;

  // [2_관리자 모드] 2.5_일정관리 - 일정 추가 시작
  const handleAddEvent = useCallback(
    (clickedDate = null) => {
      const dateToUse = clickedDate || selectedEventDate;
      if (dateToUse) {
        setEventForm({
          title: '',
          date: dateToUse,
          type: '업무',
          description: '',
        });
      } else {
        setEventForm({
          title: '',
          date: '',
          type: '업무',
          description: '',
        });
      }
      setShowAddEventPopup(true);
    },
    [selectedEventDate, setEventForm, setShowAddEventPopup]
  );

  // [2_관리자 모드] 2.5_일정관리 - 통합 추가 시작 (일정/공휴일)
  const handleUnifiedAdd = useCallback(
    (clickedDate = null) => {
      const dateToUse = clickedDate || '';
      setUnifiedForm({
        title: '',
        date: dateToUse,
        type: '업무',
        description: '',
        name: '',
      });
      setUnifiedAddType('일정');
      setShowUnifiedAddPopup(true);
    },
    [setUnifiedForm, setUnifiedAddType, setShowUnifiedAddPopup]
  );

  // [2_관리자 모드] 2.5_일정관리 - 통합 저장 (일정/공휴일)
  const handleSaveUnified = useCallback(async () => {
    if (unifiedAddType === '일정') {
      if (!unifiedForm.title || !unifiedForm.title.trim() || !unifiedForm.date) {
        alert('제목과 날짜를 입력해주세요.');
        return;
      }

      const newEvent = {
        title: unifiedForm.title.trim(),
        date: unifiedForm.date,
        type: unifiedForm.type,
        description: unifiedForm.description ? unifiedForm.description.trim() : '',
      };

      try {
        const response = await ScheduleAPI.create(newEvent);
        if (response.success) {
          const createdEvent = {
            id: response.data._id,
            ...newEvent,
          };
          const updatedEvents = [...scheduleEvents, createdEvent];
          setScheduleEvents(updatedEvents);
        }
      } catch (error) {
        console.error('❌ [DB] 일정 저장 실패:', error);
        alert('일정 저장에 실패했습니다.');
        return;
      }
    } else {
      if (!unifiedForm.name || !unifiedForm.name.trim() || !unifiedForm.date) {
        alert('날짜와 공휴일명을 입력해주세요.');
        return;
      }

      try {
        await HolidayAPI.create({
          date: unifiedForm.date,
          name: unifiedForm.name.trim(),
          type: 'custom',
        });

        // holidayData state 업데이트 (즉시 달력에 반영)
        const year = unifiedForm.date.split('-')[0];
        const shortDate = unifiedForm.date.substring(5); // MM-DD

        setHolidayData((prev) => {
          const updated = { ...prev };
          if (!updated[year]) {
            updated[year] = {};
          }
          updated[year][unifiedForm.date] = unifiedForm.name.trim();
          updated[year][shortDate] = unifiedForm.name.trim();
          return updated;
        });

        // customHolidays state 업데이트 (레거시 호환)
        setCustomHolidays((prev) => ({
          ...prev,
          [unifiedForm.date]: unifiedForm.name.trim(),
        }));
      } catch (error) {
        console.error('❌ [DB] 공휴일 생성 실패:', error);
        alert('공휴일 등록에 실패했습니다.');
        return;
      }
    }

    setShowUnifiedAddPopup(false);
    setUnifiedForm({
      title: '',
      date: '',
      type: '업무',
      description: '',
      name: '',
    });
  }, [
    scheduleEvents,
    setScheduleEvents,
    customHolidays,
    setCustomHolidays,
    setShowUnifiedAddPopup,
    setUnifiedForm,
    unifiedAddType,
    unifiedForm,
    setHolidayData,
  ]);

  // [2_관리자 모드] 2.5_일정관리 - 일정 수정 시작
  const handleEditEvent = useCallback(
    (event, handleEditHoliday) => {
      if (event.isCustomHoliday) {
        handleEditHoliday(event.date, event.title);
        return;
      }

      setEditingEvent(event);
      setEventForm({
        title: event.title,
        date: event.date,
        type: event.type,
        description: event.description || '',
      });
      setShowEditEventPopup(true);
    },
    [setEditingEvent, setEventForm, setShowEditEventPopup]
  );

  // [2_관리자 모드] 2.5_일정관리 - 일정 삭제
  const handleDeleteEvent = useCallback(
    async (event) => {
      if (!window.confirm('이 일정을 삭제하시겠습니까?')) {
        return;
      }

      if (event.isCustomHoliday) {
        try {
          await HolidayAPI.delete(event.date);

          // customHolidays state 업데이트 (레거시 호환)
          setCustomHolidays((prev) => {
            const updated = { ...prev };
            delete updated[event.date];
            return updated;
          });
        } catch (error) {
          console.error('❌ [DB] 공휴일 삭제 실패:', error);
          alert('공휴일 삭제에 실패했습니다.');
        }
        return;
      }

      try {
        await ScheduleAPI.delete(event.id);
        const updatedEvents = scheduleEvents.filter((e) => e.id !== event.id);
        setScheduleEvents(updatedEvents);

        // 팝업 닫기
        setShowEditEventPopup(false);
        setEditingEvent(null);
        setEventForm({ title: '', date: '', type: '업무', description: '' });
      } catch (error) {
        console.error('❌ [DB] 일정 삭제 실패:', error);
        alert('일정 삭제에 실패했습니다.');
      }
    },
    [scheduleEvents, setScheduleEvents, customHolidays, setCustomHolidays, setShowEditEventPopup, setEditingEvent, setEventForm]
  );

  // [2_관리자 모드] 2.5_일정관리 - 일정 저장
  const handleSaveEvent = useCallback(
    async (eventForm, editingEvent) => {
      if (!eventForm.title || !eventForm.title.trim() || !eventForm.date) {
        alert('제목과 날짜를 입력해주세요.');
        return;
      }

      const eventData = {
        title: eventForm.title.trim(),
        date: eventForm.date,
        type: eventForm.type,
        description: eventForm.description ? eventForm.description.trim() : '',
      };

      try {
        let updatedEvents;
        if (editingEvent) {
          // 수정
          const response = await ScheduleAPI.update(editingEvent.id, eventData);
          if (response.success) {
            updatedEvents = scheduleEvents.map((e) =>
              e.id === editingEvent.id
                ? { id: editingEvent.id, ...eventData }
                : e
            );
          }
        } else {
          // 생성
          const response = await ScheduleAPI.create(eventData);
          if (response.success) {
            const newEvent = {
              id: response.data._id,
              ...eventData,
            };
            updatedEvents = [...scheduleEvents, newEvent];
          }
        }

        setScheduleEvents(updatedEvents);
        setShowAddEventPopup(false);
        setShowEditEventPopup(false);
        setEditingEvent(null);
        setEventForm({ title: '', date: '', type: '업무', description: '' });
      } catch (error) {
        console.error('❌ [DB] 일정 저장 실패:', error);
        alert('일정 저장에 실패했습니다.');
      }
    },
    [
      scheduleEvents,
      setScheduleEvents,
      setShowAddEventPopup,
      setShowEditEventPopup,
      setEditingEvent,
      setEventForm,
    ]
  );

  // [2_관리자 모드] 2.5_일정관리 - 일정 취소
  const handleCancelEvent = useCallback(() => {
    setShowAddEventPopup(false);
    setShowEditEventPopup(false);
    setEditingEvent(null);
    setEventForm({ title: '', date: '', type: '업무', description: '' });
  }, [
    setShowAddEventPopup,
    setShowEditEventPopup,
    setEditingEvent,
    setEventForm,
  ]);

  return {
    handleAddEvent,
    handleUnifiedAdd,
    handleSaveUnified,
    handleEditEvent,
    handleDeleteEvent,
    handleSaveEvent,
    handleCancelEvent,
  };
};

// ============================================================
// [2_관리자 모드] 2.7_일정 관리 - SERVICES
// ============================================================

// ============ scheduleService.js ============
// *[2_관리자 모드] 일정 관리 서비스*

// *[2_관리자 모드] 2.5_일정 필터링*
/**
 * 일정 검색 조건에 따라 일정 및 커스텀 공휴일을 필터링
 * @param {Array} scheduleEvents - 일정 배열
 * @param {Object} holidayData - 공휴일 데이터 객체 (DB에서 로드됨)
 * @param {Object} scheduleSearch - 검색 조건 객체
 * @param {string} scheduleSearch.year - 연도 검색 조건
 * @param {string} scheduleSearch.month - 월 검색 조건
 * @param {string} scheduleSearch.type - 일정 타입 검색 조건
 * @param {string} scheduleSearch.titleOrContent - 제목/내용 검색 조건
 * @returns {Array} 필터링된 일정 목록 (날짜순 정렬)
 */
export const getFilteredScheduleEvents = (
  scheduleEvents,
  holidayData,
  scheduleSearch
) => {
  // 방어 코드: undefined 체크
  if (!scheduleEvents) scheduleEvents = [];
  if (!holidayData) holidayData = {};
  if (!scheduleSearch) scheduleSearch = {};

  const regularEvents = scheduleEvents.filter((event) => {
    if (scheduleSearch.year) {
      const eventYear = new Date(event.date).getFullYear().toString();
      if (!eventYear.includes(scheduleSearch.year)) return false;
    }

    if (scheduleSearch.month) {
      const eventMonth = (new Date(event.date).getMonth() + 1).toString();
      if (!eventMonth.includes(scheduleSearch.month)) return false;
    }

    if (scheduleSearch.type) {
      if (event.type !== scheduleSearch.type) return false;
    }

    if (scheduleSearch.titleOrContent) {
      const searchTerm = scheduleSearch.titleOrContent.toLowerCase();
      const titleMatch = event.title.toLowerCase().includes(searchTerm);
      const descriptionMatch =
        event.description &&
        event.description.toLowerCase().includes(searchTerm);
      if (!titleMatch && !descriptionMatch) return false;
    }

    return true;
  });

  // *[2_관리자 모드] 2.5_공휴일 데이터 변환* (DB에서 로드된 데이터 사용)
  const holidayEvents = [];
  const holidayDateSet = new Set(); // 중복 방지를 위한 Set

  // holidayData의 모든 년도 데이터를 순회
  Object.values(holidayData).forEach((yearHolidays) => {
    Object.entries(yearHolidays).forEach(([date, name]) => {
      // YYYY-MM-DD 형식만 처리 (MM-DD 형식 제외) 및 중복 방지
      if (date.includes('-') && date.split('-').length === 3 && !holidayDateSet.has(date)) {
        holidayDateSet.add(date);
        holidayEvents.push({
          id: `holiday-${date}`,
          title: name,
          date: date,
          type: '공휴일',
          description: `공휴일: ${name}`,
          isCustomHoliday: true, // 수정/삭제 가능하도록 플래그 유지
        });
      }
    });
  });

  // 공휴일 필터링
  const filteredHolidayEvents = holidayEvents.filter((event) => {
    if (scheduleSearch.year) {
      const eventYear = new Date(event.date).getFullYear().toString();
      if (!eventYear.includes(scheduleSearch.year)) return false;
    }

    if (scheduleSearch.month) {
      const eventMonth = (new Date(event.date).getMonth() + 1).toString();
      if (!eventMonth.includes(scheduleSearch.month)) return false;
    }

    if (scheduleSearch.type && event.type !== scheduleSearch.type) return false;

    if (scheduleSearch.titleOrContent) {
      const searchTerm = scheduleSearch.titleOrContent.toLowerCase();
      const titleMatch = event.title.toLowerCase().includes(searchTerm);
      const descriptionMatch =
        event.description &&
        event.description.toLowerCase().includes(searchTerm);
      if (!titleMatch && !descriptionMatch) return false;
    }

    return true;
  });

  return [...regularEvents, ...filteredHolidayEvents].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
};

// ============================================================
// [2_관리자 모드] 2.7_일정 관리 - UTILS
// ============================================================

/**
 * 공휴일 데이터 강제 새로고침 함수 생성
 * @param {Object} deps - 의존성 객체
 * @param {Object} deps.holidayService - 공휴일 서비스
 * @param {Function} deps.loadHolidayData - 공휴일 데이터 로드 함수
 * @param {number} deps.displayYear - 현재 표시 중인 연도
 * @returns {Function} 공휴일 강제 새로고침 함수
 */
export const createForceRefreshHolidays = (deps) => {
  const { holidayService, loadHolidayData, displayYear } = deps;

  return async () => {
    // 표시 중인 연도를 중심으로 ±1년 새로고침
    const targetYear = displayYear || new Date().getFullYear();
    const yearsToRefresh = [targetYear - 1, targetYear, targetYear + 1];

    try {

      // 캐시 초기화 및 새로운 데이터 로드
      const refreshPromises = yearsToRefresh.map(async (year) => {
        holidayService.clearCache(year);
        const holidays = await loadHolidayData(year);
        return { year, holidays };
      });

      await Promise.all(refreshPromises);

      return true;
    } catch (error) {
      console.error('❌ 공휴일 데이터 강제 새로고침 실패:', error);
      return false;
    }
  };
};

// ============================================================
// [2_관리자 모드] 2.7_일정 관리 - EXPORTS (update-only)
// ============================================================

/**
 * EXPORTS:
 *
 * [Constants]
 * - EVENT_TYPES: 이벤트 타입 목록
 * - EVENT_TYPE_COLORS: 이벤트 타입별 색상 맵핑
 *
 * [Hooks]
 * - useHolidayManagement: 공휴일 관리 Hook
 * - useScheduleManagement: 일정 관리 Hook
 *
 * [Services]
 * - getFilteredScheduleEvents: 일정 필터링 서비스
 *
 * [Utils]
 * - createForceRefreshHolidays: 공휴일 강제 새로고침 함수 생성
 */
