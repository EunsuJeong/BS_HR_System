/**
 * 음력 공휴일 50년치 생성 스크립트
 * - 설날 (음력 1월 1일 전후 3일)
 * - 추석 (음력 8월 15일 전후 3일)
 * - 부처님오신날 (음력 4월 8일)
 */
const mongoose = require('mongoose');
const LunarCalendar = require('korean-lunar-calendar');
require('dotenv').config();

// Holiday 모델 정의
const holidaySchema = new mongoose.Schema(
  {
    year: { type: Number, required: true, index: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['solar', 'lunar', 'substitute', 'temporary'],
      default: 'solar',
    },
    isDeleted: { type: Boolean, default: false },
    isCustom: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'holidays',
  }
);

holidaySchema.index({ year: 1, date: 1 }, { unique: true });
holidaySchema.index({ date: 1 });
holidaySchema.index({ type: 1 });

/**
 * 음력을 양력으로 변환
 */
function lunarToSolar(year, month, day) {
  try {
    const lunar = new LunarCalendar();
    lunar.setLunarDate(year, month, day, false); // 평달(false), 윤달(true)
    const result = lunar.getSolarCalendar();

    if (!result || !result.year) {
      console.warn(`⚠️  변환 실패: ${year}년 ${month}월 ${day}일`);
      return null;
    }

    const dateStr = `${result.year}-${String(result.month).padStart(
      2,
      '0'
    )}-${String(result.day).padStart(2, '0')}`;
    return { year: result.year, date: dateStr };
  } catch (error) {
    console.error(
      `❌ 음력 변환 오류: ${year}년 ${month}월 ${day}일`,
      error.message
    );
    return null;
  }
}

/**
 * 날짜에 일수 더하기
 */
function addDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return { year, date: `${year}-${month}-${day}` };
}

/**
 * 설날 공휴일 생성 (음력 1월 1일 전후 3일)
 */
function generateSeollal(year) {
  const holidays = [];

  // 음력 1월 1일 (설날 당일)
  const seollal = lunarToSolar(year, 1, 1);
  if (!seollal) return holidays;

  // 설날 전날
  const before = addDays(seollal.date, -1);
  holidays.push({
    year: before.year,
    date: before.date,
    name: '설날 연휴',
    type: 'lunar',
  });

  // 설날 당일
  holidays.push({
    year: seollal.year,
    date: seollal.date,
    name: '설날',
    type: 'lunar',
  });

  // 설날 다음날
  const after = addDays(seollal.date, 1);
  holidays.push({
    year: after.year,
    date: after.date,
    name: '설날 연휴',
    type: 'lunar',
  });

  return holidays;
}

/**
 * 추석 공휴일 생성 (음력 8월 15일 전후 3일)
 */
function generateChuseok(year) {
  const holidays = [];

  // 음력 8월 15일 (추석 당일)
  const chuseok = lunarToSolar(year, 8, 15);
  if (!chuseok) return holidays;

  // 추석 전날
  const before = addDays(chuseok.date, -1);
  holidays.push({
    year: before.year,
    date: before.date,
    name: '추석 연휴',
    type: 'lunar',
  });

  // 추석 당일
  holidays.push({
    year: chuseok.year,
    date: chuseok.date,
    name: '추석',
    type: 'lunar',
  });

  // 추석 다음날
  const after = addDays(chuseok.date, 1);
  holidays.push({
    year: after.year,
    date: after.date,
    name: '추석 연휴',
    type: 'lunar',
  });

  return holidays;
}

/**
 * 부처님오신날 생성 (음력 4월 8일)
 */
function generateBuddhaBirthday(year) {
  const buddha = lunarToSolar(year, 4, 8);
  if (!buddha) return [];

  return [
    {
      year: buddha.year,
      date: buddha.date,
      name: '부처님오신날',
      type: 'lunar',
    },
  ];
}

/**
 * 특정 연도의 모든 음력 공휴일 생성
 */
