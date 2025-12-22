/**
 * [3_일반직원 모드] 3.6_급여 내역 통합 모듈
 * - Constants → Hook → Util → Export
 * - UI 컴포넌트 제외, 지원 로직만 포함
 */

import { useCallback } from 'react';

// ============================================================
// [3_일반직원 모드] 3.6_급여 내역 - CONSTANTS
// ============================================================

/**
 * 급여 페이지 크기
 */
export const SALARY_PAGE_SIZE = 15;

// ============================================================
// [3_일반직원 모드] 3.6_급여 내역 - HOOKS
// ============================================================

/**
 * 일반직원 급여 내역 관리 Hook
 * @param {Object} dependencies - 외부 의존성
 * @returns {Object} 급여 관리 함수들
 */
export const useStaffSalary = (dependencies = {}) => {
  const {
    setSalaryPasswordInput = () => {},
    setSalaryPasswordError = () => {},
    setShowSalaryPasswordPopup = () => {},
    setShowSalaryHistoryPopup = () => {},
    salaryPasswordInput = '',
    currentUser = {},
    getText = (ko, en) => ko,
    devLog = () => {},
    payrollByMonth = {},
    PAYROLL_INCOME_ITEMS = [],
    PAYROLL_DEDUCTION_ITEMS = [],
  } = dependencies;

  // [3_일반직원 모드] 3.6_급여 내역 - 급여 비밀번호 팝업 표시
  const handleShowSalaryHistoryPopup = useCallback(() => {
    setSalaryPasswordInput('');
    setSalaryPasswordError('');
    setShowSalaryPasswordPopup(true);
  }, [
    setSalaryPasswordInput,
    setSalaryPasswordError,
    setShowSalaryPasswordPopup,
  ]);

  // [3_일반직원 모드] 3.6_급여 내역 - 급여 비밀번호 확인
  const handleSalaryPasswordConfirm = useCallback(() => {
    const inputPassword = salaryPasswordInput.trim();
    const userPassword = currentUser.password
      ? String(currentUser.password).trim()
      : '';

    devLog('급여 비밀번호 확인:', {
      입력값: inputPassword,
      저장된비밀번호: userPassword,
      일치여부: inputPassword === userPassword,
    });

    if (inputPassword === userPassword) {
      setShowSalaryPasswordPopup(false);
      setShowSalaryHistoryPopup(true);
      setSalaryPasswordInput('');
      setSalaryPasswordError('');
    } else {
      setSalaryPasswordError(
        getText('비밀번호가 일치하지 않습니다.', 'Password does not match.')
      );
    }
  }, [
    salaryPasswordInput,
    currentUser,
    devLog,
    setShowSalaryPasswordPopup,
    setShowSalaryHistoryPopup,
    setSalaryPasswordInput,
    setSalaryPasswordError,
    getText,
  ]);

  // [3_일반직원 모드] 3.6_급여 내역 - 급여 내역 생성
  const generateSalaryHistory = useCallback(
    (joinDate, employeeId = currentUser?.id, customPayrollData = null) => {
      if (!currentUser) {
        devLog('❌ 현재 사용자 정보 없음');
        return [];
      }

      // customPayrollData가 제공되면 그것을 사용, 아니면 기본 payrollByMonth 사용
      const sourceData = customPayrollData || payrollByMonth;

      const allPayrollData = [];
      if (sourceData && typeof sourceData === 'object') {
        Object.keys(sourceData).forEach((ymKey) => {
          const monthData = sourceData[ymKey];
          if (Array.isArray(monthData)) {
            monthData.forEach((payroll) => {
              if (!payroll.귀속년월) {
                payroll.귀속년월 = ymKey;
              }
              allPayrollData.push(payroll);
            });
          }
        });
      }

      if (allPayrollData.length === 0) {
        devLog('❌ 급여 내역 없음 (payrollByMonth 비어있음)');
        return [];
      }

      devLog('🔍 급여 데이터 필터링:', {
        currentUserName: currentUser?.name,
        currentUserId: currentUser?.id,
        totalPayrollData: allPayrollData.length,
        availableMonths: Object.keys(payrollByMonth || {}),
        samplePayroll: allPayrollData[0],
      });

      const myPayrollData = allPayrollData.filter((payroll) => {
        const nameMatch =
          payroll.성명 === currentUser?.name ||
          payroll.직원명 === currentUser?.name ||
          payroll.name === currentUser?.name ||
          payroll.이름 === currentUser?.name;
        const idMatch =
          payroll.id === currentUser?.id ||
          payroll.직원ID === currentUser?.id ||
          payroll.employeeId === currentUser?.id;

        return nameMatch || idMatch;
      });

      devLog('✅ 필터링된 급여 데이터:', myPayrollData.length, myPayrollData);

      const INCOME_FIELD_MAP = {
        기본급: '기본급',
        연장수당: '연장수당_금액',
        휴일근로수당: '휴일근로수당_금액',
        야간근로수당: '야간근로수당_금액',
        '지각/조퇴': '지각조퇴_금액',
        '결근/무급/주휴': '결근무급주휴_금액',
        차량: '차량',
        교통비: '교통비',
        통신비: '통신비',
        기타수당: '기타수당',
        년차수당: '년차수당_금액',
        상여금: '상여금',
      };

      const INCOME_HOURS_MAP = {
        연장수당: '연장수당_시간',
        휴일근로수당: '휴일근로수당_시간',
        야간근로수당: '야간근로수당_시간',
        '지각/조퇴': '지각조퇴_시간',
        '결근/무급/주휴': '결근무급주휴_일수',
        년차수당: '년차수당_일수',
      };

      const DEDUCTION_FIELD_MAP = {
        소득세: '소득세',
        지방세: '지방세',
        국민연금: '국민연금',
        건강보험: '건강보험',
        장기요양: '장기요양',
        고용보험: '고용보험',
        '가불금(과태료)': '가불금과태료',
        매칭IRP적립: '매칭IRP적립',
        '경조비(기타공제)': '경조비기타공제',
        기숙사: '기숙사',
        건강보험연말정산: '건강보험연말정산',
        장기요양연말정산: '장기요양연말정산',
        연말정산징수세액: '연말정산징수세액',
      };

      const salaryHistory = myPayrollData.map((payroll) => {
        const incomeDetails = PAYROLL_INCOME_ITEMS.map((item) => {
          const fieldName = INCOME_FIELD_MAP[item] || item;
          const hoursFieldName = INCOME_HOURS_MAP[item];
          return {
            label: item,
            amount:
              parseFloat(payroll[fieldName]?.toString().replace(/,/g, '')) || 0,
            hours: hoursFieldName
              ? parseFloat(
                  payroll[hoursFieldName]?.toString().replace(/,/g, '')
                ) || 0
              : null,
          };
        });

        const deductionDetails = PAYROLL_DEDUCTION_ITEMS.map((item) => {
          const fieldName = DEDUCTION_FIELD_MAP[item] || item;
          return {
            label: item,
            amount:
              parseFloat(payroll[fieldName]?.toString().replace(/,/g, '')) || 0,
          };
        });

        const calculatedTotalGross = incomeDetails.reduce(
          (sum, item) => sum + item.amount,
          0
        );

        const calculatedTotalDeduction = deductionDetails.reduce(
          (sum, item) => sum + item.amount,
          0
        );

        const calculatedNetPay =
          calculatedTotalGross - calculatedTotalDeduction;

        return {
          month:
            payroll.귀속년월 ||
            `${payroll.year || new Date().getFullYear()}-${String(
              payroll.month || new Date().getMonth() + 1
            ).padStart(2, '0')}`,
          incomeDetails,
          deductionDetails,

          totalGross: calculatedTotalGross,
          totalDeduction: calculatedTotalDeduction,
          netPay: calculatedNetPay,
          updatedAt: payroll.updatedAt || new Date().toISOString(),
        };
      });

      // 값이 0이 아닌 급여 데이터만 필터링 (실제 급여 내역이 있는 월만 표시)
      const filteredSalaryHistory = salaryHistory.filter((salary) => {
        return salary.totalGross > 0 || salary.netPay > 0;
      });

      return filteredSalaryHistory.sort((a, b) => b.month.localeCompare(a.month));
    },
    [
      currentUser,
      payrollByMonth,
      devLog,
      PAYROLL_INCOME_ITEMS,
      PAYROLL_DEDUCTION_ITEMS,
    ]
  );

  return {
    handleShowSalaryHistoryPopup,
    handleSalaryPasswordConfirm,
    generateSalaryHistory,
  };
};

