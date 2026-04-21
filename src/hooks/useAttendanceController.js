import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  AttendanceAPI,
  AttendanceStatsAPI,
} from '../api/attendance';
import {
  getDateKey,
  getDaysInMonth,
  getDayOfWeek,
  isHolidayDate,
  roundDownToHalfHour,
} from '../components/common/common_common';
import {
  useAttendanceFilter,
  useAttendanceManagement,
  useAttendanceCellSelection,
  useAttendanceClipboard,
  useFilteredAttendanceStats,
  AttendanceExcelParser,
} from '../components/common/common_admin_attendance';
import CommonDownloadService from '../components/common/common_common_downloadservice';

/**
 * *[2_관리자 모드] 근태 통합 컨트롤러 훅*
 *
 * 담당:
 *  - 근태 관련 useState 전체
 *  - useAttendanceManagement / useAttendanceCellSelection / useAttendanceClipboard
 *  - 근태 관련 useEffect (초기 월 탐색, 캐시 무효화, 월변경 통계저장, DB로드, 직원모드 월동기화)
 *  - normalizeAttendanceTime / getAttendanceForEmployee / setAttendanceForEmployee
 *  - clearAttendanceData / calculateMonthlyStats
 *  - filteredAttendanceEmployees / filteredAttendanceStats
 *  - parseAttendanceFromExcel / toggleEditingMode 래퍼
 *  - socket sync 용 attendanceSheetYearRef / attendanceSheetMonthRef
 *
 * App.js에서 import 금지 / AdminDashboard·AdminContentRenderer import 금지
 */