function generateYearLunarHolidays(year) {
  const holidays = [];

  holidays.push(...generateSeollal(year));
  holidays.push(...generateChuseok(year));
  holidays.push(...generateBuddhaBirthday(year));

  return holidays;
}

/**
 * 50년치 음력 공휴일 생성 (2020~2069)
 */
function generate50YearsLunarHolidays() {
  const startYear = 2020;
  const endYear = 2069;
  const allHolidays = [];

  console.log(`📅 ${startYear}년 ~ ${endYear}년 음력 공휴일 생성 중...\n`);

  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = generateYearLunarHolidays(year);
    allHolidays.push(...yearHolidays);

    if (year % 10 === 0) {
      console.log(`✅ ${year}년까지 완료 (누적: ${allHolidays.length}건)`);
    }
  }

  console.log(`\n🎉 총 ${allHolidays.length}건 음력 공휴일 생성 완료!\n`);
  return allHolidays;
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    // MongoDB 연결
    const dbUri =
      process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/busung_hr';
    console.log(`🔌 MongoDB 연결 중: ${dbUri}\n`);
    await mongoose.connect(dbUri);
    console.log('✅ MongoDB 연결 성공\n');

    // Holiday 모델 생성
    const Holiday =
      mongoose.models.Holiday || mongoose.model('Holiday', holidaySchema);

    // 기존 음력 공휴일 확인
    const existingCount = await Holiday.countDocuments({ type: 'lunar' });
    console.log(`📊 기존 음력 공휴일: ${existingCount}건\n`);

    if (existingCount > 0) {
      console.log('⚠️  이미 음력 공휴일이 저장되어 있습니다.');
      console.log('⚠️  기존 데이터를 삭제하고 새로 생성하시겠습니까?');
      console.log('⚠️  계속하려면 Ctrl+C로 취소 후 수동으로 삭제하세요.\n');
    }

    // 50년치 음력 공휴일 생성
    const lunarHolidays = generate50YearsLunarHolidays();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 생성 통계');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`총 공휴일 수    : ${lunarHolidays.length}건`);
    console.log(`연평균         : ${(lunarHolidays.length / 50).toFixed(1)}건`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // 샘플 출력 (2025년)
    console.log('📅 2025년 음력 공휴일 샘플:');
    const sample2025 = lunarHolidays
      .filter((h) => h.year === 2025)
      .sort((a, b) => a.date.localeCompare(b.date));
    sample2025.forEach((h) => {
      console.log(`   ${h.date} : ${h.name}`);
    });
    console.log('');

    // DB 저장
    console.log('💾 데이터베이스 저장 중...\n');

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const holiday of lunarHolidays) {
      try {
        await Holiday.findOneAndUpdate(
          { year: holiday.year, date: holiday.date },
          holiday,
          { upsert: true, new: true }
        );
        successCount++;

        if (successCount % 50 === 0) {
          console.log(`✅ ${successCount}건 저장 완료...`);
        }
      } catch (error) {
        if (error.code === 11000) {
          skipCount++;
        } else {
          errorCount++;
          console.error(
            `❌ 저장 실패: ${holiday.date} ${holiday.name}`,
            error.message
          );
        }
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ 저장 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`저장 성공       : ${successCount}건`);
    console.log(`중복 건너뜀     : ${skipCount}건`);
    console.log(`오류 발생       : ${errorCount}건`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // 최종 통계
    const finalStats = await Holiday.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    console.log('📊 전체 공휴일 통계:');
    finalStats.forEach((stat) => {
      const typeName =
        {
          solar: '양력',
          lunar: '음력',
          substitute: '대체공휴일',
          temporary: '임시공휴일',
        }[stat._id] || stat._id;
      console.log(`   ${typeName.padEnd(15)} : ${stat.count}건`);
    });
    console.log('');

    await mongoose.connection.close();
    console.log('✅ 작업 완료!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

// 실행
main();