// ============================================================
// [3_일반직원 모드] 3.6_급여 내역 - UTILS
// ============================================================

/**
 * 급여 금액 마스킹
 * @param {number} amount - 급여 금액
 * @returns {string} 마스킹된 문자열
 */
export const maskSalary = (amount) => {
  const str = amount.toLocaleString();
  return '*'.repeat(str.length);
};

/**
 * 급여 내역 생성 (Util 구현체)
 * @param {Object} payrollByMonth - 월별 급여 데이터
 * @param {Object} currentUser - 현재 사용자 정보
 * @param {Array} PAYROLL_INCOME_ITEMS - 급여 항목 목록
 * @param {Array} PAYROLL_DEDUCTION_ITEMS - 공제 항목 목록
 * @returns {Array} 급여 내역 배열
 */
export const generateSalaryHistoryImpl = (
  payrollByMonth,
  currentUser,
  PAYROLL_INCOME_ITEMS,
  PAYROLL_DEDUCTION_ITEMS
) => {
  const __DEV__ = false; // 로그 비활성화
  const devLog = (...args) => {
    if (__DEV__) console.log(...args);
  };

  if (!currentUser) {
    devLog('❌ 현재 사용자 정보 없음');
    return [];
  }

  const allPayrollData = [];
  if (payrollByMonth && typeof payrollByMonth === 'object') {
    Object.keys(payrollByMonth).forEach((ymKey) => {
      const monthData = payrollByMonth[ymKey];
      if (Array.isArray(monthData)) {
        monthData.forEach((payroll) => {
          if (!payroll.귀속년월) {
            payroll.귀속년월 = ymKey;
          }
          allPayrollData.push(payroll);
        });
      }
    });
  }

  if (allPayrollData.length === 0) {
    devLog('❌ 급여 내역 없음 (payrollByMonth 비어있음)');
    return [];
  }

  devLog('🔍 급여 데이터 필터링:', {
    currentUserName: currentUser?.name,
    currentUserId: currentUser?.id,
    totalPayrollData: allPayrollData.length,
    availableMonths: Object.keys(payrollByMonth || {}),
    samplePayroll: allPayrollData[0],
  });

  const myPayrollData = allPayrollData.filter((payroll) => {
    const nameMatch =
      payroll.성명 === currentUser?.name ||
      payroll.직원명 === currentUser?.name ||
      payroll.name === currentUser?.name ||
      payroll.이름 === currentUser?.name;
    const idMatch =
      payroll.id === currentUser?.id ||
      payroll.직원ID === currentUser?.id ||
      payroll.employeeId === currentUser?.id;

    return nameMatch || idMatch;
  });

  devLog('✅ 필터링된 급여 데이터:', myPayrollData.length, myPayrollData);

  const INCOME_FIELD_MAP = {
    기본급: '기본급',
    연장수당: '연장수당_금액',
    휴일근로수당: '휴일근로수당_금액',
    야간근로수당: '야간근로수당_금액',
    '지각/조퇴': '지각조퇴_금액',
    '결근/무급/주휴': '결근무급주휴_금액',
    차량: '차량',
    교통비: '교통비',
    통신비: '통신비',
    기타수당: '기타수당',
    년차수당: '년차수당_금액',
    상여금: '상여금',
  };

  const INCOME_HOURS_MAP = {
    연장수당: '연장수당_시간',
    휴일근로수당: '휴일근로수당_시간',
    야간근로수당: '야간근로수당_시간',
    '지각/조퇴': '지각조퇴_시간',
    '결근/무급/주휴': '결근무급주휴_일수',
    년차수당: '년차수당_일수',
  };

  const DEDUCTION_FIELD_MAP = {
    소득세: '소득세',
    지방세: '지방세',
    국민연금: '국민연금',
    건강보험: '건강보험',
    장기요양: '장기요양',
    고용보험: '고용보험',
    '가불금(과태료)': '가불금과태료',
    매칭IRP적립: '매칭IRP적립',
    '경조비(기타공제)': '경조비기타공제',
    기숙사: '기숙사',
    건강보험연말정산: '건강보험연말정산',
    장기요양연말정산: '장기요양연말정산',
    연말정산징수세액: '연말정산징수세액',
  };

  const salaryHistory = myPayrollData.map((payroll) => {
    const incomeDetails = PAYROLL_INCOME_ITEMS.map((item) => {
      const fieldName = INCOME_FIELD_MAP[item] || item;
      const hoursFieldName = INCOME_HOURS_MAP[item];
      return {
        label: item,
        amount:
          parseFloat(payroll[fieldName]?.toString().replace(/,/g, '')) || 0,
        hours: hoursFieldName
          ? parseFloat(payroll[hoursFieldName]?.toString().replace(/,/g, '')) ||
            0
          : null,
      };
    });

    const deductionDetails = PAYROLL_DEDUCTION_ITEMS.map((item) => {
      const fieldName = DEDUCTION_FIELD_MAP[item] || item;
      return {
        label: item,
        amount:
          parseFloat(payroll[fieldName]?.toString().replace(/,/g, '')) || 0,
      };
    });

    const calculatedTotalGross = incomeDetails.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    const calculatedTotalDeduction = deductionDetails.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    const calculatedNetPay = calculatedTotalGross - calculatedTotalDeduction;

    return {
      month:
        payroll.귀속년월 ||
        `${payroll.year || new Date().getFullYear()}-${String(
          payroll.month || new Date().getMonth() + 1
        ).padStart(2, '0')}`,
      incomeDetails,
      deductionDetails,

      totalGross: calculatedTotalGross,
      totalDeduction: calculatedTotalDeduction,
      netPay: calculatedNetPay,
      updatedAt: payroll.updatedAt || new Date().toISOString(),
    };
  });

  // 값이 0이 아닌 급여 데이터만 필터링 (실제 급여 내역이 있는 월만 표시)
  const filteredSalaryHistory = salaryHistory.filter((salary) => {
    return salary.totalGross > 0 || salary.netPay > 0;
  });

  return filteredSalaryHistory.sort((a, b) => b.month.localeCompare(a.month));
};

// ============================================================
// [3_일반직원 모드] 3.6_급여 내역 - EXPORTS (update-only)
// ============================================================

/**
 * EXPORTS:
 *
 * [Constants]
 * - SALARY_PAGE_SIZE: 급여 페이지 크기 (15)
 *
 * [Hooks]
 * - useStaffSalary: 일반직원 급여 내역 관리 Hook
 *   → handleShowSalaryHistoryPopup: 급여 비밀번호 팝업 표시
 *   → handleSalaryPasswordConfirm: 급여 비밀번호 확인
 *   → generateSalaryHistory: 급여 내역 생성
 *
 * [Services]
 * - (없음)
 *
 * [Utils]
 * - maskSalary: 급여 금액 마스킹
 * - generateSalaryHistoryImpl: 급여 내역 생성 (Util 구현체)
 */
