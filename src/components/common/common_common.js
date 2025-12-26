/**
 * [1_공통] 공통 통합 모듈
 * - Constants → Hook → Service → Util → Export
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import Holidays from 'date-holidays';
import EmployeeAPI from '../../api/employee';
import PayrollAPI from '../../api/payroll';

// ============================================================
// [1_공통] CONSTANTS - 회사 표준 규정 및 근무시간
// ============================================================

/**
 * API 엔드포인트 URL
 */
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

/**
 * 공통 근무시간 규정 및 회사 표준 상수
 * - 교대 근무 시간 정의
 * - 회사 조직 구조 (부서, 직급, 직책)
 * - 급여 항목 정의
 * - 상태 색상 정의
 */

/**
 * 교대 근무 시간 정의
 */
export const SHIFT_TYPES = {
  DAY: { start: '08:30', end: '17:30', name: '주간' },
  NIGHT: { start: '19:00', end: '04:00', name: '야간' },
  OT: { start: '18:00', end: '22:00', name: '잔업' },
};

/**
 * 회사 표준 규정값 상수
 */
export const COMPANY_STANDARDS = {
  POSITIONS: [
    '사원',
    '주임',
    '대리',
    '과장',
    '차장',
    '부장',
    '이사',
    '상무',
    '전무',
    '부대표',
    '대표',
  ],
  DEPARTMENTS: [
    '대표',
    '임원',
    '가공',
    '관리',
    '영업',
    '생산관리',
    '생산',
    '품질',
    '출하',
  ],
  ROLES: ['팀원', '조장', '반장', '팀장', '임원', '대표'],
  WORK_TYPES: ['주간', '야간', '주간/야간'],
  PAY_TYPES: ['연봉', '시급'],
  SUB_DEPARTMENTS: [
    '대표',
    '임원',
    '가공',
    '관리',
    '영업',
    '생산관리',
    '품질',
    '출하',
    '열',
    '표면',
    '구부',
    '인발',
    '교정/절단',
    '검사',
    '금형',
    '공무',
  ],
};

/**
 * 급여 항목 순서 정의 (관리자 모드 테이블 순서와 동일)
 */
export const PAYROLL_INCOME_ITEMS = [
  '기본급',
  '연장수당',
  '휴일근로수당',
  '야간근로수당',
  '지각/조퇴',
  '결근/무급/주휴',
  '차량',
  '교통비',
  '통신비',
  '기타수당',
  '년차수당',
  '상여금',
];

/**
 * 급여 공제 항목 정의
 */
export const PAYROLL_DEDUCTION_ITEMS = [
  '소득세',
  '지방세',
  '국민연금',
  '건강보험',
  '장기요양',
  '고용보험',
  '가불금(과태료)',
  '매칭IRP적립',
  '경조비(기타공제)',
  '기숙사',
  '건강보험연말정산',
  '장기요양연말정산',
  '연말정산징수세액',
];

/**
 * 상태 색상 정의 (Tailwind CSS 클래스)
 */
export const STATUS_COLORS = {
  승인: 'bg-blue-100 text-blue-800',
  대기: 'bg-yellow-100 text-yellow-800',
  취소: 'bg-gray-100 text-gray-800',
  반려: 'bg-red-100 text-red-800',
  완료: 'bg-green-100 text-green-800',
  예정: 'bg-orange-100 text-orange-800',
};

/**
 * 휴게시간 정의 (급여 계산 시 제외)
 */
export const EXCLUDE_TIME = [
  { start: '12:00', end: '13:00' }, // 점심시간
  { start: '17:30', end: '18:00' }, // 저녁시간
  { start: '00:00', end: '01:00' }, // 야식시간
];

/**
 * 급여 계산 제외 직급
 * 현재 미적용 (모든 직급에 대해 조출~특근+연장 계산)
 * 나중에 적용 시: ['대표', '부대표', '전무', '상무', '이사']
 */
export const EXCLUDE_EXTRA_RANKS = []; // 빈 배열 = 모든 직급 계산

/**
 * 근무시간 규정 (급여형태 + 근무형태별)
 */
export const WORK_RULES = {
  연봉_주간: {
    weekday: [
      { start: '08:30', end: '17:30', type: '기본' },
      { start: '22:00', end: '04:00', type: '연장+심야' },
    ],
    holiday: [
      // 휴일: 출근 시점부터 8시간까지 특근, 8시간 이후 특근+연장 (동적 계산)
    ],
  },
  시급_주간: {
    weekday: [
      { start: '04:00', end: '08:30', type: '조출' }, // 단, 07:30 이전 출근만 인정 (최소 1시간 조출)
      { start: '08:30', end: '17:30', type: '기본' },
      { start: '18:00', end: '22:00', type: '연장' },
      { start: '22:00', end: '04:00', type: '연장+심야' },
    ],
    holiday: [
      // 휴일: 출근 시점부터 8시간까지 특근, 8시간 이후 특근+연장 (동적 계산)
    ],
  },
  시급_야간: {
    weekday: [
      { start: '19:00', end: '22:00', type: '기본' },
      { start: '22:00', end: '04:00', type: '심야' },
      { start: '04:00', end: '06:00', type: '연장+심야' },
      { start: '06:00', end: '10:00', type: '연장' },
    ],
    holiday: [], // 야간 직원은 휴일 근무 거의 안함
  },
  '시급_주간/야간': {
    // 교대 근무 (주간/야간 혼용) - 출근 시간으로 자동 판정
    weekday: [
      // 주간 근무 시간대 (08:30 전후 출근)
      { start: '04:00', end: '08:30', type: '조출' }, // 단, 07:30 이전 출근만 인정 (최소 1시간 조출)
      { start: '08:30', end: '17:30', type: '기본' },
      { start: '18:00', end: '22:00', type: '연장' },
      // 야간 근무 시간대 (19:00 전후 출근)
      { start: '19:00', end: '22:00', type: '기본' },
      { start: '22:00', end: '04:00', type: '심야' },
      { start: '04:00', end: '06:00', type: '연장+심야' },
      { start: '06:00', end: '10:00', type: '연장' },
    ],
    holiday: [
      // 휴일: 출근 시점부터 8시간까지 특근, 8시간 이후 특근+연장 (동적 계산)
    ],
  },
};

/**
 * 휴게시간 이름 반환 함수
 */
export function getBreakTimeName(time) {
  if (time.start === '12:00') return '점심시간';
  if (time.start === '17:30') return '저녁시간';
  if (time.start === '00:00') return '야식시간';
  return '휴게시간';
}

/**
 * 근무규칙 형식 변환 함수
 */
export function convertToOldFormat(workRules) {
  return {
    weekday: {
      earlyWork: {
        start: '04:00',
        end: '08:30',
        multiplier: 1.5,
        name: '조출',
      },
      regular: {
        start: '08:30',
        end: '17:30',
        multiplier: 1.0,
        name: '기본',
      },
      overtime: {
        start: '18:00',
        end: '22:00',
        multiplier: 1.5,
        name: '연장',
      },
      nightOvertme: {
        start: '22:00',
        end: '04:00',
        multiplier: 2.0,
        name: '연장+심야',
      },
    },
    nightShift: {
      regular: {
        start: '19:00',
        end: '22:00',
        multiplier: 1.0,
        name: '기본',
      },
      night: { start: '22:00', end: '04:00', multiplier: 1.5, name: '심야' },
      nightOvertime: {
        start: '04:00',
        end: '06:00',
        multiplier: 2.0,
        name: '연장+심야',
      },
      overtime: {
        start: '06:00',
        end: '10:00',
        multiplier: 1.5,
        name: '연장',
      },
    },
    holiday: {
      regular: {
        // 출근 시점부터 8시간까지 특근 (동적 계산)
        multiplier: 1.0,
        name: '특근',
      },
      overtime: {
        // 8시간 이후부터 특근+연장 (동적 계산)
        multiplier: 1.5,
        name: '특근+연장',
      },
    },
  };
}

/**
 * 회사 임금 규정 (EXCLUDE_TIME은 App.js에서 주입 필요)
 */
export const createCompanyWageRules = (EXCLUDE_TIME) => ({
  baseWage: 9620,
  breakTimes: EXCLUDE_TIME.map((time) => ({
    ...time,
    name: getBreakTimeName(time),
  })),
  workTimeRules: convertToOldFormat(WORK_RULES),
});

/**
 * 시간 문자열을 분 단위로 변환
 */
export const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * 분을 시간 문자열로 변환
 */
export const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

/**
 * 0.5시간 단위로 내림하는 함수 (0~29분=0, 30~59분=0.5)
 * @param {number} hours - 시간 (소수점 포함)
 * @returns {number} 0.5시간 단위로 내림된 시간
 */
export const roundDownToHalfHour = (hours) => {
  // 시간과 분 분리
  const wholeHours = Math.floor(hours);
  const minutes = (hours - wholeHours) * 60;

  // 0~29분 = 0, 30~59분 = 0.5
  const roundedMinutes = minutes < 30 ? 0 : 0.5;

  return wholeHours + roundedMinutes;
};

/**
 * 야간 근무용 시간 변환 함수 (자정 넘김 처리)
 */
export const timeToMinutesNight = (timeStr, isEndTime = false) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;

  // 퇴근시간이고 04:00-10:00 사이면 다음날로 처리
  if (isEndTime && hours >= 0 && hours <= 10) {
    return totalMinutes + 24 * 60; // 다음날로 처리
  }

  return totalMinutes;
};

/**
 * 야간 근무 시간 겹침 계산 함수
 */
export const calculateNightShiftOverlap = (
  workStart,
  workEnd,
  ruleStart,
  ruleEnd
) => {
  let overlapMinutes = 0;

  if (ruleStart <= ruleEnd) {
    // 같은 날 내 구간 (예: 19:00-22:00)
    const overlapStart = Math.max(workStart, ruleStart);
    const overlapEnd = Math.min(workEnd, ruleEnd);
    if (overlapStart < overlapEnd) {
      overlapMinutes = overlapEnd - overlapStart;
    }
  } else {
    // 자정을 넘나드는 구간 (예: 22:00-04:00)

    // Case 1: 당일 22:00-24:00 부분
    if (workStart < 24 * 60 && ruleStart < 24 * 60) {
      const dayOverlapStart = Math.max(workStart, ruleStart);
      const dayOverlapEnd = Math.min(workEnd, 24 * 60);
      if (dayOverlapStart < dayOverlapEnd) {
        overlapMinutes += dayOverlapEnd - dayOverlapStart;
      }
    }

    // Case 2: 다음날 00:00-04:00 부분
    if (workEnd > 24 * 60) {
      const nextDayRuleEnd = ruleEnd + 24 * 60;
      const nextDayOverlapStart = Math.max(workStart, 24 * 60);
      const nextDayOverlapEnd = Math.min(workEnd, nextDayRuleEnd);
      if (nextDayOverlapStart < nextDayOverlapEnd) {
        overlapMinutes += nextDayOverlapEnd - nextDayOverlapStart;
      }
    }
  }

  return overlapMinutes;
};

/**
 * 야간 근무 휴게시간 제외 함수
 */
export const excludeBreakTimesNight = (workStart, workEnd, breakTimes) => {
  let totalBreakMinutes = 0;

  breakTimes.forEach((breakTime) => {
    const breakStart = timeToMinutes(breakTime.start);
    const breakEnd = timeToMinutes(breakTime.end);

    // 휴게시간이 자정을 넘나드는 경우 처리 (야식시간 00:00-01:00)
    if (breakStart === 0 && breakEnd === 60) {
      // 00:00-01:00
      const nightBreakStart = 24 * 60; // 다음날 00:00
      const nightBreakEnd = 24 * 60 + 60; // 다음날 01:00

      const overlapStart = Math.max(workStart, nightBreakStart);
      const overlapEnd = Math.min(workEnd, nightBreakEnd);

      if (overlapStart < overlapEnd) {
        totalBreakMinutes += overlapEnd - overlapStart;
      }
    } else {
      // 일반 휴게시간 처리
      const overlapStart = Math.max(workStart, breakStart);
      const overlapEnd = Math.min(workEnd, breakEnd);

      if (overlapStart < overlapEnd) {
        totalBreakMinutes += overlapEnd - overlapStart;
      }
    }
  });

  return totalBreakMinutes;
};

/**
 * 직급/급여형태에 따른 근무시간 분류 함수
 * @param {string} checkIn - 출근 시간
 * @param {string} checkOut - 퇴근 시간
 * @param {object} employee - 직원 정보
 * @param {string} date - 날짜
 * @param {function} isHoliday - 공휴일 판정 함수
 * @param {function} excludeBreakTimes - 휴게시간 제외 함수
 * @param {function} roundDownToHalfHour - 0.5시간 단위 내림 함수
 * @param {array} EXCLUDE_EXTRA_RANKS - 연장/특근 제외 직급
 * @param {array} EXCLUDE_TIME - 휴게시간 목록
 */
export const categorizeWorkTime = (
  checkIn,
  checkOut,
  employee,
  date,
  isHoliday,
  excludeBreakTimes,
  roundDownToHalfHour,
  EXCLUDE_EXTRA_RANKS,
  EXCLUDE_TIME
) => {
  if (!checkIn || !checkOut || !employee) {
    return {
      기본: 0,
      조출: 0,
      연장: 0,
      특근: 0,
      심야: 0,
      '연장+심야': 0,
      '특근+연장': 0,
      '특근+심야': 0,
      '특근+연장+심야': 0,
      '특근+조출': 0,
    };
  }

  // 1. 적용직급 확인 - 특정 직급은 기본만 적용 (현재 미적용: EXCLUDE_EXTRA_RANKS = [])
  if (EXCLUDE_EXTRA_RANKS.includes(employee.position || employee.직급 || '')) {
    const startMinutes = timeToMinutes(checkIn);
    const endMinutes = timeToMinutes(checkOut);
    const totalWorkMinutes = endMinutes - startMinutes;
    const breakMinutes = excludeBreakTimes(
      startMinutes,
      endMinutes,
      EXCLUDE_TIME
    );
    const actualWorkMinutes = totalWorkMinutes - breakMinutes;

    return {
      기본: roundDownToHalfHour(actualWorkMinutes / 60),
      조출: 0,
      연장: 0,
      특근: 0,
      심야: 0,
      '연장+심야': 0,
      '조출+특근': 0,
      '특근+연장': 0,
      '특근+심야': 0,
      '특근+연장+심야': 0,
      '특근+조출': 0,
    };
  }

  // 2. 급여형태와 근무형태 결정
  const salaryType =
    employee.salaryType || employee.payType || employee.급여형태 || '시급';
  const workShift =
    employee.workType || employee.workShift || employee.근무형태 || '주간';
  const workRuleKey = `${salaryType}_${workShift}`;

  const workRule = WORK_RULES[workRuleKey];
  if (!workRule) {
    const startMinutes = timeToMinutes(checkIn);
    const endMinutes = timeToMinutes(checkOut);
    const totalWorkMinutes = endMinutes - startMinutes;
    const breakMinutes = excludeBreakTimes(
      startMinutes,
      endMinutes,
      EXCLUDE_TIME
    );
    const actualWorkMinutes = totalWorkMinutes - breakMinutes;

    return {
      기본: roundDownToHalfHour(actualWorkMinutes / 60),
      조출: 0,
      연장: 0,
      특근: 0,
      심야: 0,
      '연장+심야': 0,
      '조출+특근': 0,
      '특근+연장': 0,
      '특근+심야': 0,
      '특근+연장+심야': 0,
      '특근+조출': 0,
    };
  }

  // 3. 특근 판정: 토요일, 일요일, 공휴일 출근은 특근
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay(); // 0=일요일, 6=토요일
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 토요일 또는 일요일
  const isPublicHoliday = isHoliday(date); // 공휴일
  const isHolidayWork = isWeekend || isPublicHoliday; // 특근 대상일

  const timeRules = isHolidayWork ? workRule.holiday : workRule.weekday;
  const result = {
    기본: 0,
    조출: 0,
    연장: 0,
    특근: 0,
    심야: 0,
    '연장+심야': 0,
    '특근+연장': 0,
    '특근+심야': 0,
    '특근+연장+심야': 0,
    '특근+조출': 0,
  };

  if (workShift === '야간') {
    // 야간 근무자 전용 계산
    const workStart = timeToMinutes(checkIn);
    const workEnd = timeToMinutesNight(checkOut, true); // 퇴근시간은 다음날 처리

    timeRules.forEach((rule) => {
      const ruleStart = timeToMinutes(rule.start);
      const ruleEnd = timeToMinutes(rule.end);

      const overlapMinutes = calculateNightShiftOverlap(
        workStart,
        workEnd,
        ruleStart,
        ruleEnd
      );

      if (overlapMinutes > 0) {
        // 야간 근무 전용 휴게시간 제외
        const breakMinutes = excludeBreakTimesNight(
          Math.max(workStart, ruleStart <= ruleEnd ? ruleStart : ruleStart),
          Math.min(workEnd, ruleStart <= ruleEnd ? ruleEnd : ruleEnd + 24 * 60),
          EXCLUDE_TIME
        );

        const actualMinutes = Math.max(0, overlapMinutes - breakMinutes);
        if (actualMinutes > 0) {
          const hours = actualMinutes / 60;
          result[rule.type] = (result[rule.type] || 0) + hours;
        }
      }
    });
  } else {
    // 주간 근무자 로직
    const startMinutes = timeToMinutes(checkIn);
    const endMinutes = timeToMinutes(checkOut);

    // 휴일 근무: 연봉/시급 모두 출근 시점 기준 8시간까지 특근, 8시간 이후 특근+연장
    if (isHolidayWork) {
      const totalWorkMinutes = endMinutes - startMinutes;
      const breakMinutes = excludeBreakTimes(
        startMinutes,
        endMinutes,
        EXCLUDE_TIME
      );
      const actualWorkMinutes = totalWorkMinutes - breakMinutes;
      const actualWorkHours = actualWorkMinutes / 60;

      // 출근 시간부터 8시간까지는 특근, 8시간 이후는 특근+연장
      if (actualWorkHours <= 8) {
        result.특근 = actualWorkHours;
      } else {
        result.특근 = 8;
        result['특근+연장'] = actualWorkHours - 8;
      }
    } else {
      // 시급 직원 및 연봉 평일 근무는 기존 로직
      timeRules.forEach((rule) => {
        const ruleStart = timeToMinutes(rule.start);
        const ruleEnd = timeToMinutes(rule.end);

        const overlapStart = Math.max(startMinutes, ruleStart);
        const overlapEnd = Math.min(endMinutes, ruleEnd);

        if (overlapStart < overlapEnd) {
          const segmentMinutes = overlapEnd - overlapStart;
          const segmentBreak = excludeBreakTimes(
            overlapStart,
            overlapEnd,
            EXCLUDE_TIME
          );
          const actualSegmentMinutes = segmentMinutes - segmentBreak;

          if (actualSegmentMinutes > 0) {
            const hours = actualSegmentMinutes / 60;
            result[rule.type] = (result[rule.type] || 0) + hours;
          }
        }
      });
    }
  }

  // 조출 규정: 출근 시간이 07:30 이후면 조출 불인정 (최소 1시간 조출 필요)
  if (result.조출 > 0) {
    const checkInMinutes = timeToMinutes(checkIn);
    const earlyThreshold = 7 * 60 + 30; // 07:30 = 450분
    if (checkInMinutes > earlyThreshold) {
      result.조출 = 0;
    }
  }

  // 모든 시간 값을 0.5시간 단위로 내림 적용
  Object.keys(result).forEach((key) => {
    result[key] = roundDownToHalfHour(result[key]);
  });

  return result;
};

/**
 * 휴게시간 제외 함수
 * @param {number} startMinutes - 시작 시간 (분)
 * @param {number} endMinutes - 종료 시간 (분)
 * @param {Array} breakTimes - 휴게시간 배열
 * @returns {number} 제외할 휴게시간 (분)
 */
export const excludeBreakTimes = (startMinutes, endMinutes, breakTimes) => {
  let totalBreakMinutes = 0;

  breakTimes.forEach((breakTime) => {
    const breakStart = timeToMinutes(breakTime.start);
    const breakEnd = timeToMinutes(breakTime.end);

    // 근무시간과 휴게시간이 겹치는 부분 계산
    const overlapStart = Math.max(startMinutes, breakStart);
    const overlapEnd = Math.min(endMinutes, breakEnd);

    if (overlapStart < overlapEnd) {
      totalBreakMinutes += overlapEnd - overlapStart;
    }
  });

  return totalBreakMinutes;
};

/**
 * 일일 급여 계산 메인 함수
 * @param {string} startTime - 출근 시간
 * @param {string} endTime - 퇴근 시간
 * @param {string} workType - 근무 형태 (day/night)
 * @param {string} date - 날짜
 * @param {number} baseWage - 기본 시급
 * @param {Function} isHoliday - 공휴일 판정 함수
 * @param {Object} COMPANY_WAGE_RULES - 회사 임금 규정
 * @returns {Object} 급여 계산 결과
 */
export const calcDailyWage = (
  startTime,
  endTime,
  workType,
  date,
  baseWage,
  isHoliday,
  COMPANY_WAGE_RULES
) => {
  if (!startTime || !endTime) {
    return { totalWage: 0, breakTime: 0, workTime: 0, details: [] };
  }

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const isHolidayWork = isHoliday(date);

  // 근무시간이 다음날로 넘어가는 경우 처리
  let totalMinutes =
    endMinutes >= startMinutes
      ? endMinutes - startMinutes
      : 24 * 60 - startMinutes + endMinutes;

  // 휴게시간 제외
  const breakMinutes = excludeBreakTimes(
    startMinutes,
    endMinutes,
    COMPANY_WAGE_RULES.breakTimes
  );
  const actualWorkMinutes = totalMinutes - breakMinutes;

  let totalWage = 0;
  const wageDetails = [];

  // 휴일 근무: 출근 시점 기준 8시간까지 특근, 8시간 이후 특근+연장 (동적 계산)
  if (isHolidayWork) {
    const actualWorkHours = actualWorkMinutes / 60;

    if (actualWorkHours <= 8) {
      // 8시간 이하: 전체가 특근
      const wage = actualWorkHours * baseWage * 1.5;
      totalWage += wage;
      wageDetails.push({
        period: '특근',
        hours: actualWorkHours,
        wage: wage,
        multiplier: 1.5,
      });
    } else {
      // 8시간 초과: 8시간까지 특근, 이후 특근+연장
      const holidayWage = 8 * baseWage * 1.5;
      const overtimeHours = actualWorkHours - 8;
      const overtimeWage = overtimeHours * baseWage * 2.0;

      totalWage += holidayWage + overtimeWage;

      wageDetails.push({
        period: '특근',
        hours: 8,
        wage: holidayWage,
        multiplier: 1.5,
      });
      wageDetails.push({
        period: '특근+연장',
        hours: overtimeHours,
        wage: overtimeWage,
        multiplier: 2.0,
      });
    }

    return {
      totalWage: Math.round(totalWage),
      breakTime: breakMinutes / 60,
      workTime: actualWorkMinutes / 60,
      details: wageDetails,
      regularHours: 0,
      earlyHours: 0,
      overtimeHours: 0,
      holidayHours: actualWorkHours <= 8 ? actualWorkHours : 8,
      nightHours: 0,
      overtimeNightHours: 0,
      holidayOvertimeHours: actualWorkHours > 8 ? actualWorkHours - 8 : 0,
    };
  }

  // 평일 근무: 시간대별 구간 계산
  const workRules =
    workType === 'night'
      ? COMPANY_WAGE_RULES.workTimeRules.nightShift
      : COMPANY_WAGE_RULES.workTimeRules.weekday;

  // 각 시간대별 계산
  Object.values(workRules).forEach((rule) => {
    const ruleStart = timeToMinutes(rule.start);
    const ruleEnd = timeToMinutes(rule.end);

    // 해당 구간과 근무시간이 겹치는 부분 계산
    let overlapStart, overlapEnd;

    if (ruleEnd > ruleStart) {
      // 같은 날 내 구간
      overlapStart = Math.max(startMinutes, ruleStart);
      overlapEnd = Math.min(endMinutes, ruleEnd);
    } else {
      // 다음날로 넘어가는 구간 (예: 22:00-04:00)
      if (startMinutes >= ruleStart || endMinutes <= ruleEnd) {
        overlapStart = Math.max(startMinutes, ruleStart);
        overlapEnd =
          endMinutes <= ruleEnd ? endMinutes : Math.min(endMinutes, 24 * 60);

        // 자정 이후 부분 추가 계산
        if (endMinutes <= ruleEnd && startMinutes >= ruleStart) {
          const nextDayOverlap = Math.min(endMinutes, ruleEnd);
          if (nextDayOverlap > 0) {
            overlapEnd = nextDayOverlap;
          }
        }
      } else {
        overlapStart = overlapEnd = 0;
      }
    }

    if (overlapStart < overlapEnd) {
      const segmentMinutes = overlapEnd - overlapStart;
      const segmentBreak = excludeBreakTimes(
        overlapStart,
        overlapEnd,
        COMPANY_WAGE_RULES.breakTimes
      );
      const actualSegmentMinutes = segmentMinutes - segmentBreak;

      if (actualSegmentMinutes > 0) {
        const segmentWage =
          (actualSegmentMinutes / 60) * baseWage * rule.multiplier;
        totalWage += segmentWage;

        wageDetails.push({
          period: rule.name,
          startTime: minutesToTime(overlapStart),
          endTime: minutesToTime(overlapEnd),
          minutes: actualSegmentMinutes,
          multiplier: rule.multiplier,
          wage: segmentWage,
        });
      }
    }
  });

  return {
    totalWage: Math.round(totalWage),
    breakTime: Math.round((breakMinutes / 60) * 100) / 100, // 소수점 2자리
    workTime: Math.round((actualWorkMinutes / 60) * 100) / 100,
    totalWorkMinutes: actualWorkMinutes, // 주 52시간 계산용
    details: wageDetails,
    isHoliday: isHolidayWork,
  };
};

