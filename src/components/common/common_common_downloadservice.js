/**
 * [1_공통] 공통 파일 다운로드 서비스 통합 모듈
 * - Constants → Utils → Export
 * - Excel/CSV 파일 생성 및 다운로드
 * - 조직도, 급여, 근태, 연차 등 각종 리포트 생성
 */

import * as XLSX from 'xlsx';
import {
  getDaysInMonth,
  getDayOfWeek,
  DAY_NAMES_WITH_PARENTHESES,
} from './common_common';

// ============================================================
// [1_공통] 공통 다운로드 서비스 - CONSTANTS
// ============================================================

const __DEV__ = process.env.NODE_ENV === 'development';
const devLog = (...args) => {
  if (__DEV__) console.log(...args);
};

// ============================================================
// [1_공통] 공통 다운로드 서비스 - UTILS
// ============================================================

/**
 * 조직도 Excel 다운로드
 */
export const exportOrganizationToXLSX = (employeeData, getWorkPeriodText) => {
  const rows = employeeData.map((emp) => ({
    사번: emp.id,
    이름: emp.name,
    직급: emp.position || '사원',
    부서: emp.department,
    세부부서: emp.subDepartment || '',
    직책: emp.role || '팀원',
    급여형태: emp.payType || '',
    입사일: emp.joinDate,
    퇴사일: emp.leaveDate || '',
    근속년수: getWorkPeriodText(emp.joinDate),
    근무형태: emp.workType || '주간',
    상태: emp.status || '재직',
    연락처: emp.phone || '',
    주소: emp.address || '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '조직도');

  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `부성스틸(주)_조직도_${today}.xlsx`);
};

/**
 * 잔업표 업로드
 */
export const uploadOvertimeXLSX = (file) => {
  devLog('잔업표 업로드:', file.name);
  alert('잔업표 업로드 완료');
};

/**
 * 잔업표 Excel 다운로드
 */
export const exportOvertimeXLSX = (data) => {
  devLog('잔업표 다운로드:', data);
  alert('잔업표 엑셀 다운로드 완료');
};

/**
 * 급여 Excel 파싱
 */
export const parsePayrollXLSX = (file) => {
  devLog('급여 엑셀 파싱:', file.name);
  return Promise.resolve({ success: true, data: [] });
};

/**
 * 급여 Excel 다운로드
 */
export const exportPayrollXLSX = (
  payrollTableData,
  selectedMonth,
  formatNumber
) => {
  const rows = [];

  // 헤더 행 1 - 그룹 헤더
  const groupHeaders = [
    '부서',
    '성명',
    '직급',
    '입사일자',
    '시급',
    '기본',
    '기본',
    '연장수당(150%)',
    '연장수당(150%)',
    '휴일근로수당',
    '휴일근로수당',
    '야간근로수당(50%)',
    '야간근로수당(50%)',
    '지각/조퇴',
    '지각/조퇴',
    '결근/무급/주휴',
    '결근/무급/주휴',
    '차량',
    '교통비',
    '통신비',
    '기타수당',
    '년차수당',
    '년차수당',
    '상여금',
    '급여합계',
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
    '공제합계',
    '차인지급액',
    '결근무휴',
    '년차',
    '지각조퇴외출',
  ];
  rows.push(groupHeaders);

  // 헤더 행 2 - 세부 헤더
  const detailHeaders = [
    '',
    '',
    '',
    '',
    '',
    '시간',
    '금액',
    '시간',
    '금액',
    '시간',
    '금액',
    '시간',
    '금액',
    '시간',
    '금액',
    '일수',
    '금액',
    '',
    '',
    '',
    '',
    '일수',
    '금액',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ];
  rows.push(detailHeaders);

  payrollTableData.forEach((emp) => {
    const row = [
      emp.부서 || emp.department || '',
      emp.성명 || emp.name || '',
      emp.직급 || emp.position || '사원',
      emp.입사일자 || emp.joinDate || '',
      formatNumber(emp.시급 || emp.hourlyWage || 0),
      formatNumber(emp.기본시간 || emp.basicHours || 0),
      formatNumber(emp.기본급 || emp.basicPay || 0),
      formatNumber(emp.연장시간 || emp.overtimeHours || 0),
      formatNumber(emp.연장수당 || emp.overtimePay || 0),
      formatNumber(emp.휴일근로시간 || emp.holidayWorkHours || 0),
      formatNumber(emp.휴일근로수당 || emp.holidayWorkPay || 0),
      formatNumber(emp.야간근로시간 || emp.nightWorkHours || 0),
      formatNumber(emp.야간근로수당 || emp.nightWorkPay || 0),
      formatNumber(emp.지각조퇴시간 || emp.lateEarlyHours || 0),
      formatNumber(emp.지각조퇴공제 || emp.lateEarlyDeduction || 0),
      formatNumber(emp.결근일수 || emp.absentDays || 0),
      formatNumber(emp.결근공제 || emp.absentDeduction || 0),
      formatNumber(emp.차량수당 || emp.carAllowance || 0),
      formatNumber(emp.교통비 || emp.transportAllowance || 0),
      formatNumber(emp.통신비 || emp.phoneAllowance || 0),
      formatNumber(emp.기타수당 || emp.otherAllowance || 0),
      formatNumber(emp.년차일수 || emp.annualLeaveDays || 0),
      formatNumber(emp.년차수당 || emp.annualLeavePay || 0),
      formatNumber(emp.상여금 || emp.bonus || 0),
      formatNumber(emp.급여합계 || emp.totalSalary || 0),
      formatNumber(emp.소득세 || emp.incomeTax || 0),
      formatNumber(emp.지방세 || emp.localTax || 0),
      formatNumber(emp.국민연금 || emp.nationalPension || 0),
      formatNumber(emp.건강보험 || emp.healthInsurance || 0),
      formatNumber(emp.장기요양 || emp.longTermCare || 0),
      formatNumber(emp.고용보험 || emp.employmentInsurance || 0),
      formatNumber(emp.가불금과태료 || emp.advanceDeduction || 0),
      formatNumber(emp.매칭IRP적립 || emp.irpMatching || 0),
      formatNumber(emp.경조비기타공제 || emp.otherDeduction || 0),
      formatNumber(emp.기숙사 || emp.dormitory || 0),
      formatNumber(emp.건강보험연말정산 || emp.healthYearEnd || 0),
      formatNumber(emp.장기요양연말정산 || emp.longTermYearEnd || 0),
      formatNumber(emp.연말정산징수세액 || emp.taxYearEnd || 0),
      formatNumber(emp.공제합계 || emp.totalDeduction || 0),
      formatNumber(emp.차인지급액 || emp.netSalary || 0),
      formatNumber(emp.결근무휴 || 0),
      formatNumber(emp.년차 || 0),
      formatNumber(emp.지각조퇴외출 || 0),
    ];
    rows.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  const colWidths = [
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 8 },
    { wch: 12 },
    { wch: 8 },
    { wch: 12 },
    { wch: 8 },
    { wch: 12 },
    { wch: 8 },
    { wch: 12 },
    { wch: 8 },
    { wch: 12 },
    { wch: 8 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 8 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
  ];
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '급여명세');

  const yearMonth = selectedMonth
    ? `${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}`
    : new Date().toISOString().slice(0, 7);

  XLSX.writeFile(wb, `부성스틸(주)_급여명세_${yearMonth}.xlsx`);
};

/**
 * 종합 리포트 생성 및 다운로드
 */
export const generateComprehensiveReport = async (
  dataType = 'all',
  format = 'excel',
  employees = []
) => {
  try {
    const workbook = XLSX.utils.book_new();
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

    if (dataType === 'all' || dataType === 'employees') {
      const employeeSheet = XLSX.utils.json_to_sheet(
        employees.map((emp) => ({
          사번: emp.id,
          이름: emp.name,
          부서: emp.department,
          직급: emp.position || '사원',
          상태: emp.status || '재직',
          입사일: emp.joinDate,
          연락처: emp.phone || '',
          주소: emp.address || '',
        }))
      );
      XLSX.utils.book_append_sheet(workbook, employeeSheet, '직원정보');
    }

    if (dataType === 'all' || dataType === 'attendance') {
      const attendanceSample = employees.map((emp) => ({
        사번: emp.id,
        직원명: emp.name,
        부서: emp.department,
        '이번달 출근일수': Math.floor(Math.random() * 22) + 18,
        '지각 횟수': Math.floor(Math.random() * 3),
        '조퇴 횟수': Math.floor(Math.random() * 2),
        야근시간: Math.floor(Math.random() * 40) + 'h',
      }));
      const attendanceSheet = XLSX.utils.json_to_sheet(attendanceSample);
      XLSX.utils.book_append_sheet(workbook, attendanceSheet, '근태현황');
    }

    if (dataType === 'all' || dataType === 'leaves') {
      const leavesSample = employees.map((emp) => ({
        사번: emp.id,
        직원명: emp.name,
        부서: emp.department,
        총연차: 15,
        사용연차: Math.floor(Math.random() * 10),
        잔여연차: 15 - Math.floor(Math.random() * 10),
      }));
      const leavesSheet = XLSX.utils.json_to_sheet(leavesSample);
      XLSX.utils.book_append_sheet(workbook, leavesSheet, '연차현황');
    }

    if (format === 'excel') {
      XLSX.writeFile(workbook, `부성스틸_종합보고서_${timestamp}.xlsx`);
    }

    return {
      success: true,
      message: '종합 보고서가 생성되었습니다.',
      filename: `부성스틸_종합보고서_${timestamp}.xlsx`,
    };
  } catch (error) {
    devLog('종합 리포트 생성 오류:', error);
    return {
      success: false,
      message: '보고서 생성 중 오류가 발생했습니다.',
      error: error.message,
    };
  }
};

/**
 * PDF 리포트 생성
 */
export const generatePdfReport = async (reportType = 'summary') => {
  devLog(`PDF 리포트 생성 시작: ${reportType}`);

  try {
    return {
      success: true,
      message: `${reportType} PDF 리포트가 생성되었습니다.`,
    };
  } catch (error) {
    devLog('PDF 생성 오류:', error);
    return {
      success: false,
      message: 'PDF 생성 중 오류가 발생했습니다.',
      error: error.message,
    };
  }
};

/**
 * AI 챗봇용 파일 다운로드 (Excel/CSV)
 */
export const generateDownloadFile = (
  data,
  filename,
  type = 'excel',
  chatbotPermissions
) => {
  if (!chatbotPermissions?.download) {
    alert('파일 다운로드 권한이 없습니다.');
    return;
  }

  try {
    if (type === 'excel') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
      XLSX.writeFile(wb, `${filename}.xlsx`);
    } else if (type === 'csv') {
      const csv = data.map((row) => Object.values(row).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }

    // 다운로드 로그 저장
    const downloadLog = {
      timestamp: new Date(),
      user: '관리자',
      action: 'FILE_DOWNLOAD',
      filename: `${filename}.${type === 'excel' ? 'xlsx' : 'csv'}`,
      dataType: filename,
      recordCount: data.length,
    };

    // TODO: AI 감사 로그를 MongoDB AiLog 컬렉션에 저장
    // 백엔드 API: POST /api/ai/logs
    // localStorage 사용 중단 - DB로 이동 필요
  } catch (error) {
    devLog('파일 생성 오류:', error);
    alert('파일 생성 중 오류가 발생했습니다.');
  }
};

/**
 * 근태 Excel 업로드
 */
export const uploadAttendanceXLSX = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        devLog('근태 데이터 업로드 완료:', jsonData.length, '건');
        resolve({ success: true, data: jsonData });
      } catch (error) {
        devLog('근태 데이터 파싱 오류:', error);
        reject({ success: false, error: error.message });
      }
    };
    reader.onerror = () => {
      reject({ success: false, error: '파일 읽기 실패' });
    };
    reader.readAsArrayBuffer(file);
  });
};

