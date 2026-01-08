/**
 * [2_관리자 모드] 2.2_직원 관리 통합 모듈
 * - Hook → Util → Export
 * - UI 컴포넌트 제외, 지원 로직만 포함
 */

import { useCallback } from 'react';
import * as CommonDownloadService from './common_common_downloadservice';
import { getWorkPeriodText } from './common_common';

// ============================================================
// [2_관리자 모드] 2.2_직원 관리 - HOOKS
// ============================================================

export const useEmployeeManagement = (dependencies = {}) => {
  const {
    employees = [],
    setEmployees = () => {},
    setLeaveRequests = () => {},
    setAttendanceData = () => {},
    setSuggestions = () => {},
    setEvaluationData = () => {},
    setEvaluations = () => {},
    employeeSortField = '',
    setEmployeeSortField = () => {},
    employeeSortOrder = 'asc',
    setEmployeeSortOrder = () => {},
  } = dependencies;

  // [2_관리자 모드] 2.2_직원 관리 - 직원 정보 업데이트
  const handleUpdateEmployee = useCallback(
    async (employeeId, updatedData) => {
      try {
        // DB에 저장
        const { default: EmployeeAPI } = await import('../../api/employee');

        const employeePayload = {
          employeeId: updatedData.id,
          name: updatedData.name,
          position: updatedData.position,
          department: updatedData.department,
          status: updatedData.status || '재직',
        };

        // 선택적 필드는 값이 있을 때만 추가
        if (updatedData.subDepartment)
          employeePayload.subDepartment = updatedData.subDepartment;
        if (updatedData.role) employeePayload.role = updatedData.role;
        if (updatedData.payType)
          employeePayload.salaryType = updatedData.payType;
        if (updatedData.workType)
          employeePayload.workType = updatedData.workType;
        if (updatedData.contractType)
          employeePayload.contractType = updatedData.contractType;
        if (updatedData.joinDate)
          employeePayload.joinDate = updatedData.joinDate;
        if (updatedData.resignDate)
          employeePayload.leaveDate = updatedData.resignDate;
        if (updatedData.phone) employeePayload.phone = updatedData.phone;
        if (updatedData.address) employeePayload.address = updatedData.address;

        // 비밀번호는 항상 포함 (변경 여부와 관계없이)
        if (updatedData.password !== undefined) {
          employeePayload.password = updatedData.password;
        }

        const response = await EmployeeAPI.update(employeeId, employeePayload);

        // DB에서 받은 최신 데이터로 state 업데이트
        const savedEmployee = response.data;
        const updatedEmployees = employees.map((emp) =>
          emp.id === employeeId
            ? {
                ...emp,
                id: savedEmployee.employeeId,
                name: savedEmployee.name,
                position: savedEmployee.position,
                department: savedEmployee.department,
                subDepartment: savedEmployee.subDepartment || '',
                role: savedEmployee.role || '',
                payType: savedEmployee.salaryType || '',
                workType: savedEmployee.workType || '',
                contractType: savedEmployee.contractType || '정규',
                joinDate: savedEmployee.joinDate
                  ? (() => {
                      const d = new Date(savedEmployee.joinDate);
                      const year = d.getFullYear();
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      return `${year}-${month}-${day}`;
                    })()
                  : '',
                resignDate:
                  savedEmployee.leaveDate &&
                  savedEmployee.leaveDate !== '1970-01-01T00:00:00.000Z'
                    ? (() => {
                        const d = new Date(savedEmployee.leaveDate);
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                      })()
                    : '',
                status: savedEmployee.status,
                phone: savedEmployee.phone || '',
                address: savedEmployee.address || '',
                password: updatedData.password || emp.password,
                lastLogin: savedEmployee.lastLogin, // 마지막 로그인 시각
              }
            : emp
        );
        setEmployees(updatedEmployees);
      } catch (error) {
        console.error('❌ 직원 정보 수정 실패:', error);
        alert(`직원 정보 수정 중 오류가 발생했습니다: ${error.message}`);
        throw error;
      }

      setLeaveRequests((prev) =>
        prev.map((lv) =>
          lv.employeeId === employeeId
            ? {
                ...lv,
                employeeId: updatedData.id,
                name: updatedData.name,
                position: updatedData.position,
                department: updatedData.department,
              }
            : lv
        )
      );

      setAttendanceData((prev) =>
        prev.map((at) =>
          at.employeeId === employeeId
            ? {
                ...at,
                employeeId: updatedData.id,
                name: updatedData.name,
                position: updatedData.position,
                department: updatedData.department,
              }
            : at
        )
      );

      setSuggestions((prev) =>
        prev.map((sg) =>
          sg.employeeId === employeeId
            ? {
                ...sg,
                employeeId: updatedData.id,
                name: updatedData.name,
                position: updatedData.position,
                department: updatedData.department,
              }
            : sg
        )
      );

      setEvaluationData((prev) =>
        prev.map((pf) =>
          pf.employeeId === employeeId
            ? {
                ...pf,
                employeeId: updatedData.id,
                name: updatedData.name,
                department: updatedData.department,
              }
            : pf
        )
      );

      setEvaluations((prev) =>
        prev.map((ev) =>
          ev.employeeId === employeeId
            ? {
                ...ev,
                employeeId: updatedData.id,
                name: updatedData.name,
                position: updatedData.position,
                department: updatedData.department,
              }
            : ev
        )
      );

      // 직원 정보는 DB에서 관리하므로 localStorage 불필요
    },
    [
      employees,
      setEmployees,
      setLeaveRequests,
      setAttendanceData,
      setSuggestions,
      setEvaluationData,
      setEvaluations,
    ]
  );

  // [2_관리자 모드] 2.2_직원 관리 - 직원 목록 정렬
  const getSortedEmployees = useCallback(
    (employeeList) => {
      // 정렬 필드가 없으면 기본적으로 사번 오름차순 정렬
      if (!employeeSortField) {
        return [...employeeList].sort((a, b) => {
          const aId = (a.id || '').toString();
          const bId = (b.id || '').toString();
          return aId.localeCompare(bId);
        });
      }

      return [...employeeList].sort((a, b) => {
        let aVal, bVal;

        switch (employeeSortField) {
          case 'id':
            aVal = a.id;
            bVal = b.id;
            break;
          case 'name':
            aVal = a.name;
            bVal = b.name;
            break;
          case 'position':
            aVal = a.position || '사원';
            bVal = b.position || '사원';
            break;
          case 'department':
            aVal = a.department;
            bVal = b.department;
            break;
          case 'subDepartment':
            aVal = a.subDepartment || '';
            bVal = b.subDepartment || '';
            break;
          case 'role':
            aVal = a.role || '팀원';
            bVal = b.role || '팀원';
            break;
          case 'payType':
            aVal = a.payType || '';
            bVal = b.payType || '';
            break;
          case 'contractType':
            aVal = a.contractType || '정규직';
            bVal = b.contractType || '정규직';
            break;
          case 'joinDate':
            aVal = new Date(a.joinDate);
            bVal = new Date(b.joinDate);
            break;
          case 'workPeriod':
            aVal = new Date(a.joinDate || '9999-12-31');
            bVal = new Date(b.joinDate || '9999-12-31');
            break;
          case 'status':
            aVal = a.status || '재직';
            bVal = b.status || '재직';
            break;
          case 'phone':
            aVal = a.phone || '';
            bVal = b.phone || '';
            break;
          case 'address':
            aVal = a.address || '';
            bVal = b.address || '';
            break;
          case 'password':
            aVal = a.password || '';
            bVal = b.password || '';
            break;
          case 'lastLogin':
            aVal = a.lastLogin ? new Date(a.lastLogin) : new Date(0);
            bVal = b.lastLogin ? new Date(b.lastLogin) : new Date(0);
            break;
          default:
            return 0;
        }

        if (employeeSortField === 'workPeriod') {
          if (aVal < bVal) return employeeSortOrder === 'asc' ? 1 : -1; // 입사일이 오래된 것이 근속년수가 긴 것
          if (aVal > bVal) return employeeSortOrder === 'asc' ? -1 : 1;
        } else {
          if (aVal < bVal) return employeeSortOrder === 'asc' ? -1 : 1;
          if (aVal > bVal) return employeeSortOrder === 'asc' ? 1 : -1;
        }
        return 0;
      });
    },
    [employeeSortField, employeeSortOrder]
  );

  // [2_관리자 모드] 2.2_직원 관리 - 신규 직원 등록
  const handleRegisterEmployee = useCallback(
    async (newEmployee, setNewEmployee, setShowNewEmployeeModal) => {
      if (
        newEmployee.id &&
        newEmployee.name &&
        newEmployee.department &&
        newEmployee.joinDate
      ) {
        try {
          // DB에 저장
          const { default: EmployeeAPI } = await import('../../api/employee');

          // 연락처 마지막 4자리를 기본 비밀번호로 설정
          const defaultPassword = newEmployee.phone
            ? newEmployee.phone.slice(-4)
            : '1234';

          const employeePayload = {
            employeeId: newEmployee.id,
            name: newEmployee.name,
            phone: newEmployee.phone,
            department: newEmployee.department,
            subDepartment: newEmployee.subDepartment || '',
            position: newEmployee.position || '사원',
            role: newEmployee.role || '팀원',
            joinDate: newEmployee.joinDate,
            workType: newEmployee.workType || '주간',
            contractType: newEmployee.contractType || '정규',
            salaryType: newEmployee.payType || '시급',
            status: newEmployee.status || '재직',
            address: newEmployee.address || '',
          };

          const response = await EmployeeAPI.create(employeePayload);

          // 로컬 state 업데이트
          setEmployees([
            ...employees,
            { ...newEmployee, password: defaultPassword },
          ]);

          setNewEmployee({
            id: '',
            name: '',
            password: '1234',
            phone: '',
            department: '',
            joinDate: '',
            position: '',
            role: '',
            status: '재직',
            payType: '',
            contractType: '정규',
            workType: '주간',
            subDepartment: '',
          });
          setShowNewEmployeeModal(false);

          // 신규 직원 추가 시 마지막 갱신 시간 업데이트
          localStorage.setItem(
            'employeeDataLastRefresh',
            Date.now().toString()
          );

          alert('직원이 등록되었습니다.');
        } catch (error) {
          console.error('❌ 직원 등록 실패:', error);
          alert('직원 등록 중 오류가 발생했습니다.');
        }
      } else {
        alert('필수 항목을 모두 입력해주세요.');
      }
    },
    [employees, setEmployees]
  );

  // [2_관리자 모드] 2.2_직원 관리 - 직원 목록 정렬 핸들러
  const handleSort = useCallback(
    (field) => {
      if (employeeSortField === field) {
        setEmployeeSortOrder(employeeSortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setEmployeeSortField(field);
        setEmployeeSortOrder('asc');
      }
    },
    [
      employeeSortField,
      employeeSortOrder,
      setEmployeeSortField,
      setEmployeeSortOrder,
    ]
  );

  // [2_관리자 모드] 2.2_직원 관리 - 직원 삭제
  const handleDeleteEmployee = useCallback(
    async (employeeId) => {
      if (
        window.confirm(
          '정말 삭제하시겠습니까?\n\n관련된 모든 데이터(연차, 근태, 건의, 평가 등)도 함께 삭제됩니다.'
        )
      ) {
        try {
          // DB에서 삭제 (상태를 '퇴사'로 변경)
          const { default: EmployeeAPI } = await import('../../api/employee');
          await EmployeeAPI.delete(employeeId);

          // 로컬 state에서 삭제
          setEmployees(employees.filter((emp) => emp.id !== employeeId));

          // 관련 데이터 삭제
          setLeaveRequests((prev) =>
            prev.filter((lv) => lv.employeeId !== employeeId)
          );
          setAttendanceData((prev) =>
            prev.filter((at) => at.employeeId !== employeeId)
          );
          setSuggestions((prev) =>
            prev.filter((sg) => sg.employeeId !== employeeId)
          );
          setEvaluationData((prev) =>
            prev.filter((pf) => pf.employeeId !== employeeId)
          );
          setEvaluations((prev) =>
            prev.filter((ev) => ev.employeeId !== employeeId)
          );

          // 직원 정보 삭제 시 마지막 갱신 시간 업데이트
          localStorage.setItem(
            'employeeDataLastRefresh',
            Date.now().toString()
          );
        } catch (error) {
          console.error('❌ 직원 삭제 실패:', error);
          alert('직원 삭제 중 오류가 발생했습니다.');
        }
      }
    },
    [
      employees,
      setEmployees,
      setLeaveRequests,
      setAttendanceData,
      setSuggestions,
      setEvaluationData,
      setEvaluations,
    ]
  );

  return {
    handleSort,
    handleUpdateEmployee,
    handleDeleteEmployee,
    getSortedEmployees,
    handleRegisterEmployee,
  };
};

// ============================================================
// [2_관리자 모드] 2.2_직원 관리 - UTILS
// ============================================================

/**
 * 조직도 엑셀 다운로드 함수
 * @param {Array} employeeData - 직원 데이터 목록 (필터/정렬 적용된 데이터)
 */
export const exportOrganizationToXLSX = (employeeData) => {
  CommonDownloadService.exportOrganizationToXLSX(
    employeeData,
    getWorkPeriodText
  );
};

/**
 * 직원 목록 정렬
 * @param {Array} employeeList - 직원 목록
 * @param {string} employeeSortField - 정렬 필드
 * @param {string} employeeSortOrder - 정렬 순서 ('asc' or 'desc')
 * @returns {Array} 정렬된 직원 목록
 */
export const sortEmployees = (
  employeeList,
  employeeSortField,
  employeeSortOrder
) => {
  if (!employeeSortField) return employeeList;

  return [...employeeList].sort((a, b) => {
    let aVal, bVal;

    switch (employeeSortField) {
      case 'id':
        aVal = a.id;
        bVal = b.id;
        break;
      case 'name':
        aVal = a.name;
        bVal = b.name;
        break;
      case 'position':
        aVal = a.position || '사원';
        bVal = b.position || '사원';
        break;
      case 'department':
        aVal = a.department;
        bVal = b.department;
        break;
      case 'subDepartment':
        aVal = a.subDepartment || '';
        bVal = b.subDepartment || '';
        break;
      case 'role':
        aVal = a.role || '팀원';
        bVal = b.role || '팀원';
        break;
      case 'payType':
        aVal = a.payType || '';
        bVal = b.payType || '';
        break;
      case 'contractType':
        aVal = a.contractType || '정규직';
        bVal = b.contractType || '정규직';
        break;
      case 'joinDate':
        aVal = new Date(a.joinDate);
        bVal = new Date(b.joinDate);
        break;
      case 'workPeriod':
        aVal = new Date(a.joinDate || '9999-12-31');
        bVal = new Date(b.joinDate || '9999-12-31');
        break;
      case 'status':
        aVal = a.status || '재직';
        bVal = b.status || '재직';
        break;
      case 'phone':
        aVal = a.phone || '';
        bVal = b.phone || '';
        break;
      case 'address':
        aVal = a.address || '';
        bVal = b.address || '';
        break;
      case 'password':
        aVal = a.password || '';
        bVal = b.password || '';
        break;
      case 'lastLogin':
        aVal = a.lastLogin ? new Date(a.lastLogin) : new Date(0);
        bVal = b.lastLogin ? new Date(b.lastLogin) : new Date(0);
        break;
      default:
        return 0;
    }

    if (employeeSortField === 'workPeriod') {
      if (aVal < bVal) return employeeSortOrder === 'asc' ? 1 : -1; // 입사일이 오래된 것이 근속년수가 긴 것
      if (aVal > bVal) return employeeSortOrder === 'asc' ? -1 : 1;
    } else {
      if (aVal < bVal) return employeeSortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return employeeSortOrder === 'asc' ? 1 : -1;
    }
    return 0;
  });
};

// ============================================================
// [2_관리자 모드] 2.2_직원 관리 - EXPORTS (업데이트 전용)
// ============================================================

/**
 * EXPORTS:
 * - exportOrganizationToXLSX: 조직도 엑셀 다운로드 함수
 * - sortEmployees: 직원 목록 정렬 함수
 * - useEmployeeManagement: 직원 관리 Hook
 *   - handleUpdateEmployee: 직원 정보 업데이트
 *   - getSortedEmployees: 직원 목록 정렬
 *   - handleRegisterEmployee: 신규 직원 등록
 */
