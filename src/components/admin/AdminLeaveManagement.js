import React, { useEffect } from 'react';
import { Download } from 'lucide-react';
import {
  exportEmployeeLeaveStatusToXLSX,
  exportLeaveHistoryToXLSX,
} from '../common/common_admin_leave';

const AdminLeaveManagement = ({
  leaveManagementTab,
  setLeaveManagementTab,
  employees,
  setEmployees,
  leaveSearch,
  setLeaveSearch,
  COMPANY_STANDARDS,
  calculateEmployeeAnnualLeave,
  editingAnnualLeave,
  setEditingAnnualLeave,
  editAnnualData,
  setEditAnnualData,
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
  leaveHistoryPage,
  setLeaveHistoryPage,
  editingLeave,
  setEditingLeave,
  editingLeaveRemark,
  setEditingLeaveRemark,
  showLeaveApprovalPopup,
  setShowLeaveApprovalPopup,
  leaveApprovalData,
  setLeaveApprovalData,
  handleLeaveApprovalConfirm,
  editingLeaveHistoryRow,
  setEditingLeaveHistoryRow,
  editingLeaveHistoryData,
  setEditingLeaveHistoryData,
}) => {
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
      <div className="bg-white border border-gray-200 rounded-xl p-6 h-[870px] flex flex-col">
        <div className="flex items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-800 mr-16">
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
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* 제목, 검색 필터, 다운로드 버튼을 한 줄로 배치 */}
            <div className="mb-4 flex gap-4 items-center">
              {/* 제목 */}
              <h4 className="text-md font-semibold text-gray-700 whitespace-nowrap">
                직원별 연차 현황
              </h4>

              {/* 검색 필터 */}
              <div className="flex-1 p-2 rounded-lg">
                <div className="grid grid-cols-4 gap-6">
                  <div></div>
                  <div>
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
                  </div>
                  <div>
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
                  </div>
                  <div>
                    <input
                      type="text"
                      value={leaveSearch.keyword || ''}
                      onChange={(e) =>
                        setLeaveSearch((prev) => ({
                          ...prev,
                          keyword: e.target.value,
                        }))
                      }
                      placeholder="사번 또는 이름 검색"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 다운로드 버튼 */}
              <button
                onClick={() =>
                  exportEmployeeLeaveStatusToXLSX(
                    employees,
                    calculateEmployeeAnnualLeave
                  )
                }
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center whitespace-nowrap"
              >
                <Download size={16} className="mr-2" />
                다운로드
              </button>
            </div>

            {/* 직원 연차 현황 테이블 */}
            <div className="flex-1 overflow-y-auto overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="text-center py-1 px-2">
                      사번
                      <button
                        onClick={() => handleAnnualLeaveSort('employeeNumber')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">
                      이름
                      <button
                        onClick={() => handleAnnualLeaveSort('name')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">
                      직급
                      <button
                        onClick={() => handleAnnualLeaveSort('position')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">
                      부서
                      <button
                        onClick={() => handleAnnualLeaveSort('department')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">
                      입사일
                      <button
                        onClick={() => handleAnnualLeaveSort('hireDate')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">
                      퇴사일
                      <button
                        onClick={() => handleAnnualLeaveSort('resignDate')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">근속년수</th>
                    <th className="text-center py-1 px-2">
                      근무형태
                      <button
                        onClick={() => handleAnnualLeaveSort('workType')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">
                      상태
                      <button
                        onClick={() => handleAnnualLeaveSort('status')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">연차시작일</th>
                    <th className="text-center py-1 px-2">연차종료일</th>
                    <th className="text-center py-1 px-2">기본연차</th>
                    <th className="text-center py-1 px-2">이월연차</th>
                    <th className="text-center py-1 px-2">
                      총연차
                      <button
                        onClick={() => handleAnnualLeaveSort('totalAnnual')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">
                      사용연차
                      <button
                        onClick={() => handleAnnualLeaveSort('usedAnnual')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">
                      잔여연차
                      <button
                        onClick={() => handleAnnualLeaveSort('remainAnnual')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {employees
                    .filter((emp) => {
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
                        annualLeaveSortField === 'remainAnnual'
                      ) {
                        const aAnnual = calculateEmployeeAnnualLeave(a);
                        const bAnnual = calculateEmployeeAnnualLeave(b);
                        aValue =
                          annualLeaveSortField === 'totalAnnual'
                            ? aAnnual.totalAnnual
                            : annualLeaveSortField === 'usedAnnual'
                            ? aAnnual.usedAnnual
                            : aAnnual.remainAnnual;
                        bValue =
                          annualLeaveSortField === 'totalAnnual'
                            ? bAnnual.totalAnnual
                            : annualLeaveSortField === 'usedAnnual'
                            ? bAnnual.usedAnnual
                            : bAnnual.remainAnnual;
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
                      const annualData = calculateEmployeeAnnualLeave(emp);
                      const isEditing = editingAnnualLeave === emp.id;
                      return (
                        <tr key={emp.id} className="hover:bg-gray-50">
                          <td className="text-center py-1 px-2">
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
                          <td className="text-center py-1 px-2">
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
                          <td className="text-center py-1 px-2">
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
                          <td className="text-center py-1 px-2">
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
                          <td className="text-center py-1 px-2">
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
                          <td className="text-center py-1 px-2">
                            {isEditing ? (
                              <input
                                type="date"
                                value={
                                  editAnnualData.resignDate ||
                                  emp.resignDate ||
                                  ''
                                }
                                onChange={(e) =>
                                  setEditAnnualData((prev) => ({
                                    ...prev,
                                    resignDate: e.target.value,
                                  }))
                                }
                                className="w-28 px-2 py-1 border rounded text-center"
                              />
                            ) : (
                              emp.resignDate || '-'
                            )}
                          </td>
                          <td className="text-center py-1 px-2">
                            {annualData.years}년 {annualData.months}개월
                          </td>
                          <td className="text-center py-1 px-2">
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
                          <td className="text-center py-1 px-2">
                            {isEditing ? (
                              <select
                                value={
                                  editAnnualData.status || emp.status || '재직'
                                }
                                onChange={(e) =>
                                  setEditAnnualData((prev) => ({
                                    ...prev,
                                    status: e.target.value,
                                  }))
                                }
                                className="w-20 px-2 py-1 border rounded text-center"
                              >
                                <option value="재직">재직</option>
                                <option value="휴직">휴직</option>
                                <option value="퇴직">퇴직</option>
                                <option value="대기">대기</option>
                              </select>
                            ) : (
                              emp.status || '재직'
                            )}
                          </td>
                          <td className="text-center py-1 px-2">
                            {annualData.annualStart}
                          </td>
                          <td className="text-center py-1 px-2">
                            {annualData.annualEnd}
                          </td>
                          <td className="text-center py-1 px-2">
                            {isEditing ? (
                              <input
                                type="number"
                                value={
                                  editAnnualData.baseAnnual ||
                                  annualData.baseAnnual ||
                                  annualData.totalAnnual -
                                    (annualData.carryOverLeave || 0)
                                }
                                onChange={(e) => {
                                  const value = Number(e.target.value) || 0;
                                  setEditAnnualData((prev) => ({
                                    ...prev,
                                    baseAnnual: value,
                                    totalAnnual:
                                      value +
                                      (prev.carryOverLeave ||
                                        annualData.carryOverLeave ||
                                        0),
                                  }));
                                }}
                                className="w-16 px-2 py-1 border rounded text-center"
                                min="0"
                                max="25"
                              />
                            ) : (
                              <span className="text-blue-600 font-medium">
                                {annualData.baseAnnual ||
                                  annualData.totalAnnual -
                                    (annualData.carryOverLeave || 0)}
                              </span>
                            )}
                          </td>
                          <td className="text-center py-1 px-2">
                            {isEditing ? (
                              <input
                                type="number"
                                value={
                                  editAnnualData.carryOverLeave ||
                                  annualData.carryOverLeave ||
                                  0
                                }
                                onChange={(e) => {
                                  const value = Number(e.target.value) || 0;
                                  setEditAnnualData((prev) => ({
                                    ...prev,
                                    carryOverLeave: value,
                                    totalAnnual:
                                      (prev.baseAnnual ||
                                        annualData.baseAnnual ||
                                        annualData.totalAnnual -
                                          (annualData.carryOverLeave || 0)) +
                                      value,
                                  }));
                                }}
                                className="w-16 px-2 py-1 border rounded text-center"
                                min="0"
                                max="11"
                              />
                            ) : (
                              <span className="text-green-600 font-medium">
                                {annualData.carryOverLeave || 0}
                              </span>
                            )}
                          </td>
                          <td className="text-center py-1 px-2">
                            {isEditing ? (
                              <input
                                type="number"
                                value={
                                  editAnnualData.totalAnnual ||
                                  annualData.totalAnnual
                                }
                                onChange={(e) => {
                                  const value = Number(e.target.value) || 0;
                                  setEditAnnualData((prev) => ({
                                    ...prev,
                                    totalAnnual: value,
                                    remainAnnual:
                                      value -
                                      (prev.usedAnnual ||
                                        annualData.usedAnnual ||
                                        0),
                                  }));
                                }}
                                className="w-16 px-2 py-1 border rounded text-center"
                              />
                            ) : (
                              annualData.totalAnnual
                            )}
                          </td>
                          <td className="text-center py-1 px-2">
                            {isEditing ? (
                              <input
                                type="number"
                                value={
                                  editAnnualData.usedAnnual ||
                                  annualData.usedAnnual
                                }
                                onChange={(e) => {
                                  const value = Number(e.target.value) || 0;
                                  setEditAnnualData((prev) => ({
                                    ...prev,
                                    usedAnnual: value,
                                    remainAnnual:
                                      (prev.totalAnnual ||
                                        annualData.totalAnnual ||
                                        0) - value,
                                  }));
                                }}
                                className="w-16 px-2 py-1 border rounded text-center"
                              />
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
                                title={`승인된 연차 내역으로 자동 계산됨 (총 ${annualData.totalAnnual}일 중 ${annualData.usedAnnual}일 사용)`}
                              >
                                {annualData.usedAnnual}
                              </span>
                            )}
                          </td>
                          <td className="text-center py-1 px-2">
                            {isEditing ? (
                              <span className="font-medium text-blue-600">
                                {editAnnualData.remainAnnual !== undefined
                                  ? editAnnualData.remainAnnual
                                  : annualData.remainAnnual}
                              </span>
                            ) : (
                              annualData.remainAnnual
                            )}
                          </td>
                          <td className="text-center py-1 px-2">
                            {isEditing ? (
                              <>
                                <button
                                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs mr-1 hover:bg-blue-200"
                                  onClick={() => {
                                    // 연차 정보 저장 및 직원 정보 업데이트
                                    const finalData = {
                                      ...editAnnualData,
                                      totalAnnual:
                                        editAnnualData.totalAnnual ||
                                        annualData.totalAnnual ||
                                        0,
                                      usedAnnual:
                                        editAnnualData.usedAnnual ||
                                        annualData.usedAnnual ||
                                        0,
                                    };

                                    finalData.remainAnnual =
                                      finalData.totalAnnual -
                                      finalData.usedAnnual;

                                    // 직원 정보 업데이트 - annualLeave 객체와 개별 필드 모두 업데이트
                                    setEmployees((prev) =>
                                      prev.map((employee) =>
                                        employee.id === emp.id
                                          ? {
                                              ...employee,
                                              ...finalData,
                                              totalAnnual:
                                                finalData.totalAnnual,
                                              usedAnnual: finalData.usedAnnual,
                                              remainAnnual:
                                                finalData.remainAnnual,
                                              annualLeave: {
                                                total: finalData.totalAnnual,
                                                used: finalData.usedAnnual,
                                                remaining:
                                                  finalData.remainAnnual,
                                              },
                                            }
                                          : employee
                                      )
                                    );

                                    devLog('연차 정보 저장 완료:', finalData);
                                    alert(
                                      '연차 정보가 성공적으로 저장되었습니다.'
                                    );
                                    setEditingAnnualLeave(null);
                                    setEditAnnualData({});
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
                                    usedAnnual: annualData.usedAnnual,
                                    remainAnnual: annualData.remainAnnual,
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
          <div className="flex flex-col">
            {/* 제목, 검색 필터, 다운로드 버튼을 한 줄로 배치 */}
            <div className="mb-4 flex gap-8 items-center">
              {/* 제목 */}
              <h4 className="text-md font-semibold text-gray-700 whitespace-nowrap">
                연차 신청 내역
              </h4>

              {/* 검색 필터 */}
              <div className="flex-1 p-2 rounded-lg">
                <div className="grid grid-cols-6 gap-3">
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
                      setLeaveSearch((s) => ({
                        ...s,
                        status: e.target.value,
                      }))
                    }
                    className="px-3 py-2 border rounded-lg"
                  >
                    <option value="전체">전체 상태</option>
                    <option value="대기">대기</option>
                    <option value="승인">승인</option>
                    <option value="반려">반려</option>
                    <option value="취소">취소</option>
                  </select>

                  <input
                    type="text"
                    placeholder="사번 또는 이름 검색"
                    value={leaveSearch.keyword}
                    onChange={(e) =>
                      setLeaveSearch((s) => ({
                        ...s,
                        keyword: e.target.value,
                      }))
                    }
                    className="px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              {/* 다운로드 버튼 */}
              <button
                onClick={() => {
                  const filteredData = getSortedLeaveRequests(
                    getFilteredLeaveRequests(leaveRequests)
                  );
                  exportLeaveHistoryToXLSX(filteredData, formatDateByLang);
                }}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center whitespace-nowrap"
              >
                <Download size={16} className="mr-2" />
                다운로드
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-center py-1 px-2">
                      신청일
                      <button
                        onClick={() => handleLeaveSort('applyDate')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">
                      결재일
                      <button
                        onClick={() => handleLeaveSort('approvalDate')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">
                      사번
                      <button
                        onClick={() => handleLeaveSort('employeeId')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">
                      이름
                      <button
                        onClick={() => handleLeaveSort('name')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">
                      시작일
                      <button
                        onClick={() => handleLeaveSort('startDate')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">
                      종료일
                      <button
                        onClick={() => handleLeaveSort('endDate')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">사용일수</th>
                    <th className="text-center py-1 px-2">
                      유형
                      <button
                        onClick={() => handleLeaveSort('type')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">
                      사유
                      <button
                        onClick={() => handleLeaveSort('reason')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">
                      비상연락망
                      <button
                        onClick={() => handleLeaveSort('contact')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">
                      비고
                      <button
                        onClick={() => handleLeaveSort('remark')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">
                      상태
                      <button
                        onClick={() => handleLeaveSort('status')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">결제</th>
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
                                  value={editingLeaveHistoryData.employeeId || lr.employeeId}
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
                                  value={editingLeaveHistoryData.name || lr.name}
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
                                  value={editingLeaveHistoryData.startDate || lr.startDate}
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
                                  value={editingLeaveHistoryData.endDate || lr.endDate}
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
                                  value={editingLeaveHistoryData.type || lr.type}
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
                            <td className="text-center py-2 px-2">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingLeaveHistoryData.reason || lr.reason || '개인사정'}
                                  onChange={(e) =>
                                    setEditingLeaveHistoryData((prev) => ({
                                      ...prev,
                                      reason: e.target.value,
                                    }))
                                  }
                                  className="w-24 px-2 py-1 border rounded text-center"
                                />
                              ) : (
                                lr.reason || '개인사정'
                              )}
                            </td>
                            <td className="text-center py-2 px-2">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingLeaveHistoryData.contact || lr.contact || ''}
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
                            <td className="text-center py-2 px-2">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingLeaveHistoryData.remark || lr.remark || ''}
                                  onChange={(e) =>
                                    setEditingLeaveHistoryData((prev) => ({
                                      ...prev,
                                      remark: e.target.value,
                                    }))
                                  }
                                  className="w-32 px-2 py-1 border rounded text-center"
                                />
                              ) : (
                                <span
                                  className="truncate max-w-[150px]"
                                  title={lr.remark || '-'}
                                >
                                  {lr.remark || '-'}
                                </span>
                              )}
                            </td>
                            <td className="text-center py-2 px-2">
                              {isEditing ? (
                                <select
                                  value={editingLeaveHistoryData.status || lr.status}
                                  onChange={(e) =>
                                    setEditingLeaveHistoryData((prev) => ({
                                      ...prev,
                                      status: e.target.value,
                                    }))
                                  }
                                  className="w-20 px-2 py-1 border rounded text-center"
                                >
                                  <option value="대기">대기</option>
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
                            <td className="text-center py-1 px-2">
                              {isEditing ? (
                                <>
                                  <button
                                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs mr-1 hover:bg-blue-200"
                                    onClick={() => handleSaveLeaveHistory(lr.id)}
                                  >
                                    저장
                                  </button>
                                  <button
                                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                                    onClick={handleCancelLeaveHistory}
                                  >
                                    취소
                                  </button>
                                </>
                              ) : lr.status === '대기' ? (
                                <>
                                  <button
                                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs mr-1 hover:bg-blue-200"
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
                                </>
                              ) : (
                                <button
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                                  onClick={() => handleEditLeaveHistory(lr)}
                                >
                                  수정
                                </button>
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

              return (
                <div className="flex justify-center mt-4 gap-1">
                  {Array.from({
                    length: Math.ceil(filteredCount / 15),
                  }).map((_, i) => (
                    <button
                      key={i}
                      className={`px-3 py-1 rounded ${
                        leaveHistoryPage === i + 1
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                      onClick={() => setLeaveHistoryPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
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

export default AdminLeaveManagement;
