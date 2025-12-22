/**
 * 공휴일 데이터를 holidays 컬렉션에서 schedules 컬렉션으로 마이그레이션
 */
const mongoose = require('mongoose');
require('dotenv').config();

const Holiday = require('../models/system/holidays');
const Schedule = require('../models/system/schedules');

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/busung_hr';

async function migrateHolidaysToSchedules() {
  try {
    console.log(`🔌 MongoDB 연결 중: ${MONGODB_URI}\n`);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 연결 성공\n');

    // 1. holidays 컬렉션에서 모든 공휴일 가져오기
    const holidays = await Holiday.find({ isDeleted: false }).lean();
    console.log(`📊 마이그레이션 대상 공휴일: ${holidays.length}건\n`);

    if (holidays.length === 0) {
      console.log('⚠️  마이그레이션할 공휴일이 없습니다.');
      return;
    }

    console.log('🔄 schedules 컬렉션으로 마이그레이션 중...\n');

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < holidays.length; i++) {
      const holiday = holidays[i];

      try {
        // schedules 컬렉션에 이미 존재하는지 확인
        const existing = await Schedule.findOne({
          date: holiday.date,
          type: '공휴일',
        });

        if (existing) {
          skipCount++;
          continue;
        }

        // schedules 컬렉션에 추가
        await Schedule.create({
          title: holiday.name,
          date: holiday.date,
          type: '공휴일',
          description: `공휴일: ${holiday.name}`,
          year: holiday.year,
          holidayType: holiday.type,
          isDeleted: holiday.isDeleted || false,
          isCustom: holiday.isCustom || false,
          createdAt: holiday.createdAt || new Date(),
        });

        successCount++;

        if ((i + 1) % 100 === 0) {
          console.log(`✅ ${i + 1}건 처리 완료...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ 마이그레이션 실패 (${holiday.date}):`, error.message);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ 마이그레이션 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`마이그레이션 성공 : ${successCount}건`);
    console.log(`이미 존재      : ${skipCount}건`);
    console.log(`오류 발생      : ${errorCount}건`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 통계 확인
    const totalSchedules = await Schedule.countDocuments();
    const holidaySchedules = await Schedule.countDocuments({ type: '공휴일' });
    const regularSchedules = await Schedule.countDocuments({
      type: { $ne: '공휴일' },
    });

    console.log('📊 schedules 컬렉션 통계:');
    console.log(`   전체 일정         : ${totalSchedules}건`);
    console.log(`   공휴일           : ${holidaySchedules}건`);
    console.log(`   일반 일정        : ${regularSchedules}건\n`);

    // 2025년 샘플 표시
    const sample2025 = await Schedule.find({
      type: '공휴일',
      year: 2025,
    })
      .sort({ date: 1 })
      .limit(10);

    console.log('📅 2025년 공휴일 샘플 (schedules 컬렉션):');
    sample2025.forEach((s) => {
      console.log(`   ${s.date} : ${s.title}`);
    });

    console.log('\n✅ 마이그레이션 완료!');
    console.log(
      '\n💡 이제 holidays 컬렉션은 백업용으로만 유지하고, schedules 컬렉션을 사용하세요.'
    );
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 MongoDB 연결 종료');
    process.exit(0);
  }
}

migrateHolidaysToSchedules();
