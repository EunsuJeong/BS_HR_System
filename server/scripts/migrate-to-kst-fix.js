/**
 * UTC 00:00 데이터만 KST로 변환 (이미 변환된 데이터는 스킵)
 *
 * 변환 대상:
 * - 2024-12-02T00:00:00.000Z (UTC 00:00) → 2024-12-01T15:00:00.000Z (KST 2024-12-02 00:00)
 *
 * 스킵 대상:
 * - 2025-11-18T15:00:00.000Z (이미 KST로 변환됨)
 */

const mongoose = require('mongoose');

// 시간대 설정
process.env.TZ = 'Asia/Seoul';

const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/busung_hr';

// UTC 00:00 데이터를 KST 00:00으로 변환 (날짜 유지)
const convertUTC00ToKST = (utcDate) => {
  if (!utcDate) return null;

  const d = new Date(utcDate);
  const utcHours = d.getUTCHours();

  // 이미 변환된 데이터(UTC 15:00)는 스킵
  if (utcHours === 15) {
    return null; // 변환 불필요
  }

  // UTC 00:00인 경우만 변환
  if (utcHours === 0) {
    // UTC 날짜에서 YYYY-MM-DD 추출
    const dateStr = d.toISOString().split('T')[0];
    const [year, month, day] = dateStr.split('-').map(Number);

    // 해당 날짜를 KST 00:00:00으로 설정
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  return null; // 다른 시간대는 변환하지 않음
};

async function migrateData() {
  try {
    console.log('🕐 시간대:', process.env.TZ);
    console.log('📡 MongoDB 연결 중...');
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB 연결 성공\n');

    // Employee 모델
    const Employee = mongoose.model('Employee', new mongoose.Schema({}, { strict: false }));

    console.log('=' .repeat(60));
    console.log('1️⃣ Employee (직원 정보) 마이그레이션');
    console.log('='.repeat(60));

    const employees = await Employee.find({});
    console.log(`총 ${employees.length}건의 직원 데이터 발견`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const emp of employees) {
      let needUpdate = false;
      const updates = {};

      // joinDate 변환 (UTC 00:00만)
      if (emp.joinDate) {
        const kstDate = convertUTC00ToKST(emp.joinDate);

        if (kstDate) {
          updates.joinDate = kstDate;
          needUpdate = true;

          console.log(`  ${emp.employeeId} (${emp.name})`);
          console.log(`    입사일: ${new Date(emp.joinDate).toISOString()} → ${kstDate.toISOString()}`);
        }
      }

      // leaveDate 변환 (UTC 00:00만)
      if (emp.leaveDate) {
        try {
          const originalDate = new Date(emp.leaveDate);
          if (!isNaN(originalDate.getTime()) && originalDate.getTime() > new Date('2000-01-01').getTime()) {
            const kstDate = convertUTC00ToKST(emp.leaveDate);

            if (kstDate) {
              updates.leaveDate = kstDate;
              needUpdate = true;

              console.log(`    퇴사일: ${originalDate.toISOString()} → ${kstDate.toISOString()}`);
            }
          }
        } catch (e) {
          // 변환 실패 시 무시
        }
      }

      if (needUpdate) {
        await Employee.updateOne({ _id: emp._id }, { $set: updates });
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`\n✅ 완료: ${updatedCount}건 변환, ${skippedCount}건 스킵\n`);

    // Leave 모델
    const Leave = mongoose.model('Leave', new mongoose.Schema({}, { strict: false }));

    console.log('='.repeat(60));
    console.log('2️⃣ Leave (연차 신청) 마이그레이션');
    console.log('='.repeat(60));

    const leaves = await Leave.find({});
    console.log(`총 ${leaves.length}건의 연차 데이터 발견`);

    let leaveUpdatedCount = 0;
    let leaveSkippedCount = 0;

    for (const leave of leaves) {
      let needUpdate = false;
      const updates = {};

      // startDate 변환 (UTC 00:00만)
      if (leave.startDate) {
        const kstDate = convertUTC00ToKST(leave.startDate);

        if (kstDate) {
          updates.startDate = kstDate;
          needUpdate = true;

          console.log(`  ${leave.employeeId} (${leave.employeeName})`);
          console.log(`    시작일: ${new Date(leave.startDate).toISOString()} → ${kstDate.toISOString()}`);
        }
      }

      // endDate 변환 (UTC 00:00만)
      if (leave.endDate) {
        const kstDate = convertUTC00ToKST(leave.endDate);

        if (kstDate) {
          updates.endDate = kstDate;
          needUpdate = true;

          console.log(`    종료일: ${new Date(leave.endDate).toISOString()} → ${kstDate.toISOString()}`);
        }
      }

      if (needUpdate) {
        await Leave.updateOne({ _id: leave._id }, { $set: updates });
        leaveUpdatedCount++;
      } else {
        leaveSkippedCount++;
      }
    }

    console.log(`\n✅ 완료: ${leaveUpdatedCount}건 변환, ${leaveSkippedCount}건 스킵\n`);

    console.log('='.repeat(60));
    console.log('🎉 마이그레이션 완료!');
    console.log('='.repeat(60));
    console.log(`직원 정보: ${updatedCount}건 변환, ${skippedCount}건 스킵`);
    console.log(`연차 신청: ${leaveUpdatedCount}건 변환, ${leaveSkippedCount}건 스킵`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 MongoDB 연결 종료');
  }
}

// 실행
migrateData();
