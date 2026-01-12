/**
 * [2_관리자 모드] 2.1_대시보드 통합 모듈
 * - Hook → Service → Util → Export
 * - UI 컴포넌트 제외, 지원 로직만 포함
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as CommonDownloadService from './common_common_downloadservice';
import {
  getDaysInMonth,
  timeToMinutes,
  categorizeWorkTime,
  EXCLUDE_EXTRA_RANKS,
  EXCLUDE_TIME,
  excludeBreakTimes,
  roundDownToHalfHour,
} from './common_common';
import { SafetyAccidentAPI } from '../../api/safety';
import { NotificationAPI } from '../../api/communication';

// ============================================================
// [2_관리자 모드] 2.1_대시보드 - HOOKS
// ============================================================

// *[2_관리자 모드] 2.1_대시보드 - 통계 관리*

/**
 * 대시보드 통계 데이터를 계산하고 관리하는 커스텀 훅
 * @param {Object} params - 파라미터 객체
 */
export const useDashboardStats = ({
  employees = [],
  dashboardDateFilter = 'today',
  dashboardSelectedDate = '',
  attendanceSheetData = {},
  getAttendanceForEmployee = () => ({ checkIn: '', checkOut: '' }),
  analyzeAttendanceStatusForDashboard = () => '결근',
  devLog = () => {},
  calculateAttendanceRate = () => 0,
  calculateLateRate = () => 0,
  calculateAbsentRate = () => 0,
  calculateTurnoverRate = () => 0,
  calculateAverageOvertimeHours = () => 0,
  calculateLeaveUsageRate = () => 0,
  calculateWeekly52HoursViolation = () => 0,
  calculateStressIndex = () => 0,
  leaveRequests = [],
  isHolidayDate = () => false,
} = {}) => {
  // [2_관리자 모드] 2.1_대시보드 - 통계 계산
  const calculateDashboardStats = useCallback(() => {
    devLog('🔍 getDashboardStatsByDateReal 호출됨');
    const stats = {
      present: 0,
      late: 0,
      absent: 0,
      leave: 0,
      nightPresent: 0,
      nightLate: 0,
      nightAbsent: 0,
      nightLeave: 0,
      totalDayShift: 0,
      totalNightShift: 0,
    };

    let targetDate, targetYesterday;

    if (dashboardDateFilter === 'today') {
      targetDate = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      targetYesterday = yesterday.toISOString().split('T')[0];
    } else {
      targetDate = dashboardSelectedDate;
      const selectedDate = new Date(dashboardSelectedDate);
      selectedDate.setDate(selectedDate.getDate() - 1);
      targetYesterday = selectedDate.toISOString().split('T')[0];
    }

    devLog('🔍 대상 날짜:', { targetDate, targetYesterday });
    devLog('🔍 총 직원 수:', employees.length);

    employees.forEach((emp) => {
      const workType = emp.workType || '주간';
      const leaveType = emp.leaveType || null;

      if (leaveType === '휴직') {
        return;
      }

      // 📌 휴일 체크: 휴일은 주간/야간 구분 없이 당일 데이터만 확인
      const targetDateObj = new Date(targetDate);
      const targetYear = targetDateObj.getFullYear();
      const targetMonth = targetDateObj.getMonth() + 1;
      const targetDay = targetDateObj.getDate();
      const dayOfWeek = targetDateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isPublicHoliday = isHolidayDate(targetYear, targetMonth, targetDay);
      const isHoliday = isWeekend || isPublicHoliday;

      let actualShift = null;
      let checkDate = targetDate;
      let checkDateObj = targetDateObj;
      let attendanceData = null;

      // 📌 휴일이면 시프트 판정 없이 당일 데이터만 확인 (주간으로 처리)
      if (isHoliday) {
        actualShift = '주간';
        attendanceData = getAttendanceForEmployee(
          emp.id,
          targetYear,
          targetMonth,
          targetDay
        );
      }
      // 📌 평일이면 시프트 판정 우선순위 적용 (사용자 기준)
      // 1순위: 출근시간으로 주간 또는 야간 판정 (workType 무관)
      // 2순위: 연차 내역 확인 (analyzeAttendanceStatusForDashboard에서 처리)
      // 3순위: WORK타입으로 판단
      else {
        const yesterdayObj = new Date(targetYesterday);

        // 우선순위 1-1: 전날 출근 데이터 확인 (모든 직원 대상, workType 무관)
        const yesterdayData = getAttendanceForEmployee(
          emp.id,
          yesterdayObj.getFullYear(),
          yesterdayObj.getMonth() + 1,
          yesterdayObj.getDate()
        );
        if (yesterdayData && yesterdayData.checkIn) {
          const checkInMinutes = timeToMinutes(yesterdayData.checkIn);
          // 전날 15:00 이후 출근 = 야간 근무 시작
          if (checkInMinutes >= 900 || checkInMinutes < 180) {
            actualShift = '야간';
            checkDate = targetYesterday;
            checkDateObj = yesterdayObj;
            attendanceData = yesterdayData;
          }
        }

        // 우선순위 1-2: 전날에 야간 출근이 없으면 당일 출근 확인
        if (!actualShift) {
          const todayData = getAttendanceForEmployee(
            emp.id,
            checkDateObj.getFullYear(),
            checkDateObj.getMonth() + 1,
            checkDateObj.getDate()
          );

          if (todayData && todayData.checkIn) {
            const checkInMinutes = timeToMinutes(todayData.checkIn);
            // 당일 03:00~15:00 출근 = 오늘 주간 근무
            if (checkInMinutes >= 180 && checkInMinutes < 900) {
              actualShift = '주간';
              attendanceData = todayData;
            }
            // 당일 15:00 이후 또는 03:00 이전 출근 = 오늘 야간 근무 시작
            else if (checkInMinutes >= 900 || checkInMinutes < 180) {
              actualShift = '야간';
              attendanceData = todayData;
            }
          }
        }

        // 우선순위 3: 출근시간이 없으면 WORK타입으로 판단
        if (!actualShift) {
          actualShift = workType;
          // workType이 야간이면 전날 데이터 확인
          if (actualShift === '야간' || actualShift === '주간/야간') {
            checkDate = targetYesterday;
            checkDateObj = yesterdayObj;
            attendanceData = getAttendanceForEmployee(
              emp.id,
              yesterdayObj.getFullYear(),
              yesterdayObj.getMonth() + 1,
              yesterdayObj.getDate()
            );
            // 시프터는 야간으로 간주
            if (actualShift === '주간/야간') {
              actualShift = '야간';
            }
          } else {
            // 주간이면 당일 데이터 확인
            attendanceData = getAttendanceForEmployee(
              emp.id,
              checkDateObj.getFullYear(),
              checkDateObj.getMonth() + 1,
              checkDateObj.getDate()
            );
          }
        }
      } // else (평일 시프트 판정 종료)

      // 4. 상태 분석
      let status = analyzeAttendanceStatusForDashboard(
        attendanceData,
        checkDateObj.getFullYear(),
        checkDateObj.getMonth() + 1,
        checkDateObj.getDate(),
        actualShift,
        leaveType,
        emp.id
      );

      if (status === null) {
        return; // 휴일 등으로 제외
      }

      // 5. 결근인 경우 attendance 배열 확인
      if (status === '결근') {
        const attendanceTarget = emp.attendance
          ? emp.attendance.find((att) => att.date === checkDate)
          : null;
        if (attendanceTarget) {
          status = attendanceTarget.status;
        }
      }

      devLog(
        `🔍 ${actualShift === '야간' ? '야간 ' : ''}${
          emp.name
        }: ${status} (workType: ${workType}, actualShift: ${actualShift})`
      );

      // 6. 판정된 실제 시프트에 따라 통계 집계 (중복 없음)
      if (actualShift === '주간') {
        stats.totalDayShift++;
        switch (status) {
          case '출근':
          case '근무중':
          case '조퇴':
          case '지각/조퇴':
            stats.present++;
            break;
          case '지각':
            stats.late++;
            break;
          case '결근':
            stats.absent++;
            break;
          case '연차':
            stats.leave++;
            break;
          case '휴일':
            stats.totalDayShift--; // 휴일은 카운트에서 제외
            break;
          default:
            devLog(`⚠️ 알 수 없는 상태: ${emp.name} - ${status}`);
            break;
        }
      } else {
        // 야간
        // 📌 야간은 전날 저녁 출근자만 카운트 (당일 저녁 출근자는 다음날 야간으로 분류)
        if (checkDate !== targetYesterday) {
          devLog(
            `⚠️ ${emp.name}: 당일(${checkDate}) 저녁 출근자는 다음날 야간으로 분류되므로 제외`
          );
          return;
        }

        stats.totalNightShift++;
        switch (status) {
          case '출근':
          case '근무중':
          case '조퇴':
          case '지각/조퇴':
            stats.nightPresent++;
            break;
          case '지각':
            stats.nightLate++;
            break;
          case '결근':
            stats.nightAbsent++;
            break;
          case '연차':
            stats.nightLeave++;
            break;
          case '휴일':
            stats.totalNightShift--; // 휴일은 카운트에서 제외
            break;
          default:
            devLog(`⚠️ 야간 알 수 없는 상태: ${emp.name} - ${status}`);
            break;
        }
      }
    });

    devLog('🔍 최종 통계:', stats);
    return stats;
  }, [
    employees,
    dashboardDateFilter,
    dashboardSelectedDate,
    getAttendanceForEmployee,
    analyzeAttendanceStatusForDashboard,
    devLog,
  ]);

  // [2_관리자 모드] 2.1_대시보드 - 통계 데이터 (useMemo)
  const dashboardStatsReal = useMemo(() => {
    return (
      calculateDashboardStats() || {
        present: 0,
        late: 0,
        absent: 0,
        leave: 0,
        nightPresent: 0,
        nightLate: 0,
        nightAbsent: 0,
        nightLeave: 0,
        totalDayShift: 0,
        totalNightShift: 0,
      }
    );
  }, [calculateDashboardStats]);

  // [2_관리자 모드] 2.1_대시보드 - 목표 통계
  const goalStats = useMemo(
    () => ({
      attendanceRate: calculateAttendanceRate(),
      lateRate: calculateLateRate(),
      absentRate: calculateAbsentRate(),
      turnoverRate: calculateTurnoverRate(),
    }),
    [
      attendanceSheetData,
      employees,
      calculateAttendanceRate,
      calculateLateRate,
      calculateAbsentRate,
      calculateTurnoverRate,
    ]
  );

  // [2_관리자 모드] 2.1_대시보드 - 워라밸 통계
  const workLifeBalanceStats = useMemo(
    () => ({
      averageOvertimeHours: calculateAverageOvertimeHours(),
      leaveUsageRate: calculateLeaveUsageRate(),
      weekly52HoursViolation: calculateWeekly52HoursViolation(),
      stressIndex: calculateStressIndex(),
    }),
    [
      attendanceSheetData,
      employees,
      leaveRequests,
      calculateAverageOvertimeHours,
      calculateLeaveUsageRate,
      calculateWeekly52HoursViolation,
      calculateStressIndex,
    ]
  );

  return {
    dashboardStatsReal,
    calculateDashboardStats,
    goalStats,
    workLifeBalanceStats,
  };
};

// ============================================================
// useSafetyManagement.js
// ============================================================

export const useSafetyManagement = (dependencies = {}) => {
  const {
    safetyAccidents = [],
    setSafetyAccidents = () => {},
    setRealtimeNotifications = () => {},
    setNotificationLogs = () => {},
    devLog = console.log,
  } = dependencies;

  // [2_관리자 모드] 2.1_안전관리 - 안전사고 데이터 저장 (DB 연동)
  const saveSafetyAccidents = useCallback(
    (accidents) => {
      // localStorage 제거 - DB만 사용
      setSafetyAccidents(accidents);
    },
    [setSafetyAccidents]
  );

  // [2_관리자 모드] 2.1_안전관리 - 오늘 안전사고 건수 조회
  const getTodaySafetyAccidents = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return safetyAccidents.filter((acc) => acc?.date === today).length;
  }, [safetyAccidents]);

  // [2_관리자 모드] 2.1_안전관리 - 이번 달 안전사고 건수 조회
  const getThisMonthSafetyAccidents = useCallback(() => {
    const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    return safetyAccidents.filter(
      (acc) =>
        acc?.date &&
        typeof acc.date === 'string' &&
        acc.date.startsWith(thisMonth)
    ).length;
  }, [safetyAccidents]);

  // [2_관리자 모드] 2.1_안전관리 - 올해 안전사고 건수 조회
  const getThisYearSafetyAccidents = useCallback(() => {
    const thisYear = new Date().getFullYear().toString();
    return safetyAccidents.filter(
      (acc) =>
        acc?.date &&
        typeof acc.date === 'string' &&
        acc.date.startsWith(thisYear)
    ).length;
  }, [safetyAccidents]);

  // [2_관리자 모드] 2.1_안전관리 - 무사고 일수 계산
  const getAccidentFreeDays = useCallback(() => {
    if (safetyAccidents.length === 0) return 365; // 기본값

    const lastAccidentDate = new Date(
      Math.max(...safetyAccidents.map((acc) => new Date(acc.date)))
    );
    const today = new Date();
    const diffTime = today - lastAccidentDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [safetyAccidents]);

  // [2_관리자 모드] 2.1_안전관리 - 무사고 달성 알림 확인 및 발송
  const checkAccidentFreeNotification = useCallback(() => {
    const accidentFreeDays = getAccidentFreeDays();

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
  }, [
    getAccidentFreeDays,
    setRealtimeNotifications,
    setNotificationLogs,
    devLog,
  ]);

  // [2_관리자 모드] 2.1_안전관리 - 안전사고 입력 및 알림 전송
  const handleSafetyAccidentInput = useCallback(
    async (date, description, severity) => {
      const now = new Date();

      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

      const newAccident = {
        date: date || new Date().toISOString().slice(0, 10),
        description,
        severity,
        createdAt: localDateTime,
        timestamp: now.toISOString(),
      };

      try {
        // DB에 저장
        const savedAccident = await SafetyAccidentAPI.create(newAccident);

        // MongoDB의 _id를 id로 매핑
        const mappedAccident = {
          ...savedAccident,
          id: savedAccident._id || savedAccident.id,
        };

        const updatedAccidents = [...safetyAccidents, mappedAccident];
        saveSafetyAccidents(updatedAccidents);

        const severityText =
          severity === '심각'
            ? '🚨 심각'
            : severity === '보통'
            ? '⚠️ 보통'
            : '⚠️ 경미';

        const priority =
          severity === '심각' ? 'high' : severity === '보통' ? 'medium' : 'low';

        const alertTitle = `${severityText} 안전사고 발생 알림`;
        const alertContent = `내용: ${description}  \n 심각도: ${severity}  \n 발생일: ${
          date || new Date().toISOString().slice(0, 10)
        }  \n 모든 직원들께서는 안전에 각별히 주의해 주시기 바랍니다.`;

        const utcCreatedAt = new Date().toISOString();

        // DB에 알림 로그 저장
        try {
          const notificationLogData = {
            notificationType: '시스템',
            title: alertTitle,
            content: alertContent,
            status: '진행중', // 직원들이 볼 수 있도록 '진행중' 상태로 저장
            startDate: date || new Date().toISOString().split('T')[0],
            endDate: date || new Date().toISOString().split('T')[0],
            repeatCycle: '즉시',
            recipients: { type: '전체', value: '전체직원' },
            priority: priority,
            // createdAt은 서버에서 자동 생성
          };

          await NotificationAPI.create(notificationLogData);
        } catch (error) {
          console.error('❌ 안전사고 알림 로그 DB 저장 실패:', error);
        }

        const newNotificationLog = {
          id: Date.now() + Math.random() + 1,
          type: '안전알림',
          title: alertTitle,
          recipients: '전체직원',
          content: alertContent,
          createdAt: new Date().toLocaleString('ko-KR'),
          completedAt: null,
          처리유형: '안전사고알림',
          발생일: date || new Date().toISOString().slice(0, 10),
          심각도: severity,
          사고내용: description,
          우선순위: priority,
        };
        setNotificationLogs((prev) => [newNotificationLog, ...prev]);

        const realtimeNotification = {
          id: Date.now() + Math.random(),
          title: alertTitle,
          content: alertContent,
          recipients: { type: '전체', value: '전체직원' },
          createdAt: utcCreatedAt,
          status: '진행중',
          priority: priority,
          type: '안전알림',
        };

        const isExpired5Days = (createdAt) => {
          const now = new Date();
          const created = new Date(createdAt);
          const diff = now - created;
          return diff > 5 * 24 * 60 * 60 * 1000;
        };

        if (!isExpired5Days(utcCreatedAt)) {
          setRealtimeNotifications((prev) => [realtimeNotification, ...prev]);
        }

        devLog('✅ 안전사고 등록 및 알림 전송 완료:', {
          timestamp: new Date().toISOString(),
          severity: severity,
          description: description,
          recipients: '전체직원',
          priority: priority,
        });

        return true;
      } catch (error) {
        console.error('❌ 안전사고 등록 실패:', error);
        alert('안전사고 등록 중 오류가 발생했습니다.');
        return false;
      }
    },
    [
      safetyAccidents,
      saveSafetyAccidents,
      setNotificationLogs,
      setRealtimeNotifications,
      devLog,
    ]
  );

  // [2_관리자 모드] 2.1_안전관리 - 안전사고 수정 시작
  const handleEditSafety = useCallback((accident, callbacks) => {
    const {
      setEditingAccidentId,
      setEditDate,
      setEditCreatedAt,
      setEditContent,
      setEditSeverity,
    } = callbacks;
    setEditingAccidentId(accident.id);
    setEditDate(accident.date || new Date().toISOString().slice(0, 10));
    setEditCreatedAt(
      accident.createdAt
        ? accident.createdAt.slice(0, 16)
        : new Date().toISOString().slice(0, 16)
    );
    setEditContent(accident.description || '');
    setEditSeverity(accident.severity || '경미');
  }, []);

  // [2_관리자 모드] 2.1_안전관리 - 안전사고 수정 저장
  const handleSaveAccidentEdit = useCallback(
    async (id, editData, callbacks) => {
      const { editDate, editCreatedAt, editContent, editSeverity } = editData;
      const {
        setEditingAccidentId,
        setEditDate,
        setEditCreatedAt,
        setEditContent,
        setEditSeverity,
      } = callbacks;

      try {
        const updateData = {
          date: editDate,
          createdAt: editCreatedAt,
          description: editContent.trim(),
          severity: editSeverity,
        };

        // DB 업데이트
        await SafetyAccidentAPI.update(id, updateData);

        // 로컬 state 업데이트
        const updatedAccidents = safetyAccidents.map((acc) =>
          acc.id === id || acc._id === id
            ? {
                ...acc,
                ...updateData,
              }
            : acc
        );
        saveSafetyAccidents(updatedAccidents);

        setEditingAccidentId(null);
        setEditDate('');
        setEditCreatedAt('');
        setEditContent('');
        setEditSeverity('경미');

        devLog('✅ 안전사고 수정 완료:', id);
      } catch (error) {
        console.error('❌ 안전사고 수정 실패:', error);
        alert('안전사고 수정 중 오류가 발생했습니다.');
      }
    },
    [safetyAccidents, saveSafetyAccidents, devLog]
  );

  // [2_관리자 모드] 2.1_안전관리 - 안전사고 수정 취소
  const handleCancelAccidentEdit = useCallback((callbacks) => {
    const {
      setEditingAccidentId,
      setEditDate,
      setEditCreatedAt,
      setEditContent,
      setEditSeverity,
    } = callbacks;
    setEditingAccidentId(null);
    setEditDate('');
    setEditCreatedAt('');
    setEditContent('');
    setEditSeverity('경미');
  }, []);

  // [2_관리자 모드] 2.1_안전관리 - 안전사고 삭제
  const handleDeleteSafety = useCallback(
    async (accident) => {
      if (window.confirm('이 안전사고 기록을 삭제하시겠습니까?')) {
        try {
          const accidentId = accident._id || accident.id;

          // DB에서 삭제
          await SafetyAccidentAPI.delete(accidentId);

          // 로컬 state 업데이트
          const updatedAccidents = safetyAccidents.filter(
            (acc) => acc.id !== accidentId && acc._id !== accidentId
          );
          saveSafetyAccidents(updatedAccidents);

          devLog('✅ 안전사고 삭제 완료:', accidentId);
        } catch (error) {
          console.error('❌ 안전사고 삭제 실패:', error);
          alert('안전사고 삭제 중 오류가 발생했습니다.');
        }
      }
    },
    [safetyAccidents, saveSafetyAccidents, devLog]
  );

  return {
    saveSafetyAccidents,
    getTodaySafetyAccidents,
    getThisMonthSafetyAccidents,
    getThisYearSafetyAccidents,
    getAccidentFreeDays,
    checkAccidentFreeNotification,
    handleSafetyAccidentInput,
    handleEditSafety,
    handleSaveAccidentEdit,
    handleCancelAccidentEdit,
    handleDeleteSafety,
  };
};

// ============================================================
// useDashboardActions.js
// ============================================================

/**
 * 대시보드 액션 Hook
 * - AI 추천 생성 및 다운로드
 * - 워라밸 데이터 조회
 * - 52시간 위반 알림
 * - 목표 데이터 조회
 */
