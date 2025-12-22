/**
 * 양력 공휴일 초기화 스크립트
 * - 신정, 삼일절, 어린이날, 현충일, 광복절, 개천절, 한글날, 성탄절 등
 */
const mongoose = require('mongoose');
require('dotenv').config();

const Holiday = require('../models/system/holidays');

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/busung_hr';

// 양력 공휴일 정의 (매년 고정)
const SOLAR_HOLIDAYS = [
  { month: 1, day: 1, name: '신정' },
  { month: 3, day: 1, name: '삼일절' },
  { month: 5, day: 5, name: '어린이날' },
  { month: 6, day: 6, name: '현충일' },
  { month: 8, day: 15, name: '광복절' },
  { month: 10, day: 3, name: '개천절' },
  { month: 10, day: 9, name: '한글날' },
  { month: 12, day: 25, name: '성탄절' },
];

// 특정 연도의 임시공휴일 및 대체공휴일
const SPECIAL_HOLIDAYS = {
  2025: [
    { date: '2025-05-06', name: '어린이날 대체공휴일', type: 'substitute' },
    { date: '2025-10-08', name: '추석 대체공휴일', type: 'substitute' },
  ],
  2024: [
    { date: '2024-02-12', name: '설날 대체공휴일', type: 'substitute' },
    { date: '2024-04-10', name: '22대 국회의원 선거일', type: 'temporary' },
  ],
  2023: [
    { date: '2023-01-24', name: '설날 대체공휴일', type: 'substitute' },
    { date: '2023-05-29', name: '부처님오신날 대체공휴일', type: 'substitute' },
  ],
};

async function initSolarHolidays() {
  try {
    console.log(`🔌 MongoDB 연결 중: ${MONGODB_URI}\n`);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 연결 성공\n');

    // 기존 양력 공휴일 조회
    const existing = await Holiday.find({ type: 'solar' });
    console.log(`📊 기존 양력 공휴일: ${existing.length}건\n`);

    const startYear = 2020;
    const endYear = 2069;
    const holidays = [];

    console.log(`📅 ${startYear}년 ~ ${endYear}년 양력 공휴일 생성 중...\n`);

    // 양력 공휴일 생성
    for (let year = startYear; year <= endYear; year++) {
      for (const holiday of SOLAR_HOLIDAYS) {
        const date = `${year}-${String(holiday.month).padStart(
          2,
          '0'
        )}-${String(holiday.day).padStart(2, '0')}`;

        holidays.push({
          year,
          date,
          name: holiday.name,
          type: 'solar',
          isDeleted: false,
          isCustom: false,
        });
      }

      // 특정 연도의 특별 공휴일 추가
      if (SPECIAL_HOLIDAYS[year]) {
        for (const special of SPECIAL_HOLIDAYS[year]) {
          holidays.push({
            year,
            date: special.date,
            name: special.name,
            type: special.type,
            isDeleted: false,
            isCustom: false,
          });
        }
      }

      if ((year - startYear + 1) % 10 === 0) {
        console.log(`✅ ${year}년까지 완료 (누적: ${holidays.length}건)`);
      }
    }

    console.log(`\n🎉 총 ${holidays.length}건 양력 공휴일 생성 완료!\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 생성 통계');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`총 공휴일 수    : ${holidays.length}건`);
    console.log(
      `연평균         : ${(holidays.length / (endYear - startYear + 1)).toFixed(
        1
      )}건`
    );
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 2025년 샘플 표시
    const sample2025 = holidays.filter((h) => h.year === 2025);
    console.log('📅 2025년 양력 공휴일 샘플:');
    sample2025.forEach((h) => {
      console.log(`   ${h.date} : ${h.name}`);
    });

    // 데이터베이스 저장
    console.log('\n💾 데이터베이스 저장 중...\n');

    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (let i = 0; i < holidays.length; i++) {
      try {
        await Holiday.findOneAndUpdate(
          { year: holidays[i].year, date: holidays[i].date },
          holidays[i],
          { upsert: true, new: true }
        );
        successCount++;

        if ((i + 1) % 50 === 0) {
          console.log(`✅ ${i + 1}건 저장 완료...`);
        }
      } catch (error) {
        if (error.code === 11000) {
          duplicateCount++;
        } else {
          errorCount++;
          console.error(`❌ 저장 실패 (${holidays[i].date}):`, error.message);
        }
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ 저장 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`저장 성공       : ${successCount}건`);
    console.log(`중복 건너뜀     : ${duplicateCount}건`);
    console.log(`오류 발생       : ${errorCount}건`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 전체 통계
    const allHolidays = await Holiday.countDocuments();
    const solarCount = await Holiday.countDocuments({ type: 'solar' });
    const lunarCount = await Holiday.countDocuments({ type: 'lunar' });
    const substituteCount = await Holiday.countDocuments({
      type: 'substitute',
    });
    const temporaryCount = await Holiday.countDocuments({ type: 'temporary' });

    console.log('📊 전체 공휴일 통계:');
    console.log(`   전체              : ${allHolidays}건`);
    console.log(`   양력              : ${solarCount}건`);
    console.log(`   음력              : ${lunarCount}건`);
    console.log(`   대체공휴일        : ${substituteCount}건`);
    console.log(`   임시공휴일        : ${temporaryCount}건`);

    console.log('\n✅ 작업 완료!');
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 MongoDB 연결 종료');
    process.exit(0);
  }
}

initSolarHolidays();
