/**
 * [2_관리자 모드] 2.7_건의 관리 통합 모듈
 * - Constants → Hook → Service → Util → Export
 * - UI 컴포넌트 제외, 지원 로직만 포함
 */

import { useCallback } from 'react';
import { get연차알림대상자 } from './common_admin_leave';
import { SuggestionAPI } from '../../api/communication';
import * as XLSX from 'xlsx';

// ============================================================
// [2_관리자 모드] 2.7_건의 관리 - CONSTANTS
// ============================================================

/**
 * 건의사항 상태별 색상 스타일
 */
export const STATUS_COLORS = {
  승인: 'bg-blue-100 text-blue-800',
  대기: 'bg-yellow-100 text-yellow-800',
  취소: 'bg-gray-100 text-gray-800',
  반려: 'bg-red-100 text-red-800',
};

// ============================================================
// [2_관리자 모드] 2.7_건의 관리 - HOOKS
// ============================================================

/**
 * 건의사항 승인/반려 처리 Hook
 * @param {Object} dependencies - 외부 의존성
 * @returns {Object} 건의사항 처리 함수들
 */
export const useSuggestionApproval = (dependencies = {}) => {
  const {
    suggestions = [],
    setSuggestions = () => {},
    suggestionApprovalData = {},
    setSuggestionApprovalData = () => {},
    setShowSuggestionApprovalPopup = () => {},
    employees = [],
    send자동알림 = () => {},
    currentUser = {},
    suggestionSearch = {},
    suggestionSortField = '',
    suggestionSortOrder = 'asc',
  } = dependencies;

  // [2_관리자 모드] 2.7_건의관리 - 건의사항 승인 시작
  const handleApproveSuggestion = useCallback(
    (suggestionId) => {
      setSuggestionApprovalData({
        id: suggestionId,
        type: 'approve',
        remark: '',
      });
      setShowSuggestionApprovalPopup(true);
    },
    [setSuggestionApprovalData, setShowSuggestionApprovalPopup]
  );

  // [2_관리자 모드] 2.7_건의관리 - 건의사항 반려 시작
  const handleRejectSuggestion = useCallback(
    (suggestionId) => {
      setSuggestionApprovalData({
        id: suggestionId,
        type: 'reject',
        remark: '',
      });
      setShowSuggestionApprovalPopup(true);
    },
    [setSuggestionApprovalData, setShowSuggestionApprovalPopup]
  );

  // [2_관리자 모드] 2.7_건의관리 - 건의사항 승인/반려 확정
  const handleSuggestionApprovalConfirm = useCallback(async () => {
    const { id, type, remark } = suggestionApprovalData;
    const targetSuggestion = suggestions.find((sg) => sg.id === id);
    if (!targetSuggestion) return;

    const approvalDate = new Date().toLocaleDateString('ko-KR');
    const status = type === 'approve' ? '승인' : '반려';
    const finalRemark =
      remark.trim() || (type === 'approve' ? '승인됨' : '사유 없음');

    try {
      // DB 업데이트 API 호출
      await SuggestionAPI.update(id, {
        status,
        remark: finalRemark,
        approver: currentUser.name,
        approvalDate: new Date().toISOString(),
      });

      // 로컬 상태 업데이트
      setSuggestions((prev) =>
        prev.map((sg) =>
          sg.id === id
            ? {
                ...sg,
                status,
                remark: finalRemark,
                approver: currentUser.name,
                approvalDate: approvalDate,
              }
            : sg
        )
      );

      const targetEmployee = employees.find(
        (emp) => emp.id === targetSuggestion.employeeId
      );
      if (targetEmployee) {
        send자동알림({
          처리유형: type === 'approve' ? '건의사항 승인' : '건의사항 반려',
          대상자: targetEmployee,
          처리자: currentUser.name,
          알림내용: `${
            targetSuggestion.name
          }님의 건의사항이 ${status}되었습니다.\n건의 유형: ${
            targetSuggestion.type
          }\n건의 내용: ${
            targetSuggestion.content
          }\n${status} 사유: ${finalRemark}\n${status}일시: ${new Date().toLocaleString(
            'ko-KR'
          )}`,
          건의유형: targetSuggestion.type,
        });
      }

      alert(`건의사항이 ${status}되었습니다.`);
      setShowSuggestionApprovalPopup(false);
      setSuggestionApprovalData({ id: null, type: '', remark: '' });
    } catch (error) {
      console.error('건의사항 처리 실패:', error);
      alert('건의사항 처리 중 오류가 발생했습니다.');
    }
  }, [
    suggestionApprovalData,
    suggestions,
    setSuggestions,
    employees,
    send자동알림,
    currentUser,
    setShowSuggestionApprovalPopup,
    setSuggestionApprovalData,
  ]);

  // [2_관리자 모드] 2.7_건의 관리 - 건의사항 목록 필터링
  const getFilteredSuggestions = useCallback(
    (suggestionList) => {
      return filterSuggestions(suggestionList, suggestionSearch);
    },
    [suggestionSearch]
  );

  // [2_관리자 모드] 2.7_건의 관리 - 건의사항 목록 정렬
  const getSortedSuggestions = useCallback(
    (suggestionList) => {
      return sortSuggestions(
        suggestionList,
        suggestionSortField,
        suggestionSortOrder
      );
    },
    [suggestionSortField, suggestionSortOrder]
  );

  return {
    handleApproveSuggestion,
    handleRejectSuggestion,
    handleSuggestionApprovalConfirm,
    getFilteredSuggestions,
    getSortedSuggestions,
  };
};