/**
 * 월간 급여 계산 함수
 * @param {Array} attendanceRecords - 근태 기록 배열
 * @param {number} baseWage - 기본 시급
 * @param {Function} calcDailyWageFn - 일일 급여 계산 함수
 * @returns {Object} 월간 급여 계산 결과
 */
export const calcMonthlyWage = (
  attendanceRecords,
  baseWage,
  calcDailyWageFn
) => {
  let totalWage = 0;
  let totalWorkTime = 0;
  let totalOvertimeWage = 0;
  let totalHolidayWage = 0;
  const dailyDetails = [];

  attendanceRecords.forEach((record) => {
    if (record.checkIn && record.checkOut) {
      const dailyResult = calcDailyWageFn(
        record.checkIn,
        record.checkOut,
        record.workType || 'day',
        record.date,
        baseWage
      );

      totalWage += dailyResult.totalWage;
      totalWorkTime += dailyResult.workTime;

      // 구간별 수당 분류
      dailyResult.details.forEach((detail) => {
        if (detail.period.includes('연장') || detail.period.includes('심야')) {
          totalOvertimeWage += detail.wage;
        }
        if (dailyResult.isHoliday) {
          totalHolidayWage += detail.wage;
        }
      });

      dailyDetails.push({
        date: record.date,
        ...dailyResult,
      });
    }
  });

  return {
    totalWage: Math.round(totalWage),
    totalWorkTime: Math.round(totalWorkTime * 100) / 100,
    totalOvertimeWage: Math.round(totalOvertimeWage),
    totalHolidayWage: Math.round(totalHolidayWage),
    averageDaily: Math.round(totalWage / attendanceRecords.length),
    dailyDetails,
  };
};

/**
 * 시간 문자열을 분 단위로 변환
 * @param {string} timeStr - "HH:MM" 형식의 시간 문자열
 * @returns {number} 분 단위 시간
 */
export const parseTime = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * 시간 값을 표시용 HH:MM 형식으로 변환
 * - 엑셀 소수점 형식 (0.6472222... → 15:32) 지원
 * - 4자리 숫자 형식 (0815 → 08:15) 지원
 * - 이미 HH:MM 형식이면 그대로 반환
 *
 * @param {string|number} timeValue - 변환할 시간 값
 * @returns {string} HH:MM 형식의 시간 문자열
 */