export const useDashboardActions = ({
  employees,
  aiRecommendations,
  setAiRecommendations,
  setIsAnalyzing,
  isAnalyzing,
  aiRecommendationHistory,
  setAiRecommendationHistory,
  getAttendanceForEmployee,
  calcDailyWage,
  leaveRequests,
  send자동알림,
  devLog,
  getFilteredEmployees,
  analyzeAttendanceStatusForDashboard,
  getDaysInMonth,
  calculateMonthlyLeaveUsageRate,
  getUsedAnnualLeave,
  calculateAnnualLeave,
  categorizeWorkTime,
  isHolidayDate,
  getWorkTypeForDate,
  API_BASE_URL,
  aiPromptSettings,
  dashboardStats,
  suggestions,
  notices,
  admins,
  safetyAccidents = [],
  evaluations = [],
}) => {
  // *[2_관리자 모드] 2.1_대시보드 - AI 추천 생성*
  const generateAiRecommendations = useCallback(async () => {
    if (isAnalyzing) {
      devLog('이미 AI 분석 중입니다.');
      return;
    }

    try {
      setIsAnalyzing(true);
      devLog('🤖 AI 추천 생성 시작...');

      // 1. 회사 데이터 수집
      const companyData = {
        직원수: employees.length,
        출근현황: dashboardStats,
        연차신청: leaveRequests.length,
        건의사항: suggestions?.length || 0,
        공지사항: notices?.length || 0,
        관리자수: admins?.length || 0,
      };

      devLog('📊 회사 데이터:', companyData);

      // 2. AI 프롬프트 구성
      const systemPrompt =
        typeof aiPromptSettings === 'string'
          ? aiPromptSettings
          : aiPromptSettings?.dashboardRecommendation ||
            '회사 HR 데이터를 분석하여 실용적인 개선 방안을 제안해주세요.';

      const userPrompt = `
다음은 우리 회사의 현재 상황입니다:

📊 **인력 현황**
- 총 직원 수: ${companyData.직원수}명
- 관리자 수: ${companyData.관리자수}명

📋 **근태 현황** (오늘 기준)
- 출근: ${dashboardStats.present || 0}명
- 지각: ${dashboardStats.late || 0}명
- 결근: ${dashboardStats.absent || 0}명
- 연차: ${dashboardStats.leave || 0}명

📝 **업무 현황**
- 대기 중인 연차 신청: ${companyData.연차신청}건
- 접수된 건의사항: ${companyData.건의사항}건
- 게시된 공지사항: ${companyData.공지사항}건

위 데이터를 기반으로 회사의 HR 상태를 분석하여 **정확히 4가지 항목**을 다음 형식으로 제시해주세요:

[유형] 제목
내용 (1-2문장)

**유형은 반드시 다음 중 하나여야 합니다:**
- 칭찬: 긍정적인 측면, 잘하고 있는 부분
- 추천: 개선을 권장하는 사항, 더 나아질 수 있는 방안
- 주의: 주의가 필요한 경미한 문제점
- 위험: 즉시 조치가 필요한 심각한 문제점

**중요:**
- 반드시 4가지 항목을 제시해야 합니다.
- 각 항목은 "[유형] 제목" 형식으로 시작해야 합니다.
- 유형은 칭찬, 추천, 주의, 위험 중 하나만 사용하세요.
- 내용은 간결하게 1-2문장으로 작성하세요.
`;

      devLog('🔑 AI API 호출 준비...');

      // 3. AI API 호출 (로그 기록 포함)
      const startTime = Date.now();
      let aiLogData = {
        eventType: 'AI_QUERY',
        prompt: userPrompt,
        provider: '',
        model: '',
        success: false,
        errorMessage: null,
        durationMs: 0,
      };

      const response = await fetch(`${API_BASE_URL}/ai/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userPrompt,
          internalData: {},
          externalData: {
            systemPrompt: systemPrompt,
            user: { name: 'admin' },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API 호출 실패: ${response.status}`);
      }

      const data = await response.json();
      const endTime = Date.now();

      // AI 로그 데이터 업데이트
      aiLogData.provider = data.provider || 'unknown';
      aiLogData.model = data.model || 'unknown';
      aiLogData.response = data.response || '';
      aiLogData.success = true;
      aiLogData.durationMs = endTime - startTime;

      // AI 로그 저장
      try {
        await fetch(`${API_BASE_URL}/ai/logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(aiLogData),
        });
        devLog('✅ AI 로그 저장 완료');
      } catch (logError) {
        devLog('⚠️ AI 로그 저장 실패:', logError);
      }

      devLog('✅ AI API 응답:', data);

      // 4. 응답 파싱 및 저장
      const aiResponse =
        data.response || data.message || '응답을 받지 못했습니다.';

      const now = new Date();

      // AI 응답을 파싱하여 4가지 유형으로 분류
      const parsedRecommendations = [];
      const lines = aiResponse.split('\n').filter((line) => line.trim());

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // [유형] 제목 형식 찾기
        const typeMatch = line.match(/^\[(.+?)\]\s*(.+)$/);
        if (typeMatch) {
          const type = typeMatch[1].trim();
          const title = typeMatch[2].trim();

          // 다음 줄들을 내용으로 수집 (다음 [유형]이 나올 때까지)
          let description = '';
          let j = i + 1;
          while (j < lines.length && !lines[j].match(/^\[(.+?)\]/)) {
            description += lines[j].trim() + ' ';
            j++;
          }
          description = description.trim();

          // 유형을 색상으로 매핑
          const typeColorMap = {
            칭찬: 'green',
            추천: 'blue',
            주의: 'yellow',
            위험: 'red',
          };

          const color = typeColorMap[type] || 'gray';

          parsedRecommendations.push({
            type: type,
            color: color,
            title: title,
            description: description || '상세 내용이 없습니다.',
          });

          i = j - 1; // 내용을 읽은 만큼 인덱스 이동
        }
      }

      // 4개가 아니면 기본 메시지 추가
      while (parsedRecommendations.length < 4) {
        parsedRecommendations.push({
          type: '정보',
          color: 'gray',
          title: 'AI 분석 데이터 부족',
          description:
            '충분한 데이터를 수집하여 더 정확한 분석을 제공하겠습니다.',
        });
      }

      // 4개만 유지
      const finalRecommendations = parsedRecommendations
        .slice(0, 4)
        .map((r) => ({
          ...r,
          date: now.toLocaleDateString('ko-KR'),
          time: now.toLocaleTimeString('ko-KR'),
          timestamp: now.toISOString(),
        }));

      const recommendationData = {
        date: now.toLocaleDateString('ko-KR'),
        time: now.toLocaleTimeString('ko-KR'),
        title: '🤖 AI 분석 기반 개선 방안',
        content: aiResponse,
        recommendations: finalRecommendations.map((r) => ({
          type: r.type,
          title: r.title,
          description: r.description,
        })),
        timestamp: now.toISOString(),
      };

      // DB에 저장
      try {
        await fetch(`${API_BASE_URL}/ai/recommendations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recommendationData),
        });
        devLog('✅ AI 추천사항 DB 저장 완료');
      } catch (dbError) {
        devLog('⚠️ AI 추천사항 DB 저장 실패:', dbError);
      }

      // 프론트엔드에 표시할 데이터 (파싱된 4가지 항목)
      setAiRecommendations(finalRecommendations);

      // DB에서 최신 추천사항 히스토리 다시 불러오기
      try {
        const historyResponse = await fetch(
          `${API_BASE_URL}/ai/recommendations`
        );
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          setAiRecommendationHistory(
            historyData.slice(0, 10).map((item) => ({
              id: item._id || item.id,
              type: 'ai-analysis',
              title: item.title,
              content: item.content,
              date: item.date,
              time: item.time,
              createdAt: item.createdAt || item.timestamp,
              recommendations: item.recommendations,
            }))
          );
        }
      } catch (historyError) {
        devLog('⚠️ AI 추천사항 히스토리 불러오기 실패:', historyError);
      }

      devLog('✅ AI 추천 생성 완료');
    } catch (error) {
      devLog('❌ AI 추천 생성 실패:', error);

      // 에러 로그 저장
      try {
        await fetch(`${API_BASE_URL}/ai/logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'ERROR',
            prompt: '',
            provider: 'unknown',
            model: 'unknown',
            success: false,
            errorMessage: error.message,
            durationMs: 0,
          }),
        });
      } catch (logError) {
        devLog('⚠️ 에러 로그 저장 실패:', logError);
      }

      // 에러 메시지를 사용자에게 표시
      const errorRecommendation = {
        id: Date.now(),
        type: 'error',
        title: '❌ AI 분석 오류',
        content: `AI 분석 중 오류가 발생했습니다.\n\n오류 내용: ${error.message}\n\n시스템 관리 > 통합 AI 설정에서 API 키와 모델이 올바르게 설정되었는지 확인해주세요.`,
        createdAt: new Date().toISOString(),
      };

      setAiRecommendations([errorRecommendation]);
    } finally {
      setIsAnalyzing(false);
    }
  }, [
    isAnalyzing,
    setIsAnalyzing,
    setAiRecommendations,
    setAiRecommendationHistory,
    devLog,
    employees,
    dashboardStats,
    leaveRequests,
    suggestions,
    notices,
    admins,
    API_BASE_URL,
    aiPromptSettings,
  ]);

  // *[2_관리자 모드] 2.1_대시보드 - AI 히스토리 다운로드*
  const downloadAiHistory = useCallback(async () => {
    try {
      devLog('📥 AI 히스토리 다운로드 시작...');

      // 서버에서 CSV 다운로드
      const response = await fetch(`${API_BASE_URL}/ai/recommendations/export`);

      if (!response.ok) {
        throw new Error('다운로드 실패');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `AI추천사항_${new Date().toISOString().split('T')[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      devLog('✅ AI 히스토리 다운로드 완료');
    } catch (error) {
      devLog('❌ AI 히스토리 다운로드 실패:', error);
      alert('AI 히스토리 다운로드에 실패했습니다.');
    }
  }, [API_BASE_URL, devLog]);

  // *[2_관리자 모드] 2.1_대시보드 - 워라밸 데이터 조회 (연도별)*
  const getWorkLifeBalanceDataByYearWrapper = useCallback(
    (year) => {
      devLog(`📊 ${year}년 워라밸 데이터 조회...`);

      // export된 getWorkLifeBalanceDataByYearUtil 함수를 호출
      return getWorkLifeBalanceDataByYearUtil(
        year,
        employees,
        getDaysInMonth,
        getAttendanceForEmployee,
        calcDailyWage,
        calculateMonthlyLeaveUsageRate,
        getUsedAnnualLeave,
        calculateAnnualLeave,
        safetyAccidents,
        suggestions,
        evaluations,
        notices,
        leaveRequests
      );
    },
    [
      devLog,
      employees,
      getDaysInMonth,
      getAttendanceForEmployee,
      calcDailyWage,
      calculateMonthlyLeaveUsageRate,
      getUsedAnnualLeave,
      calculateAnnualLeave,
      safetyAccidents,
      suggestions,
      evaluations,
      notices,
      leaveRequests,
    ]
  );

  // *[2_관리자 모드] 2.1_대시보드 - 52시간 위반 상세 조회*
  const getViolationDetails = useCallback(
    (year, month) => {
      devLog(`📊 ${year}년 ${month}월 52시간 위반 상세 조회...`);

      // export된 getViolationDetailsUtil 함수를 호출
      return getViolationDetailsUtil(
        year,
        month,
        employees,
        getDaysInMonth,
        getAttendanceForEmployee,
        calcDailyWage
      );
    },
    [devLog, employees, getDaysInMonth, getAttendanceForEmployee, calcDailyWage]
  );

  // *[2_관리자 모드] 2.1_대시보드 - 52시간 위반 알림 전송*
  const send52HourViolationAlert = useCallback(
    async (violationData) => {
      try {
        devLog('📨 52시간 위반 알림 전송 시작...');

        if (!send자동알림) {
          devLog('⚠️ send자동알림 함수가 정의되지 않았습니다.');
          return;
        }

        // TODO: 실제 알림 전송 로직 구현 필요
        await send자동알림({
          title: '주 52시간 초과 근무 알림',
          content: `${violationData.length}명의 직원이 주 52시간을 초과하여 근무했습니다.`,
          type: 'warning',
        });

        devLog('✅ 52시간 위반 알림 전송 완료');
        alert('52시간 위반 알림이 전송되었습니다.');
      } catch (error) {
        devLog('❌ 52시간 위반 알림 전송 실패:', error);
        alert('알림 전송에 실패했습니다.');
      }
    },
    [send자동알림, devLog]
  );

  // *[2_관리자 모드] 2.1_대시보드 - 워라밸 상세 데이터 조회*
  const getWorkLifeDetailData = useCallback(
    (year, month, metric) => {
      devLog(`📊 워라밸 상세 데이터 조회 - ${metric}, ${month}월`);

      // export된 getWorkLifeDetailDataUtil 함수를 호출
      const result = getWorkLifeDetailDataUtil(
        year,
        month,
        metric,
        employees,
        getDaysInMonth,
        getAttendanceForEmployee,
        isHolidayDate,
        leaveRequests,
        calcDailyWage,
        calculateAnnualLeave,
        safetyAccidents,
        suggestions,
        evaluations,
        notices,
        getWorkTypeForDate
      );

      return result;
    },
    [
      devLog,
      employees,
      getDaysInMonth,
      getAttendanceForEmployee,
      isHolidayDate,
      leaveRequests,
      calcDailyWage,
      calculateAnnualLeave,
      safetyAccidents,
      suggestions,
      evaluations,
      notices,
      getWorkTypeForDate,
    ]
  );

  // *[2_관리자 모드] 2.1_대시보드 - 목표 데이터 조회 (연도별)*
  const getGoalDataByYear = useCallback(
    async (year) => {
      devLog(`🎯 ${year}년 목표 데이터 조회...`);

      // 해당 연도의 월별 근태 데이터를 모두 불러오기
      const monthlyAttendanceDataMap = {};
      const currentMonth = new Date().getMonth(); // 0-11
      const currentYear = new Date().getFullYear();

      const monthsToLoad = year === currentYear ? currentMonth + 1 : 12;

      try {
        // AttendanceAPI import가 필요하지만, 이 파일에서는 직접 import할 수 없으므로
        // api client를 동적으로 import하거나 BASE_URL을 사용
        const BASE_URL =
          process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

        const promises = [];
        for (let month = 1; month <= monthsToLoad; month++) {
          promises.push(
            fetch(`${BASE_URL}/attendance/monthly/${year}/${month}`)
              .then((res) => {
                if (!res.ok) {
                  throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }
                return res.json();
              })
              .then((result) => {
                // api client는 { success, data } 형식으로 반환
                const data = result.success
                  ? result.data
                  : Array.isArray(result)
                  ? result
                  : [];
                return { month, data };
              })
              .catch((err) => {
                console.error(`${year}년 ${month}월 데이터 로드 실패:`, err);
                return { month, data: [] };
              })
          );
        }

        const results = await Promise.all(promises);
        results.forEach(({ month, data }) => {
          monthlyAttendanceDataMap[month] = data || [];
        });
      } catch (error) {
        console.error('월별 데이터 로드 중 오류:', error);
      }

      // export된 getGoalDataByYearUtil 함수를 호출
      return getGoalDataByYearUtil(
        year,
        employees,
        getFilteredEmployees,
        getAttendanceForEmployee,
        analyzeAttendanceStatusForDashboard,
        isHolidayDate,
        leaveRequests,
        monthlyAttendanceDataMap
      );
    },
    [
      devLog,
      employees,
      getFilteredEmployees,
      getAttendanceForEmployee,
      analyzeAttendanceStatusForDashboard,
      isHolidayDate,
      leaveRequests,
    ]
  );

  // *[2_관리자 모드] 2.1_대시보드 - 목표 상세 데이터 조회*
  const getGoalDetailData = useCallback(
    (year, month, metric) => {
      devLog(`🎯 목표 상세 데이터 조회 - ${metric}, ${month}월`);

      // export된 getGoalDetailDataUtil 함수를 호출
      return getGoalDetailDataUtil(
        year,
        month,
        metric,
        employees,
        getAttendanceForEmployee,
        analyzeAttendanceStatusForDashboard,
        isHolidayDate,
        leaveRequests
      );
    },
    [
      devLog,
      employees,
      getAttendanceForEmployee,
      analyzeAttendanceStatusForDashboard,
      isHolidayDate,
      leaveRequests,
    ]
  );

  // *[2_관리자 모드] 2.1_대시보드 - AI 추천사항 히스토리 초기 로딩*
  useEffect(() => {
    const loadAiRecommendationHistory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/ai/recommendations`);
        if (response.ok) {
          const historyData = await response.json();
          setAiRecommendationHistory(
            historyData.map((item) => ({
              id: item._id || item.id,
              type: 'ai-analysis',
              title: item.title,
              content: item.content,
              createdAt: item.createdAt || item.timestamp,
              recommendations: item.recommendations,
            }))
          );
          devLog('✅ AI 추천사항 히스토리 로드 완료:', historyData.length);
        }
      } catch (error) {
        devLog('⚠️ AI 추천사항 히스토리 로드 실패:', error);
      }
    };

    loadAiRecommendationHistory();
  }, [API_BASE_URL, setAiRecommendationHistory, devLog]);

  return {
    generateAiRecommendations,
    downloadAiHistory,
    getWorkLifeBalanceDataByYear: getWorkLifeBalanceDataByYearWrapper,
    getViolationDetails,
    send52HourViolationAlert,
    getWorkLifeDetailData,
    getGoalDataByYear,
    getGoalDetailData,
  };
};

// ============================================================
// useDashboardCalculations.js
// ============================================================

/**
 * 대시보드 계산 Hook
 * - 출근율, 지각율, 결근율 계산
 * - 이직률, 초과근무시간 계산
 * - 연차 사용률, 주 52시간 위반율 계산
 * - 스트레스 지수 계산
 */
export const useDashboardCalculations = ({
  employees,
  isHolidayDate,
  getAttendanceForEmployee,
  analyzeAttendanceStatusForDashboard,
  calculateMonthlyStats,
  leaveRequests,
  getMonthlyAnnualLeave,
  calcDailyWage,
  getUsedAnnualLeave,
  calculateAnnualLeave,
  safetyAccidents = [],
  suggestions = [],
  evaluations = [],
  notices = [],
}) => {
  // *[1_공통] 필터링된 직원 목록 조회*
  const getFilteredEmployees = (emp, m) =>
    emp.filter((e) => {
      const excluded = ['이철균', '이현주'].includes(e.name);
      const resigned =
        e.status === '퇴사' && new Date(e.leaveDate).getMonth() === m;
      return !excluded && (!resigned || e.status !== '퇴사');
    });

  // *[2_관리자 모드] 2.1_대시보드 - 월별 출근율 계산*
  const calculateAttendanceRate = () => {
    return calculateAttendanceRateUtil({
      employees,
      getFilteredEmployees,
      isHolidayDate,
      getAttendanceForEmployee,
      analyzeAttendanceStatusForDashboard,
      leaveRequests,
    });
  };

  // *[2_관리자 모드] 2.1_대시보드 - 월별 지각율 계산*
  const calculateLateRate = () => {
    return calculateLateRateUtil({
      employees,
      getFilteredEmployees,
      isHolidayDate,
      getAttendanceForEmployee,
      analyzeAttendanceStatusForDashboard,
      leaveRequests,
    });
  };

  // *[2_관리자 모드] 2.1_대시보드 - 월별 결근율 계산*
  const calculateAbsentRate = () => {
    return calculateAbsentRateUtil({
      employees,
      getFilteredEmployees,
      isHolidayDate,
      getAttendanceForEmployee,
      analyzeAttendanceStatusForDashboard,
      leaveRequests,
    });
  };

  // *[2_관리자 모드] 2.1_대시보드 - 월별 이직률 계산*
  const calculateTurnoverRate = () => {
    return calculateTurnoverRateUtil({ employees, getFilteredEmployees });
  };

  // *[2_관리자 모드] 2.1_대시보드 - 평균 초과근무시간 계산*
  const calculateAverageOvertimeHours = () => {
    return calculateAverageOvertimeHoursUtil({
      employees,
      getAttendanceForEmployee,
      calcDailyWage,
    });
  };

  // *[2_관리자 모드] 2.1_대시보드 - 연차 사용률 계산*
  const calculateLeaveUsageRate = () => {
    return calculateLeaveUsageRateUtil({
      calculateMonthlyLeaveUsageRate,
    });
  };

  // *[2_관리자 모드] 2.1_대시보드 - 월별 연차 사용률 계산*
  const calculateMonthlyLeaveUsageRate = (targetYear, targetMonth) => {
    return calculateMonthlyLeaveUsageRateUtil({
      targetYear,
      targetMonth,
      employees,
      leaveRequests,
      calculateAnnualLeave,
    });
  };

  // *[2_관리자 모드] 2.1_대시보드 - 주 52시간 위반율 계산*
  const calculateWeekly52HoursViolation = () => {
    return calculateWeekly52HoursViolationUtil({
      employees,
      getAttendanceForEmployee,
      calcDailyWage,
    });
  };

  // *[2_관리자 모드] 2.1_대시보드 - 스트레스 지수 계산*
  const calculateStressIndex = () => {
    return calculateStressIndexUtil({
      employees,
      getAttendanceForEmployee,
      calcDailyWage,
      getUsedAnnualLeave,
      calculateAnnualLeave,
      safetyAccidents,
      suggestions,
      evaluations,
      notices,
      leaveRequests,
    });
  };

  return {
    getFilteredEmployees,
    calculateAttendanceRate,
    calculateLateRate,
    calculateAbsentRate,
    calculateTurnoverRate,
    calculateAverageOvertimeHours,
    calculateLeaveUsageRate,
    calculateMonthlyLeaveUsageRate,
    calculateWeekly52HoursViolation,
    calculateStressIndex,
  };
};

// ============================================================
// useDashboardAttendance.js
// ============================================================

/**
 * 대시보드 출근 상태 관리 Hook
 * - 출근 상태별 직원 목록 조회
 * - 주간/야간 출근 상태 클릭 처리
 * - 출근 리스트 정렬 및 다운로드
 * - 날짜 변경 시 자동 갱신
 */
export const useDashboardAttendance = ({
  employees,
  dashboardDateFilter,
  dashboardSelectedDate,
  getAttendanceForEmployee,
  analyzeAttendanceStatusForDashboard,
  attendanceRecords,
  attendanceSheetData,
  devLog,
  isHolidayDate,
}) => {
  // *[2_관리자 모드] 2.1_대시보드 - 출근 리스트 STATE*
  const [showEmployeeListPopup, setShowEmployeeListPopup] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedStatusEmployees, setSelectedStatusEmployees] = useState([]);
  const [selectedStatusDate, setSelectedStatusDate] = useState('');
  const [attendanceListSortField, setAttendanceListSortField] =
    useState('name');
  const [attendanceListSortOrder, setAttendanceListSortOrder] = useState('asc');

  // *[2_관리자 모드] 2.1_대시보드 - 출근 상태별 직원 목록 조회*
  const getEmployeesByStatusLocal = (status, isNightShift = false) => {
    return getEmployeesByStatus({
      employees,
      status,
      isNightShift,
      dashboardDateFilter,
      dashboardSelectedDate,
      getAttendanceForEmployee,
      analyzeAttendanceStatusForDashboard,
      devLog,
      isHolidayDate,
    });
  };

  // *[2_관리자 모드] 2.1_대시보드 - 주간별 출근 팝업 리스트 조회*
  const getPopupList = (type) => {
    if (!attendanceRecords?.length) return [];
    const s = new Date();
    s.setDate(s.getDate() - s.getDay() + 1);
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    return attendanceRecords.filter((v) => {
      const d = new Date(v.date);
      return d >= s && d <= e && (type === '야간' ? v.nightWork : true);
    });
  };

  // *[2_관리자 모드] 2.1_대시보드 - 주간 출근 상태 클릭 처리*
  const handleStatusClick = (status) => {
    const targetDate =
      dashboardDateFilter === 'today'
        ? new Date().toISOString().split('T')[0]
        : dashboardSelectedDate;
    devLog(
      `🔍 주간 ${status} 클릭 - 날짜: ${
        dashboardDateFilter === 'today' ? '오늘' : dashboardSelectedDate
      }`
    );
    const employeeList = getEmployeesByStatusLocal(status, false); // 주간 근무자만
    devLog(`🔍 검색된 주간 ${status} 직원:`, employeeList);
    setSelectedStatusEmployees(employeeList);
    setSelectedStatus(`주간 ${status}`);
    setSelectedStatusDate(targetDate);

    // 출근/지각: 출근시간 오름차순, 결근/연차: 사번 오름차순
    if (status === '출근' || status === '지각') {
      setAttendanceListSortField('checkIn');
      setAttendanceListSortOrder('asc');
    } else if (status === '결근' || status === '연차') {
      setAttendanceListSortField('id');
      setAttendanceListSortOrder('asc');
    } else {
      setAttendanceListSortField('');
      setAttendanceListSortOrder('asc');
    }

    setShowEmployeeListPopup(true);
  };

  // *[2_관리자 모드] 2.1_대시보드 - 야간 출근 상태 클릭 처리*
  const handleNightStatusClick = (status) => {
    const targetDate =
      dashboardDateFilter === 'today'
        ? (() => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            return yesterday.toISOString().split('T')[0];
          })()
        : (() => {
            const selectedDate = new Date(dashboardSelectedDate);
            selectedDate.setDate(selectedDate.getDate() - 1);
            return selectedDate.toISOString().split('T')[0];
          })();
    devLog(
      `🔍 야간 ${status} 클릭 - 날짜: ${
        dashboardDateFilter === 'today' ? '오늘' : dashboardSelectedDate
      }`
    );
    const employeeList = getEmployeesByStatusLocal(status, true); // 야간 근무자만
    devLog(`🔍 검색된 야간 ${status} 직원:`, employeeList);
    setSelectedStatusEmployees(employeeList);
    setSelectedStatus(`야간 ${status}`);
    setSelectedStatusDate(targetDate);

    // 출근/지각: 출근시간 오름차순, 결근/연차: 사번 오름차순
    if (status === '출근' || status === '지각') {
      setAttendanceListSortField('checkIn');
      setAttendanceListSortOrder('asc');
    } else if (status === '결근' || status === '연차') {
      setAttendanceListSortField('id');
      setAttendanceListSortOrder('asc');
    } else {
      setAttendanceListSortField('');
      setAttendanceListSortOrder('asc');
    }

    setShowEmployeeListPopup(true);
  };

  // *[2_관리자 모드] 2.1_대시보드 - 출근 리스트 정렬 처리*
  const handleAttendanceListSort = (field) => {
    if (attendanceListSortField === field) {
      setAttendanceListSortOrder(
        attendanceListSortOrder === 'asc' ? 'desc' : 'asc'
      );
    } else {
      setAttendanceListSortField(field);
      setAttendanceListSortOrder('asc');
    }
  };

  // *[2_관리자 모드] 2.1_대시보드 - 정렬된 출근 직원 목록 반환*
  const getSortedAttendanceEmployeesLocal = () => {
    return getSortedAttendanceEmployees({
      selectedStatusEmployees,
      attendanceListSortField,
      attendanceListSortOrder,
    });
  };

  // *[2_관리자 모드] 2.1_대시보드 - 출근 리스트 다운로드*
  const handleDownloadAttendanceList = () => {
    const sortedEmployees = getSortedAttendanceEmployeesLocal();
    CommonDownloadService.handleDownloadAttendanceList(
      sortedEmployees,
      selectedStatus
    );
  };

  // *[2_관리자 모드] 2.1_대시보드 - 날짜 변경 시 직원 목록 자동 갱신*
  useEffect(() => {
    if (showEmployeeListPopup && selectedStatus) {
      devLog(`🔄 날짜 변경 감지 - ${selectedStatus} 리스트 자동 갱신`);

      const isNightShift = selectedStatus.includes('야간');
      const statusType = selectedStatus
        .replace('주간 ', '')
        .replace('야간 ', '');

      const updatedEmployeeList = getEmployeesByStatus({
        employees,
        status: statusType,
        isNightShift,
        dashboardDateFilter,
        dashboardSelectedDate,
        getAttendanceForEmployee,
        analyzeAttendanceStatusForDashboard,
        devLog,
      });

      devLog(
        `🔄 갱신된 ${selectedStatus} 리스트 (${updatedEmployeeList.length}명):`,
        updatedEmployeeList
      );
      setSelectedStatusEmployees(updatedEmployeeList);
    }
  }, [
    dashboardDateFilter,
    dashboardSelectedDate,
    attendanceSheetData,
    showEmployeeListPopup,
    selectedStatus,
    employees,
  ]);

  return {
    showEmployeeListPopup,
    setShowEmployeeListPopup,
    selectedStatus,
    setSelectedStatus,
    selectedStatusEmployees,
    setSelectedStatusEmployees,
    selectedStatusDate,
    setSelectedStatusDate,
    attendanceListSortField,
    setAttendanceListSortField,
    attendanceListSortOrder,
    setAttendanceListSortOrder,
    getEmployeesByStatus: getEmployeesByStatusLocal,
    getPopupList,
    handleStatusClick,
    handleNightStatusClick,
    handleAttendanceListSort,
    getSortedAttendanceEmployees: getSortedAttendanceEmployeesLocal,
    handleDownloadAttendanceList,
  };
};

// ============================================================
// [2_관리자 모드] 2.1_대시보드 - UTILS
// ============================================================

// *[2_관리자 모드] 분석/통계 서비스*

/**
 * 월별 출근율 계산
 * @param {Array} employees - 직원 목록
 * @param {Function} getAttendanceForEmployee - 출근 데이터 조회 함수
 * @param {Function} analyzeAttendanceStatus - 출근 상태 분석 함수
 * @returns {number} 출근율 (0-100)
 */
export const calculateMonthlyAttendanceRate = (
  employees,
  getAttendanceForEmployee,
  analyzeAttendanceStatus
) => {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  let totalRecords = 0;
  let presentCount = 0;

  employees.forEach((emp) => {
    for (let day = 1; day <= daysInMonth; day++) {
      const attendanceData = getAttendanceForEmployee(
        emp.id,
        currentYear,
        currentMonth,
        day
      );
      if (
        attendanceData &&
        (attendanceData.checkIn || attendanceData.checkOut)
      ) {
        totalRecords++;
        const status = analyzeAttendanceStatus(
          attendanceData,
          currentYear,
          currentMonth,
          day,
          emp.workType || '주간'
        );
        if (status === '출근') {
          presentCount++;
        }
      }
    }
  });

  return totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;
};

/**
 * 회사 전체 통계 계산
 * @param {Array} employees - 직원 목록
 * @param {Array} leaveRequests - 연차 신청 목록
 * @param {Array} evaluations - 평가 목록
 * @param {Function} getAttendanceForEmployee - 출근 데이터 조회 함수
 * @param {Function} analyzeAttendanceStatus - 출근 상태 분석 함수
 * @returns {Object} 회사 통계 데이터
 */
export const calculateCompanyStats = (
  employees,
  leaveRequests,
  evaluations,
  getAttendanceForEmployee,
  analyzeAttendanceStatus
) => {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const monthlyAttendance = [];

  employees.forEach((emp) => {
    for (let day = 1; day <= daysInMonth; day++) {
      const attendanceData = getAttendanceForEmployee(
        emp.id,
        currentYear,
        currentMonth,
        day
      );
      if (
        attendanceData &&
        (attendanceData.checkIn || attendanceData.checkOut)
      ) {
        const status = analyzeAttendanceStatus(
          attendanceData,
          currentYear,
          currentMonth,
          day,
          emp.workType || '주간'
        );
        monthlyAttendance.push({
          employeeId: emp.id,
          status: status,
          date: `${currentYear}-${String(currentMonth).padStart(
            2,
            '0'
          )}-${String(day).padStart(2, '0')}`,
        });
      }
    }
  });

  const monthlyLeaves = leaveRequests.filter((req) => {
    const reqDate = new Date(req.startDate);
    return (
      reqDate.getMonth() + 1 === currentMonth &&
      reqDate.getFullYear() === currentYear
    );
  });

  const attendanceRate = calculateMonthlyAttendanceRate(
    employees,
    getAttendanceForEmployee,
    analyzeAttendanceStatus
  );

  return {
    attendance: {
      total: monthlyAttendance.length,
      present: monthlyAttendance.filter((a) => a.status === '출근').length,
      absent: monthlyAttendance.filter((a) => a.status === '결근').length,
      late: monthlyAttendance.filter((a) => a.status === '지각').length,
      rate: attendanceRate,
    },
    leaves: {
      total: monthlyLeaves.length,
      pending: monthlyLeaves.filter((l) => l.status === 'pending').length,
      approved: monthlyLeaves.filter((l) => l.status === 'approved').length,
      rejected: monthlyLeaves.filter((l) => l.status === 'rejected').length,
    },
    department: {
      distribution: employees.reduce((acc, emp) => {
        acc[emp.department] = (acc[emp.department] || 0) + 1;
        return acc;
      }, {}),
      totalDepartments: [...new Set(employees.map((emp) => emp.department))]
        .length,
    },
    evaluation: {
      completed: evaluations.filter((e) => e.status === 'completed').length,
      pending: evaluations.filter((e) => e.status === 'pending').length,
      total: evaluations.length,
    },
  };
};

// [2_관리자 모드] 2.1_대시보드 - 출근 상태별 직원 조회
/**
 * 출근 상태별 직원 목록 조회
 * @param {Object} params - 매개변수
 * @param {Array} params.employees - 직원 목록
 * @param {string} params.status - 조회할 상태 ('출근', '지각', '조퇴', '출근')
 * @param {boolean} params.isNightShift - 야간 근무 여부
 * @param {string} params.dashboardDateFilter - 날짜 필터 ('today' or custom)
 * @param {string} params.dashboardSelectedDate - 선택된 날짜
 * @param {Function} params.getAttendanceForEmployee - 출근 데이터 조회 함수
 * @param {Function} params.analyzeAttendanceStatusForDashboard - 출근 상태 분석 함수
 * @param {Function} params.devLog - 개발 로그 함수
 * @returns {Array} 필터링된 직원 목록
 */
export const getEmployeesByStatus = ({
  employees,
  status,
  isNightShift = false,
  dashboardDateFilter,
  dashboardSelectedDate,
  getAttendanceForEmployee,
  analyzeAttendanceStatusForDashboard,
  devLog = console.log,
  isHolidayDate = () => false,
}) => {
  let targetDate;
  if (dashboardDateFilter === 'today') {
    targetDate = new Date().toISOString().split('T')[0];
  } else {
    targetDate = dashboardSelectedDate;
  }

  devLog(
    `=
 ${
   isNightShift ? '야간' : '주간'
 } ${status} 상태 직원 검색 - 대상날짜: ${targetDate}`
  );

  return employees
    .filter((emp) => {
      const workType = emp.workType || '주간';
      const leaveType = emp.leaveType || null;

      if (leaveType === '휴직') return false;

      // 📌 휴일 체크: 휴일은 주간/야간 구분 없이 당일 데이터만 확인
      const dateObj = new Date(targetDate);
      const targetYear = dateObj.getFullYear();
      const targetMonth = dateObj.getMonth() + 1;
      const targetDay = dateObj.getDate();
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isPublicHoliday = isHolidayDate(targetYear, targetMonth, targetDay);
      const isHoliday = isWeekend || isPublicHoliday;

      let actualShift = null;
      let checkDate = targetDate;
      let attendanceData = null;

      const yesterday = new Date(targetDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // 📌 휴일이면 시프트 판정 없이 당일 데이터만 확인 (주간으로 처리)
      if (isHoliday) {
        actualShift = '주간';
        if (typeof getAttendanceForEmployee === 'function') {
          attendanceData = getAttendanceForEmployee(
            emp.id,
            targetYear,
            targetMonth,
            targetDay
          );
        }
      }
      // 📌 평일이면 시프트 판정 우선순위 적용 (사용자 기준)
      // 1순위: 출근시간으로 주간 또는 야간 판정 (workType 무관)
      // 2순위: 연차 내역 확인 (analyzeAttendanceStatusForDashboard에서 처리)
      // 3순위: WORK타입으로 판단
      else {
        // 우선순위 1-1: 전날 출근 데이터 확인 (모든 직원 대상, workType 무관)
        if (typeof getAttendanceForEmployee === 'function') {
          const yesterdayData = getAttendanceForEmployee(
            emp.id,
            yesterday.getFullYear(),
            yesterday.getMonth() + 1,
            yesterday.getDate()
          );
          if (yesterdayData && yesterdayData.checkIn) {
            const checkInMinutes = timeToMinutes(yesterdayData.checkIn);
            // 전날 15:00 이후 출근 = 야간 근무 시작
            if (checkInMinutes >= 900 || checkInMinutes < 180) {
              actualShift = '야간';
              checkDate = yesterdayStr;
              attendanceData = yesterdayData;
            }
          }
        }
      }

      // 우선순위 2: 전날에 야간 출근이 없으면 당일 출근 확인
      if (!actualShift && typeof getAttendanceForEmployee === 'function') {
        const todayData = getAttendanceForEmployee(
          emp.id,
          dateObj.getFullYear(),
          dateObj.getMonth() + 1,
          dateObj.getDate()
        );

        if (todayData && todayData.checkIn) {
          const checkInMinutes = timeToMinutes(todayData.checkIn);
          // 당일 03:00~15:00 출근 = 오늘 주간 근무
          if (checkInMinutes >= 180 && checkInMinutes < 900) {
            actualShift = '주간';
            checkDate = targetDate;
            attendanceData = todayData;
          }
          // 당일 15:00 이후 또는 03:00 이전 출근 = 오늘 야간 근무 시작
          else if (checkInMinutes >= 900 || checkInMinutes < 180) {
            actualShift = '야간';
            checkDate = targetDate;
            attendanceData = todayData;
          }
        }
      }

      // 우선순위 3: workType fallback
      if (!actualShift) {
        actualShift = workType;
        // workType이 야간이면 전날 데이터 확인
        if (actualShift === '야간' || actualShift === '주간/야간') {
          checkDate = yesterdayStr;
          if (typeof getAttendanceForEmployee === 'function') {
            attendanceData = getAttendanceForEmployee(
              emp.id,
              yesterday.getFullYear(),
              yesterday.getMonth() + 1,
              yesterday.getDate()
            );
          }

          // ✅ 전날 출근이 주간 시간대면 야간 근무가 아니므로 제외
          if (attendanceData && attendanceData.checkIn) {
            const checkInMinutes = timeToMinutes(attendanceData.checkIn);
            // 주간 시간대(03:00~15:00) 출근이면 야간이 아님
            if (checkInMinutes >= 180 && checkInMinutes < 900) {
              return false; // 야간 필터에서 제외
            }
          }

          // 시프터는 야간으로 간주
          if (actualShift === '주간/야간') {
            actualShift = '야간';
          }
        } else {
          // 주간이면 당일 데이터 확인
          if (typeof getAttendanceForEmployee === 'function') {
            attendanceData = getAttendanceForEmployee(
              emp.id,
              dateObj.getFullYear(),
              dateObj.getMonth() + 1,
              dateObj.getDate()
            );
          }
        }
      }

      // 실제 시프트가 요청한 시프트와 다르면 제외
      if (isNightShift && actualShift !== '야간') return false;
      if (!isNightShift && actualShift !== '주간') return false;

      let empStatus = '결근';

      if (
        attendanceData &&
        typeof analyzeAttendanceStatusForDashboard === 'function'
      ) {
        const dateObj = new Date(checkDate);
        empStatus = analyzeAttendanceStatusForDashboard(
          attendanceData,
          dateObj.getFullYear(),
          dateObj.getMonth() + 1,
          dateObj.getDate(),
          actualShift, // 판정된 실제 시프트 전달
          leaveType,
          emp.id
        );

        if (empStatus === null) {
          return false;
        }
      } else if (
        attendanceData &&
        (attendanceData.checkIn || attendanceData.checkOut)
      ) {
        empStatus = '출근';
      }

      if (empStatus === '결근') {
        const attendanceTarget = emp.attendance
          ? emp.attendance.find((att) => att.date === checkDate)
          : null;
        if (attendanceTarget) {
          empStatus = attendanceTarget.status;
        }
      }

      devLog(
        `=
 ${emp.name} (workType: ${workType}, actualShift: ${actualShift}): ${empStatus} (날짜: ${checkDate})`
      );

      if (empStatus === '휴일') {
        return false;
      }

      switch (status) {
        case '출근':
          return (
            empStatus === '출근' ||
            empStatus === '근무중' ||
            empStatus === '조퇴' ||
            empStatus === '지각/조퇴'
          );
        case '지각':
          return empStatus === '지각';
        case '연차':
          return empStatus === '연차';
        case '결근':
          return empStatus === '결근';
        default:
          return false;
      }
    })
    .map((emp) => {
      const workType = emp.workType || '주간';

      // 📌 시프트 판정 우선순위 (map에서도 filter와 동일하게)
      // 1순위: 출근시간으로 주간 또는 야간 판정 (workType 무관)
      // 2순위: 연차 내역 확인 (analyzeAttendanceStatusForDashboard에서 처리)
      // 3순위: WORK타입으로 판단
      let actualShift = null;
      let checkDate = targetDate;
      let attendanceData = null;

      const dateObj = new Date(targetDate);
      const yesterday = new Date(targetDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // 📌 휴일 체크 (map에서도 filter와 동일)
      const dayOfWeek = dateObj.getDay();
      const isHoliday =
        dayOfWeek === 0 ||
        dayOfWeek === 6 ||
        (typeof isHolidayDate === 'function' && isHolidayDate(targetDate));

      // 📌 휴일이면 시프트 판정 없이 주간으로 설정하고 당일 데이터 확인
      if (isHoliday) {
        actualShift = '주간';
        if (typeof getAttendanceForEmployee === 'function') {
          attendanceData = getAttendanceForEmployee(
            emp.id,
            dateObj.getFullYear(),
            dateObj.getMonth() + 1,
            dateObj.getDate()
          );
        }
      }
      // 📌 평일이면 시프트 판정 우선순위 적용 (사용자 기준)
      else {
        // 우선순위 1-1: 전날 출근 데이터 확인 (모든 직원 대상, workType 무관)
        if (typeof getAttendanceForEmployee === 'function') {
          const yesterdayData = getAttendanceForEmployee(
            emp.id,
            yesterday.getFullYear(),
            yesterday.getMonth() + 1,
            yesterday.getDate()
          );
          if (yesterdayData && yesterdayData.checkIn) {
            const checkInMinutes = timeToMinutes(yesterdayData.checkIn);
            // 전날 15:00 이후 출근 = 야간 근무 시작
            if (checkInMinutes >= 900 || checkInMinutes < 180) {
              actualShift = '야간';
              checkDate = yesterdayStr;
              attendanceData = yesterdayData;
            }
          }
        }

        // 우선순위 2: 전날에 야간 출근이 없으면 당일 출근 확인
        if (!actualShift && typeof getAttendanceForEmployee === 'function') {
          const todayData = getAttendanceForEmployee(
            emp.id,
            dateObj.getFullYear(),
            dateObj.getMonth() + 1,
            dateObj.getDate()
          );

          if (todayData && todayData.checkIn) {
            const checkInMinutes = timeToMinutes(todayData.checkIn);
            // 당일 03:00~15:00 출근 = 오늘 주간 근무
            if (checkInMinutes >= 180 && checkInMinutes < 900) {
              actualShift = '주간';
              checkDate = targetDate;
              attendanceData = todayData;
            }
            // 당일 15:00 이후 또는 03:00 이전 출근 = 오늘 야간 근무 시작
            else if (checkInMinutes >= 900 || checkInMinutes < 180) {
              actualShift = '야간';
              checkDate = targetDate;
              attendanceData = todayData;
            }
          }
        }

        // 우선순위 3: workType fallback
        if (!actualShift) {
          actualShift = workType;
          // workType이 야간이면 전날 데이터 확인
          if (actualShift === '야간' || actualShift === '주간/야간') {
            checkDate = yesterdayStr;
            if (typeof getAttendanceForEmployee === 'function') {
              attendanceData = getAttendanceForEmployee(
                emp.id,
                yesterday.getFullYear(),
                yesterday.getMonth() + 1,
                yesterday.getDate()
              );
            }

            // ✅ 전날 출근이 주간 시간대면 야간 근무가 아니므로 제외
            if (attendanceData && attendanceData.checkIn) {
              const checkInMinutes = timeToMinutes(attendanceData.checkIn);
              // 주간 시간대(03:00~15:00) 출근이면 야간이 아님
              if (checkInMinutes >= 180 && checkInMinutes < 900) {
                return null; // 야간이 아니므로 제외 (map에서는 null 반환)
              }
            }

            // 시프터는 야간으로 간주
            if (actualShift === '주간/야간') {
              actualShift = '야간';
            }
          } else {
            // 주간이면 당일 데이터 확인
            if (typeof getAttendanceForEmployee === 'function') {
              attendanceData = getAttendanceForEmployee(
                emp.id,
                dateObj.getFullYear(),
                dateObj.getMonth() + 1,
                dateObj.getDate()
              );
            }
          }
        }
      }

      let checkInTime = '';
      let checkOutTime = '';

      if (attendanceData) {
        checkInTime = attendanceData.checkIn || '';
        checkOutTime = attendanceData.checkOut || '';
      }

      return {
        id: emp.id,
        name: emp.name,
        department: emp.department,
        position: emp.position,
        workType: actualShift, // 실제 시프트 저장
        leaveType: emp.leaveType || '-',
        time: checkInTime,
        checkIn: checkInTime,
        checkOut: checkOutTime,
        status: status,
        date: checkDate,
      };
    })
    .filter(Boolean); // null 값 제거 (주간 시간대 출근자가 야간으로 잘못 분류되는 것 방지)
};

// [2_관리자 모드] 2.1_대시보드 - 정렬된 출근 직원 목록 반환
/**
 * 출근 직원 목록을 정렬하여 반환
 * @param {Object} params - 매개변수
 * @param {Array} params.selectedStatusEmployees - 선택된 상태의 직원 목록
 * @param {string} params.attendanceListSortField - 정렬 필드
 * @param {string} params.attendanceListSortOrder - 정렬 순서 ('asc' or 'desc')
 * @returns {Array} 정렬된 직원 목록
 */
export const getSortedAttendanceEmployees = ({
  selectedStatusEmployees,
  attendanceListSortField,
  attendanceListSortOrder,
}) => {
  if (!attendanceListSortField) return selectedStatusEmployees;

  return [...selectedStatusEmployees].sort((a, b) => {
    let aValue = a[attendanceListSortField] || '';
    let bValue = b[attendanceListSortField] || '';

    if (attendanceListSortField === 'id') {
      const aNum = parseInt(String(aValue).replace(/\D/g, '')) || 0;
      const bNum = parseInt(String(bValue).replace(/\D/g, '')) || 0;

      if (attendanceListSortOrder === 'asc') {
        return aNum - bNum;
      } else {
        return bNum - aNum;
      }
    }

    if (attendanceListSortField === 'position') {
      const positionOrder = [
        '사원',
        '주임',
        '대리',
        '과장',
        '차장',
        '부장',
        '이사',
        '상무',
        '전무',
        '부사장',
        '사장',
      ];
      const aIndex =
        positionOrder.indexOf(String(aValue)) !== -1
          ? positionOrder.indexOf(String(aValue))
          : 999;
      const bIndex =
        positionOrder.indexOf(String(bValue)) !== -1
          ? positionOrder.indexOf(String(bValue))
          : 999;

      if (attendanceListSortOrder === 'asc') {
        return aIndex - bIndex;
      } else {
        return bIndex - aIndex;
      }
    }

    // checkIn, checkOut 시간 정렬 (시간을 분으로 변환하여 비교)
    if (
      attendanceListSortField === 'checkIn' ||
      attendanceListSortField === 'checkOut' ||
      attendanceListSortField === 'time'
    ) {
      const aTime = aValue ? timeToMinutes(String(aValue)) : 0;
      const bTime = bValue ? timeToMinutes(String(bValue)) : 0;

      if (attendanceListSortOrder === 'asc') {
        return aTime - bTime;
      } else {
        return bTime - aTime;
      }
    }

    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();

    if (attendanceListSortOrder === 'asc') {
      return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
    } else {
      return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
    }
  });
};

// [2_관리자 모드] 2.1_대시보드 - 월별 출근율 계산
/**
 * 월별 출근율 계산
 * @param {Object} params - 매개변수
 * @param {Array} params.employees - 전체 직원 목록
 * @param {Function} params.getFilteredEmployees - 필터링된 직원 조회 함수
 * @param {Function} params.isHolidayDate - 공휴일 확인 함수
 * @param {Function} params.getAttendanceForEmployee - 출근 데이터 조회 함수
 * @param {Function} params.analyzeAttendanceStatusForDashboard - 출근 상태 분석 함수
 * @returns {string} 출근율 (백분율)
 */
export const calculateAttendanceRateUtil = ({
  employees,
  getFilteredEmployees,
  isHolidayDate,
  getAttendanceForEmployee,
  analyzeAttendanceStatusForDashboard,
  leaveRequests = [],
}) => {
  const now = new Date();
  const m = now.getMonth();
  const year = now.getFullYear();
  const daysInMonth = new Date(year, m + 1, 0).getDate();

  // 기본 제외 직원 (이철균, 이현주, 당월 퇴사자)
  const baseFilteredEmployees = getFilteredEmployees(employees, m);

  let dailyRates = []; // 각 일자별 출근률 저장

  // 각 일자별로 출근률 계산
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, m, day);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isPublicHoliday = isHolidayDate(year, m + 1, day);

    // 주말, 공휴일 제외
    if (isWeekend || isPublicHoliday) {
      continue;
    }

    const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(
      day
    ).padStart(2, '0')}`;

    // 해당 일자에 연차/반차/공가/경조/휴직/기타 승인받은 직원 찾기
    const onLeaveToday = leaveRequests
      .filter((lr) => {
        if (lr.status !== '승인') return false;
        const leaveType = lr.leaveType || lr.type;
        if (
          ![
            '연차',
            '반차(오전)',
            '반차(오후)',
            '공가',
            '경조',
            '휴직',
            '기타',
          ].includes(leaveType)
        ) {
          return false;
        }

        const startDate = lr.startDate.split('T')[0];
        const endDate = lr.endDate.split('T')[0];
        return dateStr >= startDate && dateStr <= endDate;
      })
      .map((lr) => lr.employeeId);

    // 해당 일자 출근 대상 직원 (연차자 제외)
    const targetEmployees = baseFilteredEmployees.filter(
      (emp) => !onLeaveToday.includes(emp.id)
    );

    if (targetEmployees.length === 0) {
      // 모든 직원이 연차인 경우 해당 날짜는 계산에서 제외
      continue;
    }

    // 출근 인원 카운트
    let presentCount = 0;
    targetEmployees.forEach((emp) => {
      const workType = emp.workType || '주간';

      // 1. 당일 및 전날 출근 데이터 확인
      const todayAttendanceData = getAttendanceForEmployee(
        emp.id,
        year,
        m + 1,
        day
      );
      const yesterday = new Date(year, m, day - 1);
      const yesterdayAttendanceData = getAttendanceForEmployee(
        emp.id,
        yesterday.getFullYear(),
        yesterday.getMonth() + 1,
        yesterday.getDate()
      );

      // 2. 출근시간 기준으로 실제 시프트 판정 (1순위: 출근시간, 2순위: workType)
      // 야간 근무는 전날 저녁 출근이므로 전날 데이터를 먼저 확인
      let actualShift = null;
      let checkYear = year;
      let checkMonth = m + 1;
      let checkDay = day;
      let attendanceData = null;

      // 우선순위 1: 전날 데이터에서 야간 출근 확인 (전날 저녁 출근 = 오늘 야간 근무)
      if (yesterdayAttendanceData && yesterdayAttendanceData.checkIn) {
        const checkInMinutes = timeToMinutes(yesterdayAttendanceData.checkIn);
        // 전날 15시 이후 또는 03시 이전 출근 = 오늘 야간 근무
        if (checkInMinutes < 180 || checkInMinutes >= 900) {
          actualShift = '야간';
          checkYear = yesterday.getFullYear();
          checkMonth = yesterday.getMonth() + 1;
          checkDay = yesterday.getDate();
          attendanceData = yesterdayAttendanceData;
        }
      }

      // 우선순위 2: 전날에 야간 출근이 없으면 당일 출근 확인
      if (!actualShift && todayAttendanceData && todayAttendanceData.checkIn) {
        const checkInMinutes = timeToMinutes(todayAttendanceData.checkIn);
        // 당일 03시~15시 출근 = 오늘 주간 근무
        if (checkInMinutes >= 180 && checkInMinutes < 900) {
          actualShift = '주간';
          attendanceData = todayAttendanceData;
        }
        // 당일 15시 이후 또는 03시 이전 출근 = 오늘 야간 근무 시작
        else if (checkInMinutes >= 900 || checkInMinutes < 180) {
          actualShift = '야간';
          attendanceData = todayAttendanceData;
        }
      }

      // 우선순위 3: 출근 데이터가 없으면 workType으로 판정 (단, 시프터는 주간으로 기본 처리)
      if (!actualShift) {
        if (workType === '야간') {
          actualShift = '야간';
          checkYear = yesterday.getFullYear();
          checkMonth = yesterday.getMonth() + 1;
          checkDay = yesterday.getDate();
          attendanceData = yesterdayAttendanceData;
        } else if (workType === '주간/야간') {
          // 시프터는 출근 시간으로만 판단 (출근 데이터 없으면 주간으로 기본 처리)
          actualShift = '주간';
          attendanceData = todayAttendanceData;
        } else {
          actualShift = '주간';
          attendanceData = todayAttendanceData;
        }
      }

      // 4. 상태 분석
      if (
        attendanceData &&
        (attendanceData.checkIn || attendanceData.checkOut)
      ) {
        const status = analyzeAttendanceStatusForDashboard(
          attendanceData,
          checkYear,
          checkMonth,
          checkDay,
          actualShift,
          emp.leaveType || null,
          emp.id
        );
        // 지각, 조퇴도 출근으로 카운트
        if (
          status === '출근' ||
          status === '근무중' ||
          status === '지각' ||
          status === '조퇴' ||
          status === '지각/조퇴'
        ) {
          presentCount++;
        }
      }
    });

    // 일자별 출근률 계산
    const dailyRate = (presentCount / targetEmployees.length) * 100;
    dailyRates.push(dailyRate);
  }

  // 월별 출근률 = 일별 출근률의 평균
  return dailyRates.length > 0
    ? (
        dailyRates.reduce((sum, rate) => sum + rate, 0) / dailyRates.length
      ).toFixed(1)
    : '0.0';
};

// [2_관리자 모드] 2.1_대시보드 - 월별 지각율 계산
/**
 * 월별 지각율 계산
 * @param {Object} params - 매개변수
 * @param {Array} params.employees - 전체 직원 목록
 * @param {Function} params.getFilteredEmployees - 필터링된 직원 조회 함수
 * @param {Function} params.isHolidayDate - 공휴일 확인 함수
 * @param {Function} params.getAttendanceForEmployee - 출근 데이터 조회 함수
 * @param {Function} params.analyzeAttendanceStatusForDashboard - 출근 상태 분석 함수
 * @returns {string} 지각율 (백분율)
 */
export const calculateLateRateUtil = ({
  employees,
  getFilteredEmployees,
  isHolidayDate,
  getAttendanceForEmployee,
  analyzeAttendanceStatusForDashboard,
  leaveRequests = [],
}) => {
  const now = new Date();
  const m = now.getMonth();
  const year = now.getFullYear();
  const daysInMonth = new Date(year, m + 1, 0).getDate();

  // 기본 제외 직원 (이철균, 이현주, 당월 퇴사자)
  const baseFilteredEmployees = getFilteredEmployees(employees, m);

  let dailyRates = []; // 각 일자별 지각률 저장

  // 각 일자별로 지각률 계산
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, m, day);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isPublicHoliday = isHolidayDate(year, m + 1, day);

    // 주말, 공휴일 제외
    if (isWeekend || isPublicHoliday) continue;

    const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(
      day
    ).padStart(2, '0')}`;

    // 해당 일자에 연차/반차/공가/경조/휴직/기타 승인받은 직원 찾기
    const onLeaveToday = leaveRequests
      .filter((lr) => {
        if (lr.status !== '승인') return false;
        const leaveType = lr.leaveType || lr.type;
        if (
          ![
            '연차',
            '반차(오전)',
            '반차(오후)',
            '공가',
            '경조',
            '휴직',
            '기타',
          ].includes(leaveType)
        ) {
          return false;
        }

        const startDate = lr.startDate.split('T')[0];
        const endDate = lr.endDate.split('T')[0];
        return dateStr >= startDate && dateStr <= endDate;
      })
      .map((lr) => lr.employeeId);

    // 해당 일자 출근 대상 직원 (연차자 제외)
    const targetEmployees = baseFilteredEmployees.filter(
      (emp) => !onLeaveToday.includes(emp.id)
    );

    if (targetEmployees.length === 0) {
      // 모든 직원이 연차인 경우 해당 날짜는 계산에서 제외
      continue;
    }

    // 지각 인원 카운트
    let lateCount = 0;
    targetEmployees.forEach((emp) => {
      const workType = emp.workType || '주간';

      // 1. 당일 및 전날 출근 데이터 확인
      const todayAttendanceData = getAttendanceForEmployee(
        emp.id,
        year,
        m + 1,
        day
      );
      const yesterday = new Date(year, m, day - 1);
      const yesterdayAttendanceData = getAttendanceForEmployee(
        emp.id,
        yesterday.getFullYear(),
        yesterday.getMonth() + 1,
        yesterday.getDate()
      );

      // 2. 출근시간 기준으로 실제 시프트 판정 (1순위: 출근시간, 2순위: workType)
      // 야간 근무는 전날 저녁 출근이므로 전날 데이터를 먼저 확인
      let actualShift = null;
      let checkYear = year;
      let checkMonth = m + 1;
      let checkDay = day;
      let attendanceData = null;

      // 우선순위 1: 전날 데이터에서 야간 출근 확인 (전날 저녁 출근 = 오늘 야간 근무)
      if (yesterdayAttendanceData && yesterdayAttendanceData.checkIn) {
        const checkInMinutes = timeToMinutes(yesterdayAttendanceData.checkIn);
        // 전날 15시 이후 또는 03시 이전 출근 = 오늘 야간 근무
        if (checkInMinutes < 180 || checkInMinutes >= 900) {
          actualShift = '야간';
          checkYear = yesterday.getFullYear();
          checkMonth = yesterday.getMonth() + 1;
          checkDay = yesterday.getDate();
          attendanceData = yesterdayAttendanceData;
        }
      }

      // 우선순위 2: 전날에 야간 출근이 없으면 당일 출근 확인
      if (!actualShift && todayAttendanceData && todayAttendanceData.checkIn) {
        const checkInMinutes = timeToMinutes(todayAttendanceData.checkIn);
        // 당일 03시~15시 출근 = 오늘 주간 근무
        if (checkInMinutes >= 180 && checkInMinutes < 900) {
          actualShift = '주간';
          attendanceData = todayAttendanceData;
        }
        // 당일 15시 이후 또는 03시 이전 출근 = 오늘 야간 근무 시작
        else if (checkInMinutes >= 900 || checkInMinutes < 180) {
          actualShift = '야간';
          attendanceData = todayAttendanceData;
        }
      }

      // 우선순위 3: 출근 데이터가 없으면 workType으로 판정 (단, 시프터는 주간으로 기본 처리)
      if (!actualShift) {
        if (workType === '야간') {
          actualShift = '야간';
          checkYear = yesterday.getFullYear();
          checkMonth = yesterday.getMonth() + 1;
          checkDay = yesterday.getDate();
          attendanceData = yesterdayAttendanceData;
        } else if (workType === '주간/야간') {
          // 시프터는 출근 시간으로만 판단 (출근 데이터 없으면 주간으로 기본 처리)
          actualShift = '주간';
          attendanceData = todayAttendanceData;
        } else {
          actualShift = '주간';
          attendanceData = todayAttendanceData;
        }
      }

      // 4. 상태 분석
      if (
        attendanceData &&
        (attendanceData.checkIn || attendanceData.checkOut)
      ) {
        const status = analyzeAttendanceStatusForDashboard(
          attendanceData,
          checkYear,
          checkMonth,
          checkDay,
          actualShift,
          emp.leaveType || null,
          emp.id
        );
        if (['지각', '조퇴', '지각/조퇴'].includes(status)) {
          lateCount++;
        }
      }
    });

    // 일자별 지각률 계산
    const dailyRate = (lateCount / targetEmployees.length) * 100;
    dailyRates.push(dailyRate);
  }

  // 월별 지각률 = 일별 지각률의 평균
  return dailyRates.length > 0
    ? (
        dailyRates.reduce((sum, rate) => sum + rate, 0) / dailyRates.length
      ).toFixed(1)
    : '0.0';
};

// [2_관리자 모드] 2.1_대시보드 - 월별 결근율 계산
/**
 * 월별 결근율 계산
 * @param {Object} params - 매개변수
 * @param {Array} params.employees - 전체 직원 목록
 * @param {Function} params.getFilteredEmployees - 필터링된 직원 조회 함수
 * @param {Function} params.isHolidayDate - 공휴일 확인 함수
 * @param {Function} params.getAttendanceForEmployee - 출근 데이터 조회 함수
 * @param {Function} params.analyzeAttendanceStatusForDashboard - 출근 상태 분석 함수
 * @returns {string} 결근율 (백분율)
 */
export const calculateAbsentRateUtil = ({
  employees,
  getFilteredEmployees,
  isHolidayDate,
  getAttendanceForEmployee,
  analyzeAttendanceStatusForDashboard,
  leaveRequests = [],
}) => {
  const now = new Date();
  const m = now.getMonth();
  const year = now.getFullYear();
  const daysInMonth = new Date(year, m + 1, 0).getDate();

  // 기본 제외 직원 (이철균, 이현주, 당월 퇴사자)
  const baseFilteredEmployees = getFilteredEmployees(employees, m);

  let dailyRates = []; // 각 일자별 결근률 저장

  // 각 일자별로 결근률 계산
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, m, day);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isPublicHoliday = isHolidayDate(year, m + 1, day);

    // 주말, 공휴일 제외
    if (isWeekend || isPublicHoliday) continue;

    const dateStr = `${year}-${String(m + 1).padStart(2, '0')}-${String(
      day
    ).padStart(2, '0')}`;

    // 해당 일자에 연차/반차/공가/경조/휴직/기타 승인받은 직원 찾기 (결근은 제외)
    const onLeaveToday = leaveRequests
      .filter((lr) => {
        if (lr.status !== '승인') return false;
        const leaveType = lr.leaveType || lr.type;
        if (
          ![
            '연차',
            '반차(오전)',
            '반차(오후)',
            '공가',
            '경조',
            '휴직',
            '기타',
          ].includes(leaveType)
        ) {
          return false;
        }

        const startDate = lr.startDate.split('T')[0];
        const endDate = lr.endDate.split('T')[0];
        return dateStr >= startDate && dateStr <= endDate;
      })
      .map((lr) => lr.employeeId);

    // 해당 일자에 결근(승인)인 직원 찾기 (1순위)
    const absentApprovedToday = leaveRequests
      .filter((lr) => {
        if (lr.status !== '승인') return false;
        const leaveType = lr.leaveType || lr.type;
        if (leaveType !== '결근') return false;

        const startDate = lr.startDate.split('T')[0];
        const endDate = lr.endDate.split('T')[0];
        return dateStr >= startDate && dateStr <= endDate;
      })
      .map((lr) => lr.employeeId);

    // 해당 일자 출근 대상 직원 (연차자 제외)
    const targetEmployees = baseFilteredEmployees.filter(
      (emp) => !onLeaveToday.includes(emp.id)
    );

    if (targetEmployees.length === 0) {
      // 모든 직원이 연차인 경우 해당 날짜는 계산에서 제외
      continue;
    }

    // 결근 인원 카운트
    let absentCount = 0;
    targetEmployees.forEach((emp) => {
      // 1순위: 결근(승인) 확인
      if (absentApprovedToday.includes(emp.id)) {
        absentCount++;
        return;
      }

      const workType = emp.workType || '주간';

      // 2. 당일 및 전날 출근 데이터 확인
      const todayAttendanceData = getAttendanceForEmployee(
        emp.id,
        year,
        m + 1,
        day
      );
      const yesterday = new Date(year, m, day - 1);
      const yesterdayAttendanceData = getAttendanceForEmployee(
        emp.id,
        yesterday.getFullYear(),
        yesterday.getMonth() + 1,
        yesterday.getDate()
      );

      // 3. 출근시간 기준으로 실제 시프트 판정 (1순위: 출근시간, 2순위: workType)
      // 야간 근무는 전날 저녁 출근이므로 전날 데이터를 먼저 확인
      let actualShift = null;
      let attendanceData = null;

      // 우선순위 1: 전날 데이터에서 야간 출근 확인 (전날 저녁 출근 = 오늘 야간 근무)
      if (yesterdayAttendanceData && yesterdayAttendanceData.checkIn) {
        const checkInMinutes = timeToMinutes(yesterdayAttendanceData.checkIn);
        // 전날 15시 이후 또는 03시 이전 출근 = 오늘 야간 근무
        if (checkInMinutes < 180 || checkInMinutes >= 900) {
          actualShift = '야간';
          attendanceData = yesterdayAttendanceData;
        }
      }

      // 우선순위 2: 전날에 야간 출근이 없으면 당일 출근 확인
      if (!actualShift && todayAttendanceData && todayAttendanceData.checkIn) {
        const checkInMinutes = timeToMinutes(todayAttendanceData.checkIn);
        // 당일 03시~15시 출근 = 오늘 주간 근무
        if (checkInMinutes >= 180 && checkInMinutes < 900) {
          actualShift = '주간';
          attendanceData = todayAttendanceData;
        }
        // 당일 15시 이후 또는 03시 이전 출근 = 오늘 야간 근무 시작
        else if (checkInMinutes >= 900 || checkInMinutes < 180) {
          actualShift = '야간';
          attendanceData = todayAttendanceData;
        }
      }

      // 우선순위 3: 둘 다 없으면 workType으로 판정
      if (!actualShift) {
        actualShift = workType;
        if (workType === '야간') {
          attendanceData = yesterdayAttendanceData;
        } else {
          attendanceData = todayAttendanceData;
        }
      }

      // 5. 출퇴근 기록 확인
      if (
        !attendanceData ||
        (!attendanceData.checkIn && !attendanceData.checkOut)
      ) {
        absentCount++;
      }
    });

    // 일자별 결근률 계산
    const dailyRate = (absentCount / targetEmployees.length) * 100;
    dailyRates.push(dailyRate);
  }

  // 월별 결근률 = 일별 결근률의 평균
  return dailyRates.length > 0
    ? (
        dailyRates.reduce((sum, rate) => sum + rate, 0) / dailyRates.length
      ).toFixed(1)
    : '0.0';
};

// [2_관리자 모드] 2.1_대시보드 - 월별 이직률 계산
/**
 * 월별 이직률 계산
 * @param {Object} params - 매개변수
 * @param {Array} params.employees - 전체 직원 목록
 * @param {Function} params.getFilteredEmployees - 필터링된 직원 조회 함수
 * @returns {string} 이직률 (백분율)
 */
export const calculateTurnoverRateUtil = ({
  employees,
  getFilteredEmployees,
}) => {
  const now = new Date();
  const year = now.getFullYear();
  const m = now.getMonth();
  const filteredEmployees = getFilteredEmployees(employees, m);

  const resignedThisMonth = employees.filter((emp) => {
    if (
      !['이철균', '이현주'].includes(emp.name) &&
      emp.status === '퇴사' &&
      emp.leaveDate
    ) {
      const leaveDate = new Date(emp.leaveDate);
      return leaveDate.getFullYear() === year && leaveDate.getMonth() === m;
    }
    return false;
  });

  const totalEmployees = filteredEmployees.length;
  return totalEmployees > 0
    ? ((resignedThisMonth.length / totalEmployees) * 100).toFixed(1)
    : '0.0';
};

// [2_관리자 모드] 2.1_대시보드 - 평균 초과근무시간 계산
/**
 * 평균 초과근무시간 계산 (항상 현재 월 기준)
 * @param {Object} params - 매개변수
 * @param {Array} params.employees - 전체 직원 목록
 * @param {Function} params.getAttendanceForEmployee - 출근 데이터 조회 함수
 * @param {Function} params.calcDailyWage - 일별 급여 계산 함수
 * @returns {number} 평균 초과근무시간
 */
export const calculateAverageOvertimeHoursUtil = ({
  employees,
  getAttendanceForEmployee,
  calcDailyWage,
}) => {
  // 항상 현재 년/월 기준
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11

  const filteredEmps = employees.filter(
    (e) => !['이철균', '이현주'].includes(e.name)
  );

  let totalOvertimeHours = 0;
  let employeeCount = 0;

  // 기본 isHoliday 함수 (주말만 휴일로 판정)
  const isHoliday = (date) => {
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  filteredEmps.forEach((emp) => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const overtimeTypes = {
      조출: 0,
      연장: 0,
      특근: 0,
      심야: 0,
      '연장+심야': 0,
      '특근+연장': 0,
      '특근+심야': 0,
      '특근+연장+심야': 0,
    };

    // 현재 월의 모든 날짜를 순회하며 초과근무시간 집계
    for (let day = 1; day <= daysInMonth; day++) {
      const attendance = getAttendanceForEmployee(
        emp.id,
        currentYear,
        currentMonth + 1, // 1-12
        day
      );

      if (attendance && attendance.checkIn && attendance.checkOut) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(
          2,
          '0'
        )}-${String(day).padStart(2, '0')}`;

        // categorizeWorkTime 함수를 사용하여 계산 (근태관리와 동일한 로직)
        const categorized = categorizeWorkTime(
          attendance.checkIn,
          attendance.checkOut,
          emp,
          dateStr,
          isHoliday,
          excludeBreakTimes,
          roundDownToHalfHour,
          EXCLUDE_EXTRA_RANKS,
          EXCLUDE_TIME
        );

        // 각 특근 타입별로 시간 누적
        overtimeTypes.조출 += categorized.조출 || 0;
        overtimeTypes.연장 += categorized.연장 || 0;
        overtimeTypes.특근 += categorized.특근 || 0;
        overtimeTypes.심야 += categorized.심야 || 0;
        overtimeTypes['연장+심야'] += categorized['연장+심야'] || 0;
        overtimeTypes['특근+연장'] += categorized['특근+연장'] || 0;
        overtimeTypes['특근+심야'] += categorized['특근+심야'] || 0;
        overtimeTypes['특근+연장+심야'] += categorized['특근+연장+심야'] || 0;
      }
    }

    // 직원별 총 특근시간 합산
    const empOvertimeHours = Object.values(overtimeTypes).reduce(
      (sum, h) => sum + h,
      0
    );

    if (empOvertimeHours > 0) {
      totalOvertimeHours += empOvertimeHours;
      employeeCount++;
    }
  });

  return employeeCount > 0
    ? Math.round((totalOvertimeHours / employeeCount) * 10) / 10
    : 0;
};

