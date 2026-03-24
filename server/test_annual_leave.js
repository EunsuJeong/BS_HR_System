/**
 * 연차 갱신 스케줄러 테스트 스크립트
 * 실행: node server/test_annual_leave.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('./config/database');
const { checkAnnualLeaveExpiry } = require('./utils/annualLeaveScheduler');

async function runTest() {
  console.log('\n========================================');
  console.log('  연차 갱신 스케줄러 테스트 시작');
  console.log('========================================\n');

  // DB 연결
  await connectDB();

  // 1. 테스트 전 직원 상태 확인
  const { Employee } = require('./models');
  const employees = await Employee.find({ status: '재직' }).select(
    'name employeeId annualLeaveStart annualLeaveEnd totalAnnual usedAnnual remainAnnual leaveUsed'
  );

  console.log(`\n📋 재직 중인 직원 수: ${employees.length}명`);
  console.log('\n[테스트 전 연차 현황]');

  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
  console.log(`오늘 날짜 (KST): ${today}\n`);

  let noAnnualDateCount = 0;
  let expiredCount = 0;
  let validCount = 0;

  employees.forEach(emp => {
    if (!emp.annualLeaveEnd || !emp.annualLeaveStart) {
      console.log(`  ⚠️  [annualLeaveEnd 없음] ${emp.name} (${emp.employeeId})`);
      noAnnualDateCount++;
      return;
    }
    const daysUntilExpiry = Math.round(
      (new Date(emp.annualLeaveEnd + 'T00:00:00+09:00') - new Date(today + 'T00:00:00+09:00'))
      / (1000 * 60 * 60 * 24)
    );
    if (daysUntilExpiry < 0) {
      console.log(`  🔴 [갱신 필요] ${emp.name} (${emp.employeeId}) | 종료일: ${emp.annualLeaveEnd} (${Math.abs(daysUntilExpiry)}일 초과)`);
      expiredCount++;
    } else {
      console.log(`  ✅ [정상]     ${emp.name} (${emp.employeeId}) | 종료일: ${emp.annualLeaveEnd} (${daysUntilExpiry}일 남음)`);
      validCount++;
    }
  });

  console.log(`\n요약: 정상 ${validCount}명 | 갱신필요 ${expiredCount}명 | annualLeaveEnd 없음 ${noAnnualDateCount}명`);

  // 2. 스케줄러 실행
  console.log('\n========================================');
  console.log('  스케줄러 실행 중...');
  console.log('========================================\n');
  await checkAnnualLeaveExpiry(null);

  // 3. 테스트 후 직원 상태 재확인
  const employeesAfter = await Employee.find({ status: '재직' }).select(
    'name employeeId annualLeaveStart annualLeaveEnd totalAnnual usedAnnual remainAnnual leaveUsed'
  );

  console.log('\n[테스트 후 연차 현황]');
  employeesAfter.forEach(emp => {
    if (!emp.annualLeaveEnd) return;
    const daysUntilExpiry = Math.round(
      (new Date(emp.annualLeaveEnd + 'T00:00:00+09:00') - new Date(today + 'T00:00:00+09:00'))
      / (1000 * 60 * 60 * 24)
    );
    console.log(`  ${emp.name} (${emp.employeeId}) | 연차기간: ${emp.annualLeaveStart} ~ ${emp.annualLeaveEnd} | 총연차: ${emp.totalAnnual} | leaveUsed: ${emp.leaveUsed} | 남은일: ${daysUntilExpiry}`);
  });

  console.log('\n========================================');
  console.log('  테스트 완료');
  console.log('========================================\n');

  await disconnectDB();
  process.exit(0);
}

runTest().catch(err => {
  console.error('❌ 테스트 오류:', err);
  process.exit(1);
});
