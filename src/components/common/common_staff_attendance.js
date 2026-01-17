/**
 * [3_일반직원 모드] 3.4_회사 일정 및 근태 통합 모듈
 * - Constants → Hook → Util → Export
 * - UI 컴포넌트 제외, 지원 로직만 포함
 */

// ============================================================
// [3_일반직원 모드] 3.4_회사 일정 및 근태 - CONSTANTS
// ============================================================

/**
 * 일정 유형별 색상 클래스
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

/**
 * 요일 이름 (한국어)
 */
export const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 요일 이름 (영어)
 */
export const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ============================================================
// [3_일반직원 모드] 3.4_회사 일정 및 근태 - HOOKS
// ============================================================

// (현재는 Hook 없음, 향후 확장 가능)

// ============================================================
// [3_일반직원 모드] 3.4_회사 일정 및 근태 - UTILS
// ============================================================

/**
 * 특정 연월의 첫 번째 날의 요일 반환
 * @param {number} year - 연도
 * @param {number} month - 월 (1-12)
 * @returns {number} 요일 (0=일요일, 6=토요일)
 */
export const getFirstDayOfWeek = (year, month) => {
  return new Date(year, month - 1, 1).getDay();
};

/**
 * 출근 상태에 따른 색상 반환
 * @param {string} status - 출근 상태
 * @returns {string} Tailwind CSS 색상 클래스
 */
export const getAttendanceDotColor = (status) => {
  if (!status) return 'bg-gray-300';

  if (status === '출근') return 'bg-green-400';

  if (['지각', '조퇴', '지각/조퇴', '결근'].includes(status))
    return 'bg-red-500';

  if (
    [
      '연차',
      '반차(오전)',
      '반차(오후)',
      '병가',
      '경조',
      '공가',
      '휴직',
    ].includes(status)
  )
    return 'bg-orange-400';

  if (status === '기타') return 'bg-green-400';

  if (status === '휴일') return 'bg-gray-400';

  if (status === '근무중') return 'bg-blue-400';

  return 'bg-gray-300';
};

// ============================================================
// [3_일반직원 모드] 3.4_회사 일정 및 근태 - EXPORTS (update-only)
// ============================================================

/**
 * EXPORTS:
 *
 * [Constants]
 * - EVENT_TYPE_COLORS: 일정 유형별 색상 클래스
 * - DAYS_KO: 요일 이름 (한국어)
 * - DAYS_EN: 요일 이름 (영어)
 *
 * [Hooks]
 * - (없음)
 *
 * [Utils]
 * - getFirstDayOfWeek: 특정 연월의 첫 번째 날의 요일 반환
 * - getAttendanceDotColor: 출근 상태에 따른 색상 반환
 */