// [2_관리자 모드] 2.1_대시보드 - 연차 사용률 계산
/**
 * 연차 사용률 계산 (현재 월 기준)
 * @param {Object} params - 매개변수
 * @param {Function} params.calculateMonthlyLeaveUsageRate - 월별 연차 사용률 계산 함수
 * @returns {number} 연차 사용률 (백분율)
 */
export const calculateLeaveUsageRateUtil = ({
  calculateMonthlyLeaveUsageRate,
}) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12

  return calculateMonthlyLeaveUsageRate(currentYear, currentMonth);
};

// [2_관리자 모드] 2.1_대시보드 - 월별 연차 사용률 계산
/**
 * 월별 연차 사용률 계산
 * @param {Object} params - 매개변수
 * @param {number} params.targetYear - 대상 연도
 * @param {number} params.targetMonth - 대상 월 (1-12)
 * @param {Array} params.employees - 전체 직원 목록
 * @param {Array} params.leaveRequests - 연차 신청 목록
 * @param {Function} params.calculateAnnualLeave - 총 연차 계산 함수
 * @returns {number} 연차 사용률 (백분율)
 */
export const calculateMonthlyLeaveUsageRateUtil = ({
  targetYear,
  targetMonth,
  employees,
  leaveRequests,
  calculateAnnualLeave,
}) => {
  let totalUsedLeave = 0;
  let totalAvailableLeave = 0;

  const filteredEmps = employees.filter(
    (e) => !['이철균', '이현주'].includes(e.name)
  );

  filteredEmps.forEach((emp) => {
    const usedLeave = leaveRequests
      .filter((lr) => {
        if (lr.employeeId !== emp.id || lr.status !== '승인') return false;
        if (
          !lr.type ||
          (!lr.type.includes('연차') && !lr.type.includes('반차'))
        )
          return false;

        const leaveDate = new Date(lr.startDate);
        return (
          leaveDate.getFullYear() === targetYear &&
          leaveDate.getMonth() === targetMonth - 1
        );
      })
      .reduce((sum, lr) => {
        if (lr.type === '연차') {
          return sum + (lr.approvedDays || 1);
        } else if (lr.type.includes('반차')) {
          return sum + 0.5;
        }
        return sum;
      }, 0);

    // 전 직원의 총 연차 합계 (입사일 기준)
    const availableLeave = calculateAnnualLeave(emp.joinDate);

    totalUsedLeave += usedLeave;
    totalAvailableLeave += availableLeave;
  });

  return totalAvailableLeave > 0
    ? Math.round((totalUsedLeave / totalAvailableLeave) * 100)
    : 0;
};

