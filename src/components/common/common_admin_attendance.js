/**
 * [2_관리자 모드] 2.8_근태 관리 통합 모듈
 * - Hook → Service → Util → Export
 * - UI 컴포넌트 제외, 지원 로직만 포함
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getDateKey, getDayOfWeek, getDaysInMonth, EXCLUDE_TIME, excludeBreakTimes, timeToMinutes } from './common_common';
import * as XLSX from 'xlsx';
import { AttendanceAPI } from '../../api/attendance';

// ============================================================
// [2_관리자 모드] 2.8_근태 관리 - HOOKS
// ============================================================

/**
 * 근태 관리 셀 선택 Hook
 * - 셀 클릭/드래그 선택 처리
 * - 범위 선택 계산
 * - 편집 모드 토글
 */
export const useAttendanceCellSelection = ({
  isEditingAttendance,
  setIsEditingAttendance,
  getFilteredAttendanceEmployees,
  devLog,
}) => {
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartCell, setDragStartCell] = useState(null);

  // *[2_관리자 모드] 2.8_근태 관리 - 셀 범위 계산*
  const getCellRange = (startCellId, endCellId) => {
    try {
      const [startEmpId, startDay, startType] = startCellId.split('_');
      const [endEmpId, endDay, endType] = endCellId.split('_');

      const filteredEmployees = getFilteredAttendanceEmployees();

      const startEmpIndex = filteredEmployees.findIndex(
        (emp) => emp.id === startEmpId
      );
      const endEmpIndex = filteredEmployees.findIndex(
        (emp) => emp.id === endEmpId
      );

      const startDayNum = parseInt(startDay);
      const endDayNum = parseInt(endDay);

      if (startEmpIndex === -1 || endEmpIndex === -1) {
        return [startCellId, endCellId];
      }

      const minEmpIndex = Math.min(startEmpIndex, endEmpIndex);
      const maxEmpIndex = Math.max(startEmpIndex, endEmpIndex);
      const minDay = Math.min(startDayNum, endDayNum);
      const maxDay = Math.max(startDayNum, endDayNum);

      const rangeCells = [];

      for (let empIndex = minEmpIndex; empIndex <= maxEmpIndex; empIndex++) {
        const employee = filteredEmployees[empIndex];
        for (let day = minDay; day <= maxDay; day++) {
          rangeCells.push(`${employee.id}_${day}_checkIn`);
          rangeCells.push(`${employee.id}_${day}_checkOut`);
        }
      }

      return rangeCells;
    } catch (error) {
      devLog('범위 선택 계산 오류:', error);
      return [startCellId, endCellId];
    }
  };

  // *[2_관리자 모드] 2.8_근태 관리 - 셀 클릭*
  const handleCellClick = (cellId, event) => {
    if (!isEditingAttendance) {
      return;
    }

    if (event.ctrlKey) {
      setSelectedCells((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(cellId)) {
          newSet.delete(cellId);
        } else {
          newSet.add(cellId);
        }
        return newSet;
      });
    } else if (event.shiftKey && selectedCells.size > 0) {
      const selectedArray = Array.from(selectedCells);
      const lastSelected = selectedArray[selectedArray.length - 1];

      if (lastSelected) {
        const rangeSelection = getCellRange(lastSelected, cellId);
        setSelectedCells(new Set(rangeSelection));
      } else {
        setSelectedCells(new Set([cellId]));
      }
    } else {
      setSelectedCells(new Set([cellId]));
    }
  };

  // *[2_관리자 모드] 2.8_근태 관리 - 드래그 시작*
  const handleCellMouseDown = (cellId, event) => {
    if (!isEditingAttendance) return;

    if (!event.ctrlKey && !event.shiftKey) {
      setDragStartCell(cellId);
      setIsDragging(true);
      setSelectedCells(new Set([cellId]));
    }
  };

  // *[2_관리자 모드] 2.8_근태 관리 - 드래그 중*
  const handleCellMouseEnter = (cellId, event) => {
    if (!isEditingAttendance || !isDragging || !dragStartCell) return;

    const rangeSelection = getCellRange(dragStartCell, cellId);
    setSelectedCells(new Set(rangeSelection));
  };

  // *[2_관리자 모드] 2.8_근태 관리 - 드래그 종료*
  const handleCellMouseUp = (cellId, event) => {
    if (!isEditingAttendance) return;

    setIsDragging(false);
    setDragStartCell(null);
  };

  // *[2_관리자 모드] 2.8_근태 관리 - 편집 모드 토글*
  const toggleEditingMode = () => {
    const currentScrollY = window.scrollY;

    const newEditingMode = !isEditingAttendance;
    setIsEditingAttendance(newEditingMode);

    setSelectedCells(new Set());

    if (newEditingMode) {
      setTimeout(() => {
        window.scrollTo(0, currentScrollY);

        const tableDiv = document.querySelector('#attendanceTableContainer');
        if (tableDiv) {
          tableDiv.focus({ preventScroll: true });
          devLog('테이블 컨테이너에 포커스 설정됨 (스크롤 방지)');
        }
      }, 50);
    }
  };

  // *[2_관리자 모드] 2.8_근태 관리 - 셀 ID 생성*
  const getCellId = (empId, day, type) => {
    return `${empId}_${day}_${type}`; // type은 'checkIn' 또는 'checkOut'
  };

  // *[2_관리자 모드] 2.8_근태 관리 - 셀 선택 여부 확인*
  const isCellSelected = (cellId) => {
    if (!isEditingAttendance) {
      return false;
    }
    return selectedCells.has(cellId);
  };

  // *[2_관리자 모드] 2.8_근태 관리 - 마우스 이벤트*
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setDragStartCell(null);
    };

    const handleGlobalMouseLeave = () => {
      setIsDragging(false);
      setDragStartCell(null);
    };

    if (isDragging) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('mouseleave', handleGlobalMouseLeave);
    }

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mouseleave', handleGlobalMouseLeave);
    };
  }, [isDragging]);

  return {
    selectedCells,
    setSelectedCells,
    isDragging,
    dragStartCell,
    handleCellClick,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleCellMouseUp,
    toggleEditingMode,
    getCellId,
    isCellSelected,
    getCellRange,
  };
};

/**
 * 근태 데이터 관리를 위한 커스텀 훅
 * @param {Object} params - 파라미터 객체
 */