// ============================================================
// [2_관리자 모드] 2.7_건의 관리 - SERVICES
// ============================================================

/**
 * 건의사항 유형에 따라 알림 대상자 조회
 * @param {Array} employees - 직원 배열
 * @param {Object} 직원정보 - 건의사항 관련 직원 정보
 * @param {Object} 신청자정보 - 건의사항 신청자 정보 (옵션)
 * @param {string} 처리유형 - 처리 유형 (신청/승인/반려)
 * @param {string} 건의유형 - 건의 유형 (구매/기타)
 * @returns {Array} 알림 대상자 목록
 */
export const get건의사항알림대상자 = (
  employees,
  직원정보,
  신청자정보 = null,
  처리유형 = '',
  건의유형 = ''
) => {
  let 알림대상자들 = [];

  if (건의유형 === '구매') {
    return get연차알림대상자(employees, 직원정보, 신청자정보, 처리유형);
  } else if (건의유형 === '기타') {
    const 대표 = employees.find(
      (emp) =>
        emp.department === '대표' &&
        emp.subDepartment === '대표' &&
        emp.role === '대표'
    );
    if (대표) 알림대상자들.push(대표);

    if (신청자정보 && !처리유형.includes('신청')) {
      알림대상자들.push(신청자정보);
    }
  }

  if (신청자정보 && 처리유형.includes('신청')) {
    return 알림대상자들.filter((대상자) => 대상자.id !== 신청자정보.id);
  }

  return 알림대상자들;
};

// ============================================================
// [2_관리자 모드] 2.7_건의 관리 - UTILS
// ============================================================

/**
 * 건의사항 목록 필터링
 * @param {Array} suggestionList - 건의사항 목록
 * @param {Object} suggestionSearch - 검색 조건
 * @returns {Array} 필터링된 건의사항 목록
 */