// [2_관리자 모드] 2.1_대시보드 - 주 52시간 위반율 계산
/**
 * 주 52시간 위반율 계산
 * @param {Object} params - 매개변수
 * @param {Array} params.employees - 전체 직원 목록
 * @param {Function} params.getAttendanceForEmployee - 출근 데이터 조회 함수
 * @param {Function} params.calcDailyWage - 일별 급여 계산 함수
 * @returns {number} 주 52시간 위반율 (백분율)
 */
export const calculateWeekly52HoursViolationUtil = ({
  employees,
  getAttendanceForEmployee,
  calcDailyWage,
}) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const filteredEmps = employees.filter(
    (e) => !['이철균', '이현주'].includes(e.name)
  );

  let violationCount = 0;

  filteredEmps.forEach((emp) => {
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0);
    let currentWeekStart = new Date(monthStart);

    // 첫 번째 월요일 찾기
    const dayOfWeek = currentWeekStart.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    currentWeekStart.setDate(currentWeekStart.getDate() + daysToMonday);

    let hasViolation = false;

    while (currentWeekStart <= monthEnd && !hasViolation) {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); // 일요일

      let weeklyMinutes = 0;
      for (
        let d = new Date(currentWeekStart);
        d <= weekEnd;
        d.setDate(d.getDate() + 1)
      ) {
        if (d < monthStart || d > monthEnd) continue;
        const attendanceData = getAttendanceForEmployee(
          emp.id,
          d.getFullYear(),
          d.getMonth() + 1,
          d.getDate()
        );
        if (
          attendanceData &&
          attendanceData.checkIn &&
          attendanceData.checkOut
        ) {
          const dailyWage = calcDailyWage(
            attendanceData.checkIn,
            attendanceData.checkOut,
            emp.workType || 'day',
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
              2,
              '0'
            )}-${String(d.getDate()).padStart(2, '0')}`
          );
          weeklyMinutes += dailyWage.totalWorkMinutes || 0;
        }
      }

      const weeklyHours = weeklyMinutes / 60;
      if (weeklyHours > 52) {
        hasViolation = true;
      }

      currentWeekStart.setDate(currentWeekStart.getDate() + 7); // 다음 주
    }

    if (hasViolation) {
      violationCount++;
    }
  });

  // 위반 건수 반환 (% 아님)
  return violationCount;
};

// [2_관리자 모드] 2.1_대시보드 - 스트레스 지수 계산 (신규 방식)
/**
 * 스트레스 지수 계산
 * 총 100점 = 근무시간(30) + 연차사용률(20) + 정시퇴근율(20) +
 *            건의사항(10) + 야간/연속근무(10) + 근태안정(10)
 *
 * @param {Object} params - 매개변수
 * @param {Array} params.employees - 전체 직원 목록
 * @param {Function} params.getAttendanceForEmployee - 출근 데이터 조회 함수
 * @param {Function} params.calcDailyWage - 일별 급여 계산 함수
 * @param {Function} params.getUsedAnnualLeave - 사용 연차 조회 함수
 * @param {Function} params.calculateAnnualLeave - 연차 계산 함수
 * @param {Array} params.suggestions - 건의사항 목록
 * @returns {number} 스트레스 지수 (0-100)
 */
export const calculateStressIndexUtil = ({
  employees,
  getAttendanceForEmployee,
  calcDailyWage,
  getUsedAnnualLeave,
  calculateAnnualLeave,
  safetyAccidents = [],
  suggestions = [],
  evaluations = [],
  notices = [],
  leaveRequests = [],
}) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const filteredEmps = employees.filter(
    (e) => !['이철균', '이현주'].includes(e.name)
  );

  let totalStress = 0;
  let employeesWithData = 0;

  filteredEmps.forEach((emp) => {
    let stressScore = 0;
    let hasWorkData = false;

    // 날짜 범위 설정
    const yearStart = new Date(currentYear, 0, 1);
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0);

    // === 1. 근무시간 (30점) - 해당월 주별 평균 ===
    let weeklyHoursList = [];
    let currentWeekMinutes = 0;
    let weekStartDay = 1;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(
        2,
        '0'
      )}-${String(day).padStart(2, '0')}`;
      const attendance = getAttendanceForEmployee(
        emp.id,
        currentYear,
        currentMonth + 1,
        day
      );

      if (attendance && attendance.checkIn && attendance.checkOut) {
        hasWorkData = true;
        const dailyWage = calcDailyWage(
          attendance.checkIn,
          attendance.checkOut,
          emp.workType || 'day',
          dateStr
        );
        currentWeekMinutes += dailyWage.totalWorkMinutes || 0;
      }

      const dayOfWeek = new Date(currentYear, currentMonth, day).getDay();
      // 일요일(0) 또는 마지막 날이면 주 단위 계산
      if (dayOfWeek === 0 || day === daysInMonth) {
        if (currentWeekMinutes > 0) {
          weeklyHoursList.push(currentWeekMinutes / 60);
        }
        currentWeekMinutes = 0;
      }
    }

    if (!hasWorkData) {
      return; // 근무 데이터 없으면 스킵
    }

    // 주별 평균 근무시간
    const avgWeeklyHours =
      weeklyHoursList.length > 0
        ? weeklyHoursList.reduce((a, b) => a + b, 0) / weeklyHoursList.length
        : 0;

    if (avgWeeklyHours >= 52) {
      stressScore += 30;
    } else if (avgWeeklyHours >= 46) {
      stressScore += 20;
    } else if (avgWeeklyHours >= 40) {
      stressScore += 10;
    }
    // 40시간 미만: 0점

    // === 2. 연차사용률 (20점) - 연초부터 누적 ===
    const usedLeave = leaveRequests
      .filter((lr) => {
        if (lr.employeeId !== emp.id || lr.status !== '승인') return false;
        if (
          !lr.type ||
          (!lr.type.includes('연차') && !lr.type.includes('반차'))
        )
          return false;
        const leaveDate = new Date(lr.startDate);
        return leaveDate >= yearStart && leaveDate <= monthEnd;
      })
      .reduce((sum, lr) => {
        if (lr.type === '연차') {
          return sum + (lr.approvedDays || 1);
        } else if (lr.type.includes('반차')) {
          return sum + 0.5;
        }
        return sum;
      }, 0);

    const totalLeave = calculateAnnualLeave(emp.joinDate);
    const leaveUsageRate = totalLeave > 0 ? (usedLeave / totalLeave) * 100 : 0;

    if (leaveUsageRate < 20) {
      stressScore += 20;
    } else if (leaveUsageRate < 40) {
      stressScore += 15;
    } else if (leaveUsageRate < 60) {
      stressScore += 10;
    } else if (leaveUsageRate < 80) {
      stressScore += 5;
    }
    // 80% 이상: 0점

    // === 3. 정시퇴근율 (20점) - 해당월 기준 ===
    let workDays = 0;
    let onTimeCheckouts = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const attendance = getAttendanceForEmployee(
        emp.id,
        currentYear,
        currentMonth + 1,
        day
      );

      if (attendance && attendance.checkIn && attendance.checkOut) {
        workDays++;

        const checkInTime = attendance.checkIn;
        const checkOutTime = attendance.checkOut;

        // 출근시간으로 주간/야간 판정
        const checkInMinutes =
          parseInt(checkInTime.split(':')[0]) * 60 +
          parseInt(checkInTime.split(':')[1]);
        const isDayShift = checkInMinutes >= 180 && checkInMinutes < 900; // 03:00-15:00

        // 정시퇴근 판정
        const checkOutMinutes =
          parseInt(checkOutTime.split(':')[0]) * 60 +
          parseInt(checkOutTime.split(':')[1]);

        if (isDayShift) {
          // 주간: 18:00 이전 퇴근
          if (checkOutMinutes <= 1080) {
            // 18:00 = 1080분
            onTimeCheckouts++;
          }
        } else {
          // 야간: 04:30 이전 퇴근 (270분)
          if (checkOutMinutes <= 270) {
            onTimeCheckouts++;
          }
        }
      }
    }

    const onTimeRate = workDays > 0 ? (onTimeCheckouts / workDays) * 100 : 0;

    if (onTimeRate < 20) {
      stressScore += 20;
    } else if (onTimeRate < 40) {
      stressScore += 15;
    } else if (onTimeRate < 60) {
      stressScore += 10;
    } else if (onTimeRate < 80) {
      stressScore += 5;
    }
    // 80% 이상: 0점

    // === 4. 건의사항 승인률 (10점) - 해당월 기준 ===
    const mySuggestions = suggestions.filter((sug) => {
      if (sug.employeeId !== emp.id && sug.employeeId !== emp.employeeNumber)
        return false;
      const sugDate = new Date(sug.createdAt || sug.date);
      return sugDate >= monthStart && sugDate <= monthEnd;
    });

    if (mySuggestions.length > 0) {
      const approvedCount = mySuggestions.filter(
        (sug) => sug.status === '승인'
      ).length;
      const approvalRate = (approvedCount / mySuggestions.length) * 100;

      if (approvalRate < 25) {
        stressScore += 10;
      } else if (approvalRate < 50) {
        stressScore += 7;
      } else if (approvalRate < 75) {
        stressScore += 3;
      }
      // 75% 이상: 0점
    }
    // 건의사항 없으면: 0점

    // === 5. 야간/연속근무 (10점) - 해당월 기준 ===
    // 5-1. 야간근무 횟수 (주간/야간 시프터만)
    let nightWorkCount = 0;
    let shiftPattern = { day: 0, night: 0 }; // 출근 패턴 분석

    for (let day = 1; day <= daysInMonth; day++) {
      const attendance = getAttendanceForEmployee(
        emp.id,
        currentYear,
        currentMonth + 1,
        day
      );

      if (attendance && attendance.checkIn) {
        const checkInMinutes =
          parseInt(attendance.checkIn.split(':')[0]) * 60 +
          parseInt(attendance.checkIn.split(':')[1]);

        // 출근 패턴 분류
        if (checkInMinutes >= 180 && checkInMinutes < 900) {
          shiftPattern.day++; // 03:00-15:00: 주간
        } else {
          shiftPattern.night++; // 15:00-03:00: 야간
        }

        // 야간 출근 카운트 (15:00-03:00)
        if (checkInMinutes >= 900 || checkInMinutes < 180) {
          nightWorkCount++;
        }
      }
    }

    // 주간/야간 시프터 판정: 둘 다 하면 시프터
    const isShiftWorker = shiftPattern.day > 0 && shiftPattern.night > 0;

    if (isShiftWorker && nightWorkCount >= 15) {
      stressScore += 5;
    }

    // 5-2. 연속근무일수
    let maxConsecutiveDays = 0;
    let currentConsecutiveDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const attendance = getAttendanceForEmployee(
        emp.id,
        currentYear,
        currentMonth + 1,
        day
      );

      if (attendance && attendance.checkIn) {
        currentConsecutiveDays++;
        maxConsecutiveDays = Math.max(
          maxConsecutiveDays,
          currentConsecutiveDays
        );
      } else {
        currentConsecutiveDays = 0;
      }
    }

    if (maxConsecutiveDays >= 7) {
      stressScore += 5;
    }

    // === 6. 근태안정성 (10점) - 해당월 기준 ===
    let lateCount = 0;
    let absentCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const attendance = getAttendanceForEmployee(
        emp.id,
        currentYear,
        currentMonth + 1,
        day
      );

      if (attendance) {
        if (attendance.checkIn) {
          const checkInMinutes =
            parseInt(attendance.checkIn.split(':')[0]) * 60 +
            parseInt(attendance.checkIn.split(':')[1]);
          const isDayShift = checkInMinutes >= 180 && checkInMinutes < 900;

          // 지각 판정
          if (isDayShift) {
            // 주간: 08:31 이후 출근
            if (checkInMinutes > 510) {
              // 08:30 = 510분
              lateCount++;
            }
          } else {
            // 야간: 19:01 이후 출근
            if (checkInMinutes > 1140 && checkInMinutes < 1440) {
              // 19:00 = 1140분
              lateCount++;
            }
          }
        } else if (!attendance.checkOut) {
          // 출근도 퇴근도 없으면 결근 (연차 제외)
          // TODO: 연차인지 확인 로직 필요
          absentCount++;
        }
      }
    }

    if (lateCount >= 3) {
      stressScore += 5;
    }

    if (absentCount >= 1) {
      stressScore += 5;
    }

    totalStress += Math.min(100, stressScore); // 최대 100점
    employeesWithData++;
  });

  return employeesWithData > 0
    ? Math.round(totalStress / employeesWithData)
    : 0;
};