export const formatTimeDisplay = (timeValue) => {
  if (!timeValue && timeValue !== 0) return '';

  // 1. 이미 HH:MM 형식이면 그대로 반환
  if (typeof timeValue === 'string' && /^\d{1,2}:\d{2}$/.test(timeValue.trim())) {
    return timeValue.trim();
  }

  // 2. 엑셀 소수점 시간 형식 처리 (0.6472222... → 15:32)
  // 공식: 소수점 값 = (시간*60 + 분) / 1440
  // 역공식: 총분 = 소수점 * 1440
  if (typeof timeValue === 'number' && timeValue > 0 && timeValue < 1) {
    const totalMinutes = Math.round(timeValue * 1440);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  // 3. 문자열 소수점 형식도 처리 ("0.6472222" → 15:32)
  const timeStr = String(timeValue).trim();
  if (/^0\.\d+$/.test(timeStr)) {
    const numValue = parseFloat(timeStr);
    if (!isNaN(numValue) && numValue > 0 && numValue < 1) {
      const totalMinutes = Math.round(numValue * 1440);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  // 4. 4자리 숫자 형식 처리 (0815 → 08:15)
  if (/^\d{3,4}$/.test(timeStr)) {
    if (timeStr.length === 3) {
      return `0${timeStr.substring(0, 1)}:${timeStr.substring(1)}`;
    } else if (timeStr.length === 4) {
      return `${timeStr.substring(0, 2)}:${timeStr.substring(2)}`;
    }
  }

  // 5. 변환할 수 없으면 원본 문자열 반환
  return timeStr;
};

/**
 * 근태 상태 분석 함수
 * @param {object} attendance - 출퇴근 기록
 * @param {number} day - 일
 * @param {number} year - 년도
 * @param {number} month - 월
 * @param {array} leaveRequests - 연차 신청 목록
 * @param {string} currentUserId - 현재 사용자 ID
 * @param {function} isHolidayDateFn - 공휴일 확인 함수
 * @returns {string} 근태 상태
 */
export const analyzeAttendanceStatus = (
  attendance,
  day,
  year,
  month,
  leaveRequests,
  currentUserId,
  isHolidayDateFn
) => {
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(
    day
  ).padStart(2, '0')}`;

  const leaveRecord = leaveRequests.find(
    (leave) =>
      leave.employeeId === currentUserId &&
      leave.startDate <= dateStr &&
      leave.endDate >= dateStr &&
      leave.status === '승인'
  );

  if (leaveRecord) {
    switch (leaveRecord.type) {
      case '연차':
        return '연차';
      case '반차(오전)':
        return '반차(오전)';
      case '반차(오후)':
        return '반차(오후)';
      case '병가':
        return '병가';
      case '경조':
        return '경조';
      case '공가':
        return '공가';
      case '출산휴가':
        return '경조';
      case '육아휴직':
        return '휴직';
      case '외출':
        return '외출';
      case '조퇴':
        return '조퇴';
      case '결근':
        return '결근';
      default:
        return '기타';
    }
  }

  if (!attendance || (!attendance.checkIn && !attendance.checkOut)) {
    const dayOfWeek = new Date(year, month - 1, day).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = isHolidayDateFn(year, month, day);

    if (isWeekend || isHoliday) {
      return '휴일';
    }
    return '결근';
  }

  if (attendance.checkIn && !attendance.checkOut) {
    return '근무중';
  }

  if (attendance.checkIn && attendance.checkOut) {
    const checkInTime = parseTime(attendance.checkIn);
    const checkOutTime = parseTime(attendance.checkOut);

    const dayOfWeek = new Date(year, month - 1, day).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHolidayDay = isHolidayDateFn(year, month, day);
    const isHolidayWork = isWeekend || isHolidayDay;

    let status = '출근';

    if (isHolidayWork) {
      status = '출근';
    } else {
      // 시프트 판정: 04:00~17:30 사이 출근이면 주간, 그 외는 야간
      // 주간/야간 판정
      if (
        checkInTime >= parseTime('04:00') &&
        checkInTime <= parseTime('17:30')
      ) {
        // 주간 근무자: 08:31~15:00 사이 출근 시 지각
        if (
          checkInTime >= parseTime('08:31') &&
          checkInTime <= parseTime('15:00')
        ) {
          status = '지각';
        }
        // 조퇴 판정
        if (checkOutTime < parseTime('17:20')) {
          status = status === '지각' ? '지각/조퇴' : '조퇴';
        }
      } else {
        // 야간 근무자: 19:01~다음날 03:00 사이 출근 시 지각
        // 19:01~23:59 (1141분~1439분) 또는 00:00~03:00 (0분~180분)
        const isLateForNight =
          (checkInTime >= parseTime('19:01') &&
            checkInTime <= parseTime('23:59')) ||
          (checkInTime >= parseTime('00:00') &&
            checkInTime <= parseTime('03:00'));
        if (isLateForNight) {
          status = '지각';
        }
        // 조퇴 판정
        if (
          checkOutTime >= parseTime('00:00') &&
          checkOutTime < parseTime('03:50')
        ) {
          status = status === '지각' ? '지각/조퇴' : '조퇴';
        }
      }
    }

    return status;
  }

  return '기타';
};

// ============================================================
// [1_공통] HOOKS - 관리자 공통
// ============================================================

// *[2_관리자 모드] 관리자 필터/정렬/검색 STATE 관리*

/**
 * 관리자 모드 필터, 정렬, 검색 STATE를 관리하는 커스텀 훅
 * @returns {Object} 관리자 필터 관련 STATE 및 setter 함수들
 */
export const useAdminFilters = () => {
  // *[2_관리자 모드] 2.2_직원관리 정렬*
  const [employeeSortField, setEmployeeSortField] = useState('');
  const [employeeSortOrder, setEmployeeSortOrder] = useState('asc');

  // *[2_관리자 모드] 2.6_연차관리 정렬*
  const [leaveSortField, setLeaveSortField] = useState('');
  const [leaveSortOrder, setLeaveSortOrder] = useState('asc');

  // *[2_관리자 모드] 2.7_건의관리 정렬*
  const [suggestionSortField, setSuggestionSortField] = useState('');
  const [suggestionSortOrder, setSuggestionSortOrder] = useState('asc');

  // *[2_관리자 모드] 2.10_평가관리 정렬*
  const [evaluationSortField, setEvaluationSortField] = useState('');
  const [evaluationSortOrder, setEvaluationSortOrder] = useState('asc');

  // *[2_관리자 모드] 2.8_렌더링 빈도 측정*
  const [renderCount, setRenderCount] = useState(0);
  const [renderPerSecond, setRenderPerSecond] = useState(0);
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());

  // *[2_관리자 모드] 2.6_연차관리 정렬 상태*
  const [annualLeaveSortField, setAnnualLeaveSortField] = useState('');
  const [annualLeaveSortOrder, setAnnualLeaveSortOrder] = useState('asc');

  // *[2_관리자 모드] 2.6_연차관리 검색*
  const [leaveSearch, setLeaveSearch] = useState({
    year: '',
    month: '',
    day: '',
    dept: '전체',
    status: '전체',
    type: '전체',
    position: '전체',
    keyword: '',
  });

  // *[2_관리자 모드] 2.7_건의관리 검색*
  const [suggestionSearch, setSuggestionSearch] = useState({
    year: '',
    month: '',
    day: '',
    department: '전체',
    type: '전체',
    status: '전체',
    keyword: '',
  });

  // *[2_관리자 모드] 2.10_평가관리 검색*
  const [evaluationSearch, setEvaluationSearch] = useState({
    year: '',
    department: '전체',
    grade: '전체',
    keyword: '',
  });

  // *[2_관리자 모드] 2.2_인라인 수정*
  const [editingEmpId, setEditingEmpId] = useState(null);
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    position: '',
    department: '',
    joinDate: '',
    resignDate: '',
    workType: '주간',
    status: '',
    phone: '',
    address: '',
    password: '',
    payType: '',
    subDepartment: '',
  });

  return {
    // 직원관리 정렬
    employeeSortField,
    setEmployeeSortField,
    employeeSortOrder,
    setEmployeeSortOrder,
    // 연차관리 정렬
    leaveSortField,
    setLeaveSortField,
    leaveSortOrder,
    setLeaveSortOrder,
    // 건의관리 정렬
    suggestionSortField,
    setSuggestionSortField,
    suggestionSortOrder,
    setSuggestionSortOrder,
    // 평가관리 정렬
    evaluationSortField,
    setEvaluationSortField,
    evaluationSortOrder,
    setEvaluationSortOrder,
    // 렌더링 빈도 측정
    renderCount,
    setRenderCount,
    renderPerSecond,
    setRenderPerSecond,
    renderCountRef,
    lastRenderTimeRef,
    // 연차관리 정렬
    annualLeaveSortField,
    setAnnualLeaveSortField,
    annualLeaveSortOrder,
    setAnnualLeaveSortOrder,
    // 연차관리 검색
    leaveSearch,
    setLeaveSearch,
    // 건의관리 검색
    suggestionSearch,
    setSuggestionSearch,
    // 평가관리 검색
    evaluationSearch,
    setEvaluationSearch,
    // 인라인 수정
    editingEmpId,
    setEditingEmpId,
    editForm,
    setEditForm,
  };
};

// ============================================================
// useEmployeeState.js
// ============================================================

// *[3_일반직원 모드] 일반직원 전용 STATE 관리*

/**
 * 일반직원 모드 전용 STATE를 관리하는 커스텀 훅
 * @param {Object} currentUser - 현재 사용자 정보
 * @returns {Object} 일반직원 관련 STATE 및 setter 함수들
 */
export const useEmployeeState = (currentUser) => {
  // *[3_일반직원 모드] 3.2_공지사항 STATE*
  const [showNoticePopup, setShowNoticePopup] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [staffNoticePage, setStaffNoticePage] = useState(1);

  // *[3_일반직원 모드] 3.3_알림 사항 STATE*
  const [employeeNotifications, setEmployeeNotifications] = useState([]);

  // *[3_일반직원 모드] 3.3_알림 읽음 상태*
  const [readNotifications, setReadNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(
        `readNotifications_${currentUser?.id}`
      );
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (error) {
      return new Set();
    }
  });
  const [readAnnouncements, setReadAnnouncements] = useState(() => {
    try {
      const saved = localStorage.getItem(
        `readAnnouncements_${currentUser?.id}`
      );
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (error) {
      return new Set();
    }
  });
  const [expandedAnnouncement, setExpandedAnnouncement] = useState(null);

  // *[3_일반직원 모드] 3.4_회사 일정 STATE*
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  return {
    // 공지사항 STATE
    showNoticePopup,
    setShowNoticePopup,
    selectedNotice,
    setSelectedNotice,
    staffNoticePage,
    setStaffNoticePage,
    // 알림 STATE
    employeeNotifications,
    setEmployeeNotifications,
    readNotifications,
    setReadNotifications,
    readAnnouncements,
    setReadAnnouncements,
    expandedAnnouncement,
    setExpandedAnnouncement,
    // 회사 일정 STATE
    showEventDetail,
    setShowEventDetail,
    selectedEvent,
    setSelectedEvent,
  };
};

// ============================================================
// useEmployeeSearch.js
// ============================================================

// *[2_관리자 모드] 2.4_직원 검색 관리*

/**
 * 직원 검색을 관리하는 커스텀 훅
 * @param {Array} employees - 직원 배열
 * @returns {Object} 검색 관련 state 및 함수들
 */
export const useEmployeeSearch = (employees) => {
  // *[2_관리자 모드] 2.4_직원 검색 상태*
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // *[2_관리자 모드] 2.4_직원 검색*
  const handleEmployeeSearch = (searchTerm) => {
    setEmployeeSearchTerm(searchTerm);
    if (!searchTerm || searchTerm.trim() === '') {
      setSearchResults([]);
      return;
    }

    const filtered = employees.filter((employee) =>
      employee.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setSearchResults(filtered);
  };

  return {
    employeeSearchTerm,
    setEmployeeSearchTerm,
    searchResults,
    setSearchResults,
    handleEmployeeSearch,
  };
};

// ============================================================
// useSortHandlers.js
// ============================================================

export const useSortHandlers = (dependencies = {}) => {
  const {
    leaveSortField = '',
    setLeaveSortField = () => {},
    leaveSortOrder = 'asc',
    setLeaveSortOrder = () => {},
    suggestionSortField = '',
    setSuggestionSortField = () => {},
    suggestionSortOrder = 'asc',
    setSuggestionSortOrder = () => {},
    evaluationSortField = '',
    setEvaluationSortField = () => {},
    evaluationSortOrder = 'asc',
    setEvaluationSortOrder = () => {},
    annualLeaveSortField = '',
    setAnnualLeaveSortField = () => {},
    annualLeaveSortOrder = 'asc',
    setAnnualLeaveSortOrder = () => {},
  } = dependencies;

  // [2_관리자 모드] 2.6_연차관리 - 연차 목록 정렬
  const handleLeaveSort = useCallback(
    (field) => {
      if (leaveSortField === field) {
        setLeaveSortOrder(leaveSortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setLeaveSortField(field);
        setLeaveSortOrder('asc');
      }
    },
    [leaveSortField, leaveSortOrder, setLeaveSortField, setLeaveSortOrder]
  );

  // [2_관리자 모드] 2.7_건의관리 - 건의사항 목록 정렬
  const handleSuggestionSort = useCallback(
    (field) => {
      if (suggestionSortField === field) {
        setSuggestionSortOrder(suggestionSortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setSuggestionSortField(field);
        setSuggestionSortOrder('asc');
      }
    },
    [
      suggestionSortField,
      suggestionSortOrder,
      setSuggestionSortField,
      setSuggestionSortOrder,
    ]
  );

  // [2_관리자 모드] 2.10_평가관리 - 평가 목록 정렬
  const handleEvaluationSort = useCallback(
    (field) => {
      if (evaluationSortField === field) {
        setEvaluationSortOrder(evaluationSortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setEvaluationSortField(field);
        setEvaluationSortOrder('asc');
      }
    },
    [
      evaluationSortField,
      evaluationSortOrder,
      setEvaluationSortField,
      setEvaluationSortOrder,
    ]
  );

  // [2_관리자 모드] 2.6_연차관리 - 연차관리 목록 정렬
  const handleAnnualLeaveSort = useCallback(
    (field) => {
      if (annualLeaveSortField === field) {
        setAnnualLeaveSortOrder(
          annualLeaveSortOrder === 'asc' ? 'desc' : 'asc'
        );
      } else {
        setAnnualLeaveSortField(field);
        setAnnualLeaveSortOrder('asc');
      }
    },
    [
      annualLeaveSortField,
      annualLeaveSortOrder,
      setAnnualLeaveSortField,
      setAnnualLeaveSortOrder,
    ]
  );

  return {
    handleLeaveSort,
    handleSuggestionSort,
    handleEvaluationSort,
    handleAnnualLeaveSort,
  };
};

// ============================================================
// useNotificationRecipients.js
// ============================================================

// *[2_관리자 모드] 알림 수신자 관리 훅*

/**
 * 알림 폼의 수신자 목록을 관리하는 커스텀 훅
 * @param {Object} params - 파라미터 객체
 * @param {Function} params.setRegularNotificationForm - 정기 알림 폼 setter
 * @param {Function} params.setRealtimeNotificationForm - 실시간 알림 폼 setter
 * @param {Function} params.setEmployeeSearchTerm - 직원 검색어 setter
 * @param {Function} params.setSearchResults - 검색 결과 setter
 * @returns {Object} 수신자 관리 함수들
 */
export const useNotificationRecipients = ({
  setRegularNotificationForm,
  setRealtimeNotificationForm,
  setEmployeeSearchTerm,
  setSearchResults,
}) => {
  // *[2_관리자 모드] 2.4_수신자에 직원 추가*
  const addEmployeeToRecipients = (employee, formType) => {
    const updateForm = (prev) => {
      const selectedEmployees = prev.recipients.selectedEmployees || [];
      if (selectedEmployees.includes(employee.name)) {
        return prev; // 이미 추가된 경우 무시
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
  };

  // *[2_관리자 모드] 2.4_수신자에서 직원 제거*
  const removeEmployeeFromRecipients = (employeeName, formType) => {
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
  };

  // *[2_관리자 모드] 2.4_수신자 직원 토글*
  const handleEmployeeToggle = (employeeName, formType) => {
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
  };

  return {
    addEmployeeToRecipients,
    removeEmployeeFromRecipients,
    handleEmployeeToggle,
  };
};

// ============================================================
// useAttendanceSync.js
// ============================================================

export const useAttendanceSync = (year, month, department = 'all') => {
  const {
    socket,
    isConnected,
    subscribeToAttendance,
    unsubscribeFromAttendance,
    updateAttendanceData,
    bulkUpdateAttendance,
    addEventListener,
    SYNC_EVENTS,
  } = useSocket();

  const [attendanceData, setAttendanceData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [syncErrors, setSyncErrors] = useState([]);
  const isSubscribedRef = useRef(false);

  // 근태 데이터 구독/구독해제
  useEffect(() => {
    if (isConnected && year && month && !isSubscribedRef.current) {
      subscribeToAttendance(year, month, department);
      isSubscribedRef.current = true;
    }

    return () => {
      if (isSubscribedRef.current) {
        unsubscribeFromAttendance(year, month, department);
        isSubscribedRef.current = false;
      }
    };
  }, [
    isConnected,
    year,
    month,
    department,
    subscribeToAttendance,
    unsubscribeFromAttendance,
  ]);

  // 실시간 업데이트 이벤트 처리
  useEffect(() => {
    if (!socket) return;

    // 근태 데이터 업데이트 수신
    const handleAttendanceUpdated = (data) => {
      if (data.updateType === 'single_record') {
        // 단일 레코드 업데이트
        setAttendanceData((prev) => ({
          ...prev,
          [data.id]: {
            ...prev[data.id],
            ...data,
            lastModified: new Date(),
            modifiedBy: data.modifiedBy,
          },
        }));
      } else if (data.updateType === 'bulk_import') {
        // 대량 업데이트
        const newData = {};
        data.records.forEach((record) => {
          newData[record.id] = {
            ...record,
            lastModified: new Date(),
            modifiedBy: data.modifiedBy,
          };
        });
        setAttendanceData((prev) => ({ ...prev, ...newData }));
      }

      setLastSyncTime(new Date());
    };

    // 대량 업데이트 완료 수신
    const handleBulkImportCompleted = (data) => {
      handleAttendanceUpdated(data);
    };

    // 충돌 감지 처리
    const handleConflictDetected = (conflictData) => {
      console.warn('⚠️ 데이터 충돌 감지:', conflictData);
      setConflicts((prev) => [
        ...prev,
        {
          id: Date.now(),
          ...conflictData,
          detectedAt: new Date(),
        },
      ]);
    };

    // 구독 성공 처리
    const handleSubscribed = (data) => {
      setLastSyncTime(new Date());
    };

    // 에러 처리
    const handleError = (error) => {
      console.error('❌ 실시간 동기화 오류:', error);
      setSyncErrors((prev) => [
        ...prev,
        {
          id: Date.now(),
          ...error,
          occurredAt: new Date(),
        },
      ]);
    };

    // 이벤트 리스너 등록
    const cleanupFunctions = [
      addEventListener(SYNC_EVENTS.ATTENDANCE_UPDATED, handleAttendanceUpdated),
      addEventListener('bulk_import:completed', handleBulkImportCompleted),
      addEventListener(SYNC_EVENTS.CONFLICT_DETECTED, handleConflictDetected),
      addEventListener('attendance:subscribed', handleSubscribed),
      addEventListener('attendance:error', handleError),
    ];

    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup && cleanup());
    };
  }, [socket, addEventListener, SYNC_EVENTS]);

  // 근태 데이터 업데이트 함수
  const syncAttendanceUpdate = useCallback(
    async (recordData) => {
      if (!isConnected) {
        throw new Error('실시간 서버에 연결되지 않았습니다.');
      }

      setIsLoading(true);
      try {
        const result = await updateAttendanceData({
          ...recordData,
          year,
          month,
          department,
          clientTimestamp: new Date(),
        });

        // 로컬 상태 즉시 업데이트 (낙관적 업데이트)
        setAttendanceData((prev) => ({
          ...prev,
          [result.id]: {
            ...prev[result.id],
            ...result,
            lastModified: new Date(),
            isPending: false,
          },
        }));

        setLastSyncTime(new Date());
        return result;
      } catch (error) {
        console.error('근태 데이터 업데이트 실패:', error);
        setSyncErrors((prev) => [
          ...prev,
          {
            id: Date.now(),
            message: error.message,
            data: recordData,
            occurredAt: new Date(),
          },
        ]);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, updateAttendanceData, year, month, department]
  );

  // 대량 근태 데이터 업데이트 함수
  const syncBulkUpdate = useCallback(
    async (records) => {
      if (!isConnected) {
        throw new Error('실시간 서버에 연결되지 않았습니다.');
      }

      setIsLoading(true);
      try {
        const result = await bulkUpdateAttendance(
          records,
          year,
          month,
          department
        );

        // 로컬 상태 즉시 업데이트
        const newData = {};
        result.records.forEach((record) => {
          newData[record.id] = {
            ...record,
            lastModified: new Date(),
            isPending: false,
          };
        });
        setAttendanceData((prev) => ({ ...prev, ...newData }));

        setLastSyncTime(new Date());
        return result;
      } catch (error) {
        console.error('대량 근태 데이터 업데이트 실패:', error);
        setSyncErrors((prev) => [
          ...prev,
          {
            id: Date.now(),
            message: error.message,
            recordCount: records.length,
            occurredAt: new Date(),
          },
        ]);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, bulkUpdateAttendance, year, month, department]
  );

  // 로컬 데이터 직접 설정 (초기 로드용)
  const setLocalAttendanceData = useCallback((data) => {
    setAttendanceData(data);
    setLastSyncTime(new Date());
  }, []);

  // 충돌 해결 함수
  const resolveConflict = useCallback(
    (conflictId, resolution, selectedData = null) => {
      setConflicts((prev) =>
        prev.filter((conflict) => conflict.id !== conflictId)
      );

      if (resolution === 'accept_server' || resolution === 'accept_local') {
        const dataToApply =
          resolution === 'accept_server'
            ? conflicts.find((c) => c.id === conflictId)?.serverData
            : selectedData;

        if (dataToApply) {
          setAttendanceData((prev) => ({
            ...prev,
            [dataToApply.id]: {
              ...prev[dataToApply.id],
              ...dataToApply,
              lastModified: new Date(),
              resolvedConflict: true,
            },
          }));
        }
      }
    },
    [conflicts]
  );

  // 에러 제거 함수
  const clearSyncError = useCallback((errorId) => {
    setSyncErrors((prev) => prev.filter((error) => error.id !== errorId));
  }, []);

  // 모든 에러 제거
  const clearAllSyncErrors = useCallback(() => {
    setSyncErrors([]);
  }, []);

  return {
    // 데이터
    attendanceData,
    isLoading,
    isConnected,
    lastSyncTime,
    conflicts,
    syncErrors,

    // 동기화 함수
    syncAttendanceUpdate,
    syncBulkUpdate,
    setLocalAttendanceData,

    // 충돌 및 에러 관리
    resolveConflict,
    clearSyncError,
    clearAllSyncErrors,

    // 유틸리티
    hasUnresolvedConflicts: conflicts.length > 0,
    hasSyncErrors: syncErrors.length > 0,
    isSubscribed: isSubscribedRef.current,
  };
};
// ============================================================
// useScheduledNoticePublisher.js
// ============================================================

// *[2_관리자 모드] 2.3.1_예약 공지 자동 게시*

/**
 * 예약된 공지사항을 자동으로 게시하는 커스텀 훅
 * @param {Function} setNotices - 공지사항 상태 업데이트 함수
 */
export const useScheduledNoticePublisher = (setNotices) => {
  useEffect(() => {
    const checkScheduledNotices = () => {
      const now = new Date();
      setNotices((prev) =>
        prev.map((notice) => {
          if (
            notice.isScheduled &&
            !notice.isPublished &&
            notice.scheduledDateTime
          ) {
            const scheduledTime = new Date(notice.scheduledDateTime);
            if (scheduledTime <= now) {
              return { ...notice, isPublished: true };
            }
          }
          return notice;
        })
      );
    };

    checkScheduledNotices();

    const interval = setInterval(checkScheduledNotices, 60000);

    return () => clearInterval(interval);
  }, [setNotices]);
};

// ============================================================
// [1_공통] HOOKS - 공통
// ============================================================

// [1_공통] AI 챗봇 쿼리 처리

/**
 * AI 챗봇 쿼리 처리를 위한 커스텀 훅
 * @param {Object} params - 파라미터 객체
 */
export const useAiChat = ({
  aiInput = '',
  setAiInput = () => {},
  setAiMessages = () => {},
  currentUser = null,
  devLog = () => {},
  getActiveAiKey = () => null,
  getActiveProvider = () => 'unknown',
  unifiedApiKey = '',
  geminiApiKey = '',
  chatgptApiKey = '',
  claudeApiKey = '',
  detectedProvider = '',
  selectedAiModel = '',
  attendanceData = [],
  employees = [],
  getUsedAnnualLeave = () => 0,
  calculateAnnualLeave = () => 0,
  leaveRequests = [],
  payrollTableData = [],
  evaluationData = [],
  notices = [],
  suggestions = [],
  safetyAccidents = [],
  API_BASE_URL = '',
  FAIL_MSG = '응답을 가져올 수 없습니다',
  selectedModel = '',
  chatbotPermissions = { read: true, modify: false, download: false },
  logSystemEvent = () => {},
  onDataUpdate = () => {},
} = {}) => {
  // [1_공통] AI 챗봇 쿼리 처리
  const handleAiQuery = useCallback(async () => {
    if (!aiInput || !aiInput.trim()) return;

    const userMessage = aiInput.trim();
    setAiInput('');

    setAiMessages((prev) => [...prev, { type: 'user', message: userMessage }]);

    devLog('🚀 AI 챗봇 쿼리 시작');
    devLog('📝 입력:', userMessage);
    devLog('👤 사용자:', currentUser?.name);

    const unifiedKey = getActiveAiKey(
      unifiedApiKey,
      geminiApiKey,
      chatgptApiKey,
      claudeApiKey
    );
    const unifiedProvider = getActiveProvider(
      detectedProvider,
      geminiApiKey,
      chatgptApiKey,
      claudeApiKey,
      selectedAiModel
    );

    devLog('🔑 통합 키 상태:', unifiedKey ? '설정됨' : '미설정');
    devLog('🌐 통합 프로바이더:', unifiedProvider);

    if (!unifiedKey) {
      const fallbackMsg = `⚠️ AI 모델 API Key가 설정되지 않았습니다.

**시스템 관리 > AI 모델 설정**에서 API Key를 입력해주세요.

현재는 기본 내부 데이터만 조회 가능합니다.`;

      setAiMessages((prev) => [...prev, { type: 'ai', message: fallbackMsg }]);
      return;
    }

    const loadingId = Date.now();
    setAiMessages((prev) => [
      ...prev,
      { type: 'ai', message: '🤖 분석 중...', id: loadingId },
    ]);

    try {
      devLog('🔄 AI 챗봇 데이터 준비 중...');

      // 직원 목록 정리 (개인정보 일부 제거)
      const employeesData = (employees || []).map((emp) => ({
        id: emp.id,
        name: emp.name,
        department: emp.department,
        position: emp.position,
        joinDate: emp.joinDate,
        workType: emp.workType,
        status: emp.status,
      }));

      // 연차 정보 계산
      const leaveData = employeesData.map((emp) => {
        const usedLeave = getUsedAnnualLeave(emp.id);
        const totalLeave = calculateAnnualLeave(emp.joinDate);
        return {
          employeeId: emp.id,
          employeeName: emp.name,
          total: totalLeave,
          used: usedLeave,
          remaining: totalLeave - usedLeave,
        };
      });

      const today = new Date().toISOString().split('T')[0];
      const todayAttendance = (attendanceData || []).filter(
        (att) => att.date === today
      );

      const internalContext = {
        // 직원 정보
        employees: employeesData,
        totalEmployees: employeesData.length,

        // 연차 정보
        leaveData: leaveData,

        // 근태 정보
        todayAttendanceCount: todayAttendance.length,
        todayAttendanceRate:
          employeesData.length > 0
            ? Math.round((todayAttendance.length / employeesData.length) * 100)
            : 0,

        // 연차 신청
        leaveRequests: (leaveRequests || []).map((req) => ({
          employeeId: req.employeeId,
          employeeName: req.employeeName || req.name,
          startDate: req.startDate,
          endDate: req.endDate,
          reason: req.reason,
          status: req.status,
        })),
        approvedLeaveRequests: (leaveRequests || []).filter(
          (req) => req.status === 'approved' || req.status === '승인'
        ).length,

        // 급여
        payrollRecords: (payrollTableData || []).length,
        payrollData: (payrollTableData || []).map((p) => ({
          employeeId: p.employeeId,
          employeeName: p.employeeName,
          baseSalary: p.baseSalary,
          totalSalary: p.totalSalary,
          month: p.month,
        })),

        // 평가
        evaluations: evaluationData || [],
        pendingEvaluations: (evaluationData || []).filter(
          (e) => e.status === 'pending' || e.status === '대기'
        ).length,
        completedEvaluations: (evaluationData || []).filter(
          (e) => e.status === 'completed' || e.status === '완료'
        ).length,

        // 공지사항
        notices: (notices || []).map((n) => ({
          title: n.title,
          content: n.content?.substring(0, 100),
          author: n.author,
          date: n.date,
          priority: n.priority,
        })),

        // 건의사항
        suggestions: (suggestions || []).map((s) => ({
          employeeId: s.employeeId,
          name: s.name,
          type: s.type,
          title: s.title,
          status: s.status,
          applyDate: s.applyDate,
        })),

        // 안전사고
        safetyAccidents: (safetyAccidents || []).map((sa) => ({
          date: sa.date,
          location: sa.location,
          severity: sa.severity,
          status: sa.status,
        })),
      };

      devLog('📊 내부 데이터 컨텍스트 생성 완료:', {
        직원수: internalContext.totalEmployees,
        연차데이터: internalContext.leaveData?.length || 0,
        공지사항: internalContext.notices?.length || 0,
      });

      const systemPrompt = `당신은 부성스틸 HR 관리 시스템의 AI 어시스턴트입니다.

**접근 권한:**
1. **내부 데이터**: 사내 ERP, HR DB, 생산 데이터, 근태 기록 등 (읽기: ${
        chatbotPermissions.read ? 'O' : 'X'
      }, 수정: ${chatbotPermissions.modify ? 'O' : 'X'})
2. **외부 데이터**: 웹 검색, HR 트렌드, 뉴스, 시장 리포트 등

**현재 사용자**: ${currentUser.name} (${currentUser.role})

**응답 규칙:**
- 내부 데이터 질문 시: 서버에서 제공하는 실시간 DB 데이터를 기반으로 정확히 답변
- 외부 데이터 질문 시: 최신 HR 트렌드, 뉴스, 시장 정보 제공 (출처 명시)
- 복합 질문 시: 내부 데이터 + 외부 인사이트 결합
- 친절하고 전문적인 톤 유지
- 이모지 적절히 활용 (📊 📈 💡 등)
- **중요**: 특정 직원 이름이 언급되면 반드시 서버 DB 데이터에서 해당 직원을 찾아서 답변할 것
- **데이터 출처**: 모든 숫자와 통계는 서버에서 제공하는 DB 데이터만 사용할 것

**데이터 수정 기능** (수정 권한이 활성화된 경우):
사용자가 데이터 생성/수정/삭제를 요청하면, 반드시 다음 형식으로 COMMAND를 응답에 포함:

**명령 형식:**
<COMMAND>{"action":"create|update|delete","dataType":"employee|notice|leave|payroll|evaluation|suggestion|safetyAccident|attendance|schedule|notification","data":{...},"id":"..."}</COMMAND>

**지원되는 데이터 타입 및 필드:**
1. **employee** (직원): name, department, position, email, phone, joinDate, workType, status, annualLeave
   - annualLeave는 객체 형식: {total: 숫자, used: 숫자, remaining: 숫자}
   - 예: {"annualLeave": {"total": 15, "used": 5, "remaining": 10}}
2. **notice** (공지사항): title, content, author, priority, date
3. **leave** (연차): employeeId, employeeName, startDate, endDate, reason, status
4. **payroll** (급여): employeeId, employeeName, baseSalary, totalSalary, month
5. **evaluation** (평가): employeeId, employeeName, evaluationType, status, score
6. **suggestion** (건의): employeeId, name, type, title, content, status
7. **safetyAccident** (안전사고): date, location, severity, status, description
8. **attendance** (근태): employeeId, date, checkIn, checkOut, status
9. **schedule** (일정): title, date, time, location, description, participants
10. **notification** (알림): title, content, notificationType, status, recipients

**예시:**
- "민성우 부서를 영업부로 변경해줘" → 위의 직원 정보에서 민성우(BS-226)을 찾음 → <COMMAND>{"action":"update","dataType":"employee","id":"BS-226","data":{"department":"영업부"}}</COMMAND> 변경되었습니다.
- "민성우 연차를 20일로 조정해줘" → 위의 직원 정보에서 민성우(BS-226)을 찾음 → <COMMAND>{"action":"update","dataType":"employee","id":"BS-226","data":{"annualLeave":{"total":20,"used":0,"remaining":20}}}</COMMAND> 민성우님의 연차를 20일로 조정했습니다.
- "긴급 회의 공지 생성해줘" → <COMMAND>{"action":"create","dataType":"notice","data":{"title":"긴급 회의","content":"내일 10시 회의실","author":"${
        currentUser.name
      }","priority":"긴급"}}</COMMAND> 생성되었습니다.
- "내일 오후 2시 팀 회의 일정 추가해줘" → <COMMAND>{"action":"create","dataType":"schedule","data":{"title":"팀 회의","date":"2025-11-28","time":"14:00","location":"회의실"}}</COMMAND> 일정이 등록되었습니다.
- "전체 직원에게 점심시간 변경 알림 보내줘" → <COMMAND>{"action":"create","dataType":"notification","data":{"title":"점심시간 변경","content":"12시 → 12시 30분","notificationType":"일반"}}</COMMAND> 알림이 전송되었습니다.

**중요 주의사항:**
- **직원 수정 시 COMMAND의 id에는 반드시 employeeId(예: BS-226)를 사용할 것**
- 직원 이름이 언급되면 위의 "**1. 직원 정보**" 목록에서 이름으로 검색하여 괄호 안의 ID를 찾아서 사용
- 직원의 연차를 조정할 때는 annualLeave 객체의 total, used, remaining 값을 함께 수정해야 합니다
- 수정 권한: ${chatbotPermissions.modify ? '✅ 활성화됨' : '❌ 비활성화됨'}`;

      devLog('📋 시스템 프롬프트 생성 완료');

      // ✅ 이전 대화 내용 포함하여 전송 (ChatGPT/Claude/Gemini처럼 대화 학습)
      const previousMessages = (prev) => {
        // aiMessages에서 이전 메시지들 가져오기
        return prev
          .filter((msg) => msg.type === 'user' || msg.type === 'ai')
          .slice(-10) // 최근 10개 대화만 포함
          .map((msg) => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.message || msg.content,
          }));
      };

      let chatHistory = [];
      setAiMessages((prev) => {
        chatHistory = previousMessages(prev);
        return prev;
      });

      const response = await fetch(`${API_BASE_URL}/ai/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage,
          messages: chatHistory, // ✅ 이전 대화 내용 포함
          permissions: chatbotPermissions, // ✅ AI 챗봇 권한 전송
          internalData: internalContext,
          externalData: {
            systemPrompt: systemPrompt,
            user: {
              name: currentUser.name,
              role: currentUser.role,
            },
          },
        }),
      });

      devLog('🌐 API 응답 상태:', response.status);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: FAIL_MSG }));
        throw new Error(errorData?.error || errorData?.message || FAIL_MSG);
      }

      const result = await response.json();
      devLog('✅ AI 응답 수신 완료');

      let aiResponse = result?.response || result?.message || FAIL_MSG;

      // aiResponse가 문자열인지 확인
      if (typeof aiResponse !== 'string') {
        aiResponse = String(aiResponse || FAIL_MSG);
      }

      devLog('📝 AI 응답 길이:', aiResponse.length, '자');

      // ✅ COMMAND 태그 파싱 및 실행
      const commandRegex = /<COMMAND>(.*?)<\/COMMAND>/g;
      const commands = [];
      let match;
      while ((match = commandRegex.exec(aiResponse)) !== null) {
        commands.push(match[1]);
      }

      if (commands.length > 0) {
        devLog(`🤖 발견된 명령: ${commands.length}개`);

        // 명령 제거 후 응답 먼저 표시
        const cleanResponse = (aiResponse || '')
          .replace(commandRegex, '')
          .trim();
        setAiMessages((prev) =>
          prev
            .filter((msg) => msg.id !== loadingId)
            .concat([{ type: 'ai', message: cleanResponse }])
        );

        // 명령 실행
        for (const commandStr of commands) {
          devLog('🔨 명령 실행:', commandStr);
          const commandResult = await executeAiCommand({
            commandStr,
            chatbotPermissions,
            currentUser,
            logSystemEvent,
            devLog,
            API_BASE_URL,
            onDataUpdate,
          });

          // 명령 실행 결과를 메시지로 추가
          setAiMessages((prev) => [
            ...prev,
            {
              type: commandResult.success ? 'system' : 'error',
              message: `${commandResult.success ? '✅' : '❌'} ${
                commandResult.message
              }`,
            },
          ]);
        }
      } else {
        // 명령이 없으면 그대로 표시
        setAiMessages((prev) =>
          prev
            .filter((msg) => msg.id !== loadingId)
            .concat([{ type: 'ai', message: aiResponse }])
        );
      }

      // ✅ DOWNLOAD 태그 파싱 및 실행
      const downloadRegex = /<DOWNLOAD>(.*?)<\/DOWNLOAD>/g;
      const downloads = [];
      let downloadMatch;
      while ((downloadMatch = downloadRegex.exec(aiResponse)) !== null) {
        downloads.push(downloadMatch[1]);
      }

      if (downloads.length > 0) {
        devLog(`📥 발견된 다운로드 요청: ${downloads.length}개`);

        for (const downloadStr of downloads) {
          try {
            const downloadCmd = JSON.parse(downloadStr);
            devLog('📥 다운로드 실행:', downloadCmd);

            // 권한 체크
            if (!chatbotPermissions?.download) {
              setAiMessages((prev) => [
                ...prev,
                {
                  type: 'error',
                  message:
                    '❌ 다운로드 권한이 없습니다. 시스템 관리에서 권한을 활성화해주세요.',
                },
              ]);
              continue;
            }

            const downloadResponse = await fetch(
              `${API_BASE_URL}/ai/chatbot/download`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  format: downloadCmd.format,
                  dataType: downloadCmd.dataType,
                  filter: downloadCmd.filter || {},
                  permissions: chatbotPermissions,
                }),
              }
            );

            if (!downloadResponse.ok) {
              throw new Error('다운로드 요청 실패');
            }

            // 파일 다운로드
            const blob = await downloadResponse.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download =
              downloadResponse.headers
                .get('Content-Disposition')
                ?.split('filename=')[1]
                ?.replace(/"/g, '') || `download_${Date.now()}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            setAiMessages((prev) => [
              ...prev,
              {
                type: 'system',
                message: `✅ ${downloadCmd.dataType} 데이터를 ${downloadCmd.format} 형식으로 다운로드했습니다.`,
              },
            ]);
          } catch (error) {
            devLog('❌ 다운로드 오류:', error);
            setAiMessages((prev) => [
              ...prev,
              {
                type: 'error',
                message: `❌ 다운로드 실패: ${error.message}`,
              },
            ]);
          }
        }
      }

      devLog('✅ AI 챗봇 쿼리 완료');
    } catch (error) {
      devLog('❌ AI 챗봇 에러:', error);

      setAiMessages((prev) =>
        prev
          .filter((msg) => msg.id !== loadingId)
          .concat([
            {
              type: 'ai',
              message: `⚠️ ${FAIL_MSG}

서버 연결 또는 AI 모델 호출 중 문제가 발생했습니다.
- API Key가 올바른지 확인해주세요
- 네트워크 연결 상태를 확인해주세요
- 선택한 모델(${selectedModel})이 활성화되어 있는지 확인해주세요`,
            },
          ])
      );
    }
  }, [
    aiInput,
    setAiInput,
    setAiMessages,
    currentUser,
    devLog,
    getActiveAiKey,
    getActiveProvider,
    unifiedApiKey,
    geminiApiKey,
    chatgptApiKey,
    claudeApiKey,
    detectedProvider,
    selectedAiModel,
    attendanceData,
    employees,
    getUsedAnnualLeave,
    calculateAnnualLeave,
    leaveRequests,
    payrollTableData,
    evaluationData,
    notices,
    suggestions,
    safetyAccidents,
    API_BASE_URL,
    FAIL_MSG,
    selectedModel,
    chatbotPermissions,
    logSystemEvent,
    onDataUpdate,
  ]);

  return {
    handleAiQuery,
  };
};

// ============================================================
// useLanguage.js
// ============================================================

export const useLanguage = (dependencies = {}) => {
  const {
    selectedLanguage = 'ko',
    setSelectedLanguage = () => {},
    setShowLanguageSelection = () => {},
    setCurrentYear = () => {},
    setCurrentMonth = () => {},
  } = dependencies;

  // [1_공통] 언어 선택
  const handleLanguageSelect = useCallback(
    (language) => {
      setSelectedLanguage(language);
      setShowLanguageSelection(false);

      const now = new Date();
      setCurrentYear(now.getFullYear());
      setCurrentMonth(now.getMonth() + 1);
    },
    [
      setSelectedLanguage,
      setShowLanguageSelection,
      setCurrentYear,
      setCurrentMonth,
    ]
  );

  // [1_공통] 다국어 텍스트 가져오기
  const getText = useCallback(
    (koText, enText) => {
      return selectedLanguage === 'ko' ? koText : enText;
    },
    [selectedLanguage]
  );

  // [1_공통] 연차 타입 다국어
  const getLeaveTypeText = useCallback(
    (type) => {
      if (selectedLanguage === 'en') {
        const map = {
          연차: 'Annual leave',
          '반차(오전)': 'Half-day leave (Morning)',
          '반차(오후)': 'Half-day leave (Afternoon)',
          외출: 'Going out',
          조퇴: 'Leaving early',
          경조: 'Condolences',
          공가: 'Official vacation',
          휴직: 'Leave of absence',
          결근: 'Absence',
          기타: 'Other',
        };
        return map[type] || type;
      }
      return type;
    },
    [selectedLanguage]
  );

  // [1_공통] 건의사항 카테고리 다국어
  const getSuggestionCategoryText = useCallback(
    (title) => {
      if (selectedLanguage === 'en') {
        if (title === '구매') return 'purchase';
        if (title === '기타') return 'Other';
        return title;
      }
      return title;
    },
    [selectedLanguage]
  );

  return {
    handleLanguageSelect,
    getText,
    getLeaveTypeText,
    getSuggestionCategoryText,
  };
};

// ============================================================
// useMonthNavigation.js
// ============================================================

/**
 * 월 네비게이션 Hook
 * - 이전/다음 달 이동 처리
 * - 연도 변경 시 공휴일 데이터 로딩
 */
