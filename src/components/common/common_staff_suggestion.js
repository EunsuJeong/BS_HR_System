/**
 * [3_일반직원 모드] 3.7_건의 사항 통합 모듈
 * - Constants → Hook → Util → Export
 * - UI 컴포넌트 제외, 지원 로직만 포함
 */

import { useCallback } from 'react';
import { SuggestionAPI } from '../../api/communication';

// ============================================================
// [3_일반직원 모드] 3.7_건의 사항 - CONSTANTS
// ============================================================

/**
 * 건의사항 페이지 크기
 */
export const SUG_PAGE_SIZE = 15;

// ============================================================
// [3_일반직원 모드] 3.7_건의 사항 - HOOKS
// ============================================================

/**
 * 일반직원 건의사항 관리 Hook
 * @param {Object} dependencies - 외부 의존성
 * @returns {Object} 건의사항 관리 함수들
 */
export const useStaffSuggestion = (dependencies = {}) => {
  const {
    suggestionInput = '',
    setSuggestionInput = () => {},
    setApplyTitle = () => {},
    setApplyContent = () => {},
    setShowSuggestionApplyPopup = () => {},
    applyTitle = '',
    applyContent = '',
    currentUser = {},
    setSuggestions = () => {},
    send자동알림 = () => {},
    setSuggestionPage = () => {},
    getText = (ko, en) => ko,
  } = dependencies;

  // [3_일반직원 모드] 3.7_건의 사항 - 건의사항 신청 시작
  const handleSuggestionApply = useCallback(() => {
    if (!suggestionInput.trim()) return;
    setApplyTitle(suggestionInput.trim());
    setApplyContent('');
    setShowSuggestionApplyPopup(true);
  }, [
    suggestionInput,
    setApplyTitle,
    setApplyContent,
    setShowSuggestionApplyPopup,
  ]);

  // [3_일반직원 모드] 3.7_건의 사항 - 건의사항 제출
  const handleSuggestionSubmit = useCallback(async () => {
    if (!applyContent.trim()) return;
    const now = new Date();
    // applyTitle이 없으면 suggestionInput 사용 (팝업 없이 직접 신청하는 경우)
    const finalTitle = applyTitle || suggestionInput;

    try {
      // DB에 건의사항 저장
      const createdSuggestion = await SuggestionAPI.create({
        employeeId: currentUser.id,
        name: currentUser.name,
        department: currentUser.department,
        type: suggestionInput,
        title: finalTitle,
        content: applyContent,
        status: '대기',
      });


      // 로컬 상태 업데이트
      setSuggestions((prev) => [
        {
          id: createdSuggestion._id,
          _id: createdSuggestion._id,
          employeeId: createdSuggestion.employeeId,
          name: createdSuggestion.name,
          department: createdSuggestion.department,
          type: createdSuggestion.type,
          title: createdSuggestion.title,
          content: createdSuggestion.content,
          status: createdSuggestion.status,
          remark: createdSuggestion.remark,
          approver: createdSuggestion.approver,
          approvalDate: createdSuggestion.approvalDate,
          applyDate: createdSuggestion.applyDate,
          createdAt: createdSuggestion.createdAt,
          date:
            createdSuggestion.applyDate ||
            (createdSuggestion.createdAt
              ? new Date(createdSuggestion.createdAt).toISOString().slice(0, 10)
              : now.toISOString().slice(0, 10)),
        },
        ...prev,
      ]);

      send자동알림({
        처리유형: '건의사항 신청',
        대상자: currentUser,
        처리자: currentUser.name,
        알림내용: `유형:${suggestionInput} \n내용:${applyContent} \n신청일시:${now.toLocaleString(
          'ko-KR'
        )}`,
        건의유형: suggestionInput,
      });

      setShowSuggestionApplyPopup(false);
      setSuggestionInput('구매');
      setApplyTitle('');
      setApplyContent('');
      setSuggestionPage(1);
    } catch (error) {
      console.error('건의사항 제출 실패:', error);
      alert('건의사항 제출 중 오류가 발생했습니다.');
    }
  }, [
    applyContent,
    currentUser,
    suggestionInput,
    applyTitle,
    setSuggestions,
    send자동알림,
    setShowSuggestionApplyPopup,
    setSuggestionInput,
    setApplyTitle,
    setApplyContent,
    setSuggestionPage,
  ]);

  return {
    handleSuggestionApply,
    handleSuggestionSubmit,
  };
};

// ============================================================
// [3_일반직원 모드] 3.7_건의 사항 - UTILS
// ============================================================

/**
 * 건의사항 카테고리 텍스트 반환 (다국어 지원)
 * @param {string} title - 카테고리 제목
 * @param {string} selectedLanguage - 선택된 언어 ('ko' | 'en')
 * @returns {string} 변환된 카테고리 텍스트
 */
export const getSuggestionCategoryText = (title, selectedLanguage) => {
  if (selectedLanguage === 'en') {
    if (title === '구매') return 'Purchase (Consumables)';
    if (title === '기타') return 'Suggestion (to CEO)';
    return title;
  }
  // 한글일 때
  if (title === '구매') return '구매 (소모품)';
  if (title === '기타') return '건의 (대표이사)';
  return title;
};

// ============================================================
// [3_일반직원 모드] 3.7_건의 사항 - EXPORTS (update-only)
// ============================================================

/**
 * EXPORTS:
 *
 * [Constants]
 * - SUG_PAGE_SIZE: 건의사항 페이지 크기 (15)
 *
 * [Hooks]
 * - useStaffSuggestion: 일반직원 건의사항 관리 Hook
 *   → handleSuggestionApply: 건의사항 신청 시작
 *   → handleSuggestionSubmit: 건의사항 제출
 *
 * [Services]
 * - (없음)
 *
 * [Utils]
 * - getSuggestionCategoryText: 건의사항 카테고리 텍스트 반환 (다국어 지원)
 */