// ============================================================
// [2_관리자 모드] 2.1_대시보드 - SERVICES
// ============================================================

/**
 * 52시간 위반 알림 발송 서비스
 * @param {string} employeeName - 직원 이름
 * @param {number} currentHours - 현재 근무시간
 * @param {string|number} alertType - 알림 타입 (48, 50, 52, 'violation')
 * @param {Array} employees - 전체 직원 목록
 * @param {Function} setRegularNotifications - 정기알림 setState 함수
 * @param {Function} setNotificationLogs - 알림로그 setState 함수
 * @param {Function} devLog - 개발 로그 함수
 * @returns {Object} 생성된 알림 객체
 */
export const send52HourViolationAlert = (
  employeeName,
  currentHours,
  alertType,
  employees,
  setRegularNotifications,
  setNotificationLogs,
  devLog
) => {
  const alertMessages = {
    48: `${employeeName}님의 주간 근무시간이 48시간에 도달했습니다. 현재 ${currentHours.toFixed(
      1
    )}시간입니다.`,
    50: `${employeeName}님의 주간 근무시간이 50시간에 도달했습니다. 현재 ${currentHours.toFixed(
      1
    )}시간입니다.`,
    52: `⚠️ ${employeeName}님의 주간 근무시간이 52시간을 초과했습니다! 현재 ${currentHours.toFixed(
      1
    )}시간입니다.`,
    violation: `🚨 ${employeeName}님의 주간 근무시간이 ${currentHours.toFixed(
      1
    )}시간으로 법정 기준을 ${(currentHours - 52).toFixed(1)}시간 초과했습니다!`,
  };

  const alertLevel =
    currentHours >= 52
      ? currentHours === 52
        ? 52
        : 'violation'
      : currentHours >= 50
      ? 50
      : 48;

  const priority =
    currentHours >= 52 ? 'high' : currentHours >= 50 ? 'medium' : 'low';

  const 수신자목록 = [];

  const 대표 = employees.find(
    (emp) =>
      emp.department === '대표' &&
      emp.subDepartment === '대표' &&
      emp.role === '대표'
  );
  if (대표) 수신자목록.push(대표);

  const 임원총괄 = employees.find(
    (emp) =>
      emp.department === '임원' &&
      emp.subDepartment === '임원' &&
      emp.role === '임원'
  );
  if (임원총괄) 수신자목록.push(임원총괄);

  const 관리팀장 = employees.find(
    (emp) =>
      emp.department === '관리' &&
      emp.subDepartment === '관리' &&
      emp.role === '팀장'
  );
  if (관리팀장) 수신자목록.push(관리팀장);

  const 중복제거수신자 = 수신자목록.filter(
    (emp, index, self) =>
      index === self.findIndex((e) => e.id === emp.id) &&
      emp.name !== employeeName
  );

  const 수신자명단 = 중복제거수신자
    .map((emp) => `${emp.name}(${emp.position || emp.role})`)
    .join(', ');

  const newAlert = {
    id: Date.now() + Math.random(),
    title: `근무시간 ${
      alertLevel >= 52 ? '위반' : '경고'
    } 알림 - ${employeeName}`,
    content: alertMessages[alertLevel],
    status: '진행중',
    createdAt: new Date().toISOString().split('T')[0],
    completedAt: null,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    repeatCycle: '즉시',
    recipients: { type: '개별', value: 수신자명단 || '관리자' },
    priority: priority,
    category: '근무시간관리',
    workHours: currentHours,
  };

  setRegularNotifications((prev) => [newAlert, ...prev]);

  // DB에 알림 로그 저장
  (async () => {
    try {
      const notificationLogData = {
        notificationType: '시스템',
        title: `근무시간 ${
          currentHours >= 52 ? '위반' : '경고'
        } 알림 - ${employeeName}`,
        content: alertMessages[alertLevel],
        status: '진행중', // 직원들이 볼 수 있도록 '진행중' 상태로 저장
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        repeatCycle: '즉시',
        recipients: { type: '개별', value: 수신자명단 || '관리자' },
        priority: priority,
        // createdAt은 서버에서 자동 생성
      };

      await NotificationAPI.create(notificationLogData);
    } catch (error) {
      console.error('❌ 52시간 위반 알림 로그 DB 저장 실패:', error);
    }
  })();

  const newNotificationLog = {
    id: Date.now() + Math.random(),
    type: '시스템알림',
    title: `근무시간 ${
      currentHours >= 52 ? '위반' : '경고'
    } 알림 - ${employeeName}`,
    recipients: 수신자명단 || '관리자',
    content: alertMessages[alertLevel],
    createdAt: new Date().toLocaleString('ko-KR'),
    completedAt: null,
    처리유형: '근무시간관리',
    대상자: employeeName,
    근무시간: currentHours,
    경고수준: alertLevel,
    우선순위: priority,
  };
  setNotificationLogs((prev) => [newNotificationLog, ...prev]);

  devLog('52시간 위반 알림 발송:', {
    timestamp: new Date().toISOString(),
    employee: employeeName,
    hours: currentHours,
    alertLevel: alertLevel,
    message: alertMessages[alertLevel],
  });

  return newAlert;
};