export const useMonthNavigation = ({
  currentMonth,
  setCurrentMonth,
  currentYear,
  setCurrentYear,
  loadHolidayData,
}) => {
  // *[1_공통] 이전 달로 이동*
  const goToPrevMonth = () => {
    if (currentMonth === 1) {
      const newYear = currentYear - 1;
      setCurrentMonth(12);
      setCurrentYear(newYear);
      loadHolidayData(newYear);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  // *[1_공통] 다음 달로 이동*
  const goToNextMonth = () => {
    if (currentMonth === 12) {
      const newYear = currentYear + 1;
      setCurrentMonth(1);
      setCurrentYear(newYear);
      loadHolidayData(newYear);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  return {
    goToPrevMonth,
    goToNextMonth,
  };
};

// ============================================================
// useStorageSync.js
// ============================================================

// *[1_공통] 1.3.9_탭 간 동기화*

/**
 * localStorage의 변경을 감지하여 여러 탭 간 데이터를 동기화하는 커스텀 훅
 * @param {Object} syncConfig - 동기화 설정 객체
 * @param {Function} syncConfig.setScheduleEvents - 일정 이벤트 상태 업데이트 함수
 * @param {Function} syncConfig.setCustomHolidays - 커스텀 공휴일 상태 업데이트 함수
 * @param {Function} syncConfig.setEvaluationData - 평가 데이터 상태 업데이트 함수
 */
export const useStorageSync = ({
  setScheduleEvents,
  setCustomHolidays,
  setEvaluationData,
}) => {
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'scheduleEvents' && e.newValue) {
        const updatedEvents = JSON.parse(e.newValue);
        setScheduleEvents(updatedEvents);
      } else if (e.key === 'customHolidays' && e.newValue) {
        const updatedHolidays = JSON.parse(e.newValue);
        setCustomHolidays(updatedHolidays);
      } else if (e.key === 'evaluationData' && e.newValue) {
        const updatedPerformanceData = JSON.parse(e.newValue);
        setEvaluationData(updatedPerformanceData);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [setScheduleEvents, setCustomHolidays, setEvaluationData]);
};

// ============================================================
// useSystemSettings.js
// ============================================================

// *[1_공통] 시스템 공통 설정 관리*

/**
 * 시스템 공통 설정을 관리하는 커스텀 훅
 * @returns {Object} 시스템 설정 관련 STATE 및 setter 함수들
 */
export const useSystemSettings = () => {
  // *[1_공통] STATE - 언어/시스템 설정*
  const [showLanguageSelection, setShowLanguageSelection] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('ko');
  const [showChangePasswordPopup, setShowChangePasswordPopup] = useState(false);
  const [changePasswordForm, setChangePasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [fontSize, setFontSize] = useState(
    localStorage.getItem('userFontSize') || 'normal'
  );

  // *[1_공통] 폰트 크기 초기화*
  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
    const savedFontSize = localStorage.getItem('userFontSize');

    if (!savedFontSize && (isMobile || isTablet)) {
      setFontSize('small');
      localStorage.setItem('userFontSize', 'small');
    }
  }, []);

  // *[1_공통] 폰트 크기 스타일 적용*
  useEffect(() => {
    const existingStyle = document.getElementById('employee-font-size-style');
    if (existingStyle) {
      existingStyle.remove();
    }

    let scale = 1.1; // normal (한 단계 크게 조정)
    if (fontSize === 'small') {
      scale = 1.0; // 기본 크기
    } else if (fontSize === 'large') {
      scale = 1.2; // 20% 확대
    }

    const style = document.createElement('style');
    style.id = 'employee-font-size-style';
    style.innerHTML = `
      .employee-mode-content * {
        font-size: calc(1em * ${scale}) !important;
      }
      .employee-mode-content .text-4xs { font-size: calc(0.4375rem * ${scale}) !important; }
      .employee-mode-content .text-3xs { font-size: calc(0.5rem * ${scale}) !important; }
      .employee-mode-content .text-tiny { font-size: calc(0.5625rem * ${scale}) !important; }
      .employee-mode-content .text-2xs { font-size: calc(0.625rem * ${scale}) !important; }
      .employee-mode-content .text-xs { font-size: calc(0.75rem * ${scale}) !important; }
      .employee-mode-content .text-sm { font-size: calc(0.875rem * ${scale}) !important; }
      .employee-mode-content .text-base { font-size: calc(1rem * ${scale}) !important; }
      .employee-mode-content .text-lg { font-size: calc(1.125rem * ${scale}) !important; }
      .employee-mode-content .text-xl { font-size: calc(1.25rem * ${scale}) !important; }
      .employee-mode-content .text-2xl { font-size: calc(1.5rem * ${scale}) !important; }
    `;
    document.head.appendChild(style);

    return () => {
      const styleToRemove = document.getElementById('employee-font-size-style');
      if (styleToRemove) {
        styleToRemove.remove();
      }
    };
  }, [fontSize]);

  return {
    // 언어 설정
    showLanguageSelection,
    setShowLanguageSelection,
    selectedLanguage,
    setSelectedLanguage,
    // 비밀번호 변경
    showChangePasswordPopup,
    setShowChangePasswordPopup,
    changePasswordForm,
    setChangePasswordForm,
    changePasswordError,
    setChangePasswordError,
    changePasswordSuccess,
    setChangePasswordSuccess,
    showCurrentPassword,
    setShowCurrentPassword,
    showNewPassword,
    setShowNewPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    // 사이드바
    sidebarOpen,
    setSidebarOpen,
    // 폰트 크기
    fontSize,
    setFontSize,
  };
};

// ============================================================
// useAuth.js
// ============================================================

export const useAuth = (dependencies = {}) => {
  const {
    loginForm = {},
    admins = [],
    employees = [],
    setCurrentUser = () => {},
    setLoginError = () => {},
    setSelectedLanguage = () => {},
    setShowLanguageSelection = () => {},
    handleTabChange = () => {},
    setCurrentYear = () => {},
    setCurrentMonth = () => {},
    getText = (ko, en) => ko,
    changePasswordForm = {},
    currentUser = {},
    setEmployees = () => {},
    setAdmins = () => {},
    setChangePasswordError = () => {},
    setChangePasswordSuccess = () => {},
    setChangePasswordForm = () => {},
    API_BASE_URL = '',
    setPayrollByMonth = () => {},
    setDashboardDateFilter = () => {},
    setDashboardSelectedDate = () => {},
    formatDateToString = (date) => date.toISOString().split('T')[0],
  } = dependencies;

  // [1_공통] 비밀번호 변경 - 비밀번호 표시/숨김 state
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // [1_공통] 로그인 처리
  const handleLogin = useCallback(
    async (e) => {
      e.preventDefault();

      // 1. 관리자 로그인 확인 (DB API 사용)
      try {
        const adminResponse = await fetch(
          `${API_BASE_URL}/admin/admins/login`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: loginForm.id,
              password: loginForm.password,
            }),
          }
        );

        if (adminResponse.ok) {
          const adminData = await adminResponse.json();
          if (adminData.success) {
            const adminUser = {
              ...adminData.admin,
              isAdmin: true,
              role: 'admin',
              id: adminData.admin.adminId || adminData.admin.id,
            };
            setCurrentUser(adminUser);
            sessionStorage.setItem('currentUser', JSON.stringify(adminUser));

            // ✅ 로그인 직후임을 표시 (AI 추천사항 자동 생성용)
            sessionStorage.setItem('justLoggedIn', 'true');

            setLoginError('');
            setSelectedLanguage('ko');
            setShowLanguageSelection(false);

            // 관리자 로그인 시 항상 대시보드로 이동
            handleTabChange('dashboard');

            // ✅ 대시보드 날짜 필터를 '오늘'로 초기화
            setDashboardDateFilter('today');
            setDashboardSelectedDate(formatDateToString(new Date()));

            const now = new Date();
            setCurrentYear(now.getFullYear());
            setCurrentMonth(now.getMonth() + 1);

            // 관리자 로그인 시 근무형태 자동 분석
            try {
              await fetch(`${API_BASE_URL}/hr/analyze-work-type`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  year: now.getFullYear(),
                  month: now.getMonth() + 1,
                }),
              });
            } catch (error) {
              console.error('❌ 근무형태 자동 분석 실패:', error);
            }

            return;
          }
        }
      } catch (adminError) {
        // 관리자 로그인 실패 시 직원 로그인 시도
      }

      // 2. 직원 로그인 확인 (DB)
      try {
        const response = await EmployeeAPI.login({
          id: loginForm.id,
          password: loginForm.password,
        });

        if (response.success) {
          const employeeUser = response.data;
          setCurrentUser(employeeUser);
          sessionStorage.setItem('currentUser', JSON.stringify(employeeUser));
          setLoginError('');
          setShowLanguageSelection(true); // 직원은 언어 선택 화면 표시

          const now = new Date();
          setCurrentYear(now.getFullYear());
          setCurrentMonth(now.getMonth() + 1);

          // 일반직원 로그인 시 해당 직원만 근무형태 자동 분석
          try {
            await fetch(`${API_BASE_URL}/hr/analyze-work-type`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                year: now.getFullYear(),
                month: now.getMonth() + 1,
                employeeId: employeeUser.employeeId || employeeUser.id, // 해당 직원만
              }),
            });
          } catch (error) {
            console.error('❌ 근무형태 자동 분석 실패:', error);
          }

          // 일반직원 로그인 시 급여 데이터 불러오기
          try {
            const employeeId = employeeUser.employeeId || employeeUser.id;
            const payrollResponse = await PayrollAPI.getEmployeePayroll(
              employeeId,
              null,
              12
            );

            if (payrollResponse && payrollResponse.data) {
              // payrollByMonth 형식으로 변환하여 저장
              const payrollData = {};
              payrollResponse.data.forEach((item) => {
                const yearMonth = `${item.year}-${String(item.month).padStart(
                  2,
                  '0'
                )}`;
                payrollData[yearMonth] = item;
              });
              setPayrollByMonth(payrollData);
            }
          } catch (error) {
            console.error('❌ 로그인 시 급여 데이터 불러오기 실패:', error);
          }

          return;
        }
      } catch (error) {
        const errorMessage =
          error.response?.data?.error ||
          getText(
            '아이디 및 비밀번호를 확인 후 다시 로그인해주세요.',
            'Please check your ID and password and try logging in again.'
          );
        setLoginError(errorMessage);
        return;
      }

      setLoginError(
        getText(
          '아이디 및 비밀번호를 확인 후 다시 로그인해주세요.',
          'Please check your ID and password and try logging in again.'
        )
      );
    },
    [
      loginForm,
      setCurrentUser,
      setLoginError,
      setSelectedLanguage,
      setShowLanguageSelection,
      handleTabChange,
      setCurrentYear,
      setCurrentMonth,
      getText,
      setPayrollByMonth,
    ]
  );

  // [3_일반직원 모드] 3.1_사원 정보 - 비밀번호 변경
  const handleChangePassword = useCallback(async () => {
    setChangePasswordError('');
    setChangePasswordSuccess('');

    if (!changePasswordForm.new || changePasswordForm.new.length < 4) {
      setChangePasswordError(
        getText(
          '새 비밀번호는 4자 이상이어야 합니다.',
          'New password must be at least 4 characters long.'
        )
      );
      return;
    }
    if (changePasswordForm.new !== changePasswordForm.confirm) {
      setChangePasswordError(
        getText(
          '새 비밀번호와 확인이 일치하지 않습니다.',
          'New password and confirmation do not match.'
        )
      );
      return;
    }

    // 관리자와 직원을 구분하여 비밀번호 업데이트
    if (currentUser.role === 'admin') {
      try {
        const adminId = currentUser.adminId || currentUser.id;

        const url = `${API_BASE_URL}/admin/admins/${adminId}/password`;

        const response = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentPassword: changePasswordForm.current,
            newPassword: changePasswordForm.new,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setChangePasswordError(data.error || '비밀번호 변경에 실패했습니다.');
          return;
        }

        // 프론트엔드 상태도 업데이트
        setAdmins((prev) =>
          prev.map((admin) =>
            admin.adminId === adminId || admin.id === adminId
              ? { ...admin, password: changePasswordForm.new }
              : admin
          )
        );

        setCurrentUser((prev) => ({
          ...prev,
          password: changePasswordForm.new,
        }));

        setChangePasswordSuccess(
          getText(
            '비밀번호가 변경되었습니다.',
            'Password changed successfully.'
          )
        );

        setChangePasswordForm({ current: '', new: '', confirm: '' });
      } catch (error) {
        console.error('❌ 비밀번호 변경 오류:', error);
        setChangePasswordError('비밀번호 변경 중 오류가 발생했습니다.');
      }
    } else {
      // 직원 비밀번호 변경 - API 호출
      try {
        const employeeId = currentUser.employeeId || currentUser.id;

        const url = `${API_BASE_URL}/hr/employees/${employeeId}/password`;

        const response = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentPassword: changePasswordForm.current,
            newPassword: changePasswordForm.new,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setChangePasswordError(data.error || '비밀번호 변경에 실패했습니다.');
          return;
        }

        // 프론트엔드 상태도 업데이트
        setEmployees((prev) =>
          prev.map((emp) =>
            emp.employeeId === employeeId || emp.id === employeeId
              ? { ...emp, password: changePasswordForm.new }
              : emp
          )
        );

        setCurrentUser((prev) => ({
          ...prev,
          password: changePasswordForm.new,
        }));

        setChangePasswordSuccess(
          getText(
            '비밀번호가 변경되었습니다.',
            'Password changed successfully.'
          )
        );

        setChangePasswordForm({ current: '', new: '', confirm: '' });
      } catch (error) {
        console.error('❌ 비밀번호 변경 오류:', error);
        setChangePasswordError('비밀번호 변경 중 오류가 발생했습니다.');
      }
    }
  }, [
    changePasswordForm,
    currentUser,
    setEmployees,
    setAdmins,
    setCurrentUser,
    setChangePasswordError,
    setChangePasswordSuccess,
    setChangePasswordForm,
    getText,
    API_BASE_URL,
  ]);

  return {
    handleLogin,
    handleChangePassword,
    showCurrentPassword,
    setShowCurrentPassword,
    showNewPassword,
    setShowNewPassword,
    showConfirmPassword,
    setShowConfirmPassword,
  };
};

// ============================================================
// useMidnightScheduler.js
// ============================================================

// *[2_관리자 모드] 2.4.7_자정 스케줄러 (만료 정기알림 정리)*

/**
 * 자정마다 특정 작업을 실행하는 스케줄러 훅
 * @param {Function} task - 자정에 실행할 작업 함수
 */
export const useMidnightScheduler = (task) => {
  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setDate(now.getDate() + 1);
    nextMidnight.setHours(0, 0, 0, 0);
    const msToMidnight = nextMidnight.getTime() - now.getTime();

    let dailyId = null;
    const timerId = setTimeout(() => {
      task(); // 첫 자정
      dailyId = setInterval(() => {
        task(); // 매일 자정
      }, 24 * 60 * 60 * 1000);
    }, msToMidnight);

    return () => {
      clearTimeout(timerId);
      if (dailyId) clearInterval(dailyId);
    };
  }, [task]);
};

// ============================================================
// useMenuStateReset.js
// ============================================================

// *[2_관리자 모드] 2.0.5_메뉴 변경시 상태 초기화*

/**
 * 메뉴(탭) 변경 시 검색 필터 및 편집 상태를 초기화하는 커스텀 훅
 * @param {Object} params - 상태 업데이트 함수들을 포함하는 객체
 * @param {string} params.activeTab - 현재 활성화된 탭
 * @param {Function} params.setLeaveSearch - 연차 검색 상태 업데이트 함수
 * @param {Function} params.setSuggestionSearch - 건의 검색 상태 업데이트 함수
 * @param {Function} params.setNoticeSearch - 공지 검색 상태 업데이트 함수
 * @param {Function} params.setEvaluationSearch - 평가 검색 상태 업데이트 함수
 * @param {Function} params.setEmployeeSearchFilter - 직원 검색 필터 업데이트 함수
 * @param {Function} params.setEmployeeSearchTerm - 직원 검색어 업데이트 함수
 * @param {Function} params.setSearchResults - 검색 결과 업데이트 함수
 * @param {Function} params.setEditingEmpId - 편집 중인 직원 ID 업데이트 함수
 * @param {Function} params.setEditForm - 편집 폼 업데이트 함수
 * @param {Function} params.setEditingNoticeId - 편집 중인 공지 ID 업데이트 함수
 * @param {Function} params.setNoticeForm - 공지 폼 업데이트 함수
 * @param {Function} params.setNoticeFiles - 공지 파일 업데이트 함수
 * @param {Function} params.setEmployeeSortField - 직원 정렬 필드 업데이트 함수
 * @param {Function} params.setEmployeeSortOrder - 직원 정렬 순서 업데이트 함수
 * @param {Function} params.setLeaveSortField - 연차 정렬 필드 업데이트 함수
 * @param {Function} params.setLeaveSortOrder - 연차 정렬 순서 업데이트 함수
 * @param {Function} params.setSuggestionSortField - 건의 정렬 필드 업데이트 함수
 * @param {Function} params.setSuggestionSortOrder - 건의 정렬 순서 업데이트 함수
 * @param {Function} params.setAnnualLeaveSortField - 연차 정렬 필드 업데이트 함수
 * @param {Function} params.setAnnualLeaveSortOrder - 연차 정렬 순서 업데이트 함수
 * @param {Function} params.setEditingAnnualLeave - 편집 중인 연차 업데이트 함수
 * @param {Function} params.setEditAnnualData - 연차 데이터 편집 업데이트 함수
 */
export const useMenuStateReset = ({
  activeTab,
  setLeaveSearch,
  setSuggestionSearch,
  setNoticeSearch,
  setEvaluationSearch,
  setEmployeeSearchFilter,
  setEmployeeSearchTerm,
  setSearchResults,
  setEditingEmpId,
  setEditForm,
  setEditingNoticeId,
  setNoticeForm,
  setNoticeFiles,
  setEmployeeSortField,
  setEmployeeSortOrder,
  setLeaveSortField,
  setLeaveSortOrder,
  setSuggestionSortField,
  setSuggestionSortOrder,
  setAnnualLeaveSortField,
  setAnnualLeaveSortOrder,
  setEditingAnnualLeave,
  setEditAnnualData,
}) => {
  useEffect(() => {
    setLeaveSearch({
      year: '',
      month: '',
      day: '',
      dept: '전체',
      status: '전체',
      type: '전체',
      position: '전체',
      keyword: '',
    });
    setSuggestionSearch({
      year: '',
      month: '',
      day: '',
      department: '전체',
      type: '전체',
      status: '전체',
      keyword: '',
    });
    setNoticeSearch({
      year: '',
      month: '',
      day: '',
      keyword: '',
    });
    setEvaluationSearch({
      year: '',
      department: '전체',
      grade: '전체',
      keyword: '',
    });

    setEmployeeSearchFilter({
      joinDate: '',
      department: '',
      status: '',
      name: '',
      position: '',
      role: '',
      payType: '',
      subDepartment: '',
    });
    setEmployeeSearchTerm('');
    setSearchResults([]);

    setEditingEmpId(null);
    setEditForm({
      id: '',
      name: '',
      position: '',
      department: '',
      joinDate: '',
      resignDate: '',
      workType: '주간',
      status: '',
      phone: '',
      address: '',
      password: '',
    });

    setEditingNoticeId(null);
    setNoticeForm({ id: null, title: '', content: '' });
    setNoticeFiles([]);

    setEmployeeSortField('');
    setEmployeeSortOrder('asc');
    setLeaveSortField('');
    setLeaveSortOrder('asc');
    setSuggestionSortField('');
    setSuggestionSortOrder('asc');
    setAnnualLeaveSortField('');
    setAnnualLeaveSortOrder('asc');

    setEditingAnnualLeave(null);
    setEditAnnualData({});
  }, [
    activeTab,
    setLeaveSearch,
    setSuggestionSearch,
    setNoticeSearch,
    setEvaluationSearch,
    setEmployeeSearchFilter,
    setEmployeeSearchTerm,
    setSearchResults,
    setEditingEmpId,
    setEditForm,
    setEditingNoticeId,
    setNoticeForm,
    setNoticeFiles,
    setEmployeeSortField,
    setEmployeeSortOrder,
    setLeaveSortField,
    setLeaveSortOrder,
    setSuggestionSortField,
    setSuggestionSortOrder,
    setAnnualLeaveSortField,
    setAnnualLeaveSortOrder,
    setEditingAnnualLeave,
    setEditAnnualData,
  ]);
};

// ============================================================
// [1_공통] SERVICES
// ============================================================

// ============ holidayService.js ============
// 한국 공휴일 실시간 연동 서비스

class HolidayService {
  constructor() {
    this.holidaysCache = new Map();
    this.lastUpdated = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24시간
    this.holidays = new Holidays('KR'); // 한국 공휴일
  }

  // 캐시 유효성 검사
  isCacheValid(year) {
    const lastUpdate = this.lastUpdated.get(year);
    if (!lastUpdate) return false;
    return Date.now() - lastUpdate < this.cacheExpiry;
  }

  // 공휴일 데이터 API에서 가져오기 (하드코딩 + 외부API 임시공휴일)
  async fetchHolidaysFromAPI(year) {
    try {
      // [1단계] 하드코딩된 양력 + 음력 공휴일 로드
      let holidays = await this.simulateKoreanAPI(year);

      // [2단계] 외부 API에서 임시공휴일만 추가
      try {
        const apiHolidays = await this.fetchFromKoreanAPI(year);

        // API에서 가져온 데이터 중 임시공휴일만 추가
        if (apiHolidays && Object.keys(apiHolidays).length > 0) {
          let addedCount = 0;
          Object.entries(apiHolidays).forEach(([date, name]) => {
            const nameStr = String(name);
            // 임시공휴일만 추가 (선거일, 특정일 임시휴일 등)
            if (nameStr.includes('임시공휴일')) {
              // 이미 있는 날짜가 아닌 경우에만 추가
              if (!holidays[date]) {
                holidays[date] = name;
                addedCount++;
              }
            }
          });
          // if (addedCount > 0) {
          //   console.log(`✅ 외부API에서 임시공휴일 추가 (${addedCount / 2}일)`);
          // }
        }
      } catch (apiError) {
        console.warn(
          '⚠️ 외부 API 실패, 하드코딩 공휴일만 사용:',
          apiError.message
        );
      }

      return holidays;
    } catch (error) {
      // console.error('공휴일 로드 전체 실패:', error);
      return this.getBasicHolidays(year);
    }
  }

  // date-holidays 라이브러리 사용
  async fetchFromDateHolidays(year) {
    try {
      const holidaysList = this.holidays.getHolidays(year);
      const holidaysMap = {};

      holidaysList.forEach((holiday) => {
        if (holiday.date) {
          const dateStr = holiday.date.toISOString().split('T')[0];
          holidaysMap[dateStr] = holiday.name;
        }
      });

      return holidaysMap;
    } catch (error) {
      throw new Error(`date-holidays API 실패: ${error.message}`);
    }
  }

  // 한국 공공데이터 API 사용 (공공데이터포털 실제 연동)
  async fetchFromKoreanAPI(year) {
    try {
      const apiKey = process.env.REACT_APP_HOLIDAY_API_KEY;

      if (!apiKey) {
        // console.warn('공휴일 API 키가 설정되지 않았습니다. 폴백 데이터 사용');
        return await this.simulateKoreanAPI(year);
      }

      // 공공데이터포털 특일정보 API 호출
      const url = `https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?solYear=${year}&ServiceKey=${apiKey}&_type=json&numOfRows=100`;

      // console.log(`🌐 공공데이터포털 API 호출: ${year}년 공휴일 데이터`);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // API 응답 확인
      if (data.response?.header?.resultCode !== '00') {
        throw new Error(
          `API 에러: ${data.response?.header?.resultMsg || '알 수 없는 오류'}`
        );
      }

      const holidays = {};
      const items = data.response?.body?.items?.item;

      if (!items) {
        // console.warn(`${year}년 공휴일 데이터가 없습니다. 폴백 사용`);
        return await this.simulateKoreanAPI(year);
      }

      // 배열이 아닌 경우 배열로 변환 (1개만 있을 때)
      const itemList = Array.isArray(items) ? items : [items];

      itemList.forEach((item) => {
        if (item.locdate) {
          const locdate = String(item.locdate);
          const dateStr = `${locdate.slice(0, 4)}-${locdate.slice(
            4,
            6
          )}-${locdate.slice(6, 8)}`;
          const shortDate = `${locdate.slice(4, 6)}-${locdate.slice(6, 8)}`;

          holidays[dateStr] = item.dateName || '공휴일';
          holidays[shortDate] = item.dateName || '공휴일';
        }
      });

      // console.log(
      //   `✅ 공공데이터포털에서 ${year}년 공휴일 ${
      //     Object.keys(holidays).length / 2
      //   }일 로드 완료`
      // );

      return holidays;
    } catch (error) {
      console.error(`공공데이터포털 API 실패:`, error.message);
      return await this.simulateKoreanAPI(year);
    }
  }

