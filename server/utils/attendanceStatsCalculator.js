const crypto = require('crypto');
const { AttendanceStats } = require('../models');

/**
 * Attendance 데이터의 해시값 생성 (변경 감지용)
 */
function generateAttendanceHash(records) {
  const data = records
    .map((r) => `${r.employeeId}_${r.date}_${r.checkIn}_${r.checkOut}`)
    .join('|');
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * 시간 문자열을 분 단위로 변환 (HH:MM 형식)
 */
function timeToMinutes(timeStr) {
  if (!timeStr || timeStr === '00:00') return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * 근무 시간 계산 (분 단위)
 */
function calculateWorkMinutes(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const checkInMin = timeToMinutes(checkIn);
  const checkOutMin = timeToMinutes(checkOut);

  // 자정을 넘어가는 경우 처리
  if (checkOutMin < checkInMin) {
    return 24 * 60 - checkInMin + checkOutMin;
  }

  return checkOutMin - checkInMin;
}

/**
 * 근무 시간 분류 (기본/조출/연장/심야/특근) - 실제 회사 규정 반영
 *
 * [근무시간 산정 제외]
 * - 12:00~13:00 점심시간
 * - 17:30~18:00 저녁시간
 * - 00:00~01:00 야식시간
 *
 * [연봉제] 평일: 04:00~08:30 조출(미적용), 08:30~17:30 기본(적용), 18:00~22:00 연장(미적용), 22:00~03:59 연장+심야(적용)
 * [시급_주간] 평일: 04:00~08:30 조출, 08:30~17:30 기본, 18:00~22:00 연장, 22:00~03:59 연장+심야
 * [야간] 평일: 19:00~22:00 기본, 22:00~04:00 심야, 04:00~06:00 심야+연장, 06:00~08:30 연장
 */
function categorizeWorkHours(checkIn, checkOut, shiftType = '주간', isHoliday = false, salaryType = '시급') {
  const result = {
    regularHours: 0,
    earlyHours: 0,
    overtimeHours: 0,
    nightHours: 0,
    holidayHours: 0,
  };

  if (!checkIn || !checkOut) return result;

  const checkInMin = timeToMinutes(checkIn);
  const checkOutMin = timeToMinutes(checkOut);

  // 근무시간 산정 제외 시간 (점심, 저녁, 야식)
  const excludeMinutes = (start, end) => {
    let excluded = 0;
    // 점심시간 12:00~13:00
    if (start < 13 * 60 && end > 12 * 60) {
      excluded += Math.min(end, 13 * 60) - Math.max(start, 12 * 60);
    }
    // 저녁시간 17:30~18:00
    if (start < 18 * 60 && end > 17.5 * 60) {
      excluded += Math.min(end, 18 * 60) - Math.max(start, 17.5 * 60);
    }
    // 야식시간 00:00~01:00 (다음날)
    if (start < 1 * 60 && end > 0) {
      excluded += Math.min(end, 1 * 60) - Math.max(start, 0);
    }
    return excluded;
  };

  if (isHoliday) {
    // 휴일 근무
    if (shiftType === '주간' || salaryType === '시급') {
      // 시급_주간 휴일: 04:00~06:30 조출+특근, 06:30~15:30 특근, 15:30~22:00 특근+연장
      let totalMinutes = checkOutMin - checkInMin;
      totalMinutes -= excludeMinutes(checkInMin, checkOutMin);

      // 조출+특근 (04:00~06:30)
      if (checkInMin >= 4 * 60 && checkInMin < 6.5 * 60) {
        const earlyEnd = Math.min(checkOutMin, 6.5 * 60);
        result.earlyHours = (earlyEnd - checkInMin) / 60;
        result.holidayHours = result.earlyHours;
      }

      // 특근 (06:30~15:30) - 8시간
      const specialStart = Math.max(checkInMin, 6.5 * 60);
      const specialEnd = Math.min(checkOutMin, 15.5 * 60);
      if (specialEnd > specialStart) {
        let specialMinutes = specialEnd - specialStart;
        specialMinutes -= excludeMinutes(specialStart, specialEnd);
        result.holidayHours += specialMinutes / 60;
      }

      // 특근+연장 (15:30 이후)
      if (checkOutMin > 15.5 * 60) {
        let overtimeMinutes = checkOutMin - Math.max(checkInMin, 15.5 * 60);
        overtimeMinutes -= excludeMinutes(Math.max(checkInMin, 15.5 * 60), checkOutMin);
        result.holidayHours += overtimeMinutes / 60;
        result.overtimeHours = overtimeMinutes / 60;
      }
    } else {
      // 연봉제 휴일: 출근~8시 특근, 8시 이상 특근+연장
      let totalMinutes = checkOutMin - checkInMin;
      totalMinutes -= excludeMinutes(checkInMin, checkOutMin);

      const baseHours = 8;
      if (totalMinutes <= baseHours * 60) {
        result.holidayHours = totalMinutes / 60;
      } else {
        result.holidayHours = baseHours;
        result.overtimeHours = (totalMinutes - baseHours * 60) / 60;
      }
    }
    return result;
  }

  // 평일 근무
  if (shiftType === '야간') {
    // 현장직_야간 근무자: 19:00~22:00 기본, 22:00~04:00 심야, 04:00~06:00 심야+연장, 06:00~08:30 연장

    // 기본 근무 (19:00~22:00)
    if (checkInMin < 22 * 60 && checkOutMin > 19 * 60) {
      const basicStart = Math.max(checkInMin, 19 * 60);
      const basicEnd = Math.min(checkOutMin, 22 * 60);
      let basicMinutes = basicEnd - basicStart;
      basicMinutes -= excludeMinutes(basicStart, basicEnd);
      result.regularHours = basicMinutes / 60;
    }

    // 심야 근무 (22:00~04:00)
    if (checkOutMin > 22 * 60) {
      const nightStart = Math.max(checkInMin, 22 * 60);
      const nightEnd = Math.min(checkOutMin, 28 * 60); // 04:00 다음날 = 28 * 60
      if (nightEnd > nightStart) {
        let nightMinutes = nightEnd - nightStart;
        nightMinutes -= excludeMinutes(nightStart, nightEnd);
        result.nightHours = nightMinutes / 60;
      }
    }

    // 심야+연장 (04:00~06:00)
    if (checkOutMin > 28 * 60) { // 04:00 다음날
      const overtimeNightStart = Math.max(checkInMin, 28 * 60);
      const overtimeNightEnd = Math.min(checkOutMin, 30 * 60); // 06:00
      if (overtimeNightEnd > overtimeNightStart) {
        let overtimeNightMinutes = overtimeNightEnd - overtimeNightStart;
        result.nightHours += overtimeNightMinutes / 60;
        result.overtimeHours += overtimeNightMinutes / 60;
      }
    }

    // 연장 (06:00~08:30)
    if (checkOutMin > 30 * 60) { // 06:00
      const overtimeStart = Math.max(checkInMin, 30 * 60);
      const overtimeEnd = Math.min(checkOutMin, 32.5 * 60); // 08:30
      if (overtimeEnd > overtimeStart) {
        result.overtimeHours += (overtimeEnd - overtimeStart) / 60;
      }
    }
  } else {
    // 주간 근무 (연봉제 또는 시급_주간)

    // 조출 (04:00~08:30)
    if (checkInMin >= 4 * 60 && checkInMin < 8.5 * 60) {
      const earlyEnd = Math.min(checkOutMin, 8.5 * 60);
      result.earlyHours = (earlyEnd - checkInMin) / 60;
    }

    // 기본 근무 (08:30~17:30)
    const standardStart = 8.5 * 60; // 08:30
    const standardEnd = 17.5 * 60; // 17:30

    if (checkOutMin > standardStart && checkInMin < standardEnd) {
      const workStart = Math.max(checkInMin, standardStart);
      const workEnd = Math.min(checkOutMin, standardEnd);
      let regularMinutes = workEnd - workStart;
      regularMinutes -= excludeMinutes(workStart, workEnd);
      result.regularHours = regularMinutes / 60;
    }

    // 연장 근무 (18:00~22:00)
    if (checkOutMin > 18 * 60 && checkInMin < 22 * 60) {
      const overtimeStart = Math.max(checkInMin, 18 * 60);
      const overtimeEnd = Math.min(checkOutMin, 22 * 60);
      let overtimeMinutes = overtimeEnd - overtimeStart;
      overtimeMinutes -= excludeMinutes(overtimeStart, overtimeEnd);
      result.overtimeHours = overtimeMinutes / 60;
    }

    // 연장+심야 (22:00~03:59)
    if (checkOutMin > 22 * 60) {
      const nightOvertimeStart = Math.max(checkInMin, 22 * 60);
      const nightOvertimeEnd = Math.min(checkOutMin, 27.983 * 60); // 03:59
      if (nightOvertimeEnd > nightOvertimeStart) {
        let nightOvertimeMinutes = nightOvertimeEnd - nightOvertimeStart;
        nightOvertimeMinutes -= excludeMinutes(nightOvertimeStart, nightOvertimeEnd);
        result.nightHours = nightOvertimeMinutes / 60;
        result.overtimeHours += nightOvertimeMinutes / 60;
      }
    }
  }

  return result;
}

/**
 * 직원별 월간 근태 통계 계산
 */
function calculateEmployeeMonthlyStats(
  employeeId,
  attendanceRecords,
  year,
  month
) {
  const stats = {
    employeeId,
    year: parseInt(year),
    month: parseInt(month),
    totalWorkMinutes: 0,
    regularHours: 0,
    earlyHours: 0,
    overtimeHours: 0,
    nightHours: 0,
    holidayHours: 0,
    workDays: 0,
    lateDays: 0,
    earlyLeaveDays: 0,
    absentDays: 0,
    annualLeaveDays: 0,
    morningHalfDays: 0,
    afternoonHalfDays: 0,
    attendanceRecordCount: attendanceRecords.length,
  };

  attendanceRecords.forEach((record) => {
    const { checkIn, checkOut, shiftType, status } = record;

    // 근무 시간 계산
    if (checkIn && checkOut) {
      const workMinutes = calculateWorkMinutes(checkIn, checkOut);
      stats.totalWorkMinutes += workMinutes;

      // 시간 분류
      const categorized = categorizeWorkHours(checkIn, checkOut, shiftType);
      stats.regularHours += categorized.regularHours;
      stats.earlyHours += categorized.earlyHours;
      stats.overtimeHours += categorized.overtimeHours;
      stats.nightHours += categorized.nightHours;
    }

    // 출근 상태 집계
    if (status) {
      if (status === '출근') stats.workDays++;
      else if (status === '지각') {
        stats.workDays++;
        stats.lateDays++;
      } else if (status === '조퇴') {
        stats.workDays++;
        stats.earlyLeaveDays++;
      } else if (status === '결근') stats.absentDays++;
      else if (status === '연차') stats.annualLeaveDays++;
      else if (status === '반차(오전)') {
        stats.workDays++;
        stats.morningHalfDays++;
      } else if (status === '반차(오후)') {
        stats.workDays++;
        stats.afternoonHalfDays++;
      }
    } else if (checkIn && checkOut) {
      // status가 없지만 출퇴근 기록이 있으면 출근으로 간주
      stats.workDays++;
    }
  });

  // 소수점 둘째자리까지 반올림
  stats.regularHours = Math.round(stats.regularHours * 100) / 100;
  stats.earlyHours = Math.round(stats.earlyHours * 100) / 100;
  stats.overtimeHours = Math.round(stats.overtimeHours * 100) / 100;
  stats.nightHours = Math.round(stats.nightHours * 100) / 100;

  return stats;
}

/**
 * AttendanceStats 계산 및 저장
 */
async function calculateAndSaveStats(attendanceRecords, year, month) {
  try {
    // 직원별로 그룹화
    const employeeGroups = {};
    attendanceRecords.forEach((record) => {
      const empId = record.employeeId;
      if (!employeeGroups[empId]) {
        employeeGroups[empId] = [];
      }
      employeeGroups[empId].push(record);
    });

    const results = {
      updated: 0,
      inserted: 0,
      unchanged: 0,
      errors: 0,
    };

    // 각 직원별로 통계 계산 및 저장
    for (const [employeeId, records] of Object.entries(employeeGroups)) {
      try {
        // 직원별 해시값 생성 (해당 직원의 데이터만 사용)
        const currentHash = generateAttendanceHash(records);

        // 기존 통계 조회
        const existingStats = await AttendanceStats.findOne({
          employeeId,
          year: parseInt(year),
          month: parseInt(month),
        });

        // 해시값이 같으면 변경 없음 (해당 직원의 데이터가 변경되지 않음)
        if (existingStats && existingStats.attendanceHash === currentHash) {
          results.unchanged++;
          continue;
        }

        // 통계 계산
        const stats = calculateEmployeeMonthlyStats(
          employeeId,
          records,
          year,
          month
        );
        stats.attendanceHash = currentHash; // 직원별 해시값 저장
        stats.lastCalculatedAt = new Date();

        // DB에 저장 (upsert)
        await AttendanceStats.findOneAndUpdate(
          { employeeId, year: parseInt(year), month: parseInt(month) },
          { $set: stats },
          { upsert: true, new: true }
        );

        if (existingStats) {
          results.updated++;
        } else {
          results.inserted++;
        }
      } catch (error) {
        console.error(
          `[AttendanceStats] 직원 ${employeeId} 통계 저장 실패:`,
          error
        );
        results.errors++;
      }
    }

    console.log(
      `[AttendanceStats] 저장 완료: ${results.inserted}건 추가, ${results.updated}건 업데이트, ${results.unchanged}건 변경없음, ${results.errors}건 실패`
    );

    return { success: true, results };
  } catch (error) {
    console.error('[AttendanceStats] 계산 및 저장 실패:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  generateAttendanceHash,
  timeToMinutes,
  calculateWorkMinutes,
  categorizeWorkHours,
  calculateEmployeeMonthlyStats,
  calculateAndSaveStats,
};