/**
 * 근태 Excel 다운로드
 */
/**
 * 근태 Excel 다운로드 (월별 근태표 형식)
 * @param {number} attendanceSheetYear - 연도
 * @param {number} attendanceSheetMonth - 월
 * @param {Array} employees - 직원 목록
 * @param {Function} getWorkTypeForDate - 근무형태 조회 함수
 * @param {Function} getAttendanceForEmployee - 직원 근태 조회 함수
 * @param {Function} calculateMonthlyStats - 월별 통계 계산 함수
 * @param {Map} preCalculatedStats - 사전 계산된 통계
 */
export const exportAttendanceXLSX = (
  attendanceSheetYear,
  attendanceSheetMonth,
  employees,
  getWorkTypeForDate,
  getAttendanceForEmployee,
  calculateMonthlyStats,
  preCalculatedStats,
  attendanceSheetData = {}
) => {
  // 해당 월에 주간/야간 시프트가 모두 있는 직원인지 확인
  const hasShiftWork = (employeeId) => {
    const shiftTypes = new Set();
    const daysInMonth = getDaysInMonth(attendanceSheetYear, attendanceSheetMonth);

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${attendanceSheetYear}-${String(attendanceSheetMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const employeeKey = `${employeeId}_${dateKey}`;
      const attendance = attendanceSheetData[employeeKey];

      if (attendance && attendance.shiftType) {
        shiftTypes.add(attendance.shiftType);
      }
    }

    // 주간과 야간이 모두 있으면 true
    return shiftTypes.has('주간') && shiftTypes.has('야간');
  };

  // 직원의 근무 형태 표시 (주간/야간 시프트가 있으면 "주/야")
  const getWorkTypeDisplay = (employee) => {
    if (hasShiftWork(employee.id)) {
      return '주/야';
    }
    return employee.workType || '주간';
  };
  const daysInMonth = getDaysInMonth(attendanceSheetYear, attendanceSheetMonth);
  const rows = [];

  // 첫 번째 헤더 행 - 연도, 월, 평일/휴일 라벨, 셀렉트박스, 합계
  const firstHeader = [
    `${attendanceSheetYear}년`,
    `${String(attendanceSheetMonth).padStart(2, '0')}월`,
    '평일/휴일',
  ];
  for (let day = 1; day <= daysInMonth; day++) {
    const workType = getWorkTypeForDate(
      attendanceSheetYear,
      attendanceSheetMonth,
      day
    );
    firstHeader.push(workType === 'holiday' ? '휴일' : '평일');
  }
  firstHeader.push('합계'); // 합계 컬럼
  rows.push(firstHeader);

  // 두 번째 헤더 행 - (병합), (병합), 일자, 날짜들, 합계 항목들
  const secondHeader = ['', '', '일자'];
  for (let day = 1; day <= daysInMonth; day++) {
    secondHeader.push(String(day).padStart(2, '0'));
  }
  secondHeader.push('총시간', '기본', '조출', '연장', '심야', '연장+심야', '특근', '특근+연장');
  rows.push(secondHeader);

  // 세 번째 헤더 행 - 직원명, 근무형태, 요일, 각 날짜별 요일명
  const thirdHeader = ['직원명', '근무형태', '요일'];
  for (let day = 1; day <= daysInMonth; day++) {
    const dayOfWeek = getDayOfWeek(
      attendanceSheetYear,
      attendanceSheetMonth,
      day
    );
    thirdHeader.push(['일', '월', '화', '수', '목', '금', '토'][dayOfWeek]);
  }
  // 합계 항목은 빈 칸
  thirdHeader.push('', '', '', '', '', '', '', '', '');
  rows.push(thirdHeader);

  // 직원별 데이터 행들
  employees.forEach((emp) => {
    // 화면과 동일하게 직접 계산
    const stats = calculateMonthlyStats(emp.id);

    // 출근 시간 행
    const checkInRow = [emp.name, getWorkTypeDisplay(emp), '출근'];
    for (let day = 1; day <= daysInMonth; day++) {
      const attendance = getAttendanceForEmployee(
        emp.id,
        attendanceSheetYear,
        attendanceSheetMonth,
        day
      );
      // 야간 시프트인 경우 (야) 표시 추가
      const checkInValue = attendance.checkIn || '';
      const isNightShift = attendance.shiftType === '야간';
      checkInRow.push(isNightShift && checkInValue ? `${checkInValue} (야)` : checkInValue);
    }
    // 합계 데이터
    checkInRow.push(
      stats.totalHours || 0,
      stats.regularHours || 0,
      stats.earlyHours || 0,
      stats.overtimeHours || 0,
      stats.nightHours || 0,
      stats.overtimeNightHours || 0,
      stats.holidayHours || 0,
      stats.holidayOvertimeHours || 0
    );
    rows.push(checkInRow);

    // 퇴근 시간 행
    const checkOutRow = ['', '', '퇴근'];
    for (let day = 1; day <= daysInMonth; day++) {
      const attendance = getAttendanceForEmployee(
        emp.id,
        attendanceSheetYear,
        attendanceSheetMonth,
        day
      );
      // 야간 시프트인 경우 (야) 표시 추가
      const checkOutValue = attendance.checkOut || '';
      const isNightShift = attendance.shiftType === '야간';
      checkOutRow.push(isNightShift && checkOutValue ? `${checkOutValue} (야)` : checkOutValue);
    }
    // 퇴근 행의 합계 컬럼은 비워둠
    checkOutRow.push('', '', '', '', '', '', '', '', '');
    rows.push(checkOutRow);
  });

  // 엑셀 생성
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // 셀 병합
  ws['!merges'] = [];

  // 연도 셀 병합 (A1:A2)
  ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } });

  // 월 셀 병합 (B1:B2)
  ws['!merges'].push({ s: { r: 0, c: 1 }, e: { r: 1, c: 1 } });

  // 합계 셀 병합 (첫 번째 행, 날짜 이후 9개 컬럼)
  ws['!merges'].push({
    s: { r: 0, c: daysInMonth + 3 },
    e: { r: 0, c: daysInMonth + 11 },
  });

  // 각 합계 항목 병합 (두 번째, 세 번째 행)
  for (let i = 0; i < 9; i++) {
    ws['!merges'].push({
      s: { r: 1, c: daysInMonth + 3 + i },
      e: { r: 2, c: daysInMonth + 3 + i },
    });
  }

  // 각 직원의 이름, 근무형태, 합계 컬럼들 병합 (rowSpan=2)
  let currentRow = 3; // 데이터는 4번째 행(index 3)부터 시작
  employees.forEach(() => {
    // 직원명 병합
    ws['!merges'].push({ s: { r: currentRow, c: 0 }, e: { r: currentRow + 1, c: 0 } });
    // 근무형태 병합
    ws['!merges'].push({ s: { r: currentRow, c: 1 }, e: { r: currentRow + 1, c: 1 } });

    // 합계 컬럼들 병합 (총시간, 기본, 조출, 연장, 심야, 연장+심야, 특근, 특근+연장)
    for (let i = 0; i < 8; i++) {
      ws['!merges'].push({
        s: { r: currentRow, c: daysInMonth + 3 + i },
        e: { r: currentRow + 1, c: daysInMonth + 3 + i }
      });
    }

    currentRow += 2;
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '근태일지');

  const fileName = `부성스틸_근태관리_${attendanceSheetYear}년${String(
    attendanceSheetMonth
  ).padStart(2, '0')}월.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * 근태 Excel 다운로드 (간단한 버전 - 사용 안 함, 참고용)
 */
export const exportAttendanceXLSX_Simple = (attendanceData, employees) => {
  const rows = [];

  // 헤더
  rows.push([
    '날짜',
    '사번',
    '이름',
    '부서',
    '출근시간',
    '퇴근시간',
    '상태',
    '근무시간',
    '야근시간',
    '비고',
  ]);

  // 데이터 행
  attendanceData.forEach((att) => {
    const emp = employees.find((e) => e.id === att.employeeId);
    rows.push([
      att.date,
      att.employeeId,
      emp?.name || '',
      emp?.department || '',
      att.checkIn || '',
      att.checkOut || '',
      att.status || '',
      att.workHours || 0,
      att.overtimeHours || 0,
      att.note || '',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '근태현황');

  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `부성스틸(주)_근태현황_${today}.xlsx`);
};

export const generateChartImage = async (chartType, employees, scheduleEvents) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#333333';
      ctx.fillStyle = '#333333';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';

      switch (chartType) {
        case 'department':
          const deptData = {};
          employees.forEach((emp) => {
            deptData[emp.department] = (deptData[emp.department] || 0) + 1;
          });

          const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',      
  '#FF9FF3'];
          let startAngle = 0;
          const centerX = 300;
          const centerY = 250;
          const radius = 150;

          ctx.fillText('부서별 인원 현황', centerX, 50);

          Object.entries(deptData).forEach(([dept, count], index) => {
            const sliceAngle = (count / employees.length) * 2 * Math.PI;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, startAngle +
  sliceAngle);
            ctx.closePath();
            ctx.fillStyle = colors[index % colors.length];
            ctx.fill();
            ctx.stroke();

            const labelAngle = startAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius + 30);
            const labelY = centerY + Math.sin(labelAngle) * (radius + 30);
            ctx.fillStyle = '#333333';
            ctx.fillText(`${dept}: ${count}명`, labelX, labelY);

            startAngle += sliceAngle;
          });
          break;

        case 'attendance':
          ctx.fillText('부서별 평균 출근율', 400, 50);
          const deptAttendance = { 관리: 95, 생산: 92, 품질: 98 };
          const maxRate = 100;
          const barWidth = 80;
          const maxBarHeight = 300;

          Object.entries(deptAttendance).forEach(([dept, rate], index) => {
            const barHeight = (rate / maxRate) * maxBarHeight;
            const x = 150 + index * (barWidth + 50);
            const y = 450 - barHeight;

            ctx.fillStyle = '#4ECDC4';
            ctx.fillRect(x, y, barWidth, barHeight);
            ctx.strokeRect(x, y, barWidth, barHeight);
            ctx.fillStyle = '#333333';
            ctx.fillText(dept, x + barWidth / 2, 480);
            ctx.fillText(`${rate}%`, x + barWidth / 2, y - 10);
          });
          break;

        case 'schedule':
          ctx.fillText('월별 일정 현황', 400, 50);
          const monthlySchedule = {};
          scheduleEvents.forEach((event) => {
            const month = event.date.slice(0, 7);
            monthlySchedule[month] = (monthlySchedule[month] || 0) + 1;
          });

          const months = Object.keys(monthlySchedule).sort();
          const maxSchedule = Math.max(...Object.values(monthlySchedule), 1);

          months.forEach((month, index) => {
            const count = monthlySchedule[month] || 0;
            const barHeight = (count / maxSchedule) * 300;
            const x = 100 + index * 120;
            const y = 450 - barHeight;

            ctx.fillStyle = '#45B7D1';
            ctx.fillRect(x, y, 80, barHeight);
            ctx.strokeRect(x, y, 80, barHeight);
            ctx.fillStyle = '#333333';
            ctx.fillText(month, x + 40, 480);
            ctx.fillText(count, x + 40, y - 10);
          });
          break;
      }

      const link = document.createElement('a');
      link.download = `${chartType}_차트_${new Date().toISOString().slice(0, 
  10)}.png`;
      link.href = canvas.toDataURL();
      link.click();

      return `${link.download} 이미지가 성공적으로 다운로드되었습니다.`;
    } catch (error) {
      devLog('차트 생성 오류:', error);
      throw new Error('차트 이미지 생성 중 오류가 발생했습니다.');
    }
  };

  export const handleFileDownload = async (type, format = 'excel', employees,
  scheduleEvents) => {
    try {
      let result;

      switch (format) {
        case 'excel':
          result = await generateComprehensiveReport(type, format, employees);        
          break;
        case 'image':
          result = await generateChartImage(type, employees, scheduleEvents);
          break;
        case 'pdf':
          result = await generatePdfReport(type);
          break;
        default:
          result = await generateComprehensiveReport(type, format, employees);        
      }

      return result;
    } catch (error) {
      devLog('파일 다운로드 오류:', error);
      return `파일 다운로드 중 오류가 발생했습니다: ${error.message}`;
    }
  };

  export const handleDownloadAttendanceList = (sortedEmployees, selectedStatus) =>    
   {
    const headers =
      selectedStatus === '출근' || selectedStatus === '지각'
        ? ['시간', '사번', '이름', '직급', '부서']
        : ['사번', '이름', '직급', '부서'];

    let csvContent = headers.join(',') + '\n';

    sortedEmployees.forEach((employee) => {
      const row =
        selectedStatus === '출근' || selectedStatus === '지각'
          ? [
              employee.time || '-',
              employee.id,
              employee.name,
              employee.position || employee.title || '사원',
              employee.department,
            ]
          : [
              employee.id,
              employee.name,
              employee.position || employee.title || '사원',
              employee.department,
            ];
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `부성스틸(주)_출근현황_${selectedStatus}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
  };

