/**
 * [2_관리자 모드] 2.9_급여 관리 통합 모듈
 * - Hook → Service → Util → Export
 * - UI 컴포넌트 제외, 지원 로직만 포함
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import CommonDownloadService from './common_common_downloadservice';
import PayrollAPI from '../../api/payroll';

// ============================================================
// [2_관리자 모드] 2.9_급여 관리 - HOOKS
// ============================================================

/**
 * 급여 관리 STATE 및 함수를 제공하는 커스텀 훅
 * @param {Object} dependencies - 외부 의존성 객체
 * @param {Array} dependencies.employees - 직원 목록
 * @param {Function} dependencies.setEmployees - 직원 목록 설정 함수
 * @param {Function} dependencies.logSystemEvent - 시스템 이벤트 로깅 함수
 * @param {Function} dependencies.devLog - 개발 로그 함수
 * @param {Function} dependencies.showUserNotification - 사용자 알림 함수
 * @param {Function} dependencies.send자동알림 - 자동 알림 발송 함수
 * @param {Object} dependencies.currentUser - 현재 사용자 정보
 * @returns {Object} 급여 관리 관련 STATE 및 함수들
 */
export const usePayrollManagement = (dependencies = {}) => {
  const {
    employees = [],
    setEmployees = () => {},
    logSystemEvent = () => {},
    devLog = console.log,
    showUserNotification = () => {},
    send자동알림 = () => {},
    currentUser = null,
  } = dependencies;
  // *[2_관리자 모드] 2.9.1_급여 검색 필터 STATE*
  const [payrollSearchFilter, setPayrollSearchFilter] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    name: '',
  });

  const [payrollValidationErrors, setPayrollValidationErrors] = useState({});

  // *[2_관리자 모드] 2.9.4_급여 해시 저장소 STATE*
  const [payrollHashes, setPayrollHashes] = useState(() => {
    try {
      const saved = localStorage.getItem('payrollHashes');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('급여 해시 로드 오류:', error);
      return {};
    }
  });

  // *[2_관리자 모드] 2.9.5_급여대장 테이블 STATE*
  const [payrollByMonth, setPayrollByMonth] = useState(() => {
    try {
      const saved = localStorage.getItem('payrollByMonth');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('급여 데이터 로드 오류:', error);
      return {};
    }
  });

  // *[2_관리자 모드] 2.9.5a_급여대장 월별 메타데이터 STATE (가시성 제어)*
  const [payrollMonthMetadata, setPayrollMonthMetadata] = useState(() => {
    try {
      const saved = localStorage.getItem('payrollMonthMetadata');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('급여 메타데이터 로드 오류:', error);
      return {};
    }
  });

  // *[2_관리자 모드] 2.9.6_현재 월 데이터*
  const payrollTableData = useMemo(() => {
    const currentKey = ymKey(
      payrollSearchFilter.year,
      payrollSearchFilter.month
    );
    return payrollByMonth[currentKey] || [];
  }, [payrollByMonth, payrollSearchFilter.year, payrollSearchFilter.month]);

  // *[2_관리자 모드] 2.9.7_월별 데이터 업데이트*
  const setPayrollTableData = useCallback(
    (newData, shouldSetVisible = true) => {
      const currentKey = ymKey(
        payrollSearchFilter.year,
        payrollSearchFilter.month
      );

      setPayrollByMonth((prev) => ({
        ...prev,
        [currentKey]:
          typeof newData === 'function'
            ? newData(prev[currentKey] || [])
            : newData,
      }));
      // 급여 데이터 저장 시 해당 월을 가시성 true로 설정 (shouldSetVisible이 true일 때만)
      if (shouldSetVisible) {
        setPayrollMonthMetadata((prev) => ({
          ...prev,
          [currentKey]: {
            isVisible: true,
            lastModified: new Date().toISOString(),
          },
        }));
      }
    },
    [payrollSearchFilter.year, payrollSearchFilter.month]
  );

  const [editingPayrollCell, setEditingPayrollCell] = useState(null);
  const [isPayrollEditMode, setIsPayrollEditMode] = useState(false);

  // *[2_관리자 모드] 2.9.8_기본시간 관리*
  const [defaultHours, setDefaultHours] = useState(209);

  const handleEditHours = (value) => {
    const num = parseInt(value);
    if (!isNaN(num) && num > 0) setDefaultHours(num);
  };

  // *[2_관리자 모드] 2.9.9_기본시간 일괄 적용*
  const applyDefaultHoursToTable = () => {
    const updatedData = payrollTableData.map((row) => {
      const hourlyWage = parseFloat(row.시급) || 0;
      return {
        ...row,
        기본시간: defaultHours,
        기본급: Math.round(hourlyWage * defaultHours),
      };
    });
    setPayrollTableData(updatedData);

    alert(`모든 직원의 기본시간이 ${defaultHours}시간으로 설정되었습니다.`);
  };

  // 급여 데이터는 state로만 관리 (localStorage 불필요)

  // [2_관리자 모드] 2.9_급여 관리 - 급여대장 초기화
  const initializePayrollTable = useCallback(() => {
    devLog('📋 급여대장 자동 생성 시작...');

    const currentYear = payrollSearchFilter.year || new Date().getFullYear();
    const currentMonth = payrollSearchFilter.month || new Date().getMonth() + 1;

    const activeEmployees = employees.filter((emp) => {
      // 재직 중인 직원만
      if (emp.status !== '재직') return false;

      // 입사월 이후인지 확인
      if (emp.joinDate) {
        const joinDate = new Date(emp.joinDate);
        const joinYear = joinDate.getFullYear();
        const joinMonth = joinDate.getMonth() + 1;

        // 입사월 이전이면 제외
        if (
          currentYear < joinYear ||
          (currentYear === joinYear && currentMonth < joinMonth)
        ) {
          return false;
        }
      }

      // 퇴사월 이전인지 확인
      if (emp.leaveDate) {
        const leaveDate = new Date(emp.leaveDate);
        const leaveYear = leaveDate.getFullYear();
        const leaveMonth = leaveDate.getMonth() + 1;

        // 퇴사월 이후면 제외
        if (
          currentYear > leaveYear ||
          (currentYear === leaveYear && currentMonth > leaveMonth)
        ) {
          return false;
        }
      }

      return true;
    });

    const newPayrollData = activeEmployees.map((emp) => {
      return {
        지급년도: currentYear,
        지급월: currentMonth,
        성명: emp.name,
        부서: emp.department || '미정',
        세부부서: emp.subDepartment || '',
        직급: emp.position || '사원',
        직책: emp.role || '팀원',
        급여형태: emp.payType || '시급',
        입사일자: emp.joinDate || emp.hireDate || '미정',
        근무형태: emp.workType || '주간',
        시급: emp.hourlyWage || emp.salary || 0,
        기본시간: defaultHours,
        기본급: Math.round((emp.hourlyWage || emp.salary || 0) * defaultHours),
        연장수당_시간: 0,
        연장수당_금액: 0,
        휴일근로수당_시간: 0,
        휴일근로수당_금액: 0,
        야간근로수당_시간: 0,
        야간근로수당_금액: 0,
        교통비: 0,
        통신비: 0,
        기타수당: 0,
        년차수당_시간: 0,
        년차수당_금액: 0,
        상여금: 0,
        급여합계: Math.round(
          (emp.hourlyWage || emp.salary || 0) * defaultHours
        ),
        소득세: 0,
        지방세: 0,
        국민연금: 0,
        건강보험: 0,
        장기요양: 0,
        고용보험: 0,
        공제합계: 0,
        차인지급액: Math.round(
          (emp.hourlyWage || emp.salary || 0) * defaultHours
        ),
        결근무휴: 0,
        년차: 0,
        지각조퇴외출: 0,
        지급유형: '정규',
        은행: emp.bank || '',
        계좌번호: emp.account || '',
        비고: '자동 생성',
      };
    });

    setPayrollTableData(newPayrollData, false); // 자동 생성 시에는 isVisible을 설정하지 않음

    devLog(
      `✅ ${activeEmployees.length}명의 재직 중인 직원에 대한 급여대장이 자동 생성되었습니다.`
    );
  }, [
    employees,
    payrollSearchFilter,
    defaultHours,
    setPayrollTableData,
    logSystemEvent,
    devLog,
  ]);

  // [2_관리자 모드] 2.9_급여 관리 - 급여대장 셀 수정
  const updatePayrollCell = useCallback(
    (rowIndex, field, value) => {
      const newData = [...payrollTableData];
      if (newData[rowIndex]) {
        const isNumberField = [
          '시급',
          '기본시간',
          '기본급',
          '연장수당_시간',
          '연장수당_금액',
          '휴일근로수당_시간',
          '휴일근로수당_금액',
          '야간근로수당_시간',
          '야간근로수당_금액',
          '지각조퇴_시간',
          '지각조퇴_금액',
          '결근무급주휴_일수',
          '결근무급주휴_금액',
          '차량',
          '교통비',
          '통신비',
          '기타수당',
          '년차수당_일수',
          '년차수당_금액',
          '상여금',
          '소득세',
          '지방세',
          '국민연금',
          '건강보험',
          '장기요양',
          '고용보험',
          '가불금과태료',
          '매칭IRP적립',
          '경조비기타공제',
          '기숙사',
          '건강보험연말정산',
          '장기요양연말정산',
          '연말정산징수세액',
          '결근무휴',
          '년차',
          '지각조퇴외출',
        ].includes(field);

        if (isNumberField) {
          const cleanValue = value.toString().replace(/[,\s]/g, '');
          newData[rowIndex][field] = parseFloat(cleanValue) || 0;
        } else {
          newData[rowIndex][field] = value;
        }

        const hourlyWage = parseFloat(newData[rowIndex].시급) || 0;

        if (field === '시급') {
          newData[rowIndex].기본시간 = defaultHours;
          newData[rowIndex].기본급 = Math.round(
            hourlyWage * newData[rowIndex].기본시간
          );
        }

        if (field === '기본시간') {
          newData[rowIndex].기본급 = Math.round(
            hourlyWage * newData[rowIndex].기본시간
          );
        }

        if (field === '연장수당_시간') {
          newData[rowIndex].연장수당_금액 = Math.round(
            newData[rowIndex].연장수당_시간 * hourlyWage * 1.5
          );
        }

        if (field === '휴일근로수당_시간') {
          newData[rowIndex].휴일근로수당_금액 = Math.round(
            newData[rowIndex].휴일근로수당_시간 * hourlyWage * 1.5
          );
        }

        if (field === '야간근로수당_시간') {
          newData[rowIndex].야간근로수당_금액 = Math.round(
            newData[rowIndex].야간근로수당_시간 * hourlyWage * 0.5
          );
        }

        if (field === '지각조퇴_시간') {
          newData[rowIndex].지각조퇴_금액 = -Math.round(
            newData[rowIndex].지각조퇴_시간 * hourlyWage
          );
        }

        if (field === '년차수당_일수') {
          newData[rowIndex].년차수당_금액 = Math.round(
            newData[rowIndex].년차수당_일수 * 8 * hourlyWage
          );
        }

        calculatePayrollTotals(newData[rowIndex]);

        setPayrollTableData(newData);

        syncPayrollWithEmployeeSalary(newData[rowIndex]);

        logSystemEvent(
          'PAYROLL_CELL_UPDATED',
          `급여대장 셀 수정`,
          {
            rowIndex,
            field,
            value,
            employeeName: newData[rowIndex].성명,
          },
          'INFO'
        );
      }
    },
    [payrollTableData, defaultHours, setPayrollTableData, logSystemEvent]
  );

  // [2_관리자 모드] 2.9_급여 관리 - 급여 합계 계산
  const calculatePayrollTotals = useCallback((rowData) => {
    const totals = calculatePayrollTotalsService(rowData);
    rowData.급여합계 = totals.급여합계;
    rowData.공제합계 = totals.공제합계;
    rowData.차인지급액 = totals.차인지급액;

    syncPayrollWithEmployeeSalary(rowData);
  }, []);

  // [2_관리자 모드] 2.9_급여 관리 - 급여-직원정보 역동기화
  const syncPayrollWithEmployeeSalary = useCallback(
    (payrollRow) => {
      try {
        const employeeName = payrollRow.성명;
        const updateData = createEmployeeUpdateData(payrollRow);

        setEmployees((prev) =>
          prev.map((emp) => {
            if (emp.name === employeeName) {
              logSystemEvent(
                'EMPLOYEE_SALARY_SYNC',
                `직원 급여 정보 동기화: ${employeeName}`,
                {
                  employeeId: emp.id,
                  previousSalary: emp.salary,
                  newSalary: updateData.salary,
                  department: updateData.department,
                },
                'INFO'
              );

              return {
                ...emp,
                ...updateData,
              };
            }
            return emp;
          })
        );

        const currentMonth = `${payrollSearchFilter.year}-${String(
          payrollSearchFilter.month
        ).padStart(2, '0')}`;
        const salaryHistory = JSON.parse(
          localStorage.getItem('employeeSalaryHistory') || '{}'
        );
        const employeeId = employees.find(
          (emp) => emp.name === employeeName
        )?.id;

        if (employeeId && !salaryHistory[employeeId]) {
          salaryHistory[employeeId] = {};
        }

        if (employeeId) {
          salaryHistory[employeeId][currentMonth] = createSalaryHistoryEntry(
            payrollRow,
            currentMonth,
            employeeName
          );

          localStorage.setItem(
            'employeeSalaryHistory',
            JSON.stringify(salaryHistory)
          );
        }
      } catch (error) {
        logSystemEvent(
          'SALARY_SYNC_ERROR',
          '급여 동기화 오류',
          {
            error: error.message,
            employeeName: payrollRow.성명,
          },
          'HIGH'
        );
        showUserNotification(
          'error',
          '동기화 오류',
          `${payrollRow.성명}님의 급여 정보 동기화 중 오류가 발생했습니다.`
        );
      }
    },
    [
      employees,
      setEmployees,
      payrollSearchFilter,
      logSystemEvent,
      showUserNotification,
    ]
  );

  // [2_관리자 모드] 2.9_급여 관리 - 직원-급여대장 동기화
  const syncEmployeesWithPayroll = useCallback(() => {
    try {
      devLog('🔄 직원 데이터와 급여대장 동기화 시작...');

      const currentYear = payrollSearchFilter.year || new Date().getFullYear();
      const currentMonth =
        payrollSearchFilter.month || new Date().getMonth() + 1;

      const result = syncEmployeesWithPayrollService(
        employees,
        payrollTableData,
        defaultHours,
        currentYear,
        currentMonth
      );

      const { updatedPayrollData, changesCount, added, updated, removed } =
        result;

      // Log added employees
      added.forEach((emp) => {
        devLog(`➕ 신규 직원 급여대장 추가: ${emp.name}`);
        logSystemEvent(
          'NEW_EMPLOYEE_PAYROLL_ADDED',
          `신규 직원 급여대장 추가: ${emp.name}`,
          {
            employeeName: emp.name,
            department: emp.department,
            position: emp.position,
          },
          'INFO'
        );
      });

      // Log updated employees
      updated.forEach((emp) => {
        devLog(`🔄 기존 직원 정보 업데이트: ${emp.name}`);
      });

      // Log removed employees
      removed.forEach((emp) => {
        devLog(`➖ 퇴사 직원 급여대장 제외: ${emp.name}`);
        logSystemEvent(
          'RESIGNED_EMPLOYEE_PAYROLL_REMOVED',
          `퇴사 직원 급여대장 제외: ${emp.name}`,
          {
            employeeName: emp.name,
            department: emp.department,
            lastSalary: emp.lastSalary,
          },
          'INFO'
        );
      });

      if (changesCount > 0) {
        setPayrollTableData(updatedPayrollData);
      } else {
        devLog('ℹ️ 급여대장 동기화: 변경사항 없음');
      }
    } catch (error) {
      devLog('❌ 급여대장 동기화 오류:', error);

      logSystemEvent(
        'PAYROLL_SYNC_ERROR',
        '급여대장 동기화 실패',
        {
          error: error.message,
          stack: error.stack,
        },
        'HIGH'
      );
    }
  }, [
    employees,
    payrollTableData,
    defaultHours,
    payrollSearchFilter,
    setPayrollTableData,
    logSystemEvent,
    devLog,
  ]);

  // [2_관리자 모드] 2.9_급여 관리 - 급여대장 키 정규화
  const normalizePayrollKeys = useCallback(() => {
    setPayrollByMonth((prev) => normalizePayrollKeysService(prev));
  }, [setPayrollByMonth]);

  // [2_관리자 모드] 2.9_급여 관리 - 급여대장 파일 업로드
  const handlePayrollFileUpload = useCallback(
    async (file) => {
      if (!file) {
        alert('파일을 선택하세요.');
        return;
      }

      const autoDetected = await detectPayrollMonthService(file);
      let targetYear = payrollSearchFilter.year;
      let targetMonth = payrollSearchFilter.month;

      if (!autoDetected) {
        if (
          typeof targetYear !== 'number' ||
          typeof targetMonth !== 'number' ||
          targetYear < 2000 ||
          targetMonth < 1 ||
          targetMonth > 12
        ) {
          alert('업로드할 연/월을 먼저 선택하세요.');
          return;
        }
        const confirmed = window.confirm(
          `파일명 및 내용에서 업로드 월을 확인할 수 없습니다.\n\n` +
            `선택한 연/월(${targetYear}-${String(targetMonth).padStart(
              2,
              '0'
            )})로 자동 대체하여 업로드할까요?\n\n` +
            `- 예: 선택한 연/월로 업로드 진행\n` +
            `- 아니오: 업로드 취소`
        );
        if (!confirmed) {
          alert('업로드를 취소했습니다.');
          return;
        }
      } else {
        targetYear = autoDetected.year;
        targetMonth = autoDetected.month;
        devLog(`📅 급여월 자동 감지: ${targetYear}년 ${targetMonth}월`);
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target.result, { type: 'binary' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          parsePayrollDataFromExcel(data, targetYear, targetMonth, file.name);
          showUserNotification(
            'success',
            'Excel 업로드 완료',
            `${file.name} 파일이 ${targetYear}년 ${targetMonth}월 급여로 업로드되었습니다.`
          );
        } catch (error) {
          showUserNotification(
            'error',
            '업로드 실패',
            `엑셀 파일 읽기에 실패했습니다: ${error.message}`
          );
        }
      };
      reader.readAsBinaryString(file);
    },
    [payrollSearchFilter, devLog, showUserNotification]
  );

  // [2_관리자 모드] 2.9_급여 관리 - 엑셀 급여대장 파싱
  const parsePayrollDataFromExcel = useCallback(
    async (data, overrideYear = null, overrideMonth = null, fileName = '') => {
      try {
        devLog('\n📋 ===== 급여대장 엑셀 데이터 파싱 시작 =====');
        if (fileName) {
          devLog('📄 파일명:', fileName);
        }
        devLog('📊 전체 데이터 크기:', data.length + '행');
        devLog('📋 첫 5행 미리보기:', data.slice(0, 5));

        const shouldParseE2 = !overrideYear || !overrideMonth;

        let targetYear =
          overrideYear || payrollSearchFilter.year || new Date().getFullYear();
        let targetMonth =
          overrideMonth ||
          payrollSearchFilter.month ||
          new Date().getMonth() + 1;

        if (shouldParseE2) {
          devLog('\n💰 E2 셀 급여 지급일 파싱 시작...');
          const e2Cell = data[1]?.[4]; // E2 = 2행 5열 (인덱스 기준 [1][4])
          devLog('E2 셀 값:', e2Cell);

          if (e2Cell) {
            const cellStr = String(e2Cell).trim();
            devLog(`🔍 E2 셀 값 분석: "${cellStr}"`);

            const yearMonthPattern1 = cellStr.match(
              /(\d{4})\s*년\s*(\d{1,2})\s*월/
            );
            if (yearMonthPattern1) {
              const paymentYear = parseInt(yearMonthPattern1[1]);
              const paymentMonth = parseInt(yearMonthPattern1[2]);

              if (paymentMonth === 1) {
                targetYear = paymentYear - 1;
                targetMonth = 12; // 1월 지급 → 작년 12월 급여
              } else {
                targetYear = paymentYear;
                targetMonth = paymentMonth - 1; // n월 지급 → (n-1)월 급여
              }
              devLog(
                `✅ 패턴1 매칭: ${paymentYear}년 ${paymentMonth}월 지급 → ${targetYear}년 ${targetMonth}월 급여`
              );
            } else {
              const yearMonthPattern2 = cellStr.match(/(\d{4})-(\d{1,2})/);
              if (yearMonthPattern2) {
                const paymentYear = parseInt(yearMonthPattern2[1]);
                const paymentMonth = parseInt(yearMonthPattern2[2]);

                if (paymentMonth === 1) {
                  targetYear = paymentYear - 1;
                  targetMonth = 12;
                } else {
                  targetYear = paymentYear;
                  targetMonth = paymentMonth - 1;
                }
                devLog(
                  `✅ 패턴2 매칭: ${paymentYear}-${paymentMonth} 지급 → ${targetYear}년 ${targetMonth}월 급여`
                );
              } else {
                const numericValue = parseFloat(cellStr);
                if (
                  !isNaN(numericValue) &&
                  numericValue > 40000 &&
                  numericValue < 60000
                ) {
                  const excelDate = new Date(
                    (numericValue - 25569) * 24 * 60 * 60 * 1000
                  );
                  const paymentYear = excelDate.getFullYear();
                  const paymentMonth = excelDate.getMonth() + 1;

                  if (paymentMonth === 1) {
                    targetYear = paymentYear - 1;
                    targetMonth = 12;
                  } else {
                    targetYear = paymentYear;
                    targetMonth = paymentMonth - 1;
                  }
                  devLog(
                    `✅ Excel 시리얼 번호 매칭: ${paymentYear}년 ${paymentMonth}월 지급 → ${targetYear}년 ${targetMonth}월 급여`
                  );
                } else {
                  devLog(`❌ E2 셀 매칭되지 않음: "${cellStr}"`);
                }
              }
            }
          } else {
            devLog(
              `⚠️ E2 셀이 비어있음 - 현재 설정값 사용: ${targetYear}년 ${targetMonth}월`
            );
          }
        } else {
          devLog(
            `🎯 파일명/확인창에서 제공된 연월 사용: ${targetYear}년 ${targetMonth}월`
          );
        }

        devLog(
          `🎯 급여대상: ${targetYear}년 ${targetMonth}월 (E2 지급일 기준 n-1달 급여)`
        );

        setPayrollSearchFilter((prev) => ({
          ...prev,
          year: targetYear,
          month: targetMonth,
        }));

        devLog(
          `✅ 급여대장 화면이 ${targetYear}년 ${targetMonth}월로 변경됩니다.`
        );

        const newData = [];
        const errors = [];

        let startRowIndex = 0;

        devLog('\n🔍 헤더 행 찾기 시작...');

        let headerRow = null;
        for (let i = 0; i < Math.min(10, data.length); i++) {
          const row = data[i] || [];
          devLog(`  📝 ${i}행 검사:`, row.slice(0, 10), '...');

          const hasNameColumn = row.some(
            (cell) =>
              cell &&
              (cell.toString().includes('성명') ||
                cell.toString().includes('이름') ||
                cell.toString().includes('부서'))
          );

          if (hasNameColumn) {
            headerRow = row;
            startRowIndex = i + 2; // 그룹 헤더 + 세부 헤더 다음 행부터 시작
            devLog(`✅ 헤더 행 발견: ${i}행`);
            devLog(`📋 헤더 전체:`, headerRow);
            devLog(
              `🎯 데이터 시작 행: ${startRowIndex}행 (그룹 헤더 + 세부 헤더 건너뜀)`
            );
            break;
          } else {
            devLog(`  ❌ ${i}행: 헤더 아님`);
          }
        }

        // 첫 데이터 행 전체 출력
        if (startRowIndex < data.length) {
          devLog(
            `\n🔍 첫 데이터 행 (${startRowIndex}행) 전체:`,
            data[startRowIndex]
          );
        }

        devLog(
          `\n📈 데이터 처리 시작 (${startRowIndex}행부터 ${
            data.length - 1
          }행까지):`
        );
        devLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        devLog(`\n👥 등록된 직원 목록 (${employees.length}명):`);
        employees.forEach((emp, index) => {
          devLog(`  ${index + 1}. ${emp.name} (${emp.department})`);
        });

        for (let rowIndex = startRowIndex; rowIndex < data.length; rowIndex++) {
          const row = data[rowIndex];
          if (!row || row.length < 5) {
            devLog(
              `⏭️ ${rowIndex + 1}행 스킵: 데이터 부족 (${
                row?.length || 0
              }개 컬럼)`
            );
            continue; // 최소 5개 컬럼 필요
          }

          devLog(
            `\n🔍 ${rowIndex + 1}행 원본 데이터:`,
            row.slice(0, 20),
            '...'
          ); // 처음 20개 컬럼만 표시

          try {
            devLog(`\n📋 ${rowIndex + 1}행 컬럼별 파싱 시작:`);

            devLog('  🏢 기본 정보:');
            const 연번 = parseNumber(row[0]);
            const 사번 = parseText(row[1]);
            const 부서 = parseText(row[2]) || '미지정';
            const 직무 = parseText(row[3]);
            const 성명 = parseText(row[4]) || '이름없음';
            const 직급 = parseText(row[5]) || '미지정';
            const 입사일자 = parseDate(row[6]); // 날짜 파싱 함수 사용
            const 시급 = parseNumber(row[7]);

            const registeredEmployee = employees.find(
              (emp) => emp.id === 사번 && emp.name === 성명
            ) || employees.find(
              (emp) => emp.name === 성명 && emp.status !== '퇴사'
            );
            if (!registeredEmployee) {
              devLog(
                `❌ ${
                  rowIndex + 1
                }행 스킵: "${성명}"은 등록되지 않은 직원입니다.`
              );
              devLog('📍 등록된 직원과 일치하지 않음 - 파싱하지 않음');
              continue;
            }

            devLog(
              `✅ ${rowIndex + 1}행 확인: "${성명}"은 등록된 직원입니다. (${
                registeredEmployee.department
              })`
            );
            devLog(`🎯 매칭된 직원 정보:`, {
              이름: registeredEmployee.name,
              부서: registeredEmployee.department,
              세부부서: registeredEmployee.subDepartment || 세부부서,
              직급: registeredEmployee.position,
              시급: registeredEmployee.hourlyWage,
            });

            devLog('  💰 급여 정보:');
            const 기본시간 = parseNumber(row[8]) || defaultHours;
            const 기본급 = parseNumber(row[9]);

            devLog('  ⏰ 수당 정보:');
            const 연장수당_시간 = parseNumber(row[10]);
            const 연장수당_금액 = parseNumber(row[11]);
            const 휴일근로수당_시간 = parseNumber(row[12]);
            const 휴일근로수당_금액 = parseNumber(row[13]);
            const 야간근로수당_시간 = parseNumber(row[14]);
            const 야간근로수당_금액 = parseNumber(row[15]);

            devLog('  ⚠️ 감액 정보:');
            const 지각조퇴_시간 = parseNumber(row[16]);
            const 지각조퇴_금액 = parseNumber(row[17]);
            const 결근무급주휴_일수 = parseNumber(row[18]);
            const 결근무급주휴_금액 = parseNumber(row[19]);

            devLog('  🚗 기타 수당:');
            const 차량 = parseNumber(row[20]);
            const 교통비 = parseNumber(row[21]);
            const 통신비 = parseNumber(row[22]);
            const 기타수당 = parseNumber(row[23]);
            const 년차수당_일수 = parseNumber(row[24]);
            const 년차수당_금액 = parseNumber(row[25]);
            const 상여금 = parseNumber(row[26]);
            const 급여합계 = parseNumber(row[27]);

            devLog('  🏛️ 공제 항목:');
            const 소득세 = parseNumber(row[28]);
            const 지방세 = parseNumber(row[29]);
            const 국민연금 = parseNumber(row[30]);
            const 건강보험 = parseNumber(row[31]);
            const 장기요양 = parseNumber(row[32]);
            const 고용보험 = parseNumber(row[33]);
            const 가불금과태료 = parseNumber(row[34]);
            const 매칭IRP적립 = parseNumber(row[35]);
            const 경조비기타공제 = parseNumber(row[36]);
            const 기숙사 = parseNumber(row[37]);
            const 건강보험연말정산 = parseNumber(row[38]);
            const 장기요양연말정산 = parseNumber(row[39]);
            const 연말정산징수세액 = parseNumber(row[40]);
            const 공제합계 = parseNumber(row[41]);
            const 차인지급액 = parseNumber(row[42]);

            devLog('  📅 근태 현황:');
            const 결근무휴 = parseNumber(row[43]);
            const 년차 = parseNumber(row[44]);
            const 지각조퇴외출 = parseNumber(row[45]);

            const rowData = {
              지급년도: targetYear,
              지급월: targetMonth,
              employeeId: registeredEmployee.id,
              사번: registeredEmployee.id,
              성명: registeredEmployee.name,
              부서: registeredEmployee.department || '미지정',
              세부부서: registeredEmployee.subDepartment || '',
              직급: registeredEmployee.position || '사원',
              입사일자:
                registeredEmployee.joinDate ||
                registeredEmployee.hireDate ||
                '미정',
              근무형태: registeredEmployee.workType || '주간',
              시급,
              기본시간,
              기본급,
              연장수당_시간,
              연장수당_금액,
              휴일근로수당_시간,
              휴일근로수당_금액,
              야간근로수당_시간,
              야간근로수당_금액,
              지각조퇴_시간,
              지각조퇴_금액,
              결근무급주휴_일수,
              결근무급주휴_금액,
              차량,
              교통비,
              통신비,
              기타수당,
              년차수당_일수,
              년차수당_금액,
              상여금,
              급여합계,
              소득세,
              지방세,
              국민연금,
              건강보험,
              장기요양,
              고용보험,
              가불금과태료,
              매칭IRP적립,
              경조비기타공제,
              기숙사,
              건강보험연말정산,
              장기요양연말정산,
              연말정산징수세액,
              공제합계,
              차인지급액,
              결근무휴,
              년차,
              지각조퇴외출,
              지급유형: '엑셀업로드',
              은행: registeredEmployee.bank || '',
              계좌번호: registeredEmployee.account || '',
              비고: '엑셀 업로드',
            };

            devLog(`\n✅ ${rowIndex + 1}행 최종 파싱 결과:`, {
              기본정보: { 부서, 성명, 직급, 입사일자, 시급 },
              급여: { 기본시간, 기본급, 급여합계 },
              수당: {
                연장수당_금액,
                휴일근로수당_금액,
                야간근로수당_금액,
                상여금,
              },
              공제: { 공제합계, 차인지급액 },
            });

            devLog(
              `🎯 ${
                rowIndex + 1
              }행 파싱 완료: [${성명}] 급여합계:${급여합계?.toLocaleString()}원`
            );
            newData.push(rowData);
          } catch (rowError) {
            devLog(`${rowIndex + 1}행 파싱 오류:`, rowError);
            errors.push(`${rowIndex + 1}행: ${rowError.message}`);
          }
        }

        devLog(
          '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
        );
        devLog('🏁 ===== 파싱 완료 및 결과 처리 =====');
        devLog(`📊 파싱된 데이터: ${newData.length}건`);
        devLog(`⚠️ 오류 발생: ${errors.length}건`);

        if (errors.length > 0) {
          devLog('🔴 오류 목록:', errors);
        }

        if (newData.length > 0) {
          devLog('\n✅ 급여대장 데이터 설정 중...');

          const currentKey = ymKey(targetYear, targetMonth);
          const newHash = payrollHash(newData);
          const previousHash = payrollHashes[currentKey];

          const isFirstUpload = !previousHash;
          const isContentChanged = previousHash && newHash !== previousHash;

          devLog('\n🔍 변경 감지 결과:');
          devLog(`  현재 키: ${currentKey}`);
          devLog(`  이전 해시: ${previousHash ? '존재' : '없음'}`);
          devLog(`  신규 해시: ${newHash ? '생성됨' : '실패'}`);
          devLog(`  최초 업로드: ${isFirstUpload}`);
          devLog(`  내용 변경: ${isContentChanged}`);

          if (newHash) {
            setPayrollHashes((prev) => ({
              ...prev,
              [currentKey]: newHash,
            }));
          }

          // payrollByMonth에 직접 데이터 설정 (전체 월 데이터 유지)
          setPayrollByMonth((prev) => {
            devLog(`\n🔄 데이터 병합 중...`);
            devLog(
              `  업로드 대상: ${targetYear}년 ${targetMonth}월 (키: ${currentKey})`
            );
            devLog(
              `  기존 ${currentKey} 데이터: ${
                (prev[currentKey] || []).length
              }건`
            );
            devLog(`  파싱된 신규 데이터: ${newData.length}건`);

            const updatedByMonth = {
              ...prev,
              [currentKey]: newData,
            };

            // 전체 월별 데이터 확인
            const monthlyBreakdown = {};
            Object.entries(updatedByMonth).forEach(([key, data]) => {
              monthlyBreakdown[key] = data.length;
            });
            devLog(`  전체 월별 데이터 분포:`, monthlyBreakdown);

            return updatedByMonth;
          });

          // 엑셀 업로드 시 해당 월을 가시성 true로 설정 (일반직원에게 표시)
          setPayrollMonthMetadata((prev) => ({
            ...prev,
            [currentKey]: {
              isVisible: true,
              lastModified: new Date().toISOString(),
            },
          }));

          devLog('📋 파싱된 직원 목록:');
          newData.forEach((item, index) => {
            devLog(
              `  ${index + 1}. ${item.성명} (${
                item.부서
              }) - 급여합계: ${item.급여합계?.toLocaleString()}원`
            );
          });

          devLog('\n📊 등록된 직원 vs 파싱된 직원 비교:');
          const parsedNames = new Set(newData.map((item) => item.성명));
          const missingEmployees = employees.filter(
            (emp) => !parsedNames.has(emp.name)
          );

          devLog(`✅ 파싱된 직원: ${newData.length}/${employees.length}명`);
          if (missingEmployees.length > 0) {
            devLog('❌ 파싱되지 않은 등록 직원:');
            missingEmployees.forEach((emp, index) => {
              devLog(
                `  ${index + 1}. ${emp.name} (${
                  emp.department
                }) - 엑셀에 데이터 없음`
              );
            });
          } else {
            devLog('✅ 모든 등록 직원이 파싱되었습니다');
          }

          devLog(`\n🎉 급여대장 파싱 완료: ${newData.length}건`);

          let message = `📊 엑셀 업로드 완료! (${targetYear}년 ${targetMonth}월)\n\n`;
          message += `✅ 처리 성공: ${newData.length}명\n`;
          message += `👥 등록된 직원: ${employees.length}명\n`;

          if (missingEmployees.length > 0) {
            message += `⚠️ 엑셀에 없는 직원: ${missingEmployees.length}명\n`;
            message += `(${missingEmployees
              .map((emp) => emp.name)
              .join(', ')})\n`;
          }

          if (errors.length > 0) {
            message += `\n❌ 파싱 오류: ${errors.length}건\n`;
            message += `오류 내용:\n${errors.slice(0, 3).join('\n')}`;
            if (errors.length > 3) message += `\n...외 ${errors.length - 3}건`;
          }

          if (isFirstUpload || isContentChanged) {
            devLog(
              `\n📢 급여 알림 발송 시작 (${
                isFirstUpload ? '최초 업로드' : '내용 변경'
              })`
            );

            newData.forEach((payroll) => {
              const targetEmployee = employees.find(
                (emp) => emp.name === payroll.성명
              );
              if (targetEmployee) {
                send자동알림({
                  처리유형: '급여 수신',
                  대상자: targetEmployee,
                  처리자: currentUser?.name || '관리자',
                  알림내용: `${
                    targetEmployee.name
                  }님의 ${targetYear}년 ${targetMonth}월 급여가 ${
                    isFirstUpload ? '지급' : '변경'
                  }되었습니다.\n\n기본급: ${(
                    payroll.기본급 || 0
                  ).toLocaleString()}원\n연장수당: ${(
                    payroll.연장수당_금액 || 0
                  ).toLocaleString()}원\n휴일근로수당: ${(
                    payroll.휴일근로수당_금액 || 0
                  ).toLocaleString()}원\n야간근로수당: ${(
                    payroll.야간근로수당_금액 || 0
                  ).toLocaleString()}원\n상여금: ${(
                    payroll.상여금 || 0
                  ).toLocaleString()}원\n급여합계: ${(
                    payroll.급여합계 || 0
                  ).toLocaleString()}원\n공제합계: ${(
                    payroll.공제합계 || 0
                  ).toLocaleString()}원\n차인지급액: ${(
                    payroll.차인지급액 || 0
                  ).toLocaleString()}원\n\n처리일시: ${new Date().toLocaleString(
                    'ko-KR'
                  )}`,
                });
                devLog(`  ✅ ${targetEmployee.name} 알림 발송`);
              }
            });

            devLog(`📢 급여 알림 발송 완료: ${newData.length}명`);
            message += `\n\n📢 알림 발송: ${newData.length}명 (${
              isFirstUpload ? '최초 업로드' : '내용 변경 감지'
            })`;
          } else {
            devLog('\n⏭️ 급여 내용 변경 없음 - 알림 발송 스킵');
            message += `\n\n⏭️ 급여 내용 변경 없음 (알림 미발송)`;
          }

          alert(message);

          // 업로드한 월로 자동 이동
          setPayrollSearchFilter((prev) => ({
            ...prev,
            year: targetYear,
            month: targetMonth,
          }));
          devLog(
            `📅 급여 관리 화면이 ${targetYear}년 ${targetMonth}월로 이동되었습니다.`
          );

          // ====== DB 저장 로직 추가 ======
          devLog('\n💾 DB에 급여 데이터 저장 시작...');
          try {
            // 데이터 변환: 한글 키 → 영문 키
            const dbRecords = newData.map((item) => {
              // employeeId: 파싱 단계에서 이미 정확히 저장된 값 사용
              const employeeId = item.employeeId || item.사번 || item.성명;

              return {
                employeeId: employeeId,
                name: item.성명,
                department: item.부서,
                subDepartment: item.세부부서,
                position: item.직급,
                joinDate: item.입사일자,
                hourlyWage: item.시급 || 0,
                basicHours: item.기본시간 || 0,
                basicPay: item.기본급 || 0,
                overtimeHours: item.연장수당_시간 || 0,
                overtimePay: item.연장수당_금액 || 0,
                holidayWorkHours: item.휴일근로수당_시간 || 0,
                holidayWorkPay: item.휴일근로수당_금액 || 0,
                nightWorkHours: item.야간근로수당_시간 || 0,
                nightWorkPay: item.야간근로수당_금액 || 0,
                lateEarlyHours: item.지각조퇴_시간 || 0,
                lateEarlyDeduction: item.지각조퇴_금액 || 0,
                absentDays: item.결근무급주휴_일수 || 0,
                absentDeduction: item.결근무급주휴_금액 || 0,
                carAllowance: item.차량 || 0,
                transportAllowance: item.교통비 || 0,
                phoneAllowance: item.통신비 || 0,
                otherAllowance: item.기타수당 || 0,
                annualLeaveDays: item.년차수당_일수 || 0,
                annualLeavePay: item.년차수당_금액 || 0,
                bonus: item.상여금 || 0,
                totalSalary: item.급여합계 || 0,
                incomeTax: item.소득세 || 0,
                localTax: item.지방세 || 0,
                nationalPension: item.국민연금 || 0,
                healthInsurance: item.건강보험 || 0,
                longTermCare: item.장기요양 || 0,
                employmentInsurance: item.고용보험 || 0,
                advanceDeduction: item.가불금과태료 || 0,
                irpMatching: item.매칭IRP적립 || 0,
                otherDeduction: item.경조비기타공제 || 0,
                dormitory: item.기숙사 || 0,
                healthYearEnd: item.건강보험연말정산 || 0,
                longTermYearEnd: item.장기요양연말정산 || 0,
                taxYearEnd: item.연말정산징수세액 || 0,
                totalDeduction: item.공제합계 || 0,
                netSalary: item.차인지급액 || 0,
              };
            });

            devLog(`📦 변환된 DB 레코드 수: ${dbRecords.length}건`);
            devLog(`📝 첫 번째 레코드 미리보기:`, dbRecords[0]);

            const dbResponse = await PayrollAPI.bulkSave(
              dbRecords,
              targetYear,
              targetMonth
            );

            if (dbResponse && dbResponse.success) {
              devLog(`✅ DB 저장 성공:`, dbResponse.data);
              showUserNotification(
                'success',
                'DB 저장 완료',
                `${targetYear}년 ${targetMonth}월 급여 데이터 ${dbRecords.length}건이 DB에 저장되었습니다.`
              );
            } else {
              throw new Error('DB 저장 응답이 올바르지 않습니다.');
            }
          } catch (dbError) {
            console.error('❌ DB 저장 실패:', dbError);
            devLog('❌ DB 저장 오류:', dbError);
            showUserNotification(
              'warning',
              'DB 저장 실패',
              `로컬 저장은 완료되었으나 DB 저장에 실패했습니다: ${dbError.message}`
            );
          }
          // ====== DB 저장 로직 끝 ======
        } else {
          devLog('❌ 파싱 실패: 등록된 직원 데이터 없음');
          alert(
            `❌ 등록된 직원의 급여 데이터를 찾을 수 없습니다.\n\n확인사항:\n- 엑셀의 직원 이름이 시스템 등록명과 일치하는지 확인\n- 등록된 직원: ${
              employees.length
            }명\n- 파싱 시도: ${data.length - startRowIndex}행`
          );
        }
      } catch (error) {
        devLog('🔥 급여대장 파싱 전체 오류:', error);
        devLog('🔥 오류 스택:', error.stack);
        alert(`급여대장 파싱 실패: ${error.message}`);
      }
    },
    [
      employees,
      defaultHours,
      payrollSearchFilter,
      payrollHashes,
      setPayrollSearchFilter,
      setPayrollHashes,
      setPayrollByMonth,
      devLog,
      send자동알림,
      currentUser,
      showUserNotification,
    ]
  );

  // [2_관리자 모드] 2.9_급여 관리 - 누락 급여항목 생성
  const createMissingPayrollItems = useCallback(() => {
    try {
      const result = createMissingPayrollItemsService(
        employees,
        payrollTableData,
        defaultHours
      );

      const { updatedPayrollData, newItemsCreated, newEmployees } = result;

      // Log each new employee addition
      newEmployees.forEach((emp) => {
        logSystemEvent(
          'PAYROLL_EMPLOYEE_AUTO_ADDED',
          `급여대장에 직원 자동 추가: ${emp.name}`,
          {
            employeeId: emp.id,
            employeeName: emp.name,
            department: emp.department,
          },
          'INFO'
        );
      });

      ensureMonthlyPayrollData();

      if (newItemsCreated > 0) {
        setPayrollTableData(updatedPayrollData);
        showUserNotification(
          'success',
          '자동 생성 완료',
          `${newItemsCreated}명의 직원이 급여대장에 자동 추가되었습니다.`
        );

        logSystemEvent(
          'PAYROLL_AUTO_CREATION_COMPLETE',
          '급여대장 자동 생성 완료',
          {
            newItemsCount: newItemsCreated,
            totalEmployees: updatedPayrollData.length,
          },
          'INFO'
        );
      }

      return { success: true, newItemsCreated };
    } catch (error) {
      logSystemEvent(
        'PAYROLL_AUTO_CREATION_ERROR',
        '급여대장 자동 생성 오류',
        {
          error: error.message,
        },
        'HIGH'
      );

      showUserNotification(
        'error',
        '자동 생성 실패',
        `급여대장 자동 생성 중 오류가 발생했습니다: ${error.message}`
      );
      return { success: false, error: error.message };
    }
  }, [
    employees,
    payrollTableData,
    defaultHours,
    logSystemEvent,
    setPayrollTableData,
    showUserNotification,
  ]);

  // [2_관리자 모드] 2.9_급여 관리 - 월별 급여대장 저장
  const ensureMonthlyPayrollData = useCallback(() => {
    ensureMonthlyPayrollDataService(
      payrollSearchFilter.year,
      payrollSearchFilter.month,
      payrollTableData,
      logSystemEvent
    );
  }, [payrollSearchFilter, payrollTableData, logSystemEvent]);

  // [2_관리자 모드] 2.9_급여 관리 - DB에서 급여 데이터 자동 로드
  useEffect(() => {
    const loadPayrollFromDB = async () => {
      const { year, month } = payrollSearchFilter;
      const currentKey = ymKey(year, month);

      // 이미 로컬 데이터가 있으면 스킵
      if (payrollByMonth[currentKey] && payrollByMonth[currentKey].length > 0) {
        devLog(`⏭️ ${currentKey} 로컬 데이터 존재 - DB 로드 스킵`);
        return;
      }

      try {
        devLog(`🔄 DB에서 급여 데이터 로딩 시작: ${year}년 ${month}월`);

        const response = await PayrollAPI.getMonthlyData(year, month);

        if (
          response &&
          response.success &&
          Array.isArray(response.data) &&
          response.data.length > 0
        ) {
          devLog(`✅ DB에서 급여 데이터 ${response.data.length}건 로드 완료`);

          // DB 데이터를 로컬 형식으로 변환
          const convertedData = response.data.map((item) => ({
            지급년도: item.year,
            지급월: item.month,
            성명: item.name,
            부서: item.department,
            직급: item.position,
            입사일자: item.joinDate,
            시급: item.hourlyWage,
            기본시간: item.basicHours,
            기본급: item.basicPay,
            연장수당_시간: item.overtimeHours,
            연장수당_금액: item.overtimePay,
            휴일근로수당_시간: item.holidayWorkHours,
            휴일근로수당_금액: item.holidayWorkPay,
            야간근로수당_시간: item.nightWorkHours,
            야간근로수당_금액: item.nightWorkPay,
            지각조퇴_시간: item.lateEarlyHours,
            지각조퇴_금액: item.lateEarlyDeduction,
            결근무급주휴_일수: item.absentDays,
            결근무급주휴_금액: item.absentDeduction,
            차량: item.carAllowance,
            교통비: item.transportAllowance,
            통신비: item.phoneAllowance,
            기타수당: item.otherAllowance,
            년차수당_일수: item.annualLeaveDays,
            년차수당_금액: item.annualLeavePay,
            상여금: item.bonus,
            급여합계: item.totalSalary,
            소득세: item.incomeTax,
            지방세: item.localTax,
            국민연금: item.nationalPension,
            건강보험: item.healthInsurance,
            장기요양: item.longTermCare,
            고용보험: item.employmentInsurance,
            가불금과태료: item.advanceDeduction,
            매칭IRP적립: item.irpMatching,
            경조비기타공제: item.otherDeduction,
            기숙사: item.dormitory,
            건강보험연말정산: item.healthYearEnd,
            장기요양연말정산: item.longTermYearEnd,
            연말정산징수세액: item.taxYearEnd,
            공제합계: item.totalDeduction,
            차인지급액: item.netSalary,
            지급유형: 'DB로드',
            비고: 'DB에서 자동 로드',
          }));

          // 로컬 스토리지에 저장
          setPayrollByMonth((prev) => ({
            ...prev,
            [currentKey]: convertedData,
          }));

          devLog(
            `✅ ${year}년 ${month}월 급여 데이터 ${convertedData.length}건 로드 완료`
          );

          showUserNotification(
            'info',
            'DB 데이터 로드',
            `${year}년 ${month}월 급여 데이터 ${convertedData.length}건을 DB에서 불러왔습니다.`
          );
        } else {
          devLog(`⚠️ DB에 ${year}년 ${month}월 급여 데이터 없음`);
        }
      } catch (error) {
        console.error('❌ DB 급여 데이터 로드 실패:', error);
        devLog(`❌ DB 로드 오류: ${error.message}`);
        // 에러는 로그만 남기고 사용자에게는 알리지 않음 (로컬 데이터 사용 가능)
      }
    };

    loadPayrollFromDB();
  }, [
    payrollSearchFilter.year,
    payrollSearchFilter.month,
    payrollByMonth,
    devLog,
    showUserNotification,
    setPayrollByMonth,
  ]);

  return {
    payrollSearchFilter,
    setPayrollSearchFilter,
    payrollValidationErrors,
    setPayrollValidationErrors,
    payrollHashes,
    setPayrollHashes,
    payrollByMonth,
    setPayrollByMonth,
    payrollMonthMetadata,
    setPayrollMonthMetadata,
    payrollTableData,
    setPayrollTableData,
    editingPayrollCell,
    setEditingPayrollCell,
    isPayrollEditMode,
    setIsPayrollEditMode,
    defaultHours,
    setDefaultHours,
    handleEditHours,
    applyDefaultHoursToTable,
    // 급여 관리 함수들
    initializePayrollTable,
    updatePayrollCell,
    calculatePayrollTotals,
    syncPayrollWithEmployeeSalary,
    syncEmployeesWithPayroll,
    normalizePayrollKeys,
    handlePayrollFileUpload,
    parsePayrollDataFromExcel,
    createMissingPayrollItems,
    ensureMonthlyPayrollData,
  };
};