/**
 * 목표달성률 데이터 생성 함수
 * @param {number} year - 조회 연도
 * @param {Array} employees - 전체 직원 목록
 * @param {Function} getFilteredEmployees - 필터링된 직원 조회 함수
 * @param {Function} getAttendanceForEmployee - 직원 출근 데이터 조회 함수
 * @param {Function} analyzeAttendanceStatusForDashboard - 출근 상태 분석 함수
 * @returns {Object} 월별 목표달성률 데이터 (attendance, tardiness, absence, turnover)
 */
export const getGoalDataByYearUtil = (
  year,
  employees,
  getFilteredEmployees,
  getAttendanceForEmployee,
  analyzeAttendanceStatusForDashboard,
  isHolidayDate,
  leaveRequests = [],
  monthlyAttendanceDataMap = {} // 새 파라미터: {1: [...], 2: [...], ...}
) => {
  const currentMonth = new Date().getMonth(); // 0-11 (0=1월, 9=10월)
  const currentYear = new Date().getFullYear();

  const monthlyData = {
    attendance: [],
    tardiness: [],
    absence: [],
    turnover: [],
  };

  // 월별 데이터가 전달된 경우, attendanceSheetData 형식으로 변환
  const attendanceSheetData = {};
  if (Object.keys(monthlyAttendanceDataMap).length > 0) {
    Object.entries(monthlyAttendanceDataMap).forEach(([month, records]) => {
      // records가 배열인지 확인
      if (!Array.isArray(records)) {
        console.warn(`${month}월 데이터가 배열이 아님:`, records);
        return;
      }

      records.forEach((record) => {
        if (!record || !record.date || !record.employeeId) {
          return; // 유효하지 않은 레코드 스킵
        }

        // 날짜 파싱 (YYYY-MM-DD 형식)
        const dateParts = record.date.split('-');
        const y = parseInt(dateParts[0]);
        const m = parseInt(dateParts[1]);
        const d = parseInt(dateParts[2]);
        const dateKey = `${y}-${String(m).padStart(2, '0')}-${String(
          d
        ).padStart(2, '0')}`;
        const employeeKey = `${record.employeeId}_${dateKey}`;
        attendanceSheetData[employeeKey] = {
          checkIn: record.checkIn || '',
          checkOut: record.checkOut || '',
        };
      });
    });

    // 실제 데이터를 조회하는 함수로 대체
    getAttendanceForEmployee = (employeeId, year, month, day) => {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(
        day
      ).padStart(2, '0')}`;
      const employeeKey = `${employeeId}_${dateKey}`;
      return attendanceSheetData[employeeKey] || { checkIn: '', checkOut: '' };
    };
  }

  for (let month = 0; month < 12; month++) {
    if (year === currentYear && month > currentMonth) {
      monthlyData.attendance[month] = null;
      monthlyData.tardiness[month] = null;
      monthlyData.absence[month] = null;
      monthlyData.turnover[month] = null;
    } else {
      // 출근률, 지각률, 결근률 계산 (일별 평균 방식)
      const attendanceRate = calculateMonthlyRate(
        year,
        month,
        'attendance',
        employees,
        getFilteredEmployees,
        getAttendanceForEmployee,
        analyzeAttendanceStatusForDashboard,
        isHolidayDate,
        leaveRequests
      );

      const lateRate = calculateMonthlyRate(
        year,
        month,
        'late',
        employees,
        getFilteredEmployees,
        getAttendanceForEmployee,
        analyzeAttendanceStatusForDashboard,
        isHolidayDate,
        leaveRequests
      );

      const absentRate = calculateMonthlyRate(
        year,
        month,
        'absent',
        employees,
        getFilteredEmployees,
        getAttendanceForEmployee,
        analyzeAttendanceStatusForDashboard,
        isHolidayDate,
        leaveRequests
      );

      // 퇴사율 계산
      const filteredEmployees = getFilteredEmployees(employees, month);
      const resignedCount = employees.filter((emp) => {
        if (
          !['이철균', '이현주'].includes(emp.name) &&
          emp.status === '퇴사' &&
          emp.leaveDate
        ) {
          const leaveDate = new Date(emp.leaveDate);
          return (
            leaveDate.getFullYear() === year && leaveDate.getMonth() === month
          );
        }
        return false;
      }).length;

      const totalEmployees = filteredEmployees.length;

      monthlyData.attendance[month] = Math.round(attendanceRate);
      monthlyData.tardiness[month] = Math.round(lateRate);
      monthlyData.absence[month] = Math.round(absentRate);
      monthlyData.turnover[month] =
        totalEmployees > 0
          ? Math.round((resignedCount / totalEmployees) * 100)
          : 0;
    }
  }

  return monthlyData;
};

// 월별 비율 계산 헬퍼 함수 (일별 평균 방식)
function calculateMonthlyRate(
  year,
  month,
  metric,
  employees,
  getFilteredEmployees,
  getAttendanceForEmployee,
  analyzeAttendanceStatusForDashboard,
  isHolidayDate,
  leaveRequests
) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const baseFilteredEmployees = getFilteredEmployees(employees, month);

  let dailyRates = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, month, day);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isPublicHoliday = isHolidayDate(year, month + 1, day);

    // 디버깅: 8월 15일 공휴일 체크
    if (isWeekend || isPublicHoliday) continue;

    // 디버깅: 8월 1일 첫 번째 직원 데이터 확인
    const isDebugDay = year === 2025 && month === 7 && day === 1;

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
      day
    ).padStart(2, '0')}`;

    // 해당 일자 연차자 찾기
    const onLeaveToday = leaveRequests
      .filter((lr) => {
        if (lr.status !== '승인') return false;
        const leaveType = lr.leaveType || lr.type;
        if (
          ![
            '연차',
            '반차(오전)',
            '반차(오후)',
            '공가',
            '경조',
            '휴직',
            '기타',
          ].includes(leaveType)
        ) {
          return false;
        }
        const startDate = lr.startDate.split('T')[0];
        const endDate = lr.endDate.split('T')[0];
        return dateStr >= startDate && dateStr <= endDate;
      })
      .map((lr) => lr.employeeId);

    // 결근(승인) 찾기
    const absentApprovedToday = leaveRequests
      .filter((lr) => {
        if (lr.status !== '승인') return false;
        const leaveType = lr.leaveType || lr.type;
        if (leaveType !== '결근') return false;
        const startDate = lr.startDate.split('T')[0];
        const endDate = lr.endDate.split('T')[0];
        return dateStr >= startDate && dateStr <= endDate;
      })
      .map((lr) => lr.employeeId);

    // 출근 대상 직원
    const targetEmployees = baseFilteredEmployees.filter(
      (emp) => !onLeaveToday.includes(emp.id)
    );

    if (targetEmployees.length === 0) continue;

    let count = 0;
    let debuggedFirstEmployee = false;
    targetEmployees.forEach((emp) => {
      const workType = emp.workType || '주간';

      // 1. 당일 및 전날 출근 데이터 확인
      const todayAttendanceData = getAttendanceForEmployee(
        emp.id,
        year,
        month + 1,
        day
      );
      const yesterday = new Date(year, month, day - 1);
      const yesterdayAttendanceData = getAttendanceForEmployee(
        emp.id,
        yesterday.getFullYear(),
        yesterday.getMonth() + 1,
        yesterday.getDate()
      );

      // 2. 출근시간 기준으로 실제 시프트 판정 (1순위: 출근시간, 2순위: workType)
      // 야간 근무는 전날 저녁 출근이므로 전날 데이터를 먼저 확인
      let actualShift = null;
      let checkYear = year;
      let checkMonth = month + 1;
      let checkDay = day;
      let attendanceData = null;

      // 우선순위 1: 전날 데이터에서 야간 출근 확인 (전날 저녁 출근 = 오늘 야간 근무)
      if (yesterdayAttendanceData && yesterdayAttendanceData.checkIn) {
        const checkInMinutes = timeToMinutes(yesterdayAttendanceData.checkIn);
        // 전날 15시 이후 또는 03시 이전 출근 = 오늘 야간 근무
        if (checkInMinutes < 180 || checkInMinutes >= 900) {
          actualShift = '야간';
          checkYear = yesterday.getFullYear();
          checkMonth = yesterday.getMonth() + 1;
          checkDay = yesterday.getDate();
          attendanceData = yesterdayAttendanceData;
        }
      }

      // 우선순위 2: 전날에 야간 출근이 없으면 당일 출근 확인
      if (!actualShift && todayAttendanceData && todayAttendanceData.checkIn) {
        const checkInMinutes = timeToMinutes(todayAttendanceData.checkIn);
        // 당일 03시~15시 출근 = 오늘 주간 근무
        if (checkInMinutes >= 180 && checkInMinutes < 900) {
          actualShift = '주간';
          attendanceData = todayAttendanceData;
        }
        // 당일 15시 이후 또는 03시 이전 출근 = 오늘 야간 근무 시작
        else if (checkInMinutes >= 900 || checkInMinutes < 180) {
          actualShift = '야간';
          attendanceData = todayAttendanceData;
        }
      }

      // 우선순위 3: 출근 데이터가 없으면 workType으로 판정 (단, 시프터는 주간으로 기본 처리)
      if (!actualShift) {
        if (workType === '야간') {
          actualShift = '야간';
          checkYear = yesterday.getFullYear();
          checkMonth = yesterday.getMonth() + 1;
          checkDay = yesterday.getDate();
          attendanceData = yesterdayAttendanceData;
        } else if (workType === '주간/야간') {
          // 시프터는 출근 시간으로만 판단 (출근 데이터 없으면 주간으로 기본 처리)
          actualShift = '주간';
          attendanceData = todayAttendanceData;
        } else {
          actualShift = '주간';
          attendanceData = todayAttendanceData;
        }
      }

      // 4. 상태 분석 (목표달성률 전용 로직)
      let status = '';

      // 결근 판정: 1) 결근 승인 OR 2) 출근+퇴근 둘 다 없음
      const isAbsent =
        absentApprovedToday.includes(emp.id) ||
        !attendanceData ||
        (!attendanceData.checkIn && !attendanceData.checkOut);

      if (isAbsent) {
        status = '결근';
      } else {
        // 출근 데이터가 있으면 지각 여부 판정
        const checkInMinutes = attendanceData.checkIn
          ? timeToMinutes(attendanceData.checkIn)
          : null;

        if (checkInMinutes !== null) {
          // 지각 기준: 주간 08:31 이후, 야간 19:01 이후
          const isLate =
            (actualShift === '주간' && checkInMinutes > 511) || // 08:31 = 511분
            (actualShift === '야간' && checkInMinutes > 1141); // 19:01 = 1141분

          status = isLate ? '지각' : '출근';
        } else {
          // checkIn이 없으면 출근으로 간주 (checkOut만 있는 경우)
          status = '출근';
        }
      }

      // 출근률: "출근"만 카운트
      if (metric === 'attendance' && status === '출근') {
        count++;
      }
      // 지각률: "지각"만 카운트
      else if (metric === 'late' && status === '지각') {
        count++;
      }
      // 결근률: "결근"만 카운트
      else if (metric === 'absent' && status === '결근') {
        count++;
      }
    });

    const dailyRate = (count / targetEmployees.length) * 100;
    dailyRates.push(dailyRate);
  }

  const result =
    dailyRates.length > 0
      ? dailyRates.reduce((sum, rate) => sum + rate, 0) / dailyRates.length
      : 0;

  // 디버깅: 7월, 8월 데이터 확인
  return result;
}

/**
 * 워라밸 데이터 생성 함수
 * @param {number} year - 조회 연도
 * @param {Array} employees - 전체 직원 목록
 * @param {Function} getDaysInMonth - 월의 일수 계산 함수
 * @param {Function} getAttendanceForEmployee - 직원 출근 데이터 조회 함수
 * @param {Function} calcDailyWage - 일일 급여 계산 함수
 * @param {Function} calculateMonthlyLeaveUsageRate - 월별 연차 사용률 계산 함수
 * @param {Function} getUsedAnnualLeave - 사용한 연차 조회 함수
 * @param {Function} calculateAnnualLeave - 총 연차 계산 함수
 * @param {Array} safetyAccidents - 안전사고 목록
 * @param {Array} suggestions - 건의사항 목록
 * @param {Array} evaluations - 평가 목록
 * @param {Array} notices - 공지사항 목록
 * @param {Array} leaveRequests - 연차 신청 목록
 * @returns {Object} 월별 워라밸 데이터 (overtime, leaveUsage, violations, stressIndex)
 */
