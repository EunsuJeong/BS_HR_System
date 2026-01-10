const {
  Employee,
  Attendance,
  Leave,
  Suggestion,
  SafetyAccident,
  Evaluation,
  Notice,
  WorkLifeBalanceStats,
} = require('../models');

/**
 * 워라밸 지표 계산 서비스
 * - 서버에서 배치로 워라밸 지표를 계산하여 DB에 저장
 * - 클라이언트는 계산된 결과를 조회만 수행
 */

/**
 * 특정 월의 워라밸 지표 계산
 * @param {number} year - 연도
 * @param {number} month - 월 (1-12)
 * @returns {Promise<Object>} 계산된 워라밸 지표
 */
async function calculateWorkLifeBalance(year, month) {
  const startTime = Date.now();

  console.log(`📊 워라밸 지표 계산 시작: ${year}년 ${month}월`);

  try {
    // 제외할 직원 목록
    const excludeNames = ['이철균', '이현주'];

    // 전체 직원 조회
    const employees = await Employee.find({
      name: { $nin: excludeNames },
    });

    console.log(`👥 대상 직원 수: ${employees.length}명`);

    // 병렬로 4가지 지표 계산
    const [
      averageOvertimeHours,
      leaveUsageRate,
      weekly52HoursViolation,
      stressIndex,
    ] = await Promise.all([
      calculateAverageOvertimeHours(year, month, employees),
      calculateLeaveUsageRate(year, month, employees),
      calculateWeekly52HoursViolation(year, month, employees),
      calculateStressIndex(year, month, employees),
    ]);

    const calculationDuration = Date.now() - startTime;

    const result = {
      year,
      month,
      averageOvertimeHours: averageOvertimeHours.value,
      leaveUsageRate: leaveUsageRate.value,
      weekly52HoursViolation: weekly52HoursViolation.value,
      stressIndex: stressIndex.value,
      details: {
        overtime: averageOvertimeHours.details,
        leave: leaveUsageRate.details,
        violations: weekly52HoursViolation.details,
        stress: stressIndex.details,
      },
      calculatedAt: new Date(),
      calculationDuration,
      employeeCount: employees.length,
    };

    console.log(`✅ 워라밸 지표 계산 완료 (${calculationDuration}ms)`);
    console.log(
      `   - 평균 특근시간: ${averageOvertimeHours.value.toFixed(1)}시간`
    );
    console.log(`   - 연차 사용률: ${leaveUsageRate.value.toFixed(1)}%`);
    console.log(
      `   - 주52시간 위반율: ${weekly52HoursViolation.value.toFixed(1)}%`
    );
    console.log(`   - 스트레스 지수: ${stressIndex.value.toFixed(0)}점`);

    return result;
  } catch (error) {
    console.error(`❌ 워라밸 지표 계산 실패: ${error.message}`);
    throw error;
  }
}

/**
 * 1. 평균 특근시간 계산
 */
async function calculateAverageOvertimeHours(year, month, employees) {
  const daysInMonth = new Date(year, month, 0).getDate();

  let totalOvertimeHours = 0;
  let employeeCount = 0;

  for (const emp of employees) {
    // 해당 월의 전체 출근 기록 조회
    const attendances = await Attendance.find({
      employeeId: emp._id.toString(),
      year,
      month,
      checkIn: { $exists: true },
      checkOut: { $exists: true },
    });

    let empOvertimeHours = 0;

    for (const att of attendances) {
      // 근무 시간 계산 (단순화: totalWorkMinutes / 60)
      const totalHours = (att.totalWorkMinutes || 0) / 60;
      const overtimeHours = Math.max(0, totalHours - 8);
      empOvertimeHours += overtimeHours;
    }

    if (empOvertimeHours > 0) {
      totalOvertimeHours += empOvertimeHours;
      employeeCount++;
    }
  }

  const average = employeeCount > 0 ? totalOvertimeHours / employeeCount : 0;

  return {
    value: Math.round(average * 100) / 100,
    details: {
      totalEmployees: employeeCount,
      totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
    },
  };
}

/**
 * 2. 연차 사용률 계산
 */