  // 공휴일 우선순위 판단 함수
  getHolidayPriority(holidayName) {
    if (!holidayName) return 999;

    const name = String(holidayName);

    // 우선순위 1: 양력 공휴일
    const solarHolidays = [
      '신정',
      '삼일절',
      '어린이날',
      '현충일',
      '광복절',
      '개천절',
      '한글날',
      '성탄절',
    ];
    if (solarHolidays.some((h) => name.includes(h))) {
      return 1;
    }

    // 우선순위 2: 음력 공휴일
    const lunarHolidays = ['설날', '추석', '부처님오신날'];
    if (lunarHolidays.some((h) => name.includes(h)) || name.includes('연휴')) {
      return 2;
    }

    // 우선순위 3: 대체공휴일 및 임시공휴일
    if (
      name.includes('대체공휴일') ||
      name.includes('임시공휴일') ||
      name.includes('대체')
    ) {
      return 3;
    }

    // 기타
    return 4;
  }

  // 공휴일 우선순위 적용 (중복 제거)
  applyHolidayPriority(holidays) {
    const result = {};
    const dateMap = new Map(); // 날짜별 최고 우선순위 공휴일 저장

    // 모든 공휴일을 순회하며 우선순위 확인
    Object.entries(holidays).forEach(([date, name]) => {
      const priority = this.getHolidayPriority(name);

      if (!dateMap.has(date)) {
        dateMap.set(date, { name, priority });
      } else {
        const existing = dateMap.get(date);
        if (priority < existing.priority) {
          // 우선순위가 더 높으면 교체
          dateMap.set(date, { name, priority });
        }
      }
    });

    // Map을 객체로 변환
    dateMap.forEach(({ name }, date) => {
      result[date] = name;
    });

    return result;
  }

  // 시뮬레이션된 한국 API 응답 (폴백용)
  async simulateKoreanAPI(year) {
    // 먼저 기본 공휴일 설정
    const holidays = {
      [`${year}-01-01`]: '신정',
      [`${year}-03-01`]: '삼일절',
      [`${year}-05-05`]: '어린이날',
      [`${year}-06-06`]: '현충일',
      [`${year}-08-15`]: '광복절',
      [`${year}-10-03`]: '개천절',
      [`${year}-10-09`]: '한글날',
      [`${year}-12-25`]: '성탄절',
    };

    // 음력 공휴일 추가 (async 호출)
    const lunarHolidays = await this.getLunarHolidays(year);
    Object.assign(holidays, lunarHolidays);

    // 우선순위 적용
    const prioritizedHolidays = this.applyHolidayPriority(holidays);

    return prioritizedHolidays;
  }

  // 대체 API 소스
  async fetchFromAlternativeAPI(year) {
    // 다른 공휴일 API 서비스 호출
    throw new Error('대체 API 미구현');
  }

  // 음력 공휴일 계산 (2100년까지 지원) - 하드코딩 데이터만 사용
  async getLunarHolidays(year) {
    const lunarHolidays = {};

    try {
      // 확장된 하드코딩 데이터 (2020-2100년)
      this.getExtendedLunarHolidays(year, lunarHolidays);

      if (Object.keys(lunarHolidays).length > 0) {
        return lunarHolidays;
      }

      // 근사 계산 알고리즘 (폴백용)
      // console.warn(`⚠️ ${year}년 음력 공휴일 데이터 없음 - 근사값 사용`);
      this.calculateApproximateLunarHolidays(year, lunarHolidays);
      return lunarHolidays;
    } catch (error) {
      // console.error('음력 공휴일 계산 중 오류:', error);
      return lunarHolidays;
    }
  }

  // 패키지를 사용한 음력 공휴일 계산
  calculateLunarHolidaysWithPackage(korean, year, lunarHolidays) {
    try {
      let successCount = 0;

      // 설날 (음력 1월 1일)
      const newYear = korean.lunarToSolar(year, 1, 1);
      if (newYear && newYear.year && newYear.month && newYear.day) {
        const newYearDate = `${newYear.year}-${String(newYear.month).padStart(
          2,
          '0'
        )}-${String(newYear.day).padStart(2, '0')}`;
        const newYearShort = `${String(newYear.month).padStart(
          2,
          '0'
        )}-${String(newYear.day).padStart(2, '0')}`;

        lunarHolidays[newYearDate] = '설날';
        lunarHolidays[newYearShort] = '설날';

        // 설날 연휴 (전날, 다음날)
        const beforeNewYear = new Date(
          newYear.year,
          newYear.month - 1,
          newYear.day - 1
        );
        const afterNewYear = new Date(
          newYear.year,
          newYear.month - 1,
          newYear.day + 1
        );

        const beforeDateStr = beforeNewYear.toISOString().split('T')[0];
        const afterDateStr = afterNewYear.toISOString().split('T')[0];
        const beforeShort = `${String(beforeNewYear.getMonth() + 1).padStart(
          2,
          '0'
        )}-${String(beforeNewYear.getDate()).padStart(2, '0')}`;
        const afterShort = `${String(afterNewYear.getMonth() + 1).padStart(
          2,
          '0'
        )}-${String(afterNewYear.getDate()).padStart(2, '0')}`;

        lunarHolidays[beforeDateStr] = '설날연휴';
        lunarHolidays[afterDateStr] = '설날연휴';
        lunarHolidays[beforeShort] = '설날연휴';
        lunarHolidays[afterShort] = '설날연휴';
        successCount++;
      } else {
        console.warn(`${year}년 설날 계산 실패 (null 반환)`);
      }

      // 추석 (음력 8월 15일)
      const chuseok = korean.lunarToSolar(year, 8, 15);
      if (chuseok && chuseok.year && chuseok.month && chuseok.day) {
        const chuseokDate = `${chuseok.year}-${String(chuseok.month).padStart(
          2,
          '0'
        )}-${String(chuseok.day).padStart(2, '0')}`;
        const chuseokShort = `${String(chuseok.month).padStart(
          2,
          '0'
        )}-${String(chuseok.day).padStart(2, '0')}`;

        lunarHolidays[chuseokDate] = '추석';
        lunarHolidays[chuseokShort] = '추석';

        // 추석 연휴 (전날, 다음날)
        const beforeChuseok = new Date(
          chuseok.year,
          chuseok.month - 1,
          chuseok.day - 1
        );
        const afterChuseok = new Date(
          chuseok.year,
          chuseok.month - 1,
          chuseok.day + 1
        );

        const beforeDateStr = beforeChuseok.toISOString().split('T')[0];
        const afterDateStr = afterChuseok.toISOString().split('T')[0];
        const beforeShort = `${String(beforeChuseok.getMonth() + 1).padStart(
          2,
          '0'
        )}-${String(beforeChuseok.getDate()).padStart(2, '0')}`;
        const afterShort = `${String(afterChuseok.getMonth() + 1).padStart(
          2,
          '0'
        )}-${String(afterChuseok.getDate()).padStart(2, '0')}`;

        lunarHolidays[beforeDateStr] = '추석연휴';
        lunarHolidays[afterDateStr] = '추석연휴';
        lunarHolidays[beforeShort] = '추석연휴';
        lunarHolidays[afterShort] = '추석연휴';
        successCount++;
      } else {
        console.warn(`${year}년 추석 계산 실패 (null 반환)`);
      }

      // 부처님오신날 (음력 4월 8일)
      const buddhasBirthday = korean.lunarToSolar(year, 4, 8);
      if (
        buddhasBirthday &&
        buddhasBirthday.year &&
        buddhasBirthday.month &&
        buddhasBirthday.day
      ) {
        const buddhasDate = `${buddhasBirthday.year}-${String(
          buddhasBirthday.month
        ).padStart(2, '0')}-${String(buddhasBirthday.day).padStart(2, '0')}`;
        const buddhasShort = `${String(buddhasBirthday.month).padStart(
          2,
          '0'
        )}-${String(buddhasBirthday.day).padStart(2, '0')}`;

        lunarHolidays[buddhasDate] = '부처님오신날';
        lunarHolidays[buddhasShort] = '부처님오신날';
        successCount++;
      } else {
        console.warn(`${year}년 부처님오신날 계산 실패 (null 반환)`);
      }

      // console.log(
      //   `✅ ${year}년 음력 공휴일 패키지 계산: ${successCount}/3 성공`
      // );
      return successCount > 0; // 최소 1개 이상 성공하면 true
    } catch (error) {
      // console.warn('패키지를 사용한 음력 공휴일 계산 실패:', error);
      return false;
    }
  }

  // 하드코딩된 음력 공휴일 데이터 (패키지 실패시 대체용)
  getFallbackLunarHolidays(year, lunarHolidays) {
    // 연도별 음력 공휴일 하드코딩 데이터 (2020-2034년)
    const fallbackData = {
      2020: {
        '01-24': '설날연휴',
        '2020-01-24': '설날연휴',
        '01-25': '설날',
        '2020-01-25': '설날',
        '01-26': '설날연휴',
        '2020-01-26': '설날연휴',
        '01-27': '설날 대체공휴일',
        '2020-01-27': '설날 대체공휴일',
        '04-30': '부처님오신날',
        '2020-04-30': '부처님오신날',
        '09-30': '추석연휴',
        '2020-09-30': '추석연휴',
        '10-01': '추석',
        '2020-10-01': '추석',
        '10-02': '추석연휴',
        '2020-10-02': '추석연휴',
      },
      2021: {
        '02-11': '설날연휴',
        '2021-02-11': '설날연휴',
        '02-12': '설날',
        '2021-02-12': '설날',
        '02-13': '설날연휴',
        '2021-02-13': '설날연휴',
        '05-19': '부처님오신날',
        '2021-05-19': '부처님오신날',
        '09-20': '추석연휴',
        '2021-09-20': '추석연휴',
        '09-21': '추석',
        '2021-09-21': '추석',
        '09-22': '추석연휴',
        '2021-09-22': '추석연휴',
      },
      2022: {
        '01-31': '설날연휴',
        '2022-01-31': '설날연휴',
        '02-01': '설날',
        '2022-02-01': '설날',
        '02-02': '설날연휴',
        '2022-02-02': '설날연휴',
        '05-08': '부처님오신날',
        '2022-05-08': '부처님오신날',
        '09-09': '추석연휴',
        '2022-09-09': '추석연휴',
        '09-10': '추석',
        '2022-09-10': '추석',
        '09-11': '추석연휴',
        '2022-09-11': '추석연휴',
        '09-12': '추석 대체공휴일',
        '2022-09-12': '추석 대체공휴일',
      },
      2023: {
        '01-21': '설날연휴',
        '2023-01-21': '설날연휴',
        '01-22': '설날',
        '2023-01-22': '설날',
        '01-23': '설날연휴',
        '2023-01-23': '설날연휴',
        '01-24': '설날 대체공휴일',
        '2023-01-24': '설날 대체공휴일',
        '05-27': '부처님오신날',
        '2023-05-27': '부처님오신날',
        '09-28': '추석연휴',
        '2023-09-28': '추석연휴',
        '09-29': '추석',
        '2023-09-29': '추석',
        '09-30': '추석연휴',
        '2023-09-30': '추석연휴',
      },
      2024: {
        '02-09': '설날연휴',
        '2024-02-09': '설날연휴',
        '02-10': '설날',
        '2024-02-10': '설날',
        '02-11': '설날연휴',
        '2024-02-11': '설날연휴',
        '02-12': '설날 대체공휴일',
        '2024-02-12': '설날 대체공휴일',
        '05-15': '부처님오신날',
        '2024-05-15': '부처님오신날',
        '09-16': '추석연휴',
        '2024-09-16': '추석연휴',
        '09-17': '추석',
        '2024-09-17': '추석',
        '09-18': '추석연휴',
        '2024-09-18': '추석연휴',
      },
      2025: {
        '01-28': '설날연휴',
        '2025-01-28': '설날연휴',
        '01-29': '설날',
        '2025-01-29': '설날',
        '01-30': '설날연휴',
        '2025-01-30': '설날연휴',
        '05-05': '부처님오신날',
        '2025-05-05': '부처님오신날', // 어린이날과 겹침
        '10-05': '추석연휴',
        '2025-10-05': '추석연휴',
        '10-06': '추석',
        '2025-10-06': '추석',
        '10-07': '추석연휴',
        '2025-10-07': '추석연휴',
        '10-08': '추석 대체공휴일',
        '2025-10-08': '추석 대체공휴일',
      },
      2026: {
        '02-16': '설날연휴',
        '2026-02-16': '설날연휴',
        '02-17': '설날',
        '2026-02-17': '설날',
        '02-18': '설날연휴',
        '2026-02-18': '설날연휴',
        '05-24': '부처님오신날',
        '2026-05-24': '부처님오신날',
        '09-24': '추석연휴',
        '2026-09-24': '추석연휴',
        '09-25': '추석',
        '2026-09-25': '추석',
        '09-26': '추석연휴',
        '2026-09-26': '추석연휴',
        '09-28': '대체공휴일',
        '2026-09-28': '대체공휴일',
      },
      2027: {
        '02-06': '설날연휴',
        '2027-02-06': '설날연휴',
        '02-07': '설날',
        '2027-02-07': '설날',
        '02-08': '설날연휴',
        '2027-02-08': '설날연휴',
        '02-09': '대체공휴일',
        '2027-02-09': '대체공휴일',
        '05-13': '부처님오신날',
        '2027-05-13': '부처님오신날',
        '10-14': '추석연휴',
        '2027-10-14': '추석연휴',
        '10-15': '추석',
        '2027-10-15': '추석',
        '10-16': '추석연휴',
        '2027-10-16': '추석연휴',
        '10-18': '대체공휴일',
        '2027-10-18': '대체공휴일',
      },
      2028: {
        '01-25': '설날연휴',
        '2028-01-25': '설날연휴',
        '01-26': '설날',
        '2028-01-26': '설날',
        '01-27': '설날연휴',
        '2028-01-27': '설날연휴',
        '05-01': '부처님오신날',
        '2028-05-01': '부처님오신날',
        '10-02': '추석연휴',
        '2028-10-02': '추석연휴',
        '10-03': '추석/개천절',
        '2028-10-03': '추석/개천절', // 개천절과 겹침
        '10-04': '추석연휴',
        '2028-10-04': '추석연휴',
      },
      2029: {
        '02-12': '설날연휴',
        '2029-02-12': '설날연휴',
        '02-13': '설날',
        '2029-02-13': '설날',
        '02-14': '설날연휴',
        '2029-02-14': '설날연휴',
        '05-20': '부처님오신날',
        '2029-05-20': '부처님오신날',
        '09-21': '추석연휴',
        '2029-09-21': '추석연휴',
        '09-22': '추석',
        '2029-09-22': '추석',
        '09-23': '추석연휴',
        '2029-09-23': '추석연휴',
        '09-24': '대체공휴일',
        '2029-09-24': '대체공휴일',
      },
      2030: {
        '02-02': '설날연휴',
        '2030-02-02': '설날연휴',
        '02-03': '설날',
        '2030-02-03': '설날',
        '02-04': '설날연휴',
        '2030-02-04': '설날연휴',
        '02-05': '대체공휴일',
        '2030-02-05': '대체공휴일',
        '05-09': '부처님오신날',
        '2030-05-09': '부처님오신날',
        '10-11': '추석연휴',
        '2030-10-11': '추석연휴',
        '10-12': '추석',
        '2030-10-12': '추석',
        '10-13': '추석연휴',
        '2030-10-13': '추석연휴',
        '10-14': '대체공휴일',
        '2030-10-14': '대체공휴일',
      },
      2031: {
        '01-22': '설날연휴',
        '2031-01-22': '설날연휴',
        '01-23': '설날',
        '2031-01-23': '설날',
        '01-24': '설날연휴',
        '2031-01-24': '설날연휴',
        '05-28': '부처님오신날',
        '2031-05-28': '부처님오신날',
        '10-01': '추석연휴',
        '2031-10-01': '추석연휴',
        '10-02': '추석',
        '2031-10-02': '추석',
        '10-03': '추석/개천절',
        '2031-10-03': '추석/개천절',
        '10-06': '대체공휴일',
        '2031-10-06': '대체공휴일',
      },
      2032: {
        '02-10': '설날연휴',
        '2032-02-10': '설날연휴',
        '02-11': '설날',
        '2032-02-11': '설날',
        '02-12': '설날연휴',
        '2032-02-12': '설날연휴',
        '05-16': '부처님오신날',
        '2032-05-16': '부처님오신날',
        '09-19': '추석연휴',
        '2032-09-19': '추석연휴',
        '09-20': '추석',
        '2032-09-20': '추석',
        '09-21': '추석연휴',
        '2032-09-21': '추석연휴',
      },
      2033: {
        '01-30': '설날연휴',
        '2033-01-30': '설날연휴',
        '01-31': '설날',
        '2033-01-31': '설날',
        '02-01': '설날연휴',
        '2033-02-01': '설날연휴',
        '05-06': '부처님오신날',
        '2033-05-06': '부처님오신날',
        '10-09': '추석연휴',
        '2033-10-09': '추석연휴',
        '10-10': '추석/한글날',
        '2033-10-10': '추석/한글날',
        '10-11': '추석연휴',
        '2033-10-11': '추석연휴',
      },
      2034: {
        '02-18': '설날연휴',
        '2034-02-18': '설날연휴',
        '02-19': '설날',
        '2034-02-19': '설날',
        '02-20': '설날연휴',
        '2034-02-20': '설날연휴',
        '05-25': '부처님오신날',
        '2034-05-25': '부처님오신날',
        '09-27': '추석연휴',
        '2034-09-27': '추석연휴',
        '09-28': '추석',
        '2034-09-28': '추석',
        '09-29': '추석연휴',
        '2034-09-29': '추석연휴',
      },
    };

    const yearData = fallbackData[year];
    if (yearData) {
      Object.assign(lunarHolidays, yearData);
    }
  }

  // 확장된 음력 공휴일 데이터 (2031-2100년 포함)
  getExtendedLunarHolidays(year, lunarHolidays) {
    // 먼저 기본 폴백 데이터 시도 (2020-2030년)
    this.getFallbackLunarHolidays(year, lunarHolidays);

    if (Object.keys(lunarHolidays).length > 0) {
      return; // 기본 데이터가 있으면 반환
    }

    // 확장 데이터: 주요 연도 (10년 단위 + 중요 연도)
    const extendedData = {
      2035: {
        '02-16': '설날연휴',
        '2035-02-16': '설날연휴',
        '02-17': '설날',
        '2035-02-17': '설날',
        '02-18': '설날연휴',
        '2035-02-18': '설날연휴',
        '04-26': '부처님오신날',
        '2035-04-26': '부처님오신날',
        '09-22': '추석연휴',
        '2035-09-22': '추석연휴',
        '09-23': '추석',
        '2035-09-23': '추석',
        '09-24': '추석연휴',
        '2035-09-24': '추석연휴',
      },
      2040: {
        '02-10': '설날연휴',
        '2040-02-10': '설날연휴',
        '02-11': '설날',
        '2040-02-11': '설날',
        '02-12': '설날연휴',
        '2040-02-12': '설날연휴',
        '05-13': '부처님오신날',
        '2040-05-13': '부처님오신날',
        '09-30': '추석연휴',
        '2040-09-30': '추석연휴',
        '10-01': '추석',
        '2040-10-01': '추석',
        '10-02': '추석연휴',
        '2040-10-02': '추석연휴',
      },
      2050: {
        '02-22': '설날연휴',
        '2050-02-22': '설날연휴',
        '02-23': '설날',
        '2050-02-23': '설날',
        '02-24': '설날연휴',
        '2050-02-24': '설날연휴',
        '05-25': '부처님오신날',
        '2050-05-25': '부처님오신날',
        '10-03': '추석연휴',
        '2050-10-03': '추석연휴',
        '10-04': '추석',
        '2050-10-04': '추석',
        '10-05': '추석연휴',
        '2050-10-05': '추석연휴',
      },
      2060: {
        '02-14': '설날연휴',
        '2060-02-14': '설날연휴',
        '02-15': '설날',
        '2060-02-15': '설날',
        '02-16': '설날연휴',
        '2060-02-16': '설날연휴',
        '05-16': '부처님오신날',
        '2060-05-16': '부처님오신날',
        '09-25': '추석연휴',
        '2060-09-25': '추석연휴',
        '09-26': '추석',
        '2060-09-26': '추석',
        '09-27': '추석연휴',
        '2060-09-27': '추석연휴',
      },
      2070: {
        '02-04': '설날연휴',
        '2070-02-04': '설날연휴',
        '02-05': '설날',
        '2070-02-05': '설날',
        '02-06': '설날연휴',
        '2070-02-06': '설날연휴',
        '05-06': '부처님오신날',
        '2070-05-06': '부처님오신날',
        '09-15': '추석연휴',
        '2070-09-15': '추석연휴',
        '09-16': '추석',
        '2070-09-16': '추석',
        '09-17': '추석연휴',
        '2070-09-17': '추석연휴',
      },
      2080: {
        '02-25': '설날연휴',
        '2080-02-25': '설날연휴',
        '02-26': '설날',
        '2080-02-26': '설날',
        '02-27': '설날연휴',
        '2080-02-27': '설날연휴',
        '05-27': '부처님오신날',
        '2080-05-27': '부처님오신날',
        '10-05': '추석연휴',
        '2080-10-05': '추석연휴',
        '10-06': '추석',
        '2080-10-06': '추석',
        '10-07': '추석연휴',
        '2080-10-07': '추석연휴',
      },
      2090: {
        '02-17': '설날연휴',
        '2090-02-17': '설날연휴',
        '02-18': '설날',
        '2090-02-18': '설날',
        '02-19': '설날연휴',
        '2090-02-19': '설날연휴',
        '05-19': '부처님오신날',
        '2090-05-19': '부처님오신날',
        '09-27': '추석연휴',
        '2090-09-27': '추석연휴',
        '09-28': '추석',
        '2090-09-28': '추석',
        '09-29': '추석연휴',
        '2090-09-29': '추석연휴',
      },
      2100: {
        '02-09': '설날연휴',
        '2100-02-09': '설날연휴',
        '02-10': '설날',
        '2100-02-10': '설날',
        '02-11': '설날연휴',
        '2100-02-11': '설날연휴',
        '05-11': '부처님오신날',
        '2100-05-11': '부처님오신날',
        '09-18': '추석연휴',
        '2100-09-18': '추석연휴',
        '09-19': '추석',
        '2100-09-19': '추석',
        '09-20': '추석연휴',
        '2100-09-20': '추석연휴',
      },
    };

    const yearData = extendedData[year];
    if (yearData) {
      Object.assign(lunarHolidays, yearData);
      //  console.log(
      // `📅 ${year}년 확장 음력 공휴일 데이터 사용:`,
      //    Object.keys(yearData).length / 2,
      //    '개'
      //  );
    }
  }

