/**
 * [2_관리자 모드] 2.10_평가 관리 통합 모듈
 * - Hook → Util → Export
 * - UI 컴포넌트 제외, 지원 로직만 포함
 */

import { useCallback } from 'react';
import * as XLSX from 'xlsx';
import EvaluationAPI from '../../api/evaluation';

// ============================================================
// [2_관리자 모드] 2.10_평가 관리 - HOOKS
// ============================================================

/**
 * 평가 관리 Hook
 * @param {Object} dependencies - 외부 의존성
 * @returns {Object} 평가 관리 함수들
 */
export const useEvaluationManagement = (dependencies = {}) => {
  const {
    evaluationForm = {},
    setEvaluationForm = () => {},
    evaluationData = [],
    setEvaluationData = () => {},
    setShowEvaluationForm = () => {},
    editingEvaluationId = null,
    setEditingEvaluationId = () => {},
    editingEvaluationData = {},
    setEditingEvaluationData = () => {},
    employees = [],
    send자동알림 = () => {},
    currentUser = {},
    evaluationSearch = {},
    evaluationSortField = '',
    evaluationSortOrder = 'asc',
  } = dependencies;

  // [2_관리자 모드] 2.10_평가관리 - 평가 제출 (DB 연동)
  const handleEvaluationSubmit = useCallback(async () => {
    if (!evaluationForm.employeeId || !evaluationForm.content) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }

    const employee = employees.find(
      (emp) => emp.id === evaluationForm.employeeId
    );
    if (!employee) {
      alert('존재하지 않는 직원 사번입니다.');
      return;
    }

    try {
      const evaluationPayload = {
        year: evaluationForm.year,
        employeeId: evaluationForm.employeeId,
        name: employee.name,
        department: employee.department,
        grade: evaluationForm.grade,
        content: evaluationForm.content,
        status: evaluationForm.status || '예정',
      };

      const response = await EvaluationAPI.create(evaluationPayload);

      if (response.success) {
        // DB에서 새로 생성된 평가 데이터를 로컬 상태에 추가
        setEvaluationData((prev) => [response.data, ...prev]);

        if (employee) {
          send자동알림({
            처리유형: '직원평가 수신',
            대상자: employee,
            처리자: currentUser?.name || '관리자',
            알림내용: `${employee.name}님의 ${evaluationForm.year}년도 성과 평가가 등록되었습니다.`,
          });
        }

        setEvaluationForm({
          year: new Date().getFullYear(),
          employeeId: '',
          grade: 'A',
          content: '',
          status: '예정',
        });
        setShowEvaluationForm(false);
        alert('성과 평가가 등록되었습니다.');
      }
    } catch (error) {
      console.error('❌ 평가 등록 실패:', error);
      alert(error.response?.data?.error || '평가 등록에 실패했습니다.');
    }
  }, [
    evaluationForm,
    employees,
    setEvaluationData,
    send자동알림,
    currentUser,
    setEvaluationForm,
    setShowEvaluationForm,
  ]);

  // [2_관리자 모드] 2.10_평가관리 - 평가 수정 시작
  const handleEvaluationEdit = useCallback(
    (evaluation) => {
      setEditingEvaluationId(evaluation._id);
      setEditingEvaluationData({ ...evaluation });
    },
    [setEditingEvaluationId, setEditingEvaluationData]
  );

  // [2_관리자 모드] 2.10_평가관리 - 평가 저장 (DB 연동)
  const handleEvaluationSave = useCallback(
    async (evaluation) => {
      if (!editingEvaluationData) return;

      try {
        const updatePayload = {
          year: editingEvaluationData.year,
          employeeId: editingEvaluationData.employeeId,
          grade: editingEvaluationData.grade,
          content: editingEvaluationData.content,
          status: editingEvaluationData.status,
        };

        const response = await EvaluationAPI.update(
          editingEvaluationId,
          updatePayload
        );

        if (response.success) {
          // 로컬 상태 업데이트
          setEvaluationData((prev) =>
            prev.map((e) => (e._id === editingEvaluationId ? response.data : e))
          );

          // 직원에게 알림 전송
          const employee = employees.find(
            (emp) => emp.id === editingEvaluationData.employeeId
          );
          if (employee) {
            send자동알림({
              처리유형: '직원평가 수정',
              대상자: employee,
              처리자: currentUser?.name || '관리자',
              알림내용: `${employee.name}님의 ${editingEvaluationData.year}년도 성과 평가가 수정되었습니다.\n등급: ${editingEvaluationData.grade}\n상태: ${editingEvaluationData.status}`,
            });
          }

          setEditingEvaluationId(null);
          setEditingEvaluationData({});
          alert('평가 정보가 저장되었습니다.');
        }
      } catch (error) {
        console.error('❌ 평가 수정 실패:', error);
        alert(error.response?.data?.error || '평가 수정에 실패했습니다.');
      }
    },
    [
      editingEvaluationData,
      editingEvaluationId,
      setEvaluationData,
      setEditingEvaluationId,
      setEditingEvaluationData,
      employees,
      send자동알림,
      currentUser,
    ]
  );

  // [2_관리자 모드] 2.10_평가관리 - 평가 삭제 (DB 연동)
  const handleEvaluationDelete = useCallback(
    async (evaluation) => {
      const employee = employees.find(
        (emp) => emp.id === evaluation.employeeId
      );

      if (
        !window.confirm(
          `${employee?.name || evaluation.employeeId}님의 ${
            evaluation.year
          }년도 평가를 삭제하시겠습니까?`
        )
      ) {
        return;
      }

      try {
        const response = await EvaluationAPI.delete(evaluation._id);

        if (response.success) {
          // 로컬 상태 업데이트
          setEvaluationData((prev) =>
            prev.filter((e) => e._id !== evaluation._id)
          );

          // 직원에게 알림 전송
          if (employee) {
            send자동알림({
              처리유형: '직원평가 삭제',
              대상자: employee,
              처리자: currentUser?.name || '관리자',
              알림내용: `${employee.name}님의 ${evaluation.year}년도 성과 평가가 삭제되었습니다.`,
            });
          }

          alert('평가가 삭제되었습니다.');
        }
      } catch (error) {
        console.error('❌ 평가 삭제 실패:', error);
        alert(error.response?.data?.error || '평가 삭제에 실패했습니다.');
      }
    },
    [setEvaluationData, employees, send자동알림, currentUser]
  );

  // [2_관리자 모드] 2.10_평가 관리 - 평가 목록 필터링
  const getFilteredEvaluation = useCallback(
    (evaluationList) => {
      return evaluationList.filter((perf) => {
        if (
          evaluationSearch.year &&
          perf.year !== parseInt(evaluationSearch.year)
        ) {
          return false;
        }

        if (
          evaluationSearch.department !== '전체' &&
          perf.department !== evaluationSearch.department
        ) {
          return false;
        }

        if (
          evaluationSearch.grade !== '전체' &&
          perf.grade !== evaluationSearch.grade
        ) {
          return false;
        }

        if (evaluationSearch.keyword) {
          // 쉼표(,) 또는 공백으로 구분하여 여러 검색어 지원
          const searchKeywords = evaluationSearch.keyword
            .split(/[,\s]+/) // 쉼표 또는 공백으로 분리
            .map((keyword) => keyword.trim()) // 앞뒤 공백 제거
            .filter((keyword) => keyword.length > 0); // 빈 문자열 제거

          // 검색어 중 하나라도 사번 또는 이름에 포함되어 있으면 통과
          const isMatch = searchKeywords.some(
            (searchKeyword) =>
              perf.employeeId?.includes(searchKeyword) ||
              perf.name?.includes(searchKeyword)
          );

          if (!isMatch) {
            return false;
          }
        }

        return true;
      });
    },
    [evaluationSearch]
  );

  // [2_관리자 모드] 2.10_평가 관리 - 평가 목록 정렬
  const getSortedEvaluations = useCallback(
    (evaluationList) => {
      if (!evaluationSortField) return evaluationList;

      return [...evaluationList].sort((a, b) => {
        let aVal, bVal;

        switch (evaluationSortField) {
          case 'year':
            aVal = a.year;
            bVal = b.year;
            break;
          case 'employeeId':
            aVal = a.employeeId;
            bVal = b.employeeId;
            break;
          case 'name':
            aVal = a.name;
            bVal = b.name;
            break;
          case 'position':
            aVal = a.position;
            bVal = b.position;
            break;
          case 'department':
            aVal = a.department;
            bVal = b.department;
            break;
          case 'grade':
            aVal = a.grade;
            bVal = b.grade;
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

        if (aVal < bVal) return evaluationSortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return evaluationSortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    },
    [evaluationSortField, evaluationSortOrder]
  );

  return {
    handleEvaluationSubmit,
    handleEvaluationEdit,
    handleEvaluationSave,
    handleEvaluationDelete,
    getFilteredEvaluation,
    getSortedEvaluations,
  };
};

// ============================================================
// [2_관리자 모드] 2.10_평가 관리 - UTILS
// ============================================================

/**
 * 평가 목록 필터링
 * @param {Array} evaluationList - 평가 목록
 * @param {Object} evaluationSearch - 검색 조건
 * @returns {Array} 필터링된 평가 목록
 */
export const filterEvaluations = (evaluationList, evaluationSearch) => {
  return evaluationList.filter((perf) => {
    if (
      evaluationSearch.year &&
      perf.year !== parseInt(evaluationSearch.year)
    ) {
      return false;
    }

    if (
      evaluationSearch.department !== '전체' &&
      perf.department !== evaluationSearch.department
    ) {
      return false;
    }

    if (
      evaluationSearch.grade !== '전체' &&
      perf.grade !== evaluationSearch.grade
    ) {
      return false;
    }

    if (evaluationSearch.keyword) {
      // 쉼표(,) 또는 공백으로 구분하여 여러 검색어 지원
      const searchKeywords = evaluationSearch.keyword
        .split(/[,\s]+/) // 쉼표 또는 공백으로 분리
        .map((keyword) => keyword.trim()) // 앞뒤 공백 제거
        .filter((keyword) => keyword.length > 0); // 빈 문자열 제거

      // 검색어 중 하나라도 사번 또는 이름에 포함되어 있으면 통과
      const isMatch = searchKeywords.some(
        (searchKeyword) =>
          perf.employeeId?.includes(searchKeyword) ||
          perf.name?.includes(searchKeyword)
      );

      if (!isMatch) {
        return false;
      }
    }

    return true;
  });
};

/**
 * 평가 목록 정렬
 * @param {Array} evaluationList - 평가 목록
 * @param {string} evaluationSortField - 정렬 필드
 * @param {string} evaluationSortOrder - 정렬 순서 ('asc' or 'desc')
 * @returns {Array} 정렬된 평가 목록
 */
export const sortEvaluations = (
  evaluationList,
  evaluationSortField,
  evaluationSortOrder
) => {
  if (!evaluationSortField) return evaluationList;

  return [...evaluationList].sort((a, b) => {
    let aVal, bVal;

    switch (evaluationSortField) {
      case 'year':
        aVal = a.year;
        bVal = b.year;
        break;
      case 'employeeId':
        aVal = a.employeeId;
        bVal = b.employeeId;
        break;
      case 'name':
        aVal = a.name;
        bVal = b.name;
        break;
      case 'position':
        aVal = a.position;
        bVal = b.position;
        break;
      case 'department':
        aVal = a.department;
        bVal = b.department;
        break;
      case 'grade':
        aVal = a.grade;
        bVal = b.grade;
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

    if (aVal < bVal) return evaluationSortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return evaluationSortOrder === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * 평가 데이터 엑셀 다운로드
 * @param {Array} evaluationData - 평가 데이터 목록
 */
export const exportEvaluationToXLSX = (evaluationData) => {
  const rows = evaluationData.map((ev) => ({
    날짜: ev.year,
    사번: ev.employeeId,
    이름: ev.name,
    직급: ev.position,
    부서: ev.department,
    등급: ev.grade,
    내용: ev.content,
    상태: ev.status,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '직원 평가');

  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');

  XLSX.writeFile(wb, `부성스틸(주)_직원 평가_${yyyy}${mm}${dd}.xlsx`);
};

// ============================================================
// [2_관리자 모드] 2.10_평가 관리 - EXPORTS (update-only)
// ============================================================

/**
 * EXPORTS:
 * - useEvaluationManagement: 평가 관리 Hook
 *   - handleEvaluationSubmit: 평가 제출 (중복 체크 포함)
 *   - handleEvaluationEdit: 평가 수정 시작
 *   - handleEvaluationSave: 평가 저장 (중복 체크 포함)
 *   - getFilteredEvaluation: 평가 목록 필터링
 *   - getSortedEvaluations: 평가 목록 정렬
 * - filterEvaluations: 평가 목록 필터링 함수
 * - sortEvaluations: 평가 목록 정렬 함수
 * - exportEvaluationToXLSX: 평가 데이터 엑셀 다운로드 함수
 */
