'use strict';

/**
 * AI Router v2 - Intent Detection
 * 사용자 쿼리에서 의도(intent)를 분류하여 적절한 서비스 레이어로 라우팅
 */

const INTENT_PATTERNS = {
  attendance: /출근|퇴근|근태|지각|결근|조퇴|출퇴근|근무현황|오늘.*출|출.*오늘|근무.*현황|현황.*근무/,
  leave:      /연차|휴가|반차|연차현황|연차신청|연차.*승인|승인.*연차|잔여.*연차|연차.*잔여/,
  payroll:    /급여|월급|임금|수당|공제|급여명세|기본급|연봉/,
  employee:   /직원|사원|인원|채용|퇴사|입사|재직|직원현황|부서.*인원|인원.*부서/,
  notice:     /공지|공지사항|안내문/,
  suggestion: /건의|건의사항|제안/,
  evaluation: /평가|성과|목표|kpi/i,
  safety:     /안전|사고|안전사고|산재/,
  schedule:   /일정|회의|행사|스케줄/,
};

/**
 * 쿼리에서 의도 분류
 * @param {string} query
 * @returns {string} intent key
 */
function detectIntent(query) {
  if (!query) return 'general';
  const q = query.trim();
  for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
    if (pattern.test(q)) {
      return intent;
    }
  }
  return 'general';
}

module.exports = { detectIntent };