  // 근사 계산을 통한 음력 공휴일 추정 (최후의 수단)
  calculateApproximateLunarHolidays(year, lunarHolidays) {
    // 음력 1월 1일은 대략 양력 1월 21일 ~ 2월 20일 사이
    // 음력 4월 8일은 대략 양력 5월 초순
    // 음력 8월 15일은 대략 양력 9월 중순 ~ 10월 초순

    // 메톤 주기(19년)를 이용한 근사 계산
    const baseYear = 2025;
    const metonicCycle = 19;
    const yearOffset =
      (((year - baseYear) % metonicCycle) + metonicCycle) % metonicCycle;

    // 2025년 기준 음력 공휴일 날짜
    const base2025 = {
      lunarNewYear: { month: 1, day: 29 }, // 2025년 설날: 1월 29일
      buddha: { month: 5, day: 5 }, // 2025년 부처님오신날: 5월 5일
      chuseok: { month: 10, day: 6 }, // 2025년 추석: 10월 6일
    };

    // 메톤 주기에 따른 대략적인 날짜 이동 (하루 정도 차이)
    const dayShift = Math.floor((yearOffset * 10.875) / metonicCycle);

    // 설날 (음력 1월 1일)
    const lunarNewYear = new Date(
      year,
      base2025.lunarNewYear.month - 1,
      base2025.lunarNewYear.day + dayShift
    );
    const lnyBefore = new Date(lunarNewYear);
    lnyBefore.setDate(lunarNewYear.getDate() - 1);
    const lnyAfter = new Date(lunarNewYear);
    lnyAfter.setDate(lunarNewYear.getDate() + 1);

    lunarHolidays[lnyBefore.toISOString().split('T')[0]] = '설날연휴';
    lunarHolidays[
      `${String(lnyBefore.getMonth() + 1).padStart(2, '0')}-${String(
        lnyBefore.getDate()
      ).padStart(2, '0')}`
    ] = '설날연휴';
    lunarHolidays[lunarNewYear.toISOString().split('T')[0]] = '설날';
    lunarHolidays[
      `${String(lunarNewYear.getMonth() + 1).padStart(2, '0')}-${String(
        lunarNewYear.getDate()
      ).padStart(2, '0')}`
    ] = '설날';
    lunarHolidays[lnyAfter.toISOString().split('T')[0]] = '설날연휴';
    lunarHolidays[
      `${String(lnyAfter.getMonth() + 1).padStart(2, '0')}-${String(
        lnyAfter.getDate()
      ).padStart(2, '0')}`
    ] = '설날연휴';

    // 부처님오신날 (음력 4월 8일)
    const buddha = new Date(
      year,
      base2025.buddha.month - 1,
      base2025.buddha.day + dayShift
    );
    lunarHolidays[buddha.toISOString().split('T')[0]] = '부처님오신날';
    lunarHolidays[
      `${String(buddha.getMonth() + 1).padStart(2, '0')}-${String(
        buddha.getDate()
      ).padStart(2, '0')}`
    ] = '부처님오신날';

    // 추석 (음력 8월 15일)
    const chuseok = new Date(
      year,
      base2025.chuseok.month - 1,
      base2025.chuseok.day + dayShift
    );
    const chuseokBefore = new Date(chuseok);
    chuseokBefore.setDate(chuseok.getDate() - 1);
    const chuseokAfter = new Date(chuseok);
    chuseokAfter.setDate(chuseok.getDate() + 1);

    lunarHolidays[chuseokBefore.toISOString().split('T')[0]] = '추석연휴';
    lunarHolidays[
      `${String(chuseokBefore.getMonth() + 1).padStart(2, '0')}-${String(
        chuseokBefore.getDate()
      ).padStart(2, '0')}`
    ] = '추석연휴';
    lunarHolidays[chuseok.toISOString().split('T')[0]] = '추석';
    lunarHolidays[
      `${String(chuseok.getMonth() + 1).padStart(2, '0')}-${String(
        chuseok.getDate()
      ).padStart(2, '0')}`
    ] = '추석';
    lunarHolidays[chuseokAfter.toISOString().split('T')[0]] = '추석연휴';
    lunarHolidays[
      `${String(chuseokAfter.getMonth() + 1).padStart(2, '0')}-${String(
        chuseokAfter.getDate()
      ).padStart(2, '0')}`
    ] = '추석연휴';

    // console.log(
    //   `⚠️ ${year}년 음력 공휴일 근사값 계산 완료 (정확하지 않을 수 있음): ${
    //     Object.keys(lunarHolidays).length / 2
    //   }일`
    // );
  }

  // 기본 공휴일 (API 실패시 대체용)
  getBasicHolidays(year) {
    return {
      [`${year}-01-01`]: '신정',
      [`${year}-03-01`]: '삼일절',
      [`${year}-05-05`]: '어린이날',
      [`${year}-06-06`]: '현충일',
      [`${year}-08-15`]: '광복절',
      [`${year}-10-03`]: '개천절',
      [`${year}-10-09`]: '한글날',
      [`${year}-12-25`]: '성탄절',
    };
  }

  // 대체공휴일 계산 (한국 관공서의 공휴일에 관한 규정 준수)
  calculateAlternativeHolidays(holidays, year) {
    const alternativeHolidays = { ...holidays };

    // 대체공휴일 적용 대상 공휴일 (연휴가 아닌 개별 공휴일)
    const eligibleHolidays = [
      '신정',
      '삼일절',
      '어린이날',
      '현충일',
      '광복절',
      '개천절',
      '한글날',
      '성탄절',
      '부처님오신날',
      '설날',
      '추석',
    ];

    Object.entries(holidays).forEach(([dateStr, name]) => {
      // 연휴 관련 공휴일은 대체공휴일 대상에서 제외
      if (name.includes('연휴') || name.includes('대체공휴일')) {
        return;
      }

      // 대체공휴일 적용 대상인지 확인
      const isEligible = eligibleHolidays.some((holiday) =>
        name.includes(holiday)
      );
      if (!isEligible) return;

      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();

      // 일요일(0)인 공휴일의 대체공휴일 처리
      if (dayOfWeek === 0) {
        let alternativeDate = new Date(date);
        alternativeDate.setDate(date.getDate() + 1); // 다음날 (월요일)

        // 월요일이 이미 공휴일인 경우 화요일로 이동
        while (
          alternativeHolidays[alternativeDate.toISOString().split('T')[0]]
        ) {
          alternativeDate.setDate(alternativeDate.getDate() + 1);
        }

        const alternativeDateStr = alternativeDate.toISOString().split('T')[0];
        alternativeHolidays[alternativeDateStr] = `${name} 대체공휴일`;

        // MM-DD 형식도 추가
        const [, month, day] = alternativeDateStr.split('-');
        alternativeHolidays[`${month}-${day}`] = `${name} 대체공휴일`;
      }

      // 토요일(6)인 공휴일의 대체공휴일 처리 (2022년부터 적용)
      else if (dayOfWeek === 6 && year >= 2022) {
        let alternativeDate = new Date(date);
        alternativeDate.setDate(date.getDate() + 2); // 다음 월요일

        // 월요일이 이미 공휴일인 경우 화요일로 이동
        while (
          alternativeHolidays[alternativeDate.toISOString().split('T')[0]]
        ) {
          alternativeDate.setDate(alternativeDate.getDate() + 1);
        }

        const alternativeDateStr = alternativeDate.toISOString().split('T')[0];
        alternativeHolidays[alternativeDateStr] = `${name} 대체공휴일`;

        // MM-DD 형식도 추가
        const [, month, day] = alternativeDateStr.split('-');
        alternativeHolidays[`${month}-${day}`] = `${name} 대체공휴일`;
      }
    });

    // 연휴 중복 처리 (설날/추석 연휴와 다른 공휴일이 겹치는 경우)
    this.handleExtendedHolidaysConflicts(alternativeHolidays, year);

    return alternativeHolidays;
  }

  // 연휴 중복 처리 함수
  handleExtendedHolidaysConflicts(holidays, year) {
    // 설날/추석 연휴와 다른 공휴일이 겹치는 경우 연휴 연장 처리
    const extendedHolidayNames = ['설날', '추석'];

    extendedHolidayNames.forEach((holidayName) => {
      const holidayDates = Object.entries(holidays)
        .filter(([, name]) => name.includes(holidayName))
        .map(([date]) => date)
        .sort();

      if (holidayDates.length === 0) return;

      // 연휴 기간 중 다른 공휴일과 겹치는지 확인
      holidayDates.forEach((dateStr, index) => {
        const currentDate = new Date(dateStr);
        const dayOfWeek = currentDate.getDay();

        // 연휴 마지막 날이 토요일이고 다음날 일요일인 경우
        if (index === holidayDates.length - 1 && dayOfWeek === 6) {
          const nextDay = new Date(currentDate);
          nextDay.setDate(currentDate.getDate() + 2); // 월요일로 이동
          const nextDayStr = nextDay.toISOString().split('T')[0];

          if (!holidays[nextDayStr]) {
            holidays[nextDayStr] = `${holidayName} 대체공휴일`;
            const [, month, day] = nextDayStr.split('-');
            holidays[`${month}-${day}`] = `${holidayName} 대체공휴일`;
          }
        }
      });
    });
  }

  // 메인 공휴일 가져오기 함수
  async getHolidays(year) {
    // 캐시 확인
    if (this.isCacheValid(year) && this.holidaysCache.has(year)) {
      // console.log(`💾 ${year}년 공휴일 캐시 사용 (재로드 안함)`);
      return this.holidaysCache.get(year);
    }

    try {
      // console.log(`🔄 ${year}년 공휴일 새로 로드 중...`);

      // API에서 공휴일 데이터 가져오기
      let holidays = await this.fetchHolidaysFromAPI(year);

      // 대체공휴일 계산
      holidays = this.calculateAlternativeHolidays(holidays, year);

      // 우선순위 적용 (양력 > 음력 > 대체/임시)
      holidays = this.applyHolidayPriority(holidays);

      // 캐시에 저장
      this.holidaysCache.set(year, holidays);
      this.lastUpdated.set(year, Date.now());

      //console.log(
      // `${year}년 공휴일 데이터 업데이트 완료:`,
      //  Object.keys(holidays).length,
      //  '일'
      //);

      return holidays;
    } catch (error) {
      // console.error(`${year}년 공휴일 데이터 가져오기 실패:`, error);

      // 캐시된 데이터가 있으면 반환
      if (this.holidaysCache.has(year)) {
        // console.warn('캐시된 공휴일 데이터 사용');
        return this.holidaysCache.get(year);
      }

      // 기본 공휴일 반환
      return this.getBasicHolidays(year);
    }
  }

  // 특정 날짜가 공휴일인지 확인
  async isHoliday(dateStr) {
    const year = new Date(dateStr).getFullYear();
    const holidays = await this.getHolidays(year);
    return holidays[dateStr] || null;
  }

  // 월별 공휴일 가져오기
  async getMonthHolidays(year, month) {
    const holidays = await this.getHolidays(year);
    const monthHolidays = {};

    Object.entries(holidays).forEach(([dateStr, name]) => {
      const date = new Date(dateStr);
      if (date.getMonth() + 1 === month) {
        monthHolidays[dateStr] = name;
      }
    });

    return monthHolidays;
  }

  // 캐시 초기화 (강제 업데이트용)
  clearCache(year = null) {
    if (year) {
      this.holidaysCache.delete(year);
      this.lastUpdated.delete(year);
    } else {
      this.holidaysCache.clear();
      this.lastUpdated.clear();
    }
  }

  // 여러 연도 공휴일 미리 로드
  async preloadHolidays(years) {
    const promises = years.map((year) => this.getHolidays(year));
    try {
      await Promise.all(promises);
      // console.log('공휴일 데이터 미리 로드 완료:', years);
    } catch (error) {
      // console.error('공휴일 데이터 미리 로드 실패:', error);
    }
  }

  // 확장된 연도 범위 공휴일 데이터 로드 (과거/미래 지속 연동)
  async loadExtendedYearRange(
    centerYear = new Date().getFullYear(),
    range = 5
  ) {
    const startYear = centerYear - range;
    const endYear = centerYear + range;
    const years = [];

    for (let year = startYear; year <= endYear; year++) {
      years.push(year);
    }

    // console.log(
    //   `📅 확장 연도 범위 로드: ${startYear}-${endYear} (총 ${years.length}년)`
    // );

    // 병렬 로드로 성능 최적화
    const batchSize = 3; // 한 번에 3년씩 로드
    for (let i = 0; i < years.length; i += batchSize) {
      const batch = years.slice(i, i + batchSize);

      try {
        await Promise.all(batch.map((year) => this.getHolidays(year)));
        // console.log(`✅ 배치 로드 완료: ${batch.join(', ')}`);

        // 배치 간 약간의 지연 (서버 부하 방지)
        if (i + batchSize < years.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.warn(`⚠️ 배치 로드 실패: ${batch.join(', ')}`, error);
      }
    }

    return years;
  }

  // 주기적 업데이트 시스템 (매일 자정 1회 실행)
  startPeriodicUpdate(intervalHours = 24) {
    // 기존 타이머가 있으면 제거
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    // 공휴일 업데이트 함수
    const updateHolidays = async () => {
      try {
        // console.log('🔄 [자정] 공휴일 데이터 업데이트 시작...');

        const currentYear = new Date().getFullYear();
        // 현재연도 기준 ±10년 업데이트 (2100년까지 대비)
        const yearsToUpdate = [];
        for (let i = -10; i <= 10; i++) {
          yearsToUpdate.push(currentYear + i);
        }

        // 캐시 만료 시간 체크 후 필요한 경우만 업데이트
        const outdatedYears = yearsToUpdate.filter((year) => {
          const lastUpdate = this.lastUpdated.get(year);
          return !lastUpdate || Date.now() - lastUpdate > this.cacheExpiry;
        });

        if (outdatedYears.length > 0) {
          // 캐시 초기화 후 새로운 데이터 로드 (배치로 처리)
          const batchSize = 5;
          for (let i = 0; i < outdatedYears.length; i += batchSize) {
            const batch = outdatedYears.slice(i, i + batchSize);
            batch.forEach((year) => this.clearCache(year));
            await Promise.all(batch.map((year) => this.getHolidays(year)));
          }

          // console.log('✅ [자정] 공휴일 데이터 업데이트 완료');

          // App.js에 업데이트 완료 알림 (커스텀 이벤트)
          window.dispatchEvent(
            new CustomEvent('holidayDataUpdated', {
              detail: { years: outdatedYears },
            })
          );
        } else {
        }
      } catch (error) {
        // console.error('❌ [자정] 공휴일 데이터 업데이트 실패:', error);
      }

      // 다음 자정까지의 시간 계산 후 재스케줄링
      this.scheduleNextMidnightUpdate();
    };

    // 다음 자정까지 시간 계산 및 스케줄링
    this.scheduleNextMidnightUpdate = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0); // 다음날 자정 00:00:00

      const timeUntilMidnight = tomorrow.getTime() - now.getTime();

      this.updateTimer = setTimeout(updateHolidays, timeUntilMidnight);
    };

    // 최초 스케줄링
    this.scheduleNextMidnightUpdate();
    // console.log(`⏰ 공휴일 자동 업데이트 시작: 매일 자정 00:00 실행`);
    return this.updateTimer;
  }

  // 주기적 업데이트 중지
  stopPeriodicUpdate() {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
      // console.log('⏹️ 공휴일 자동 업데이트 중지');
    }
  }

  // 특정 연도 범위의 데이터 품질 검증
  async validateDataQuality(startYear, endYear) {
    const results = {};

    for (let year = startYear; year <= endYear; year++) {
      try {
        const holidays = await this.getHolidays(year);
        const holidayCount = Object.keys(holidays).length;

        results[year] = {
          status: 'success',
          count: holidayCount,
          hasBasicHolidays: this.checkBasicHolidays(holidays, year),
          hasLunarHolidays: this.checkLunarHolidays(holidays, year),
          hasAlternativeHolidays: this.checkAlternativeHolidays(holidays, year),
        };
      } catch (error) {
        results[year] = {
          status: 'error',
          error: error.message,
        };
      }
    }

    // console.log('📊 공휴일 데이터 품질 검증 결과:', results);
    return results;
  }

  // 기본 공휴일 존재 여부 확인
  checkBasicHolidays(holidays, year) {
    const basicHolidays = [
      '신정',
      '삼일절',
      '어린이날',
      '현충일',
      '광복절',
      '개천절',
      '한글날',
      '성탄절',
    ];
    return basicHolidays.every((holiday) =>
      Object.values(holidays).some((name) => name.includes(holiday))
    );
  }

  // 음력 공휴일 존재 여부 확인
  checkLunarHolidays(holidays, year) {
    const lunarHolidays = ['설날', '부처님오신날', '추석'];
    return lunarHolidays.every((holiday) =>
      Object.values(holidays).some((name) => name.includes(holiday))
    );
  }

  // 대체공휴일 존재 여부 확인 (필요한 경우)
  checkAlternativeHolidays(holidays, year) {
    return Object.values(holidays).some((name) => name.includes('대체공휴일'));
  }
}

// 싱글톤 인스턴스
const holidayService = new HolidayService();

export default holidayService;

// ============ companyDataService.js ============
// *[2_관리자 모드] 2.11_회사 데이터 조회 서비스*

/**
 * 회사 전체 데이터를 조회하는 서비스 함수
 * DB/ERP 연동을 시도하고, 실패시 로컬 데이터로 fallback
 *
 * @param {Object} params - 함수 파라미터 객체
 * @param {Array} params.employees - 직원 목록
 * @param {Function} params.getAttendanceForEmployee - 특정 직원의 근태 데이터 조회 함수
 * @param {Function} params.analyzeAttendanceStatusForDashboard - 근태 상태 분석 함수
 * @param {Object} params.attendanceSheetData - 근태 시트 데이터
 * @param {Array} params.notices - 공지사항 목록
 * @param {Array} params.leaveRequests - 휴가 신청 목록
 * @param {Array} params.evaluations - 평가 목록
 * @param {Array} params.suggestions - 제안 목록
 * @param {Array} params.safetyAccidents - 안전사고 목록
 * @param {Function} params.calculateMonthlyAttendanceRate - 월별 근태율 계산 함수
 * @param {Function} params.calculateCompanyStats - 회사 통계 계산 함수
 * @param {Object} params.chatbotPermissions - 챗봇 권한 객체
 * @param {Object} params.currentUser - 현재 사용자 객체
 * @param {Function} params.logSystemEvent - 시스템 로그 함수
 * @param {Function} params.updateSystemStatus - 시스템 상태 업데이트 함수
 * @param {Function} params.devLog - 개발 로그 함수
 * @returns {Promise<Object>} 회사 데이터 객체
 */
export const getCompanyData = async ({
  employees,
  getAttendanceForEmployee,
  analyzeAttendanceStatusForDashboard,
  attendanceSheetData,
  notices,
  leaveRequests,
  evaluations,
  suggestions,
  safetyAccidents,
  calculateMonthlyAttendanceRate,
  calculateCompanyStats,
  chatbotPermissions,
  currentUser,
  logSystemEvent,
  updateSystemStatus,
  devLog = () => {},
}) => {
  const attemptStart = Date.now();

  // ✅ 읽기 권한 체크
  if (!chatbotPermissions?.read) {
    logSystemEvent(
      'PERMISSION_DENIED',
      'AI 챗봇 읽기 권한 차단',
      {
        requestedAction: 'READ_COMPANY_DATA',
        userId: currentUser?.id || 'unknown',
        timestamp: new Date().toISOString(),
      },
      'WARNING',
      currentUser,
      devLog
    );

    throw new Error(
      '❌ 읽기 권한이 없습니다. 시스템 관리에서 AI 챗봇 읽기 권한을 활성화해주세요.'
    );
  }

  try {
    const now = new Date(); // ✅ now 변수를 함수 시작 부분에 선언
    const DB_CONNECTION_ENABLED = process.env.REACT_APP_DB_ENABLED === 'true';
    const ERP_CONNECTION_ENABLED = process.env.REACT_APP_ERP_ENABLED === 'true';

    if (DB_CONNECTION_ENABLED || ERP_CONNECTION_ENABLED) {
      try {
        const dbResponse = await fetch('/api/company-data', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000), // 10초 타임아웃
        });

        if (!dbResponse.ok) {
          throw new Error(
            `DB 연결 실패: HTTP ${dbResponse.status} - ${dbResponse.statusText}`
          );
        }

        const dbData = await dbResponse.json();

        logSystemEvent(
          'DB_CONNECTION_SUCCESS',
          'DB/ERP 연동 성공',
          {
            responseTime: Date.now() - attemptStart,
            dataSource: 'LIVE_DATABASE',
            recordCount: dbData?.employees?.length || 0,
          },
          'INFO',
          currentUser,
          devLog
        );
        updateSystemStatus('database', 'active', 'DB/ERP 연결 정상', 'INFO');

        return {
          ...dbData,
          currentDate: now.toISOString().split('T')[0],
          currentTime: now.toLocaleTimeString('ko-KR'),
          systemInfo: {
            ...dbData.systemInfo,
            connectionStatus: 'CONNECTED',
            dataSource: 'LIVE_DATABASE',
            lastSyncTime: now.toISOString(),
            warningMessage: null,
          },
        };
      } catch (dbError) {
        const errorDetails = {
          error: dbError.message,
          responseTime: Date.now() - attemptStart,
          attemptedEndpoint: '/api/company-data',
          authToken: localStorage.getItem('authToken') ? '있음' : '없음',
          errorType: dbError.name || 'Unknown',
        };

        logSystemEvent(
          'DB_CONNECTION_FAILED',
          'DB/ERP 연동 실패 - 로컬 데이터로 전환',
          errorDetails,
          'HIGH',
          currentUser,
          devLog
        );
        updateSystemStatus(
          'database',
          'error',
          'DB/ERP 연결 실패 - 로컬 데이터 사용 중',
          'HIGH'
        );

        if (currentUser?.role === 'admin') {
          devLog('⚠️ [관리자 알림] DB 연동 실패:', dbError.message);
        }
      }
    }

    logSystemEvent(
      'LOCAL_DATA_USAGE',
      '로컬 샘플 데이터 사용',
      {
        reason: DB_CONNECTION_ENABLED
          ? 'DB 연동 실패로 인한 fallback'
          : '로컬 개발 모드',
        responseTime: Date.now() - attemptStart,
      },
      'WARNING',
      currentUser,
      devLog
    );
    updateSystemStatus(
      'database',
      'warning',
      '로컬 데이터 모드 - DB 미연결',
      'WARNING'
    );

    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD 형식

    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth() + 1;
    const todayDay = now.getDate();

    const todayAttendance = employees
      .map((emp) => {
        const attendanceData = getAttendanceForEmployee(
          emp.id,
          todayYear,
          todayMonth,
          todayDay
        );
        const status =
          attendanceData && (attendanceData.checkIn || attendanceData.checkOut)
            ? analyzeAttendanceStatusForDashboard(
                attendanceData,
                todayYear,
                todayMonth,
                todayDay,
                emp.workType || '주간'
              )
            : '결근';

        return {
          date: today,
          employeeId: emp.id,
          employeeName: emp.name,
          status: status,
          checkIn: attendanceData?.checkIn || '',
          checkOut: attendanceData?.checkOut || '',
        };
      })
      .filter((att) => att.status !== '결근' || att.checkIn || att.checkOut); // 기록이 있는 것만

    devLog(
      `📅 오늘(${today}) 출근 데이터 필터링:`,
      todayAttendance.length,
      '명'
    );
    devLog('출근 현황:', {
      출근: todayAttendance.filter((a) => a.status === '출근').length,
      지각: todayAttendance.filter((a) => a.status === '지각').length,
      조퇴: todayAttendance.filter((a) => a.status === '조퇴').length,
      결근: todayAttendance.filter((a) => a.status === '결근').length,
    });

    const currentData = {
      employees: employees || [],
      attendance: todayAttendance, // 오늘 출근 데이터만 전달
      notices: notices || [],
      leaveRequests: leaveRequests || [],
      evaluations: evaluations || [],
      suggestions: suggestions || [],
      safetyAccidents: safetyAccidents || [],
      statistics: {
        totalEmployees: (employees || []).length,
        presentToday: todayAttendance.filter((a) => a.status === '출근').length,
        absentToday: todayAttendance.filter((a) => a.status === '결근').length,
        lateToday: todayAttendance.filter((a) => a.status === '지각').length,
        earlyToday: todayAttendance.filter((a) => a.status === '조퇴').length,
        totalAttendanceToday: todayAttendance.length,
        attendanceRate:
          todayAttendance.length > 0
            ? Math.round(
                (todayAttendance.filter((a) =>
                  ['출근', '지각', '조퇴'].includes(a.status)
                ).length /
                  todayAttendance.length) *
                  100
              )
            : 0,
        totalNotices: (notices || []).length,
        pendingLeaveRequests: (leaveRequests || []).filter(
          (req) => req.status === 'pending'
        ).length,
        approvedLeaveRequests: (leaveRequests || []).filter(
          (req) => req.status === 'approved'
        ).length,
        rejectedLeaveRequests: (leaveRequests || []).filter(
          (req) => req.status === 'rejected'
        ).length,
        activeSuggestions: (suggestions || []).filter(
          (sug) => sug.status === 'open'
        ).length,
        resolvedSuggestions: (suggestions || []).filter(
          (sug) => sug.status === 'resolved'
        ).length,
        completedEvaluations: (evaluations || []).filter(
          (e) => e.status === 'completed'
        ).length,
        pendingEvaluations: (evaluations || []).filter(
          (e) => e.status === 'pending'
        ).length,
        totalSafetyAccidents: (safetyAccidents || []).length,
        monthlyAttendanceRate: calculateMonthlyAttendanceRate(),
        monthlyStats: calculateCompanyStats(),
        departmentCount: [
          ...new Set((employees || []).map((emp) => emp.department)),
        ].length,
        positionCount: [
          ...new Set((employees || []).map((emp) => emp.position)),
        ].length,
      },
      systemInfo: {
        lastUpdated: now.toISOString(),
        dataSource: DB_CONNECTION_ENABLED ? 'LOCAL_FALLBACK' : 'LOCAL_SAMPLE',
        connectionStatus: 'LOCAL_MODE',
        apiVersion: '2.1',
        serverTime: now.toLocaleString('ko-KR'),
        warningMessage: DB_CONNECTION_ENABLED
          ? '⚠️ DB/ERP 미연결: 샘플 데이터 사용 중. 시스템 관리자에게 문의하세요.'
          : '📋 로컬 개발 모드: 샘플 데이터 사용 중',
        dataIntegrity: {
          employeesLoaded: (employees || []).length > 0,
          attendanceLoaded: Object.keys(attendanceSheetData || {}).length > 0,
          noticesLoaded: (notices || []).length > 0,
          leaveRequestsLoaded: (leaveRequests || []).length > 0,
          evaluationsLoaded: (evaluations || []).length > 0,
          suggestionsLoaded: (suggestions || []).length > 0,
          safetyAccidentsLoaded: (safetyAccidents || []).length > 0,
        },
      },
      currentDate: now.toISOString().split('T')[0],
      currentTime: now.toLocaleTimeString('ko-KR'),
      debugInfo: {
        generatedAt: now.toISOString(),
        requestSource: 'AI_CHATBOT',
        dataValidation: {
          employeesValid: Array.isArray(employees) && employees.length > 0,
          attendanceValid:
            attendanceSheetData && Object.keys(attendanceSheetData).length > 0,
          permissionsValid: chatbotPermissions?.read === true,
        },
      },
    };

    devLog('🔍 데이터 무결성 검증:');
    devLog(
      '- 직원 데이터 유효:',
      currentData.debugInfo.dataValidation.employeesValid
    );
    devLog(
      '- 출근 데이터 유효:',
      currentData.debugInfo.dataValidation.attendanceValid
    );
    devLog(
      '- 권한 유효:',
      currentData.debugInfo.dataValidation.permissionsValid
    );
    devLog('- 시스템 정보:', currentData.systemInfo.dataIntegrity);

    return currentData;
  } catch (error) {
    logSystemEvent(
      'SYSTEM_ERROR',
      '회사 데이터 조회 시스템 오류',
      {
        error: error.message,
        stack: error.stack,
        responseTime: Date.now() - attemptStart,
      },
      'CRITICAL',
      currentUser,
      devLog
    );
    updateSystemStatus('database', 'error', '시스템 오류 발생', 'CRITICAL');

    devLog('❌ 회사 데이터 조회 시스템 오류:', error);

    throw new Error(
      `회사 데이터 조회 실패: ${error.message}. 시스템 관리자에게 문의하세요.`
    );
  }
};