/**
 * 급여 검색 필터에 따라 필터링된 급여대장 데이터를 반환하는 커스텀 훅
 * @param {Array} payrollTableData - 전체 급여대장 데이터
 * @param {Object} payrollSearchFilter - 급여 검색 필터
 * @param {Array} employees - 직원 목록 (입사일/퇴사일 확인용)
 * @returns {Array} 필터링된 급여대장 데이터
 */
export const usePayrollFilter = (
  payrollTableData,
  payrollSearchFilter,
  employees = []
) => {
  const filteredPayrollData = useMemo(() => {
    // payrollTableData가 배열이 아닌 경우 빈 배열 반환
    if (!Array.isArray(payrollTableData)) {
      return [];
    }

    return payrollTableData
      .filter((row) => {
        if (
          payrollSearchFilter.department &&
          payrollSearchFilter.department !== '전체 부서' &&
          row.부서 !== payrollSearchFilter.department
        ) {
          return false;
        }

        if (
          payrollSearchFilter.position &&
          payrollSearchFilter.position !== '전체' &&
          row.직급 !== payrollSearchFilter.position
        ) {
          return false;
        }

        if (
          payrollSearchFilter.workType &&
          payrollSearchFilter.workType !== '전체' &&
          row.근무형태 !== payrollSearchFilter.workType
        ) {
          return false;
        }

        if (payrollSearchFilter.name) {
          // 쉼표(,) 또는 공백으로 구분하여 여러 이름 검색
          const searchNames = payrollSearchFilter.name
            .split(/[,\s]+/) // 쉼표 또는 공백으로 분리
            .map((name) => name.trim()) // 앞뒤 공백 제거
            .filter((name) => name.length > 0); // 빈 문자열 제거

          // 검색어 중 하나라도 직원 이름에 포함되어 있으면 통과
          const isMatch = searchNames.some((searchName) =>
            row.성명.includes(searchName)
          );

          if (!isMatch) {
            return false;
          }
        }

        if (
          payrollSearchFilter.year !== row.지급년도 ||
          payrollSearchFilter.month !== row.지급월
        ) {
          return false;
        }

        // 입사일/퇴사일 기반 필터링
        if (employees.length > 0) {
          const employee = employees.find(
            (emp) =>
              emp.name === row.성명 ||
              emp.id === row.사번 ||
              emp.employeeNumber === row.사번
          );

          if (employee) {
            const currentYear = payrollSearchFilter.year;
            const currentMonth = payrollSearchFilter.month;

            // 입사일 확인
            if (employee.joinDate) {
              const joinDate = new Date(employee.joinDate);
              const joinYear = joinDate.getFullYear();
              const joinMonth = joinDate.getMonth() + 1;

              // 입사월 이전이면 제외
              if (
                currentYear < joinYear ||
                (currentYear === joinYear && currentMonth < joinMonth)
              ) {
                return false;
              }
            }

            // 퇴사일 확인 (leaveDate 사용)
            if (employee.leaveDate) {
              const leaveDate = new Date(employee.leaveDate);
              const leaveYear = leaveDate.getFullYear();
              const leaveMonth = leaveDate.getMonth() + 1;

              // 퇴사월 이후면 제외
              if (
                currentYear > leaveYear ||
                (currentYear === leaveYear && currentMonth > leaveMonth)
              ) {
                return false;
              }
            }
          }
        }

        return true;
      })
      .sort((a, b) => {
        // 정렬 우선순위 배열
        const payTypeOrder = ['연봉', '시급'];
        const positionOrder = [
          '대표',
          '상무',
          '전무',
          '이사',
          '부장',
          '차장',
          '과장',
          '대리',
          '주임',
          '반장',
          '조장',
          '사원',
        ];

        // 1순위: 급여형태 (연봉 → 시급)
        const payTypeA = payTypeOrder.indexOf(a.급여형태);
        const payTypeB = payTypeOrder.indexOf(b.급여형태);
        const payTypeCompare =
          (payTypeA === -1 ? 999 : payTypeA) -
          (payTypeB === -1 ? 999 : payTypeB);

        if (payTypeCompare !== 0) return payTypeCompare;

        // 2순위: 직급
        const posA = positionOrder.indexOf(a.직급);
        const posB = positionOrder.indexOf(b.직급);
        return (posA === -1 ? 999 : posA) - (posB === -1 ? 999 : posB);
      });
  }, [payrollTableData, payrollSearchFilter, employees]);

  return filteredPayrollData;
};