export const useAttendanceManagement = ({
  attendanceSheetYear,
  attendanceSheetMonth,
  attendanceSheetData,
  setAttendanceSheetData,
  loadHolidayData,
  devLog,
  customHolidays = {},
  holidayData = {},
  getKoreanHolidays = () => ({}),
  workTypeSettings = {},
  setWorkTypeSettings = () => {},
  employees = [],
  setAttendanceData = () => {},
  attendanceData = [],
  analyzeAttendanceStatusForDashboard = () => 'normal',
  filteredAttendanceEmployees = [],
  categorizeWorkTime = () => ({}),
  parseAttendanceFromExcel = () => {},
  CommonDownloadService = {},
  isEditingAttendance = false,
  handleAttendanceCopy = () => {},
  selectedCells = new Set(),
  pasteToSelectedCells = () => {},
  send52HourViolationAlert = null,
  setRegularNotifications = () => {},
  setNotificationLogs = () => {},
} = {}) => {
  // 🚩 파싱 모드 플래그 (파싱 중일 때만 localStorage에 저장)
  const isParsingRef = React.useRef(false);

  // *[2_관리자 모드] 2.8_근태 연도 변경 시 공휴일 로드*
  useEffect(() => {
    if (attendanceSheetYear) {
      loadHolidayData(attendanceSheetYear);
    }
  }, [attendanceSheetYear, loadHolidayData]);

  // ✅ [2_관리자 모드] 2.8_근태 데이터 자동 저장 제거
  // localStorage는 엑셀 파싱 완료 후에만 저장됨 (uploadAttendanceXLSX에서 처리)

  // [1_공통] 공휴일 여부 확인
  const isHolidayDate = useCallback(
    (year, month, day) => {
      const dateKeyLong = `${year}-${String(month).padStart(2, '0')}-${String(
        day
      ).padStart(2, '0')}`;

      if (customHolidays[dateKeyLong]) {
        return true;
      }

      const yearHolidays = holidayData[year] || getKoreanHolidays(year);
      const dateKeyShort = `${String(month).padStart(2, '0')}-${String(
        day
      ).padStart(2, '0')}`;

      return !!(yearHolidays[dateKeyLong] || yearHolidays[dateKeyShort]);
    },
    [customHolidays, holidayData, getKoreanHolidays]
  );

  // [2_관리자 모드] 2.8_근태 관리 - 주간 근무시간 체크 및 52시간 위반 알림
  // ⚠️ 주 52시간 초과 근무 실시간 알림 기능 비활성화 (나중에 다시 활성화 가능)
  const check52HourViolation = useCallback(async () => {
    // 기능 비활성화: 아래 코드를 주석 해제하면 다시 활성화됩니다
    return;

    /* 주 52시간 초과 알림 기능 - 비활성화됨
    if (!send52HourViolationAlert || !attendanceSheetData || !attendanceSheetYear || !attendanceSheetMonth) {
      return;
    }

    try {
      const weeklyHours = {}; // employeeId: { weekKey: totalHours }

      // 모든 근태 데이터를 순회하며 주간 근무시간 계산
      Object.entries(attendanceSheetData).forEach(([key, value]) => {
        const [employeeId, dateStr] = key.split('_');

        if (!value.checkIn || !value.checkOut) return;

        // 근무시간 계산 (식사시간 제외)
        const startMinutes = timeToMinutes(value.checkIn);
        let endMinutes = timeToMinutes(value.checkOut);

        // 자정 넘어간 경우 처리
        if (endMinutes < startMinutes) {
          endMinutes += 24 * 60;
        }

        // 총 근무시간 (분)
        const totalWorkMinutes = endMinutes - startMinutes;

        // 식사시간 제외 (분)
        const breakMinutes = excludeBreakTimes(startMinutes, endMinutes, EXCLUDE_TIME);

        // 실제 근무시간 (시간)
        const actualWorkMinutes = totalWorkMinutes - breakMinutes;
        const workHours = actualWorkMinutes / 60;

        // 해당 날짜가 속한 주 계산 (월요일 기준)
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay(); // 0=일요일, 1=월요일
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(date);
        monday.setDate(date.getDate() + mondayOffset);
        const weekKey = monday.toISOString().split('T')[0]; // 해당 주의 월요일 날짜

        if (!weeklyHours[employeeId]) {
          weeklyHours[employeeId] = {};
        }
        if (!weeklyHours[employeeId][weekKey]) {
          weeklyHours[employeeId][weekKey] = 0;
        }

        weeklyHours[employeeId][weekKey] += workHours;
      });

      // 각 직원의 주간 근무시간 체크
      for (const [employeeId, weeks] of Object.entries(weeklyHours)) {
        const employee = employees.find(emp => emp.id === employeeId);
        if (!employee) continue;

        for (const [weekKey, totalHours] of Object.entries(weeks)) {
          const roundedHours = Math.round(totalHours * 10) / 10; // 소수점 1자리

          // 알림 발송 기록 확인 (중복 방지)
          const alertKey48 = `52hour_alert_48_${employeeId}_${weekKey}`;
          const alertKey50 = `52hour_alert_50_${employeeId}_${weekKey}`;
          const alertKey52 = `52hour_alert_52_${employeeId}_${weekKey}`;

          // 52시간 초과
          if (roundedHours >= 52 && !localStorage.getItem(alertKey52)) {
            send52HourViolationAlert(
              employee.name,
              roundedHours,
              'violation',
              employees,
              setRegularNotifications,
              setNotificationLogs,
              devLog
            );
            localStorage.setItem(alertKey52, new Date().toISOString());
            devLog(`🚨 ${employee.name} 52시간 위반 알림 발송 (${roundedHours}시간)`);
          }
          // 50시간 도달
          else if (roundedHours >= 50 && !localStorage.getItem(alertKey50)) {
            send52HourViolationAlert(
              employee.name,
              roundedHours,
              50,
              employees,
              setRegularNotifications,
              setNotificationLogs,
              devLog
            );
            localStorage.setItem(alertKey50, new Date().toISOString());
            devLog(`⚠️ ${employee.name} 50시간 경고 알림 발송 (${roundedHours}시간)`);
          }
          // 48시간 도달
          else if (roundedHours >= 48 && !localStorage.getItem(alertKey48)) {
            send52HourViolationAlert(
              employee.name,
              roundedHours,
              48,
              employees,
              setRegularNotifications,
              setNotificationLogs,
              devLog
            );
            localStorage.setItem(alertKey48, new Date().toISOString());
            devLog(`⚠️ ${employee.name} 48시간 경고 알림 발송 (${roundedHours}시간)`);
          }
        }
      }
    } catch (error) {
      console.error('❌ 52시간 위반 체크 오류:', error);
    }
    */
  }, [
    send52HourViolationAlert,
    attendanceSheetData,
    attendanceSheetYear,
    attendanceSheetMonth,
    employees,
    setRegularNotifications,
    setNotificationLogs,
    devLog
  ]);

  // [2_관리자 모드] 2.8_근태 관리 - 날짜별 근무 타입 가져오기
  const getWorkTypeForDate = useCallback(
    (year, month, day) => {
      const dateKey = getDateKey(year, month, day);
      if (workTypeSettings[dateKey]) {
        return workTypeSettings[dateKey];
      }

      const dayOfWeek = getDayOfWeek(year, month, day);
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 일요일 또는 토요일

      const isHol = isHolidayDate(year, month, day);

      return isWeekend || isHol ? 'holiday' : 'weekday';
    },
    [workTypeSettings, isHolidayDate]
  );

  // [2_관리자 모드] 2.8_근태 관리 - 교대 유형 자동 판정
  const determineShiftType = useCallback(
    (employeeId, checkInTime) => {
      const employee = employees.find((emp) => emp.id === employeeId);
      if (!employee) return null;

      const targetSubdepartments = [
        '열',
        '표면',
        '구부',
        '인발',
        '교정·절단',
        '검사',
      ];
      if (
        employee.department !== '생산' ||
        !targetSubdepartments.includes(employee.subDepartment) ||
        employee.salaryType !== '시급'
      ) {
        return null; // 자동 판정 대상 아님
      }

      if (!checkInTime) return null;

      const [hours, minutes] = checkInTime.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes;

      const shiftType =
        totalMinutes >= 240 && totalMinutes <= 1050 ? '주간' : '야간';

      devLog(
        `🔄 [교대 자동판정] ${employee.name} (${employee.subDepartment}): 출근 ${checkInTime} → ${shiftType}`
      );

      return shiftType;
    },
    [employees, devLog]
  );

  // [2_관리자 모드] 2.8_근태 관리 - 근무 시간 계산 (출퇴근 시간으로)
  const calculateWorkHoursFromTimes = useCallback((checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;

    const [inHour, inMin] = checkIn.split(':').map(Number);
    const [outHour, outMin] = checkOut.split(':').map(Number);

    let inMinutes = inHour * 60 + inMin;
    let outMinutes = outHour * 60 + outMin;

    // 퇴근 시간이 출근 시간보다 작으면 다음날로 간주 (야간 근무)
    if (outMinutes < inMinutes) {
      outMinutes += 24 * 60;
    }

    const totalMinutes = outMinutes - inMinutes;
    const hours = totalMinutes / 60;

    return Math.round(hours * 10) / 10; // 소수점 첫째자리까지
  }, []);

  // [2_관리자 모드] 2.8_근태 관리 - 날짜별 근무 타입 설정
  const setWorkTypeForDate = useCallback(
    (year, month, day, workType) => {
      const dateKey = getDateKey(year, month, day);

      // 이전 workType 계산
      let prevWorkType = workTypeSettings[dateKey];
      if (!prevWorkType) {
        const dayOfWeek = getDayOfWeek(year, month, day);
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHol = isHolidayDate(year, month, day);
        prevWorkType = isWeekend || isHol ? 'holiday' : 'weekday';
      }

      setWorkTypeSettings((prev) => ({
        ...prev,
        [dateKey]: workType,
      }));

      // 휴일에서 평일로 변경 시 모든 직원의 특근 시간 제거
      if (prevWorkType === 'holiday' && workType === 'weekday') {
        setAttendanceSheetData((prev) => {
          const updated = { ...prev };
          employees.forEach((emp) => {
            const employeeKey = `${emp.id}_${dateKey}`;
            if (updated[employeeKey]) {
              updated[employeeKey] = {
                ...updated[employeeKey],
                specialWorkHours: '',
              };
            }
          });
          return updated;
        });
        devLog(`근무타입 변경: ${dateKey} -> ${workType} (특근 시간 제거됨)`);
      }
      // 평일에서 휴일로 변경 시 모든 직원의 근무 시간을 특근으로 전환
      else if (prevWorkType === 'weekday' && workType === 'holiday') {
        setAttendanceSheetData((prev) => {
          const updated = { ...prev };
          let convertedCount = 0;
          employees.forEach((emp) => {
            const employeeKey = `${emp.id}_${dateKey}`;
            if (updated[employeeKey]) {
              const { checkIn, checkOut } = updated[employeeKey];
              if (checkIn && checkOut) {
                const workHours = calculateWorkHoursFromTimes(
                  checkIn,
                  checkOut
                );
                if (workHours > 0) {
                  updated[employeeKey] = {
                    ...updated[employeeKey],
                    specialWorkHours: workHours.toString(),
                  };
                  convertedCount++;
                }
              }
            }
          });
          return updated;
        });
        const convertedEmployees = employees.filter((emp) => {
          const employeeKey = `${emp.id}_${dateKey}`;
          const data = attendanceSheetData[employeeKey];
          return data?.checkIn && data?.checkOut;
        });
        devLog(
          `근무타입 변경: ${dateKey} -> ${workType} (${convertedEmployees.length}명 특근으로 전환됨)`
        );
      } else {
        devLog(`근무타입 변경: ${dateKey} -> ${workType}`);
      }
    },
    [
      setWorkTypeSettings,
      workTypeSettings,
      getDayOfWeek,
      isHolidayDate,
      employees,
      setAttendanceSheetData,
      devLog,
      calculateWorkHoursFromTimes,
      attendanceSheetData,
    ]
  );

  // [2_관리자 모드] 2.8_근태 관리 - 직원별 출근 정보 가져오기
  const getAttendanceForEmployee = useCallback(
    (employeeId, year, month, day) => {
      const dateKey = getDateKey(year, month, day);
      const employeeKey = `${employeeId}_${dateKey}`;
      return attendanceSheetData[employeeKey] || { checkIn: '', checkOut: '' };
    },
    [attendanceSheetData]
  );

  // [2_관리자 모드] 2.8_근태 관리 - 직원별 출근 정보 설정
  const setAttendanceForEmployee = useCallback(
    (employeeId, year, month, day, data) => {
      const dateKey = getDateKey(year, month, day);
      const employeeKey = `${employeeId}_${dateKey}`;

      const autoShiftType = determineShiftType(employeeId, data.checkIn);
      const updatedData = autoShiftType
        ? { ...data, shiftType: autoShiftType }
        : data;

      setAttendanceSheetData((prev) => ({
        ...prev,
        [employeeKey]: updatedData,
      }));

      const employee = employees.find((emp) => emp.id === employeeId);
      if (employee) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(
          day
        ).padStart(2, '0')}`;

        const attendanceRecord = {
          checkIn: updatedData.checkIn || '',
          checkOut: updatedData.checkOut || '',
        };
        const status = analyzeAttendanceStatusForDashboard(
          attendanceRecord,
          year,
          month,
          day,
          employee.workType || '주간'
        );

        setAttendanceData((prev) => {
          const filtered = prev.filter(
            (att) => !(att.employeeId === employeeId && att.date === dateStr)
          );
          return [
            ...filtered,
            {
              id: Date.now() + Math.random(),
              employeeId: employeeId,
              employeeName: employee.name,
              date: dateStr,
              checkIn: updatedData.checkIn || '',
              checkOut: updatedData.checkOut || '',
              status: status,
              workType: employee.workType || '주간',
            },
          ];
        });
      }
    },
    [
      determineShiftType,
      setAttendanceSheetData,
      employees,
      analyzeAttendanceStatusForDashboard,
      setAttendanceData,
    ]
  );

  // [2_관리자 모드] 2.8_근태 관리 - 출근 시간 설정
  const setCheckInTime = useCallback(
    (employeeId, year, month, day, checkInTime) => {
      const dateKey = getDateKey(year, month, day);
      const employeeKey = `${employeeId}_${dateKey}`;
      setAttendanceSheetData((prev) => {
        const existing = prev[employeeKey] || {};

        const autoShiftType = determineShiftType(employeeId, checkInTime);

        const updated = {
          ...existing,
          checkIn: checkInTime,
          type: existing.type || 'work',
          ...(autoShiftType && { shiftType: autoShiftType }),
        };

        const employee = employees.find((emp) => emp.id === employeeId);
        if (employee) {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(
            day
          ).padStart(2, '0')}`;

          const attendanceRecord = {
            checkIn: updated.checkIn || '',
            checkOut: updated.checkOut || '',
          };
          const status = analyzeAttendanceStatusForDashboard(
            attendanceRecord,
            year,
            month,
            day,
            employee.workType || '주간'
          );

          setAttendanceData((prevData) => {
            const filtered = prevData.filter(
              (att) => !(att.employeeId === employeeId && att.date === dateStr)
            );
            return [
              ...filtered,
              {
                id: Date.now() + Math.random(),
                employeeId: employeeId,
                employeeName: employee.name,
                date: dateStr,
                checkIn: updated.checkIn || '',
                checkOut: updated.checkOut || '',
                status: status,
                workType: employee.workType || '주간',
              },
            ];
          });
        }

        const newData = {
          ...prev,
          [employeeKey]: updated,
        };

        // 근태 데이터는 state로 관리 (localStorage 불필요)
        return newData;
      });
    },
    [
      setAttendanceSheetData,
      determineShiftType,
      employees,
      analyzeAttendanceStatusForDashboard,
      setAttendanceData,
    ]
  );

  // [2_관리자 모드] 2.8_근태 관리 - 퇴근 시간 설정
  const setCheckOutTime = useCallback(
    (employeeId, year, month, day, checkOutTime) => {
      const dateKey = getDateKey(year, month, day);
      const employeeKey = `${employeeId}_${dateKey}`;
      setAttendanceSheetData((prev) => {
        const existing = prev[employeeKey] || {};

        const autoShiftType = existing.checkIn
          ? determineShiftType(employeeId, existing.checkIn)
          : null;

        const updated = {
          ...existing,
          checkOut: checkOutTime,
          type: existing.type || 'work',
          ...(autoShiftType && { shiftType: autoShiftType }),
        };

        const employee = employees.find((emp) => emp.id === employeeId);
        if (employee) {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(
            day
          ).padStart(2, '0')}`;

          const attendanceRecord = {
            checkIn: updated.checkIn || '',
            checkOut: updated.checkOut || '',
          };
          const status = analyzeAttendanceStatusForDashboard(
            attendanceRecord,
            year,
            month,
            day,
            employee.workType || '주간'
          );

          setAttendanceData((prevData) => {
            const filtered = prevData.filter(
              (att) => !(att.employeeId === employeeId && att.date === dateStr)
            );
            return [
              ...filtered,
              {
                id: Date.now() + Math.random(),
                employeeId: employeeId,
                employeeName: employee.name,
                date: dateStr,
                checkIn: updated.checkIn || '',
                checkOut: updated.checkOut || '',
                status: status,
                workType: employee.workType || '주간',
              },
            ];
          });
        }

        const newData = {
          ...prev,
          [employeeKey]: updated,
        };

        // 근태 데이터는 state로 관리 (localStorage 불필요)
        return newData;
      });
    },
    [
      setAttendanceSheetData,
      determineShiftType,
      employees,
      analyzeAttendanceStatusForDashboard,
      setAttendanceData,
    ]
  );

  // [2_관리자 모드] 2.8_근태 관리 - 출근 통계 캐시
  const attendanceStatsCache = useMemo(
    () => new Map(),
    [attendanceSheetYear, attendanceSheetMonth]
  );

  // [2_관리자 모드] 2.8_근태 관리 - 월별 통계 계산
  const calculateMonthlyStats = useCallback(
    (employeeId) => {
      const cacheKey = `${employeeId}-${attendanceSheetYear}-${attendanceSheetMonth}`;
      if (attendanceStatsCache.has(cacheKey)) {
        return attendanceStatsCache.get(cacheKey);
      }

      const daysInMonth = getDaysInMonth(
        attendanceSheetYear,
        attendanceSheetMonth
      );
      let totalWorkDays = 0;
      let annualLeave = 0;
      let absence = 0;
      let late = 0;
      let earlyLeave = 0;
      let outing = 0;

      let totalHours = 0;
      let regularHours = 0;
      let earlyHours = 0;
      let overtimeHours = 0;
      let holidayHours = 0;
      let nightHours = 0;
      let overtimeNightHours = 0;
      let holidayOvertimeHours = 0;

      const employee = employees.find((emp) => emp.id === employeeId);

      // employee를 찾지 못한 경우 빈 결과 반환
      if (!employee) {
        const emptyResult = {
          totalWorkDays: 0,
          annualLeave: 0,
          absence: 0,
          late: 0,
          earlyLeave: 0,
          outing: 0,
          totalHours: 0,
          regularHours: 0,
          earlyHours: 0,
          overtimeHours: 0,
          holidayHours: 0,
          nightHours: 0,
          overtimeNightHours: 0,
          holidayOvertimeHours: 0,
        };
        attendanceStatsCache.set(cacheKey, emptyResult);
        return emptyResult;
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const attendance = getAttendanceForEmployee(
          employeeId,
          attendanceSheetYear,
          attendanceSheetMonth,
          day
        );
        const dateStr = `${attendanceSheetYear}-${String(
          attendanceSheetMonth
        ).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        if (attendance.checkIn && attendance.checkOut) {
          totalWorkDays++;

          // 1순위: 출근 시간으로 자동 판정
          let shiftType = null;
          if (attendance.checkIn && attendance.checkIn.includes(':')) {
            const [hours, minutes] = attendance.checkIn.split(':').map(Number);
            if (!isNaN(hours) && !isNaN(minutes)) {
              const totalMinutes = hours * 60 + minutes;
              shiftType =
                totalMinutes >= 240 && totalMinutes <= 1050 ? '주간' : '야간';
            }
          }

          // 2순위: 출근 시간이 없거나 판정 실패한 경우 저장된 shiftType 사용
          if (!shiftType) {
            shiftType =
              attendance.shiftType ||
              employee.workType ||
              employee.workShift ||
              employee.근무형태 ||
              '주간';
          }

          const effectiveEmployee = { ...employee, workType: shiftType };

          const categorized = categorizeWorkTime(
            attendance.checkIn,
            attendance.checkOut,
            effectiveEmployee,
            dateStr
          );

          regularHours += categorized.기본 || 0;
          earlyHours += categorized.조출 || 0;
          overtimeHours += categorized.연장 || 0;
          holidayHours += categorized.특근 || 0;
          nightHours += categorized.심야 || 0;
          overtimeNightHours += categorized['연장+심야'] || 0;
          holidayOvertimeHours += categorized['특근+연장'] || 0;

          holidayHours += categorized['특근+심야'] || 0;
          holidayOvertimeHours += categorized['특근+연장+심야'] || 0;

          // 총 근무시간 = 각 근무 유형의 합계
          const dailyTotal =
            (categorized.기본 || 0) +
            (categorized.조출 || 0) +
            (categorized.연장 || 0) +
            (categorized.심야 || 0) +
            (categorized['연장+심야'] || 0) +
            (categorized.특근 || 0) +
            (categorized['특근+연장'] || 0) +
            (categorized['특근+심야'] || 0) +
            (categorized['특근+연장+심야'] || 0);
          totalHours += dailyTotal;

          // 위에서 계산한 shiftType을 사용하여 지각/조퇴 판정
          // 평일에만 지각 체크 (주말/휴일은 특근이므로 지각 개념 없음)
          const dateWorkType = getWorkTypeForDate(
            attendanceSheetYear,
            attendanceSheetMonth,
            day
          );
          const isWeekday = dateWorkType === 'weekday';

          if (isWeekday) {
            const [checkInHour, checkInMin] = attendance.checkIn
              .split(':')
              .map(Number);
            const checkInMinutes = checkInHour * 60 + checkInMin;

            if (shiftType === '야간') {
              // 야간 근무자: 19:01~다음날 03:00 사이 출근 시 지각
              // 19:01~23:59 (1141분~1439분) 또는 00:00~03:00 (0분~180분)
              const isLateForNight =
                (checkInMinutes >= 1141 && checkInMinutes <= 1439) ||
                (checkInMinutes >= 0 && checkInMinutes <= 180);
              if (isLateForNight) {
                late++;
              }

              const checkOutTime = attendance.checkOut;
              if (checkOutTime >= '00:00' && checkOutTime < '04:00') {
                earlyLeave++;
              }
            } else {
              // 주간 근무자: 08:31~15:00 사이 출근 시 지각
              // 08:31 (511분) ~ 15:00 (900분)
              if (checkInMinutes >= 511 && checkInMinutes <= 900) {
                late++;
              }
              if (attendance.checkOut < '17:00') {
                earlyLeave++;
              }
            }
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
        totalWorkDays,
        annualLeave,
        absence,
        late,
        earlyLeave,
        outing,
        totalHours,
        regularHours,
        earlyHours,
        overtimeHours,
        holidayHours,
        nightHours,
        overtimeNightHours,
        holidayOvertimeHours,
      };

      attendanceStatsCache.set(cacheKey, result);
      return result;
    },
    [
      attendanceSheetYear,
      attendanceSheetMonth,
      attendanceStatsCache,
      employees,
      getAttendanceForEmployee,
      categorizeWorkTime,
      getWorkTypeForDate,
    ]
  );

  // [2_관리자 모드] 2.8_근태 관리 - 출근 통계 캐시 초기화 useEffect
  useEffect(() => {
    attendanceStatsCache.clear();
  }, [attendanceData, attendanceStatsCache]);

  // [2_관리자 모드] 2.8_근태 관리 - 출근 통계 집계
  const attendanceStats = useMemo(() => {
    if (!filteredAttendanceEmployees.length)
      return {
        totalEmployees: 0,
        totalWorkDays: 0,
        avgWorkHours: 0,
        avgWorkDaysPerEmployee: 0,
        avgWorkHoursPerDay: 0,
        lateCount: 0,
        annualLeaveCount: 0,
      };

    let individualTotalWorkDays = 0; // 평균 근무일/인 계산용
    let totalHours = 0;
    let lateCount = 0;
    let annualLeaveUsage = 0; // 연차 사용일수 (반차 포함)

    // 개별 직원 통계 수집
    filteredAttendanceEmployees.forEach((employee) => {
      const stats = calculateMonthlyStats(employee.id);
      individualTotalWorkDays += stats.totalWorkDays;
      totalHours += stats.totalHours;
      lateCount += stats.late;
    });

    // 총 근무일/월 계산: (해당월 총 일수) - (아무도 기록이 없는 날)
    const daysInMonth = getDaysInMonth(
      attendanceSheetYear,
      attendanceSheetMonth
    );
    let daysWithNoRecords = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      let hasAnyRecord = false;
      for (const employee of filteredAttendanceEmployees) {
        const attendance = getAttendanceForEmployee(
          employee.id,
          attendanceSheetYear,
          attendanceSheetMonth,
          day
        );
        if (attendance.checkIn || attendance.checkOut || attendance.leaveType) {
          hasAnyRecord = true;
          break;
        }
      }
      if (!hasAnyRecord) {
        daysWithNoRecords++;
      }
    }

    const totalWorkDays = daysInMonth - daysWithNoRecords;

    // 총 연차 사용/월 계산: 연차 사용 내역의 '사용일수' 합계 (반차는 0.5일)
    for (const employee of filteredAttendanceEmployees) {
      for (let day = 1; day <= daysInMonth; day++) {
        const attendance = getAttendanceForEmployee(
          employee.id,
          attendanceSheetYear,
          attendanceSheetMonth,
          day
        );
        if (attendance.leaveType) {
          const leaveType = attendance.leaveType;
          if (leaveType === '연차') {
            annualLeaveUsage += 1;
          } else if (leaveType === '반차(오전)' || leaveType === '반차(오후)') {
            annualLeaveUsage += 0.5;
          }
        }
      }
    }

    const avgWorkHours = filteredAttendanceEmployees.length
      ? Math.round((totalHours / filteredAttendanceEmployees.length) * 100) /
        100
      : 0;

    // 평균 근무일/인 계산
    const avgWorkDaysPerEmployee = filteredAttendanceEmployees.length
      ? Math.round(
          (individualTotalWorkDays / filteredAttendanceEmployees.length) * 10
        ) / 10
      : 0;

    // 평균 근무시간/일 계산
    const avgWorkHoursPerDay = individualTotalWorkDays
      ? Math.round((totalHours / individualTotalWorkDays) * 10) / 10
      : 0;

    return {
      totalEmployees: filteredAttendanceEmployees.length,
      totalWorkDays,
      avgWorkHours,
      avgWorkDaysPerEmployee,
      avgWorkHoursPerDay,
      lateCount,
      annualLeaveCount: annualLeaveUsage,
    };
  }, [
    filteredAttendanceEmployees,
    calculateMonthlyStats,
    attendanceSheetYear,
    attendanceSheetMonth,
    getAttendanceForEmployee,
  ]);

  // [2_관리자 모드] 2.8_근태 관리 - 사전 계산된 통계
  const preCalculatedStats = useMemo(() => {
    const statsMap = new Map();
    filteredAttendanceEmployees.forEach((employee) => {
      const stats = calculateMonthlyStats(employee.id);
      statsMap.set(employee.id, stats);
    });
    return statsMap;
  }, [filteredAttendanceEmployees, calculateMonthlyStats]);

  // [2_관리자 모드] 2.8_근태 관리 - 일별 메타데이터
  const dayMetadata = useMemo(() => {
    const metadata = {};
    const daysInCurrentMonth = getDaysInMonth(
      attendanceSheetYear,
      attendanceSheetMonth
    );

    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const dayKey = `${attendanceSheetYear}-${attendanceSheetMonth}-${day}`;
      metadata[dayKey] = {
        dayOfWeek: getDayOfWeek(attendanceSheetYear, attendanceSheetMonth, day),
        isHoliday: isHolidayDate(
          attendanceSheetYear,
          attendanceSheetMonth,
          day
        ),
        workType: getWorkTypeForDate(
          attendanceSheetYear,
          attendanceSheetMonth,
          day
        ),
      };
    }

    return metadata;
  }, [
    attendanceSheetYear,
    attendanceSheetMonth,
    isHolidayDate,
    getWorkTypeForDate,
  ]);

  // [2_관리자 모드] 2.8_근태 관리 - 근태 엑셀 업로드
  // DB에 근태 데이터 저장
  const saveAttendanceToDb = useCallback(async () => {
    try {
      if (
        !attendanceSheetData ||
        Object.keys(attendanceSheetData).length === 0
      ) {
        return { success: true, message: '저장할 데이터가 없습니다.' };
      }

      // attendanceSheetData를 API 형식으로 변환
      const records = Object.entries(attendanceSheetData).map(
        ([key, value]) => {
          const [employeeId, date] = key.split('_');
          return {
            employeeId,
            date,
            checkIn: value.checkIn || null,
            checkOut: value.checkOut || null,
            shiftType: value.shiftType || null,
            leaveType: value.leaveType || null,
          };
        }
      );

      const response = await AttendanceAPI.bulkSave(
        records,
        attendanceSheetYear,
        attendanceSheetMonth
      );

      if (response.success) {
        // ✅ 저장 성공 후 52시간 위반 자동 체크
        await check52HourViolation();
        return response;
      } else {
        console.error('[saveAttendanceToDb] DB 저장 실패:', response.message);
        return response;
      }
    } catch (error) {
      console.error('[saveAttendanceToDb] 에러:', error);
      return { success: false, message: error.message };
    }
  }, [attendanceSheetData, attendanceSheetYear, attendanceSheetMonth, check52HourViolation]);

  const uploadAttendanceXLSX = useCallback(
    (file) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          // ========== 1단계: XLSX 파일 읽기 및 파싱 ==========
          const workbook = XLSX.read(e.target.result, { type: 'binary' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          // ========== 2단계: 엑셀 데이터 파싱 (현재 구조 동일) ==========

          // 🚩 파싱 모드 활성화 (setCheckInTime/setCheckOutTime에서 localStorage 저장 허용)
          isParsingRef.current = true;

          parseAttendanceFromExcel(data, async (parseResult) => {
            // 파싱 실패 시 종료
            if (!parseResult.success) {
              isParsingRef.current = false; // 파싱 모드 해제
              alert(
                `❌ 엑셀 파싱 실패\n\n${
                  parseResult.message || parseResult.error
                }`
              );
              return;
            }

            try {
              // ========== 3단계: 파싱된 데이터 확인 ==========
              const parsedData = parseResult.parsedData;

              if (!parsedData || Object.keys(parsedData).length === 0) {
                isParsingRef.current = false; // 파싱 모드 해제
                console.error('[uploadAttendanceXLSX] ❌ 파싱된 데이터 없음');
                alert(
                  '❌ 오류 발생\n\n파싱된 데이터가 없습니다.\n파일 형식을 확인해주세요.'
                );
                return;
              }

              const dataKeys = Object.keys(parsedData);

              // ========== 4단계: 파싱된 데이터를 DB (Attendance)에 저장 ==========
              const records = Object.entries(parsedData).map(([key, value]) => {
                const [employeeId, date] = key.split('_');
                return {
                  employeeId,
                  date,
                  checkIn: value.checkIn || null,
                  checkOut: value.checkOut || null,
                  shiftType: value.shiftType || null,
                  leaveType: value.leaveType || null,
                };
              });

              // ========== 4-1단계: 전체 데이터를 한 번에 업로드 ==========
              console.log(`📦 총 ${records.length}건 업로드 시작...`);

              let dbResult;
              try {
                dbResult = await AttendanceAPI.bulkSave(
                  records,
                  attendanceSheetYear,
                  attendanceSheetMonth
                );

                if (dbResult.success) {
                  console.log(
                    `✅ 업로드 완료 (신규: ${dbResult.stats?.inserted || 0}, 업데이트: ${dbResult.stats?.updated || 0})`
                  );
                } else {
                  console.error(`❌ 업로드 실패:`, dbResult.message);
                }
              } catch (error) {
                dbResult = {
                  success: false,
                  message: error.message,
                  stats: { inserted: 0, updated: 0 }
                };
                console.error(`❌ 업로드 오류:`, error);
              }

              console.log(
                `🎉 전체 업로드 ${dbResult.success ? '성공' : '실패'}: 신규 ${dbResult.stats?.inserted || 0}건, 업데이트 ${dbResult.stats?.updated || 0}건`
              );

              // ========== 5단계: DB 저장 확인 ==========
              if (dbResult.success) {
                // 파싱 모드 해제
                isParsingRef.current = false;

                // ✅ 저장 성공 후 52시간 위반 자동 체크
                await check52HourViolation();

                // ========== 6단계: DB 저장 완료 alert ==========
                const checkInCount =
                  parseResult.checkInResult?.checkInUpdates || 0;
                const checkOutCount =
                  parseResult.checkOutResult?.checkOutUpdates || 0;

                alert(
                  `✅ 근태 데이터 업로드 완료!\n\n` +
                    `📊 파싱 결과:\n` +
                    `  - 출근 데이터: ${checkInCount}개\n` +
                    `  - 퇴근 데이터: ${checkOutCount}개\n\n` +
                    `💾 DB 저장 결과:\n` +
                    `  - 신규 저장: ${dbResult.stats?.inserted || 0}건\n` +
                    `  - 업데이트: ${dbResult.stats?.updated || 0}건`
                );

                // 페이지 새로고침
                window.location.reload();
              } else {
                isParsingRef.current = false; // 파싱 모드 해제
                console.error(
                  '[uploadAttendanceXLSX] ❌ DB 저장 실패:',
                  dbResult.message
                );
                alert(`❌ DB 저장 실패\n\n${dbResult.message}`);
              }
            } catch (error) {
              isParsingRef.current = false; // 파싱 모드 해제
              console.error('[uploadAttendanceXLSX] ❌ 처리 중 오류:', error);
              alert(`❌ 오류 발생\n\n${error.message}`);
            }
          });
        } catch (error) {
          console.error('[uploadAttendanceXLSX] ❌ 파일 읽기 오류:', error);
          alert(`❌ 엑셀 파일 읽기 실패\n\n${error.message}`);
        }
      };

      reader.readAsBinaryString(file);
    },
    [
      parseAttendanceFromExcel,
      attendanceSheetYear,
      attendanceSheetMonth,
      attendanceSheetData,
      check52HourViolation,
    ]
  );

  // [2_관리자 모드] 2.8_근태 관리 - 근태 엑셀 다운로드
  const exportAttendanceXLSX = useCallback(() => {
    if (CommonDownloadService.exportAttendanceXLSX) {
      CommonDownloadService.exportAttendanceXLSX(
        attendanceSheetYear,
        attendanceSheetMonth,
        filteredAttendanceEmployees,
        getWorkTypeForDate,
        getAttendanceForEmployee,
        calculateMonthlyStats,
        preCalculatedStats,
        attendanceSheetData
      );
    }
  }, [
    CommonDownloadService,
    attendanceSheetYear,
    attendanceSheetMonth,
    filteredAttendanceEmployees,
    getWorkTypeForDate,
    getAttendanceForEmployee,
    calculateMonthlyStats,
    preCalculatedStats,
    attendanceSheetData,
  ]);

  // [2_관리자 모드] 2.8_근태 관리 - 키보드 이벤트 처리 (복사/붙여넣기)
  const handleAttendanceKeyDown = useCallback(
    async (e) => {
      if (!isEditingAttendance) {
        return;
      }

      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        handleAttendanceCopy();
      }

      if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();

        if (selectedCells.size === 0) {
          alert('붙여넣기할 셀을 먼저 선택해주세요.');
          return;
        }

        try {
          const text = await navigator.clipboard.readText();
          if (text.trim()) {
            devLog('Ctrl+V로 붙여넣기 실행:', text);
            pasteToSelectedCells(text);
          }
        } catch (err) {
          devLog('클립보드 읽기 실패:', err);
          alert('클립보드 읽기에 실패했습니다. 다시 시도해주세요.');
        }
      }
    },
    [
      isEditingAttendance,
      handleAttendanceCopy,
      selectedCells,
      pasteToSelectedCells,
      devLog,
    ]
  );

  return {
    isHolidayDate,
    getWorkTypeForDate,
    setWorkTypeForDate,
    getAttendanceForEmployee,
    setAttendanceForEmployee,
    determineShiftType,
    setCheckInTime,
    setCheckOutTime,
    attendanceStatsCache,
    calculateMonthlyStats,
    attendanceStats,
    preCalculatedStats,
    dayMetadata,
    uploadAttendanceXLSX,
    exportAttendanceXLSX,
    handleAttendanceKeyDown,
    saveAttendanceToDb,
  };
};

