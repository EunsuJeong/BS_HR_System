import React from 'react';
import { Plus, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getWorkPeriodText } from '../common/common_common';
import {
  exportOrganizationToXLSX,
  useEmployeeManagement,
} from '../common/common_admin_employee';
import apiClient from '../../api/client';

const AdminEmployeeManagement = ({
  employees,
  setEmployees,
  employeeSearchFilter,
  setEmployeeSearchFilter,
  employeeSortField,
  employeeSortOrder,
  handleSort,
  editingEmpId,
  setEditingEmpId,
  editForm,
  setEditForm,
  handleUpdateEmployee,
  handleDeleteEmployee,
  showNewEmployeeModal,
  setShowNewEmployeeModal,
  newEmployee,
  setNewEmployee,
  COMPANY_STANDARDS,
  getSortedEmployees,
  attendanceSheetData = {},
  attendanceSheetYear = new Date().getFullYear(),
  attendanceSheetMonth = new Date().getMonth() + 1,
}) => {
  // [2_관리자 모드] 2.2_직원 관리 - Hook
  const { handleRegisterEmployee } = useEmployeeManagement({
    employees,
    setEmployees,
  });

  // 근무형태 자동 분석
  const handleAnalyzeWorkType = async () => {
    try {
      const year = attendanceSheetYear;
      const month = attendanceSheetMonth;

      const data = await apiClient.post('/hr/analyze-work-type', {
        year,
        month,
      });

      if (data.success) {
        alert(
          `근무형태 분석 완료!\n${data.updatedCount}명의 직원 근무형태가 업데이트되었습니다.`
        );

        // 직원 목록 새로고침
        const employeesData = await apiClient.get('/hr/employees');
        if (employeesData.success) {
          setEmployees(employeesData.data);
        }
      } else {
        alert(`근무형태 분석 실패: ${data.error}`);
      }
    } catch (error) {
      console.error('근무형태 분석 오류:', error);
      alert('근무형태 분석 중 오류가 발생했습니다.');
    }
  };

  // 해당 월에 주간/야간 시프트가 모두 있는 직원인지 확인
  const hasShiftWork = (employeeId) => {
    const shiftTypes = new Set();
    const daysInMonth = new Date(
      attendanceSheetYear,
      attendanceSheetMonth,
      0
    ).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${attendanceSheetYear}-${String(
        attendanceSheetMonth
      ).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const employeeKey = `${employeeId}_${dateKey}`;
      const attendance = attendanceSheetData[employeeKey];

      if (attendance && attendance.shiftType) {
        shiftTypes.add(attendance.shiftType);
      }
    }

    // 주간과 야간이 모두 있으면 true
    return shiftTypes.has('주간') && shiftTypes.has('야간');
  };

  // 현재 월의 실제 근무 형태 분석
  const getActualWorkType = (employeeId) => {
    const shiftTypes = new Set();
    const daysInMonth = new Date(
      attendanceSheetYear,
      attendanceSheetMonth,
      0
    ).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${attendanceSheetYear}-${String(
        attendanceSheetMonth
      ).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const employeeKey = `${employeeId}_${dateKey}`;
      const attendance = attendanceSheetData[employeeKey];

      if (attendance && attendance.shiftType) {
        shiftTypes.add(attendance.shiftType);
      }
    }

    // 주간과 야간 모두 있으면 "주간/야간"
    if (shiftTypes.has('주간') && shiftTypes.has('야간')) {
      return '주간/야간';
    }
    // 야간만 있으면 "야간"
    if (shiftTypes.has('야간')) {
      return '야간';
    }
    // 주간만 있으면 "주간"
    if (shiftTypes.has('주간')) {
      return '주간';
    }
    // 데이터 없으면 null 반환
    return null;
  };

  // 직원의 근무 형태 표시 (현재 월 근태 기준)
  const getWorkTypeDisplay = (employee) => {
    // 현재 월 근태 데이터 기준으로 실제 근무형태 확인
    const actualWorkType = getActualWorkType(employee.id);

    if (actualWorkType) {
      // 현재 월에 근태 데이터가 있으면 실제 분석 결과 표시
      return actualWorkType === '주간/야간' ? '주/야' : actualWorkType;
    }

    // 현재 월에 근태 데이터가 없으면 DB의 workType 표시 (단, "주간/야간"은 제외)
    const dbWorkType = employee.workType || '주간';
    return dbWorkType === '주간/야간' ? '주간' : dbWorkType;
  };

  return (
    <>
      <div className="space-y-6 w-full h-full">
        <div className="bg-white border border-gray-200 rounded-xl p-6 h-[870px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                직원 관리
              </h3>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold mb-4">
                재직{' '}
                {
                  employees.filter((e) => (e.status || '재직') === '재직')
                    .length
                }
                명
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowNewEmployeeModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
              >
                <Plus size={10} className="mr-2" />
                신규 직원 등록
              </button>
              <button
                onClick={handleAnalyzeWorkType}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 flex items-center"
                title={`${attendanceSheetYear}년 ${attendanceSheetMonth}월 근태 기준으로 근무형태 분석`}
              >
                근무형태 분석
              </button>
              <button
                onClick={() => {
                  // 화면에 표시 중인 직원 데이터 (필터/정렬 적용)
                  const filteredData = getSortedEmployees(
                    employees.filter(
                      (emp) =>
                        (!employeeSearchFilter.position ||
                          (emp.position &&
                            emp.position === employeeSearchFilter.position)) &&
                        (!employeeSearchFilter.role ||
                          (emp.role &&
                            emp.role === employeeSearchFilter.role)) &&
                        (!employeeSearchFilter.name ||
                          (emp.id &&
                            emp.id.includes(employeeSearchFilter.name)) ||
                          (emp.name &&
                            emp.name.includes(employeeSearchFilter.name))) &&
                        (!employeeSearchFilter.department ||
                          emp.department === employeeSearchFilter.department) &&
                        (!employeeSearchFilter.subDepartment ||
                          emp.subDepartment ===
                            employeeSearchFilter.subDepartment) &&
                        (!employeeSearchFilter.payType ||
                          emp.payType === employeeSearchFilter.payType) &&
                        (!employeeSearchFilter.workType ||
                          (employeeSearchFilter.workType === '주간/야간'
                            ? getActualWorkType(emp.id) === '주간/야간'
                            : getActualWorkType(emp.id) ===
                                employeeSearchFilter.workType ||
                              (!getActualWorkType(emp.id) &&
                                emp.workType ===
                                  employeeSearchFilter.workType))) &&
                        (!employeeSearchFilter.status ||
                          (emp.status || '재직') ===
                            employeeSearchFilter.status)
                    )
                  );
                  exportOrganizationToXLSX(filteredData);
                }}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center"
              >
                <Download size={10} className="mr-2" />
                조직도 다운로드
              </button>
            </div>
          </div>

          {/* 검색 필터 */}
          <div className="text-sm grid grid-cols-8 gap-3 mb-3 p-2 bg-gray-50 rounded-lg">
            <select
              value={employeeSearchFilter.position}
              onChange={(e) =>
                setEmployeeSearchFilter({
                  ...employeeSearchFilter,
                  position: e.target.value,
                })
              }
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">전체 직급</option>
              {COMPANY_STANDARDS.POSITIONS.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
            <select
              value={employeeSearchFilter.department}
              onChange={(e) =>
                setEmployeeSearchFilter({
                  ...employeeSearchFilter,
                  department: e.target.value,
                })
              }
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">전체 부서</option>
              {COMPANY_STANDARDS.DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <select
              value={employeeSearchFilter.subDepartment}
              onChange={(e) =>
                setEmployeeSearchFilter({
                  ...employeeSearchFilter,
                  subDepartment: e.target.value,
                })
              }
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">전체 세부부서</option>
              {COMPANY_STANDARDS.SUB_DEPARTMENTS.map((subDept) => (
                <option key={subDept} value={subDept}>
                  {subDept}
                </option>
              ))}
            </select>
            <select
              value={employeeSearchFilter.role}
              onChange={(e) =>
                setEmployeeSearchFilter({
                  ...employeeSearchFilter,
                  role: e.target.value,
                })
              }
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">전체 직책</option>
              {COMPANY_STANDARDS.ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <select
              value={employeeSearchFilter.workType}
              onChange={(e) =>
                setEmployeeSearchFilter({
                  ...employeeSearchFilter,
                  workType: e.target.value,
                })
              }
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">전체 근무형태</option>
              {COMPANY_STANDARDS.WORK_TYPES.map((workType) => (
                <option key={workType} value={workType}>
                  {workType}
                </option>
              ))}
            </select>
            <select
              value={employeeSearchFilter.payType}
              onChange={(e) =>
                setEmployeeSearchFilter({
                  ...employeeSearchFilter,
                  payType: e.target.value,
                })
              }
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">전체 급여형태</option>
              {COMPANY_STANDARDS.PAY_TYPES.map((payType) => (
                <option key={payType} value={payType}>
                  {payType}
                </option>
              ))}
            </select>
            <select
              value={employeeSearchFilter.status}
              onChange={(e) =>
                setEmployeeSearchFilter({
                  ...employeeSearchFilter,
                  status: e.target.value,
                })
              }
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">전체 상태</option>
              <option value="재직">재직</option>
              <option value="휴직">휴직</option>
              <option value="퇴사">퇴사</option>
            </select>
            <input
              type="text"
              placeholder="사번 또는 이름 검색"
              value={employeeSearchFilter.name}
              onChange={(e) =>
                setEmployeeSearchFilter({
                  ...employeeSearchFilter,
                  name: e.target.value,
                })
              }
              className="px-3 py-2 border rounded-lg"
            />
          </div>

          {/* 직원 테이블 */}
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="text-center py-2 px-1">
                    사번
                    <button
                      onClick={() => handleSort('id')}
                      className={`ml-1 text-xs hover:text-gray-700 ${
                        employeeSortField === 'id'
                          ? 'text-blue-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {employeeSortField === 'id'
                        ? employeeSortOrder === 'asc'
                          ? '▲'
                          : '▼'
                        : '▼'}
                    </button>
                  </th>
                  <th className="text-center py-2 px-1">
                    이름
                    <button
                      onClick={() => handleSort('name')}
                      className={`ml-1 text-xs hover:text-gray-700 ${
                        employeeSortField === 'name'
                          ? 'text-blue-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {employeeSortField === 'name'
                        ? employeeSortOrder === 'asc'
                          ? '▲'
                          : '▼'
                        : '▼'}
                    </button>
                  </th>
                  <th className="text-center py-2 px-1">
                    직급
                    <button
                      onClick={() => handleSort('position')}
                      className={`ml-1 text-xs hover:text-gray-700 ${
                        employeeSortField === 'position'
                          ? 'text-blue-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {employeeSortField === 'position'
                        ? employeeSortOrder === 'asc'
                          ? '▲'
                          : '▼'
                        : '▼'}
                    </button>
                  </th>
                  <th className="text-center py-2 px-1">
                    부서
                    <button
                      onClick={() => handleSort('department')}
                      className={`ml-1 text-xs hover:text-gray-700 ${
                        employeeSortField === 'department'
                          ? 'text-blue-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {employeeSortField === 'department'
                        ? employeeSortOrder === 'asc'
                          ? '▲'
                          : '▼'
                        : '▼'}
                    </button>
                  </th>
                  <th className="text-center py-2 px-1 whitespace-nowrap leading-none text-xs md:text-[12px] min-w-[80px]">
                    세부부서
                    <button
                      onClick={() => handleSort('subDepartment')}
                      className={`ml-1 text-xs hover:text-gray-700 ${
                        employeeSortField === 'subDepartment'
                          ? 'text-blue-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {employeeSortField === 'subDepartment'
                        ? employeeSortOrder === 'asc'
                          ? '▲'
                          : '▼'
                        : '▼'}
                    </button>
                  </th>
                  <th className="text-center py-2 px-1">
                    직책
                    <button
                      onClick={() => handleSort('role')}
                      className={`ml-1 text-xs hover:text-gray-700 ${
                        employeeSortField === 'role'
                          ? 'text-blue-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {employeeSortField === 'role'
                        ? employeeSortOrder === 'asc'
                          ? '▲'
                          : '▼'
                        : '▼'}
                    </button>
                  </th>
                  <th className="text-center py-2 px-1 whitespace-nowrap leading-none text-xs md:text-[12px] min-w-[80px]">
                    근무형태
                    <button
                      onClick={() => handleSort('workType')}
                      className={`ml-1 text-xs hover:text-gray-700 ${
                        employeeSortField === 'workType'
                          ? 'text-blue-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {employeeSortField === 'workType'
                        ? employeeSortOrder === 'asc'
                          ? '▲'
                          : '▼'
                        : '▼'}
                    </button>
                  </th>
                  <th className="text-center py-2 px-1 whitespace-nowrap leading-none text-xs md:text-[12px] min-w-[80px]">
                    급여형태
                    <button
                      onClick={() => handleSort('payType')}
                      className={`ml-1 text-xs hover:text-gray-700 ${
                        employeeSortField === 'payType'
                          ? 'text-blue-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {employeeSortField === 'payType'
                        ? employeeSortOrder === 'asc'
                          ? '▲'
                          : '▼'
                        : '▼'}
                    </button>
                  </th>
                  <th className="text-center py-2 px-1 whitespace-nowrap leading-none text-xs md:text-[12px] min-w-[80px]">
                    계약형태
                    <button
                      onClick={() => handleSort('contractType')}
                      className={`ml-1 text-xs hover:text-gray-700 ${
                        employeeSortField === 'contractType'
                          ? 'text-blue-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {employeeSortField === 'contractType'
                        ? employeeSortOrder === 'asc'
                          ? '▲'
                          : '▼'
                        : '▼'}
                    </button>
                  </th>
                  <th className="text-center py-2 px-1">
                    입사일
                    <button
                      onClick={() => handleSort('joinDate')}
                      className={`ml-1 text-xs hover:text-gray-700 ${
                        employeeSortField === 'joinDate'
                          ? 'text-blue-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {employeeSortField === 'joinDate'
                        ? employeeSortOrder === 'asc'
                          ? '▲'
                          : '▼'
                        : '▼'}
                    </button>
                  </th>
                  <th className="text-center py-2 px-1">
                    퇴사일
                    <button
                      onClick={() => handleSort('resignDate')}
                      className={`ml-1 text-xs hover:text-gray-700 ${
                        employeeSortField === 'resignDate'
                          ? 'text-blue-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {employeeSortField === 'resignDate'
                        ? employeeSortOrder === 'asc'
                          ? '▲'
                          : '▼'
                        : '▼'}
                    </button>
                  </th>
                  <th className="text-center py-2 px-1">
                    근속년수
                    <button
                      onClick={() => handleSort('workPeriod')}
                      className={`ml-1 text-xs hover:text-gray-700 ${
                        employeeSortField === 'workPeriod'
                          ? 'text-blue-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {employeeSortField === 'workPeriod'
                        ? employeeSortOrder === 'asc'
                          ? '▲'
                          : '▼'
                        : '▼'}
                    </button>
                  </th>
                  <th className="text-center py-2 px-1">
                    상태
                    <button
                      onClick={() => handleSort('status')}
                      className={`ml-1 text-xs hover:text-gray-700 ${
                        employeeSortField === 'status'
                          ? 'text-blue-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {employeeSortField === 'status'
                        ? employeeSortOrder === 'asc'
                          ? '▲'
                          : '▼'
                        : '▼'}
                    </button>
                  </th>
                  <th className="text-center py-2 px-1">
                    연락처
                    <button
                      onClick={() => handleSort('phone')}
                      className={`ml-1 text-xs hover:text-gray-700 ${
                        employeeSortField === 'phone'
                          ? 'text-blue-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {employeeSortField === 'phone'
                        ? employeeSortOrder === 'asc'
                          ? '▲'
                          : '▼'
                        : '▼'}
                    </button>
                  </th>
                  <th className="text-center py-2 px-1">
                    주소
                    <button
                      onClick={() => handleSort('address')}
                      className={`ml-1 text-xs hover:text-gray-700 ${
                        employeeSortField === 'address'
                          ? 'text-blue-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {employeeSortField === 'address'
                        ? employeeSortOrder === 'asc'
                          ? '▲'
                          : '▼'
                        : '▼'}
                    </button>
                  </th>
                  <th className="text-center py-2 px-1">
                    비밀번호
                    <button
                      onClick={() => handleSort('password')}
                      className={`ml-1 text-xs hover:text-gray-700 ${
                        employeeSortField === 'password'
                          ? 'text-blue-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {employeeSortField === 'password'
                        ? employeeSortOrder === 'asc'
                          ? '▲'
                          : '▼'
                        : '▼'}
                    </button>
                  </th>
                  <th className="text-center py-2 px-1">
                    마지막 로그인
                    <button
                      onClick={() => handleSort('lastLogin')}
                      className={`ml-1 text-xs hover:text-gray-700 ${
                        employeeSortField === 'lastLogin'
                          ? 'text-blue-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {employeeSortField === 'lastLogin'
                        ? employeeSortOrder === 'asc'
                          ? '▲'
                          : '▼'
                        : '▼'}
                    </button>
                  </th>
                  <th className="text-center py-2 px-1">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {getSortedEmployees(
                  employees.filter(
                    (emp) =>
                      (!employeeSearchFilter.position ||
                        (emp.position &&
                          emp.position === employeeSearchFilter.position)) &&
                      (!employeeSearchFilter.role ||
                        (emp.role && emp.role === employeeSearchFilter.role)) &&
                      (!employeeSearchFilter.name ||
                        (emp.id &&
                          emp.id.includes(employeeSearchFilter.name)) ||
                        (emp.name &&
                          emp.name.includes(employeeSearchFilter.name))) &&
                      (!employeeSearchFilter.department ||
                        emp.department === employeeSearchFilter.department) &&
                      (!employeeSearchFilter.subDepartment ||
                        emp.subDepartment ===
                          employeeSearchFilter.subDepartment) &&
                      (!employeeSearchFilter.payType ||
                        emp.payType === employeeSearchFilter.payType) &&
                      (!employeeSearchFilter.workType ||
                        (employeeSearchFilter.workType === '주간/야간'
                          ? getActualWorkType(emp.id) === '주간/야간'
                          : getActualWorkType(emp.id) ===
                              employeeSearchFilter.workType ||
                            (!getActualWorkType(emp.id) &&
                              emp.workType ===
                                employeeSearchFilter.workType))) &&
                      (!employeeSearchFilter.status ||
                        (emp.status || '재직') === employeeSearchFilter.status)
                  )
                ).map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    {editingEmpId === emp.id ? (
                      <td className="text-center py-1 px-2">
                        <input
                          className="border rounded px-2 py-1 w-16 min-w-16 text-center"
                          value={editForm.id}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              id: e.target.value,
                            }))
                          }
                        />
                      </td>
                    ) : (
                      <td className="text-center py-1 px-2">{emp.id}</td>
                    )}
                    {editingEmpId === emp.id ? (
                      <td className="text-center py-1 px-2">
                        <input
                          className="border rounded px-2 py-1 w-20 min-w-20 text-center"
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              name: e.target.value,
                            }))
                          }
                        />
                      </td>
                    ) : (
                      <td className="text-center py-1 px-2">{emp.name}</td>
                    )}
                    {editingEmpId === emp.id ? (
                      <td className="text-center py-1 px-2">
                        <select
                          className="border rounded px-2 py-1 w-17 min-w-17 text-center"
                          value={editForm.position}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              position: e.target.value,
                            }))
                          }
                        >
                          {COMPANY_STANDARDS.POSITIONS.map((pos) => (
                            <option key={pos} value={pos}>
                              {pos}
                            </option>
                          ))}
                        </select>
                      </td>
                    ) : (
                      <td className="text-center py-1 px-2">
                        {emp.position || '사원'}
                      </td>
                    )}
                    {editingEmpId === emp.id ? (
                      <td className="text-center py-1 px-2">
                        <select
                          className="border rounded px-2 py-1 w-17 min-w-17 text-center"
                          value={editForm.department}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              department: e.target.value,
                            }))
                          }
                        >
                          {COMPANY_STANDARDS.DEPARTMENTS.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </select>
                      </td>
                    ) : (
                      <td className="text-center py-1 px-2">
                        {emp.department}
                      </td>
                    )}
                    {editingEmpId === emp.id ? (
                      <td className="text-center py-1 px-2">
                        <select
                          className="border rounded px-2 py-1 w-17 min-w-17 text-center text-xs"
                          value={editForm.subDepartment || ''}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              subDepartment: e.target.value,
                            }))
                          }
                        >
                          <option value="">선택</option>
                          {COMPANY_STANDARDS.SUB_DEPARTMENTS.map((subDept) => (
                            <option key={subDept} value={subDept}>
                              {subDept}
                            </option>
                          ))}
                        </select>
                      </td>
                    ) : (
                      <td className="text-center py-1 px-2 w-14 max-w-14 whitespace-nowrap">
                        {emp.subDepartment || '-'}
                      </td>
                    )}
                    {editingEmpId === emp.id ? (
                      <td className="text-center py-1 px-2">
                        <select
                          className="border rounded px-2 py-1 w-15 min-w-15 text-center"
                          value={editForm.role || '팀원'}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              role: e.target.value,
                            }))
                          }
                        >
                          {COMPANY_STANDARDS.ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </td>
                    ) : (
                      <td className="text-center py-1 px-2">
                        {emp.role || '팀원'}
                      </td>
                    )}
                    {editingEmpId === emp.id ? (
                      <td className="text-center py-1 px-2">
                        <select
                          className="border rounded px-2 py-1 w-15 min-w-15 text-center"
                          value={editForm.workType || '주간'}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              workType: e.target.value,
                            }))
                          }
                        >
                          {COMPANY_STANDARDS.WORK_TYPES.map((workType) => (
                            <option key={workType} value={workType}>
                              {workType}
                            </option>
                          ))}
                        </select>
                      </td>
                    ) : (
                      <td className="text-center py-1 px-2 w-14 max-w-14 whitespace-nowrap">
                        {getWorkTypeDisplay(emp)}
                      </td>
                    )}
                    {editingEmpId === emp.id ? (
                      <td className="text-center py-1 px-2">
                        <select
                          className="border rounded px-2 py-1 w-15 min-w-15 text-center text-xs"
                          value={editForm.payType || ''}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              payType: e.target.value,
                            }))
                          }
                        >
                          <option value="">선택</option>
                          {COMPANY_STANDARDS.PAY_TYPES.map((payType) => (
                            <option key={payType} value={payType}>
                              {payType}
                            </option>
                          ))}
                        </select>
                      </td>
                    ) : (
                      <td className="text-center py-1 px-2 w-14 max-w-14 whitespace-nowrap">
                        {emp.payType || '-'}
                      </td>
                    )}
                    {editingEmpId === emp.id ? (
                      <td className="text-center py-1 px-2 w-14 max-w-14">
                        <select
                          className="border rounded px-2 py-1 w-20 text-xs"
                          value={editForm.contractType || '정규직'}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              contractType: e.target.value,
                            }))
                          }
                        >
                          <option value="정규직">정규직</option>
                          <option value="계약직">계약직</option>
                          <option value="촉탁직">촉탁직</option>
                        </select>
                      </td>
                    ) : (
                      <td className="text-center py-1 px-2 w-14 max-w-14 whitespace-nowrap">
                        {emp.contractType || '정규직'}
                      </td>
                    )}
                    {editingEmpId === emp.id ? (
                      <td className="text-center py-1 px-2">
                        <input
                          type="date"
                          className="border rounded px-2 py-1 w-28 min-w-28 text-center"
                          value={editForm.joinDate}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              joinDate: e.target.value,
                            }))
                          }
                        />
                      </td>
                    ) : (
                      <td className="text-center py-1 px-2">{emp.joinDate}</td>
                    )}
                    {editingEmpId === emp.id ? (
                      <td className="text-center py-1 px-2">
                        <input
                          type="date"
                          className="border rounded px-2 py-1 w-28 min-w-28 text-center"
                          value={editForm.resignDate || ''}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              resignDate: e.target.value,
                            }))
                          }
                        />
                      </td>
                    ) : (
                      <td className="text-center py-1 px-2">
                        {emp.resignDate || '-'}
                      </td>
                    )}
                    <td className="text-center py-1 px-2 w-28 max-w-28 whitespace-nowrap">
                      {getWorkPeriodText(emp.joinDate)}
                    </td>
                    {editingEmpId === emp.id ? (
                      <td className="text-center py-1 px-2">
                        <select
                          className="border rounded px-2 py-1 w-15 min-w-15 text-center"
                          value={editForm.status}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              status: e.target.value,
                            }))
                          }
                        >
                          <option value="재직">재직</option>
                          <option value="휴직">휴직</option>
                          <option value="퇴사">퇴사</option>
                        </select>
                      </td>
                    ) : (
                      <td className="text-center py-1 px-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            (emp.status || '재직') === '재직'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {emp.status || '재직'}
                        </span>
                      </td>
                    )}
                    {editingEmpId === emp.id ? (
                      <td className="text-center py-1 px-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="tel"
                            className="border rounded px-2 py-1 w-[100px] min-w-[100px] text-center text-xs"
                            value={editForm.phone}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                phone: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </td>
                    ) : (
                      <td className="text-center py-1 px-2">
                        {emp.phone || ''}
                      </td>
                    )}
                    {editingEmpId === emp.id ? (
                      <td className="text-center py-1 px-2">
                        <textarea
                          rows={1}
                          className="border rounded px-2 py-1 min-w-[220px] max-w-[500px] min-h-[32px] resize-none text-center text-xs"
                          style={{
                            height: '32px',
                            width: '220px',
                            overflow: 'hidden',
                          }}
                          value={editForm.address}
                          onChange={(e) => {
                            setEditForm((f) => ({
                              ...f,
                              address: e.target.value,
                            }));

                            // 자동 높이 조절
                            e.target.style.height = '32px';
                            e.target.style.height =
                              e.target.scrollHeight + 'px';

                            // 자동 너비 조절 (내용 길이에 맞춰)
                            const lines = e.target.value.split('\n');
                            const maxLineLength = Math.max(
                              ...lines.map((line) => line.length),
                              0
                            );

                            // 한 글자당 약 7px로 계산 (text-xs 기준)
                            const estimatedWidth = Math.max(
                              220,
                              Math.min(500, maxLineLength * 7 + 40)
                            );
                            e.target.style.width = estimatedWidth + 'px';
                          }}
                          onInput={(e) => {
                            // 자동 높이 조절
                            e.target.style.height = '32px';
                            e.target.style.height =
                              e.target.scrollHeight + 'px';

                            // 자동 너비 조절
                            const lines = e.target.value.split('\n');
                            const maxLineLength = Math.max(
                              ...lines.map((line) => line.length),
                              0
                            );

                            const estimatedWidth = Math.max(
                              220,
                              Math.min(500, maxLineLength * 7 + 40)
                            );
                            e.target.style.width = estimatedWidth + 'px';
                          }}
                          onFocus={(e) => {
                            // 포커스 시 초기 크기 조정
                            e.target.style.height = '32px';
                            e.target.style.height =
                              e.target.scrollHeight + 'px';

                            const lines = e.target.value.split('\n');
                            const maxLineLength = Math.max(
                              ...lines.map((line) => line.length),
                              0
                            );
                            const estimatedWidth = Math.max(
                              220,
                              Math.min(500, maxLineLength * 7 + 40)
                            );
                            e.target.style.width = estimatedWidth + 'px';
                          }}
                        />
                      </td>
                    ) : (
                      <td className="text-center py-1 px-2 w-64 max-w-64 whitespace-nowrap overflow-hidden text-ellipsis">
                        {emp.address || ''}
                      </td>
                    )}
                    {editingEmpId === emp.id ? (
                      <td className="text-center py-1 px-2">
                        <input
                          type="text"
                          className="border rounded px-2 py-1 w-20 min-w-20 text-center"
                          value={editForm.password}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              password: e.target.value,
                            }))
                          }
                        />
                      </td>
                    ) : (
                      <td className="text-center py-1 px-2">****</td>
                    )}
                    <td className="text-center py-1 px-2 text-gray-600 text-xs">
                      {emp.lastLogin
                        ? (() => {
                            // DB에서 가져온 UTC 시간을 KST(Asia/Seoul)로 변환하여 표시
                            const date = new Date(emp.lastLogin);
                            // toLocaleString으로 KST 기준 시간 문자열 생성 후 다시 Date로 파싱
                            const kstDate = new Date(
                              date.toLocaleString('en-US', {
                                timeZone: 'Asia/Seoul',
                              })
                            );
                            const yy = String(kstDate.getFullYear()).slice(-2);
                            const mm = String(kstDate.getMonth() + 1).padStart(
                              2,
                              '0'
                            );
                            const dd = String(kstDate.getDate()).padStart(
                              2,
                              '0'
                            );
                            const hh = String(kstDate.getHours()).padStart(
                              2,
                              '0'
                            );
                            const min = String(kstDate.getMinutes()).padStart(
                              2,
                              '0'
                            );
                            return `${yy}-${mm}-${dd} ${hh}:${min}`;
                          })()
                        : '-'}
                    </td>
                    <td className="text-center py-1 px-2">
                      <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap justify-center">
                        {editingEmpId === emp.id ? (
                          <>
                            <button
                              className="inline-flex items-center px-2 py-1 bg-blue-500 text-white rounded text-xs mr-1 hover:bg-blue-600"
                              onClick={() => {
                                handleUpdateEmployee(emp.id, editForm);
                                setEditingEmpId(null);
                              }}
                            >
                              저장
                            </button>
                            <button
                              className="inline-flex items-center px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                              onClick={() => {
                                setEditingEmpId(null);
                                setEditForm({
                                  id: '',
                                  name: '',
                                  position: '',
                                  department: '',
                                  subDepartment: '',
                                  role: '',
                                  payType: '',
                                  contractType: '정규직',
                                  workType: '주간',
                                  joinDate: '',
                                  resignDate: '',
                                  status: '',
                                  phone: '',
                                  address: '',
                                  password: '',
                                });
                              }}
                            >
                              취소
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingEmpId(emp.id);
                                setEditForm({
                                  id: emp.id,
                                  name: emp.name,
                                  position: emp.position || '사원',
                                  department: emp.department,
                                  subDepartment: emp.subDepartment || '',
                                  role: emp.role || '팀원',
                                  payType: emp.payType || '',
                                  contractType: emp.contractType || '정규직',
                                  joinDate: emp.joinDate || '',
                                  resignDate: emp.resignDate || '',
                                  workType: emp.workType || '주간',
                                  status: emp.status || '재직',
                                  phone: emp.phone || '',
                                  address: emp.address || '',
                                  password: emp.password || '',
                                });
                              }}
                              className="inline-flex items-center px-1 py-1 bg-blue-100 text-blue-700 rounded text-xs mr-1 hover:bg-blue-200"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDeleteEmployee(emp.id)}
                              className="inline-flex items-center px-1 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                            >
                              삭제
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 신규 직원 등록 모달 */}
      {showNewEmployeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 pb-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">
                신규 직원 등록
              </h3>
              <button
                onClick={() => setShowNewEmployeeModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <input
                type="text"
                placeholder="사번"
                value={newEmployee.id}
                onChange={(e) =>
                  setNewEmployee({ ...newEmployee, id: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="이름"
                value={newEmployee.name}
                onChange={(e) =>
                  setNewEmployee({ ...newEmployee, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <select
                value={newEmployee.position}
                onChange={(e) =>
                  setNewEmployee({
                    ...newEmployee,
                    position: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">직급 선택</option>
                {COMPANY_STANDARDS.POSITIONS.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </select>
              <select
                value={newEmployee.department}
                onChange={(e) =>
                  setNewEmployee({
                    ...newEmployee,
                    department: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">부서 선택</option>
                {COMPANY_STANDARDS.DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              <select
                value={newEmployee.subDepartment}
                onChange={(e) =>
                  setNewEmployee({
                    ...newEmployee,
                    subDepartment: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">세부부서 선택</option>
                {COMPANY_STANDARDS.SUB_DEPARTMENTS.map((subDept) => (
                  <option key={subDept} value={subDept}>
                    {subDept}
                  </option>
                ))}
              </select>
              <select
                value={newEmployee.role}
                onChange={(e) =>
                  setNewEmployee({ ...newEmployee, role: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">직책 선택</option>
                {COMPANY_STANDARDS.ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <select
                value={newEmployee.workType}
                onChange={(e) =>
                  setNewEmployee({
                    ...newEmployee,
                    workType: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">근무형태 선택</option>
                {COMPANY_STANDARDS.WORK_TYPES.map((workType) => (
                  <option key={workType} value={workType}>
                    {workType}
                  </option>
                ))}
              </select>
              <select
                value={newEmployee.payType}
                onChange={(e) =>
                  setNewEmployee({
                    ...newEmployee,
                    payType: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">급여형태 선택</option>
                {COMPANY_STANDARDS.PAY_TYPES.map((payType) => (
                  <option key={payType} value={payType}>
                    {payType}
                  </option>
                ))}
              </select>
              <select
                value={newEmployee.contractType || '정규직'}
                onChange={(e) =>
                  setNewEmployee({
                    ...newEmployee,
                    contractType: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="정규직">정규직</option>
                <option value="계약직">계약직</option>
                <option value="촉탁직">촉탁직</option>
              </select>
              <input
                type="date"
                placeholder="입사일"
                value={newEmployee.joinDate}
                onChange={(e) =>
                  setNewEmployee({
                    ...newEmployee,
                    joinDate: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="tel"
                placeholder="전화번호"
                value={newEmployee.phone}
                onChange={(e) =>
                  setNewEmployee({ ...newEmployee, phone: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="주소"
                value={newEmployee.address}
                onChange={(e) =>
                  setNewEmployee({
                    ...newEmployee,
                    address: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="p-6 pt-0 flex space-x-3">
              <button
                onClick={() => setShowNewEmployeeModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() =>
                  handleRegisterEmployee(
                    newEmployee,
                    setNewEmployee,
                    setShowNewEmployeeModal
                  )
                }
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminEmployeeManagement;
