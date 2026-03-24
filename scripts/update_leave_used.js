/**
 * 사용연차 기준 leaveUsed + totalAnnual 일괄 업데이트 스크립트
 * - 사번으로 정확 매칭
 * - leaveUsed   = 목표사용 - autoUsed(사용(자동))
 * - totalAnnual = 목표사용 + 목표잔여
 * - 퇴사자 제외
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

// ─── 업데이트 대상 [사번, 이름, 목표사용, 목표잔여] ──────────────────────────
const TARGET_DATA = [
  ['BS-013', '이철균',   0,    25],
  ['BS-035', '이재호',   17.5, 6.5],
  ['BS-042', '김정천',   9.5,  14.5],
  ['BS-075', '이현주',   0,    21],
  ['BS-106', '이인섭',   7,    13],
  ['BS-107', '서상석',   11.5, 8.5],
  ['BS-108', '이택영',   3,    17],
  ['BS-130', '김정일',   12.5, 6.5],
  ['BS-132', '정원국',   1.5,  17.5],
  ['BS-145', '이윤호',   2.5,  16.5],
  ['BS-147', '김도일',   3,    16],
  ['BS-148', '김영화',   2.5,  16.5],
  ['BS-162', '정재준',   7.5,  10.5],
  ['BS-167', '송영길',   1,    17],
  ['BS-168', '노금철',   0,    18],
  ['BS-173', '이성규',   10,   8],
  ['BS-174', '조중수',   5,    13],
  ['BS-175', '이익로',   3.5,  14.5],
  ['BS-177', '젤위스',   4,    14],
  ['BS-183', '어관중',   12,   6],
  ['BS-187', '김경수',   9,    8],
  ['BS-189', '리노',     2,    15],
  ['BS-197', '주안',     2,    15],
  ['BS-203', '박명청',   1,    15],
  ['BS-206', '루이즈',   0,    16],
  ['BS-208', '엄성덕',   2,    14],
  ['BS-209', '장종호',   4,    12],
  ['BS-213', '윤정수',   12,   4],
  ['BS-214', '안효성',   16,   0],
  ['BS-215', '신미선',   15.5, 0.5],
  ['BS-217', '이혜영',   7.5,  8.5],
  ['BS-219', '안토니오', 7,    9],
  ['BS-220', '나범수',   6.5,  9.5],
  ['BS-223', '김명수',   1,    15],
  ['BS-226', '민성우',   1,    15],
  ['BS-230', '김명흠',   0,    16],
  ['BS-231', '제퍼슨',   0,    16],
  ['BS-232', '박용국',   0,    16],
  ['BS-233', '보다남',   7,    8],
  ['BS-235', '그레이논', 11,   4],
  ['BS-236', '이서현',   8,    7],
  ['BS-237', '문건수',   5.5,  9.5],
  ['BS-244', '케빈',     0,    15],
  ['BS-245', '이준범',   9.5,  5.5],
  ['BS-249', '김철수',   6,    9],
  ['BS-250', '김석철',   14,   1],
  ['BS-253', '존마이클', 1,    14],
  ['BS-254', '허호선',   3,    12],
  ['BS-255', '김흥수',   4,    11],
  ['BS-256', '알렉시스', 9,    6],
  ['BS-257', '정은수',   2.5,  12.5],
  ['BS-259', '브렌도',   6,    9],
  ['BS-260', '우상일',   1,    14],
  ['BS-261', '크리산토', 0,    15],
  ['BS-262', '이성동',   0,    15],
  ['BS-263', '이종진',   0,    15],
  ['BS-264', '김보균',   11,   -1],
  ['BS-265', '곽상무',   8.5,  1.5],
  ['BS-266', '김유선',   9,    -1],
  ['BS-267', '지준훈',   9,    -1],
  ['BS-268', '이인태',   6,    2],
  ['BS-269', '조나드',   6,    2],
  ['BS-270', '마이클',   5,    2],
  ['BS-271', '김태현',   3.5,  2.5],
  ['BS-272', '박영구',   2,    4],
  ['BS-273', '이민철',   4,    0],
  ['BS-274', '박용학',   2,    1],
  ['BS-275', '이성동',   0,    1],
  ['BS-276', '이종진',   0,    1],
  ['BS-277', '이재호',   0,    1],
  ['BS-278', '자르윈',   0,    1],
  ['BS-279', '투이하',   0,    0],
  ['BS-280', '김성일',   0,    0],
];

// ─── 연차 기간 계산 ──────────────────────────────────────────────────────────
function calcAnnualPeriod(emp) {
  const hireDate = new Date(emp.hireDate || emp.joinDate);
  if (isNaN(hireDate.getTime())) return null;
  const today = new Date();
  const cy = today.getFullYear();
  const startThisYear = new Date(cy, hireDate.getMonth(), hireDate.getDate());
  const endThisYear = new Date(startThisYear);
  endThisYear.setFullYear(endThisYear.getFullYear() + 1);
  endThisYear.setDate(endThisYear.getDate() - 1);
  if (today < startThisYear) {
    const s = new Date(startThisYear);
    s.setFullYear(s.getFullYear() - 1);
    const e = new Date(s);
    e.setFullYear(e.getFullYear() + 1);
    e.setDate(e.getDate() - 1);
    return { annualStart: s, annualEnd: e };
  }
  return { annualStart: startThisYear, annualEnd: endThisYear };
}

// ─── 메인 ────────────────────────────────────────────────────────────────────
async function main() {
  const mongoURI =
    process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/busung_hr';

  await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 10000 });
  console.log('✅ MongoDB 연결 성공\n');

  const empCol   = mongoose.connection.db.collection('employees');
  const leaveCol = mongoose.connection.db.collection('leaves');

  const ANNUAL_TYPES = ['연차', '반차(오전)', '반차(오후)'];
  const results  = [];
  const warnings = [];

  for (const [empId, name, targetUsed, targetRemain] of TARGET_DATA) {
    // 사번으로 직원 조회
    const emp = await empCol.findOne({ employeeId: empId });

    if (!emp) {
      warnings.push(`[미발견] ${empId} ${name}`);
      continue;
    }

    // 퇴사자 제외
    if (emp.status === '퇴사') {
      console.log(`  ⏭️  ${empId} ${name} → 퇴사자 제외`);
      continue;
    }

    // 연차 기간 결정
    let annualStart, annualEnd;
    if (emp.annualLeaveStart && emp.annualLeaveEnd) {
      annualStart = new Date(emp.annualLeaveStart + 'T00:00:00+09:00');
      annualEnd   = new Date(emp.annualLeaveEnd   + 'T00:00:00+09:00');
      // 미래 날짜 오류 보정: annualLeaveStart가 오늘보다 미래이면 1년 전으로
      const today = new Date();
      if (today < annualStart) {
        annualStart.setFullYear(annualStart.getFullYear() - 1);
        annualEnd.setFullYear(annualEnd.getFullYear() - 1);
        warnings.push(`[날짜보정] ${empId} ${name}: annualLeaveStart 미래 → 1년 전으로 보정`);
      }
    } else {
      const period = calcAnnualPeriod(emp);
      if (!period) { warnings.push(`[날짜오류] ${empId} ${name}`); continue; }
      annualStart = period.annualStart;
      annualEnd   = period.annualEnd;
    }

    // 사용(자동) 계산
    const approvedLeaves = await leaveCol.find({
      $or: [
        { employeeId: empId },
        { employeeId: String(emp._id) },
        { employeeName: emp.name },
      ],
      status: '승인',
      type: { $in: ANNUAL_TYPES },
      startDate: { $gte: annualStart, $lte: annualEnd },
    }).toArray();

    let autoUsed = 0;
    for (const leave of approvedLeaves) {
      autoUsed += leave.approvedDays ?? leave.requestedDays ?? leave.days ?? 1;
    }
    autoUsed = Math.round(autoUsed * 100) / 100;

    // 계산
    const newLeaveUsed   = Math.round((targetUsed - autoUsed) * 100) / 100;
    const newTotalAnnual = Math.round((targetUsed + targetRemain) * 100) / 100;
    const oldLeaveUsed   = Math.round((emp.leaveUsed   ?? 0) * 100) / 100;
    const oldTotalAnnual = Math.round((emp.totalAnnual ?? 0) * 100) / 100;

    const leaveUsedChanged   = oldLeaveUsed   !== newLeaveUsed;
    const totalAnnualChanged = oldTotalAnnual !== newTotalAnnual;
    const changed = leaveUsedChanged || totalAnnualChanged;

    results.push({
      empId, name,
      targetUsed, targetRemain,
      autoUsed,
      oldLeaveUsed, newLeaveUsed, leaveUsedChanged,
      oldTotalAnnual, newTotalAnnual, totalAnnualChanged,
      _id: emp._id,
      changed,
    });
  }

  // ── 결과 출력 ──
  console.log('사번      이름       자동   목표사용  leaveUsed변경          총연차변경');
  console.log('─'.repeat(80));
  for (const r of results) {
    const lu = r.leaveUsedChanged
      ? `${r.oldLeaveUsed} → ${r.newLeaveUsed} ★`
      : `${r.newLeaveUsed} (unchanged)`;
    const ta = r.totalAnnualChanged
      ? `${r.oldTotalAnnual} → ${r.newTotalAnnual} ★`
      : `${r.newTotalAnnual} (unchanged)`;
    console.log(
      r.empId.padEnd(9),
      r.name.padEnd(10),
      String(r.autoUsed).padEnd(6),
      String(r.targetUsed).padEnd(9),
      lu.padEnd(22),
      ta
    );
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  경고:');
    warnings.forEach(w => console.log('  ' + w));
  }

  const changedList = results.filter(r => r.changed);
  console.log(`\n변경 대상: ${changedList.length}명 / 전체 ${results.length}명`);

  if (changedList.length === 0) {
    console.log('변경 없음. DB가 이미 최신 상태입니다.');
    await mongoose.disconnect();
    return;
  }

  // ── DB 업데이트 ──
  console.log('\nDB 업데이트 중...');
  for (const r of changedList) {
    const updateFields = {};
    if (r.leaveUsedChanged)   updateFields.leaveUsed   = r.newLeaveUsed;
    if (r.totalAnnualChanged) updateFields.totalAnnual = r.newTotalAnnual;

    await empCol.updateOne({ _id: r._id }, { $set: updateFields });

    const detail = [];
    if (r.leaveUsedChanged)   detail.push(`leaveUsed: ${r.oldLeaveUsed} → ${r.newLeaveUsed}`);
    if (r.totalAnnualChanged) detail.push(`totalAnnual: ${r.oldTotalAnnual} → ${r.newTotalAnnual}`);
    console.log(`  ✅ ${r.empId} ${r.name}: ${detail.join(' | ')}`);
  }
  console.log(`\n✅ 완료: ${changedList.length}명 업데이트`);
  await mongoose.disconnect();
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
