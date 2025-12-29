// ===============================================
// 🗑️ 유령 일정 정리 스크립트
// ===============================================

require('dotenv').config();
const mongoose = require('mongoose');
const { Schedule } = require('../server/models');

async function cleanupGhostSchedules() {
  try {
    console.log('🗑️ 유령 일정 정리 시작...\n');

    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 연결 성공\n');

    // 1️⃣ isDeleted가 true인 일정 찾기
    const deletedSchedules = await Schedule.find({ isDeleted: true });
    console.log(`📊 삭제 플래그가 설정된 일정: ${deletedSchedules.length}건`);

    if (deletedSchedules.length > 0) {
      console.log('\n🔍 삭제 대상 일정:');
      deletedSchedules.forEach((schedule, index) => {
        console.log(`  ${index + 1}. [${schedule.type}] ${schedule.title} (${schedule.date})`);
      });

      // 하드 삭제 실행
      const result = await Schedule.deleteMany({ isDeleted: true });
      console.log(`\n✅ ${result.deletedCount}건의 유령 일정 영구 삭제 완료`);
    } else {
      console.log('✨ 유령 일정이 없습니다. 정리 작업이 필요하지 않습니다.');
    }

    // 2️⃣ 현재 활성 일정 통계
    const activeSchedules = await Schedule.find({
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false }
      ]
    });

    console.log(`\n📈 정리 후 활성 일정: ${activeSchedules.length}건`);

    const typeCounts = activeSchedules.reduce((acc, schedule) => {
      acc[schedule.type] = (acc[schedule.type] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📋 일정 유형별 현황:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}건`);
    });

    console.log('\n✅ 유령 일정 정리 완료!');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB 연결 종료');
  }
}

cleanupGhostSchedules();