/**
 * ✅ [AI 챗봇] AI 명령 실행 (COMMAND 파싱 및 처리)
 */
export const executeAiCommand = async ({
  commandStr,
  chatbotPermissions,
  currentUser,
  logSystemEvent,
  devLog = () => {},
  API_BASE_URL = '',
  onDataUpdate = () => {},
}) => {
  try {
    const command = JSON.parse(commandStr);
    const { action, dataType, data, id } = command;

    devLog(`🤖 [AI Command] Action: ${action}, DataType: ${dataType}`);

    // ✅ 수정 권한 체크
    if (!chatbotPermissions?.modify) {
      logSystemEvent(
        'PERMISSION_DENIED',
        'AI 챗봇 수정 권한 차단',
        { action, dataType, userId: currentUser?.id },
        'WARNING',
        currentUser,
        devLog
      );
      return {
        success: false,
        message:
          '❌ 수정 권한이 없습니다. 시스템 관리에서 AI 챗봇 수정 권한을 활성화해주세요.',
      };
    }

    // ✅ 백엔드 API 호출 (통합 엔드포인트)
    const response = await fetch(`${API_BASE_URL}/ai/chatbot/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        dataType,
        data,
        id,
        permissions: chatbotPermissions,
      }),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: '실행 실패' }));
      throw new Error(errorData.error || '실행 실패');
    }

    const result = await response.json();
    devLog('✅ [AI Command] 실행 완료:', result);

    // 로그 기록
    if (logSystemEvent) {
      logSystemEvent(
        'AI_COMMAND_EXECUTED',
        `AI 챗봇이 ${dataType} ${
          action === 'create' ? '생성' : action === 'update' ? '수정' : '삭제'
        } 수행`,
        { action, dataType, userId: currentUser?.id },
        'INFO',
        currentUser,
        devLog
      );
    }

    // 데이터 업데이트 콜백 호출
    if (onDataUpdate) {
      onDataUpdate(dataType);
    }

    return {
      success: true,
      message: `${dataType} ${
        action === 'create' ? '생성' : action === 'update' ? '수정' : '삭제'
      } 완료`,
      result: result.result,
    };
  } catch (error) {
    devLog('❌ [AI Command] 파싱 오류:', error);
    return {
      success: false,
      message: `명령 파싱 오류: ${error.message}`,
    };
  }
};

/**
 * 공지사항 명령 처리
 */
const handleNoticeCommand = async ({
  action,
  data,
  id,
  API_BASE_URL,
  currentUser,
  devLog,
}) => {
  try {
    if (action === 'create') {
      const response = await fetch(`${API_BASE_URL}/communication/notices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          author: data.author || currentUser?.name || '관리자',
          date: new Date().toISOString().split('T')[0],
          priority: data.priority || 'normal',
        }),
      });
      if (!response.ok) throw new Error('공지사항 생성 실패');
      return { success: true, message: '공지사항이 생성되었습니다.' };
    } else if (action === 'update') {
      const response = await fetch(
        `${API_BASE_URL}/communication/notices/${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) throw new Error('공지사항 수정 실패');
      return { success: true, message: '공지사항이 수정되었습니다.' };
    } else if (action === 'delete') {
      const response = await fetch(
        `${API_BASE_URL}/communication/notices/${id}`,
        {
          method: 'DELETE',
        }
      );
      if (!response.ok) throw new Error('공지사항 삭제 실패');
      return { success: true, message: '공지사항이 삭제되었습니다.' };
    }
    return { success: false, message: `지원하지 않는 action: ${action}` };
  } catch (error) {
    devLog('❌ [Notice Command] 오류:', error);
    return { success: false, message: error.message };
  }
};

/**
 * 직원 정보 명령 처리
 */
const handleEmployeeCommand = async ({
  action,
  data,
  id,
  API_BASE_URL,
  currentUser,
  devLog,
}) => {
  try {
    if (action === 'update') {
      const response = await fetch(`${API_BASE_URL}/hr/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('직원 정보 수정 실패');
      return { success: true, message: '직원 정보가 수정되었습니다.' };
    } else if (action === 'create') {
      const response = await fetch(`${API_BASE_URL}/hr/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('직원 생성 실패');
      return { success: true, message: '직원이 생성되었습니다.' };
    } else if (action === 'delete') {
      const response = await fetch(`${API_BASE_URL}/hr/employees/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('직원 삭제 실패');
      return { success: true, message: '직원이 삭제되었습니다.' };
    }
    return { success: false, message: `지원하지 않는 action: ${action}` };
  } catch (error) {
    devLog('❌ [Employee Command] 오류:', error);
    return { success: false, message: error.message };
  }
};

/**
 * 근태 명령 처리
 */
const handleAttendanceCommand = async ({
  action,
  data,
  id,
  API_BASE_URL,
  currentUser,
  devLog,
}) => {
  try {
    if (action === 'create') {
      const response = await fetch(`${API_BASE_URL}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('근태 기록 생성 실패');
      return { success: true, message: '근태 기록이 생성되었습니다.' };
    } else if (action === 'update') {
      const response = await fetch(
        `${API_BASE_URL}/attendance/${id || data.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) throw new Error('근태 수정 실패');
      return { success: true, message: '근태 정보가 수정되었습니다.' };
    } else if (action === 'delete') {
      const response = await fetch(`${API_BASE_URL}/attendance/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('근태 기록 삭제 실패');
      return { success: true, message: '근태 기록이 삭제되었습니다.' };
    }
    return { success: false, message: `지원하지 않는 action: ${action}` };
  } catch (error) {
    devLog('❌ [Attendance Command] 오류:', error);
    return { success: false, message: error.message };
  }
};

/**
 * 연차 신청 명령 처리
 */
const handleLeaveCommand = async ({
  action,
  data,
  id,
  API_BASE_URL,
  currentUser,
  devLog,
}) => {
  try {
    if (action === 'create') {
      const response = await fetch(`${API_BASE_URL}/hr/leaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('연차 신청 생성 실패');
      return { success: true, message: '연차 신청이 생성되었습니다.' };
    } else if (action === 'update') {
      const response = await fetch(
        `${API_BASE_URL}/hr/leaves/${id || data.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) throw new Error('연차 정보 수정 실패');
      return { success: true, message: '연차 정보가 수정되었습니다.' };
    } else if (action === 'delete') {
      const response = await fetch(`${API_BASE_URL}/hr/leaves/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('연차 삭제 실패');
      return { success: true, message: '연차 신청이 삭제되었습니다.' };
    } else if (action === 'approve') {
      const response = await fetch(`${API_BASE_URL}/hr/leaves/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          approvedBy: currentUser?.name,
        }),
      });
      if (!response.ok) throw new Error('연차 승인 실패');
      return { success: true, message: '연차 신청이 승인되었습니다.' };
    } else if (action === 'reject') {
      const response = await fetch(`${API_BASE_URL}/hr/leaves/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          rejectedBy: currentUser?.name,
          reason: data?.reason,
        }),
      });
      if (!response.ok) throw new Error('연차 거부 실패');
      return { success: true, message: '연차 신청이 거부되었습니다.' };
    }
    return { success: false, message: `지원하지 않는 action: ${action}` };
  } catch (error) {
    devLog('❌ [Leave Command] 오류:', error);
    return { success: false, message: error.message };
  }
};

/**
 * 급여 명령 처리
 */
