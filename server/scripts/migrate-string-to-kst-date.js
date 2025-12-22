/**
 * 문자열로 저장된 날짜를 Date 타입 + KST로 변환
 *
 * 변환:
 * - "2019-10-14T00:00:00.000Z" (문자열)
 *   → 날짜 "2019-10-14" 추출
 *   → KST 2019-10-14 00:00:00로 Date 객체 생성
 *   → DB 저장: 2019-10-13T15:00:00.000Z (Date 타입, UTC)
 */

const mongoose = require('mongoose');

// 시간대 설정
process.env.TZ = 'Asia/Seoul';

const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/busung_hr';

// 문자열 날짜를 KST Date로 변환
const stringToKSTDate = (dateStr) => {
  if (!dateStr) return null;

  // 문자열에서 YYYY-MM-DD 추출
  const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const [_, year, month, day] = match;

  // KST 00:00:00으로 Date 객체 생성
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0, 0);
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
    console.log('1️⃣ Employee (직원 정보) 마이그레이션');
    console.log('='.repeat(60));

    const employees = await employeesCollection.find({}).toArray();
    console.log(`총 ${employees.length}건의 직원 데이터 발견`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const emp of employees) {
      const updates = {};
      let needUpdate = false;

      // joinDate 처리
      if (emp.joinDate) {
        if (typeof emp.joinDate === 'string') {
          const kstDate = stringToKSTDate(emp.joinDate);
          if (kstDate) {
            updates.joinDate = kstDate;
            needUpdate = true;
            console.log(`  ${emp.employeeId} (${emp.name})`);
            console.log(`    입사일: "${emp.joinDate}" (문자열) → ${kstDate.toISOString()} (Date)`);
          }
        }
      }

      // leaveDate 처리
      if (emp.leaveDate) {
        if (typeof emp.leaveDate === 'string') {
          const kstDate = stringToKSTDate(emp.leaveDate);
          if (kstDate && kstDate.getTime() > new Date('2000-01-01').getTime()) {
            updates.leaveDate = kstDate;
            needUpdate = true;
            console.log(`    퇴사일: "${emp.leaveDate}" (문자열) → ${kstDate.toISOString()} (Date)`);
          }
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
    console.log('2️⃣ Leave (연차 신청) 마이그레이션');
    console.log('='.repeat(60));

    const leaves = await leavesCollection.find({}).toArray();
    console.log(`총 ${leaves.length}건의 연차 데이터 발견`);

    let leaveUpdatedCount = 0;
    let leaveSkippedCount = 0;

    for (const leave of leaves) {
      const updates = {};
      let needUpdate = false;

      // startDate 처리
      if (leave.startDate && typeof leave.startDate === 'string') {
        const kstDate = stringToKSTDate(leave.startDate);
        if (kstDate) {
          updates.startDate = kstDate;
          needUpdate = true;
          console.log(`  ${leave.employeeId} (${leave.employeeName})`);
          console.log(`    시작일: "${leave.startDate}" (문자열) → ${kstDate.toISOString()} (Date)`);
        }
      }

      // endDate 처리
      if (leave.endDate && typeof leave.endDate === 'string') {
        const kstDate = stringToKSTDate(leave.endDate);
        if (kstDate) {
          updates.endDate = kstDate;
          needUpdate = true;
          console.log(`    종료일: "${leave.endDate}" (문자열) → ${kstDate.toISOString()} (Date)`);
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
