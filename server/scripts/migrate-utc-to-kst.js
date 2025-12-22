/**
 * UTC 00:00 데이터를 KST로 변환
 *
 * 변환:
 * - 2019-10-14T00:00:00.000Z (UTC 00:00)
 *   → 2019-10-13T15:00:00.000Z (KST 2019-10-14 00:00)
 *
 * 목표: 입력값 = 표시값, DB는 KST 기준
 * - 입력: 2019-10-14
 * - DB: 2019-10-13T15:00:00.000Z (KST 2019-10-14 00:00)
 * - 표시: 2019-10-14
 */

const mongoose = require('mongoose');

// 시간대 설정
process.env.TZ = 'Asia/Seoul';

const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/busung_hr';

// UTC 00:00 데이터를 KST 00:00으로 변환
const convertUTCToKST = (utcDate) => {
  if (!utcDate) return null;

  const d = new Date(utcDate);
  const utcHours = d.getUTCHours();

  // UTC 00:00인 경우만 변환
  if (utcHours === 0) {
    // UTC 날짜에서 YYYY-MM-DD 추출
    const dateStr = d.toISOString().split('T')[0];
    const [year, month, day] = dateStr.split('-').map(Number);

    // 해당 날짜를 KST 00:00:00으로 설정 (로컬 타임)
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  // 이미 KST로 저장된 데이터(UTC 15:00)는 스킵
  if (utcHours === 15) {
    return null; // 변환 불필요
  }

  return null; // 다른 시간대는 변환하지 않음
};

async function migrateData() {
  try {
    console.log('🕐 시간대:', process.env.TZ);
    console.log('📡 MongoDB 연결 중...');
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB 연결 성공\n');

    const db = mongoose.connection.db;
    const employeesCollection = db.collection('employees');

    console.log('='.repeat(60));
    console.log('1️⃣ Employee (직원 정보) 마이그레이션 - UTC → KST');
    console.log('='.repeat(60));

    const employees = await employeesCollection.find({}).toArray();
    console.log(`총 ${employees.length}건의 직원 데이터 발견`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const emp of employees) {
      const updates = {};
      let needUpdate = false;

      // joinDate 변환 (UTC 00:00 → KST)
      if (emp.joinDate) {
        const kstDate = convertUTCToKST(emp.joinDate);
        if (kstDate) {
          updates.joinDate = kstDate;
          needUpdate = true;
          console.log(`  ${emp.employeeId} (${emp.name})`);
          console.log(`    입사일: ${new Date(emp.joinDate).toISOString()} → ${kstDate.toISOString()}`);
        }
      }

      // leaveDate 변환 (UTC 00:00 → KST)
      if (emp.leaveDate) {
        try {
          const originalDate = new Date(emp.leaveDate);
          if (!isNaN(originalDate.getTime()) && originalDate.getTime() > new Date('2000-01-01').getTime()) {
            const kstDate = convertUTCToKST(emp.leaveDate);
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
    console.log('2️⃣ Leave (연차 신청) 마이그레이션 - UTC → KST');
    console.log('='.repeat(60));

    const leaves = await leavesCollection.find({}).toArray();
    console.log(`총 ${leaves.length}건의 연차 데이터 발견`);

    let leaveUpdatedCount = 0;
    let leaveSkippedCount = 0;

    for (const leave of leaves) {
      const updates = {};
      let needUpdate = false;

      // startDate 변환 (UTC 00:00 → KST)
      if (leave.startDate) {
        const kstDate = convertUTCToKST(leave.startDate);
        if (kstDate) {
          updates.startDate = kstDate;
          needUpdate = true;
          console.log(`  ${leave.employeeId} (${leave.employeeName})`);
          console.log(`    시작일: ${new Date(leave.startDate).toISOString()} → ${kstDate.toISOString()}`);
        }
      }

      // endDate 변환 (UTC 00:00 → KST)
      if (leave.endDate) {
        const kstDate = convertUTCToKST(leave.endDate);
        if (kstDate) {
          updates.endDate = kstDate;
          needUpdate = true;
          console.log(`    종료일: ${new Date(leave.endDate).toISOString()} → ${kstDate.toISOString()}`);
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