export const getWorkLifeBalanceDataByYearUtil = (
  year,
  employees,
  getDaysInMonth,
  getAttendanceForEmployee,
  calcDailyWage,
  calculateMonthlyLeaveUsageRate,
  getUsedAnnualLeave,
  calculateAnnualLeave,
  safetyAccidents = [],
  suggestions = [],
  evaluations = [],
  notices = [],
  leaveRequests = []
) => {
  const currentMonth = new Date().getMonth(); // 0-11 (0=1월, 8=9월)
  const currentYear = new Date().getFullYear();

  const monthlyData = {
    overtime: [],
    leaveUsage: [],
    violations: [],
    stressIndex: [],
  };

  for (let month = 0; month < 12; month++) {
    if (year === currentYear && month > currentMonth) {
      monthlyData.overtime[month] = null;
      monthlyData.leaveUsage[month] = null;
      monthlyData.violations[month] = null;
      monthlyData.stressIndex[month] = null;
      continue;
    }

    const daysInMonth = getDaysInMonth(year, month + 1);
    let totalOvertimeHours = 0;
    let employeeCount = 0;

    // 기본 isHoliday 함수 (주말만 휴일로 판정)
    const isHoliday = (date) => {
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay();
      return dayOfWeek === 0 || dayOfWeek === 6;
    };

    const filteredEmpsForOvertime = employees.filter(
      (e) => !['이철균', '이현주'].includes(e.name)
    );

    filteredEmpsForOvertime.forEach((emp, empIndex) => {
      const overtimeTypes = {
        조출: 0,
        연장: 0,
        특근: 0,
        심야: 0,
        '연장+심야': 0,
        '특근+연장': 0,
        '특근+심야': 0,
        '특근+연장+심야': 0,
      };

      for (let day = 1; day <= daysInMonth; day++) {
        const attendanceData = getAttendanceForEmployee(
          emp.id,
          year,
          month + 1,
          day
        );
        if (attendanceData) {
          const dateStr = `${year}-${String(month + 1).padStart(
            2,
            '0'
          )}-${String(day).padStart(2, '0')}`;

          // categorizeWorkTime 함수를 사용하여 계산 (근태관리와 동일한 로직)
          if (attendanceData.checkIn && attendanceData.checkOut) {
            const categorized = categorizeWorkTime(
              attendanceData.checkIn,
              attendanceData.checkOut,
              emp,
              dateStr,
              isHoliday,
              excludeBreakTimes,
              roundDownToHalfHour,
              EXCLUDE_EXTRA_RANKS,
              EXCLUDE_TIME
            );

            // 각 특근 타입별로 시간 누적
            overtimeTypes.조출 += categorized.조출 || 0;
            overtimeTypes.연장 += categorized.연장 || 0;
            overtimeTypes.특근 += categorized.특근 || 0;
            overtimeTypes.심야 += categorized.심야 || 0;
            overtimeTypes['연장+심야'] += categorized['연장+심야'] || 0;
            overtimeTypes['특근+연장'] += categorized['특근+연장'] || 0;
            overtimeTypes['특근+심야'] += categorized['특근+심야'] || 0;
            overtimeTypes['특근+연장+심야'] +=
              categorized['특근+연장+심야'] || 0;
          }
        }
      }

      // 직원별 총 특근시간 합산
      const empTotalOvertimeHours = Object.values(overtimeTypes).reduce(
        (sum, h) => sum + h,
        0
      );

      if (empTotalOvertimeHours > 0) {
        totalOvertimeHours += empTotalOvertimeHours;
        employeeCount++;
      }
    });

    monthlyData.overtime[month] =
      employeeCount > 0
        ? Math.round((totalOvertimeHours / employeeCount) * 100) / 100
        : 0;

    monthlyData.leaveUsage[month] = calculateMonthlyLeaveUsageRate(
      year,
      month + 1
    );

    // 주 52시간 위반 건수 계산 (실제 월요일-일요일 주 단위)
    let violationCount = 0;
    const filteredEmps = employees.filter(
      (e) => !['이철균', '이현주'].includes(e.name)
    );

    filteredEmps.forEach((emp, empIdx) => {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      let currentWeekStart = new Date(monthStart);

      // 첫 번째 월요일 찾기
      const dayOfWeek = currentWeekStart.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      currentWeekStart.setDate(currentWeekStart.getDate() + daysToMonday);

      let hasViolation = false;
      let weekIndex = 0;

      while (currentWeekStart <= monthEnd && !hasViolation) {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6); // 일요일

        let weeklyMinutes = 0;
        let daysWorked = 0;
        for (
          let d = new Date(currentWeekStart);
          d <= weekEnd;
          d.setDate(d.getDate() + 1)
        ) {
          if (d < monthStart || d > monthEnd) continue;
          const attendanceData = getAttendanceForEmployee(
            emp.id,
            d.getFullYear(),
            d.getMonth() + 1,
            d.getDate()
          );
          if (
            attendanceData &&
            attendanceData.checkIn &&
            attendanceData.checkOut
          ) {
            const dailyWage = calcDailyWage(
              attendanceData.checkIn,
              attendanceData.checkOut,
              emp.workType || 'day',
              `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
                2,
                '0'
              )}-${String(d.getDate()).padStart(2, '0')}`
            );
            weeklyMinutes += dailyWage.totalWorkMinutes || 0;
            daysWorked++;
          }
        }

        const weeklyHours = weeklyMinutes / 60;
        if (weeklyHours > 52) {
          hasViolation = true;
        }

        currentWeekStart.setDate(currentWeekStart.getDate() + 7); // 다음 주
        weekIndex++;
      }

      if (hasViolation) {
        violationCount++;
      }
    });

    monthlyData.violations[month] = violationCount;

    // === 스트레스 지수 계산 (신규 6개 구성요소) ===
    let totalStress = 0;
    let employeesWithData = 0;
    // filteredEmps는 위에서 이미 선언됨 (4154번 줄)

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const yearStart = new Date(year, 0, 1);

    filteredEmps.forEach((emp) => {
      let stressScore = 0;
      let hasWorkData = false;

      // === 1. 근무시간 (30점) - 해당월 주별 평균 ===
      let weeklyHoursList = [];
      let currentWeekMinutes = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const attendanceData = getAttendanceForEmployee(
          emp.id,
          year,
          month + 1,
          day
        );

        if (
          attendanceData &&
          attendanceData.checkIn &&
          attendanceData.checkOut
        ) {
          hasWorkData = true;
          const dailyWage = calcDailyWage(
            attendanceData.checkIn,
            attendanceData.checkOut,
            emp.workType || 'day',
            `${year}-${String(month + 1).padStart(2, '0')}-${String(
              day
            ).padStart(2, '0')}`
          );
          currentWeekMinutes += dailyWage.totalWorkMinutes || 0;
        }

        const dayOfWeek = new Date(year, month, day).getDay();
        // 일요일(0) 또는 마지막 날이면 주 단위 계산
        if (dayOfWeek === 0 || day === daysInMonth) {
          if (currentWeekMinutes > 0) {
            weeklyHoursList.push(currentWeekMinutes / 60);
          }
          currentWeekMinutes = 0;
        }
      }

      if (!hasWorkData) {
        return; // 근무 데이터 없으면 스킵
      }

      // 주별 평균 근무시간
      const avgWeeklyHours =
        weeklyHoursList.length > 0
          ? weeklyHoursList.reduce((a, b) => a + b, 0) / weeklyHoursList.length
          : 0;

      if (avgWeeklyHours >= 52) {
        stressScore += 30;
      } else if (avgWeeklyHours >= 46) {
        stressScore += 20;
      } else if (avgWeeklyHours >= 40) {
        stressScore += 10;
      }
      // 40시간 미만: 0점

      // === 2. 연차사용률 (20점) - 연초부터 누적 ===
      const usedLeave = leaveRequests
        .filter((lr) => {
          if (lr.employeeId !== emp.id || lr.status !== '승인') return false;
          if (
            !lr.type ||
            (!lr.type.includes('연차') && !lr.type.includes('반차'))
          )
            return false;
          const leaveDate = new Date(lr.startDate);
          return leaveDate >= yearStart && leaveDate <= monthEnd;
        })
        .reduce((sum, lr) => {
          if (lr.type === '연차') {
            return sum + (lr.approvedDays || 1);
          } else if (lr.type.includes('반차')) {
            return sum + 0.5;
          }
          return sum;
        }, 0);

      const totalLeave = calculateAnnualLeave(emp.joinDate);
      const leaveUsageRate =
        totalLeave > 0 ? (usedLeave / totalLeave) * 100 : 0;

      if (leaveUsageRate < 20) {
        stressScore += 20;
      } else if (leaveUsageRate < 40) {
        stressScore += 15;
      } else if (leaveUsageRate < 60) {
        stressScore += 10;
      } else if (leaveUsageRate < 80) {
        stressScore += 5;
      }
      // 80% 이상: 0점

      // === 3. 정시퇴근율 (20점) - 해당월 기준 ===
      let workDays = 0;
      let onTimeCheckouts = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const attendanceData = getAttendanceForEmployee(
          emp.id,
          year,
          month + 1,
          day
        );

        if (
          attendanceData &&
          attendanceData.checkIn &&
          attendanceData.checkOut
        ) {
          workDays++;

          const checkInTime = attendanceData.checkIn;
          const checkOutTime = attendanceData.checkOut;

          // 출근시간으로 주간/야간 판정
          const checkInMinutes =
            parseInt(checkInTime.split(':')[0]) * 60 +
            parseInt(checkInTime.split(':')[1]);
          const isDayShift = checkInMinutes >= 180 && checkInMinutes < 900; // 03:00-15:00

          // 정시퇴근 판정
          const checkOutMinutes =
            parseInt(checkOutTime.split(':')[0]) * 60 +
            parseInt(checkOutTime.split(':')[1]);

          if (isDayShift) {
            // 주간: 18:00 이전 퇴근
            if (checkOutMinutes <= 1080) {
              // 18:00 = 1080분
              onTimeCheckouts++;
            }
          } else {
            // 야간: 04:30 이전 퇴근 (270분)
            if (checkOutMinutes <= 270) {
              onTimeCheckouts++;
            }
          }
        }
      }

      const onTimeRate = workDays > 0 ? (onTimeCheckouts / workDays) * 100 : 0;

      if (onTimeRate < 20) {
        stressScore += 20;
      } else if (onTimeRate < 40) {
        stressScore += 15;
      } else if (onTimeRate < 60) {
        stressScore += 10;
      } else if (onTimeRate < 80) {
        stressScore += 5;
      }
      // 80% 이상: 0점

      // === 4. 건의사항 승인률 (10점) - 해당월 기준 ===
      const mySuggestions = suggestions.filter((sug) => {
        if (sug.employeeId !== emp.id && sug.employeeId !== emp.employeeNumber)
          return false;
        const sugDate = new Date(sug.createdAt || sug.date);
        return sugDate >= monthStart && sugDate <= monthEnd;
      });

      if (mySuggestions.length > 0) {
        const approvedCount = mySuggestions.filter(
          (sug) => sug.status === '승인'
        ).length;
        const approvalRate = (approvedCount / mySuggestions.length) * 100;

        if (approvalRate < 25) {
          stressScore += 10;
        } else if (approvalRate < 50) {
          stressScore += 7;
        } else if (approvalRate < 75) {
          stressScore += 3;
        }
        // 75% 이상: 0점
      }
      // 건의사항 없으면: 0점

      // === 5. 야간/연속근무 (10점) - 해당월 기준 ===
      // 5-1. 야간근무 횟수 (주간/야간 시프터만)
      let nightWorkCount = 0;
      let shiftPattern = { day: 0, night: 0 }; // 출근 패턴 분석

      for (let day = 1; day <= daysInMonth; day++) {
        const attendanceData = getAttendanceForEmployee(
          emp.id,
          year,
          month + 1,
          day
        );

        if (attendanceData && attendanceData.checkIn) {
          const checkInMinutes =
            parseInt(attendanceData.checkIn.split(':')[0]) * 60 +
            parseInt(attendanceData.checkIn.split(':')[1]);

          // 출근 패턴 분류
          if (checkInMinutes >= 180 && checkInMinutes < 900) {
            shiftPattern.day++; // 03:00-15:00: 주간
          } else {
            shiftPattern.night++; // 15:00-03:00: 야간
          }

          // 야간 출근 카운트 (15:00-03:00)
          if (checkInMinutes >= 900 || checkInMinutes < 180) {
            nightWorkCount++;
          }
        }
      }

      // 주간/야간 시프터 판정: 둘 다 하면 시프터
      const isShiftWorker = shiftPattern.day > 0 && shiftPattern.night > 0;

      if (isShiftWorker && nightWorkCount >= 15) {
        stressScore += 5;
      }

      // 5-2. 연속근무일수
      let maxConsecutiveDays = 0;
      let currentConsecutiveDays = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const attendanceData = getAttendanceForEmployee(
          emp.id,
          year,
          month + 1,
          day
        );

        if (attendanceData && attendanceData.checkIn) {
          currentConsecutiveDays++;
          maxConsecutiveDays = Math.max(
            maxConsecutiveDays,
            currentConsecutiveDays
          );
        } else {
          currentConsecutiveDays = 0;
        }
      }

      if (maxConsecutiveDays >= 7) {
        stressScore += 5;
      }

      // === 6. 근태안정성 (10점) - 해당월 기준 ===
      let lateCount = 0;
      let absentCount = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const attendanceData = getAttendanceForEmployee(
          emp.id,
          year,
          month + 1,
          day
        );

        if (attendanceData) {
          if (attendanceData.checkIn) {
            const checkInMinutes =
              parseInt(attendanceData.checkIn.split(':')[0]) * 60 +
              parseInt(attendanceData.checkIn.split(':')[1]);
            const isDayShift = checkInMinutes >= 180 && checkInMinutes < 900;

            // 지각 판정
            if (isDayShift) {
              // 주간: 08:31 이후 출근
              if (checkInMinutes > 510) {
                // 08:30 = 510분
                lateCount++;
              }
            } else {
              // 야간: 19:01 이후 출근
              if (checkInMinutes > 1140 && checkInMinutes < 1440) {
                // 19:00 = 1140분
                lateCount++;
              }
            }
          } else if (!attendanceData.checkOut) {
            // 출근도 퇴근도 없으면 결근 (연차 제외)
            absentCount++;
          }
        }
      }

      if (lateCount >= 3) {
        stressScore += 5;
      }

      if (absentCount >= 1) {
        stressScore += 5;
      }

      totalStress += Math.min(100, stressScore); // 최대 100점
      employeesWithData++;
    });

    monthlyData.stressIndex[month] =
      employeesWithData > 0 ? Math.round(totalStress / employeesWithData) : 0;
  }

  return monthlyData;
};

/**
 * 52시간 위반 상세 데이터 조회 함수
 * @param {number} year - 조회 연도
 * @param {number} month - 조회 월 (0-11)
 * @param {Array} employees - 전체 직원 목록
 * @param {Function} getDaysInMonth - 월의 일수 계산 함수
 * @param {Function} getAttendanceForEmployee - 직원 출근 데이터 조회 함수
 * @param {Function} calcDailyWage - 일일 급여 계산 함수
 * @returns {Array} 52시간 위반 상세 정보 배열
 */
export const getViolationDetailsUtil = (
  year,
  month,
  employees,
  getDaysInMonth,
  getAttendanceForEmployee,
  calcDailyWage
) => {
  const violationDetails = [];
  const filteredEmps = employees.filter(
    (e) => !['이철균', '이현주'].includes(e.name)
  );

  filteredEmps.forEach((emp) => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    let currentWeekStart = new Date(monthStart);

    // 월의 첫 번째 월요일 찾기
    const dayOfWeek = currentWeekStart.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    currentWeekStart.setDate(currentWeekStart.getDate() + daysToMonday);

    while (currentWeekStart <= monthEnd) {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); // 일요일까지

      let weeklyMinutes = 0;

      for (
        let d = new Date(currentWeekStart);
        d <= weekEnd;
        d.setDate(d.getDate() + 1)
      ) {
        if (d < monthStart || d > monthEnd) continue; // 해당 월 범위 확인

        const attendanceData = getAttendanceForEmployee(
          emp.id,
          d.getFullYear(),
          d.getMonth() + 1,
          d.getDate()
        );

        if (
          attendanceData &&
          attendanceData.checkIn &&
          attendanceData.checkOut
        ) {
          const dailyWage = calcDailyWage(
            attendanceData.checkIn,
            attendanceData.checkOut,
            emp.workType || 'day',
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
              2,
              '0'
            )}-${String(d.getDate()).padStart(2, '0')}`
          );
          weeklyMinutes += dailyWage.totalWorkMinutes || 0;
        }
      }

      const weeklyHours = weeklyMinutes / 60;
      if (weeklyHours > 52) {
        const weekStartStr = `${
          currentWeekStart.getMonth() + 1
        }/${currentWeekStart.getDate()}`;
        const weekEndStr = `${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;
        const weekPeriod = `${weekStartStr} ~ ${weekEndStr}`;

        violationDetails.push({
          employeeName: emp.name,
          weeks: weekPeriod,
          violationHours: Math.round((weeklyHours - 52) * 10) / 10,
          weekStart: currentWeekStart.getTime(), // 정렬용
        });
      }

      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
  });

  violationDetails.sort((a, b) => {
    if (a.employeeName !== b.employeeName) {
      return a.employeeName.localeCompare(b.employeeName);
    }
    return a.weekStart - b.weekStart;
  });

  return violationDetails;
};

/**
 * 워라밸 상세 데이터 조회 함수
 * @param {number} year - 조회 연도
 * @param {number} month - 조회 월 (0-11)
 * @param {string} metric - 조회 지표 ('평균 특근시간', '연차 사용률', '주 52시간 위반', '스트레스 지수')
 * @param {Array} employees - 전체 직원 목록
 * @param {Function} getDaysInMonth - 월의 일수 계산 함수
 * @param {Function} getAttendanceForEmployee - 직원 출근 데이터 조회 함수
 * @param {Function} categorizeWorkTime - 근무시간 분류 함수
 * @param {Array} leaveRequests - 휴가 신청 목록
 * @param {Function} calcDailyWage - 일일 급여 계산 함수
 * @param {Function} calculateAnnualLeave - 총 연차 계산 함수
 * @param {Array} safetyAccidents - 안전사고 목록
 * @param {Array} suggestions - 건의사항 목록
 * @param {Array} evaluations - 평가 목록
 * @param {Array} notices - 공지사항 목록
 * @param {Function} getWorkTypeForDate - 근태 관리의 평일/휴일 판정 함수
 * @returns {Array} 워라밸 상세 데이터 배열
 */