const useAttendanceController = ({
  // ─── Context ───
  currentUser,
  currentYear,
  currentMonth,
  API_BASE_URL,
  devLog,

  // ─── 공유 데이터 ───
  employees,
  leaveRequests,
  holidayData,
  customHolidays,

  // ─── 공휴일/근태 관리 의존 ───
  loadHolidayData,
  getKoreanHolidays,
  categorizeWorkTime,
  analyzeAttendanceStatusForDashboard,

  // ─── 알림 ───
  send52HourViolationAlertUtil,
  setRegularNotifications,
  setNotificationLogs,

  // ─── 탭 이탈 시 통계 저장 ref (handleTabChange 가 App.js에 있으므로 ref로 수신) ───
  saveStatsRef,
}) => {
  /* ─────────────────────────────────────────
     STATE — 근태 시트 기본
  ───────────────────────────────────────── */
  const [attendanceSheetYear, setAttendanceSheetYear] = useState(
    new Date().getFullYear()
  );
  const [attendanceSheetMonth, setAttendanceSheetMonth] = useState(
    new Date().getMonth() + 1
  );
  const [attendanceSheetData, setAttendanceSheetData] = useState({});
  const [attendanceSheetStatsCache, setAttendanceSheetStatsCache] = useState(
    {}
  ); // AttendanceSheet DB 통계 캐시
  const [attendanceData, setAttendanceData] = useState([]);
  const attendanceStatsCache = useRef(new Map());
  const prevYearMonthRef = useRef({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });

  /* ─────────────────────────────────────────
     STATE — 근태 UI
  ───────────────────────────────────────── */
  const [attendanceSearchFilter, setAttendanceSearchFilter] = useState({
    department: '전체',
    position: '전체',
    name: '',
    workType: '전체',
    payType: '전체',
  });
  const [isEditingAttendance, setIsEditingAttendance] = useState(false);
  const [workTypeSettings, setWorkTypeSettings] = useState({}); // 일별 근무구분 설정

  /* ─────────────────────────────────────────
     REF — socket sync 용 (useSocketSync 에 전달)
  ───────────────────────────────────────── */
  const attendanceSheetYearRef = useRef(attendanceSheetYear);
  const attendanceSheetMonthRef = useRef(attendanceSheetMonth);
  useEffect(() => {
    attendanceSheetYearRef.current = attendanceSheetYear;
  }, [attendanceSheetYear]);
  useEffect(() => {
    attendanceSheetMonthRef.current = attendanceSheetMonth;
  }, [attendanceSheetMonth]);

  /* ─────────────────────────────────────────
     MEMO
  ───────────────────────────────────────── */
  // attendanceSheetData의 실제 변경을 감지하기 위한 키 수
  const attendanceDataKeysCount = useMemo(
    () => Object.keys(attendanceSheetData).length,
    [attendanceSheetData]
  );

  /* ─────────────────────────────────────────
     EFFECT — 컴포넌트 마운트 시 최근 근태 데이터가 있는 월로 자동 설정
  ───────────────────────────────────────── */
  useEffect(() => {
    const findAndSetLatestMonth = async () => {
      const currentDate = new Date();
      const currentYearVal = currentDate.getFullYear();

      for (let i = 0; i < 12; i++) {
        const checkDate = new Date(currentYearVal, currentDate.getMonth() - i, 1);
        const year = checkDate.getFullYear();
        const month = checkDate.getMonth() + 1;

        try {
          const response = await fetch(
            `${API_BASE_URL}/attendance/monthly/${year}/${month}`
          );
          if (response.ok) {
            const result = await response.json();
            const data = result.success
              ? result.data
              : Array.isArray(result)
              ? result
              : [];

            if (data.length > 0) {
              devLog(
                `✅ [초기 로드] 최근 근태 데이터 발견: ${year}년 ${month}월 (${data.length}건)`
              );
              setAttendanceSheetYear(year);
              setAttendanceSheetMonth(month);
              return;
            }
          }
        } catch (err) {
          continue;
        }
      }

      devLog('⚠️ [초기 로드] 최근 근태 데이터를 찾을 수 없어 현재 월 유지');
    };

    findAndSetLatestMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 마운트 시 한 번만

  /* ─────────────────────────────────────────
     EFFECT — attendanceSheetData 변경 시 캐시 무효화
  ───────────────────────────────────────── */
  useEffect(() => {
    attendanceStatsCache.current.clear();
    devLog('📊 근태 합계 캐시 무효화 (데이터 변경됨)');
  }, [attendanceDataKeysCount, attendanceSheetYear, attendanceSheetMonth]);

  /* ─────────────────────────────────────────
     EFFECT — 월/년 변경 시 이전 데이터 통계 저장
  ───────────────────────────────────────── */
  useEffect(() => {
    const prev = prevYearMonthRef.current;
    const changed =
      prev.year !== attendanceSheetYear || prev.month !== attendanceSheetMonth;

    if (
      changed &&
      saveStatsRef.current &&
      Object.keys(attendanceSheetData).length > 0
    ) {
      saveStatsRef.current();
    }

    prevYearMonthRef.current = {
      year: attendanceSheetYear,
      month: attendanceSheetMonth,
    };
  }, [attendanceSheetYear, attendanceSheetMonth, attendanceSheetData]);

  /* ─────────────────────────────────────────
     EFFECT — AttendanceStats DB에서 월별 통계 로드
  ───────────────────────────────────────── */
  useEffect(() => {
    const loadMonthlyStats = async () => {
      if (!attendanceSheetYear || !attendanceSheetMonth) return;

      try {
        const response = await AttendanceStatsAPI.getMonthlyStats(
          attendanceSheetYear,
          attendanceSheetMonth
        );

        if (response.success && response.data && response.data.length > 0) {
          attendanceStatsCache.current.clear();
          response.data.forEach((stat) => {
            const key = stat.employeeId;
            attendanceStatsCache.current.set(key, {
              totalWorkDays: stat.workDays || 0,
              annualLeave: stat.annualLeaveDays || 0,
              absence: stat.absentDays || 0,
              late: stat.lateDays || 0,
              earlyLeave: stat.earlyLeaveDays || 0,
              outing: 0,
              totalHours: stat.totalWorkMinutes
                ? stat.totalWorkMinutes / 60
                : 0,
              regularHours: stat.regularHours || 0,
              earlyHours: stat.earlyHours || 0,
              overtimeHours: stat.overtimeHours || 0,
              holidayHours: stat.holidayHours || 0,
              nightHours: stat.nightHours || 0,
              overtimeNightHours: 0,
              earlyHolidayHours: 0,
              holidayOvertimeHours: 0,
            });
          });
        }
      } catch (error) {
        console.error('[AttendanceStats] ❌ 통계 로드 실패:', error);
      }
    };

    loadMonthlyStats();
  }, [attendanceSheetYear, attendanceSheetMonth]);

  /* ─────────────────────────────────────────
     EFFECT — 월/년 변경 시 서버에서 3개월 근태 데이터 자동 로드
     (야간 근무자 월 경계 문제 해결: 이전달 + 현재달 + 다음달)
  ───────────────────────────────────────── */
  useEffect(() => {
    const loadMonthlyAttendanceData = async () => {
      if (!attendanceSheetYear || !attendanceSheetMonth) return;

      try {
        const months = [];

        let prevYear = attendanceSheetYear;
        let prevMonth = attendanceSheetMonth - 1;
        if (prevMonth < 1) { prevMonth = 12; prevYear -= 1; }
        months.push({ year: prevYear, month: prevMonth });

        months.push({ year: attendanceSheetYear, month: attendanceSheetMonth });

        let nextYear = attendanceSheetYear;
        let nextMonth = attendanceSheetMonth + 1;
        if (nextMonth > 12) { nextMonth = 1; nextYear += 1; }
        months.push({ year: nextYear, month: nextMonth });

        const responses = await Promise.all(
          months.map(({ year, month }) =>
            AttendanceAPI.getMonthlyData(year, month)
          )
        );

        const newAttendanceData = {};

        responses.forEach((response, idx) => {
          if (response.success && response.data) {
            response.data.forEach((record) => {
              const key = `${record.employeeId}_${record.date}`;
              const checkInTime = record.checkIn || '';
              const checkOutTime = record.checkOut || '';

              let shiftType = null;
              if (checkInTime && checkInTime.includes(':')) {
                const [hours, minutes] = checkInTime.split(':').map(Number);
                if (!isNaN(hours) && !isNaN(minutes)) {
                  const totalMinutes = hours * 60 + minutes;
                  shiftType =
                    totalMinutes >= 240 && totalMinutes <= 1050 ? '주간' : '야간';
                }
              }
              if (!shiftType) shiftType = record.shiftType;

              newAttendanceData[key] = {
                checkIn: checkInTime,
                checkOut: checkOutTime,
                shiftType: shiftType || null,
                leaveType: record.note || null,
              };
            });
          }
        });

        setAttendanceSheetData((prevData) => ({ ...prevData, ...newAttendanceData }));
      } catch (error) {
        console.error('[근태 데이터 로드] ❌ 데이터 로드 실패:', error);
      }
    };

    loadMonthlyAttendanceData();
  }, [attendanceSheetYear, attendanceSheetMonth]);

  /* ─────────────────────────────────────────
     EFFECT — 일반직원 월 변경 시 attendanceSheet 월 동기화
  ───────────────────────────────────────── */
  useEffect(() => {
    if (currentUser && !currentUser.isAdmin && currentUser.role !== 'admin') {
      if (
        currentYear !== attendanceSheetYear ||
        currentMonth !== attendanceSheetMonth
      ) {
        setAttendanceSheetYear(currentYear);
        setAttendanceSheetMonth(currentMonth);
      }
    }
  }, [currentUser, currentYear, currentMonth]); // attendanceSheetYear/Month 제거 - 무한루프 방지

  /* ─────────────────────────────────────────
     FUNCTION — 근태 시간 정규화
  ───────────────────────────────────────── */
  const normalizeAttendanceTime = useCallback((value) => {
    if (!value || typeof value !== 'string') return '';
    const trimmed = value.trim();
    if (!trimmed || trimmed === '-' || trimmed === '--') return '';
    return trimmed;
  }, []);

  /* ─────────────────────────────────────────
     FUNCTION — 직원별 근태 데이터 조회
  ───────────────────────────────────────── */
  const getAttendanceForEmployee = useCallback(
    (employeeId, year, month, day) => {
      const dateKey = getDateKey(year, month, day);
      const employeeKey = `${employeeId}_${dateKey}`;

      const rawAttendanceData = attendanceSheetData[employeeKey] || {
        checkIn: '',
        checkOut: '',
      };

      const attendanceDataNorm = {
        ...rawAttendanceData,
        checkIn: normalizeAttendanceTime(rawAttendanceData.checkIn),
        checkOut: normalizeAttendanceTime(rawAttendanceData.checkOut),
      };

      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const leaveRecord = leaveRequests.find(
        (leave) =>
          leave.employeeId === employeeId &&
          leave.startDate <= dateStr &&
          leave.endDate >= dateStr &&
          leave.status === '승인'
      );

      if (leaveRecord) {
        return { ...attendanceDataNorm, leaveType: leaveRecord.type };
      }
      return attendanceDataNorm;
    },
    [attendanceSheetData, leaveRequests, normalizeAttendanceTime]
  );

  /* ─────────────────────────────────────────
     FUNCTION — 직원별 근태 데이터 저장
  ───────────────────────────────────────── */
  const setAttendanceForEmployee = useCallback(
    (employeeId, year, month, day, data) => {
      const dateKey = getDateKey(year, month, day);
      const employeeKey = `${employeeId}_${dateKey}`;
      setAttendanceSheetData((prev) => {
        const employee = employees.find((emp) => emp.id === employeeId);
        let autoShiftType = null;
        const checkInTime =
          data.checkIn !== undefined
            ? data.checkIn
            : prev[employeeKey]?.checkIn;

        if (employee && checkInTime) {
          const targetSubdepartments = [
            '열', '표면', '구부', '인발', '교정·절단', '검사',
          ];
          if (
            employee.department === '생산' &&
            targetSubdepartments.includes(employee.subDepartment) &&
            employee.salaryType === '시급'
          ) {
            const [hours, minutes] = checkInTime.split(':').map(Number);
            if (!isNaN(hours) && !isNaN(minutes)) {
              const totalMinutes = hours * 60 + minutes;
              autoShiftType =
                totalMinutes >= 240 && totalMinutes <= 1050 ? '주간' : '야간';
            }
          }
        }

        return {
          ...prev,
          [employeeKey]: {
            checkIn: '',
            checkOut: '',
            ...prev[employeeKey],
            ...data,
            ...(autoShiftType && { shiftType: autoShiftType }),
          },
        };
      });
    },
    [setAttendanceSheetData, employees]
  );

  /* ─────────────────────────────────────────
     FUNCTION — 근태 데이터 초기화
  ───────────────────────────────────────── */
  const clearAttendanceData = useCallback(() => {
    if (
      window.confirm(
        '⚠️ 모든 근태 데이터를 초기화하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, localStorage와 메모리의 모든 근태 데이터가 삭제됩니다.\n\nDB의 데이터는 유지되며, 페이지를 새로고침하면 DB에서 다시 로드됩니다.'
      )
    ) {
      setAttendanceSheetData({});
      alert(
        '✅ 근태 데이터 초기화가 완료되었습니다.\n\n페이지를 새로고침하면 DB에서 최신 데이터를 다시 불러옵니다.'
      );
    }
  }, [setAttendanceSheetData]);

  /* ─────────────────────────────────────────
     FUNCTION — 월별 통계 계산
  ───────────────────────────────────────── */
  const calculateMonthlyStats = useCallback(
    (employeeId) => {
      // AttendanceSheet DB 통계가 있으면 우선 사용
      if (attendanceSheetStatsCache[employeeId]) {
        const dbStats = attendanceSheetStatsCache[employeeId];
        return {
          totalWorkDays: dbStats.totalWorkDays || 0,
          totalHours: dbStats.totalWorkHours || 0,
          totalOvertimeHours: dbStats.totalOvertimeHours || 0,
          totalNightHours: dbStats.totalNightHours || 0,
          totalHolidayHours: dbStats.totalHolidayHours || 0,
          annualLeave: dbStats.leaveCount || 0,
          absence: dbStats.absentCount || 0,
          late: dbStats.lateCount || 0,
          regularHours:
            dbStats.totalWorkHours -
            (dbStats.totalOvertimeHours || 0) -
            (dbStats.totalHolidayHours || 0),
          earlyHours: 0,
          overtimeHours: dbStats.totalOvertimeHours || 0,
          holidayHours: dbStats.totalHolidayHours || 0,
          nightHours: dbStats.totalNightHours || 0,
          overtimeNightHours: 0,
          earlyHolidayHours: 0,
          holidayOvertimeHours: 0,
          earlyLeave: 0,
          outing: 0,
        };
      }

      // 로컬 계산 (캐시 우선)
      const cacheKey = `${employeeId}-${attendanceSheetYear}-${attendanceSheetMonth}`;
      if (attendanceStatsCache.current.has(cacheKey)) {
        return attendanceStatsCache.current.get(cacheKey);
      }

      const daysInMonth = getDaysInMonth(attendanceSheetYear, attendanceSheetMonth);
      let totalWorkDays = 0, annualLeave = 0, absence = 0, late = 0;
      let earlyLeave = 0, outing = 0, totalHours = 0, regularHours = 0;
      let earlyHours = 0, overtimeHours = 0, holidayHours = 0;
      let nightHours = 0, overtimeNightHours = 0, earlyHolidayHours = 0;
      let holidayOvertimeHours = 0;

      const employee = employees.find((emp) => emp.id === employeeId);
      if (!employee) {
        const emptyResult = {
          totalWorkDays: 0, annualLeave: 0, absence: 0, late: 0,
          earlyLeave: 0, outing: 0, totalHours: 0, regularHours: 0,
          earlyHours: 0, overtimeHours: 0, holidayHours: 0,
          nightHours: 0, overtimeNightHours: 0, earlyHolidayHours: 0,
          holidayOvertimeHours: 0,
        };
        attendanceStatsCache.current.set(cacheKey, emptyResult);
        return emptyResult;
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const attendance = getAttendanceForEmployee(
          employeeId, attendanceSheetYear, attendanceSheetMonth, day
        );
        const dateStr = `${attendanceSheetYear}-${String(attendanceSheetMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const dayLeaveRequest = leaveRequests.find((leave) => {
          if (leave.employeeId !== employeeId) return false;
          if (leave.status !== '승인') return false;
          const leaveStartDate = leave.startDate?.split('T')[0] || leave.startDate;
          const leaveEndDate = leave.endDate?.split('T')[0] || leave.endDate;
          return dateStr >= leaveStartDate && dateStr <= leaveEndDate;
        });

        if (attendance.leaveType || dayLeaveRequest) {
          const leaveType = dayLeaveRequest?.type || attendance.leaveType;
          if (
            leaveType !== '반차(오전)' &&
            leaveType !== '반차(오후)' &&
            (leaveType === 'annual' || leaveType === '연차' ||
             leaveType === '경조' || leaveType === '공가' ||
             leaveType === '휴직' || leaveType === '결근' ||
             attendance.checkIn === '연차' || attendance.checkOut === '연차')
          ) {
            if (leaveType === 'annual' || leaveType === '연차') annualLeave++;
            continue;
          }
        }

        if (attendance.checkIn && attendance.checkOut) {
          totalWorkDays++;

          let shiftType = null;
          if (attendance.checkIn && attendance.checkIn.includes(':')) {
            const [hours, minutes] = attendance.checkIn.split(':').map(Number);
            if (!isNaN(hours) && !isNaN(minutes)) {
              const totalMinutes = hours * 60 + minutes;
              shiftType = totalMinutes >= 240 && totalMinutes <= 1050 ? '주간' : '야간';
            }
          }
          if (!shiftType) {
            shiftType =
              attendance.shiftType ||
              employee.workType ||
              employee.workShift ||
              employee.근무형태 ||
              '주간';
          }

          if (
            attendance.specialWorkHours &&
            parseFloat(attendance.specialWorkHours) > 0
          ) {
            const specialHours = parseFloat(attendance.specialWorkHours);
            holidayHours += specialHours;
            totalHours += specialHours;
          } else {
            const employeeForCalc = { ...employee, workType: shiftType };
            const categorized = categorizeWorkTime(
              attendance.checkIn, attendance.checkOut, employeeForCalc, dateStr
            );

            let adjustedCategorized = categorized;
            if (
              dayLeaveRequest &&
              (dayLeaveRequest.type === '반차(오전)' || dayLeaveRequest.type === '반차(오후)')
            ) {
              const dailyTotal = Object.values(categorized).reduce(
                (sum, h) => sum + (h || 0), 0
              );
              if (dailyTotal > 4) {
                const ratio = 4 / dailyTotal;
                adjustedCategorized = {};
                Object.keys(categorized).forEach((k) => {
                  adjustedCategorized[k] = roundDownToHalfHour((categorized[k] || 0) * ratio);
                });
                console.warn(
                  `⚠️ [반차 조정] ${employee.name} ${dateStr}: ${dailyTotal}시간 → 4시간으로 제한`
                );
              }
            }

            regularHours += adjustedCategorized.기본 || 0;
            earlyHours += adjustedCategorized.조출 || 0;
            overtimeHours += adjustedCategorized.연장 || 0;
            nightHours += adjustedCategorized.심야 || 0;
            overtimeNightHours += adjustedCategorized['연장+심야'] || 0;
            holidayHours +=
              (adjustedCategorized.특근 || 0) +
              (adjustedCategorized['특근+심야'] || 0);
            earlyHolidayHours +=
              (adjustedCategorized['조출+특근'] || 0) +
              (adjustedCategorized['특근+조출'] || 0);
            holidayOvertimeHours +=
              (adjustedCategorized['특근+연장'] || 0) +
              (adjustedCategorized['특근+연장+심야'] || 0);

            const dailyTotal = Object.values(adjustedCategorized).reduce(
              (sum, h) => sum + (h || 0), 0
            );
            totalHours += dailyTotal;
          }

          if (shiftType === '야간') {
            if (attendance.checkIn > '19:00') late++;
            const checkOutTime = attendance.checkOut;
            if (checkOutTime >= '00:00' && checkOutTime < '04:00') earlyLeave++;
          } else {
            if (attendance.checkIn > '08:30') late++;
            if (attendance.checkOut < '17:00') earlyLeave++;
          }
        } else if (attendance.type === 'annual') {
          annualLeave++;
        } else if (attendance.type === 'absence') {
          absence++;
        } else if (attendance.type === 'outing') {
          outing++;
        }
      }

      const result = {
        totalWorkDays, annualLeave, absence, late, earlyLeave, outing,
        totalHours, regularHours, earlyHours, overtimeHours, holidayHours,
        nightHours, overtimeNightHours, earlyHolidayHours, holidayOvertimeHours,
      };
      attendanceStatsCache.current.set(cacheKey, result);
      return result;
    },
    [
      attendanceSheetYear,
      attendanceSheetMonth,
      employees,
      getAttendanceForEmployee,
      categorizeWorkTime,
      attendanceSheetStatsCache,
    ]
  );

  /* ─────────────────────────────────────────
     HOOK — 근태 필터링된 직원 목록
  ───────────────────────────────────────── */
  const filteredAttendanceEmployees = useAttendanceFilter(
    employees,
    attendanceSearchFilter,
    attendanceData,
    attendanceSheetYear,
    attendanceSheetMonth,
    holidayData,
    customHolidays
  );

  const getFilteredAttendanceEmployees = () => filteredAttendanceEmployees;

  /* ─────────────────────────────────────────
     FUNCTION — 엑셀 파싱
     setCheckInTime / setCheckOutTime 은 아래 useAttendanceManagement 이후 선언되지만
     이 함수는 호출 시점(사용자 인터랙션)에 클로저가 평가되므로 TDZ 없음.
  ───────────────────────────────────────── */
  // eslint-disable-next-line no-use-before-define
  const parseAttendanceFromExcel = (data, onComplete) => {
    const parser = new AttendanceExcelParser({
      attendanceSheetYear,
      attendanceSheetMonth,
      setAttendanceSheetYear,
      setAttendanceSheetMonth,
      employees,
      setCheckInTime,   // forward ref — 아래 useAttendanceManagement 이후 바인딩
      setCheckOutTime,  // forward ref — 아래 useAttendanceManagement 이후 바인딩
      devLog,
    });
    parser.parse(data, onComplete);
  };

  /* ─────────────────────────────────────────
     HOOK — 근태 데이터 관리
  ───────────────────────────────────────── */
  const {
    dayMetadata,
    uploadAttendanceXLSX,
    exportAttendanceXLSX,
    handleAttendanceKeyDown,
    getWorkTypeForDate,
    setWorkTypeForDate,
    setCheckInTime,
    setCheckOutTime,
    saveCalculatedStatsToSheet,
    preCalculatedStats,
    saveAttendanceToDb,
  } = useAttendanceManagement({
    attendanceSheetYear,
    attendanceSheetMonth,
    attendanceSheetData,
    setAttendanceSheetData,
    setAttendanceSheetYear,
    setAttendanceSheetMonth,
    loadHolidayData,
    devLog,
    workTypeSettings,
    setWorkTypeSettings,
    employees,
    customHolidays,
    holidayData,
    getKoreanHolidays,
    parseAttendanceFromExcel,
    CommonDownloadService,
    getAttendanceForEmployee,
    calculateMonthlyStats,
    filteredAttendanceEmployees,
    categorizeWorkTime,
    setAttendanceData,
    analyzeAttendanceStatusForDashboard,
    send52HourViolationAlert: send52HourViolationAlertUtil,
    setRegularNotifications,
    setNotificationLogs,
  });

  /* ─────────────────────────────────────────
     EFFECT — saveCalculatedStatsToSheet → saveStatsRef 할당
  ───────────────────────────────────────── */
  useEffect(() => {
    saveStatsRef.current = saveCalculatedStatsToSheet;
  }, [saveCalculatedStatsToSheet]);

  /* ─────────────────────────────────────────
     HOOK — 필터링된 근태 통계
     (getWorkTypeForDate가 필요하므로 useAttendanceManagement 이후)
  ───────────────────────────────────────── */
  const filteredAttendanceStats = useFilteredAttendanceStats(
    filteredAttendanceEmployees,
    calculateMonthlyStats,
    attendanceSheetYear,
    attendanceSheetMonth,
    getDaysInMonth,
    getAttendanceForEmployee,
    getWorkTypeForDate,
    preCalculatedStats
  );

  /* ─────────────────────────────────────────
     EFFECT — 페이지 로드 시 DB에서 근태 데이터 불러오기 (월 변경 시)
  ───────────────────────────────────────── */
  useEffect(() => {
    const loadAttendanceFromDb = async () => {
      try {
        if (!attendanceSheetYear || !attendanceSheetMonth) return;

        const response = await AttendanceAPI.getMonthlyData(
          attendanceSheetYear,
          attendanceSheetMonth
        );

        if (response.success && response.data) {
          const loadedData = {};
          response.data.forEach((record) => {
            const key = `${record.employeeId}_${record.date}`;
            loadedData[key] = {
              checkIn: record.checkIn || '',
              checkOut: record.checkOut || '',
              shiftType: record.shiftType || null,
              leaveType: record.leaveType || null,
            };
          });
          setAttendanceSheetData(loadedData);
        } else {
          setAttendanceSheetData({});
        }
      } catch (error) {
        console.error('[loadAttendanceFromDb] 에러:', error);
        setAttendanceSheetData({});
      }
    };

    loadAttendanceFromDb();
  }, [attendanceSheetYear, attendanceSheetMonth]);

  /* ─────────────────────────────────────────
     HOOK — 셀 선택 관리
  ───────────────────────────────────────── */
  const {
    selectedCells,
    setSelectedCells,
    isDragging,
    dragStartCell,
    handleCellClick,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleCellMouseUp,
    toggleEditingMode: originalToggleEditingMode,
    getCellId,
    isCellSelected,
    getCellRange,
  } = useAttendanceCellSelection({
    isEditingAttendance,
    setIsEditingAttendance,
    getFilteredAttendanceEmployees,
    devLog,
  });

  /* ─────────────────────────────────────────
     FUNCTION — 편집완료 시 DB 저장 래퍼
  ───────────────────────────────────────── */
  const toggleEditingMode = async () => {
    const wasEditing = isEditingAttendance;
    originalToggleEditingMode();

    if (wasEditing) {
      setTimeout(async () => {
        const result = await saveAttendanceToDb();
        if (result.success) {
          // DB 저장 성공
        } else {
          console.error('[편집완료] DB 저장 실패:', result.message);
          alert(`DB 저장 중 오류가 발생했습니다: ${result.message}`);
        }
      }, 500);
    }
  };

  /* ─────────────────────────────────────────
     HOOK — 클립보드 관리
  ───────────────────────────────────────── */
  const { handleAttendanceCopy, handleAttendancePaste } =
    useAttendanceClipboard({
      selectedCells,
      setSelectedCells,
      employees,
      attendanceSheetYear,
      attendanceSheetMonth,
      getFilteredAttendanceEmployees,
      getAttendanceForEmployee,
      setCheckInTime,
      setCheckOutTime,
      setAttendanceForEmployee,
      getDaysInMonth,
      getDayOfWeek,
      isHolidayDate,
      preCalculatedStats: attendanceStatsCache.current,
      calculateMonthlyStats,
      devLog,
    });

  /* ─────────────────────────────────────────
     RETURN
  ───────────────────────────────────────── */
  return {
    // 시트 기본 상태
    attendanceSheetYear, setAttendanceSheetYear,
    attendanceSheetMonth, setAttendanceSheetMonth,
    attendanceSheetData, setAttendanceSheetData,
    attendanceSheetStatsCache, setAttendanceSheetStatsCache,
    attendanceData, setAttendanceData,

    // UI 상태
    attendanceSearchFilter, setAttendanceSearchFilter,
    isEditingAttendance, setIsEditingAttendance,
    workTypeSettings, setWorkTypeSettings,

    // Socket sync refs
    attendanceSheetYearRef,
    attendanceSheetMonthRef,

    // 함수
    normalizeAttendanceTime,
    getAttendanceForEmployee,
    setAttendanceForEmployee,
    clearAttendanceData,
    calculateMonthlyStats,
    filteredAttendanceEmployees,
    getFilteredAttendanceEmployees,
    parseAttendanceFromExcel,

    // useAttendanceManagement 반환값
    dayMetadata,
    uploadAttendanceXLSX,
    exportAttendanceXLSX,
    handleAttendanceKeyDown,
    getWorkTypeForDate,
    setWorkTypeForDate,
    setCheckInTime,
    setCheckOutTime,
    saveCalculatedStatsToSheet,
    preCalculatedStats,
    saveAttendanceToDb,

    // 통계
    filteredAttendanceStats,

    // 셀 선택
    selectedCells, setSelectedCells,
    isDragging, dragStartCell,
    handleCellClick, handleCellMouseDown, handleCellMouseEnter, handleCellMouseUp,
    toggleEditingMode,
    getCellId, isCellSelected, getCellRange,

    // 클립보드
    handleAttendanceCopy, handleAttendancePaste,
  };
};

export default useAttendanceController;
