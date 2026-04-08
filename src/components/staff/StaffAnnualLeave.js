import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { LEAVE_TYPES, LEAVE_PAGE_SIZE, useStaffLeave } from '../common/common_staff_leave';
import LeaveAPI from '../../api/leave';

// ============================================================
// 시간 셀렉트 피커 (12시간제, 오전/오후 언어 지원)
// ============================================================
const parseTime12h = (val) => {
  if (!val) return { period: 'AM', hour: 9, minute: 0 };
  const [h, m] = val.split(':').map(Number);
  return {
    period: h < 12 ? 'AM' : 'PM',
    hour: h === 0 ? 12 : h > 12 ? h - 12 : h,
    minute: isNaN(m) ? 0 : Math.round(m / 5) * 5,
  };
};

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const fmt12h = (t) => {
  if (!t) return null;
  const h = parseInt(t.split(':')[0], 10);
  const p = h < 12 ? '오전' : '오후';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${p} ${h12}:${t.split(':')[1]}`;
};

const TimePickerSelect = ({ name, value, onChange, disabled, getText, label }) => {
  const [open, setOpen] = useState(false);
  const init = parseTime12h(value);
  const [localPeriod, setLocalPeriod] = useState(init.period);
  const [localHour, setLocalHour] = useState(init.hour);
  const [localMinute, setLocalMinute] = useState(init.minute);

  useEffect(() => {
    if (value) {
      const p = parseTime12h(value);
      setLocalPeriod(p.period);
      setLocalHour(p.hour);
      setLocalMinute(p.minute);
    } else {
      setLocalPeriod('AM');
      setLocalHour(9);
      setLocalMinute(0);
    }
  }, [value]);

  const handleConfirm = () => {
    let h24 = localHour;
    if (localPeriod === 'AM' && localHour === 12) h24 = 0;
    else if (localPeriod === 'PM' && localHour !== 12) h24 = localHour + 12;
    onChange({
      target: { name, value: `${String(h24).padStart(2, '0')}:${String(localMinute).padStart(2, '0')}` },
    });
    setOpen(false);
  };

  const formatDisplay = () => {
    if (!value) return null;
    const p = parseTime12h(value);
    const pl = p.period === 'AM' ? getText('오전', 'AM') : getText('오후', 'PM');
    return `${pl} ${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
  };

  const display = formatDisplay();
  const selectClass = 'border rounded px-2 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400';

  if (disabled) {
    return (
      <div className="flex-1 border rounded px-2 py-1 bg-gray-100 text-gray-400 text-xs text-center min-w-[90px]">
        {label}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex-1 border rounded px-2 py-1 text-xs text-center cursor-pointer hover:bg-gray-50 min-w-[90px] ${!display ? 'text-gray-400' : 'text-gray-800'}`}
      >
        {display || label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-xl p-5 shadow-2xl flex flex-col gap-4 min-w-[240px]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold text-gray-700 text-center">{label}</p>
            <div className="flex items-center gap-2 justify-center">
              <select value={localPeriod} onChange={(e) => setLocalPeriod(e.target.value)} className={selectClass}>
                <option value="AM">{getText('오전', 'AM')}</option>
                <option value="PM">{getText('오후', 'PM')}</option>
              </select>
              <select value={localHour} onChange={(e) => setLocalHour(Number(e.target.value))} className={selectClass}>
                {HOUR_OPTIONS.map((h) => (
                  <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
                ))}
              </select>
              <span className="text-gray-500 text-lg font-bold">:</span>
              <select value={localMinute} onChange={(e) => setLocalMinute(Number(e.target.value))} className={selectClass}>
                {MINUTE_OPTIONS.map((m) => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleConfirm}
              className="bg-blue-500 text-white text-sm rounded-lg py-2 px-6 font-bold w-full"
            >
              {getText('확인', 'OK')}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * STAFF ⑤ 연차 신청/내역 컴포넌트
 * 직원 모드에서 연차 신청 및 내역을 관리하는 컴포넌트
 */
const StaffAnnualLeave = ({
  currentUser,
  leaveRequests,
  setLeaveRequests,
  isHolidayDate,
  send자동알림,
  getUsedAnnualLeave,
  getLeaveDays,
  formatDateByLang,
  getDatePlaceholder,
  getLeaveTypeText,
  getText,
  selectedLanguage,
  fontSize = 'normal',
  onEditingChange,
}) => {
  // 연차 폼 로컬 state (App.js 전체 리렌더 방지)
  const [leaveForm, setLeaveForm] = useState({
    startDate: '',
    endDate: '',
    type: '연차',
    reason: '',
    contact: '',
    startTime: '',
    endTime: '',
  });
  const [leaveFormError, setLeaveFormError] = useState('');
  const [leaveFormPreview, setLeaveFormPreview] = useState(null);

  // 연차 폼 미리보기 useEffect
  useEffect(() => {
    if (
      currentUser &&
      currentUser.id &&
      leaveForm.startDate &&
      leaveForm.endDate &&
      leaveForm.type &&
      leaveForm.reason &&
      leaveForm.contact
    ) {
      const now = new Date();
      setLeaveFormPreview({
        ...leaveForm,
        status: '작성중',
        employeeId: currentUser.id,
        requestDate: now.toISOString().slice(0, 10),
        requestDateTime: now.toISOString(),
      });
    } else {
      setLeaveFormPreview(null);
    }
  }, [leaveForm, currentUser]);

  // 연차 관리 훅
  const { handleCancelLeave, handleLeaveFormChange, handleLeaveRequest } =
    useStaffLeave({
      leaveForm,
      setLeaveForm,
      setLeaveFormError,
      setLeaveFormPreview,
      leaveRequests,
      setLeaveRequests,
      currentUser,
      remainAnnualLeave: currentUser?.remainingAnnualLeave || 0,
      isHolidayDate,
      send자동알림,
      getText,
    });

  const [showLeaveHistoryPopup, setShowLeaveHistoryPopup] = useState(false);
  const [showEditLeavePopup, setShowEditLeavePopup] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);
  const [leavePage, setLeavePage] = useState(1);
  const leaveScrollRef = useRef(null);

  // 팝업이 열리거나 페이지가 변경될 때 스크롤을 맨 위로
  useEffect(() => {
    if (showLeaveHistoryPopup && leaveScrollRef.current) {
      leaveScrollRef.current.scrollTop = 0;
    }
  }, [showLeaveHistoryPopup, leavePage]);

  // 편집 중 상태 → App.js에 전달 (자동 새로고침 연기용)
  useEffect(() => {
    const isEditing =
      !!(leaveForm.startDate || leaveForm.endDate || leaveForm.reason || leaveForm.contact) ||
      leaveFormPreview !== null ||
      showEditLeavePopup;
    onEditingChange?.(isEditing);
  }, [leaveForm, leaveFormPreview, showEditLeavePopup, onEditingChange]);

  // 더보기 팝업 열릴 때 1회 조회 + 10분 polling
  useEffect(() => {
    if (!showLeaveHistoryPopup || !currentUser?.id) return;

    const load = async () => {
      try {
        const dbLeaves = await LeaveAPI.list();
        if (Array.isArray(dbLeaves) && dbLeaves.length > 0) {
          setLeaveRequests(
            dbLeaves.map((l) => ({
              id: l._id,
              employeeId: l.employeeId,
              employeeName: l.employeeName,
              name: l.employeeName || l.name,
              department: l.department,
              leaveType: l.leaveType,
              type: l.leaveType || l.type,
              startDate: formatDateByLang(l.startDate),
              endDate: formatDateByLang(l.endDate),
              days: l.requestedDays,
              requestedDays: l.requestedDays,
              reason: l.reason,
              contact: l.contact,
              status: l.status,
              requestDate: formatDateByLang(l.requestDate || l.createdAt),
              approvedAt: l.approvedAt,
              approver: l.approver,
              approverName: l.approverName,
              approvedDays: l.approvedDays,
              rejectedAt: l.rejectedAt,
              rejectedBy: l.rejectedBy,
              rejectedByName: l.rejectedByName,
              rejectionReason: l.rejectionReason,
              startTime: l.startTime || null,
              endTime: l.endTime || null,
            }))
          );
        }
      } catch (err) {
        console.error('❌ [연차 더보기] 연차 데이터 재조회 실패:', err);
      }
    };

    load();
    const intervalId = setInterval(load, 10 * 60 * 1000); // 10분 polling
    return () => clearInterval(intervalId);
  }, [showLeaveHistoryPopup, currentUser, setLeaveRequests, formatDateByLang]);

  // fontSize에 따른 공통 클래스 반환 (버튼, input, select 모두 동일)
  const getCommonClass = () => {
    switch (fontSize) {
      case 'small':
        return 'text-2xs px-1.5 py-0.5';
      case 'large':
        return 'text-sm px-3 py-1.5';
      default:
        return 'text-xs px-2 py-1';
    }
  };

  // fontSize에 따른 placeholder 클래스 반환
  const getPlaceholderClass = () => {
    switch (fontSize) {
      case 'small':
        return 'placeholder:text-2xs';
      case 'large':
        return 'placeholder:text-sm';
      default:
        return 'placeholder:text-xs';
    }
  };

  const commonClass = getCommonClass();
  const placeholderClass = getPlaceholderClass();

  // 글자 수에 따라 줄바꿈 추가하는 함수 (fontSize에 관계없이 25글자)
  const addLineBreaks = (text) => {
    if (!text) return '';
    const maxLength = 25;
    let result = '';
    for (let i = 0; i < text.length; i += maxLength) {
      result += text.slice(i, i + maxLength);
      if (i + maxLength < text.length) {
        result += '\n';
      }
    }
    return result;
  };

  // 날짜를 YYYY-MM-DD 형식으로 변환하는 헬퍼 함수
  const formatDateForInput = (dateValue) => {
    if (!dateValue) return '';
    try {
      const date = new Date(dateValue);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      return dateValue.split('T')[0]; // ISO 형식이면 날짜 부분만 추출
    }
  };

  // 관리자 모드의 연차 관리 데이터와 동기화된 정보 사용
  // ✅ 총연차는 기본연차만 표시 (이월연차 제외)
  const totalAnnualLeave = currentUser?.baseAnnual || currentUser?.totalAnnualLeave || 0;
  const usedAnnualLeave = currentUser?.usedAnnualLeave || 0;
  const remainAnnualLeave = currentUser?.remainingAnnualLeave || 0;

  // 연차 기간 (관리자 모드 연차 관리에서 동기화된 데이터 사용)
  const leaveStartDate = currentUser?.leaveYearStart
    ? currentUser.leaveYearStart.substring(2).replace(/-/g, '/')
    : '';
  const leaveEndDate = currentUser?.leaveYearEnd
    ? currentUser.leaveYearEnd.substring(2).replace(/-/g, '/')
    : '';

  // [3_일반직원 모드] 3.5_연차 신청/내역 - 수정된 연차 저장 핸들러
  const handleSaveEditedLeave = async () => {
    try {
      // 날짜 검증
      if (!editingLeave.startDate || !editingLeave.endDate) {
        alert(
          getText(
            '시작일과 종료일을 입력해주세요.',
            'Please enter start and end dates.'
          )
        );
        return;
      }

      // 날짜 문자열을 YYYY-MM-DD 형식으로 정규화
      const normalizeDate = (dateStr) => {
        if (!dateStr) return '';
        // 이미 YYYY-MM-DD 형식이면 그대로 반환
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          return dateStr;
        }
        // ISO 형식이면 날짜 부분만 추출
        return dateStr.split('T')[0];
      };

      const startDateStr = normalizeDate(editingLeave.startDate);
      const endDateStr = normalizeDate(editingLeave.endDate);

      // 날짜 비교 검증
      if (endDateStr < startDateStr) {
        alert(
          getText(
            '종료일은 시작일 이후여야 합니다.',
            'End date must be after start date.'
          )
        );
        return;
      }

      // DB에 수정 내용 저장
      const { default: LeaveAPI } = await import('../../api/leave');

      // leaveType과 type 둘 다 지원
      const leaveType = editingLeave.type || editingLeave.leaveType;

      // 연차 일수 계산 (로컬 시간으로 파싱)
      let requestedDays = 0;
      if (leaveType && leaveType.includes('반차')) {
        requestedDays = 0.5;
      } else if (
        leaveType === '경조' ||
        leaveType === '공가' ||
        leaveType === '휴직'
      ) {
        // 경조, 공가, 휴직: 연차 미차감
        requestedDays = 0;
      } else if (leaveType === '연차') {
        // 연차: 실제 사용일수
        const parseLocalDate = (dateStr) => {
          const [year, month, day] = dateStr.split('-').map(Number);
          return new Date(year, month - 1, day);
        };
        const start = parseLocalDate(startDateStr);
        const end = parseLocalDate(endDateStr);
        requestedDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
      } else {
        // 외출, 조퇴, 결근, 기타: 1일
        requestedDays = 1;
      }

      // MongoDB _id 사용 (문자열로 변환)
      const leaveId = editingLeave._id || editingLeave.id;

      if (!leaveId) {
        throw new Error('연차 ID가 없습니다.');
      }

      const updateData = {
        startDate: startDateStr, // 정규화된 날짜 문자열 사용
        endDate: endDateStr, // 정규화된 날짜 문자열 사용
        type: leaveType,
        reason: editingLeave.reason,
        contact: editingLeave.contact,
        requestedDays: requestedDays,
      };

      const response = await LeaveAPI.update(leaveId, updateData);

      // 로컬 state 업데이트
      setLeaveRequests((prev) =>
        prev.map((lr) => {
          const currentLeaveId = lr._id || lr.id;
          if (currentLeaveId === leaveId) {
            return {
              ...lr,
              startDate: editingLeave.startDate,
              endDate: editingLeave.endDate,
              type: leaveType,
              leaveType: leaveType,
              reason: editingLeave.reason,
              contact: editingLeave.contact,
              requestedDays: requestedDays,
              days: requestedDays,
            };
          }
          return lr;
        })
      );

      alert(
        getText(
          '연차 수정이 완료되었습니다.',
          'Leave has been updated successfully.'
        )
      );
      setShowEditLeavePopup(false);
      setEditingLeave(null);
    } catch (error) {
      console.error('❌ 연차 수정 실패:', error);
      console.error('❌ 에러 상세:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        '연차 수정 중 오류가 발생했습니다.';

      alert(getText(errorMessage, errorMessage));
    }
  };

  return (
    <>
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-indigo-500 mr-2" />
            <h3 className="text-sm font-semibold text-gray-800">
              {getText('연차 신청/내역', 'Leave Application/History')}
            </h3>
          </div>
          <button
            onClick={() => {
              setLeavePage(1);
              setShowLeaveHistoryPopup(true);
            }}
            className="text-blue-500 text-2xs hover:text-blue-600"
          >
            {getText('더보기', 'More')} &gt;
          </button>
        </div>
        <div className="space-y-3 text-xs">
          <div className="text-center text-gray-700" style={{ lineHeight: '1.15' }}>
            <div>
              {getText(
                `연차기간: ${leaveStartDate}~${leaveEndDate}`,
                `Leave Period: ${leaveStartDate}~${leaveEndDate}`
              )}
            </div>
            <div className="mt-2">
              {getText(
                `총연차: ${totalAnnualLeave}, 사용: ${usedAnnualLeave}, 잔여: ${remainAnnualLeave}`,
                `Total: ${totalAnnualLeave}, Used: ${usedAnnualLeave}, Remaining: ${remainAnnualLeave}`
              )}
            </div>
          </div>
          <div className="p-3 rounded-lg space-y-2">
            <div className="flex flex-wrap gap-2">
              {/* Start Date */}
              <div className="relative flex-1 min-w-[120px]">
                <input
                  type="date"
                  name="startDate"
                  value={leaveForm.startDate}
                  onChange={handleLeaveFormChange}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  className={`${commonClass} border rounded w-full`}
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    background: 'transparent',
                    color: !leaveForm.startDate ? 'transparent' : undefined,
                    caretColor: 'black',
                  }}
                  autoComplete="off"
                />
                {!leaveForm.startDate && (
                  <span
                    className="absolute left-2 top-1/2 text-gray-400 text-xs pointer-events-none"
                    style={{ transform: 'translateY(-50%)', zIndex: 1 }}
                  >
                    {getDatePlaceholder(selectedLanguage)}
                  </span>
                )}
              </div>
              <span className="flex items-center">~</span>
              {/* End Date */}
              <div className="relative flex-1 min-w-[120px]">
                <input
                  type="date"
                  name="endDate"
                  value={leaveForm.endDate}
                  onChange={handleLeaveFormChange}
                  className={`${commonClass} border rounded w-full`}
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    background: 'transparent',
                    color: !leaveForm.endDate ? 'transparent' : undefined,
                    caretColor: 'black',
                  }}
                  autoComplete="off"
                />
                {!leaveForm.endDate && (
                  <span
                    className="absolute left-2 top-1/2 text-gray-400 text-xs pointer-events-none"
                    style={{ transform: 'translateY(-50%)', zIndex: 1 }}
                  >
                    {getDatePlaceholder(selectedLanguage)}
                  </span>
                )}
              </div>
              <select
                name="type"
                value={leaveForm.type}
                onChange={handleLeaveFormChange}
                className={`${commonClass} border rounded flex-1 min-w-[100px]`}
              >
                {LEAVE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {getLeaveTypeText(type)}
                  </option>
                ))}
              </select>
            </div>
            {(leaveForm.type === '외출' || leaveForm.type === '조퇴') && (
              <div className="flex flex-wrap gap-2 items-center">
                <TimePickerSelect
                  name="startTime"
                  value={leaveForm.startTime || ''}
                  onChange={handleLeaveFormChange}
                  disabled={leaveForm.type === '조퇴'}
                  getText={getText}
                  label={getText('시작 시간', 'Start Time')}
                />
                <span className="flex items-center">~</span>
                <TimePickerSelect
                  name="endTime"
                  value={leaveForm.endTime || ''}
                  onChange={handleLeaveFormChange}
                  disabled={false}
                  getText={getText}
                  label={getText('종료 시간', 'End Time')}
                />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <textarea
                name="reason"
                placeholder={leaveForm.type === '기타' ? '외근/출장-업체명' : getText('사유(최대 25자 제한)', 'Reason (≤25 charS)')}
                value={leaveForm.reason}
                onChange={handleLeaveFormChange}
                onInput={(e) => {
                  if (e.target.value === '') {
                    e.target.style.height = '';
                  } else {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }
                }}
                maxLength={25}
                rows={1}
                className={`${commonClass} ${placeholderClass} placeholder:font-normal border rounded flex-1 min-w-[100px] resize-none break-words`}
                style={{
                  wordWrap: 'break-word',
                  whiteSpace: 'pre-wrap',
                  overflow: 'hidden',
                  minHeight: '30px',
                }}
              />
              <textarea
                name="contact"
                placeholder={leaveForm.type === '기타' ? '등록유형 (출근/퇴근)' : getText('비상연락망', 'Emergency Contact')}
                value={leaveForm.contact}
                onChange={handleLeaveFormChange}
                onInput={(e) => {
                  if (e.target.value === '') {
                    e.target.style.height = '';
                  } else {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }
                }}
                rows={1}
                className={`${commonClass} ${placeholderClass} placeholder:font-normal border rounded flex-1 min-w-[100px] resize-none break-words`}
                style={{
                  wordWrap: 'break-word',
                  whiteSpace: 'pre-wrap',
                  overflow: 'hidden',
                  minHeight: '30px',
                }}
              />
              <button
                className={`${commonClass} bg-blue-500 hover:bg-blue-600 text-white rounded whitespace-nowrap font-normal`}
                onClick={handleLeaveRequest}
              >
                {getText('신청', 'Submit')}
              </button>
            </div>
            {leaveFormError && (
              <div className="text-red-500 text-xs mt-1">{leaveFormError}</div>
            )}
          </div>
        </div>
      </div>

      {/* 연차 신청/내역 더보기 팝업 */}
      {showLeaveHistoryPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[90vw] max-h-[85vh] overflow-hidden">
            <div className="p-4 sm:p-6 pb-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-800">
                  {getText('내 연차 신청 전체 내역', 'All Leave Applications')}
                </h3>
                <button
                  onClick={() => setShowLeaveHistoryPopup(false)}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            <div ref={leaveScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="overflow-x-auto">
                <table className="min-w-[800px] w-full text-xs border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-center py-1 px-2 whitespace-nowrap">
                        {getText('신청일', 'Request Date')}
                      </th>
                      <th className="text-center py-1 px-2 whitespace-nowrap">
                        {getText('시작일', 'Start Date')}
                      </th>
                      <th className="text-center py-1 px-2 whitespace-nowrap">
                        {getText('종료일', 'End Date')}
                      </th>
                      <th className="text-center py-1 px-2 whitespace-nowrap">
                        {getText('사용일수', 'Days Used')}
                      </th>
                      <th className="text-center py-1 px-2 whitespace-nowrap">
                        {getText('유형', 'Type')}
                      </th>
                      <th className="text-center py-1 px-2 whitespace-nowrap">
                        {getText('시작시간', 'Start Time')}
                      </th>
                      <th className="text-center py-1 px-2 whitespace-nowrap">
                        {getText('종료시간', 'End Time')}
                      </th>
                      <th className="text-center py-1 px-2 whitespace-nowrap">
                        {getText('사유', 'Reason')}
                      </th>
                      <th className="text-center py-1 px-2 whitespace-nowrap">
                        {getText('연락처', 'Contact')}
                      </th>
                      <th className="text-center py-1 px-2 whitespace-nowrap">
                        {getText('비고', 'Remark')}
                      </th>
                      <th className="text-center py-1 px-2 whitespace-nowrap">
                        {getText('상태', 'Status')}
                      </th>
                      <th className="text-center py-1 px-2 whitespace-nowrap">
                        {getText('수정/삭제', 'Edit/Delete')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {leaveFormPreview && (
                      <tr className="bg-blue-50">
                        <td className="text-center py-1 px-2 whitespace-nowrap">
                          {formatDateByLang(leaveFormPreview.requestDate)}
                        </td>
                        <td className="text-center py-1 px-2 whitespace-nowrap">
                          {formatDateByLang(leaveFormPreview.startDate)}
                        </td>
                        <td className="text-center py-1 px-2 whitespace-nowrap">
                          {formatDateByLang(leaveFormPreview.endDate)}
                        </td>
                        <td className="text-center py-1 px-2 whitespace-nowrap">
                          {getLeaveDays(leaveFormPreview)}
                        </td>
                        <td className="text-center py-1 px-2 whitespace-nowrap">
                          {getLeaveTypeText(leaveFormPreview.type)}
                        </td>
                        <td className="text-center py-1 px-2 whitespace-nowrap text-xs">
                          {leaveFormPreview.type === '외출' ? (fmt12h(leaveFormPreview.startTime) || <span className="text-gray-300">-</span>) : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="text-center py-1 px-2 whitespace-nowrap text-xs">
                          {(leaveFormPreview.type === '외출' || leaveFormPreview.type === '조퇴') ? (fmt12h(leaveFormPreview.endTime) || <span className="text-gray-300">-</span>) : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="text-center py-1 px-2 whitespace-nowrap" style={{ lineHeight: '1.15' }}>
                          {leaveFormPreview.reason}
                        </td>
                        <td className="text-center py-1 px-2 whitespace-nowrap">
                          {leaveFormPreview.contact}
                        </td>
                        <td className="text-center py-1 px-2 whitespace-nowrap" style={{ lineHeight: '1.15' }}>-</td>
                        <td className="text-center py-1 px-2 text-purple-600 whitespace-nowrap">
                          {leaveFormPreview.status}
                        </td>
                        <td className="text-center py-1 px-2"></td>
                      </tr>
                    )}
                    {leaveRequests
                      .filter((lr) => lr.employeeId === currentUser.id)
                      .slice(
                        (leavePage - 1) * LEAVE_PAGE_SIZE,
                        leavePage * LEAVE_PAGE_SIZE
                      )
                      .map((lr) => (
                        <tr key={lr.id}>
                          <td className="text-center py-1 px-2 whitespace-nowrap">
                            {formatDateByLang(lr.requestDate)}
                          </td>
                          <td className="text-center py-1 px-2 whitespace-nowrap">
                            {formatDateByLang(lr.startDate)}
                          </td>
                          <td className="text-center py-1 px-2 whitespace-nowrap">
                            {formatDateByLang(lr.endDate)}
                          </td>
                          <td className="text-center py-1 px-2 whitespace-nowrap">
                            {getLeaveDays(lr)}
                          </td>
                          <td className="text-center py-1 px-2 whitespace-nowrap">
                            {getLeaveTypeText(lr.type)}
                          </td>
                          <td className="text-center py-1 px-2 whitespace-nowrap text-xs">
                            {lr.type === '외출' ? (fmt12h(lr.startTime) || <span className="text-gray-300">-</span>) : <span className="text-gray-300">-</span>}
                          </td>
                          <td className="text-center py-1 px-2 whitespace-nowrap text-xs">
                            {(lr.type === '외출' || lr.type === '조퇴') ? (fmt12h(lr.endTime) || <span className="text-gray-300">-</span>) : <span className="text-gray-300">-</span>}
                          </td>
                          <td className="text-center py-1 px-2 whitespace-nowrap" style={{ lineHeight: '1.15' }}>
                            {lr.reason}
                          </td>
                          <td className="text-center py-1 px-2 whitespace-nowrap">
                            {lr.contact}
                          </td>
                          <td className="text-center py-1 px-2 whitespace-nowrap" style={{ lineHeight: '1.15' }}>
                            {lr.remark || '-'}
                          </td>
                          <td className="text-center py-1 px-2 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs ${
                                lr.status === '승인'
                                  ? 'bg-blue-100 text-blue-800'
                                  : lr.status === '확인'
                                  ? 'bg-green-100 text-green-800'
                                  : lr.status === '대기'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : lr.status === '취소'
                                  ? 'bg-gray-200 text-gray-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {lr.status}
                            </span>
                          </td>
                          <td className="text-center py-1 px-2">
                            {lr.status === '대기' ? (
                              <>
                                <button
                                  className={`${commonClass} bg-blue-100 text-blue-700 rounded mr-1 hover:bg-blue-200 font-normal`}
                                  onClick={() => {
                                    setEditingLeave(lr);
                                    setShowEditLeavePopup(true);
                                  }}
                                >
                                  수정
                                </button>
                                <button
                                  className={`${commonClass} bg-red-100 text-red-700 rounded hover:bg-red-200 font-normal`}
                                  onClick={() => handleCancelLeave(lr.id)}
                                >
                                  취소
                                </button>
                              </>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    {leaveRequests.filter((lr) => lr.employeeId === currentUser.id).length === 0 && !leaveFormPreview && (
                      <tr>
                        <td
                          colSpan={12}
                          className="text-center text-gray-400 py-8"
                        >
                          {getText(
                            '등록된 연차 내역이 없습니다.',
                            'No registered leave records.'
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* 페이지네이션 */}
              <div className="flex justify-center items-center py-3 space-x-2">
                <button
                  onClick={() => setLeavePage(Math.max(1, leavePage - 1))}
                  disabled={leavePage === 1}
                  className={`${commonClass} border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 font-normal`}
                >
                  {selectedLanguage === 'en' ? 'Prev' : '이전'}
                </button>
                <span className="text-xs text-gray-600">
                  {leavePage} /{' '}
                  {Math.max(
                    1,
                    Math.ceil(
                      leaveRequests.filter(
                        (lr) => lr.employeeId === currentUser.id
                      ).length / LEAVE_PAGE_SIZE
                    )
                  )}
                </span>
                <button
                  onClick={() =>
                    setLeavePage(
                      Math.min(
                        Math.ceil(
                          leaveRequests.filter(
                            (lr) => lr.employeeId === currentUser.id
                          ).length / LEAVE_PAGE_SIZE
                        ),
                        leavePage + 1
                      )
                    )
                  }
                  disabled={
                    leavePage >=
                    Math.ceil(
                      leaveRequests.filter(
                        (lr) => lr.employeeId === currentUser.id
                      ).length / LEAVE_PAGE_SIZE
                    )
                  }
                  className={`${commonClass} border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 font-normal`}
                >
                  {selectedLanguage === 'en' ? 'Next' : '다음'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 연차 신청 수정 팝업 */}
      {showEditLeavePopup && editingLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 flex flex-col">
            <div className="p-6 pb-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-800">
                연차 신청 변경
              </h3>
              <button
                onClick={() => setShowEditLeavePopup(false)}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                ✕
              </button>
            </div>
            <div className="text-xs p-6 space-y-4">
              <input
                type="date"
                value={formatDateForInput(editingLeave.startDate)}
                onChange={(e) =>
                  setEditingLeave((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="date"
                value={formatDateForInput(editingLeave.endDate)}
                onChange={(e) =>
                  setEditingLeave((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <select
                value={editingLeave.type || editingLeave.leaveType}
                onChange={(e) =>
                  setEditingLeave((prev) => ({
                    ...prev,
                    type: e.target.value,
                    leaveType: e.target.value, // 하위 호환성
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option>연차</option>
                <option>반차(오전)</option>
                <option>반차(오후)</option>
                <option>외출</option>
                <option>조퇴</option>
                <option>경조</option>
                <option>공가</option>
                <option>휴직</option>
                <option>결근</option>
                <option>기타</option>
              </select>
              <textarea
                value={editingLeave.reason}
                onChange={(e) =>
                  setEditingLeave((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                onInput={(e) => {
                  if (e.target.value === '') {
                    e.target.style.height = '';
                  } else {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }
                }}
                rows={1}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none"
                style={{
                  wordWrap: 'break-word',
                  whiteSpace: 'pre-wrap',
                  overflow: 'hidden',
                }}
                placeholder="사유"
              />
              <textarea
                value={editingLeave.contact}
                onChange={(e) =>
                  setEditingLeave((prev) => ({
                    ...prev,
                    contact: e.target.value,
                  }))
                }
                onInput={(e) => {
                  if (e.target.value === '') {
                    e.target.style.height = '';
                  } else {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }
                }}
                rows={1}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none"
                style={{
                  wordWrap: 'break-word',
                  whiteSpace: 'pre-wrap',
                  overflow: 'hidden',
                }}
                placeholder="비상연락망"
              />
              <button
                onClick={handleSaveEditedLeave}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-normal text-xs"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StaffAnnualLeave;