/**
 * 근태 검색 필터에 따라 필터링된 직원 목록을 반환하는 커스텀 훅
 * @param {Array} employees - 전체 직원 목록
 * @param {Object} attendanceSearchFilter - 근태 검색 필터
 * @returns {Array} 필터링된 직원 목록
 */
export const useAttendanceFilter = (
  employees,
  attendanceSearchFilter,
  attendanceSheetData = {},
  attendanceSheetYear = new Date().getFullYear(),
  attendanceSheetMonth = new Date().getMonth() + 1,
  holidayData = {},
  customHolidays = {}
) => {
  // hasShiftWork 결과를 캐싱하여 성능 개선
  const shiftWorkCache = useMemo(
    () => new Map(),
    [attendanceSheetYear, attendanceSheetMonth]
  );

  // attendanceSheetData의 실제 변경을 감지하기 위해 키 목록 사용
  const attendanceDataKeys = useMemo(
    () => Object.keys(attendanceSheetData).sort().join(','),
    [attendanceSheetData]
  );

  const filteredAttendanceEmployees = useMemo(() => {
    // 해당 월에 주간/야간 시프트가 모두 있는 직원인지 확인 (주중에만)
    const hasShiftWork = (employeeId) => {
      // 캐시에 있으면 바로 반환
      if (shiftWorkCache.has(employeeId)) {
        return shiftWorkCache.get(employeeId);
      }
      const shiftTypes = new Set();
      const daysInMonth = new Date(
        attendanceSheetYear,
        attendanceSheetMonth,
        0
      ).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        // 주말 체크 (0=일요일, 6=토요일)
        const dayOfWeek = getDayOfWeek(
          attendanceSheetYear,
          attendanceSheetMonth,
          day
        );
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // 공휴일 체크
        const dateKey = `${attendanceSheetYear}-${String(
          attendanceSheetMonth
        ).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dateKeyShort = `${String(attendanceSheetMonth).padStart(
          2,
          '0'
        )}-${String(day).padStart(2, '0')}`;
        const yearHolidays = holidayData[attendanceSheetYear] || {};
        const isPublicHoliday = !!(
          customHolidays[dateKey] ||
          yearHolidays[dateKey] ||
          yearHolidays[dateKeyShort]
        );

        // 휴일(주말 또는 공휴일)이면 시프터 판정에서 제외
        if (isWeekend || isPublicHoliday) {
          continue;
        }

        const employeeKey = `${employeeId}_${dateKey}`;
        const attendance = attendanceSheetData[employeeKey];

        if (attendance && attendance.checkIn) {
          let shiftType = null;

          // 1순위: 출근 시간으로 자동 판정
          if (attendance.checkIn.includes(':')) {
            const [hours, minutes] = attendance.checkIn.split(':').map(Number);
            if (!isNaN(hours) && !isNaN(minutes)) {
              const totalMinutes = hours * 60 + minutes;
              shiftType =
                totalMinutes >= 240 && totalMinutes <= 1050 ? '주간' : '야간';
            }
          }

          // 2순위: 출근 시간이 없거나 판정 실패한 경우 저장된 shiftType 사용
          if (!shiftType) {
            shiftType = attendance.shiftType;
          }

          if (shiftType) {
            shiftTypes.add(shiftType);
          }
        }
      }

      // 주간과 야간이 모두 있으면 true
      const result = shiftTypes.has('주간') && shiftTypes.has('야간');

      // 결과를 캐시에 저장
      shiftWorkCache.set(employeeId, result);

      return result;
    };

    // 세부부서 정렬 순서 정의
    const subDepartmentOrder = [
      '대표',
      '임원',
      '관리',
      '영업',
      '품질',
      '생산관리',
      '열',
      '표면',
      '구부',
      '인발',
      '교정/절단',
      '검사',
      '금형',
      '공무',
      '출하',
      '가공',
    ];

    // 직급 정렬 순서 정의
    const positionOrder = [
      '대표',
      '부대표',
      '전무',
      '상무',
      '이사',
      '부장',
      '차장',
      '과장',
      '대리',
      '반장',
      '조장',
      '주임',
      '사원',
    ];

    // 직책 정렬 순서 정의
    const roleOrder = ['대표', '임원', '팀장', '반장', '조장', '팀원'];

    const filtered = employees.filter((emp) => {
      if (
        attendanceSearchFilter.department !== '전체' &&
        emp.department !== attendanceSearchFilter.department
      ) {
        return false;
      }

      if (
        attendanceSearchFilter.position !== '전체' &&
        emp.position !== attendanceSearchFilter.position
      ) {
        return false;
      }

      if (attendanceSearchFilter.name) {
        // 쉼표(,) 또는 공백으로 구분하여 여러 이름 검색
        const searchNames = attendanceSearchFilter.name
          .split(/[,\s]+/) // 쉼표 또는 공백으로 분리
          .map((name) => name.trim()) // 앞뒤 공백 제거
          .filter((name) => name.length > 0); // 빈 문자열 제거

        // 검색어 중 하나라도 직원 이름에 포함되어 있으면 통과
        const isMatch = searchNames.some((searchName) =>
          emp.name.includes(searchName)
        );

        if (!isMatch) {
          return false;
        }
      }

      if (attendanceSearchFilter.workType !== '전체') {
        // "주간/야간" 필터를 선택한 경우
        if (attendanceSearchFilter.workType === '주간/야간') {
          if (!hasShiftWork(emp.id)) {
            return false;
          }
        } else {
          // 일반 근무형태 필터
          if (emp.workType !== attendanceSearchFilter.workType) {
            return false;
          }
        }
      }

      if (
        attendanceSearchFilter.payType !== '전체' &&
        emp.payType !== attendanceSearchFilter.payType
      ) {
        return false;
      }

      // 입사월/퇴사월 필터링
      if (emp.joinDate) {
        const joinDate = new Date(emp.joinDate);
        const joinYear = joinDate.getFullYear();
        const joinMonth = joinDate.getMonth() + 1;

        // 입사월 이전이면 제외
        if (
          attendanceSheetYear < joinYear ||
          (attendanceSheetYear === joinYear && attendanceSheetMonth < joinMonth)
        ) {
          return false;
        }
      }

      if (emp.leaveDate) {
        const leaveDate = new Date(emp.leaveDate);
        const leaveYear = leaveDate.getFullYear();
        const leaveMonth = leaveDate.getMonth() + 1;

        // 퇴사월 이후면 제외
        if (
          attendanceSheetYear > leaveYear ||
          (attendanceSheetYear === leaveYear &&
            attendanceSheetMonth > leaveMonth)
        ) {
          return false;
        }
      }

      return true;
    });

    // 정렬: 1순위 세부부서, 2순위 직책, 3순위 직급
    return filtered.sort((a, b) => {
      const aSubDept = a.subDepartment || '';
      const bSubDept = b.subDepartment || '';
      const aPos = a.position || '';
      const bPos = b.position || '';
      const aRole = a.role || '';
      const bRole = b.role || '';

      // 1순위: 세부부서 순서로 정렬
      const aSubDeptIndex = subDepartmentOrder.indexOf(aSubDept);
      const bSubDeptIndex = subDepartmentOrder.indexOf(bSubDept);

      // 순서에 없는 세부부서는 뒤로 (999로 처리)
      const aSubDeptOrder = aSubDeptIndex === -1 ? 999 : aSubDeptIndex;
      const bSubDeptOrder = bSubDeptIndex === -1 ? 999 : bSubDeptIndex;

      if (aSubDeptOrder !== bSubDeptOrder) {
        return aSubDeptOrder - bSubDeptOrder;
      }

      // 2순위: 직책 순서로 정렬
      const aRoleIndex = roleOrder.indexOf(aRole);
      const bRoleIndex = roleOrder.indexOf(bRole);

      // 순서에 없는 직책은 뒤로 (999로 처리)
      const aRoleOrder = aRoleIndex === -1 ? 999 : aRoleIndex;
      const bRoleOrder = bRoleIndex === -1 ? 999 : bRoleIndex;

      if (aRoleOrder !== bRoleOrder) {
        return aRoleOrder - bRoleOrder;
      }

      // 3순위: 직급 순서로 정렬
      const aPosIndex = positionOrder.indexOf(aPos);
      const bPosIndex = positionOrder.indexOf(bPos);

      // 순서에 없는 직급은 뒤로 (999로 처리)
      const aPosOrder = aPosIndex === -1 ? 999 : aPosIndex;
      const bPosOrder = bPosIndex === -1 ? 999 : bPosIndex;

      return aPosOrder - bPosOrder;
    });
  }, [
    employees,
    attendanceSearchFilter,
    attendanceDataKeys,
    attendanceSheetYear,
    attendanceSheetMonth,
    holidayData,
    customHolidays,
    shiftWorkCache,
  ]);

  return filteredAttendanceEmployees;
};

/**
 * 근태 관리 클립보드 Hook
 * - 근태 데이터 복사/붙여넣기 처리
 * - Excel 형식 데이터 변환
 * - 선택된 셀 및 전체 테이블 복사
 */
export const useAttendanceClipboard = ({
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
  preCalculatedStats,
  calculateMonthlyStats,
  devLog,
}) => {
  // *[2_관리자 모드] 2.8_근태 관리 - 클립보드 복사*
  const handleAttendanceCopy = () => {
    if (selectedCells.size === 0) {
      copyEntireAttendanceTable();
      return;
    }

    const selectedArray = Array.from(selectedCells);
    const cellMap = new Map();

    selectedArray.forEach((cellId) => {
      const [empId, day, type] = cellId.split('_');
      const employee = employees.find((emp) => emp.id === empId);
      const attendance = getAttendanceForEmployee(
        empId,
        attendanceSheetYear,
        attendanceSheetMonth,
        parseInt(day)
      );

      if (employee && attendance) {
        const value =
          type === 'checkIn' ? attendance.checkIn : attendance.checkOut;
        const key = `${empId}_${type}`;

        if (!cellMap.has(key)) {
          cellMap.set(key, {});
        }
        cellMap.get(key)[day] = value || '';
      }
    });

    const copyRows = [];
    const sortedKeys = Array.from(cellMap.keys()).sort();

    const allDays = new Set();
    cellMap.forEach((dayData) => {
      Object.keys(dayData).forEach((day) => allDays.add(parseInt(day)));
    });
    const sortedDays = Array.from(allDays).sort((a, b) => a - b);

    sortedKeys.forEach((key) => {
      const [empId, type] = key.split('_');
      const employee = employees.find((emp) => emp.id === empId);
      const dayData = cellMap.get(key);

      const rowData = sortedDays.map((day) => dayData[day] || '');
      copyRows.push(rowData.join('\t'));
    });

    const copyText = copyRows.join('\n');

    navigator.clipboard
      .writeText(copyText)
      .then(() => {
        const employeeCount = new Set(sortedKeys.map((k) => k.split('_')[0]))
          .size;
        devLog(
          `선택된 데이터가 클립보드에 복사되었습니다. (${sortedKeys.length}행 × ${sortedDays.length}열, ${employeeCount}명)`
        );

        const notification = document.createElement('div');
        notification.textContent = `📋 ${sortedKeys.length}행 × ${sortedDays.length}열 데이터 복사 완료`;
        notification.className =
          'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
      })
      .catch((err) => {
        devLog('클립보드 복사 실패:', err);
        alert('❌ 클립보드 복사에 실패했습니다.');
      });
  };

  // *[2_관리자 모드] 2.8_근태 관리 - Excel 복사*
  const copyEntireAttendanceTable = () => {
    const daysInCurrentMonth = getDaysInMonth(
      attendanceSheetYear,
      attendanceSheetMonth
    );
    const copyRows = [];

    const header1 = [`${attendanceSheetYear}년`, '근무구분'];
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      header1.push(`${day}일`);
    }

    header1.push(
      '총시간',
      '기본',
      '조출',
      '연장',
      '특근',
      '심야',
      '연장+심야',
      '특근+연장'
    );
    copyRows.push(header1.join('\t'));

    const header2 = ['', ''];
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const dayOfWeek = getDayOfWeek(
        attendanceSheetYear,
        attendanceSheetMonth,
        day
      );
      const isHoliday = isHolidayDate(
        attendanceSheetYear,
        attendanceSheetMonth,
        day
      );
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
      header2.push(
        isHoliday ? `${dayNames[dayOfWeek]}(H)` : dayNames[dayOfWeek]
      );
    }

    for (let i = 0; i < 9; i++) header2.push('');
    copyRows.push(header2.join('\t'));

    getFilteredAttendanceEmployees().forEach((emp) => {
      const checkInRow = [emp.name, emp.workType || '주간', '출근'];
      for (let day = 1; day <= daysInCurrentMonth; day++) {
        const attendance = getAttendanceForEmployee(
          emp.id,
          attendanceSheetYear,
          attendanceSheetMonth,
          day
        );
        checkInRow.push(attendance.checkIn || '');
      }

      const stats =
        preCalculatedStats.get(emp.id) || calculateMonthlyStats(emp.id);
      checkInRow.push(
        `${stats.totalHours}h`,
        `${stats.regularHours}h`,
        `${stats.earlyHours}h`,
        `${stats.overtimeHours}h`,
        `${stats.holidayHours}h`,
        `${stats.nightHours}h`,
        `${stats.overtimeNightHours}h`,
        `${stats.holidayOvertimeHours}h`
      );
      copyRows.push(checkInRow.join('\t'));

      const checkOutRow = ['', '', '퇴근'];
      for (let day = 1; day <= daysInCurrentMonth; day++) {
        const attendance = getAttendanceForEmployee(
          emp.id,
          attendanceSheetYear,
          attendanceSheetMonth,
          day
        );
        checkOutRow.push(attendance.checkOut || '');
      }

      for (let i = 0; i < 8; i++) checkOutRow.push('');
      copyRows.push(checkOutRow.join('\t'));
    });

    const allData = copyRows.join('\n');

    navigator.clipboard
      .writeText(allData)
      .then(() => {
        alert(
          `${attendanceSheetYear}년 ${attendanceSheetMonth}월 근태 테이블 전체 데이터가 클립보드에 복사되었습니다.\n엑셀에서 Ctrl+V로 붙여넣기 할 수 있습니다.`
        );
      })
      .catch((err) => {
        devLog('클립보드 복사 실패:', err);
        alert('클립보드 복사에 실패했습니다.');
      });
  };

  // *[2_관리자 모드] 2.8_근태 관리 - 인라인 붙여넣기*
  const handleAttendancePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');

    if (selectedCells.size > 0) {
      pasteToSelectedCells(pastedData);
    } else {
      const rows = pastedData.split('\n').map((line) => line.split('\t'));
      parseAttendanceFromClipboard(rows);
    }
  };

  // *[2_관리자 모드] 2.8_근태 관리 - 데이터 붙여넣기*
  const pasteToSelectedCells = (pastedData) => {
    devLog('=== pasteToSelectedCells 시작 ===');
    devLog('붙여넣기 원본 데이터:', pastedData);

    const lines = pastedData.split('\n');
    devLog('분리된 행들 (빈 행 포함):', lines);
    devLog('총 행 수:', lines.length);

    const rows = lines.map((line) => line.split('\t'));
    devLog('분리된 데이터 배열:', rows);
    devLog(
      '각 행별 데이터 개수:',
      rows.map((row) => row.length)
    );

    const selectedArray = Array.from(selectedCells);
    devLog('선택된 셀들:', selectedArray);

    if (selectedArray.length === 0) {
      alert('❌ 셀이 선택되지 않았습니다.');
      return;
    }

    if (rows.length === 0 || rows.every((row) => row.length === 0)) {
      alert('❌ 붙여넣기할 데이터가 없습니다.');
      return;
    }

    const firstCell = selectedArray[0];
    const [firstEmpId, dayStr, firstTimeType] = firstCell.split('_');
    const startDay = parseInt(dayStr);

    devLog(
      '기준 셀 - 직원ID:',
      firstEmpId,
      '날짜:',
      startDay,
      '타입:',
      firstTimeType
    );

    const filteredEmployees = getFilteredAttendanceEmployees();
    const daysInMonth = getDaysInMonth(
      attendanceSheetYear,
      attendanceSheetMonth
    );

    const startEmpIndex = filteredEmployees.findIndex(
      (emp) => emp.id === firstEmpId
    );
    if (startEmpIndex === -1) {
      alert('기준 직원을 찾을 수 없습니다.');
      return;
    }

    devLog('기준 직원 인덱스:', startEmpIndex);
    devLog(
      '전체 직원 목록:',
      filteredEmployees.map((emp) => `${emp.name}(${emp.id})`)
    );

    let updatedCount = 0;

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const timeValues = rows[rowIndex];
      devLog(`${rowIndex}행 처리:`, timeValues);

      let targetEmpIndex, targetTimeType;

      if (firstTimeType === 'checkIn') {
        if (rowIndex % 2 === 0) {
          targetEmpIndex = startEmpIndex + Math.floor(rowIndex / 2);
          targetTimeType = 'checkIn';
        } else {
          targetEmpIndex = startEmpIndex + Math.floor(rowIndex / 2);
          targetTimeType = 'checkOut';
        }
      } else {
        if (rowIndex === 0) {
          targetEmpIndex = startEmpIndex;
          targetTimeType = 'checkOut';
        } else if (rowIndex % 2 === 1) {
          targetEmpIndex = startEmpIndex + Math.floor((rowIndex + 1) / 2);
          targetTimeType = 'checkIn';
        } else {
          targetEmpIndex = startEmpIndex + Math.floor(rowIndex / 2);
          targetTimeType = 'checkOut';
        }
      }

      if (targetEmpIndex >= filteredEmployees.length) {
        devLog(
          `직원 인덱스 초과: ${targetEmpIndex} >= ${filteredEmployees.length}`
        );
        continue;
      }

      const targetEmployee = filteredEmployees[targetEmpIndex];
      const targetEmpId = targetEmployee.id;

      devLog(`${rowIndex}행 → ${targetEmployee.name}, ${targetTimeType}`);

      for (let colIndex = 0; colIndex < timeValues.length; colIndex++) {
        const originalValue = timeValues[colIndex];

        const timeValue = originalValue ? originalValue.trim() : '';

        const targetDay = startDay + colIndex;
        if (targetDay > daysInMonth) continue;

        devLog(
          `  (${rowIndex},${colIndex}) → ${targetEmployee.name}, ${targetDay}일, ${targetTimeType} = "${timeValue}" (원본: "${originalValue}")`
        );

        const currentAttendance = getAttendanceForEmployee(
          targetEmpId,
          attendanceSheetYear,
          attendanceSheetMonth,
          targetDay
        );

        devLog(`업데이트 전:`, currentAttendance);
        devLog(`저장할 ${targetTimeType}: "${timeValue}"`);

        if (targetTimeType === 'checkIn') {
          setCheckInTime(
            targetEmpId,
            attendanceSheetYear,
            attendanceSheetMonth,
            targetDay,
            timeValue
          );
        } else {
          setCheckOutTime(
            targetEmpId,
            attendanceSheetYear,
            attendanceSheetMonth,
            targetDay,
            timeValue
          );
        }

        updatedCount++;
      }
    }

    devLog('총 업데이트된 셀 수:', updatedCount);

    if (updatedCount > 0) {
      const maxCols = Math.max(...rows.map((row) => row.length));
      const actualRows = rows.length;
      alert(`✅ Excel 데이터 붙여넣기 완료!

📊 처리 결과:
• 총 ${updatedCount}개의 시간 데이터 적용
• 데이터 구조: ${actualRows}행 × ${maxCols}열
• 시작 직원: ${filteredEmployees[startEmpIndex]?.name || '미확인'}
• 시작 날짜: ${attendanceSheetMonth}월 ${startDay}일

💡 행 단위로 출근/퇴근 시간이 자동 배치되었습니다.`);
    } else {
      alert(`❌ 데이터 적용 실패

🔍 확인사항:
• 엑셀에서 복사한 데이터가 올바른 형식인지 확인
• 시작 셀이 올바르게 선택되었는지 확인
• 데이터 범위가 월 한계를 초과하지 않았는지 확인

📋 지원 형식: 탭으로 구분된 시간 데이터 (HH:MM)`);
    }

    setSelectedCells(new Set());
    devLog('=== pasteToSelectedCells 완료 ===');
  };

  // *[2_관리자 모드] 2.8_근태 관리 - 클립보드 데이터 파싱*
  const parseAttendanceFromClipboard = (rows) => {
    try {
      if (rows.length === 0) return;

      devLog('붙여넣기 데이터:', rows);

      let updatedCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 3) continue;

        const employeeName = row[0]?.trim();
        if (
          !employeeName ||
          employeeName.includes('년') ||
          employeeName.includes('월')
        )
          continue;

        const employee = employees.find((emp) => emp.name === employeeName);
        if (!employee) {
          devLog(`직원을 찾을 수 없음: ${employeeName}`);
          continue;
        }

        const timeType = row[2]?.trim();
        if (timeType !== '출근' && timeType !== '퇴근') continue;

        const isCheckIn = timeType === '출근';
        const daysInMonth = getDaysInMonth(
          attendanceSheetYear,
          attendanceSheetMonth
        );

        for (let day = 1; day <= daysInMonth && day <= row.length - 3; day++) {
          const timeValue = row[2 + day]?.trim(); // 3번째 컬럼부터 시작

          if (timeValue) {
            const currentAttendance = getAttendanceForEmployee(
              employee.id,
              attendanceSheetYear,
              attendanceSheetMonth,
              day
            );

            const updatedAttendance = {
              ...currentAttendance,
              [isCheckIn ? 'checkIn' : 'checkOut']: timeValue,
              type: 'work',
            };

            setAttendanceForEmployee(
              employee.id,
              attendanceSheetYear,
              attendanceSheetMonth,
              day,
              updatedAttendance
            );
            updatedCount++;
          }
        }
      }

      if (updatedCount > 0) {
        alert(
          `클립보드 데이터 ${updatedCount}개 셀이 성공적으로 적용되었습니다.`
        );
      } else {
        alert(
          '적용할 수 있는 데이터를 찾을 수 없습니다. 엑셀 데이터 형식을 확인해주세요.'
        );
      }
    } catch (error) {
      devLog('클립보드 데이터 파싱 오류:', error);
      alert('클립보드 데이터 처리 중 오류가 발생했습니다: ' + error.message);
    }
  };

  return {
    handleAttendanceCopy,
    handleAttendancePaste,
  };
};

/**
 * [2_관리자 모드] 2.8_근태 관리 - 필터링된 직원 기준 근태 통계 계산 Hook
 *
 * @param {Array} filteredAttendanceEmployees - 필터링된 직원 목록
 * @param {Function} calculateMonthlyStats - 월별 통계 계산 함수
 * @param {number} attendanceSheetYear - 근태표 연도
 * @param {number} attendanceSheetMonth - 근태표 월
 * @param {Function} getDaysInMonth - 월별 일수 계산 함수
 * @param {Function} getAttendanceForEmployee - 직원별 근태 데이터 조회 함수
 * @returns {Object} 통계 객체 { totalEmployees, totalWorkDays, avgWorkDaysPerEmployee, avgWorkHoursPerDay, annualLeaveCount, lateCount }
 */
export const useFilteredAttendanceStats = (
  filteredAttendanceEmployees,
  calculateMonthlyStats,
  attendanceSheetYear,
  attendanceSheetMonth,
  getDaysInMonth,
  getAttendanceForEmployee,
  getWorkTypeForDate,
  preCalculatedStats
) => {
  return useMemo(() => {
    if (filteredAttendanceEmployees.length === 0) {
      return {
        totalEmployees: 0,
        totalWorkDays: 0,
        avgWorkDaysPerEmployee: 0,
        avgWorkHoursPerDay: 0,
        annualLeaveCount: 0,
        lateCount: 0,
      };
    }

    const daysInMonth = getDaysInMonth(
      attendanceSheetYear,
      attendanceSheetMonth
    );
    const daysWithWork = new Set(); // 한 명이라도 일한 날짜를 Set으로 관리
    let totalEmployeeWorkDays = 0; // 모든 직원의 근무일 합계
    let totalWorkHours = 0;
    let totalAnnualLeave = 0;
    let totalLate = 0;

    filteredAttendanceEmployees.forEach((emp) => {
      let employeeWorkDays = 0;

      // 월별 일자별로 순회
      for (let day = 1; day <= daysInMonth; day++) {
        const attendance = getAttendanceForEmployee(
          emp.id,
          attendanceSheetYear,
          attendanceSheetMonth,
          day
        );

        // 출근 또는 퇴근 데이터가 있으면 해당 날짜에 근무한 것으로 간주
        if (attendance.checkIn && attendance.checkOut) {
          if (attendance.checkIn !== '연차' && attendance.checkOut !== '연차') {
            // 한 명이라도 일한 날짜로 추가
            daysWithWork.add(day);
            // 개인 근무일 증가
            employeeWorkDays += 1;
          }
        }

        // 연차 사용 체크 (반차는 0.5일, 연차는 1일)
        if (attendance.leaveType) {
          const leaveType = attendance.leaveType;
          if (leaveType === '연차') {
            totalAnnualLeave += 1;
          } else if (leaveType === '반차(오전)' || leaveType === '반차(오후)') {
            totalAnnualLeave += 0.5;
          }
        }

        // 지각 체크 (근무형태별로 다르게 처리)
        // 평일에만 지각 체크 (주말/휴일은 특근이므로 지각 개념 없음)
        const dateWorkType = getWorkTypeForDate(
          attendanceSheetYear,
          attendanceSheetMonth,
          day
        );
        const isWeekday = dateWorkType === 'weekday';

        // 출근시간이 있고, 연차가 아니고, 실제 시간 형식(HH:MM)이고, 평일인 경우만 체크
        if (
          isWeekday &&
          attendance.checkIn &&
          attendance.checkIn !== '연차' &&
          attendance.checkIn.trim() !== '' &&
          attendance.checkIn.includes(':')
        ) {
          // 시프트 자동 판정: 04:00~17:30 사이 출근이면 주간, 그 외는 야간
          const [hours, minutes] = attendance.checkIn.split(':').map(Number);
          const checkInMinutes = hours * 60 + minutes;
          const checkInTime = attendance.checkIn.replace(':', '');

          // 시프트 판정
          const isDay = checkInMinutes >= 240 && checkInMinutes <= 1050; // 04:00~17:30

          if (isDay) {
            // 주간 근무자: 08:31~15:00 사이 출근 시 지각
            if (checkInTime >= '0831' && checkInTime <= '1500') {
              totalLate += 1;
            }
          } else {
            // 야간 근무자: 19:01~다음날 03:00 사이 출근 시 지각
            // 19:01~23:59 또는 00:00~03:00
            if (
              (checkInMinutes >= 1141 && checkInMinutes <= 1439) ||
              (checkInMinutes >= 0 && checkInMinutes <= 180)
            ) {
              totalLate += 1;
            }
          }
        }
      }

      // 개인별 총 근무일 누적
      totalEmployeeWorkDays += employeeWorkDays;

      // 개인별 총 근무시간 계산 - preCalculatedStats 사용으로 최적화
      const stats =
        preCalculatedStats && preCalculatedStats.get
          ? preCalculatedStats.get(emp.id)
          : calculateMonthlyStats(emp.id);
      totalWorkHours += stats.totalHours || 0;
    });

    // 총 근무일 = 한 명이라도 일한 날짜의 수
    const totalWorkDays = daysWithWork.size;

    // 평균 근무일/인 = 모든 직원의 근무일 합계 / 직원 수
    const avgWorkDaysPerEmployee =
      filteredAttendanceEmployees.length > 0
        ? Math.round(
            (totalEmployeeWorkDays / filteredAttendanceEmployees.length) * 100
          ) / 100
        : 0;

    // 평균 근무시간/일 = 총 근무시간 / 모든 직원의 근무일 합계
    const avgWorkHoursPerDay =
      totalEmployeeWorkDays > 0
        ? Math.round((totalWorkHours / totalEmployeeWorkDays) * 10) / 10
        : 0;

    return {
      totalEmployees: filteredAttendanceEmployees.length,
      totalWorkDays,
      avgWorkDaysPerEmployee,
      avgWorkHoursPerDay,
      annualLeaveCount: totalAnnualLeave,
      lateCount: totalLate,
    };
  }, [
    filteredAttendanceEmployees,
    calculateMonthlyStats,
    attendanceSheetYear,
    attendanceSheetMonth,
    getDaysInMonth,
    getAttendanceForEmployee,
    getWorkTypeForDate,
    preCalculatedStats,
  ]);
};

// ============================================================
// [2_관리자 모드] 2.8_근태 관리 - SERVICES
// ============================================================

/**
 * [2_관리자 모드] 2.8_근태 관리 - 엑셀 데이터 파싱 서비스
 *
 * 근태 엑셀 파일을 파싱하여 출퇴근 데이터를 시스템에 저장합니다.
 * - A1:B2 영역에서 년/월 정보 추출
 * - 날짜 헤더 행 자동 감지
 * - 병합셀을 고려한 직원명 매핑
 * - 출근/퇴근 데이터 분리 처리
 */
export class AttendanceExcelParser {
  constructor({
    attendanceSheetYear,
    attendanceSheetMonth,
    setAttendanceSheetYear,
    setAttendanceSheetMonth,
    employees,
    setCheckInTime,
    setCheckOutTime,
    devLog,
  }) {
    this.attendanceSheetYear = attendanceSheetYear;
    this.attendanceSheetMonth = attendanceSheetMonth;
    this.setAttendanceSheetYear = setAttendanceSheetYear;
    this.setAttendanceSheetMonth = setAttendanceSheetMonth;
    this.employees = employees;
    this.setCheckInTime = setCheckInTime;
    this.setCheckOutTime = setCheckOutTime;
    this.devLog = devLog;
  }

  /**
   * 엑셀 데이터 파싱 메인 메서드
   * @param {Array} data - 엑셀 데이터
   * @param {Function} onComplete - 파싱 완료 콜백 (선택적)
   */
  parse(data, onComplete) {
    try {
      if (!data || data.length === 0) {
        alert('엑셀 데이터가 비어있습니다.');
        if (onComplete) onComplete({ success: false, message: '데이터 없음' });
        return;
      }

      this.devLog('=== 엑셀 파싱 시작 (A1:B2 날짜 정보 포함) ===');
      this.devLog('전체 데이터 행 수:', data.length);
      this.devLog('처음 5행 원본 데이터:');
      data.slice(0, 5).forEach((row, i) => {
        this.devLog(`  ${i}행:`, row?.slice(0, 10));
      });

      // 1단계: 날짜 정보 추출
      const { targetYear, targetMonth } = this.extractDateInfo(data);

      // 2단계: 날짜 헤더 행 찾기
      const { dateHeaderRow, dateStartColumn } = this.findDateHeaderRow(data);
      if (dateHeaderRow === -1) {
        alert(
          '엑셀 파일에서 날짜 헤더를 찾을 수 없습니다.\n3번째 열부터 01, 02, 03... 형태의 날짜가 있는지 확인해주세요.'
        );
        if (onComplete)
          onComplete({ success: false, message: '날짜 헤더 없음' });
        return;
      }

      // 3단계: 날짜 매핑 생성
      const dates = this.extractDates(data[dateHeaderRow], dateStartColumn);
      this.devLog(`추출된 날짜 매핑:`, dates.slice(0, 10));

      // 4단계: 직원명 매핑 생성 (병합셀 고려)
      const rowEmployeeMapping = this.createEmployeeMapping(
        data,
        dateHeaderRow
      );

      // 5단계: 출근 데이터 처리
      const checkInResult = this.processCheckInData(
        data,
        dateHeaderRow,
        dates,
        rowEmployeeMapping,
        targetYear,
        targetMonth
      );

      // 6단계: 퇴근 데이터 처리
      const checkOutResult = this.processCheckOutData(
        data,
        dateHeaderRow,
        dates,
        rowEmployeeMapping,
        targetYear,
        targetMonth
      );

      // 7단계: 결과 통합 및 알림
      this.displayResults(checkInResult, checkOutResult);

      // 8단계: 파싱된 데이터 수집
      const parsedData = this.collectParsedData(checkInResult, checkOutResult);

      // 파싱 완료 콜백 호출
      if (onComplete) {
        this.devLog('✅ 파싱 완료, 콜백 호출');
        onComplete({
          success: true,
          checkInResult,
          checkOutResult,
          parsedData, // 파싱된 데이터 추가
        });
      }
    } catch (error) {
      this.devLog('❌ 엑셀 파싱 중 오류 발생:', error);
      alert(`엑셀 파일 처리 중 오류가 발생했습니다.\n${error.message}`);
      if (onComplete) onComplete({ success: false, error: error.message });
    }
  }

  /**
   * A1:B2 영역에서 년/월 정보 추출
   */
  extractDateInfo(data) {
    let targetYear = this.attendanceSheetYear;
    let targetMonth = this.attendanceSheetMonth;

    this.devLog('\n📅 A1:B2 영역 날짜 파싱 시작...');
    this.devLog('A1 셀 값:', data[0]?.[0]);
    this.devLog('B1 셀 값:', data[0]?.[1]);
    this.devLog('A2 셀 값:', data[1]?.[0]);
    this.devLog('B2 셀 값:', data[1]?.[1]);

    const dateInfoCells = [
      data[0]?.[0], // A1
      data[0]?.[1], // B1
      data[1]?.[0], // A2
      data[1]?.[1], // B2
    ];

    this.devLog('📋 날짜 정보 후보 셀들:', dateInfoCells);

    for (const cellValue of dateInfoCells) {
      if (!cellValue) continue;

      const cellStr = String(cellValue).trim();
      this.devLog(`  🔍 셀 값 분석: "${cellStr}"`);

      // 패턴 1: YYYY년 MM월
      const yearMonthPattern1 = cellStr.match(/(\d{4})\s*년\s*(\d{1,2})\s*월/);
      if (yearMonthPattern1) {
        targetYear = parseInt(yearMonthPattern1[1]);
        targetMonth = parseInt(yearMonthPattern1[2]);
        this.devLog(`  ✅ 패턴1 매칭: ${targetYear}년 ${targetMonth}월`);
        break;
      }

      // 패턴 2: YYYY-MM
      const yearMonthPattern2 = cellStr.match(/(\d{4})-(\d{1,2})/);
      if (yearMonthPattern2) {
        targetYear = parseInt(yearMonthPattern2[1]);
        targetMonth = parseInt(yearMonthPattern2[2]);
        this.devLog(`  ✅ 패턴2 매칭: ${targetYear}년 ${targetMonth}월`);
        break;
      }

      // 패턴 3: Excel 시리얼 번호
      const numericValue = parseFloat(cellStr);
      if (
        !isNaN(numericValue) &&
        numericValue > 40000 &&
        numericValue < 60000
      ) {
        const excelDate = new Date(
          (numericValue - 25569) * 24 * 60 * 60 * 1000
        );
        targetYear = excelDate.getFullYear();
        targetMonth = excelDate.getMonth() + 1;
        this.devLog(
          `  ✅ Excel 시리얼 번호 매칭: ${targetYear}년 ${targetMonth}월 (${numericValue})`
        );
        break;
      }

      this.devLog(`  ❌ 매칭되지 않음: "${cellStr}"`);
    }

    // 날짜 정보 업데이트
    if (
      targetYear !== this.attendanceSheetYear ||
      targetMonth !== this.attendanceSheetMonth
    ) {
      this.devLog(
        `🎯 날짜 정보 업데이트: ${this.attendanceSheetYear}년 ${this.attendanceSheetMonth}월 → ${targetYear}년 ${targetMonth}월`
      );
      this.setAttendanceSheetYear(targetYear);
      this.setAttendanceSheetMonth(targetMonth);
      this.devLog(
        `✅ 근태관리 화면이 ${targetYear}년 ${targetMonth}월로 변경됩니다.`
      );
    } else {
      this.devLog(
        `📍 현재 설정된 ${targetYear}년 ${targetMonth}월과 동일합니다.`
      );
    }

    return { targetYear, targetMonth };
  }

  /**
   * 날짜 헤더 행 찾기
   */
  findDateHeaderRow(data) {
    let dateHeaderRow = -1;
    const dateStartColumn = 2; // 3번째 열(인덱스 2)부터 날짜 시작

    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (!row || row.length < 5) continue;

      this.devLog(`${i}행 날짜 헤더 검사 (3열부터):`, row.slice(2, 12));

      let consecutiveDates = 0;
      for (let j = 2; j < row.length && j < 15; j++) {
        const cell = String(row[j] || '').trim();
        const dayMatch = cell.match(/^0*(\d{1,2})$/);

        if (dayMatch) {
          const day = parseInt(dayMatch[1]);
          if (day >= 1 && day <= 31) {
            consecutiveDates++;

            if (consecutiveDates >= 3) {
              dateHeaderRow = i;
              this.devLog(
                `✅ 날짜 헤더 행 발견: ${i}행, ${consecutiveDates}개 연속 날짜`
              );
              this.devLog(`✅ 날짜 시작 위치: ${dateStartColumn}열 (3번째 열)`);
              break;
            }
          } else {
            consecutiveDates = 0;
          }
        } else if (cell && cell !== '') {
          consecutiveDates = 0;
        }
      }

      if (dateHeaderRow !== -1) break;
    }

    return { dateHeaderRow, dateStartColumn };
  }

  /**
   * 날짜 매핑 추출
   */
  extractDates(dateRow, dateStartColumn) {
    const dates = [];
    for (let j = dateStartColumn; j < dateRow.length; j++) {
      const cell = String(dateRow[j] || '').trim();
      const dayMatch = cell.match(/^0*(\d{1,2})$/);
      if (dayMatch) {
        const day = parseInt(dayMatch[1]);
        if (day >= 1 && day <= 31) {
          dates.push({ day, colIndex: j });
        }
      }
    }
    return dates;
  }

  /**
   * 직원명 매핑 생성 (병합셀 고려)
   */
  createEmployeeMapping(data, dateHeaderRow) {
    const rowEmployeeMapping = {};
    let currentEmployee = null;

    this.devLog(`\n=== 병합셀 분석: 행별 직원명 매핑 생성 ===`);
    for (let i = dateHeaderRow + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 2) continue;

      const employeeName = String(row[0] || '').trim();
      const timeType = String(row[1] || '').trim();

      if (employeeName) {
        currentEmployee = employeeName;
        rowEmployeeMapping[i] = employeeName;
        this.devLog(`  ${i}행: "${employeeName}" (${timeType}) - 새 직원 시작`);
      } else if (
        currentEmployee &&
        (timeType === '출근' || timeType === '퇴근')
      ) {
        rowEmployeeMapping[i] = currentEmployee;
        this.devLog(
          `  ${i}행: "${currentEmployee}" (${timeType}) - 병합셀로 연결`
        );
      }
    }

    this.devLog(
      `📊 총 ${Object.keys(rowEmployeeMapping).length}개 행에 직원명 매핑 완료`
    );
    return rowEmployeeMapping;
  }

  /**
   * 직원 찾기 (여러 매칭 전략 사용)
   */
  findEmployee(employeeName) {
    // 정확한 매칭
    let employee = this.employees.find((emp) => emp.name === employeeName);
    if (employee) return employee;

    // 공백 제거 후 매칭
    employee = this.employees.find(
      (emp) => emp.name.replace(/\s/g, '') === employeeName.replace(/\s/g, '')
    );
    if (employee) {
      this.devLog(
        `  🔄 공백 제거 후 매칭: "${employeeName}" → "${employee.name}"`
      );
      return employee;
    }

    // 부분 매칭
    employee = this.employees.find(
      (emp) =>
        emp.name.includes(employeeName) || employeeName.includes(emp.name)
    );
    if (employee) {
      this.devLog(`  🔄 부분 매칭: "${employeeName}" → "${employee.name}"`);
      return employee;
    }

    return null;
  }

  /**
   * 시간 포맷 변환 (0815 → 08:15)
   */
  formatTime(timeValue) {
    let formattedTime = String(timeValue).trim();

    if (
      formattedTime &&
      formattedTime !== '0' &&
      /^\d{3,4}$/.test(formattedTime)
    ) {
      const originalTime = formattedTime;
      if (formattedTime.length === 3) {
        formattedTime = `0${formattedTime.substring(
          0,
          1
        )}:${formattedTime.substring(1)}`;
      } else if (formattedTime.length === 4) {
        formattedTime = `${formattedTime.substring(
          0,
          2
        )}:${formattedTime.substring(2)}`;
      }
      return { formatted: formattedTime, original: originalTime };
    }

    return { formatted: formattedTime, original: timeValue };
  }

  /**
   * 출근 데이터 처리
   */
  processCheckInData(
    data,
    dateHeaderRow,
    dates,
    rowEmployeeMapping,
    targetYear,
    targetMonth
  ) {
    this.devLog(`\n=== 1단계: 출근 데이터 처리 (병합셀 매핑 사용) ===`);

    let updatedCount = 0;
    let checkInUpdates = 0;
    const processedEmployees = new Set();
    const unmatchedNames = [];
    const skippedRows = [];
    const collectedData = {}; // 📦 파싱된 데이터 수집용

    for (let i = dateHeaderRow + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 3) continue;

      const employeeName = rowEmployeeMapping[i];
      const timeType = String(row[1] || '').trim();

      if (timeType !== '출근') continue;

      if (!employeeName) {
        this.devLog(`❌ ${i}행: 출근 행이지만 직원명 매핑 없음`);
        skippedRows.push(`${i}행: 직원명 없음 (출근 - 매핑 실패)`);
        continue;
      }

      this.devLog(`\n🔵 출근 처리 ${i}행: "${employeeName}"`);

      const employee = this.findEmployee(employeeName);
      if (!employee) {
        this.devLog(`  ❌ 미등록 직원: "${employeeName}"`);
        if (!unmatchedNames.includes(employeeName)) {
          unmatchedNames.push(employeeName);
        }
        continue;
      }

      this.devLog(`  ✅ 매칭됨: ${employee.name} (${employee.id}) - 출근 처리`);

      let rowUpdates = 0;
      dates.forEach((dateInfo, dateIndex) => {
        const { day, colIndex } = dateInfo;
        const timeValue = row[colIndex];

        if (timeValue != null && timeValue !== '' && timeValue !== '0') {
          const { formatted, original } = this.formatTime(timeValue);

          if (formatted && formatted !== '0') {
            if (original !== formatted && dateIndex < 3) {
              this.devLog(`      🔄 시간 변환: "${original}" → "${formatted}"`);
            }

            if (dateIndex < 3) {
              this.devLog(`      🔵 ${day}일 출근: "${formatted}"`);
            }

            try {
              this.setCheckInTime(
                employee.id,
                targetYear,
                targetMonth,
                day,
                formatted
              );

              // 📦 데이터 수집
              const dateKey = `${targetYear}-${String(targetMonth).padStart(
                2,
                '0'
              )}-${String(day).padStart(2, '0')}`;
              const employeeKey = `${employee.id}_${dateKey}`;
              if (!collectedData[employeeKey]) {
                collectedData[employeeKey] = {};
              }
              collectedData[employeeKey].checkIn = formatted;

              checkInUpdates++;
              rowUpdates++;
              updatedCount++;
            } catch (saveError) {
              this.devLog(`      ❌ 출근 저장 실패:`, saveError);
            }
          }
        }
      });

      if (rowUpdates > 0) {
        processedEmployees.add(employee.name);
        this.devLog(`  ✅ 출근 ${rowUpdates}개 셀 저장 완료`);
      }
    }

    return {
      updatedCount,
      checkInUpdates,
      processedEmployees,
      unmatchedNames,
      skippedRows,
      collectedData, // 📦 수집된 데이터 반환
    };
  }

  /**
   * 퇴근 데이터 처리
   */
  processCheckOutData(
    data,
    dateHeaderRow,
    dates,
    rowEmployeeMapping,
    targetYear,
    targetMonth
  ) {
    this.devLog(`\n=== 2단계: 퇴근 데이터 처리 (병합셀 고려) ===`);

    let updatedCount = 0;
    let checkOutUpdates = 0;
    const processedEmployees = new Set();
    const unmatchedNames = [];
    const skippedRows = [];
    const collectedData = {}; // 📦 파싱된 데이터 수집용

    for (let i = dateHeaderRow + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 3) continue;

      const employeeName = rowEmployeeMapping[i];
      const timeType = String(row[1] || '').trim();

      if (timeType !== '퇴근') continue;

      if (!employeeName) {
        this.devLog(`❌ ${i}행: 퇴근 행이지만 직원명 매핑 없음`);
        skippedRows.push(`${i}행: 직원명 없음 (퇴근 - 매핑 실패)`);
        continue;
      }

      this.devLog(`\n🔴 퇴근 처리 ${i}행: "${employeeName}"`);

      const employee = this.findEmployee(employeeName);
      if (!employee) {
        this.devLog(`  ❌ 미등록 직원: "${employeeName}"`);
        if (!unmatchedNames.includes(employeeName)) {
          unmatchedNames.push(employeeName);
        }
        continue;
      }

      this.devLog(`  ✅ 매칭됨: ${employee.name} (${employee.id}) - 퇴근 처리`);

      let rowUpdates = 0;
      dates.forEach((dateInfo, dateIndex) => {
        const { day, colIndex } = dateInfo;
        const timeValue = row[colIndex];

        if (dateIndex < 5) {
          this.devLog(
            `      검사 ${day}일(${colIndex}열): raw="${timeValue}" (${typeof timeValue})`
          );
        }

        if (timeValue != null && timeValue !== '' && timeValue !== '0') {
          const { formatted, original } = this.formatTime(timeValue);

          if (formatted && formatted !== '0') {
            if (original !== formatted && dateIndex < 3) {
              this.devLog(`      🔄 시간 변환: "${original}" → "${formatted}"`);
            }

            if (dateIndex < 3) {
              this.devLog(`      🔴 ${day}일 퇴근: "${formatted}"`);
            }

            try {
              this.setCheckOutTime(
                employee.id,
                targetYear,
                targetMonth,
                day,
                formatted
              );

              // 📦 데이터 수집
              const dateKey = `${targetYear}-${String(targetMonth).padStart(
                2,
                '0'
              )}-${String(day).padStart(2, '0')}`;
              const employeeKey = `${employee.id}_${dateKey}`;
              if (!collectedData[employeeKey]) {
                collectedData[employeeKey] = {};
              }
              collectedData[employeeKey].checkOut = formatted;

              checkOutUpdates++;
              rowUpdates++;
              updatedCount++;
            } catch (saveError) {
              this.devLog(`      ❌ 퇴근 저장 실패:`, saveError);
            }
          } else {
            if (dateIndex < 3) {
              this.devLog(`      ⏭️ 스킵: 빈 시간 ("${formatted}")`);
            }
          }
        } else if (dateIndex < 5) {
          this.devLog(`      ⏭️ 스킵: null/빈값/0`);
        }
      });

      if (rowUpdates > 0) {
        processedEmployees.add(employee.name);
        this.devLog(`  ✅ ${employee.name} 퇴근 ${rowUpdates}개 셀 저장 완료`);
      } else {
        this.devLog(`  ⚠️ ${employee.name} 퇴근 데이터 없음 (모든 셀이 빈값)`);
      }
    }

    return {
      updatedCount,
      checkOutUpdates,
      processedEmployees,
      unmatchedNames,
      skippedRows,
      collectedData, // 📦 수집된 데이터 반환
    };
  }

  /**
   * 파싱된 데이터 수집 (출근/퇴근 병합)
   */
  collectParsedData(checkInResult, checkOutResult) {
    const merged = {};

    // 출근 데이터 병합
    Object.entries(checkInResult.collectedData || {}).forEach(
      ([key, value]) => {
        merged[key] = { ...value };
      }
    );

    // 퇴근 데이터 병합
    Object.entries(checkOutResult.collectedData || {}).forEach(
      ([key, value]) => {
        if (merged[key]) {
          merged[key] = { ...merged[key], ...value };
        } else {
          merged[key] = { ...value };
        }
      }
    );

    this.devLog(`📦 수집된 데이터: ${Object.keys(merged).length}건`);
    return merged;
  }

  /**
   * 결과 표시
   */
  displayResults(checkInResult, checkOutResult) {
    const totalUpdatedCount =
      checkInResult.updatedCount + checkOutResult.updatedCount;
    const allProcessedEmployees = new Set([
      ...checkInResult.processedEmployees,
      ...checkOutResult.processedEmployees,
    ]);
    const allUnmatchedNames = [
      ...new Set([
        ...checkInResult.unmatchedNames,
        ...checkOutResult.unmatchedNames,
      ]),
    ];

    this.devLog(
      `\n📊 엑셀 파싱 완료\n  ✅ 업데이트된 셀: ${totalUpdatedCount}개\n  📥 출근 업데이트: ${
        checkInResult.checkInUpdates
      }개\n  📤 퇴근 업데이트: ${
        checkOutResult.checkOutUpdates
      }개\n  👥 처리된 직원: ${Array.from(allProcessedEmployees).join(', ')} (${
        allProcessedEmployees.size
      }명)\n  ⏭️ 스킵된 행: ${
        checkInResult.skippedRows.length + checkOutResult.skippedRows.length
      }개`
    );

    if (allUnmatchedNames.length > 0) {
      this.devLog(`\n⚠️ 미등록 직원들: ${allUnmatchedNames.join(', ')}`);
      alert(
        `엑셀 파일에서 다음 직원들을 찾을 수 없습니다:\n${allUnmatchedNames.join(
          '\n'
        )}\n\n먼저 직원 관리에서 등록해주세요.`
      );
    }

    // ✅ 성공 alert는 DB 저장 후에만 표시하도록 제거
    // 파싱 결과는 콘솔 로그로만 출력
    if (totalUpdatedCount === 0) {
      this.devLog('⚠️ 업데이트된 근태 데이터가 없습니다.');
    }
  }
}

// ============================================================
// [2_관리자 모드] 2.8_근태 관리 - EXPORTS (update-only)
// ============================================================

// Hook exports
// - useAttendanceCellSelection
// - useAttendanceManagement
// - useAttendanceFilter
// - useAttendanceClipboard
// - useFilteredAttendanceStats

// Service exports
// - AttendanceExcelParser