export const getWorkLifeDetailDataUtil = (
  year,
  month,
  metric,
  employees,
  getDaysInMonth,
  getAttendanceForEmployee,
  isHolidayFn = null,
  leaveRequests,
  calcDailyWage,
  calculateAnnualLeave = null,
  safetyAccidents = [],
  suggestions = [],
  evaluations = [],
  notices = [],
  getWorkTypeForDate = null
) => {
  const detailData = [];
  const daysInMonth = getDaysInMonth(year, month + 1);

  const filteredEmps = employees.filter(
    (e) => !['이철균', '이현주'].includes(e.name)
  );

  // isHoliday 함수 - getWorkTypeForDate가 있으면 근태 관리 로직 사용, 없으면 기본 함수 사용
  const isHoliday = getWorkTypeForDate
    ? (date) => {
        const [y, m, d] = date.split('-').map(Number);
        const workType = getWorkTypeForDate(y, m, d);
        return workType === 'holiday';
      }
    : isHolidayFn ||
      ((date) => {
        const dateObj = new Date(date);
        const dayOfWeek = dateObj.getDay();
        return dayOfWeek === 0 || dayOfWeek === 6; // 주말만 휴일로 판정
      });

  if (metric === '평균 특근시간') {
    filteredEmps.forEach((emp) => {
      const overtimeTypes = {
        조출: 0,
        연장: 0,
        특근: 0,
        심야: 0,
        '연장+심야': 0,
        '특근+연장': 0,
        '특근+심야': 0,
        '특근+연장+심야': 0,
      };

      for (let day = 1; day <= daysInMonth; day++) {
        const attendanceData = getAttendanceForEmployee(
          emp.id,
          year,
          month + 1,
          day
        );
        if (attendanceData) {
          const dateStr = `${year}-${String(month + 1).padStart(
            2,
            '0'
          )}-${String(day).padStart(2, '0')}`;

          // categorizeWorkTime 함수를 사용하여 계산 (근태관리와 동일한 로직)
          if (attendanceData.checkIn && attendanceData.checkOut) {
            const categorized = categorizeWorkTime(
              attendanceData.checkIn,
              attendanceData.checkOut,
              emp,
              dateStr,
              isHoliday,
              excludeBreakTimes,
              roundDownToHalfHour,
              EXCLUDE_EXTRA_RANKS,
              EXCLUDE_TIME
            );

            // categorizeWorkTime이 반환한 값을 그대로 사용 (중복 계산 방지)
            overtimeTypes.조출 += categorized.조출 || 0;
            overtimeTypes.연장 += categorized.연장 || 0;
            overtimeTypes.특근 += categorized.특근 || 0;
            overtimeTypes.심야 += categorized.심야 || 0;
            overtimeTypes['연장+심야'] += categorized['연장+심야'] || 0;
            overtimeTypes['특근+연장'] += categorized['특근+연장'] || 0;
            overtimeTypes['특근+심야'] += categorized['특근+심야'] || 0;
            overtimeTypes['특근+연장+심야'] +=
              categorized['특근+연장+심야'] || 0;
          }
        }
      }

      // categorizeWorkTime에서 반환된 복합 타입 값을 그대로 사용
      // (근태관리와 동일하게 루프 종료 후 재계산하지 않음)

      const totalOvertimeHours = Object.values(overtimeTypes).reduce(
        (sum, h) => sum + h,
        0
      );

      if (totalOvertimeHours > 0) {
        detailData.push({
          employeeName: emp.name,
          payType: emp.payType || '월급',
          조출: Math.round(overtimeTypes.조출 * 10) / 10,
          연장: Math.round(overtimeTypes.연장 * 10) / 10,
          특근: Math.round(overtimeTypes.특근 * 10) / 10,
          심야: Math.round(overtimeTypes.심야 * 10) / 10,
          '연장+심야': Math.round(overtimeTypes['연장+심야'] * 10) / 10,
          '특근+연장': Math.round(overtimeTypes['특근+연장'] * 10) / 10,
          '특근+심야': Math.round(overtimeTypes['특근+심야'] * 10) / 10,
          '특근+연장+심야':
            Math.round(overtimeTypes['특근+연장+심야'] * 10) / 10,
          value: Math.round(totalOvertimeHours * 10) / 10,
        });
      }
    });

    detailData.sort((a, b) => {
      if (a.payType !== b.payType) {
        return a.payType.localeCompare(b.payType);
      }
      if (a.value !== b.value) {
        return b.value - a.value;
      }
      return a.employeeName.localeCompare(b.employeeName);
    });
  } else if (metric === '연차 사용률') {
    filteredEmps.forEach((emp) => {
      const approvedLeaves = leaveRequests.filter((req) => {
        if (req.status !== '승인' || req.employeeId !== emp.id) return false;
        if (
          !req.type ||
          (!req.type.includes('연차') && !req.type.includes('반차'))
        )
          return false;

        const leaveDate = new Date(req.startDate);
        return (
          leaveDate.getFullYear() === year && leaveDate.getMonth() === month
        );
      });

      approvedLeaves.forEach((leave) => {
        const days = leave.approvedDays || 1;
        detailData.push({
          employeeName: emp.name,
          date: leave.startDate,
          value: days,
          leaveType: leave.type || '연차',
        });
      });
    });

    detailData.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.employeeName.localeCompare(b.employeeName);
    });
  } else if (metric === '주 52시간 위반') {
    filteredEmps.forEach((emp) => {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);

      let currentWeekStart = new Date(monthStart);

      const dayOfWeek = currentWeekStart.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      currentWeekStart.setDate(currentWeekStart.getDate() + daysToMonday);

      while (currentWeekStart <= monthEnd) {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6); // 일요일까지

        let weeklyMinutes = 0;

        for (
          let d = new Date(currentWeekStart);
          d <= weekEnd;
          d.setDate(d.getDate() + 1)
        ) {
          if (d < monthStart || d > monthEnd) continue; // 해당 월 범위 확인

          const attendanceData = getAttendanceForEmployee(
            emp.id,
            d.getFullYear(),
            d.getMonth() + 1,
            d.getDate()
          );

          if (
            attendanceData &&
            attendanceData.checkIn &&
            attendanceData.checkOut
          ) {
            const dailyWage = calcDailyWage(
              attendanceData.checkIn,
              attendanceData.checkOut,
              emp.workType || 'day',
              `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
                2,
                '0'
              )}-${String(d.getDate()).padStart(2, '0')}`
            );
            weeklyMinutes += dailyWage.totalWorkMinutes || 0;
          }
        }

        const weeklyHours = weeklyMinutes / 60;
        if (weeklyHours > 52) {
          const weekStartStr = `${currentWeekStart.getFullYear()}-${String(
            currentWeekStart.getMonth() + 1
          ).padStart(2, '0')}-${String(currentWeekStart.getDate()).padStart(
            2,
            '0'
          )}`;
          const weekEndStr = `${weekEnd.getFullYear()}-${String(
            weekEnd.getMonth() + 1
          ).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;

          detailData.push({
            employeeName: emp.name,
            weekPeriod: `${weekStartStr} ~ ${weekEndStr}`,
            violationHours: Math.round((weeklyHours - 52) * 100) / 100,
            weekStart: currentWeekStart.getTime(), // 정렬용
          });
        }

        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      }
    });

    detailData.sort((a, b) => {
      const nameCompare = a.employeeName.localeCompare(b.employeeName);
      if (nameCompare !== 0) return nameCompare;
      return a.weekStart - b.weekStart;
    });
  } else if (metric === '스트레스 지수') {
    // 스트레스 지수 상세 데이터 (신규 6개 구성요소)
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    filteredEmps.forEach((emp) => {
      let stressScore = 0;
      let hasWorkData = false;
      const stressDetails = {
        근무시간: 0,
        연차사용률: 0,
        정시퇴근율: 0,
        건의사항승인률: 0,
        '야간/연속근무': 0,
        근태안정: 0,
      };

      // === 1. 근무시간 (30점) - 해당월 주별 평균 ===
      let weeklyHoursList = [];
      let currentWeekMinutes = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const attendanceData = getAttendanceForEmployee(
          emp.id,
          year,
          month + 1,
          day
        );

        if (
          attendanceData &&
          attendanceData.checkIn &&
          attendanceData.checkOut
        ) {
          hasWorkData = true;
          const dailyWage = calcDailyWage(
            attendanceData.checkIn,
            attendanceData.checkOut,
            emp.workType || 'day',
            `${year}-${String(month + 1).padStart(2, '0')}-${String(
              day
            ).padStart(2, '0')}`
          );
          currentWeekMinutes += dailyWage.totalWorkMinutes || 0;
        }

        const dayOfWeek = new Date(year, month, day).getDay();
        // 일요일(0) 또는 마지막 날이면 주 단위 계산
        if (dayOfWeek === 0 || day === daysInMonth) {
          if (currentWeekMinutes > 0) {
            weeklyHoursList.push(currentWeekMinutes / 60);
          }
          currentWeekMinutes = 0;
        }
      }

      if (!hasWorkData) {
        return; // 근무 데이터 없으면 스킵
      }

      // 주별 평균 근무시간
      const avgWeeklyHours =
        weeklyHoursList.length > 0
          ? weeklyHoursList.reduce((a, b) => a + b, 0) / weeklyHoursList.length
          : 0;

      if (avgWeeklyHours >= 52) {
        stressDetails.근무시간 = 30;
      } else if (avgWeeklyHours >= 46) {
        stressDetails.근무시간 = 20;
      } else if (avgWeeklyHours >= 40) {
        stressDetails.근무시간 = 10;
      }
      // 40시간 미만: 0점

      // === 2. 연차사용률 (20점) - 연초부터 누적 ===
      if (calculateAnnualLeave) {
        // 연초부터 해당월까지 사용한 연차 계산
        const yearStart = new Date(year, 0, 1);
        const usedLeave = leaveRequests
          .filter((lr) => {
            if (lr.employeeId !== emp.id || lr.status !== '승인') return false;
            if (
              !lr.type ||
              (!lr.type.includes('연차') && !lr.type.includes('반차'))
            )
              return false;
            const leaveDate = new Date(lr.startDate);
            return leaveDate >= yearStart && leaveDate <= monthEnd;
          })
          .reduce((sum, lr) => {
            if (lr.type === '연차') {
              return sum + (lr.approvedDays || 1);
            } else if (lr.type.includes('반차')) {
              return sum + 0.5;
            }
            return sum;
          }, 0);

        const totalLeave = calculateAnnualLeave(emp.joinDate);
        const leaveUsageRate =
          totalLeave > 0 ? (usedLeave / totalLeave) * 100 : 0;

        if (leaveUsageRate < 20) {
          stressDetails.연차사용률 = 20;
        } else if (leaveUsageRate < 40) {
          stressDetails.연차사용률 = 15;
        } else if (leaveUsageRate < 60) {
          stressDetails.연차사용률 = 10;
        } else if (leaveUsageRate < 80) {
          stressDetails.연차사용률 = 5;
        }
        // 80% 이상: 0점
      }

      // === 3. 정시퇴근율 (20점) - 해당월 기준 ===
      let workDays = 0;
      let onTimeCheckouts = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const attendanceData = getAttendanceForEmployee(
          emp.id,
          year,
          month + 1,
          day
        );

        if (
          attendanceData &&
          attendanceData.checkIn &&
          attendanceData.checkOut
        ) {
          workDays++;

          const checkInTime = attendanceData.checkIn;
          const checkOutTime = attendanceData.checkOut;

          // 출근시간으로 주간/야간 판정
          const checkInMinutes =
            parseInt(checkInTime.split(':')[0]) * 60 +
            parseInt(checkInTime.split(':')[1]);
          const isDayShift = checkInMinutes >= 180 && checkInMinutes < 900; // 03:00-15:00

          // 정시퇴근 판정
          const checkOutMinutes =
            parseInt(checkOutTime.split(':')[0]) * 60 +
            parseInt(checkOutTime.split(':')[1]);

          if (isDayShift) {
            // 주간: 18:00 이전 퇴근
            if (checkOutMinutes <= 1080) {
              // 18:00 = 1080분
              onTimeCheckouts++;
            }
          } else {
            // 야간: 04:30 이전 퇴근 (270분)
            if (checkOutMinutes <= 270) {
              onTimeCheckouts++;
            }
          }
        }
      }

      const onTimeRate = workDays > 0 ? (onTimeCheckouts / workDays) * 100 : 0;

      if (onTimeRate < 20) {
        stressDetails.정시퇴근율 = 20;
      } else if (onTimeRate < 40) {
        stressDetails.정시퇴근율 = 15;
      } else if (onTimeRate < 60) {
        stressDetails.정시퇴근율 = 10;
      } else if (onTimeRate < 80) {
        stressDetails.정시퇴근율 = 5;
      }
      // 80% 이상: 0점

      // === 4. 건의사항 승인률 (10점) - 해당월 기준 ===
      if (Array.isArray(suggestions)) {
        const mySuggestions = suggestions.filter((sug) => {
          const isEmpSuggestion =
            sug.employeeId === emp.id || sug.employeeId === emp.employeeNumber;
          if (!isEmpSuggestion) return false;
          const sugDate = new Date(sug.createdAt || sug.date);
          return sugDate >= monthStart && sugDate <= monthEnd;
        });

        if (mySuggestions.length > 0) {
          const approvedCount = mySuggestions.filter(
            (sug) => sug.status === '승인'
          ).length;
          const approvalRate = (approvedCount / mySuggestions.length) * 100;

          if (approvalRate < 25) {
            stressDetails.건의사항승인률 = 10;
          } else if (approvalRate < 50) {
            stressDetails.건의사항승인률 = 7;
          } else if (approvalRate < 75) {
            stressDetails.건의사항승인률 = 3;
          }
          // 75% 이상: 0점
        }
        // 건의사항 없으면: 0점
      }

      // === 5. 야간/연속근무 (10점) - 해당월 기준 ===
      // 5-1. 야간근무 횟수 (주간/야간 시프터만)
      let nightWorkCount = 0;
      let shiftPattern = { day: 0, night: 0 }; // 출근 패턴 분석

      for (let day = 1; day <= daysInMonth; day++) {
        const attendanceData = getAttendanceForEmployee(
          emp.id,
          year,
          month + 1,
          day
        );

        if (attendanceData && attendanceData.checkIn) {
          const checkInMinutes =
            parseInt(attendanceData.checkIn.split(':')[0]) * 60 +
            parseInt(attendanceData.checkIn.split(':')[1]);

          // 출근 패턴 분류
          if (checkInMinutes >= 180 && checkInMinutes < 900) {
            shiftPattern.day++; // 03:00-15:00: 주간
          } else {
            shiftPattern.night++; // 15:00-03:00: 야간
          }

          // 야간 출근 카운트 (15:00-03:00)
          if (checkInMinutes >= 900 || checkInMinutes < 180) {
            nightWorkCount++;
          }
        }
      }

      // 주간/야간 시프터 판정: 둘 다 하면 시프터
      const isShiftWorker = shiftPattern.day > 0 && shiftPattern.night > 0;

      if (isShiftWorker && nightWorkCount >= 15) {
        stressDetails['야간/연속근무'] += 5;
      }

      // 5-2. 연속근무일수
      let maxConsecutiveDays = 0;
      let currentConsecutiveDays = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const attendanceData = getAttendanceForEmployee(
          emp.id,
          year,
          month + 1,
          day
        );

        if (attendanceData && attendanceData.checkIn) {
          currentConsecutiveDays++;
          maxConsecutiveDays = Math.max(
            maxConsecutiveDays,
            currentConsecutiveDays
          );
        } else {
          currentConsecutiveDays = 0;
        }
      }

      if (maxConsecutiveDays >= 7) {
        stressDetails['야간/연속근무'] += 5;
      }

      // === 6. 근태안정성 (10점) - 해당월 기준 ===
      let lateCount = 0;
      let absentCount = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const attendanceData = getAttendanceForEmployee(
          emp.id,
          year,
          month + 1,
          day
        );

        if (attendanceData) {
          if (attendanceData.checkIn) {
            const checkInMinutes =
              parseInt(attendanceData.checkIn.split(':')[0]) * 60 +
              parseInt(attendanceData.checkIn.split(':')[1]);
            const isDayShift = checkInMinutes >= 180 && checkInMinutes < 900;

            // 지각 판정
            if (isDayShift) {
              // 주간: 08:31 이후 출근
              if (checkInMinutes > 510) {
                // 08:30 = 510분
                lateCount++;
              }
            } else {
              // 야간: 19:01 이후 출근
              if (checkInMinutes > 1140 && checkInMinutes < 1440) {
                // 19:00 = 1140분
                lateCount++;
              }
            }
          } else if (!attendanceData.checkOut) {
            // 출근도 퇴근도 없으면 결근 (연차 제외)
            // TODO: 연차인지 확인 로직 필요
            absentCount++;
          }
        }
      }

      if (lateCount >= 3) {
        stressDetails.근태안정 += 5;
      }

      if (absentCount >= 1) {
        stressDetails.근태안정 += 5;
      }

      // 총 스트레스 점수 계산
      stressScore = Object.values(stressDetails).reduce(
        (sum, val) => sum + val,
        0
      );
      stressScore = Math.min(100, stressScore);

      detailData.push({
        employeeName: emp.name,
        department: emp.department || '-',
        position: emp.position || '-',
        value: Math.round(stressScore),
        근무시간: stressDetails.근무시간,
        연차사용률: stressDetails.연차사용률,
        정시퇴근율: stressDetails.정시퇴근율,
        건의사항승인률: stressDetails.건의사항승인률,
        '야간/연속근무': stressDetails['야간/연속근무'],
        근태안정: stressDetails.근태안정,
      });
    });

    detailData.sort((a, b) => {
      if (a.value !== b.value) {
        return b.value - a.value; // 높은 스트레스 순
      }
      return a.employeeName.localeCompare(b.employeeName);
    });
  }

  return detailData;
};

/**
 * 목표달성률 상세 데이터 조회 함수
 * @param {number} year - 조회 연도
 * @param {number} month - 조회 월 (0-11)
 * @param {string} metric - 조회 지표 ('출근률', '지각률', '결근률', '퇴사율')
 * @param {Array} employees - 전체 직원 목록
 * @param {Function} getAttendanceForEmployee - 직원 출근 데이터 조회 함수
 * @param {Function} analyzeAttendanceStatusForDashboard - 출근 상태 분석 함수
 * @param {Function} isHolidayDate - 공휴일 확인 함수
 * @returns {Array} 목표달성률 상세 데이터 배열
 */
export const getGoalDetailDataUtil = (
  year,
  month,
  metric,
  employees,
  getAttendanceForEmployee,
  analyzeAttendanceStatusForDashboard,
  isHolidayDate,
  leaveRequests = []
) => {
  const detailData = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const filteredEmps = employees.filter(
    (e) => !['이철균', '이현주'].includes(e.name)
  );

  let filteredData = [];

  if (metric === '퇴사율') {
    filteredData = filteredEmps
      .filter((emp) => {
        if (emp.status === '퇴사' && emp.leaveDate) {
          const resignDate = new Date(emp.leaveDate);
          return (
            resignDate.getFullYear() === year && resignDate.getMonth() === month
          );
        }
        return false;
      })
      .map((emp) => ({
        date: emp.leaveDate,
        employeeName: emp.name,
        status: '퇴사',
        checkIn: '',
      }));
    if (filteredData.length === 0) {
      return [{ text: '퇴사자 없음' }];
    }
  } else {
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isPublicHoliday = isHolidayDate(year, month + 1, day);

      // 주말/공휴일 제외
      if (isWeekend || isPublicHoliday) {
        continue;
      }

      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
        day
      ).padStart(2, '0')}`;

      // 해당 일자에 연차/반차/공가/경조/휴직/기타 승인받은 직원 찾기
      const onLeaveToday = leaveRequests
        .filter((lr) => {
          if (lr.status !== '승인') return false;
          const leaveType = lr.leaveType || lr.type;
          if (
            ![
              '연차',
              '반차(오전)',
              '반차(오후)',
              '공가',
              '경조',
              '휴직',
              '기타',
            ].includes(leaveType)
          ) {
            return false;
          }

          const startDate = lr.startDate.split('T')[0];
          const endDate = lr.endDate.split('T')[0];
          return dateStr >= startDate && dateStr <= endDate;
        })
        .map((lr) => lr.employeeId);

      // 해당 일자에 결근(승인)인 직원 찾기
      const absentApprovedToday = leaveRequests.filter((lr) => {
        if (lr.status !== '승인') return false;
        const leaveType = lr.leaveType || lr.type;
        if (leaveType !== '결근') return false;

        const startDate = lr.startDate.split('T')[0];
        const endDate = lr.endDate.split('T')[0];
        return dateStr >= startDate && dateStr <= endDate;
      });

      filteredEmps.forEach((emp) => {
        // 모든 지표에서 연차자 제외
        if (onLeaveToday.includes(emp.id)) {
          return;
        }

        const workType = emp.workType || '주간';

        // 1. 당일 및 전날 출근 데이터 확인
        const todayAttendanceData = getAttendanceForEmployee(
          emp.id,
          year,
          month + 1,
          day
        );
        const yesterday = new Date(year, month, day - 1);
        const yesterdayAttendanceData = getAttendanceForEmployee(
          emp.id,
          yesterday.getFullYear(),
          yesterday.getMonth() + 1,
          yesterday.getDate()
        );

        // 2. 출근시간 기준으로 실제 시프트 판정 (1순위: 출근시간, 2순위: workType)
        let actualShift = null;
        let checkYear = year;
        let checkMonth = month + 1;
        let checkDay = day;
        let attendanceData = null;

        // 우선순위 1: 전날 데이터에서 야간 출근 확인
        if (yesterdayAttendanceData && yesterdayAttendanceData.checkIn) {
          const checkInMinutes = timeToMinutes(yesterdayAttendanceData.checkIn);
          if (checkInMinutes < 180 || checkInMinutes >= 900) {
            actualShift = '야간';
            checkYear = yesterday.getFullYear();
            checkMonth = yesterday.getMonth() + 1;
            checkDay = yesterday.getDate();
            attendanceData = yesterdayAttendanceData;
          }
        }

        // 우선순위 2: 전날에 야간 출근이 없으면 당일 출근 확인
        if (
          !actualShift &&
          todayAttendanceData &&
          todayAttendanceData.checkIn
        ) {
          const checkInMinutes = timeToMinutes(todayAttendanceData.checkIn);
          // 당일 03시~15시 출근 = 오늘 주간 근무
          if (checkInMinutes >= 180 && checkInMinutes < 900) {
            actualShift = '주간';
            attendanceData = todayAttendanceData;
          }
          // 당일 15시 이후 또는 03시 이전 출근 = 오늘 야간 근무 시작
          else if (checkInMinutes >= 900 || checkInMinutes < 180) {
            actualShift = '야간';
            attendanceData = todayAttendanceData;
          }
        }

        // 우선순위 3: 출근 데이터가 없으면 workType으로 판정 (단, 시프터는 주간으로 기본 처리)
        if (!actualShift) {
          if (workType === '야간') {
            actualShift = '야간';
            checkYear = yesterday.getFullYear();
            checkMonth = yesterday.getMonth() + 1;
            checkDay = yesterday.getDate();
            attendanceData = yesterdayAttendanceData;
          } else if (workType === '주간/야간') {
            // 시프터는 출근 시간으로만 판단 (출근 데이터 없으면 주간으로 기본 처리)
            actualShift = '주간';
            attendanceData = todayAttendanceData;
          } else {
            actualShift = '주간';
            attendanceData = todayAttendanceData;
          }
        }

        // 상태 판정 (목표달성률 전용 로직)
        let status = '';

        // 결근 판정: 1) 결근 승인 OR 2) 출근+퇴근 둘 다 없음
        const hasAbsentApproval = absentApprovedToday.some(
          (lr) => lr.employeeId === emp.id
        );
        const isAbsent =
          hasAbsentApproval ||
          !attendanceData ||
          (!attendanceData.checkIn && !attendanceData.checkOut);

        if (isAbsent) {
          status = '결근';
        } else {
          // 출근 데이터가 있으면 지각 여부 판정
          const checkInMinutes = attendanceData.checkIn
            ? timeToMinutes(attendanceData.checkIn)
            : null;

          if (checkInMinutes !== null) {
            // 지각 기준: 주간 08:31 이후, 야간 19:01 이후
            const isLate =
              (actualShift === '주간' && checkInMinutes > 511) || // 08:31 = 511분
              (actualShift === '야간' && checkInMinutes > 1141); // 19:01 = 1141분

            status = isLate ? '지각' : '출근';
          } else {
            // checkIn이 없으면 출근으로 간주 (checkOut만 있는 경우)
            status = '출근';
          }
        }

        // 지표별 필터링
        let shouldAdd = false;
        if (metric === '출근률' && status === '출근') {
          shouldAdd = true;
        } else if (metric === '지각률' && status === '지각') {
          shouldAdd = true;
        } else if (metric === '결근률' && status === '결근') {
          shouldAdd = true;
        }

        if (shouldAdd) {
          filteredData.push({
            date: dateStr,
            employeeName: emp.name,
            status: status,
            checkIn: attendanceData?.checkIn || '',
          });
        }
      });
    }

    if (metric === '결근률' && filteredData.length === 0) {
      return [{ text: '결근 데이터 없음' }];
    }
  }

  const groupedByDate = {};
  filteredData.forEach((item) => {
    const date = item.date;
    if (!groupedByDate[date]) {
      groupedByDate[date] = {
        employees: [],
        status: item.status,
      };
    }
    groupedByDate[date].employees.push({
      name: item.employeeName,
      checkIn: item.checkIn || '',
    });
  });

  Object.keys(groupedByDate)
    .sort()
    .forEach((date) => {
      const group = groupedByDate[date];

      const formattedDate = date.replace(/-/g, '/');

      let employeeList;
      if (metric === '지각률') {
        employeeList = group.employees
          .map((emp) => `${emp.name}(${emp.checkIn})`)
          .join(', ');
      } else {
        employeeList = group.employees.map((emp) => emp.name).join(', ');
      }

      detailData.push({
        text: `${formattedDate} - ${employeeList} (${group.employees.length}명) - ${group.status}`,
      });
    });

  return detailData;
};

// ============================================================
// [2_관리자 모드] 2.1_대시보드 - EXPORTS (update-only)
// ============================================================

// Hook exports
// - useDashboardStats
// - useSafetyManagement
// - useDashboardActions
// - useDashboardCalculations
// - useDashboardAttendance

// Service exports
// - send52HourViolationAlert

// Util exports
// - calculateMonthlyAttendanceRate
// - calculateCompanyStats
// - getEmployeesByStatus
// - getSortedAttendanceEmployees
// - calculateAttendanceRateUtil
// - calculateLateRateUtil
// - calculateAbsentRateUtil
// - calculateTurnoverRateUtil
// - calculateAverageOvertimeHoursUtil
// - calculateLeaveUsageRateUtil
// - calculateMonthlyLeaveUsageRateUtil
// - calculateWeekly52HoursViolationUtil
// - calculateStressIndexUtil
// - getGoalDataByYearUtil
// - getWorkLifeBalanceDataByYearUtil
// - getViolationDetailsUtil
// - getWorkLifeDetailDataUtil
// - getGoalDetailDataUtil