const handlePayrollCommand = async ({
  action,
  data,
  id,
  API_BASE_URL,
  currentUser,
  devLog,
}) => {
  try {
    if (action === 'create') {
      const response = await fetch(`${API_BASE_URL}/payroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('급여 정보 생성 실패');
      return { success: true, message: '급여 정보가 생성되었습니다.' };
    } else if (action === 'update') {
      const response = await fetch(`${API_BASE_URL}/payroll/${id || data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('급여 정보 수정 실패');
      return { success: true, message: '급여 정보가 수정되었습니다.' };
    } else if (action === 'delete') {
      const response = await fetch(`${API_BASE_URL}/payroll/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('급여 정보 삭제 실패');
      return { success: true, message: '급여 정보가 삭제되었습니다.' };
    }
    return { success: false, message: `지원하지 않는 action: ${action}` };
  } catch (error) {
    devLog('❌ [Payroll Command] 오류:', error);
    return { success: false, message: error.message };
  }
};

/**
 * 평가 명령 처리
 */
const handleEvaluationCommand = async ({
  action,
  data,
  id,
  API_BASE_URL,
  currentUser,
  devLog,
}) => {
  try {
    if (action === 'create') {
      const response = await fetch(`${API_BASE_URL}/hr/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('평가 생성 실패');
      return { success: true, message: '평가가 생성되었습니다.' };
    } else if (action === 'update') {
      const response = await fetch(
        `${API_BASE_URL}/hr/evaluations/${id || data.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) throw new Error('평가 수정 실패');
      return { success: true, message: '평가 정보가 수정되었습니다.' };
    } else if (action === 'delete') {
      const response = await fetch(`${API_BASE_URL}/hr/evaluations/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('평가 삭제 실패');
      return { success: true, message: '평가가 삭제되었습니다.' };
    }
    return { success: false, message: `지원하지 않는 action: ${action}` };
  } catch (error) {
    devLog('❌ [Evaluation Command] 오류:', error);
    return { success: false, message: error.message };
  }
};

/**
 * 건의사항 명령 처리
 */
const handleSuggestionCommand = async ({
  action,
  data,
  id,
  API_BASE_URL,
  currentUser,
  devLog,
}) => {
  try {
    if (action === 'create') {
      const response = await fetch(
        `${API_BASE_URL}/communication/suggestions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) throw new Error('건의사항 생성 실패');
      return { success: true, message: '건의사항이 생성되었습니다.' };
    } else if (action === 'update') {
      const response = await fetch(
        `${API_BASE_URL}/communication/suggestions/${id || data.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) throw new Error('건의사항 수정 실패');
      return { success: true, message: '건의사항이 수정되었습니다.' };
    } else if (action === 'delete') {
      const response = await fetch(
        `${API_BASE_URL}/communication/suggestions/${id}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      if (!response.ok) throw new Error('건의사항 삭제 실패');
      return { success: true, message: '건의사항이 삭제되었습니다.' };
    }
    return { success: false, message: `지원하지 않는 action: ${action}` };
  } catch (error) {
    devLog('❌ [Suggestion Command] 오류:', error);
    return { success: false, message: error.message };
  }
};

/**
 * 안전사고 명령 처리
 */
const handleSafetyAccidentCommand = async ({
  action,
  data,
  id,
  API_BASE_URL,
  currentUser,
  devLog,
}) => {
  try {
    if (action === 'create') {
      const response = await fetch(`${API_BASE_URL}/safety/accidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('안전사고 기록 생성 실패');
      return { success: true, message: '안전사고 기록이 생성되었습니다.' };
    } else if (action === 'update') {
      const response = await fetch(
        `${API_BASE_URL}/safety/accidents/${id || data.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) throw new Error('안전사고 정보 수정 실패');
      return { success: true, message: '안전사고 정보가 수정되었습니다.' };
    } else if (action === 'delete') {
      const response = await fetch(`${API_BASE_URL}/safety/accidents/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('안전사고 기록 삭제 실패');
      return { success: true, message: '안전사고 기록이 삭제되었습니다.' };
    }
    return { success: false, message: `지원하지 않는 action: ${action}` };
  } catch (error) {
    devLog('❌ [SafetyAccident Command] 오류:', error);
    return { success: false, message: error.message };
  }
};

/**
 * 일정 명령 처리
 */
const handleScheduleCommand = async ({
  action,
  data,
  id,
  API_BASE_URL,
  currentUser,
  devLog,
}) => {
  try {
    if (action === 'create') {
      const response = await fetch(`${API_BASE_URL}/system/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('일정 생성 실패');
      return { success: true, message: '일정이 생성되었습니다.' };
    } else if (action === 'update') {
      const response = await fetch(
        `${API_BASE_URL}/system/schedules/${id || data.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) throw new Error('일정 수정 실패');
      return { success: true, message: '일정이 수정되었습니다.' };
    } else if (action === 'delete') {
      const response = await fetch(`${API_BASE_URL}/system/schedules/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('일정 삭제 실패');
      return { success: true, message: '일정이 삭제되었습니다.' };
    }
    return { success: false, message: `지원하지 않는 action: ${action}` };
  } catch (error) {
    devLog('❌ [Schedule Command] 오류:', error);
    return { success: false, message: error.message };
  }
};

/**
 * 알림 명령 처리
 */
const handleNotificationCommand = async ({
  action,
  data,
  id,
  API_BASE_URL,
  currentUser,
  devLog,
}) => {
  try {
    if (action === 'create') {
      const response = await fetch(
        `${API_BASE_URL}/communication/notifications`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) throw new Error('알림 생성 실패');
      return { success: true, message: '알림이 생성되었습니다.' };
    } else if (action === 'update') {
      const response = await fetch(
        `${API_BASE_URL}/communication/notifications/${id || data.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) throw new Error('알림 수정 실패');
      return { success: true, message: '알림이 수정되었습니다.' };
    } else if (action === 'delete') {
      const response = await fetch(
        `${API_BASE_URL}/communication/notifications/${id}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      if (!response.ok) throw new Error('알림 삭제 실패');
      return { success: true, message: '알림이 삭제되었습니다.' };
    }
    return { success: false, message: `지원하지 않는 action: ${action}` };
  } catch (error) {
    devLog('❌ [Notification Command] 오류:', error);
    return { success: false, message: error.message };
  }
};

// ============================================================
// [1_공통] UTILS
// ============================================================

// ============ dateUtils.js ============
// [1_공통] 날짜 관련 유틸리티 함수들

// [1_공통] 요일 이름 (괄호 포함)
export const DAY_NAMES_WITH_PARENTHESES = [
  '(일)',
  '(월)',
  '(화)',
  '(수)',
  '(목)',
  '(금)',
  '(토)',
];

// [1_공통] 언어별 날짜 포맷 (UTC → KST 변환)
export const formatDateByLang = (iso, selectedLanguage = 'ko') => {
  if (!iso) return '';
  const d = new Date(iso);

  // UTC를 한국 시간(KST, UTC+9)으로 변환
  const kstOffset = 9 * 60; // 9시간을 분으로
  const kstDate = new Date(d.getTime() + kstOffset * 60 * 1000);

  const y = kstDate.getUTCFullYear();
  const m = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getUTCDate()).padStart(2, '0');

  if (selectedLanguage === 'en') {
    return `${y}-${m}-${day}`;
  } else {
    return `${y}-${m}-${day}`;
  }
};

// [1_공통] 날짜 입력 플레이스홀더
export const getDatePlaceholder = (selectedLanguage = 'ko') =>
  selectedLanguage === 'en' ? 'yyyy-mm-dd' : '연도-월-일';

// [1_공통] 근속년수 계산 함수 (n년 n개월 형식)
export const getWorkPeriodText = (hireDate) => {
  if (!hireDate) return '';
  const start = new Date(hireDate);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return `${years}년 ${months}개월`;
};

// [1_공통] 해당 월의 일수 계산
export const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

// [1_공통] 날짜 키 생성 (YYYY-MM-DD 형식)
export const getDateKey = (year, month, day) => {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(
    2,
    '0'
  )}`;
};

// [1_공통] 요일 계산 (0: 일요일, 1: 월요일, ..., 6: 토요일)
export const getDayOfWeek = (year, month, day) => {
  const date = new Date(year, month - 1, day);
  return date.getDay();
};

// [1_공통] 오늘 날짜 및 요일 가져오기
export const getTodayDateWithDay = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const date = String(today.getDate()).padStart(2, '0');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const day = days[today.getDay()];
  return `${year}/${month}/${date} (${day})`;
};

// [1_공통] 어제 날짜 및 요일 가져오기 (야간 근무용)
export const getYesterdayDateWithDay = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, '0');
  const date = String(yesterday.getDate()).padStart(2, '0');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const day = days[yesterday.getDay()];
  return `${year}/${month}/${date} (${day})`;
};

// [1_공통] ISO 날짜 문자열을 한국어 형식으로 변환 (YYYY-MM-DD-요일)
export const formatDateWithDay = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = days[date.getDay()];
  return `${year}-${month}-${day}-${dayOfWeek}`;
};

// [1_공통] 공휴일 여부 확인
export const isHolidayDate = (
  year,
  month,
  day,
  customHolidays = {},
  holidayData = {},
  getKoreanHolidays = () => ({})
) => {
  const dateKeyLong = `${year}-${String(month).padStart(2, '0')}-${String(
    day
  ).padStart(2, '0')}`;

  if (customHolidays[dateKeyLong]) {
    return true;
  }

  const yearHolidays = holidayData[year] || getKoreanHolidays(year);
  const dateKeyShort = `${String(month).padStart(2, '0')}-${String(
    day
  ).padStart(2, '0')}`;

  return !!(yearHolidays[dateKeyLong] || yearHolidays[dateKeyShort]);
};

// ============ leaveCalculations.js ============
// [1_공통] 연차 계산 유틸리티 함수들

// [1_공통] 날짜 차이 계산 (년/월)
export const diffYMD = (startDate, endDate = new Date()) => {
  const s = new Date(startDate);
  const e = new Date(endDate);
  let years = e.getFullYear() - s.getFullYear();
  let months = e.getMonth() - s.getMonth();
  let days = e.getDate() - s.getDate();

  if (days < 0) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years: Math.max(years, 0), months: Math.max(months, 0) };
};

// [1_공통] 연차 개수 계산
export const calculateAnnualLeave = (joinDate) => {
  if (!joinDate) return 0;

  const { years, months } = diffYMD(joinDate, new Date());

  if (years < 1) {
    return Math.max(months, 0);
  }

  const base = 15;
  const extra = Math.min(10, Math.floor((years - 1) / 2));
  return Math.min(25, base + extra);
};

// [1_공통] 월별 연차 개수 계산
export const getMonthlyAnnualLeave = (joinDate, targetYear, targetMonth) => {
  if (!joinDate) return 0;

  const targetDate = new Date(targetYear, targetMonth - 1, 1);
  const jDate = new Date(joinDate);

  if (jDate > targetDate) return 0;

  const { years, months } = diffYMD(joinDate, targetDate);

  if (years < 1) {
    return Math.max(months, 0);
  }

  const base = 15;
  const extra = Math.min(10, Math.floor((years - 1) / 2));
  return Math.min(25, base + extra);
};

// [1_공통] 사용한 연차 개수 계산
export const getUsedAnnualLeave = (employeeId, leaveRequests) => {
  if (!leaveRequests) return 0;

  return leaveRequests
    .filter((lr) => {
      const leaveType = lr.type || lr.leaveType || '';
      return (
        lr.employeeId === employeeId &&
        (leaveType === '연차' || leaveType.startsWith('반차')) &&
        lr.status === '승인'
      );
    })
    .reduce((sum, lr) => {
      const leaveType = lr.type || lr.leaveType || '';
      if (leaveType === '연차') {
        if (lr.approvedDays) {
          return sum + lr.approvedDays;
        }

        if (lr.startDate && lr.endDate) {
          const start = new Date(lr.startDate);
          const end = new Date(lr.endDate);
          const days = Math.abs((end - start) / (1000 * 60 * 60 * 24)) + 1;
          return sum + days;
        }

        return sum + (lr.days || 1);
      } else if (leaveType.startsWith('반차')) {
        return sum + 0.5;
      }
      return sum;
    }, 0);
};

// [1_공통] 연차 일수 계산
export const getLeaveDays = (leave) => {
  if (!leave) return '-';
  if (leave.type === '연차') {
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    return Math.abs((end - start) / (1000 * 60 * 60 * 24)) + 1;
  } else if (leave.type && leave.type.startsWith('반차')) {
    return 0.5; // 반차는 0.5일로 표시
  }
  return '-';
};

// *[2_관리자 모드] 2.6.0_연차 계산 함수*
export const calculateEmployeeAnnualLeave = (employee, leaveRequests) => {
  const hireDate = new Date(employee.hireDate || employee.joinDate);

  if (isNaN(hireDate.getTime())) {
    console.error('Invalid hire date for employee:', employee);
    return {
      annualStart: '',
      annualEnd: '',
      totalAnnual: 0,
      usedAnnual: 0,
      remainAnnual: 0,
      years: 0,
      months: 0,
    };
  }

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  let annualStart = `${currentYear}-${String(hireDate.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(hireDate.getDate()).padStart(2, '0')}`;

  let endDate = new Date(
    currentYear + 1,
    hireDate.getMonth(),
    hireDate.getDate()
  );
  endDate.setDate(endDate.getDate() - 1);
  let annualEnd = `${endDate.getFullYear()}-${String(
    endDate.getMonth() + 1
  ).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

  const currentAnnualStartDate = new Date(annualStart);
  if (currentDate < currentAnnualStartDate) {
    annualStart = `${currentYear - 1}-${String(
      hireDate.getMonth() + 1
    ).padStart(2, '0')}-${String(hireDate.getDate()).padStart(2, '0')}`;

    endDate = new Date(currentYear, hireDate.getMonth(), hireDate.getDate());
    endDate.setDate(endDate.getDate() - 1);
    annualEnd = `${endDate.getFullYear()}-${String(
      endDate.getMonth() + 1
    ).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
  }

  const now = new Date();
  let years = now.getFullYear() - hireDate.getFullYear();
  let months = now.getMonth() - hireDate.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const savedAnnualData = employee.annualLeave;

  let defaultTotalAnnual = 0;

  if (years < 1) {
    const totalMonths = years * 12 + months;
    defaultTotalAnnual = Math.min(totalMonths, 11); // 최대 11개 (1년 미만)
  } else {
    defaultTotalAnnual = 15; // 기본 15일

    const additionalYears = Math.floor((years - 1) / 2);
    defaultTotalAnnual += Math.min(additionalYears, 10); // 최대 10일 추가 (총 25일)
  }

  // ✅ 단순화된 계산 로직: DB leaveUsed + 전체 연차 신청 내역
  const annualStartDate = new Date(annualStart);
  const annualEndDate = new Date(annualEnd);

  // 1️⃣ DB에 저장된 leaveUsed 값 (관리자가 직접 설정한 기준값, 기본값 0)
  const dbLeaveUsed = employee.leaveUsed || 0;

  // 2️⃣ 연차 신청 내역에서 계산되는 값 (연차, 반차만)
  const leaveRequestsSum = leaveRequests
    .filter((leave) => {
      const matchesEmployee =
        leave.employeeId === employee.id || leave.name === employee.name;
      const isApproved = leave.status === '승인';
      const leaveType = leave.type || leave.leaveType || '';
      const isAnnualLeave = leaveType === '연차' || leaveType.includes('반차');

      if (!matchesEmployee || !isApproved || !isAnnualLeave) return false;

      const leaveStartDate = new Date(leave.startDate);
      const leaveEndDate = new Date(leave.endDate || leave.startDate);

      // 연차 기간 내 신청만 포함
      return (
        (leaveStartDate >= annualStartDate &&
          leaveStartDate <= annualEndDate) ||
        (leaveEndDate >= annualStartDate && leaveEndDate <= annualEndDate) ||
        (leaveStartDate <= annualStartDate && leaveEndDate >= annualEndDate)
      );
    })
    .reduce((sum, leave) => {
      const leaveType = leave.type || leave.leaveType || '';

      // 반차: 0.5일
      if (leaveType.includes('반차')) return sum + 0.5;

      // 연차: 실제 사용일수
      if (leaveType === '연차') {
        if (leave.approvedDays) return sum + leave.approvedDays;
        if (leave.startDate && leave.endDate) {
          const start = new Date(leave.startDate);
          const end = new Date(leave.endDate);
          const days = Math.abs((end - start) / (1000 * 60 * 60 * 24)) + 1;
          return sum + days;
        }
      }

      return sum + (leave.approvedDays || leave.days || 1);
    }, 0);

  // 3️⃣ 최종 사용연차 = DB 저장값 + 연차 신청 합계
  const usedAnnual = dbLeaveUsed + leaveRequestsSum;

  const totalAnnual =
    savedAnnualData?.total || employee.totalAnnual || defaultTotalAnnual;

  const carryOverLeave =
    savedAnnualData?.carryOver || employee.carryOverLeave || 0;
  const baseAnnual = savedAnnualData?.baseAnnual || defaultTotalAnnual;

  return {
    annualStart,
    annualEnd,
    years,
    months,
    totalAnnual,
    usedAnnual,
    remainAnnual: totalAnnual - usedAnnual,
    carryOverLeave, // 이월연차
    baseAnnual, // 기본연차 (이월 제외)
  };
};

// ============ attendanceUtils.js ============
/* ================================
   [1_공통] 근태 관련 유틸리티 함수들
================================ */

// *[1_공통] 월별 근태 데이터 조회*
export const getMonthlyAttendanceData = (dataObj, month, employees) => {
  return Object.keys(dataObj)
    .map((key) => {
      const [empId, dateStr] = key.split('_');
      const date = new Date(dateStr);
      if (date.getMonth() === month) {
        return {
          ...dataObj[key],
          date: dateStr,
          employeeId: empId,
          name: employees.find((e) => e.id === empId)?.name || '',
        };
      }
      return null;
    })
    .filter((item) => item !== null);
};

// ============ permissionUtils.js ============
// *[1_공통] 사용자 권한 체크 유틸리티*

/**
 * 사용자의 역할과 권한을 확인하여 특정 작업의 허용 여부를 판단
 * @param {Object} currentUser - 현재 로그인한 사용자 정보
 * @param {string} action - 수행하려는 작업 (예: 'read_salary', 'modify_employee')
 * @param {Object} targetData - 대상 데이터 정보 (옵션)
 * @param {Function} logSystemEvent - 시스템 이벤트 로그 함수
 * @returns {Object} { allowed: boolean, reason: string }
 */
export const checkUserPermission = (
  currentUser,
  action,
  targetData = null,
  logSystemEvent
) => {
  if (!currentUser) {
    logSystemEvent(
      'AUTH_FAILURE',
      '미인증 사용자 접근 시도',
      { action },
      'HIGH'
    );
    return { allowed: false, reason: '로그인이 필요합니다.' };
  }

  const userRole = currentUser.role;
  const permissions = {
    guest: [],
    employee: ['read_basic', 'read_own_data'],
    manager: [
      'read_basic',
      'read_own_data',
      'read_team_data',
      'modify_team_data',
    ],
    admin: [
      'read_all',
      'modify_all',
      'download_all',
      'model_change',
      'system_config',
    ],
  };

  const userPermissions = permissions[userRole] || [];

  const actionPermissions = {
    read_salary: 'read_all',
    read_performance: 'read_all',
    read_employee_data: 'read_basic',
    modify_employee: 'modify_all',
    download_data: 'download_all',
    change_ai_model: 'model_change',
    view_system_logs: 'read_all',
    access_admin_panel: 'read_all',
  };

  const requiredPermission = actionPermissions[action];

  if (!requiredPermission) {
    return { allowed: true, reason: 'No specific permission required' };
  }

  if (!userPermissions.includes(requiredPermission)) {
    logSystemEvent(
      'DATA_ACCESS_DENIED',
      `권한 없는 접근 시도: ${action}`,
      {
        userId: currentUser.id,
        userRole,
        action,
        requiredPermission,
      },
      'WARNING'
    );

    return {
      allowed: false,
      reason: `이 작업은 ${requiredPermission} 권한이 필요합니다.`,
    };
  }

  if (['read_salary', 'read_performance', 'download_data'].includes(action)) {
    logSystemEvent(
      'DATA_ACCESS',
      `민감 데이터 접근: ${action}`,
      {
        userId: currentUser.id,
        userRole,
        targetData: targetData?.type || 'unknown',
      },
      'INFO'
    );
  }

  return { allowed: true, reason: 'Permission granted' };
};

// ============ uiUtils.js ============
/**
 * UI 관련 유틸리티 함수들
 */

// [1_공통] 출근 상태별 텍스트 색상 반환
/**
 * 출근 상태에 따른 텍스트 색상 클래스 반환
 * @param {string} status - 출근 상태
 * @returns {string} Tailwind CSS 텍스트 색상 클래스
 */
export const getStatusTextColor = (status) => {
  switch (status) {
    case '출근':
    case '정상':
      return 'text-green-600';
    case '지각':
    case '외출':
    case '조퇴':
    case '지각/조퇴':
    case '결근':
      return 'text-red-600';
    case '연차':
    case '반차':
    case '반차(오전)':
    case '반차(오후)':
    case '병가':
    case '경조':
    case '공가':
    case '출산휴가':
    case '육아휴직':
    case '휴직':
    case '기타':
      return 'text-orange-600';
    case '휴일':
      return 'text-gray-600';
    case '근무중':
      return 'text-blue-600';
    default:
      return 'text-black';
  }
};

// ============ adminDataGenerator.js ============
/**
 * @deprecated 관리자 데이터는 이제 MongoDB에서 관리됩니다.
 * 대신 AdminAPI.list()를 사용하세요.
 *
 * 기존 하드코딩된 관리자 데이터는 server/scripts/seedAdmins.js를 통해 DB에 저장되었습니다.
 * 관련 파일:
 * - 모델: server/models/hr/admins.js
 * - 라우트: server/routes/adminRoutes.js
 * - API 클라이언트: src/api/admin.js
 *
 * @returns {Array} 빈 배열 (더 이상 사용되지 않음)
 */
// export const generateAdmins = () => {
//   // 이 함수는 더 이상 사용되지 않습니다.
//   // 관리자 데이터는 MongoDB에서 관리됩니다.
//   return [];
// };

// ============ employeeDataGenerator.js ============
/**
 * 직원 데이터 생성 유틸리티 (DB 전용 - 폴백 제거됨)
 *
 * 더 이상 하드코딩 데이터를 사용하지 않습니다.
 * DB에서 직원 데이터를 가져오는 것만 사용하세요.
 *
 * @deprecated DB에서 EmployeeAPI.list()를 사용하세요
 * @returns {Array} 빈 배열
 */
export const generateEmployees = () => {
  console.warn(
    '⚠️ generateEmployees() is deprecated. Use EmployeeAPI.list() instead.'
  );
  return [];
};

/**
 * @deprecated 하드코딩된 직원 데이터 제거됨 (2025-01-05)
 * DB에서 EmployeeAPI.list()를 사용하세요
 * 65명의 직원 데이터가 MongoDB로 마이그레이션되었습니다.
 */

/*    {
      id: 'BS_001',
      name: '이철균',
      password: '4481',
      phone: '010-8765-4481',
      department: '대표',
      position: '대표',
      joinDate: '2002-03-01',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_002',
      name: '정재준',
      password: '8028',
      phone: '010-5756-8028',
      department: '임원',
      position: '전무',
      joinDate: '2017-09-11',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_003',
      name: '서상석',
      password: '6669',
      phone: '010-3871-6669',
      department: '영업',
      position: '상무',
      joinDate: '2014-08-07',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_004',
      name: '민성우',
      password: '0706',
      phone: '010-9657-0706',
      department: '영업',
      position: '부장',
      joinDate: '2023-01-02',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_005',
      name: '이준범',
      password: '2469',
      phone: '010-2408-2469',
      department: '영업',
      position: '대리',
      joinDate: '2024-05-02',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_006',
      name: '나범수',
      password: '0519',
      phone: '010-7560-0519',
      department: '영업',
      position: '주임',
      joinDate: '2022-09-05',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_007',
      name: '이재호',
      password: '3283',
      phone: '010-9667-3283',
      department: '관리',
      position: '이사',
      joinDate: '2005-06-07',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_008',
      name: '이현주',
      password: '5320',
      phone: '010-3768-5320',
      department: '관리',
      position: '차장',
      joinDate: '2011-10-04',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_009',
      name: '신미선',
      password: '8472',
      phone: '010-3000-8472',
      department: '관리',
      position: '차장',
      joinDate: '2022-04-18',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_010',
      name: '이서현',
      password: '7775',
      phone: '010-5070-7775',
      department: '관리',
      position: '주임',
      joinDate: '2023-09-11',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_011',
      name: '김도일',
      password: '8479',
      phone: '010-5440-8479',
      department: '품질',
      position: '이사',
      joinDate: '2017-02-09',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_012',
      name: '김영화',
      password: '0298',
      phone: '010-9533-0298',
      department: '품질',
      position: '차장',
      joinDate: '2017-02-20',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_013',
      name: '이윤호',
      password: '6322',
      phon: '010-5143-6322',
      department: '품질',
      position: '과장',
      joinDate: '2017-01-23',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_014',
      name: '문건수',
      password: '9627',
      phone: '010-7176-9627',
      department: '품질',
      position: '주임',
      joinDate: '2023-09-18',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_015',
      name: '지준훈',
      password: '4332',
      phone: '010-2215-4332',
      department: '생산관리',
      position: '이사',
      joinDate: '2024-07-01',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_016',
      name: '김정일',
      password: '2839',
      phone: '010-4741-2839',
      department: '생산관리',
      position: '차장',
      joinDate: '2015-12-01',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_017',
      name: '이익로',
      password: '8374',
      phone: '010-4157-8374',
      department: '생산관리',
      position: '과장',
      joinDate: '2018-09-17',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_018',
      name: '정은수',
      password: '5083',
      phone: '010-7125-5083',
      department: '생산관리',
      position: '사원',
      joinDate: '2024-12-02',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_019',
      name: '우상일',
      password: '6915',
      phone: '010-5572-6915',
      department: '금형관리',
      position: '사원',
      joinDate: '2024-12-16',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_020',
      name: '김태현',
      password: '7685',
      phone: '010-5897-7685',
      department: '가공',
      position: '이사',
      joinDate: '2024-09-01',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_021',
      name: '이혜영',
      password: '0728',
      phone: '010-6205-0728',
      department: '가공',
      position: '과장',
      joinDate: '2022-06-02',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_022',
      name: '엄성덕',
      password: '5865',
      phone: '010-7771-5865',
      department: '가공',
      position: '조장',
      joinDate: '2022-01-13',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_023',
      name: '장종호',
      password: '0218',
      phone: '010-7732-0218',
      department: '가공',
      position: '사원',
      joinDate: '2022-01-13',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_024',
      name: '김철수',
      password: '0205',
      phone: '010-5896-0205',
      department: '가공',
      position: '사원',
      joinDate: '2024-07-15',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_025',
      name: '김정천',
      password: '0876',
      phone: '010-7133-0876',
      department: '출하',
      position: '부장',
      joinDate: '2006-10-17',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_026',
      name: '이성규',
      password: '3351',
      phone: '010-3740-3351',
      department: '출하',
      position: '사원',
      joinDate: '2018-05-02',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_027',
      name: '곽상무',
      password: '0000',
      phone: '',
      department: '출하',
      position: '사원',
      joinDate: '2025-05-08',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_028',
      name: '정원국',
      password: '9388',
      phone: '010-7501-9388',
      department: '출하',
      position: '조장',
      joinDate: '2015-12-07',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_029',
      name: '박명청',
      password: '9027',
      phone: '010-2160-9027',
      department: '출하',
      position: '사원',
      joinDate: '2021-10-01',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_030',
      name: '케빈',
      password: '9604',
      phone: '010-5725-9604',
      department: '출하',
      position: '사원',
      joinDate: '2024-02-26',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_031',
      name: '이택영',
      password: '7530',
      phone: '010-3813-7530',
      department: '생산',
      position: '반장',
      joinDate: '2014-08-08',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_032',
      name: '이인섭',
      password: '7591',
      phone: '010-8923-7591',
      department: '생산',
      position: '사원',
      joinDate: '2014-07-01',
      workType: '야간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_033',
      name: '노금철',
      password: '6799',
      phone: '010-9374-6799',
      department: '생산',
      position: '사원',
      joinDate: '2018-01-15',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_034',
      name: '이성동',
      password: '4045',
      phone: '010-4335-4045',
      department: '생산',
      position: '사원',
      joinDate: '2024-01-01',
      workType: '야간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_035',
      name: '루이즈',
      password: '5277',
      phone: '010-8268-5277',
      department: '생산',
      position: '사원',
      joinDate: '2021-12-13',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_036',
      name: '송영길',
      password: '5886',
      phone: '010-5634-5886',
      department: '생산',
      position: '조장',
      joinDate: '2017-11-22',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_037',
      name: '김경수',
      password: '7223',
      phone: '010-4377-7223',
      department: '생산',
      position: '사원',
      joinDate: '2019-08-08',
      workType: '야간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_038',
      name: '이인태',
      password: '6974',
      phone: '010-2745-6974',
      department: '생산',
      position: '사원',
      joinDate: '2022-05-20',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_039',
      name: '박용국',
      password: '5103',
      phone: '010-3166-5103',
      department: '생산',
      position: '사원',
      joinDate: '2023-03-06',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_040',
      name: '알렉시스',
      password: '0000',
      phone: '',
      department: '생산',
      position: '사원',
      joinDate: '2024-11-25',
      workType: '야간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_041',
      name: '응웬비엣주안',
      password: '2686',
      phone: '010-4917-2686',
      department: '생산',
      position: '사원',
      joinDate: '2021-02-17',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_042',
      name: '이종진',
      password: '2466',
      phone: '010-9787-2466',
      department: '생산',
      position: '사원',
      joinDate: '2025-02-01',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_043',
      name: '그레이논',
      password: '6695',
      phone: '010-4888-6695',
      department: '생산',
      position: '사원',
      joinDate: '2023-07-17',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_044',
      name: '어관중',
      password: '8803',
      phone: '010-3781-8803',
      department: '생산',
      position: '사원',
      joinDate: '2019-03-20',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_045',
      name: '자르윈',
      password: '0798',
      phone: '010-5302-0798',
      department: '생산',
      position: '사원',
      joinDate: '2023-01-04',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_046',
      name: '김명수',
      password: '8019',
      phone: '010-8224-8019',
      department: '생산',
      position: '사원',
      joinDate: '2022-11-01',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_047',
      name: '김명흠',
      password: '2987',
      phone: '010-4865-2987',
      department: '생산',
      position: '사원',
      joinDate: '2023-02-13',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_048',
      name: '박영구',
      password: '9262',
      phone: '010-8768-9262',
      department: '생산',
      position: '사원',
      joinDate: '2025-09-01',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_049',
      name: '김유선',
      password: '2516',
      phone: '010-6385-2516',
      department: '생산',
      position: '사원',
      joinDate: '2024-06-01',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_050',
      name: '마이클',
      password: '9522',
      phone: '010-3119-9522',
      department: '생산',
      position: '사원',
      joinDate: '2025-08-04',
      workType: '야간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_051',
      name: '제퍼슨',
      password: '0000',
      phone: '',
      department: '생산',
      position: '사원',
      joinDate: '2023-02-06',
      workType: '야간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_052',
      name: '크리산토',
      password: '0000',
      phone: '',
      department: '생산',
      position: '사원',
      joinDate: '2025-01-20',
      workType: '야간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_053',
      name: '조중수',
      password: '5882',
      phone: '010-7797-5882',
      department: '생산',
      position: '반장',
      joinDate: '2018-06-25',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_054',
      name: '김보균',
      password: '9879',
      phone: '010-3873-9879',
      department: '생산',
      position: '사원',
      joinDate: '2025-05-07',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_055',
      name: '안토니오',
      password: '0573',
      phone: '010-6447-0573',
      department: '생산',
      position: '사원',
      joinDate: '2022-08-12',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_056',
      name: '김석철',
      password: '8123',
      phone: '010-8187-8123',
      department: '생산',
      position: '사원',
      joinDate: '2024-07-23',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_057',
      name: '존마이클',
      password: '8922',
      phone: '010-7541-8922',
      department: '생산',
      position: '사원',
      joinDate: '2024-10-15',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_058',
      name: '보다남',
      password: '0000',
      phone: '',
      department: '생산',
      position: '사원',
      joinDate: '2023-04-13',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_059',
      name: '제어리스',
      password: '0000',
      phone: '',
      department: '생산',
      position: '사원',
      joinDate: '2018-10-01',
      workType: '야간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_060',
      name: '리노',
      password: '1883',
      phone: '010-5895-1883',
      department: '생산',
      position: '사원',
      joinDate: '2019-10-14',
      workType: '야간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_061',
      name: '허호선',
      password: '3981',
      phone: '010-8707-3981',
      department: '생산',
      position: '사원',
      joinDate: '2024-11-01',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_062',
      name: '김흥수',
      password: '2535',
      phone: '010-3751-2535',
      department: '생산',
      position: '사원',
      joinDate: '2024-11-13',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_063',
      name: '브렌도',
      password: '4650',
      phone: '010-7629-4650',
      department: '생산',
      position: '사원',
      joinDate: '2024-12-09',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_064',
      name: '윤정수',
      password: '7086',
      phone: '010-4709-7086',
      department: 'ECT',
      position: '사원',
      joinDate: '2022-03-28',
      workType: '야간',
      status: '재직',
      address: '경기도 안산',
    },
    {
      id: 'BS_065',
      name: '안효성',
      password: '4540',
      phone: '010-9003-4540',
      department: '공무',
      position: '주임',
      joinDate: '2022-04-01',
      workType: '주간',
      status: '재직',
      address: '경기도 안산',
    },
  ];

  // 생산 부서 세부부서 배열 (자동 할당용)
  const productionSubDepts = [
    '열',
    '표면',
    '구부',
    '인발',
    '교정·절단',
    '검사',
  ];
  let productionIndex = 0;

  // 추가로 필요한 기본 속성들 설정
  const employees = realEmployeeData.map((emp) => {
    // 생산 부서 직원에게 세부부서 순차 할당 (테스트용)
    let subDept = emp.department;
    if (emp.department === '생산') {
      subDept =
        productionSubDepts[productionIndex % productionSubDepts.length];
      productionIndex++;
    }

    return {
      ...emp,
      role:
        emp.position === '대표'
          ? '대표'
          : emp.position === '반장'
          ? '반장'
          : emp.position === '조장'
          ? '조장'
          : emp.position === '팀장'
          ? '팀장'
          : // 전무/상무는 임원 부서에 있을 때만 총괄, 다른 부서에서는 팀장
          emp.department === '임원' && ['전무', '상무'].includes(emp.position)
          ? '총괄'
          : ['전무', '상무'].includes(emp.position)
          ? '팀장'
          : '팀원',
      payType:
        ['생산', '공무', 'ECT', '출하', '가공'].includes(emp.department) &&
        ['반장', '사원', '조장', '주임'].includes(emp.position)
          ? '시급'
          : '연봉',
      subDepartment: subDept,
      salaryType:
        ['생산', '공무', 'ECT', '출하', '가공'].includes(emp.department) &&
        ['반장', '사원', '조장', '주임'].includes(emp.position)
          ? '시급'
          : '월급',
    };
  });

  return employees;
}; */

// ============================================================
// [1_공통] EXPORTS (update-only)
// ============================================================

// Hook exports (관리자 공통):
// - useAdminFilters
// - useEmployeeState
// - useEmployeeSearch
// - useSortHandlers
// - useNotificationRecipients
// - useAttendanceSync
// - useScheduledNoticePublisher

// Hook exports (공통):
// - useAiChat
// - useLanguage
// - useMonthNavigation
// - useStorageSync
// - useSystemSettings
// - useAuth
// - useMidnightScheduler
// - useMenuStateReset

// Service exports:
// - HolidayService (class)
// - holidayService (instance)
// - getCompanyData

// Util exports:
// - dateUtils (날짜 관련)
// - leaveCalculations (연차 계산)
// - attendanceUtils (근태 관련)
// - permissionUtils (권한 체크)
// - uiUtils (UI 관련)
// - adminDataGenerator (generateAdmins)
// - employeeDataGenerator (generateEmployees)

// Component exports:
// - PopupHeader (UI component)

// Constants exports:
// - SHIFT_TYPES, COMPANY_STANDARDS, PAYROLL_INCOME_ITEMS
// - PAYROLL_DEDUCTION_ITEMS, STATUS_COLORS, EXCLUDE_TIME
// - EXCLUDE_EXTRA_RANKS, WORK_RULES
// - getBreakTimeName, convertToOldFormat, createCompanyWageRules
// - timeToMinutes, minutesToTime, roundDownToHalfHour
// - timeToMinutesNight, calculateNightShiftOverlap, excludeBreakTimesNight
// - categorizeWorkTime, excludeBreakTimes, calcDailyWage
// - calcMonthlyWage, parseTime, analyzeAttendanceStatus
