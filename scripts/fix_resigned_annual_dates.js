/**
 * 퇴사자 연차 기간 보정 스크립트
 * - 입사일 기준으로 퇴사일 이전의 마지막 연차 기간을 계산하여 DB 수정
 * - annualLeaveStart = 퇴사일 이전의 마지막 입사 기념일
 * - annualLeaveEnd   = annualLeaveStart + 1년 - 1일
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const fmt = (d) =>
  d.getFullYear() + '-' +
  String(d.getMonth() + 1).padStart(2, '0') + '-' +
  String(d.getDate()).padStart(2, '0');

async function main() {
  const mongoURI =
    process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/busung_hr';

  await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 10000 });
  console.log('✅ MongoDB 연결 성공\n');

  const empCol = mongoose.connection.db.collection('employees');

  // 퇴사자 중 annualLeaveStart가 있는 직원 조회
  const resignedEmps = await empCol.find({
    status: '퇴사',
    annualLeaveStart: { $exists: true, $ne: null, $ne: '' },
    leaveDate: { $exists: true, $ne: null },
  }).toArray();

  console.log(`퇴사자 (annualLeaveStart 있음): ${resignedEmps.length}명\n`);

  const toUpdate = [];
  const noChange = [];

  for (const emp of resignedEmps) {
    const hireDate   = new Date(emp.hireDate || emp.joinDate);
    const retireDate = new Date(emp.leaveDate);

    if (isNaN(hireDate.getTime()) || isNaN(retireDate.getTime())) {
      console.log(`  ⚠️  날짜 오류: ${emp.employeeId || emp._id} ${emp.name}`);
      continue;
    }

    // 퇴사일 이전의 마지막 입사 기념일 계산
    let periodStart = new Date(retireDate.getFullYear(), hireDate.getMonth(), hireDate.getDate());
    if (periodStart > retireDate) {
      periodStart = new Date(retireDate.getFullYear() - 1, hireDate.getMonth(), hireDate.getDate());
    }

    // 종료일: 시작일 + 1년 - 1일
    const periodEnd = new Date(periodStart);
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    periodEnd.setDate(periodEnd.getDate() - 1);

    const newStart = fmt(periodStart);
    const newEnd   = fmt(periodEnd);
    const oldStart = emp.annualLeaveStart;
    const oldEnd   = emp.annualLeaveEnd;

    if (oldStart !== newStart || oldEnd !== newEnd) {
      toUpdate.push({
        _id: emp._id,
        empId: emp.employeeId || emp.employeeNumber || String(emp._id),
        name: emp.name,
        hireDate: fmt(hireDate),
        retireDate: fmt(retireDate),
        oldStart, oldEnd, newStart, newEnd,
      });
    } else {
      noChange.push(`${emp.employeeId || emp.employeeNumber} ${emp.name} (${oldStart} ~ ${oldEnd})`);
    }
  }

  // 결과 출력
  console.log('사번      이름       입사일       퇴사일       변경 전                  변경 후');
  console.log('─'.repeat(100));
  for (const r of toUpdate) {
    console.log(
      (r.empId || '').padEnd(10),
      (r.name || '').padEnd(10),
      r.hireDate.padEnd(12),
      r.retireDate.padEnd(12),
      `${r.oldStart}~${r.oldEnd}`.padEnd(25),
      `${r.newStart}~${r.newEnd}`
    );
  }

  if (noChange.length > 0) {
    console.log(`\n변경 불필요 (${noChange.length}명):`);
    noChange.forEach(s => console.log('  ' + s));
  }

  console.log(`\n보정 대상: ${toUpdate.length}명 / 전체 퇴사자 ${resignedEmps.length}명`);

  if (toUpdate.length === 0) {
    console.log('변경 없음. DB가 이미 최신 상태입니다.');
    await mongoose.disconnect();
    return;
  }

  // DB 업데이트
  console.log('\nDB 업데이트 중...');
  for (const r of toUpdate) {
    await empCol.updateOne(
      { _id: r._id },
      { $set: { annualLeaveStart: r.newStart, annualLeaveEnd: r.newEnd } }
    );
    console.log(`  ✅ ${r.empId} ${r.name}: ${r.oldStart}~${r.oldEnd} → ${r.newStart}~${r.newEnd}`);
  }
  console.log(`\n✅ 완료: ${toUpdate.length}명 업데이트`);
  await mongoose.disconnect();
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