// ============================================================
// [2_관리자 모드] 2.9_급여 관리 - SERVICES
// ============================================================

/**
 * 숫자 파싱 (엑셀 데이터 → 숫자)
 * @param {any} value - 파싱할 값
 * @returns {number} 파싱된 숫자
 */
export const parseNumber = (value) => {
  if (!value || value === '' || value === '-') {
    return 0;
  }
  const cleaned = value.toString().replace(/[,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * 텍스트 파싱 (공백 제거)
 * @param {any} value - 파싱할 값
 * @returns {string} 파싱된 텍스트
 */
export const parseText = (value) => {
  if (!value) {
    return '';
  }
  return value.toString().trim();
};

/**
 * 날짜 파싱 (엑셀 시리얼 번호 → YYYY-MM-DD)
 * @param {any} value - 파싱할 값
 * @returns {string} YYYY-MM-DD 형식 날짜
 */
export const parseDate = (value) => {
  if (!value) {
    return '2024-01-01';
  }

  const stringValue = value.toString().trim();
  // YYYY-MM-DD or YYYY/MM/DD 형식
  if (stringValue.match(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/)) {
    return stringValue.replace(/\//g, '-');
  }

  // 엑셀 시리얼 번호
  const numValue = parseFloat(value);
  if (!isNaN(numValue) && numValue > 25569) {
    const excelEpoch = new Date(1900, 0, 1);
    const jsDate = new Date(
      excelEpoch.getTime() + (numValue - 1) * 24 * 60 * 60 * 1000
    );

    // 엑셀 1900 leap year bug 보정
    if (numValue >= 61) {
      jsDate.setTime(jsDate.getTime() - 24 * 60 * 60 * 1000);
    }

    const year = jsDate.getFullYear();
    const month = String(jsDate.getMonth() + 1).padStart(2, '0');
    const day = String(jsDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return '2024-01-01';
};

/**
 * 급여월 자동 감지
 * 파일명과 내용을 분석하여 급여 연월을 추출
 * @param {File} file - 업로드된 파일
 * @returns {Object|null} { year, month, ymKey } 또는 null
 */
export const detectPayrollMonthService = async (file) => {
  const name = file.name;
  const namePatterns = [
    /(\d{4})[-_]?(\d{2})/, // YYYY-MM or YYYYMM
    /(\d{2})(\d{2})(?:\.xlsx?|\.csv|급여|$)/, // YYMM (파일 끝 또는 확장자 전)
    /(\d{4})년\s?(\d{1,2})월/, // YYYY년 MM월
  ];

  for (const p of namePatterns) {
    const m = name.match(p);
    if (m) {
      let year = m[1];
      let month = m[2];

      if (year.length === 2) {
        year = '20' + year;
      }

      month = month.padStart(2, '0');

      const monthNum = parseInt(month);
      if (monthNum >= 1 && monthNum <= 12) {
        return {
          year: parseInt(year),
          month: monthNum,
          ymKey: `${year}-${month}`,
        };
      }
    }
  }

  if (
    file.type === 'text/csv' ||
    file.type === 'text/plain' ||
    file.name.endsWith('.txt')
  ) {
    try {
      const text = await file.text();
      const contentPatterns = [
        /(\d{4})년\s?(\d{1,2})월분?/, // YYYY년 MM월 또는 YYYY년 MM월분
        /(\d{2})년\s?(\d{1,2})월/, // YY년 MM월
      ];

      for (const cp of contentPatterns) {
        const match = text.match(cp);
        if (match) {
          let year = match[1];
          let month = match[2];

          if (year.length === 2) {
            year = '20' + year;
          }

          month = month.padStart(2, '0');

          const monthNum = parseInt(month);
          if (monthNum >= 1 && monthNum <= 12) {
            return {
              year: parseInt(year),
              month: monthNum,
              ymKey: `${year}-${month}`,
            };
          }
        }
      }
    } catch (e) {
      console.error('파일 내부 급여월 판독 실패', e);
    }
  }

  return null; // 인식 실패 시 null 반환
};

/**
 * 급여 합계 계산 (급여합계, 공제합계, 차인지급액)
 * @param {Object} rowData - 급여대장 행 데이터
 * @returns {Object} 계산된 급여 정보 { 급여합계, 공제합계, 차인지급액 }
 */
export const calculatePayrollTotalsService = (rowData) => {
  const 기본급 = parseFloat(rowData.기본급) || 0;
  const 연장수당_금액 = parseFloat(rowData.연장수당_금액) || 0;
  const 휴일근로수당_금액 = parseFloat(rowData.휴일근로수당_금액) || 0;
  const 야간근로수당_금액 = parseFloat(rowData.야간근로수당_금액) || 0;
  const 차량 = parseFloat(rowData.차량) || 0;
  const 교통비 = parseFloat(rowData.교통비) || 0;
  const 통신비 = parseFloat(rowData.통신비) || 0;
  const 기타수당 = parseFloat(rowData.기타수당) || 0;
  const 년차수당_금액 = parseFloat(rowData.년차수당_금액) || 0;
  const 상여금 = parseFloat(rowData.상여금) || 0;
  const 지각조퇴_금액 = parseFloat(rowData.지각조퇴_금액) || 0;
  const 결근무급주휴_금액 = parseFloat(rowData.결근무급주휴_금액) || 0;

  const 급여합계 =
    기본급 +
    연장수당_금액 +
    휴일근로수당_금액 +
    야간근로수당_금액 +
    차량 +
    교통비 +
    통신비 +
    기타수당 +
    년차수당_금액 +
    상여금 -
    지각조퇴_금액 -
    결근무급주휴_금액;

  const 소득세 = parseFloat(rowData.소득세) || 0;
  const 지방세 = parseFloat(rowData.지방세) || 0;
  const 국민연금 = parseFloat(rowData.국민연금) || 0;
  const 건강보험 = parseFloat(rowData.건강보험) || 0;
  const 장기요양 = parseFloat(rowData.장기요양) || 0;
  const 고용보험 = parseFloat(rowData.고용보험) || 0;
  const 가불금과태료 = parseFloat(rowData.가불금과태료) || 0;
  const 매칭IRP적립 = parseFloat(rowData.매칭IRP적립) || 0;
  const 경조비기타공제 = parseFloat(rowData.경조비기타공제) || 0;
  const 기숙사 = parseFloat(rowData.기숙사) || 0;
  const 건강보험연말정산 = parseFloat(rowData.건강보험연말정산) || 0;
  const 장기요양연말정산 = parseFloat(rowData.장기요양연말정산) || 0;
  const 연말정산징수세액 = parseFloat(rowData.연말정산징수세액) || 0;

  const 공제합계 =
    소득세 +
    지방세 +
    국민연금 +
    건강보험 +
    장기요양 +
    고용보험 +
    가불금과태료 +
    매칭IRP적립 +
    경조비기타공제 +
    기숙사 +
    건강보험연말정산 +
    장기요양연말정산 +
    연말정산징수세액;

  const 차인지급액 = 급여합계 - 공제합계;

  return {
    급여합계,
    공제합계,
    차인지급액,
  };
};

/**
 * 급여대장 키 정규화 (YYYY-MM 형식으로 통일)
 * @param {Object} payrollByMonth - 월별 급여 데이터 객체
 * @returns {Object} 정규화된 월별 급여 데이터
 */
export const normalizePayrollKeysService = (payrollByMonth) => {
  const normalized = {};
  Object.keys(payrollByMonth).forEach((key) => {
    const match = key.match(/^(\d{2,4})[-_]?(\d{1,2})$/);
    if (match) {
      let year = match[1];
      let month = match[2];
      if (year.length === 2) year = '20' + year;
      month = month.padStart(2, '0');
      const normalizedKey = `${year}-${month}`;
      normalized[normalizedKey] = payrollByMonth[key];
    } else if (key.match(/^\d{4}-\d{2}$/)) {
      normalized[key] = payrollByMonth[key];
    } else {
      normalized[key] = payrollByMonth[key];
    }
  });
  return normalized;
};

/**
 * 월별 급여대장 데이터 저장 (localStorage)
 * @param {number} year - 연도
 * @param {number} month - 월
 * @param {Array} payrollTableData - 급여대장 데이터
 * @param {Function} logSystemEvent - 시스템 로그 함수
 */
export const ensureMonthlyPayrollDataService = (
  year,
  month,
  payrollTableData,
  logSystemEvent
) => {
  try {
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    const monthlyPayrollData = JSON.parse(
      localStorage.getItem('monthlyPayrollData') || '{}'
    );

    if (!monthlyPayrollData[monthKey]) {
      monthlyPayrollData[monthKey] = {
        month: monthKey,
        year: year,
        monthNumber: month,
        data: [...payrollTableData],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      localStorage.setItem(
        'monthlyPayrollData',
        JSON.stringify(monthlyPayrollData)
      );

      logSystemEvent(
        'MONTHLY_PAYROLL_CREATED',
        `${year}년 ${month}월 급여대장 생성`,
        {
          monthKey,
          employeeCount: payrollTableData.length,
        },
        'INFO'
      );
    }
  } catch (error) {
    logSystemEvent(
      'MONTHLY_PAYROLL_ERROR',
      '월별 급여대장 생성 오류',
      {
        error: error.message,
      },
      'WARNING'
    );
  }
};

/**
 * 급여대장에 누락된 직원 추가 (자동 생성)
 * @param {Array} employees - 직원 목록
 * @param {Array} currentPayrollData - 현재 급여대장 데이터
 * @param {number} defaultHours - 기본 근무 시간
 * @returns {Object} { updatedPayrollData: Array, newItemsCreated: number, newEmployees: Array }
 */
export const createMissingPayrollItemsService = (
  employees,
  currentPayrollData,
  defaultHours
) => {
  const updatedPayrollData = [...currentPayrollData];
  let newItemsCreated = 0;
  const newEmployees = [];

  employees.forEach((emp) => {
    const exists = updatedPayrollData.find((row) => row.성명 === emp.name);
    if (!exists) {
      const basicHours = defaultHours;
      const hourlyWage = parseFloat(emp.hourlyWage) || 0;
      const basicSalary = hourlyWage * basicHours;

      const newRow = {
        부서: emp.department || '미지정',
        성명: emp.name,
        직급: emp.rank || emp.position || '미지정',
        입사일자: emp.hireDate || '2024-01-01',
        시급: emp.hourlyWage || '',
        기본시간: basicHours,
        기본급: basicSalary,
        연장수당_시간: '',
        연장수당_금액: '',
        휴일근로수당_시간: '',
        휴일근로수당_금액: '',
        야간근로수당_시간: '',
        야간근로수당_금액: '',
        지각조퇴_시간: '',
        지각조퇴_금액: '',
        결근무급주휴_일수: '',
        결근무급주휴_금액: '',
        차량: '',
        교통비: '',
        통신비: '',
        기타수당: '',
        년차수당_일수: '',
        년차수당_금액: '',
        상여금: '',
        급여합계: basicSalary.toLocaleString() || '0',
        소득세: '',
        지방세: '',
        국민연금: '',
        건강보험: '',
        장기요양: '',
        고용보험: '',
        가불금과태료: '',
        매칭IRP적립: '',
        경조비기타공제: '',
        기숙사: '',
        건강보험연말정산: '',
        장기요양연말정산: '',
        연말정산징수세액: '',
        공제합계: '',
        차인지급액: basicSalary.toLocaleString() || '0',
        결근무휴: '',
        년차: '',
        지각조퇴외출: '',
      };

      updatedPayrollData.push(newRow);
      newItemsCreated++;
      newEmployees.push({
        id: emp.id,
        name: emp.name,
        department: emp.department,
      });
    }
  });

  return {
    updatedPayrollData,
    newItemsCreated,
    newEmployees,
  };
};

/**
 * 직원 데이터와 급여대장 동기화 처리
 * @param {Array} employees - 직원 목록
 * @param {Array} payrollTableData - 급여대장 데이터
 * @param {number} defaultHours - 기본 근무 시간
 * @param {number} currentYear - 현재 연도
 * @param {number} currentMonth - 현재 월
 * @returns {Object} { updatedPayrollData: Array, changesCount: number, added: Array, updated: Array, removed: Array }
 */
export const syncEmployeesWithPayrollService = (
  employees,
  payrollTableData,
  defaultHours,
  currentYear,
  currentMonth
) => {
  let updatedPayrollData = [...payrollTableData];
  let changesCount = 0;
  const added = [];
  const updated = [];
  const removed = [];

  const activeEmployees = employees.filter((emp) => emp.status === '재직');

  // Add or update active employees
  activeEmployees.forEach((emp) => {
    const existsInPayroll = updatedPayrollData.find(
      (row) => row.성명 === emp.name
    );

    if (!existsInPayroll) {
      // Add new employee to payroll
      const newPayrollEntry = {
        지급년도: currentYear,
        지급월: currentMonth,
        성명: emp.name,
        부서: emp.department || '미정',
        직급: emp.position || '사원',
        입사일자: emp.joinDate || emp.hireDate || '미정',
        근무형태: emp.workType || '주간',
        시급: emp.hourlyWage || emp.salary || 0,
        기본시간: defaultHours,
        기본급: Math.round((emp.hourlyWage || emp.salary || 0) * defaultHours),
        연장수당_시간: 0,
        연장수당_금액: 0,
        휴일근로수당_시간: 0,
        휴일근로수당_금액: 0,
        야간근로수당_시간: 0,
        야간근로수당_금액: 0,
        교통비: 0,
        통신비: 0,
        기타수당: 0,
        년차수당_시간: 0,
        년차수당_금액: 0,
        상여금: 0,
        급여합계: Math.round(
          (emp.hourlyWage || emp.salary || 0) * defaultHours
        ),
        소득세: 0,
        지방세: 0,
        국민연금: 0,
        건강보험: 0,
        장기요양: 0,
        고용보험: 0,
        공제합계: 0,
        차인지급액: Math.round(
          (emp.hourlyWage || emp.salary || 0) * defaultHours
        ),
        결근무휴: 0,
        년차: 0,
        지각조퇴외출: 0,
        지급유형: '정규',
        은행: emp.bank || '',
        계좌번호: emp.account || '',
        비고: '신규 직원 자동 추가',
      };

      updatedPayrollData.push(newPayrollEntry);
      changesCount++;
      added.push({
        name: emp.name,
        department: emp.department,
        position: emp.position,
      });
    } else {
      // Update existing employee if needed
      const payrollIndex = updatedPayrollData.findIndex(
        (row) => row.성명 === emp.name
      );
      if (payrollIndex !== -1) {
        const currentRow = updatedPayrollData[payrollIndex];
        const needsUpdate =
          currentRow.부서 !== emp.department ||
          currentRow.직급 !== emp.position ||
          currentRow.입사일자 !== (emp.joinDate || emp.hireDate) ||
          currentRow.근무형태 !== emp.workType ||
          currentRow.시급 !== (emp.hourlyWage || emp.salary);

        if (needsUpdate) {
          updatedPayrollData[payrollIndex] = {
            ...currentRow,
            부서: emp.department || currentRow.부서,
            직급: emp.position || currentRow.직급,
            입사일자: emp.joinDate || emp.hireDate || currentRow.입사일자,
            근무형태: emp.workType || currentRow.근무형태,
            시급: emp.hourlyWage || emp.salary || currentRow.시급,
            기본급: Math.round(
              (emp.hourlyWage || emp.salary || currentRow.시급) *
                currentRow.기본시간
            ),
            차인지급액:
              Math.round(
                (emp.hourlyWage || emp.salary || currentRow.시급) *
                  currentRow.기본시간
              ) - currentRow.공제합계,
            비고: currentRow.비고
              ? `${currentRow.비고} (정보 업데이트)`
              : '정보 업데이트',
          };
          changesCount++;
          updated.push({
            name: emp.name,
            department: emp.department,
            position: emp.position,
          });
        }
      }
    }
  });

  // Remove resigned employees
  const resignedEmployees = employees.filter((emp) => emp.status === '퇴사');
  const resignedNames = resignedEmployees.map((emp) => emp.name);

  const beforeResignedFilter = updatedPayrollData.length;
  updatedPayrollData = updatedPayrollData.filter((row) => {
    const shouldRemove = resignedNames.includes(row.성명);
    if (shouldRemove) {
      removed.push({
        name: row.성명,
        department: row.부서,
        lastSalary: row.차인지급액,
      });
    }
    return !shouldRemove;
  });

  const removedCount = beforeResignedFilter - updatedPayrollData.length;
  changesCount += removedCount;

  return {
    updatedPayrollData,
    changesCount,
    added,
    updated,
    removed,
  };
};

/**
 * 급여 히스토리 데이터 생성
 * @param {Object} payrollRow - 급여대장 행 데이터
 * @param {string} currentMonth - 현재 월 (YYYY-MM 형식)
 * @param {string} employeeName - 직원 이름
 * @returns {Object} 급여 히스토리 데이터
 */
export const createSalaryHistoryEntry = (
  payrollRow,
  currentMonth,
  employeeName
) => {
  const parsePayrollValue = (value) => {
    return parseFloat(value?.toString().replace(/,/g, '')) || 0;
  };

  return {
    month: currentMonth,
    employeeName: employeeName,
    기본급: parsePayrollValue(payrollRow.기본급),
    연장수당: parsePayrollValue(payrollRow.연장수당_금액),
    휴일근로수당: parsePayrollValue(payrollRow.휴일근로수당_금액),
    야간근로수당: parsePayrollValue(payrollRow.야간근로수당_금액),
    교통비: parsePayrollValue(payrollRow.교통비),
    통신비: parsePayrollValue(payrollRow.통신비),
    기타수당: parsePayrollValue(payrollRow.기타수당),
    년차수당: parsePayrollValue(payrollRow.년차수당_금액),
    상여금: parsePayrollValue(payrollRow.상여금),
    totalGross: parsePayrollValue(payrollRow.급여합계),
    소득세: parsePayrollValue(payrollRow.소득세),
    지방세: parsePayrollValue(payrollRow.지방세),
    국민연금: parsePayrollValue(payrollRow.국민연금),
    건강보험: parsePayrollValue(payrollRow.건강보험),
    장기요양: parsePayrollValue(payrollRow.장기요양),
    고용보험: parsePayrollValue(payrollRow.고용보험),
    totalDeduction: parsePayrollValue(payrollRow.공제합계),
    netPay: parsePayrollValue(payrollRow.차인지급액),
    updatedAt: new Date().toISOString(),
  };
};

/**
 * 직원 정보 업데이트 데이터 생성
 * @param {Object} payrollRow - 급여대장 행 데이터
 * @returns {Object} 업데이트할 직원 정보
 */
export const createEmployeeUpdateData = (payrollRow) => {
  const parsePayrollValue = (value) => {
    return parseFloat(value?.toString().replace(/,/g, '')) || 0;
  };

  return {
    salary: parsePayrollValue(payrollRow.차인지급액),
    department: payrollRow.부서,
    position: payrollRow.직급,
    hourlyWage: payrollRow.시급,
  };
};

// ============================================================
// [2_관리자 모드] 2.9_급여 관리 - UTILS
// ============================================================

/**
 * 연도와 월을 조합하여 월별 키를 생성하는 함수
 * @param {number} year - 연도
 * @param {number} month - 월 (1-12)
 * @returns {string} 형식: "YYYY-MM"
 */
export const ymKey = (year, month) =>
  `${year}-${String(month).padStart(2, '0')}`;

/**
 * 급여 데이터의 해시값을 생성하는 함수
 * 급여 데이터의 변경 여부를 감지하기 위해 사용
 * @param {Array} data - 급여 데이터 배열
 * @returns {string|null} Base64 인코딩된 해시 문자열 또는 null
 */
export const payrollHash = (data) => {
  if (!data || data.length === 0) return null;
  try {
    const hashData = data.map((item) => ({
      name: item.성명,
      dept: item.부서,
      total: item.급여합계,
    }));
    const jsonStr = JSON.stringify(hashData);
    // 한글을 포함한 유니코드 문자를 처리하기 위해 encodeURIComponent 사용
    return btoa(
      encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode(parseInt('0x' + p1));
      })
    );
  } catch (error) {
    console.error('해시 생성 오류:', error);
    return null;
  }
};

/**
 * 수당 계산
 * @param {Object} employeeData - 직원 데이터
 * @param {Array} attendanceRecords - 근태 기록
 * @param {string} month - 월
 * @returns {Object} 수당 정보
 */
export const calcAllowances = (employeeData, attendanceRecords, month) => {
  return {
    meal: 0, // 식대
    transport: 0, // 교통비
    position: 0, // 직책수당
    skill: 0, // 기술수당
    attendance: 0, // 근태수당
    special: 0, // 특별수당
  };
};

/**
 * 공제 계산
 * @param {number} totalGross - 총 급여
 * @param {Object} employeeData - 직원 데이터
 * @returns {Object} 공제 정보
 */
export const calcDeductions = (totalGross, employeeData) => {
  return {
    tax: 0, // 소득세
    nationalPension: 0, // 국민연금
    healthInsurance: 0, // 건강보험
    employmentInsurance: 0, // 고용보험
    lunch: 0, // 중식비
    union: 0, // 조합비
    other: 0, // 기타공제
  };
};

/**
 * 급여대장 엑셀 다운로드
 * @param {Array} payrollTableData - 급여대장 데이터
 * @param {Object} filter - 필터 조건 (year, month)
 * @param {Function} safeFormatNumber - 숫자 포맷팅 함수
 * @returns {void}
 */
export const exportPayrollXLSX = (
  payrollTableData,
  filter,
  safeFormatNumber
) => {
  return CommonDownloadService.exportPayrollXLSX(
    payrollTableData,
    { year: filter.year, month: filter.month },
    safeFormatNumber
  );
};

// ============================================================
// [2_관리자 모드] 2.9_급여 관리 - EXPORTS (update-only)
// ============================================================

// Hook exports
// - usePayrollManagement
// - usePayrollFilter

// Service exports
// - parseNumber
// - parseText
// - parseDate
// - detectPayrollMonthService
// - calculatePayrollTotalsService
// - normalizePayrollKeysService
// - ensureMonthlyPayrollDataService
// - createMissingPayrollItemsService
// - syncEmployeesWithPayrollService
// - createSalaryHistoryEntry
// - createEmployeeUpdateData

// Util exports
// - ymKey
// - payrollHash
// - calcAllowances
// - calcDeductions
// - exportPayrollXLSX
