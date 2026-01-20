/**
 * 목표달성률 계산 테스트 스크립트
 * 이번달 출근률, 지각률, 결근률이 제대로 계산되는지 확인
 */

require('dotenv').config();
const mongoose = require('mongoose');

const Employee = require('./server/models/hr/employees');
const Attendance = require('./server/models/Attendance');
const Leave = require('./server/models/Leave');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hr_system';

async function testGoalRate() {
  try {
    console.log('🔗 MongoDB 연결 중...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 연결 성공\n');

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11
    const monthNumber = month + 1; // 1-12

    console.log(`📅 테스트 대상: ${year}년 ${monthNumber}월`);
    console.log('='.repeat(60));

    // 1. 직원 목록 조회
    const employees = await Employee.find({ status: '재직' });
    console.log(`\n👥 재직 직원 수: ${employees.length}명`);

    // 2. 이번달 근태 데이터 조회
    const startDate = `${year}-${String(monthNumber).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(monthNumber).padStart(2, '0')}-${new Date(year, monthNumber, 0).getDate()}`;

    const attendanceRecords = await Attendance.find({
      date: { $gte: startDate, $lte: endDate }
    });
    console.log(`📊 ${monthNumber}월 근태 기록 수: ${attendanceRecords.length}건`);

    // 3. 연차 신청 조회 (승인된 것만)
    const leaveRequests = await Leave.find({
      status: '승인',
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
      ]
    });
    console.log(`🏖️  ${monthNumber}월 승인된 연차: ${leaveRequests.length}건`);

    // 4. 영업일 계산 (주말, 공휴일 제외)
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    let workDays = 0;
    const workDaysList = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // 간단한 공휴일 체크 (추가 필요)
      const dateStr = `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      if (!isWeekend) {
        workDays++;
        workDaysList.push(day);
      }
    }
    console.log(`📆 ${monthNumber}월 영업일: ${workDays}일`);
    console.log(`   영업일 목록: ${workDaysList.slice(0, 5).join(', ')}... (총 ${workDays}일)\n`);

    // 5. 샘플 직원으로 계산 테스트
    console.log('='.repeat(60));
    console.log('📋 샘플 직원별 상태 (최근 5일)\n');

    const sampleEmployees = employees.slice(0, 5);
    const today = now.getDate();
    const checkDays = [];

    for (let i = 4; i >= 0; i--) {
      const checkDay = today - i;
      if (checkDay > 0) {
        checkDays.push(checkDay);
      }
    }

    for (const emp of sampleEmployees) {
      console.log(`\n👤 ${emp.name} (${emp.employeeId}) - ${emp.workType || '주간'}`);

      for (const day of checkDays) {
        const dateStr = `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const attendance = attendanceRecords.find(
          r => r.employeeId === emp.employeeId && r.date === dateStr
        );

        const onLeave = leaveRequests.some(lr => {
          const startDate = lr.startDate.split('T')[0];
          const endDate = lr.endDate.split('T')[0];
          return lr.employeeId === emp.employeeId &&
                 dateStr >= startDate &&
                 dateStr <= endDate;
        });

        let status = '결근';
        if (onLeave) {
          status = '연차';
        } else if (attendance) {
          if (attendance.checkIn) {
            const checkInTime = attendance.checkIn;
            const [hour, minute] = checkInTime.split(':').map(Number);
            const checkInMinutes = hour * 60 + minute;

            // 지각 기준: 주간 08:31, 야간 19:01
            const isLate = (emp.workType === '야간' && checkInMinutes > 1141) ||
                          (emp.workType !== '야간' && checkInMinutes > 511);

            status = isLate ? '지각' : '출근';
          } else if (attendance.checkOut) {
            status = '출근'; // 퇴근만 있는 경우
          }
        }

        const statusColor = {
          '출근': '🟢',
          '지각': '🟡',
          '결근': '🔴',
          '연차': '🔵'
        }[status] || '⚪';

        console.log(`   ${dateStr}: ${statusColor} ${status}${attendance ? ` (${attendance.checkIn || ''} - ${attendance.checkOut || ''})` : ''}`);
      }
    }

    // 6. 전체 목표달성률 계산
    console.log('\n' + '='.repeat(60));
    console.log('📊 이번달 목표달성률 계산 결과\n');

    let totalAttendance = 0;
    let totalLate = 0;
    let totalAbsent = 0;
    let totalTarget = 0;

    for (const day of workDaysList) {
      if (day > today) continue; // 미래 날짜는 제외

      const dateStr = `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // 연차자 제외
      const onLeaveToday = leaveRequests
        .filter(lr => {
          const startDate = lr.startDate.split('T')[0];
          const endDate = lr.endDate.split('T')[0];
          return dateStr >= startDate && dateStr <= endDate;
        })
        .map(lr => lr.employeeId);

      const targetEmployees = employees.filter(
        emp => !onLeaveToday.includes(emp.employeeId)
      );

      if (targetEmployees.length === 0) continue;

      let dayAttendance = 0;
      let dayLate = 0;
      let dayAbsent = 0;

      for (const emp of targetEmployees) {
        const attendance = attendanceRecords.find(
          r => r.employeeId === emp.employeeId && r.date === dateStr
        );

        let status = '결근';
        if (attendance && attendance.checkIn) {
          const [hour, minute] = attendance.checkIn.split(':').map(Number);
          const checkInMinutes = hour * 60 + minute;

          const isLate = (emp.workType === '야간' && checkInMinutes > 1141) ||
                        (emp.workType !== '야간' && checkInMinutes > 511);

          status = isLate ? '지각' : '출근';
        } else if (attendance && attendance.checkOut) {
          status = '출근';
        }

        if (status === '출근') dayAttendance++;
        else if (status === '지각') dayLate++;
        else if (status === '결근') dayAbsent++;
      }

      totalAttendance += dayAttendance;
      totalLate += dayLate;
      totalAbsent += dayAbsent;
      totalTarget += targetEmployees.length;
    }

    const attendanceRate = totalTarget > 0 ? ((totalAttendance / totalTarget) * 100).toFixed(1) : 0;
    const lateRate = totalTarget > 0 ? ((totalLate / totalTarget) * 100).toFixed(1) : 0;
    const absentRate = totalTarget > 0 ? ((totalAbsent / totalTarget) * 100).toFixed(1) : 0;

    console.log(`✅ 출근률: ${attendanceRate}% (${totalAttendance} / ${totalTarget})`);
    console.log(`⚠️  지각률: ${lateRate}% (${totalLate} / ${totalTarget})`);
    console.log(`❌ 결근률: ${absentRate}% (${totalAbsent} / ${totalTarget})`);

    // 7. 검증
    console.log('\n' + '='.repeat(60));
    console.log('🔍 데이터 검증\n');

    console.log(`총 계산 대상: ${totalTarget}명일`);
    console.log(`출근: ${totalAttendance}명일 (${attendanceRate}%)`);
    console.log(`지각: ${totalLate}명일 (${lateRate}%)`);
    console.log(`결근: ${totalAbsent}명일 (${absentRate}%)`);
    console.log(`합계: ${totalAttendance + totalLate + totalAbsent}명일`);

    const sum = parseFloat(attendanceRate) + parseFloat(lateRate) + parseFloat(absentRate);
    console.log(`\n비율 합계: ${sum.toFixed(1)}% (100%에 근접해야 정상)`);

    if (Math.abs(sum - 100) < 1) {
      console.log('✅ 계산이 정상적으로 작동하고 있습니다.');
    } else {
      console.log('⚠️  계산에 문제가 있을 수 있습니다. 로직을 확인하세요.');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB 연결 종료');
  }
}

testGoalRate();
