import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import {
  exportEmployeeLeaveStatusToXLSX,
  exportLeaveHistoryToXLSX,
} from '../common/common_admin_leave';
import { useDebounce } from '../common/common_common';

const AdminLeaveManagement = ({
  leaveManagementTab,
  setLeaveManagementTab,
  employees,
  setEmployees,
  leaveSearch,
  setLeaveSearch,
  COMPANY_STANDARDS,
  calculateEmployeeAnnualLeave,
  annualLeaveSortField,
  annualLeaveSortOrder,
  handleAnnualLeaveSort,
  leaveRequests,
  setLeaveRequests,
  getSortedLeaveRequests,
  getFilteredLeaveRequests,
  formatDateByLang,
  devLog,
  handleLeaveSort,
  getLeaveDays,
  STATUS_COLORS,
  handleApproveLeave,
  handleRejectLeave,
  showLeaveApprovalPopup,
  setShowLeaveApprovalPopup,
  leaveApprovalData,
  setLeaveApprovalData,
  handleLeaveApprovalConfirm,
  currentUser,
  handleConfirmLeave,
}) => {
  const [showInactive, setShowInactive] = useState(false);
  const [editingAnnualLeave, setEditingAnnualLeave] = useState(null);
  const [editAnnualData, setEditAnnualData] = useState({});
  const [leaveHistoryPage, setLeaveHistoryPage] = useState(1);
  const [editingLeave, setEditingLeave] = useState(null);
  const [editingLeaveRemark, setEditingLeaveRemark] = useState('');
  const [editingLeaveHistoryRow, setEditingLeaveHistoryRow] = useState(null);
  const [editingLeaveHistoryData, setEditingLeaveHistoryData] = useState({});

  // keyword 검색 debounce
  const [keywordInput, setKeywordInput] = useState(leaveSearch?.keyword || '');
  const debouncedKeyword = useDebounce(keywordInput, 300);
  useEffect(() => {
    setLeaveSearch((prev) => ({ ...prev, keyword: debouncedKeyword }));
  }, [debouncedKeyword]); // eslint-disable-line react-hooks/exhaustive-deps

  // 검색 필터 변경시 페이지 1로 리셋
  useEffect(() => {
    setLeaveHistoryPage(1);
  }, [
    leaveSearch.year,
    leaveSearch.month,
    leaveSearch.day,
    leaveSearch.type,
    leaveSearch.status,
    leaveSearch.keyword,
    setLeaveHistoryPage,
  ]);

  // 연차 내역 수정 핸들러
  const handleEditLeaveHistory = (leaveRequest) => {
    setEditingLeaveHistoryRow(leaveRequest.id);
    setEditingLeaveHistoryData({
      employeeId: leaveRequest.employeeId,
      name: leaveRequest.name,
      startDate: leaveRequest.startDate,
      endDate: leaveRequest.endDate,
      type: leaveRequest.type,
      reason: leaveRequest.reason || '개인사정',
      contact: leaveRequest.contact || '',
      remark: leaveRequest.remark || '',
      status: leaveRequest.status,
    });
  };

  // 연차 내역 수정 저장 핸들러
  const handleSaveLeaveHistory = async (leaveId) => {
    try {
      const { default: LeaveAPI } = await import('../../api/leave');

      // DB 업데이트
      await LeaveAPI.update(leaveId, editingLeaveHistoryData);

      // 로컬 state 업데이트
      setLeaveRequests((prev) =>
        prev.map((lr) =>
          lr.id === leaveId ? { ...lr, ...editingLeaveHistoryData } : lr
        )
      );

      setEditingLeaveHistoryRow(null);
      setEditingLeaveHistoryData({});
      alert('연차 내역이 수정되었습니다.');
    } catch (error) {
      console.error('❌ 연차 내역 수정 실패:', error);
      alert('연차 내역 수정 중 오류가 발생했습니다.');
    }
  };

  // 연차 내역 수정 취소 핸들러
  const handleCancelLeaveHistory = () => {
    setEditingLeaveHistoryRow(null);
    setEditingLeaveHistoryData({});
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <h3 className="text-lg font-semibold text-gray-800">
            연차 관리
          </h3>

          {/* 탭 메뉴 */}
          <div className="flex">
            <button
              onClick={() => setLeaveManagementTab('employee-leave')}
              className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors ${
                leaveManagementTab === 'employee-leave'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-gray-100 text-gray-500 hover:text-gray-700'
              }`}
            >
              직원 연차
            </button>
            <button
              onClick={() => setLeaveManagementTab('leave-history')}
              className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors ${
                leaveManagementTab === 'leave-history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-gray-100 text-gray-500 hover:text-gray-700'
              }`}
            >
              연차 내역
            </button>
          </div>
        </div>

        {/* 직원 연차 탭 */}
        {leaveManagementTab === 'employee-leave' && (
          <div>
            {/* 직원연차 헤더 */}
            <div className="mb-4 flex flex-col gap-3">
              {/* 1행: 제목 + 휴직/퇴사자 표시 + 다운로드 버튼 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <h4 className="text-md font-semibold text-gray-700">
                    직원별 연차 현황
                  </h4>
                  <label className="flex items-center gap-1 text-sm text-gray-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showInactive}
                      onChange={(e) => setShowInactive(e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    휴직/퇴사자 표시
                  </label>
                </div>
                <button
                  onClick={() =>
                    exportEmployeeLeaveStatusToXLSX(
                      employees,
                      calculateEmployeeAnnualLeave,
                      leaveRequests
                    )
                  }
                  className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center text-sm"
                >
                  <Download size={14} className="mr-1" />
                  다운로드
                </button>
              </div>

              {/* 2행: 검색 필터 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <select
                  value={leaveSearch.position || '전체'}
                  onChange={(e) =>
                    setLeaveSearch((prev) => ({
                      ...prev,
                      position: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="전체">전체 직급</option>
                  {COMPANY_STANDARDS.POSITIONS.map((position) => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))}
                </select>
                <select
                  value={leaveSearch.dept || '전체'}
                  onChange={(e) =>
                    setLeaveSearch((prev) => ({
                      ...prev,
                      dept: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="전체">전체 부서</option>
                  {COMPANY_STANDARDS.DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                <select
                  value={leaveSearch.contractType || '전체'}
                  onChange={(e) =>
                    setLeaveSearch((prev) => ({
                      ...prev,
                      contractType: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="전체">전체 계약형태</option>
                  <option value="정규">정규</option>
                  <option value="촉탁">촉탁</option>
                  <option value="계약">계약</option>
                  <option value="기타">기타</option>
                </select>
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="사번 또는 이름 검색"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 직원 연차 요약 카드 */}
            {(() => {
              const filtered = employees.filter((emp) => {
                if (!showInactive && (emp.status === '퇴사' || emp.status === '휴직')) return false;
                if (leaveSearch.position && leaveSearch.position !== '전체') {
                  if ((emp.position || '사원') !== leaveSearch.position) return false;
                }
                if (leaveSearch.dept && leaveSearch.dept !== '전체') {
                  if (emp.department !== leaveSearch.dept) return false;
                }
                if (leaveSearch.contractType && leaveSearch.contractType !== '전체') {
                  const ct = emp.contractType || '기타';
                  if (leaveSearch.contractType === '기타') {
                    if (['정규', '촉탁', '계약'].includes(ct)) return false;
                  } else {
                    if (ct !== leaveSearch.contractType) return false;
                  }
                }
                if (leaveSearch.keyword) {
                  const kw = leaveSearch.keyword.toLowerCase();
                  const empId = (emp.employeeNumber || emp.id || '').toLowerCase();
                  const empName = (emp.name || '').toLowerCase();
                  if (!empId.includes(kw) && !empName.includes(kw)) return false;
                }
                return true;
              });

              const count = filtered.length;
              const annualDataList = filtered.map((emp) => calculateEmployeeAnnualLeave(emp, leaveRequests));

              const totalRegular  = filtered.filter((e) => e.contractType === '정규').length;
              const totalChoktak  = filtered.filter((e) => e.contractType === '촉탁').length;
              const totalContract = filtered.filter((e) => e.contractType === '계약').length;
              const totalOther    = filtered.filter((e) => !['정규', '촉탁', '계약'].includes(e.contractType || '')).length;

              const totalAnnual      = annualDataList.reduce((s, d) => s + (d.totalAnnual || 0), 0);
              const totalCarryOver   = annualDataList.reduce((s, d) => s + (d.carryOverLeave || 0), 0);
              const totalUsed        = annualDataList.reduce((s, d) => s + (d.usedAnnual || 0), 0);
              const totalRemain      = annualDataList.reduce((s, d) => s + (d.remainAnnual || 0), 0);

              const avgYears = count > 0
                ? annualDataList.reduce((s, d) => s + (d.years || 0) + (d.months || 0) / 12, 0) / count
                : 0;

              const Card = ({ label, value, color }) => (
                <div className="text-center">
                  <div className="text-gray-600 font-medium truncate">{label}</div>
                  <div className={`font-bold ${color}`}>{value}</div>
                </div>
              );

              return (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  {/* 모바일 Row 1: 5열 */}
                  <div className="grid grid-cols-5 gap-2 text-xs lg:hidden">
                    <Card label="필터 대상"    value={`${count}명`}                    color="text-blue-600" />
                    <Card label="평균 근속"    value={`${avgYears.toFixed(1)}년`}      color="text-purple-600" />
                    <Card label="총 정규직원"    value={`${totalRegular}명`}              color="text-green-700" />
                    <Card label="총 촉탁직원"    value={`${totalChoktak}명`}              color="text-orange-600" />
                    <Card label="총 계약직원"    value={`${totalContract}명`}             color="text-yellow-600" />
                  </div>
                  {/* 모바일 Row 2: 5열 */}
                  <div className="grid grid-cols-5 gap-2 text-xs mt-2 lg:hidden">
                    <Card label="총 기타직원"    value={`${totalOther}명`}                color="text-gray-500" />
                    <Card label="총 연차"      value={`${totalAnnual.toFixed(1)}일`}    color="text-blue-700" />
                    <Card label="총 이월연차"  value={`${totalCarryOver.toFixed(1)}일`} color="text-teal-600" />
                    <Card label="총 사용연차"  value={`${totalUsed.toFixed(1)}일`}      color="text-red-600" />
                    <Card label="총 잔여연차"  value={`${totalRemain.toFixed(1)}일`}    color="text-green-600" />
                  </div>
                  {/* 데스크탑: 10열 1행 */}
                  <div className="hidden lg:grid gap-2 text-sm" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
                    <Card label="필터 대상"    value={`${count}명`}                    color="text-blue-600" />
                    <Card label="평균 근속년수" value={`${avgYears.toFixed(1)}년`}     color="text-purple-600" />
                    <Card label="총 정규직원"    value={`${totalRegular}명`}              color="text-green-700" />
                    <Card label="총 촉탁직원"    value={`${totalChoktak}명`}              color="text-orange-600" />
                    <Card label="총 계약직원"    value={`${totalContract}명`}             color="text-yellow-600" />
                    <Card label="총 기타직원"    value={`${totalOther}명`}                color="text-gray-500" />
                    <Card label="총 연차"      value={`${totalAnnual.toFixed(1)}일`}    color="text-blue-700" />
                    <Card label="총 이월연차"  value={`${totalCarryOver.toFixed(1)}일`} color="text-teal-600" />
                    <Card label="총 사용연차"  value={`${totalUsed.toFixed(1)}일`}      color="text-red-600" />
                    <Card label="총 잔여연차"  value={`${totalRemain.toFixed(1)}일`}    color="text-green-600" />
                  </div>
                </div>
              );
            })()}

            {/* 직원 연차 현황 테이블 */}
            <div className="overflow-x-auto max-h-[85vh] lg:max-h-[63vh] overflow-y-auto">
              <table className="text-xs" style={{ width: 'max-content', minWidth: '100%' }}>
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="text-center py-1 px-2 whitespace-nowrap">
                      사번
                      <button
                        onClick={() => handleAnnualLeaveSort('employeeNumber')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2 whitespace-nowrap">
                      이름
                      <button
                        onClick={() => handleAnnualLeaveSort('name')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2 whitespace-nowrap">
                      직급
                      <button
                        onClick={() => handleAnnualLeaveSort('position')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2 whitespace-nowrap">
                      부서
                      <button
                        onClick={() => handleAnnualLeaveSort('department')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2 whitespace-nowrap">
                      입사일
                      <button
                        onClick={() => handleAnnualLeaveSort('hireDate')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    {/* 퇴사일 컬럼 비표시 */}
                    <th className="text-center py-1 px-2 whitespace-nowrap">
                      근속년수
                      <button
                        onClick={() => handleAnnualLeaveSort('workPeriod')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2 leading-none">
                      <div className="flex items-center justify-center gap-1">
                        <div className="flex flex-col items-center lg:flex-row">
                          <span>근무</span><span>형태</span>
                        </div>
                        <button onClick={() => handleAnnualLeaveSort('workType')} className="text-xs text-gray-500 hover:text-gray-700">▼</button>
                      </div>
                    </th>
                    <th className="text-center py-1 px-2 leading-none">
                      <div className="flex items-center justify-center gap-1">
                        <div className="flex flex-col items-center lg:flex-row">
                          <span>계약</span><span>형태</span>
                        </div>
                        <button onClick={() => handleAnnualLeaveSort('contractType')} className="text-xs text-gray-500 hover:text-gray-700">▼</button>
                      </div>
                    </th>
                    <th className="text-center py-1 px-2 whitespace-nowrap">
                      상태
                      <button onClick={() => handleAnnualLeaveSort('status')} className="ml-1 text-xs text-gray-500 hover:text-gray-700">▼</button>
                    </th>
                    <th className="text-center py-1 px-2 leading-none">
                      <div className="flex items-center justify-center gap-1">
                        <div className="flex flex-col items-center lg:flex-row">
                          <span>연차</span><span>시작일</span>
                        </div>
                        <button onClick={() => handleAnnualLeaveSort('annualStart')} className="text-xs text-gray-500 hover:text-gray-700">▼</button>
                      </div>
                    </th>
                    <th className="text-center py-1 px-2 leading-none">
                      <div className="flex items-center justify-center gap-1">
                        <div className="flex flex-col items-center lg:flex-row">
                          <span>연차</span><span>종료일</span>
                        </div>
                        <button onClick={() => handleAnnualLeaveSort('annualEnd')} className="text-xs text-gray-500 hover:text-gray-700">▼</button>
                      </div>
                    </th>
                    <th className="text-center py-1 px-2 leading-none">
                      <div className="flex items-center justify-center gap-1">
                        <div className="flex flex-col items-center lg:flex-row">
                          <span>기본</span><span>연차</span>
                        </div>
                        <button onClick={() => handleAnnualLeaveSort('baseAnnual')} className="text-xs text-gray-500 hover:text-gray-700">▼</button>
                      </div>
                    </th>
                    <th className="text-center py-1 px-2 leading-none">
                      <div className="flex items-center justify-center gap-1">
                        <div className="flex flex-col items-center lg:flex-row">
                          <span>이월</span><span>연차</span>
                        </div>
                        <button onClick={() => handleAnnualLeaveSort('carryOverLeave')} className="text-xs text-gray-500 hover:text-gray-700">▼</button>
                      </div>
                    </th>
                    <th className="text-center py-1 px-2 whitespace-nowrap">
                      총연차
                      <button
                        onClick={() => handleAnnualLeaveSort('totalAnnual')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2 leading-none">
                      <div className="flex items-center justify-center gap-1">
                        <div className="flex flex-col items-center lg:flex-row">
                          <span>사용</span><span>연차</span>
                        </div>
                        <button onClick={() => handleAnnualLeaveSort('usedAnnual')} className="text-xs text-gray-500 hover:text-gray-700">▼</button>
                      </div>
                    </th>
                    <th className="text-center py-1 px-2 leading-none">
                      <div className="flex items-center justify-center gap-1">
                        <div className="flex flex-col items-center lg:flex-row">
                          <span>잔여</span><span>연차</span>
                        </div>
                        <button onClick={() => handleAnnualLeaveSort('remainAnnual')} className="text-xs text-gray-500 hover:text-gray-700">▼</button>
                      </div>
                    </th>
                    <th className="text-center py-1 px-2 whitespace-nowrap">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {employees
                    .filter((emp) => {
                      // 재직자만 표시 (기본값)
                      if (!showInactive && (emp.status === '퇴사' || emp.status === '휴직')) {
                        return false;
                      }

                      // 직급 필터
                      if (
                        leaveSearch.position &&
                        leaveSearch.position !== '전체'
                      ) {
                        if ((emp.position || '사원') !== leaveSearch.position)
                          return false;
                      }

                      // 부서 필터
                      if (leaveSearch.dept && leaveSearch.dept !== '전체') {
                        if (emp.department !== leaveSearch.dept) return false;
                      }

                      // 계약형태 필터
                      if (leaveSearch.contractType && leaveSearch.contractType !== '전체') {
                        const empContractType = emp.contractType || '기타';
                        if (leaveSearch.contractType === '기타') {
                          if (['정규', '촉탁', '계약'].includes(empContractType)) return false;
                        } else {
                          if (empContractType !== leaveSearch.contractType) return false;
                        }
                      }

                      // 사번/이름 키워드 필터
                      if (leaveSearch.keyword) {
                        const keyword = leaveSearch.keyword.toLowerCase();
                        const empId = (
                          emp.employeeNumber ||
                          emp.id ||
                          ''
                        ).toLowerCase();
                        const empName = (emp.name || '').toLowerCase();
                        if (
                          !empId.includes(keyword) &&
                          !empName.includes(keyword)
                        )
                          return false;
                      }

                      return true;
                    })
                    .sort((a, b) => {
                      // 정렬 필드가 없으면 기본적으로 사번 오름차순 정렬
                      if (!annualLeaveSortField) {
                        const aId = (a.employeeNumber || a.id || '').toString();
                        const bId = (b.employeeNumber || b.id || '').toString();
                        return aId.localeCompare(bId);
                      }

                      let aValue, bValue;

                      if (
                        annualLeaveSortField === 'totalAnnual' ||
                        annualLeaveSortField === 'usedAnnual' ||
                        annualLeaveSortField === 'remainAnnual' ||
                        annualLeaveSortField === 'workPeriod' ||
                        annualLeaveSortField === 'annualStart' ||
                        annualLeaveSortField === 'annualEnd' ||
                        annualLeaveSortField === 'baseAnnual' ||
                        annualLeaveSortField === 'carryOverLeave'
                      ) {
                        const aAnnual = calculateEmployeeAnnualLeave(
                          a,
                          leaveRequests
                        );
                        const bAnnual = calculateEmployeeAnnualLeave(
                          b,
                          leaveRequests
                        );

                        if (annualLeaveSortField === 'totalAnnual') {
                          aValue = aAnnual.totalAnnual;
                          bValue = bAnnual.totalAnnual;
                        } else if (annualLeaveSortField === 'usedAnnual') {
                          aValue = aAnnual.usedAnnual;
                          bValue = bAnnual.usedAnnual;
                        } else if (annualLeaveSortField === 'remainAnnual') {
                          aValue = aAnnual.remainAnnual;
                          bValue = bAnnual.remainAnnual;
                        } else if (annualLeaveSortField === 'workPeriod') {
                          // 근속년수: years * 12 + months로 계산하여 월 단위로 비교
                          aValue = aAnnual.years * 12 + aAnnual.months;
                          bValue = bAnnual.years * 12 + bAnnual.months;
                        } else if (annualLeaveSortField === 'annualStart') {
                          aValue = new Date(
                            aAnnual.annualStart || '9999-12-31'
                          );
                          bValue = new Date(
                            bAnnual.annualStart || '9999-12-31'
                          );
                        } else if (annualLeaveSortField === 'annualEnd') {
                          aValue = new Date(aAnnual.annualEnd || '9999-12-31');
                          bValue = new Date(bAnnual.annualEnd || '9999-12-31');
                        } else if (annualLeaveSortField === 'baseAnnual') {
                          aValue =
                            aAnnual.baseAnnual ||
                            aAnnual.totalAnnual - (aAnnual.carryOverLeave || 0);
                          bValue =
                            bAnnual.baseAnnual ||
                            bAnnual.totalAnnual - (bAnnual.carryOverLeave || 0);
                        } else if (annualLeaveSortField === 'carryOverLeave') {
                          aValue = aAnnual.carryOverLeave || 0;
                          bValue = bAnnual.carryOverLeave || 0;
                        }
                      } else {
                        aValue =
                          a[annualLeaveSortField] || a.employeeNumber || a.id;
                        bValue =
                          b[annualLeaveSortField] || b.employeeNumber || b.id;
                      }

                      if (typeof aValue === 'string') {
                        aValue = aValue.toLowerCase();
                        bValue = bValue.toLowerCase();
                      }

                      if (annualLeaveSortOrder === 'asc') {
                        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
                      } else {
                        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
                      }
                    })
                    .map((emp) => {
                      const annualData = calculateEmployeeAnnualLeave(
                        emp,
                        leaveRequests
                      );
                      const isEditing = editingAnnualLeave === emp.id;
                      return (
                        <tr key={emp.id} className="hover:bg-gray-50">
                          <td className="text-center py-1 px-2 whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="text"
                                value={
                                  editAnnualData.employeeNumber ||
                                  emp.employeeNumber ||
                                  emp.id
                                }
                                onChange={(e) =>
                                  setEditAnnualData((prev) => ({
                                    ...prev,
                                    employeeNumber: e.target.value,
                                  }))
                                }
                                className="w-20 px-2 py-1 border rounded text-center"
                              />
                            ) : (
                              emp.employeeNumber || emp.id
                            )}
                          </td>
                          <td className="text-center py-1 px-2 whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editAnnualData.name || emp.name}
                                onChange={(e) =>
                                  setEditAnnualData((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                  }))
                                }
                                className="w-20 px-2 py-1 border rounded text-center"
                              />
                            ) : (
                              emp.name
                            )}
                          </td>
                          <td className="text-center py-1 px-2 whitespace-nowrap">
                            {isEditing ? (
                              <select
                                value={
                                  editAnnualData.position ||
                                  emp.position ||
                                  '사원'
                                }
                                onChange={(e) =>
                                  setEditAnnualData((prev) => ({
                                    ...prev,
                                    position: e.target.value,
                                  }))
                                }
                                className="w-20 px-2 py-1 border rounded text-center"
                              >
                                <option value="사원">사원</option>
                                <option value="주임">주임</option>
                                <option value="대리">대리</option>
                                <option value="과장">과장</option>
                                <option value="차장">차장</option>
                                <option value="부장">부장</option>
                                <option value="이사">이사</option>
                                <option value="상무">상무</option>
                                <option value="전무">전무</option>
                                <option value="부사장">부사장</option>
                                <option value="사장">사장</option>
                              </select>
                            ) : (
                              emp.position || '사원'
                            )}
                          </td>
                          <td className="text-center py-1 px-2 whitespace-nowrap">
                            {isEditing ? (
                              <select
                                value={
                                  editAnnualData.department ||
                                  emp.department ||
                                  '미분류'
                                }
                                onChange={(e) =>
                                  setEditAnnualData((prev) => ({
                                    ...prev,
                                    department: e.target.value,
                                  }))
                                }
                                className="w-20 px-2 py-1 border rounded text-center"
                              >
                                {COMPANY_STANDARDS.DEPARTMENTS.map((dept) => (
                                  <option key={dept} value={dept}>
                                    {dept}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              emp.department || '미분류'
                            )}
                          </td>
                          <td className="text-center py-1 px-2 whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="date"
                                value={
                                  editAnnualData.hireDate ||
                                  emp.hireDate ||
                                  emp.joinDate ||
                                  ''
                                }
                                onChange={(e) =>
                                  setEditAnnualData((prev) => ({
                                    ...prev,
                                    hireDate: e.target.value,
                                  }))
                                }
                                className="w-28 px-2 py-1 border rounded text-center"
                              />
                            ) : (
                              emp.hireDate || emp.joinDate || '미등록'
                            )}
                          </td>
                          {/* 퇴사일 셀 비표시 */}
                          <td className="text-center py-1 px-2 whitespace-nowrap">
                            {annualData.years}년 {annualData.months}개월
                          </td>
                          <td className="text-center py-1 px-2 whitespace-nowrap">
                            {isEditing ? (
                              <select
                                value={
                                  editAnnualData.workType ||
                                  emp.workType ||
                                  '주간'
                                }
                                onChange={(e) =>
                                  setEditAnnualData((prev) => ({
                                    ...prev,
                                    workType: e.target.value,
                                  }))
                                }
                                className="w-20 px-2 py-1 border rounded text-center"
                              >
                                <option value="주간">주간</option>
                                <option value="야간">야간</option>
                              </select>
                            ) : (
                              emp.workType || '주간'
                            )}
                          </td>
                          <td className="text-center py-1 px-2 whitespace-nowrap">
                            {isEditing ? (
                              <select
                                value={
                                  editAnnualData.contractType ||
                                  emp.contractType ||
                                  '정규'
                                }
                                onChange={(e) =>
                                  setEditAnnualData((prev) => ({
                                    ...prev,
                                    contractType: e.target.value,
                                  }))
                                }
                                className="w-20 px-2 py-1 border rounded text-center"
                              >
                                <option value="정규">정규</option>
                                <option value="계약">계약</option>
                                <option value="촉탁">촉탁</option>
                              </select>
                            ) : (
                              emp.contractType || '정규'
                            )}
                          </td>
                          <td className="text-center py-1 px-2 whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              emp.status === '퇴사' ? 'bg-red-100 text-red-700' :
                              emp.status === '휴직' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {emp.status || '재직'}
                            </span>
                          </td>
                          <td className="text-center py-1 px-2 whitespace-nowrap">
                            {annualData.annualStart}
                          </td>
                          <td className="text-center py-1 px-2 whitespace-nowrap">
                            {annualData.annualEnd}
                          </td>
                          <td className="text-center py-1 px-2 whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="number"
                                value={
                                  editAnnualData.baseAnnual !== undefined
                                    ? editAnnualData.baseAnnual
                                    : (annualData.baseAnnual ?? annualData.totalAnnual - (annualData.carryOverLeave ?? 0))
                                }
                                onChange={(e) => {
                                  const value = Number(e.target.value) || 0;
                                  setEditAnnualData((prev) => ({
                                    ...prev,
                                    baseAnnual: value,
                                  }));
                                }}
                                className="w-16 px-2 py-1 border rounded text-center"
                                min="0"
                                max="25"
                                step="any"
                              />
                            ) : (
                              <span className="text-blue-600 font-medium">
                                {annualData.baseAnnual ||
                                  annualData.totalAnnual -
                                    (annualData.carryOverLeave || 0)}
                              </span>
                            )}
                          </td>
                          <td className="text-center py-1 px-2 whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="number"
                                value={
                                  editAnnualData.carryOverLeave !== undefined
                                    ? editAnnualData.carryOverLeave
                                    : (annualData.carryOverLeave ?? 0)
                                }
                                onChange={(e) => {
                                  const value = Number(e.target.value) || 0;
                                  setEditAnnualData((prev) => ({
                                    ...prev,
                                    carryOverLeave: value,
                                    // 총연차는 기본연차와 동일하므로 변경하지 않음
                                  }));
                                }}
                                className="w-16 px-2 py-1 border rounded text-center"
                                min="0"
                                step="any"
                              />
                            ) : (
                              <span className="text-green-600 font-medium">
                                {annualData.carryOverLeave || 0}
                              </span>
                            )}
                          </td>
                          <td className="text-center py-1 px-2 whitespace-nowrap">
                            {isEditing ? (
                              <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-400">(자동)</span>
                                <span className="font-medium text-gray-600">
                                  {(editAnnualData.baseAnnual !== undefined ? editAnnualData.baseAnnual : annualData.baseAnnual) +
                                   (editAnnualData.carryOverLeave !== undefined ? editAnnualData.carryOverLeave : (annualData.carryOverLeave || 0))}
                                </span>
                              </div>
                            ) : (
                              annualData.totalAnnual
                            )}
                          </td>
                          <td className="text-center py-1 px-2 whitespace-nowrap">
                            {isEditing ? (
                              <div className="flex flex-col items-center gap-1">
                                {/* 사용연차(자동): 연차 내역 기반 순수 집계값 (leaveUsed 보정 미포함) */}
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-500">사용(자동)</span>
                                  <span className="font-medium">{annualData.leaveRequestsSum ?? annualData.usedAnnual}</span>
                                </div>
                                {/* leaveUsed: 승인 연차 합계에 더해지는 관리자 보정값 */}
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-500">사용보정</span>
                                  <input
                                    type="number"
                                    value={
                                      editAnnualData.usedLeave !== undefined
                                        ? editAnnualData.usedLeave
                                        : (emp.leaveUsed || 0)
                                    }
                                    onChange={(e) => {
                                      const value = Number(e.target.value) || 0;
                                      setEditAnnualData((prev) => ({
                                        ...prev,
                                        usedLeave: value,
                                      }));
                                    }}
                                    className="w-12 px-1 py-0.5 border rounded text-center text-xs"
                                    step="any"
                                  />
                                </div>
                              </div>
                            ) : (
                              <span
                                className={`font-medium ${
                                  annualData.usedAnnual >
                                  annualData.totalAnnual * 0.8
                                    ? 'text-green-600'
                                    : annualData.usedAnnual >
                                      annualData.totalAnnual * 0.5
                                    ? 'text-orange-600'
                                    : 'text-red-600'
                                }`}
                                title={`사용연차 (총 ${annualData.totalAnnual}일 중 ${annualData.usedAnnual}일 사용)`}
                              >
                                {annualData.usedAnnual}
                              </span>
                            )}
                          </td>
                          <td className="text-center py-1 px-2 whitespace-nowrap">
                            {isEditing ? (
                              <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-400">(자동)</span>
                                <span className="font-medium text-blue-600">
                                  {((editAnnualData.baseAnnual !== undefined ? editAnnualData.baseAnnual : annualData.baseAnnual) +
                                    (editAnnualData.carryOverLeave !== undefined ? editAnnualData.carryOverLeave : (annualData.carryOverLeave || 0))) -
                                    // 잔여 = 총연차 - (연차내역 집계 + 보정값)
                                    ((annualData.leaveRequestsSum ?? (annualData.usedAnnual - (emp.leaveUsed || 0))) +
                                     (editAnnualData.usedLeave !== undefined ? editAnnualData.usedLeave : (emp.leaveUsed || 0)))}
                                </span>
                              </div>
                            ) : (
                              annualData.remainAnnual
                            )}
                          </td>
                          <td className="text-center py-1 px-2 whitespace-nowrap">
                            {isEditing ? (
                              <>
                                <button
                                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs mr-1 hover:bg-blue-200"
                                  onClick={async () => {
                                    try {
                                      // leaveUsed는 승인 연차 합계에 더해지는 관리자 보정값이다
                                      // (annualData.usedAnnual은 자동 계산값이므로 저장하지 않음)
                                      const usedLeave =
                                        editAnnualData.usedLeave !== undefined
                                          ? editAnnualData.usedLeave
                                          : (emp.leaveUsed || 0);

                                      console.log('🔍 직원 정보:', emp);
                                      console.log('🔍 employeeId:', emp.id);
                                      console.log('💾 DB 저장 데이터 (leaveUsed = 관리자 보정값):', {
                                        usedLeave,
                                      });

                                      // DB에 저장 (기준값)
                                      const { default: EmployeeAPI } =
                                        await import('../../api/employee');
                                      const baseAnnualVal = editAnnualData.baseAnnual !== undefined ? editAnnualData.baseAnnual : annualData.baseAnnual;
                                      const carryOverVal = editAnnualData.carryOverLeave !== undefined ? editAnnualData.carryOverLeave : (annualData.carryOverLeave || 0);
                                      const response = await EmployeeAPI.update(
                                        emp.id,
                                        {
                                          leaveUsed: usedLeave,
                                          baseAnnual: baseAnnualVal,
                                          carryOverLeave: carryOverVal,
                                          totalAnnual: baseAnnualVal + carryOverVal,
                                        }
                                      );

                                      console.log('✅ API 응답:', response);

                                      // 로컬 state 업데이트
                                      setEmployees((prev) =>
                                        prev.map((employee) =>
                                          employee.id === emp.id
                                            ? {
                                                ...employee,
                                                leaveUsed: usedLeave,
                                                usedLeave: usedLeave,
                                                baseAnnual: baseAnnualVal,
                                                carryOverLeave: carryOverVal,
                                                totalAnnual: baseAnnualVal + carryOverVal,
                                              }
                                            : employee
                                        )
                                      );

                                      console.log(
                                        '✅ 사용연차 저장 완료:',
                                        usedLeave
                                      );
                                      alert(
                                        '사용연차가 성공적으로 저장되었습니다.'
                                      );
                                      setEditingAnnualLeave(null);
                                      setEditAnnualData({});
                                    } catch (error) {
                                      console.error(
                                        '❌ 사용연차 저장 실패:',
                                        error
                                      );
                                      console.error(
                                        '❌ 에러 상세:',
                                        error.response?.data || error.message
                                      );
                                      alert(
                                        '사용연차 저장 중 오류가 발생했습니다: ' +
                                          (error.response?.data?.error ||
                                            error.message)
                                      );
                                    }
                                  }}
                                >
                                  저장
                                </button>
                                <button
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                                  onClick={() => {
                                    setEditingAnnualLeave(null);
                                    setEditAnnualData({});
                                  }}
                                >
                                  취소
                                </button>
                              </>
                            ) : currentUser?.allowedDepartments?.length ? (
                              <span className="text-xs text-gray-400">-</span>
                            ) : (
                              <button
                                className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs mr-1 hover:bg-blue-200"
                                onClick={() => {
                                  setEditingAnnualLeave(emp.id);
                                  setEditAnnualData({
                                    employeeNumber:
                                      emp.employeeNumber || emp.id,
                                    name: emp.name,
                                    position: emp.position || '사원',
                                    department: emp.department || '미분류',
                                    hireDate:
                                      emp.hireDate || emp.joinDate || '',
                                    resignDate: emp.resignDate || '',
                                    workType: emp.workType || '주간',
                                    status: emp.status || '재직',
                                    phone: emp.phone || '',
                                    address: emp.address || '',
                                    password: emp.password || '',
                                    totalAnnual: annualData.totalAnnual,
                                    usedLeave: emp.leaveUsed || 0,
                                    remainAnnual: annualData.remainAnnual,
                                    baseAnnual:
                                      annualData.baseAnnual ||
                                      annualData.totalAnnual -
                                        (annualData.carryOverLeave || 0),
                                    carryOverLeave:
                                      annualData.carryOverLeave || 0,
                                  });
                                }}
                              >
                                수정
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 연차 내역 탭 */}
        {leaveManagementTab === 'leave-history' && (
          <div>
            {/* 연차내역 헤더 */}
            <div className="mb-4 flex flex-col gap-3">
              {/* 1행: 제목 + 다운로드 버튼 */}
              <div className="flex items-center justify-between">
                <h4 className="text-md font-semibold text-gray-700">
                  연차 신청 내역
                </h4>
                <button
                  onClick={() => {
                    const filteredData = getSortedLeaveRequests(
                      getFilteredLeaveRequests(leaveRequests)
                    );
                    exportLeaveHistoryToXLSX(filteredData, formatDateByLang);
                  }}
                  className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center text-sm"
                >
                  <Download size={14} className="mr-1" />
                  다운로드
                </button>
              </div>

              {/* 2행: 검색 필터 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <input
                  type="text"
                  placeholder="연도"
                  value={leaveSearch.year}
                  onChange={(e) =>
                    setLeaveSearch((s) => ({ ...s, year: e.target.value }))
                  }
                  className="px-3 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="월"
                  value={leaveSearch.month}
                  onChange={(e) =>
                    setLeaveSearch((s) => ({ ...s, month: e.target.value }))
                  }
                  className="px-3 py-2 border rounded-lg"
                />
                <input
                  type="text"
                  placeholder="일"
                  value={leaveSearch.day}
                  onChange={(e) =>
                    setLeaveSearch((s) => ({ ...s, day: e.target.value }))
                  }
                  className="px-3 py-2 border rounded-lg"
                />
                <select
                  value={leaveSearch.type}
                  onChange={(e) =>
                    setLeaveSearch((s) => ({ ...s, type: e.target.value }))
                  }
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="전체">전체 유형</option>
                  <option value="연차">연차</option>
                  <option value="반차(오전)">반차(오전)</option>
                  <option value="반차(오후)">반차(오후)</option>
                  <option value="외출">외출</option>
                  <option value="조퇴">조퇴</option>
                  <option value="경조">경조</option>
                  <option value="공가">공가</option>
                  <option value="휴직">휴직</option>
                  <option value="결근">결근</option>
                  <option value="기타">기타</option>
                </select>
                <select
                  value={leaveSearch.status}
                  onChange={(e) =>
                    setLeaveSearch((s) => ({ ...s, status: e.target.value }))
                  }
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="전체">전체 상태</option>
                  <option value="대기">대기</option>
                  <option value="확인">확인</option>
                  <option value="승인">승인</option>
                  <option value="반려">반려</option>
                  <option value="취소">취소</option>
                </select>
                <input
                  type="text"
                  placeholder="사번 또는 이름 검색"
                  value={leaveSearch.keyword}
                  onChange={(e) =>
                    setLeaveSearch((s) => ({ ...s, keyword: e.target.value }))
                  }
                  className="px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            {/* 연차 내역 요약 카드 */}
            {(() => {
              const approved = getFilteredLeaveRequests(leaveRequests).filter(l => l.status === '승인');
              const getDays = (l) => l.approvedDays ?? l.requestedDays ?? l.days ?? 1;
              const uniqueEmployees = new Set(approved.map(l => l.employeeId || l.name)).size;
              const totalDays = approved.reduce((s, l) => s + getDays(l), 0);
              const avgDays = uniqueEmployees > 0 ? (totalDays / uniqueEmployees) : 0;
              const sumByType  = (type)  => approved.filter(l => l.type === type).reduce((s, l) => s + getDays(l), 0);
              const countByType = (type) => approved.filter(l => l.type === type).length;
              const kyungjoTotal = approved.filter(l => l.type === '경조' || l.type === '경조사').reduce((s, l) => s + getDays(l), 0);

              return (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  {/* 모바일 Row 1: 6열 (필터대상~반차(오후)) */}
                  <div className="grid grid-cols-6 gap-2 text-xs lg:hidden">
                    <div className="text-center">
                      <div className="text-gray-600 font-medium truncate">필터 대상</div>
                      <div className="font-bold text-blue-600">{uniqueEmployees}명</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 font-medium truncate">총 사용일</div>
                      <div className="font-bold text-green-700">{totalDays.toFixed(1)}일</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 font-medium truncate">평균사용일</div>
                      <div className="font-bold text-purple-600">{avgDays.toFixed(1)}일</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 font-medium truncate">연차</div>
                      <div className="font-bold text-orange-600">{sumByType('연차').toFixed(1)}일</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 font-medium truncate">반차(오전)</div>
                      <div className="font-bold text-orange-500">{sumByType('반차(오전)').toFixed(1)}일</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 font-medium truncate">반차(오후)</div>
                      <div className="font-bold text-orange-400">{sumByType('반차(오후)').toFixed(1)}일</div>
                    </div>
                  </div>
                  {/* 모바일 Row 2: 7열 (외출~기타) */}
                  <div className="grid grid-cols-7 gap-2 text-xs mt-2 lg:hidden">
                    <div className="text-center">
                      <div className="text-gray-600 font-medium truncate">외출</div>
                      <div className="font-bold text-yellow-600">{countByType('외출')}건</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 font-medium truncate">조퇴</div>
                      <div className="font-bold text-yellow-500">{countByType('조퇴')}건</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 font-medium truncate">경조</div>
                      <div className="font-bold text-pink-600">{kyungjoTotal.toFixed(1)}일</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 font-medium truncate">공가</div>
                      <div className="font-bold text-teal-600">{sumByType('공가').toFixed(1)}일</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 font-medium truncate">휴직</div>
                      <div className="font-bold text-gray-600">{sumByType('휴직').toFixed(1)}일</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 font-medium truncate">결근</div>
                      <div className="font-bold text-red-600">{sumByType('결근').toFixed(1)}일</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 font-medium truncate">기타</div>
                      <div className="font-bold text-gray-500">{countByType('기타')}건</div>
                    </div>
                  </div>
                  {/* 데스크탑: 13열 1행 */}
                  <div className="hidden lg:grid gap-2 text-sm" style={{ gridTemplateColumns: 'repeat(13, 1fr)' }}>
                    <div className="text-center">
                      <div className="text-gray-600 font-medium truncate">필터 대상</div>
                      <div className="font-bold text-blue-600">{uniqueEmployees}명</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 font-medium truncate">총 사용일</div>
                      <div className="font-bold text-green-700">{totalDays.toFixed(1)}일</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 font-medium truncate">평균 사용일</div>
                      <div className="font-bold text-purple-600">{avgDays.toFixed(1)}일</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 font-medium truncate">연차</div>
                      <div className="font-bold text-orange-600">{sumByType('연차').toFixed(1)}일</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 font-medium truncate">반차(오전)</div>
                      <div className="font-bold text-orange-500">{sumByType('반차(오전)').toFixed(1)}일</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 font-medium truncate">반차(오후)</div>
                      <div className="font-bold text-orange-400">{sumByType('반차(오후)').toFixed(1)}일</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 font-medium truncate">외출</div>
                      <div className="font-bold text-yellow-600">{countByType('외출')}건</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 font-medium truncate">조퇴</div>
                      <div className="font-bold text-yellow-500">{countByType('조퇴')}건</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 font-medium truncate">경조</div>
                      <div className="font-bold text-pink-600">{kyungjoTotal.toFixed(1)}일</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 font-medium truncate">공가</div>
                      <div className="font-bold text-teal-600">{sumByType('공가').toFixed(1)}일</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 font-medium truncate">휴직</div>
                      <div className="font-bold text-gray-600">{sumByType('휴직').toFixed(1)}일</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 font-medium truncate">결근</div>
                      <div className="font-bold text-red-600">{sumByType('결근').toFixed(1)}일</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600 font-medium truncate">기타</div>
                      <div className="font-bold text-gray-500">{countByType('기타')}건</div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="overflow-x-auto max-h-[85vh] lg:max-h-[72vh] overflow-y-auto">
              <table className="w-full text-xs" style={{ minWidth: '600px' }}>
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="text-center py-1 px-2 whitespace-nowrap">
                      신청일
                      <button
                        onClick={() => handleLeaveSort('applyDate')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2 whitespace-nowrap">
                      결재일
                      <button
                        onClick={() => handleLeaveSort('approvalDate')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2 whitespace-nowrap">
                      사번
                      <button
                        onClick={() => handleLeaveSort('employeeId')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2 whitespace-nowrap">
                      이름
                      <button
                        onClick={() => handleLeaveSort('name')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2 whitespace-nowrap">
                      시작일
                      <button
                        onClick={() => handleLeaveSort('startDate')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2 whitespace-nowrap">
                      종료일
                      <button
                        onClick={() => handleLeaveSort('endDate')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2 whitespace-nowrap">
                      사용일수
                      <button
                        onClick={() => handleLeaveSort('leaveDays')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2 whitespace-nowrap">
                      유형
                      <button
                        onClick={() => handleLeaveSort('type')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2 whitespace-nowrap">시작시간</th>
                    <th className="text-center py-1 px-2 whitespace-nowrap">종료시간</th>
                    <th className="text-center py-1 px-2 whitespace-nowrap">
                      사유
                      <button
                        onClick={() => handleLeaveSort('reason')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2 whitespace-nowrap">
                      비상연락망
                      <button
                        onClick={() => handleLeaveSort('contact')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2 whitespace-nowrap">
                      비고
                      <button
                        onClick={() => handleLeaveSort('remark')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2 whitespace-nowrap">
                      상태
                      <button
                        onClick={() => handleLeaveSort('status')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2 whitespace-nowrap">결제</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(() => {
                    const filteredLeaveRequests = getSortedLeaveRequests(
                      getFilteredLeaveRequests(leaveRequests)
                    );
                    return filteredLeaveRequests
                      .slice((leaveHistoryPage - 1) * 15, leaveHistoryPage * 15)
                      .map((lr) => {
                        const isEditing = editingLeaveHistoryRow === lr.id;
                        return (
                          <tr key={lr.id} className="hover:bg-gray-50">
                            <td className="text-center py-1 px-2">
                              {formatDateByLang(lr.requestDate)}
                            </td>
                            <td className="text-center py-1 px-2">
                              {lr.approvedAt
                                ? formatDateByLang(lr.approvedAt)
                                : lr.rejectedAt
                                ? formatDateByLang(lr.rejectedAt)
                                : '-'}
                            </td>
                            <td className="text-center py-2 px-2">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={
                                    editingLeaveHistoryData.employeeId ||
                                    lr.employeeId
                                  }
                                  onChange={(e) =>
                                    setEditingLeaveHistoryData((prev) => ({
                                      ...prev,
                                      employeeId: e.target.value,
                                    }))
                                  }
                                  className="w-20 px-2 py-1 border rounded text-center"
                                />
                              ) : (
                                lr.employeeId
                              )}
                            </td>
                            <td className="text-center py-2 px-2">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={
                                    editingLeaveHistoryData.name || lr.name
                                  }
                                  onChange={(e) =>
                                    setEditingLeaveHistoryData((prev) => ({
                                      ...prev,
                                      name: e.target.value,
                                    }))
                                  }
                                  className="w-20 px-2 py-1 border rounded text-center"
                                />
                              ) : (
                                lr.name
                              )}
                            </td>
                            <td className="text-center py-2 px-2">
                              {isEditing ? (
                                <input
                                  type="date"
                                  value={
                                    editingLeaveHistoryData.startDate ||
                                    lr.startDate
                                  }
                                  onChange={(e) =>
                                    setEditingLeaveHistoryData((prev) => ({
                                      ...prev,
                                      startDate: e.target.value,
                                    }))
                                  }
                                  className="w-32 px-2 py-1 border rounded text-center"
                                />
                              ) : (
                                formatDateByLang(lr.startDate)
                              )}
                            </td>
                            <td className="text-center py-2 px-2">
                              {isEditing ? (
                                <input
                                  type="date"
                                  value={
                                    editingLeaveHistoryData.endDate ||
                                    lr.endDate
                                  }
                                  onChange={(e) =>
                                    setEditingLeaveHistoryData((prev) => ({
                                      ...prev,
                                      endDate: e.target.value,
                                    }))
                                  }
                                  className="w-32 px-2 py-1 border rounded text-center"
                                />
                              ) : (
                                formatDateByLang(lr.endDate)
                              )}
                            </td>
                            <td className="text-center py-2 px-2">
                              {getLeaveDays(lr)}
                            </td>
                            <td className="text-center py-2 px-2">
                              {isEditing ? (
                                <select
                                  value={
                                    editingLeaveHistoryData.type || lr.type
                                  }
                                  onChange={(e) =>
                                    setEditingLeaveHistoryData((prev) => ({
                                      ...prev,
                                      type: e.target.value,
                                    }))
                                  }
                                  className="w-24 px-2 py-1 border rounded text-center"
                                >
                                  <option value="연차">연차</option>
                                  <option value="반차(오전)">반차(오전)</option>
                                  <option value="반차(오후)">반차(오후)</option>
                                  <option value="외출">외출</option>
                                  <option value="조퇴">조퇴</option>
                                  <option value="경조">경조</option>
                                  <option value="공가">공가</option>
                                  <option value="휴직">휴직</option>
                                  <option value="결근">결근</option>
                                  <option value="기타">기타</option>
                                </select>
                              ) : (
                                lr.type
                              )}
                            </td>
                            <td className="text-center py-2 px-2 text-xs whitespace-nowrap">
                              {lr.type === '외출' ? (() => {
                                const f = (t) => {
                                  if (!t) return '-';
                                  const h = parseInt(t.split(':')[0], 10);
                                  const p = h < 12 ? '오전' : '오후';
                                  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                                  return `${p} ${h12}:${t.split(':')[1]}`;
                                };
                                return f(lr.startTime);
                              })() : <span className="text-gray-300">-</span>}
                            </td>
                            <td className="text-center py-2 px-2 text-xs whitespace-nowrap">
                              {(lr.type === '외출' || lr.type === '조퇴') ? (() => {
                                const f = (t) => {
                                  if (!t) return '-';
                                  const h = parseInt(t.split(':')[0], 10);
                                  const p = h < 12 ? '오전' : '오후';
                                  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                                  return `${p} ${h12}:${t.split(':')[1]}`;
                                };
                                return f(lr.endTime);
                              })() : <span className="text-gray-300">-</span>}
                            </td>
                            <td className="text-center py-2 px-2 break-words whitespace-normal">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={
                                    editingLeaveHistoryData.reason ||
                                    lr.reason ||
                                    '개인사정'
                                  }
                                  onChange={(e) =>
                                    setEditingLeaveHistoryData((prev) => ({
                                      ...prev,
                                      reason: e.target.value,
                                    }))
                                  }
                                  className="w-24 px-2 py-1 border rounded text-center"
                                />
                              ) : (
                                <div className="w-[15em] lg:w-[20em] break-words mx-auto text-center">{lr.reason || '개인사정'}</div>
                              )}
                            </td>
                            <td className="text-center py-2 px-2 whitespace-nowrap">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={
                                    editingLeaveHistoryData.contact ||
                                    lr.contact ||
                                    ''
                                  }
                                  onChange={(e) =>
                                    setEditingLeaveHistoryData((prev) => ({
                                      ...prev,
                                      contact: e.target.value,
                                    }))
                                  }
                                  className="w-28 px-2 py-1 border rounded text-center"
                                />
                              ) : (
                                lr.contact || ''
                              )}
                            </td>
                            <td className="text-center py-2 px-2 whitespace-nowrap">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={
                                    editingLeaveHistoryData.remark ||
                                    lr.remark ||
                                    ''
                                  }
                                  onChange={(e) =>
                                    setEditingLeaveHistoryData((prev) => ({
                                      ...prev,
                                      remark: e.target.value,
                                    }))
                                  }
                                  className="w-32 px-2 py-1 border rounded text-center"
                                />
                              ) : (
                                <span title={lr.remark || '-'}>
                                  {lr.remark || '-'}
                                </span>
                              )}
                            </td>
                            <td className="text-center py-2 px-2 whitespace-nowrap">
                              {isEditing ? (
                                <select
                                  value={
                                    editingLeaveHistoryData.status || lr.status
                                  }
                                  onChange={(e) =>
                                    setEditingLeaveHistoryData((prev) => ({
                                      ...prev,
                                      status: e.target.value,
                                    }))
                                  }
                                  className="w-20 px-2 py-1 border rounded text-center"
                                >
                                  <option value="대기">대기</option>
                                  <option value="확인">확인</option>
                                  <option value="승인">승인</option>
                                  <option value="반려">반려</option>
                                  <option value="취소">취소</option>
                                </select>
                              ) : (
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${
                                    STATUS_COLORS[lr.status] ||
                                    STATUS_COLORS['대기']
                                  }`}
                                >
                                  {lr.status}
                                </span>
                              )}
                            </td>
                            <td className="text-center py-1 px-2 whitespace-nowrap">
                              {isEditing ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                                    onClick={() =>
                                      handleSaveLeaveHistory(lr.id)
                                    }
                                  >
                                    저장
                                  </button>
                                  <button
                                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                                    onClick={handleCancelLeaveHistory}
                                  >
                                    취소
                                  </button>
                                </div>
                              ) : currentUser?.allowedDepartments?.length ? (
                                // 부서장: 대기→확인/반려, 나머지→비활성
                                lr.status === '대기' ? (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                                      onClick={() => handleConfirmLeave(lr.id)}
                                    >
                                      확인
                                    </button>
                                    <button
                                      className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                                      onClick={() => handleRejectLeave(lr.id)}
                                    >
                                      반려
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">-</span>
                                )
                              ) : (
                                // 전체관리자: 확인→승인/반려, 대기→대기텍스트, 승인/반려→수정
                                lr.status === '확인' ? (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                                      onClick={() => handleApproveLeave(lr.id)}
                                    >
                                      승인
                                    </button>
                                    <button
                                      className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                                      onClick={() => handleRejectLeave(lr.id)}
                                    >
                                      반려
                                    </button>
                                  </div>
                                ) : lr.status === '대기' ? (
                                  <span className="text-xs text-yellow-600">대기</span>
                                ) : (
                                  <button
                                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                                    onClick={() => handleEditLeaveHistory(lr)}
                                  >
                                    수정
                                  </button>
                                )
                              )}
                            </td>
                          </tr>
                        );
                      });
                  })()}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            {(() => {
              const filteredCount = getSortedLeaveRequests(
                getFilteredLeaveRequests(leaveRequests)
              ).length;
              if (filteredCount <= 15) return null;

              const totalPages = Math.ceil(filteredCount / 15);
              const groupSize = 10;
              const currentGroup = Math.floor((leaveHistoryPage - 1) / groupSize);
              const startPage = currentGroup * groupSize + 1;
              const endPage = Math.min(startPage + groupSize - 1, totalPages);

              return (
                <div className="flex flex-wrap justify-center mt-4 gap-1 px-2">
                  {startPage > 1 && (
                    <button
                      className="px-3 py-1 rounded text-sm bg-gray-200 hover:bg-gray-300"
                      onClick={() => setLeaveHistoryPage(startPage - 1)}
                    >
                      &lt;
                    </button>
                  )}
                  {Array.from({ length: endPage - startPage + 1 }).map((_, i) => (
                    <button
                      key={startPage + i}
                      className={`px-3 py-1 rounded text-sm ${
                        leaveHistoryPage === startPage + i
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                      onClick={() => setLeaveHistoryPage(startPage + i)}
                    >
                      {startPage + i}
                    </button>
                  ))}
                  {endPage < totalPages && (
                    <button
                      className="px-3 py-1 rounded text-sm bg-gray-200 hover:bg-gray-300"
                      onClick={() => setLeaveHistoryPage(endPage + 1)}
                    >
                      &gt;
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* 승인/반려 비고 입력 팝업 */}
      {showLeaveApprovalPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 pb-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                {leaveApprovalData.type === 'approve'
                  ? '승인 사유 입력'
                  : '반려 사유 입력'}
              </h3>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {leaveApprovalData.type === 'approve'
                    ? '승인 사유 (선택사항)'
                    : '반려 사유 (선택사항)'}
                </label>
                <textarea
                  value={leaveApprovalData.remark}
                  onChange={(e) =>
                    setLeaveApprovalData((prev) => ({
                      ...prev,
                      remark: e.target.value,
                    }))
                  }
                  placeholder={
                    leaveApprovalData.type === 'approve'
                      ? '승인 사유를 입력하세요...'
                      : '반려 사유를 입력하세요... (미입력 시 "사유 없음"으로 처리됩니다)'
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows="4"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleLeaveApprovalConfirm}
                  className={`flex-1 px-4 py-2 text-white rounded-lg ${
                    leaveApprovalData.type === 'approve'
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {leaveApprovalData.type === 'approve' ? '승인' : '반려'}
                </button>
                <button
                  onClick={() => {
                    setShowLeaveApprovalPopup(false);
                    setLeaveApprovalData({
                      id: null,
                      type: '',
                      remark: '',
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 비고 수정 팝업 */}
      {editingLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 pb-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">비고 수정</h3>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  비고
                </label>
                <textarea
                  value={editingLeaveRemark}
                  onChange={(e) => setEditingLeaveRemark(e.target.value)}
                  placeholder="비고를 입력하세요..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows="4"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setLeaveRequests((prev) =>
                      prev.map((lr) =>
                        lr.id === editingLeave
                          ? { ...lr, remark: editingLeaveRemark }
                          : lr
                      )
                    );
                    setEditingLeave(null);
                    setEditingLeaveRemark('');
                  }}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  저장
                </button>
                <button
                  onClick={() => {
                    setEditingLeave(null);
                    setEditingLeaveRemark('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(AdminLeaveManagement);

