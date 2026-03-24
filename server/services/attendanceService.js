'use strict';

/**
 * Attendance Service
 * 출근/근태 관련 MongoDB 쿼리를 담당
 */

const { Attendance } = require('../models');

/**
 * 날짜 정보를 쿼리에서 파싱
 */
function parseDateFromQuery(query) {
  let year  = new Date().getFullYear();
  let month = new Date().getMonth(); // 0-indexed

  const yearMatch  = query.match(/(\d{4})\s*년/);
  const monthMatch = query.match(/(\d{1,2})\s*월/);
  const dashMatch  = query.match(/(\d{4})-(\d{1,2})/);

  if (yearMatch)  year  = parseInt(yearMatch[1]);
  if (monthMatch) month = parseInt(monthMatch[1]) - 1;
  if (dashMatch)  { year = parseInt(dashMatch[1]); month = parseInt(dashMatch[2]) - 1; }

  const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
  const endOfMonth   = new Date(year, month + 1, 0).toISOString().split('T')[0];

  return { year, month: month + 1, startOfMonth, endOfMonth };
}

/**
 * 출근 요약 데이터 조회
 */
async function getAttendanceSummary(query) {
  const today = new Date().toISOString().split('T')[0];
  const { year, month, startOfMonth, endOfMonth } = parseDateFromQuery(query);

  // checkIn이 실제 시간(HH:mm)인 경우만 출근으로 판단
  // '연차', '반차', '경조' 등 텍스트 값은 제외
  const timeRegex = /^\d{2}:\d{2}$/;
  const isRealCheckIn = (a) => timeRegex.test(a.checkIn);

  const summarize = (list) => {
    const realAttendance = list.filter(isRealCheckIn);
    const leaveTypes     = list.filter(a => a.checkIn && !timeRegex.test(a.checkIn));
    return {
      total:       list.length,
      checkedIn:   realAttendance.length,  // 실제 출근 (HH:mm 형식)
      leaveCount:  leaveTypes.length,      // 연차/반차/경조 등
      leaveTypes:  [...new Set(leaveTypes.map(a => a.checkIn))],
      names:       realAttendance.slice(0, 10).map(a => a.employeeName || a.employeeId),
    };
  };

  return {
    intent:  'attendance',
    period:  { year, month, startOfMonth, endOfMonth, today },
    today:   summarize(todayList),
    month:   summarize(monthList),
  };
}

/**
 * 특정 직원의 출근 데이터 조회
 */
async function getEmployeeAttendance(employeeName, year, month) {
  const startOfMonth = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endOfMonth   = new Date(year, month, 0).toISOString().split('T')[0];

  const records = await Attendance.find({
    employeeName,
    date: { $gte: startOfMonth, $lte: endOfMonth },
  }).lean();

  return records.map(a => ({
    date:     a.date,
    checkIn:  a.checkIn  || null,
    checkOut: a.checkOut || null,
    shiftType: a.shiftType || null,
  }));
}

module.exports = { getAttendanceSummary, getEmployeeAttendance };
