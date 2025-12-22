/**
 * 대체공휴일을 schedules 컬렉션에 추가하는 스크립트
 */
const mongoose = require('mongoose');
require('dotenv').config();

const Schedule = require('../models/system/schedules');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/busung_hr';

// 대체공휴일 데이터 (2020-2069)
const SUBSTITUTE_HOLIDAYS = {
  2025: [
    { date: '2025-05-06', name: '어린이날 대체공휴일', holidayType: 'substitute' },
    { date: '2025-10-08', name: '추석 대체공휴일', holidayType: 'substitute' },
  ],
  2024: [
    { date: '2024-02-12', name: '설날 대체공휴일', holidayType: 'substitute' },
  ],
  2023: [
    { date: '2023-01-24', name: '설날 대체공휴일', holidayType: 'substitute' },
    { date: '2023-05-29', name: '부처님오신날 대체공휴일', holidayType: 'substitute' },
  ],
  2022: [
    { date: '2022-03-09', name: '대통령선거일 (임시공휴일)', holidayType: 'temporary' },
  ],
  2021: [],
  2020: [],
};

async function addSubstituteHolidays() {
  try {
    console.log(`🔌 MongoDB 연결 중: ${MONGO_URI}\n`);
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB 연결 성공\n');

    // 기존 대체공휴일 확인
    const existingSubstitutes = await Schedule.find({
      type: '공휴일',
      holidayType: 'substitute'
    });
    console.log(`📊 기존 대체공휴일: ${existingSubstitutes.length}건\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    console.log('🔄 대체공휴일 추가 중...\n');

    for (const [yearStr, holidays] of Object.entries(SUBSTITUTE_HOLIDAYS)) {
      const year = parseInt(yearStr);

      for (const holiday of holidays) {
        try {
          // 이미 존재하는지 확인
          const existing = await Schedule.findOne({
            date: holiday.date,
            type: '공휴일'
          });

          if (existing) {
            console.log(`⏭️  이미 존재: ${holiday.date} - ${holiday.name}`);
            skipCount++;
            continue;
          }

          // 새로 추가
          await Schedule.create({
            title: holiday.name,
            date: holiday.date,
            type: '공휴일',
            description: `대체공휴일: ${holiday.name}`,
            year: year,
            holidayType: holiday.holidayType,
            isDeleted: false,
            isCustom: false,
            createdAt: new Date(),
          });

          console.log(`✅ 추가 완료: ${holiday.date} - ${holiday.name}`);
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`❌ 추가 실패 (${holiday.date}):`, error.message);
        }
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ 대체공휴일 추가 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`추가 성공       : ${successCount}건`);
    console.log(`이미 존재       : ${skipCount}건`);
    console.log(`오류 발생       : ${errorCount}건`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 2025년 공휴일 샘플 표시
    const sample2025 = await Schedule.find({
      type: '공휴일',
      year: 2025,
    }).sort({ date: 1 });

    console.log('📅 2025년 공휴일 목록 (schedules 컬렉션):');
    sample2025.forEach((s) => {
      const typeLabel = s.holidayType === 'substitute' ? '[대체]' :
                        s.holidayType === 'temporary' ? '[임시]' :
                        s.holidayType === 'lunar' ? '[음력]' : '[양력]';
      console.log(`   ${s.date} ${typeLabel} ${s.title}`);
    });

    console.log('\n✅ 작업 완료!');
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 MongoDB 연결 종료');
    process.exit(0);
  }
}

addSubstituteHolidays();
