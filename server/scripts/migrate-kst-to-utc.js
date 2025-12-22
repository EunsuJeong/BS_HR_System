/**
 * KST 날짜를 UTC 날짜로 변환 (날짜 값 유지)
 *
 * 변환:
 * - 2019-10-13T15:00:00.000Z (KST 2019-10-14 00:00 저장)
 *   → 2019-10-14T00:00:00.000Z (UTC 2019-10-14 00:00)
 *
 * 목표: 입력값 = DB값 = 표시값
 * - 입력: 2019-10-14
 * - DB: 2019-10-14T00:00:00.000Z
 * - 표시: 2019-10-14
 */

const mongoose = require('mongoose');

const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/busung_hr';

// KST 날짜(UTC 15:00)를 UTC 00:00으로 변환
const convertKSTToUTC = (date) => {
  if (!date) return null;

  const d = new Date(date);
  const utcHours = d.getUTCHours();

  // KST로 저장된 데이터(UTC 15:00)만 변환
  if (utcHours === 15) {
    // UTC 기준으로 하루 추가하여 날짜 맞춤
    // 예: 2019-10-13T15:00:00.000Z → 2019-10-14T00:00:00.000Z
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    const day = d.getUTCDate();

    // 다음 날 UTC 00:00으로 설정
    return new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));
  }

  // UTC 00:00 데이터는 그대로 유지
  if (utcHours === 0) {
    return null; // 변환 불필요
  }

  return null; // 다른 시간대는 변환하지 않음
};

async function migrateData() {
  try {
    console.log('📡 MongoDB 연결 중...');
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB 연결 성공\n');

    const db = mongoose.connection.db;
    const employeesCollection = db.collection('employees');

    console.log('='.repeat(60));
    console.log('1️⃣ Employee (직원 정보) 마이그레이션 - KST → UTC');
    console.log('='.repeat(60));

    const employees = await employeesCollection.find({}).toArray();
    console.log(`총 ${employees.length}건의 직원 데이터 발견`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const emp of employees) {
      const updates = {};
      let needUpdate = false;

      // joinDate 변환 (UTC 15:00 → UTC 00:00)
      if (emp.joinDate) {
        const utcDate = convertKSTToUTC(emp.joinDate);
        if (utcDate) {
          updates.joinDate = utcDate;
          needUpdate = true;
          console.log(`  ${emp.employeeId} (${emp.name})`);
          console.log(`    입사일: ${new Date(emp.joinDate).toISOString()} → ${utcDate.toISOString()}`);
        }
      }

      // leaveDate 변환 (UTC 15:00 → UTC 00:00)
      if (emp.leaveDate) {
        try {
          const originalDate = new Date(emp.leaveDate);
          if (!isNaN(originalDate.getTime()) && originalDate.getTime() > new Date('2000-01-01').getTime()) {
            const utcDate = convertKSTToUTC(emp.leaveDate);
            if (utcDate) {
              updates.leaveDate = utcDate;
              needUpdate = true;
              console.log(`    퇴사일: ${originalDate.toISOString()} → ${utcDate.toISOString()}`);
            }
          }
        } catch (e) {
          // 변환 실패 시 무시
        }
      }

      if (needUpdate) {
        await employeesCollection.updateOne(
          { _id: emp._id },
          { $set: updates }
        );
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`\n✅ 완료: ${updatedCount}건 변환, ${skippedCount}건 스킵\n`);

    // Leave 컬렉션
    const leavesCollection = db.collection('leaves');

    console.log('='.repeat(60));
    console.log('2️⃣ Leave (연차 신청) 마이그레이션 - KST → UTC');
    console.log('='.repeat(60));

    const leaves = await leavesCollection.find({}).toArray();
    console.log(`총 ${leaves.length}건의 연차 데이터 발견`);

    let leaveUpdatedCount = 0;
    let leaveSkippedCount = 0;

    for (const leave of leaves) {
      const updates = {};
      let needUpdate = false;

      // startDate 변환 (UTC 15:00 → UTC 00:00)
      if (leave.startDate) {
        const utcDate = convertKSTToUTC(leave.startDate);
        if (utcDate) {
          updates.startDate = utcDate;
          needUpdate = true;
          console.log(`  ${leave.employeeId} (${leave.employeeName})`);
          console.log(`    시작일: ${new Date(leave.startDate).toISOString()} → ${utcDate.toISOString()}`);
        }
      }

      // endDate 변환 (UTC 15:00 → UTC 00:00)
      if (leave.endDate) {
        const utcDate = convertKSTToUTC(leave.endDate);
        if (utcDate) {
          updates.endDate = utcDate;
          needUpdate = true;
          console.log(`    종료일: ${new Date(leave.endDate).toISOString()} → ${utcDate.toISOString()}`);
        }
      }

      if (needUpdate) {
        await leavesCollection.updateOne(
          { _id: leave._id },
          { $set: updates }
        );
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