export const filterSuggestions = (suggestionList, suggestionSearch) => {
  return suggestionList.filter((sg) => {
    if (
      suggestionSearch.year ||
      suggestionSearch.month ||
      suggestionSearch.day
    ) {
      const applyDate = new Date(sg.applyDate);
      if (
        suggestionSearch.year &&
        applyDate.getFullYear() !== parseInt(suggestionSearch.year)
      ) {
        return false;
      }
      if (
        suggestionSearch.month &&
        applyDate.getMonth() + 1 !== parseInt(suggestionSearch.month)
      ) {
        return false;
      }
      if (
        suggestionSearch.day &&
        applyDate.getDate() !== parseInt(suggestionSearch.day)
      ) {
        return false;
      }
    }

    if (
      suggestionSearch.department !== '전체' &&
      sg.department !== suggestionSearch.department
    ) {
      return false;
    }

    if (suggestionSearch.type !== '전체' && sg.type !== suggestionSearch.type) {
      return false;
    }

    if (
      suggestionSearch.status !== '전체' &&
      sg.status !== suggestionSearch.status
    ) {
      return false;
    }

    if (suggestionSearch.keyword) {
      if (
        !sg.employeeId?.includes(suggestionSearch.keyword) &&
        !sg.name?.includes(suggestionSearch.keyword)
      ) {
        return false;
      }
    }

    return true;
  });
};

/**
 * 건의사항 목록 정렬
 * @param {Array} suggestionList - 건의사항 목록
 * @param {string} suggestionSortField - 정렬 필드
 * @param {string} suggestionSortOrder - 정렬 순서 ('asc' or 'desc')
 * @returns {Array} 정렬된 건의사항 목록
 */
export const sortSuggestions = (
  suggestionList,
  suggestionSortField,
  suggestionSortOrder
) => {
  if (!suggestionSortField) return suggestionList;

  return [...suggestionList].sort((a, b) => {
    let aVal, bVal;

    switch (suggestionSortField) {
      case 'applyDate':
        aVal = new Date(a.applyDate);
        bVal = new Date(b.applyDate);
        break;
      case 'employeeId':
        aVal = a.employeeId;
        bVal = b.employeeId;
        break;
      case 'name':
        aVal = a.name;
        bVal = b.name;
        break;
      case 'department':
        aVal = a.department;
        bVal = b.department;
        break;
      case 'type':
        aVal = a.type;
        bVal = b.type;
        break;
      case 'content':
        aVal = a.content;
        bVal = b.content;
        break;
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return suggestionSortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return suggestionSortOrder === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * 건의사항 목록을 엑셀로 내보내기
 * @param {Array} suggestions - 전체 건의사항 목록
 * @param {Function} getFilteredSuggestions - 필터링 함수
 * @param {Function} formatDateByLang - 날짜 포맷팅 함수
 * @returns {void}
 */
export const exportSuggestionsToXLSX = (
  suggestions,
  getFilteredSuggestions,
  formatDateByLang
) => {
  const filteredData = getFilteredSuggestions(suggestions);
  const rows = filteredData.map((sg) => ({
    유형: sg.type,
    신청일: sg.applyDate,
    결재일: sg.approvedDate
      ? formatDateByLang(sg.approvedDate)
      : sg.rejectedDate
      ? formatDateByLang(sg.rejectedDate)
      : '-',
    사번: sg.employeeId,
    이름: sg.name,
    부서: sg.department,
    내용: sg.content,
    비고: sg.remark || '-',
    상태: sg.status,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '건의사항');
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  XLSX.writeFile(wb, `부성스틸(주)_건의 사항_${yyyy}${mm}${dd}.xlsx`);
};

// ============================================================
// [2_관리자 모드] 2.7_건의 관리 - EXPORTS (update-only)
// ============================================================

/**
 * EXPORTS:
 *
 * [Constants]
 * - STATUS_COLORS: 건의사항 상태별 색상 스타일
 *
 * [Hooks]
 * - useSuggestionApproval: 건의사항 승인/반려 처리 Hook
 *
 * [Services]
 * - get건의사항알림대상자: 건의사항 알림 대상자 조회 서비스
 *
 * [Utils]
 * - filterSuggestions: 건의사항 필터링 함수
 * - sortSuggestions: 건의사항 정렬 함수
 * - exportSuggestionsToXLSX: 건의사항 엑셀 다운로드 함수
 */
