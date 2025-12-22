/**
 * 기존 UTC 날짜 데이터를 한국 시간(KST) 기준으로 마이그레이션
 *
 * 변환 방식:
 * - UTC 2024-12-02T00:00:00.000Z → 날짜 "2024-12-02" 추출
 * - "2024-12-02"를 KST 00:00:00으로 해석
 * - DB에 저장 시 UTC로 변환: 2024-12-01T15:00:00.000Z
 */

const mongoose = require('mongoose');

// 시간대 설정
process.env.TZ = 'Asia/Seoul';

const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/busung_hr';

// UTC Date를 KST 날짜로 변환 (날짜는 유지)
// 예: 2019-10-14T00:00:00.000Z (UTC) → 날짜 "2019-10-14" 유지 → KST 00:00으로 재설정
const convertUTCtoKST = (utcDate) => {
  if (!utcDate) return null;

  // 1. UTC 날짜에서 YYYY-MM-DD 추출 (이 날짜를 유지해야 함)
  const dateStr = utcDate.toISOString().split('T')[0];
  const [year, month, day] = dateStr.split('-').map(Number);

  // 2. 추출한 날짜를 KST 00:00:00으로 설정
  // (로컬 시간대가 Asia/Seoul이므로 new Date()는 KST 기준)
  // DB에 저장될 때: 2019-10-14 00:00 KST = 2019-10-13 15:00 UTC
  return new Date(year, month - 1, day, 0, 0, 0, 0);
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

      // joinDate 변환 (UTC 날짜를 KST로)
      if (emp.joinDate) {
        const originalDate = new Date(emp.joinDate);
        const kstDate = convertUTCtoKST(originalDate);

        // 날짜가 실제로 달라졌는지 확인
        if (originalDate.getTime() !== kstDate.getTime()) {
          updates.joinDate = kstDate;
          needUpdate = true;

          console.log(`  ${emp.employeeId} (${emp.name})`);
          console.log(`    입사일: ${originalDate.toISOString()} → ${kstDate.toISOString()}`);
          console.log(`    표시: ${originalDate.toISOString().split('T')[0]} → ${kstDate.toISOString().split('T')[0]}`);
        }
      }

      // leaveDate 변환 (퇴사일이 있고 유효한 경우만)
      if (emp.leaveDate) {
        try {
          const originalDate = new Date(emp.leaveDate);
          // 유효한 날짜이고 2000년 이후인 경우만 변환
          if (!isNaN(originalDate.getTime()) && originalDate.getTime() > new Date('2000-01-01').getTime()) {
            const kstDate = convertUTCtoKST(originalDate);

            if (originalDate.getTime() !== kstDate.getTime()) {
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

      // startDate 변환
      if (leave.startDate) {
        const originalDate = new Date(leave.startDate);
        const kstDate = convertUTCtoKST(originalDate);

        if (originalDate.getTime() !== kstDate.getTime()) {
          updates.startDate = kstDate;
          needUpdate = true;

          console.log(`  ${leave.employeeId} (${leave.employeeName})`);
          console.log(`    시작일: ${originalDate.toISOString()} → ${kstDate.toISOString()}`);
        }
      }

      // endDate 변환
      if (leave.endDate) {
        const originalDate = new Date(leave.endDate);
        const kstDate = convertUTCtoKST(originalDate);

        if (originalDate.getTime() !== kstDate.getTime()) {
          updates.endDate = kstDate;
          needUpdate = true;

          console.log(`    종료일: ${originalDate.toISOString()} → ${kstDate.toISOString()}`);
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
    console.log(`직원 정보: ${updatedCount}건 변환`);
    console.log(`연차 신청: ${leaveUpdatedCount}건 변환`);
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