async function calculateLeaveUsageRate(year, month, employees) {
  let totalUsedLeave = 0;
  let totalAvailableLeave = 0;

  for (const emp of employees) {
    // 해당 월의 승인된 연차 조회
    const leaves = await Leave.find({
      employeeId: emp._id.toString(),
      status: '승인',
      $expr: {
        $and: [
          { $eq: [{ $year: '$startDate' }, year] },
          { $eq: [{ $month: '$startDate' }, month] },
        ],
      },
    });

    const usedLeave = leaves.reduce((sum, leave) => {
      if (leave.type === '연차') {
        return sum + (leave.approvedDays || 1);
      } else if (leave.type?.includes('반차')) {
        return sum + 0.5;
      }
      return sum;
    }, 0);

    // 총 연차 계산 (간단히: 입사년도에 따라 계산)
    const joinDate = new Date(emp.joinDate);
    const yearsWorked =
      year -
      joinDate.getFullYear() +
      (month >= joinDate.getMonth() + 1 ? 1 : 0);
    const totalLeave = Math.min(15 + yearsWorked, 25); // 기본 15일 + 1년당 1일, 최대 25일

    totalUsedLeave += usedLeave;
    totalAvailableLeave += totalLeave;
  }

  const rate =
    totalAvailableLeave > 0 ? (totalUsedLeave / totalAvailableLeave) * 100 : 0;

  return {
    value: Math.round(rate * 100) / 100,
    details: {
      totalEmployees: employees.length,
      totalUsedLeave: Math.round(totalUsedLeave * 100) / 100,
      totalAvailableLeave,
    },
  };
}

/**
 * 3. 주 52시간 위반율 계산
 */
async function calculateWeekly52HoursViolation(year, month, employees) {
  let violatedEmployees = 0;
  let violationCount = 0;

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  for (const emp of employees) {
    let currentWeekStart = new Date(monthStart);

    // 첫 번째 월요일 찾기
    const dayOfWeek = currentWeekStart.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    currentWeekStart.setDate(currentWeekStart.getDate() + daysToMonday);

    let hasViolation = false;

    while (currentWeekStart <= monthEnd) {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); // 일요일

      // 해당 주의 출근 기록 조회
      const attendances = await Attendance.find({
        employeeId: emp._id.toString(),
        year,
        month,
        day: {
          $gte: currentWeekStart.getDate(),
          $lte: Math.min(weekEnd.getDate(), monthEnd.getDate()),
        },
        checkIn: { $exists: true },
        checkOut: { $exists: true },
      });

      const weeklyMinutes = attendances.reduce(
        (sum, att) => sum + (att.totalWorkMinutes || 0),
        0
      );
      const weeklyHours = weeklyMinutes / 60;

      if (weeklyHours > 52) {
        hasViolation = true;
        violationCount++;
      }

      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    if (hasViolation) {
      violatedEmployees++;
    }
  }

  const rate = employees.length > 0 ? (violatedEmployees / employees.length) * 100 : 0;

  return {
    value: Math.round(rate * 100) / 100,
    details: {
      totalEmployees: employees.length,
      violatedEmployees,
      violationCount,
    },
  };
}

/**
 * 4. 스트레스 지수 계산
 */
