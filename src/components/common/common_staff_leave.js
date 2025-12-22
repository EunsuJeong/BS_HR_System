/**
 * [3_일반직원 모드] 3.5_연차 신청/내역 통합 모듈
 * - Constants → Hook → Export
 * - UI 컴포넌트 제외, 지원 로직만 포함
 */

import { useCallback } from 'react';

// ============================================================
// [3_일반직원 모드] 3.5_연차 신청/내역 - CONSTANTS
// ============================================================

/**
 * 연차 유형 목록
 */
export const LEAVE_TYPES = [
  '연차',
  '반차(오전)',
  '반차(오후)',
  '외출',
  '조퇴',
  '경조',
  '공가',
  '휴직',
  '결근',
  '기타',
];

/**
 * 연차 내역 페이지 크기
 */
export const LEAVE_PAGE_SIZE = 15;

// ============================================================
// [3_일반직원 모드] 3.5_연차 신청/내역 - HOOKS
// ============================================================

/**
 * 일반직원 연차 신청 및 관리 Hook
 * @param {Object} dependencies - 외부 의존성
 * @returns {Object} 연차 관리 함수들
 */
export const useStaffLeave = (dependencies = {}) => {
  const {
    leaveForm = {},
    setLeaveForm = () => {},
    setLeaveFormError = () => {},
    setLeaveFormPreview = () => {},
    leaveRequests = [],
    setLeaveRequests = () => {},
    currentUser = {},
    remainAnnualLeave = 0,
    isHolidayDate = () => false,
    send자동알림 = () => {},
    getText = (ko, en) => ko,
  } = dependencies;

  // [3_일반직원 모드] 3.5_연차 신청/내역 - 연차 신청 취소
  const handleCancelLeave = useCallback(
    async (leaveId) => {
      try {
        // DB에 취소 상태 저장
        const { default: LeaveAPI } = await import('../../api/leave');
        await LeaveAPI.updateStatus(leaveId, { status: '취소' });

        // 로컬 state 업데이트
        setLeaveRequests((prev) =>
          prev.map((lr) => (lr.id === leaveId ? { ...lr, status: '취소' } : lr))
        );
      } catch (error) {
        console.error('❌ 연차 취소 실패:', error);
        alert('연차 취소 중 오류가 발생했습니다.');
      }
    },
    [setLeaveRequests]
  );

  // [3_일반직원 모드] 3.5_연차 신청/내역 - 연차 폼 변경
  const handleLeaveFormChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setLeaveForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    },
    [setLeaveForm]
  );

  // [3_일반직원 모드] 3.5_연차 신청/내역 - 연차 신청 요청
  const handleLeaveRequest = useCallback(async () => {
    setLeaveFormError('');

    if (
      !leaveForm.startDate ||
      !leaveForm.endDate ||
      !leaveForm.type ||
      !leaveForm.reason
    ) {
      setLeaveFormError(
        getText('모든 항목을 입력해주세요.', 'Please fill in all fields.')
      );
      return;
    }

    if (
      leaveForm.type.startsWith('반차') &&
      leaveForm.startDate !== leaveForm.endDate
    ) {
      setLeaveFormError(
        getText(
          '반차는 시작일과 종료일이 같아야 합니다.',
          'For half-day leave, start and end date must be the same.'
        )
      );
      return;
    }

    if (leaveForm.endDate < leaveForm.startDate) {
      setLeaveFormError(
        getText(
          '종료일이 시작일보다 빠를 수 없습니다.',
          'End date cannot be earlier than start date.'
        )
      );
      return;
    }

    // 날짜 문자열을 로컬 시간으로 파싱 (YYYY-MM-DD 형식)
    const parseLocalDate = (dateStr) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    const start = parseLocalDate(leaveForm.startDate);
    const end = parseLocalDate(leaveForm.endDate);
    const current = new Date(start);

    while (current <= end) {
      const year = current.getFullYear();
      const month = current.getMonth() + 1;
      const day = current.getDate();
      const dayOfWeek = current.getDay();

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        setLeaveFormError(
          getText(
            '주말에는 연차를 신청할 수 없습니다.',
            'Cannot apply for leave on weekends.'
          )
        );
        return;
      }

      if (isHolidayDate(year, month, day)) {
        setLeaveFormError(
          getText(
            '휴일 또는 공휴일에는 연차를 신청할 수 없습니다.',
            'Cannot apply for leave on holidays.'
          )
        );
        return;
      }

      current.setDate(current.getDate() + 1);
    }

    const overlap = leaveRequests.some(
      (lr) =>
        lr.employeeId === currentUser.id &&
        (lr.status === '대기' || lr.status === '승인') &&
        leaveForm.startDate <= lr.endDate &&
        leaveForm.endDate >= lr.startDate
    );
    if (overlap) {
      setLeaveFormError(
        getText(
          '이미 신청된 기간과 겹칩니다.',
          'The requested period overlaps with an existing application.'
        )
      );
      return;
    }

    let days = 0;
    if (leaveForm.type === '연차') {
      const start = parseLocalDate(leaveForm.startDate);
      const end = parseLocalDate(leaveForm.endDate);
      days = Math.abs((end - start) / (1000 * 60 * 60 * 24)) + 1;
    } else if (leaveForm.type.startsWith('반차')) {
      days = 0.5;
    } else if (leaveForm.type === '경조' || leaveForm.type === '공가' || leaveForm.type === '휴직') {
      // 경조, 공가, 휴직: 연차 미차감
      days = 0;
    } else {
      // 외출, 조퇴, 결근, 기타: 1일 차감
      days = 1;
    }

    // 연차가 차감되는 유형에 대해서만 잔여 연차 확인
    if (
      days > 0 &&
      remainAnnualLeave < days
    ) {
      setLeaveFormError(
        getText(
          '잔여 연차가 부족합니다.',
          'Insufficient remaining annual leave.'
        )
      );
      return;
    }

    const now = new Date();

    // 연차 일수 계산
    let requestedDays = 0;
    if (leaveForm.type === '연차') {
      const start = parseLocalDate(leaveForm.startDate);
      const end = parseLocalDate(leaveForm.endDate);
      requestedDays = Math.abs((end - start) / (1000 * 60 * 60 * 24)) + 1;
    } else if (leaveForm.type.startsWith('반차')) {
      requestedDays = 0.5;
    } else if (leaveForm.type === '경조' || leaveForm.type === '공가' || leaveForm.type === '휴직') {
      // 경조, 공가, 휴직: 연차 미차감 (0일)
      requestedDays = 0;
    } else {
      // 외출, 조퇴, 결근, 기타: 1일
      requestedDays = 1;
    }

    const newLeave = {
      id: Date.now(),
      employeeId: currentUser.id || currentUser.employeeId,
      employeeName: currentUser.name,
      name: currentUser.name,
      department: currentUser.department,
      position: currentUser.position,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      leaveType: leaveForm.type,
      type: leaveForm.type, // 프론트엔드 호환성을 위해 type도 추가
      reason: leaveForm.reason,
      contact: leaveForm.contact || currentUser.phone,
      status: '대기',
      requestDate: now.toISOString().slice(0, 10),
      requestDateTime: now.toISOString(),
      requestedDays: requestedDays, // 새 스키마 필드
      days: requestedDays, // 하위 호환성
    };

    // DB에 저장
    let savedLeave;
    try {
      // LeaveAPI는 동적 import로 가져옴 (순환 참조 방지)
      const { default: LeaveAPI } = await import('../../api/leave');
      const response = await LeaveAPI.create(newLeave);
      savedLeave = response.data || response;
    } catch (error) {
      console.error('❌ 연차 DB 저장 실패:', error);
      setLeaveFormError(
        getText(
          '연차 신청 중 오류가 발생했습니다.',
          'Error occurred while submitting leave.'
        )
      );
      return;
    }

    // DB에서 저장된 데이터로 state 업데이트
    const formattedLeave = {
      id: savedLeave._id ? String(savedLeave._id) : savedLeave.id, // ObjectId를 문자열로 변환
      _id: savedLeave._id ? String(savedLeave._id) : savedLeave.id, // _id도 저장
      employeeId: savedLeave.employeeId,
      employeeName: savedLeave.employeeName,
      name: savedLeave.employeeName || savedLeave.name,
      department: savedLeave.department,
      leaveType: savedLeave.type || savedLeave.leaveType, // type 필드 사용
      type: savedLeave.type || savedLeave.leaveType,
      startDate: savedLeave.startDate?.split('T')[0] || savedLeave.startDate,
      endDate: savedLeave.endDate?.split('T')[0] || savedLeave.endDate,
      days: savedLeave.requestedDays || savedLeave.days,
      requestedDays: savedLeave.requestedDays || savedLeave.days,
      reason: savedLeave.reason,
      contact: savedLeave.contact,
      status: savedLeave.status,
      requestDate:
        savedLeave.requestDate?.split('T')[0] || now.toISOString().slice(0, 10),
      requestDateTime: savedLeave.requestDateTime || now.toISOString(),
    };
    setLeaveRequests((prev) => [formattedLeave, ...prev]);

    // requestedDays는 이미 위에서 계산됨 (205줄)
    send자동알림({
      처리유형: '연차 신청',
      대상자: currentUser,
      처리자: currentUser.name,
      알림내용: `유형:${leaveForm.type} \n기간:${leaveForm.startDate}${
        leaveForm.endDate !== leaveForm.startDate
          ? ` ~ ${leaveForm.endDate}`
          : ''
      }${requestedDays > 0 ? `\n신청일수:${requestedDays}일` : ''} \n사유:${
        leaveForm.reason
      } \n연락처:${
        leaveForm.contact || '미입력'
      } \n신청일시:${now.toLocaleString('ko-KR')}`,
    });

    setLeaveForm({
      startDate: '',
      endDate: '',
      type: '연차',
      reason: '',
      contact: '',
    });
    setLeaveFormPreview(null);
  }, [
    leaveForm,
    leaveRequests,
    currentUser,
    remainAnnualLeave,
    isHolidayDate,
    send자동알림,
    getText,
    setLeaveFormError,
    setLeaveRequests,
    setLeaveForm,
    setLeaveFormPreview,
  ]);

  // [3_일반직원 모드] 3.5_연차 신청/내역 - 연차 수정 저장
  const handleSaveEditedLeave = useCallback(
    (editingLeave, setShowEditLeavePopup, setEditingLeave) => {
      setLeaveRequests((prev) =>
        prev.map((lr) => (lr.id === editingLeave.id ? editingLeave : lr))
      );
      setShowEditLeavePopup(false);
      setEditingLeave(null);
    },
    [setLeaveRequests]
  );

  return {
    handleCancelLeave,
    handleLeaveFormChange,
    handleLeaveRequest,
    handleSaveEditedLeave,
  };
};

// ============================================================
// [3_일반직원 모드] 3.5_연차 신청/내역 - EXPORTS (update-only)
// ============================================================

/**
 * EXPORTS:
 *
 * [Constants]
 * - LEAVE_TYPES: 연차 유형 목록 (연차, 반차, 외출, 조퇴, 경조, 공가, 휴직, 결근, 기타)
 * - LEAVE_PAGE_SIZE: 연차 내역 페이지 크기 (15)
 *
 * [Hooks]
 * - useStaffLeave: 일반직원 연차 신청 및 관리 Hook
 *   → handleCancelLeave: 연차 신청 취소
 *   → handleLeaveFormChange: 연차 폼 변경
 *   → handleLeaveRequest: 연차 신청 요청
 *   → handleSaveEditedLeave: 연차 수정 저장
 *
 * [Services]
 * - (없음)
 *
 * [Utils]
 * - (없음)
 */