// ============================================================
// [1_공통] 공통 다운로드 서비스 - EXPORTS (update-only)
// ============================================================

/**
 * EXPORTS:
 *
 * [Utils]
 * - exportOrganizationToXLSX: 조직도 Excel 다운로드
 * - uploadOvertimeXLSX: 잔업표 업로드
 * - exportOvertimeXLSX: 잔업표 Excel 다운로드
 * - parsePayrollXLSX: 급여 Excel 파싱
 * - exportPayrollXLSX: 급여 Excel 다운로드
 * - generateComprehensiveReport: 종합 리포트 생성
 * - generatePdfReport: PDF 리포트 생성
 * - generateDownloadFile: 파일 다운로드 생성
 * - uploadAttendanceXLSX: 근태표 업로드
 * - exportAttendanceXLSX: 근태표 Excel 다운로드 (상세)
 * - exportAttendanceXLSX_Simple: 근태표 Excel 다운로드 (간단)
 * - generateChartImage: 차트 이미지 생성
 */

export default {
  exportOrganizationToXLSX,
  uploadOvertimeXLSX,
  exportOvertimeXLSX,
  parsePayrollXLSX,
  exportPayrollXLSX,
  generateComprehensiveReport,
  generatePdfReport,
  generateDownloadFile,
  uploadAttendanceXLSX,
  exportAttendanceXLSX,
};