async function calculateStressIndex(year, month, employees) {
  const daysInMonth = new Date(year, month, 0).getDate();

  let totalStress = 0;
  let employeesWithData = 0;
  let highStressCount = 0;
  let mediumStressCount = 0;
  let lowStressCount = 0;

  for (const emp of employees) {
    let stressScore = 0;
    let hasWorkData = false;

    // 해당 월의 출근 기록 조회
    const attendances = await Attendance.find({
      employeeId: emp._id.toString(),
      year,
      month,
      checkIn: { $exists: true },
      checkOut: { $exists: true },
    });

    if (attendances.length === 0) continue;

    hasWorkData = true;

    // 1. 근무시간 (30점) - 주별 평균
    const weeklyHoursList = [];
    let currentWeekMinutes = 0;

    attendances.forEach((att, index) => {
      currentWeekMinutes += att.totalWorkMinutes || 0;

      const dayOfWeek = new Date(year, month - 1, att.day).getDay();
      if (dayOfWeek === 0 || index === attendances.length - 1) {
        if (currentWeekMinutes > 0) {
          weeklyHoursList.push(currentWeekMinutes / 60);
        }
        currentWeekMinutes = 0;
      }
    });

    const avgWeeklyHours =
      weeklyHoursList.length > 0
        ? weeklyHoursList.reduce((a, b) => a + b, 0) / weeklyHoursList.length
        : 0;

    if (avgWeeklyHours >= 52) stressScore += 30;
    else if (avgWeeklyHours >= 46) stressScore += 20;
    else if (avgWeeklyHours >= 40) stressScore += 10;

    // 2. 연차사용률 (20점)
    const yearStart = new Date(year, 0, 1);
    const monthEnd = new Date(year, month, 0);

    const usedLeaves = await Leave.find({
      employeeId: emp._id.toString(),
      status: '승인',
      startDate: { $gte: yearStart, $lte: monthEnd },
    });

    const usedLeave = usedLeaves.reduce((sum, leave) => {
      if (leave.type === '연차') return sum + (leave.approvedDays || 1);
      if (leave.type?.includes('반차')) return sum + 0.5;
      return sum;
    }, 0);

    const joinDate = new Date(emp.joinDate);
    const yearsWorked = year - joinDate.getFullYear();
    const totalLeave = Math.min(15 + yearsWorked, 25);
    const leaveUsageRate = totalLeave > 0 ? (usedLeave / totalLeave) * 100 : 0;

    if (leaveUsageRate < 20) stressScore += 20;
    else if (leaveUsageRate < 40) stressScore += 15;
    else if (leaveUsageRate < 60) stressScore += 10;
    else if (leaveUsageRate < 80) stressScore += 5;

    // 3. 정시퇴근율 (20점) - 간소화
    let workDays = attendances.length;
    let onTimeCheckouts = attendances.filter((att) => {
      const checkOutMinutes =
        parseInt(att.checkOut?.split(':')[0] || 0) * 60 +
        parseInt(att.checkOut?.split(':')[1] || 0);
      return checkOutMinutes <= 1080; // 18:00 이전
    }).length;

    const onTimeRate = workDays > 0 ? (onTimeCheckouts / workDays) * 100 : 0;

    if (onTimeRate < 20) stressScore += 20;
    else if (onTimeRate < 40) stressScore += 15;
    else if (onTimeRate < 60) stressScore += 10;
    else if (onTimeRate < 80) stressScore += 5;

    // 4. 건의사항 승인률 (10점)
    const monthStart = new Date(year, month - 1, 1);
    const monthEndDate = new Date(year, month, 0);

    const suggestions = await Suggestion.find({
      employeeId: emp._id.toString(),
      createdAt: { $gte: monthStart, $lte: monthEndDate },
    });

    if (suggestions.length > 0) {
      const approvedCount = suggestions.filter(
        (s) => s.status === '승인'
      ).length;
      const approvalRate = (approvedCount / suggestions.length) * 100;

      if (approvalRate < 25) stressScore += 10;
      else if (approvalRate < 50) stressScore += 7;
      else if (approvalRate < 75) stressScore += 3;
    }

    // 5. 야간/연속근무 (10점) - 간소화
    let maxConsecutiveDays = 0;
    let currentConsecutiveDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const att = attendances.find((a) => a.day === day);
      if (att) {
        currentConsecutiveDays++;
        maxConsecutiveDays = Math.max(
          maxConsecutiveDays,
          currentConsecutiveDays
        );
      } else {
        currentConsecutiveDays = 0;
      }
    }

    if (maxConsecutiveDays >= 7) stressScore += 5;

    // 6. 근태안정성 (10점) - 간소화
    const lateCount = attendances.filter((att) => {
      const checkInMinutes =
        parseInt(att.checkIn?.split(':')[0] || 0) * 60 +
        parseInt(att.checkIn?.split(':')[1] || 0);
      return checkInMinutes > 510; // 08:30 이후
    }).length;

    if (lateCount >= 3) stressScore += 5;

    // 최종 스트레스 점수
    const finalScore = Math.min(100, stressScore);
    totalStress += finalScore;
    employeesWithData++;

    if (finalScore >= 70) highStressCount++;
    else if (finalScore >= 40) mediumStressCount++;
    else lowStressCount++;
  }

  const average = employeesWithData > 0 ? totalStress / employeesWithData : 0;

  return {
    value: Math.round(average),
    details: {
      totalEmployees: employeesWithData,
      totalStressScore: Math.round(totalStress),
      highStressCount,
      mediumStressCount,
      lowStressCount,
    },
  };
}

/**
 * 워라밸 지표 저장 또는 업데이트
 */
async function saveWorkLifeBalance(data) {
  try {
    const result = await WorkLifeBalanceStats.findOneAndUpdate(
      { year: data.year, month: data.month },
      data,
      { upsert: true, new: true }
    );

    console.log(
      `💾 워라밸 지표 저장 완료: ${data.year}년 ${data.month}월`
    );
    return result;
  } catch (error) {
    console.error(`❌ 워라밸 지표 저장 실패: ${error.message}`);
    throw error;
  }
}

/**
 * 워라밸 지표 조회
 */
async function getWorkLifeBalance(year, month) {
  try {
    const result = await WorkLifeBalanceStats.findOne({ year, month });
    return result;
  } catch (error) {
    console.error(`❌ 워라밸 지표 조회 실패: ${error.message}`);
    throw error;
  }
}

/**
 * 연도별 워라밸 지표 조회
 */
async function getWorkLifeBalanceByYear(year) {
  try {
    const results = await WorkLifeBalanceStats.find({ year }).sort({
      month: 1,
    });
    return results;
  } catch (error) {
    console.error(`❌ 연도별 워라밸 지표 조회 실패: ${error.message}`);
    throw error;
  }
}

module.exports = {
  calculateWorkLifeBalance,
  saveWorkLifeBalance,
  getWorkLifeBalance,
  getWorkLifeBalanceByYear,
};
