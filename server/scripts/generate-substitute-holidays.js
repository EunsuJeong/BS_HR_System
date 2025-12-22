/**
 * 2020-2070년 대체공휴일 자동 생성 스크립트
 *
 * 대체공휴일 규칙:
 * - 공휴일이 일요일인 경우: 다음 월요일이 대체공휴일
 * - 공휴일이 토요일인 경우: 다음 월요일이 대체공휴일 (2022년부터)
 * - 설날/추석 연휴와 겹치는 경우: 연휴 다음 첫 평일이 대체공휴일
 */

const mongoose = require('mongoose');
const LunarCalendar = require('korean-lunar-calendar');
require('dotenv').config();

const Schedule = require('../models/system/schedules');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/busung_hr';

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

/**
 * 음력을 양력으로 변환
 */
function lunarToSolar(year, month, day) {
  try {
    const lunar = new LunarCalendar();
    lunar.setLunarDate(year, month, day, false);
    const result = lunar.getSolarCalendar();

    if (!result || !result.year) {
      return null;
    }

    return new Date(result.year, result.month - 1, result.day);
  } catch (error) {
    console.error(`❌ 음력 변환 오류: ${year}년 ${month}월 ${day}일`, error.message);
    return null;
  }
}

/**
 * 요일 확인 (0: 일요일, 6: 토요일)
 */
function getDayOfWeek(dateStr) {
  const date = new Date(dateStr);
  return date.getDay();
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
  return `${year}-${month}-${day}`;
}

/**
 * 날짜를 문자열로 변환
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 설날 연휴 날짜 가져오기 (전날, 당일, 다음날)
 */
function getSeollalDates(year) {
  const seollal = lunarToSolar(year, 1, 1);
  if (!seollal) return [];

  const dates = [];
  for (let i = -1; i <= 1; i++) {
    const date = new Date(seollal);
    date.setDate(date.getDate() + i);
    dates.push(formatDate(date));
  }
  return dates;
}

/**
 * 추석 연휴 날짜 가져오기 (전날, 당일, 다음날)
 */
function getChuseokDates(year) {
  const chuseok = lunarToSolar(year, 8, 15);
  if (!chuseok) return [];

  const dates = [];
  for (let i = -1; i <= 1; i++) {
    const date = new Date(chuseok);
    date.setDate(date.getDate() + i);
    dates.push(formatDate(date));
  }
  return dates;
}

/**
 * 부처님오신날 날짜 가져오기
 */
function getBuddhaBirthdayDate(year) {
  const date = lunarToSolar(year, 4, 8);
  return date ? formatDate(date) : null;
}

/**
 * 특정 연도의 모든 공휴일 날짜 가져오기
 */
function getAllHolidayDates(year) {
  const holidays = new Set();

  // 양력 공휴일
  SOLAR_HOLIDAYS.forEach(h => {
    const dateStr = `${year}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`;
    holidays.add(dateStr);
  });

  // 설날 연휴
  getSeollalDates(year).forEach(d => holidays.add(d));

  // 추석 연휴
  getChuseokDates(year).forEach(d => holidays.add(d));

  // 부처님오신날
  const buddha = getBuddhaBirthdayDate(year);
  if (buddha) holidays.add(buddha);

  return holidays;
}

/**
 * 대체공휴일 계산
 */
function calculateSubstituteHolidays(year) {
  const substitutes = [];
  const allHolidays = getAllHolidayDates(year);

  // 2022년부터 토요일도 대체공휴일 적용
  const applyForSaturday = year >= 2022;

  // 양력 공휴일 대체공휴일 계산
  for (const holiday of SOLAR_HOLIDAYS) {
    const dateStr = `${year}-${String(holiday.month).padStart(2, '0')}-${String(holiday.day).padStart(2, '0')}`;
    const dayOfWeek = getDayOfWeek(dateStr);

    let substituteDate = null;
    let reason = '';

    if (dayOfWeek === 0) {
      // 일요일 -> 다음 월요일
      substituteDate = addDays(dateStr, 1);
      reason = `${holiday.name}이(가) 일요일`;
    } else if (dayOfWeek === 6 && applyForSaturday) {
      // 토요일 -> 다음 월요일 (2022년부터)
      substituteDate = addDays(dateStr, 2);
      reason = `${holiday.name}이(가) 토요일`;
    }

    // 대체공휴일이 다른 공휴일과 겹치는지 확인
    if (substituteDate && allHolidays.has(substituteDate)) {
      // 겹치면 다음 평일로 이동
      let checkDate = substituteDate;
      let daysAdded = 0;
      while (allHolidays.has(checkDate) && daysAdded < 7) {
        checkDate = addDays(checkDate, 1);
        daysAdded++;
      }
      if (daysAdded < 7) {
        substituteDate = checkDate;
      } else {
        substituteDate = null; // 안전장치
      }
    }

    if (substituteDate) {
      substitutes.push({
        date: substituteDate,
        name: `${holiday.name} 대체공휴일`,
        originalDate: dateStr,
        reason: reason,
      });
    }
  }

  // 음력 공휴일 대체공휴일 계산
  const processLunarHoliday = (holidayDates, holidayName) => {
    if (holidayDates.length === 0) return;

    // 연휴 중 일요일이 있는지 확인
    let sundayCount = 0;
    let saturdayCount = 0;

    holidayDates.forEach(dateStr => {
      const dayOfWeek = getDayOfWeek(dateStr);
      if (dayOfWeek === 0) sundayCount++;
      if (dayOfWeek === 6) saturdayCount++;
    });

    // 대체공휴일 추가
    let substituteDaysNeeded = 0;
    if (applyForSaturday) {
      substituteDaysNeeded = sundayCount + saturdayCount;
    } else {
      substituteDaysNeeded = sundayCount;
    }

    if (substituteDaysNeeded > 0) {
      // 연휴 마지막 날 다음부터 대체공휴일 추가
      const lastHolidayDate = holidayDates[holidayDates.length - 1];
      let substituteDate = addDays(lastHolidayDate, 1);

      for (let i = 0; i < substituteDaysNeeded; i++) {
        // 다른 공휴일과 겹치지 않는 날짜 찾기
        while (allHolidays.has(substituteDate)) {
          substituteDate = addDays(substituteDate, 1);
        }

        substitutes.push({
          date: substituteDate,
          name: `${holidayName} 대체공휴일`,
          originalDate: lastHolidayDate,
          reason: `${holidayName} 연휴 중 주말`,
        });

        substituteDate = addDays(substituteDate, 1);
      }
    }
  };

  // 설날 대체공휴일
  processLunarHoliday(getSeollalDates(year), '설날');

  // 추석 대체공휴일
  processLunarHoliday(getChuseokDates(year), '추석');

  // 부처님오신날 대체공휴일
  const buddhaDate = getBuddhaBirthdayDate(year);
  if (buddhaDate) {
    const dayOfWeek = getDayOfWeek(buddhaDate);
    let substituteDate = null;

    if (dayOfWeek === 0) {
      substituteDate = addDays(buddhaDate, 1);
    } else if (dayOfWeek === 6 && applyForSaturday) {
      substituteDate = addDays(buddhaDate, 2);
    }

    if (substituteDate && allHolidays.has(substituteDate)) {
      let checkDate = substituteDate;
      let daysAdded = 0;
      while (allHolidays.has(checkDate) && daysAdded < 7) {
        checkDate = addDays(checkDate, 1);
        daysAdded++;
      }
      if (daysAdded < 7) {
        substituteDate = checkDate;
      } else {
        substituteDate = null;
      }
    }

    if (substituteDate) {
      substitutes.push({
        date: substituteDate,
        name: '부처님오신날 대체공휴일',
        originalDate: buddhaDate,
        reason: '부처님오신날이 주말',
      });
    }
  }

  return substitutes;
}

/**
 * 메인 실행 함수
 */
async function generateSubstituteHolidays() {
  try {
    console.log(`🔌 MongoDB 연결 중: ${MONGO_URI}\n`);
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB 연결 성공\n');

    const startYear = 2020;
    const endYear = 2070;

    console.log(`📅 ${startYear}년 ~ ${endYear}년 대체공휴일 계산 중...\n`);

    let totalCount = 0;
    let successCount = 0;
    let skipCount = 0;

    for (let year = startYear; year <= endYear; year++) {
      const substitutes = calculateSubstituteHolidays(year);

      console.log(`\n${year}년: ${substitutes.length}건의 대체공휴일`);

      for (const sub of substitutes) {
        totalCount++;

        try {
          // 이미 존재하는지 확인
          const existing = await Schedule.findOne({
            date: sub.date,
            type: '공휴일',
          });

          if (existing) {
            console.log(`⏭️  이미 존재: ${sub.date} - ${sub.name}`);
            skipCount++;
            continue;
          }

          // 새로 추가
          await Schedule.create({
            title: sub.name,
            date: sub.date,
            type: '공휴일',
            description: `${sub.reason}에 따른 대체공휴일`,
            year: parseInt(sub.date.split('-')[0]),
            holidayType: 'substitute',
            isDeleted: false,
            isCustom: false,
            createdAt: new Date(),
          });

          console.log(`✅ ${sub.date} - ${sub.name} (원일: ${sub.originalDate})`);
          successCount++;
        } catch (error) {
          console.error(`❌ 추가 실패 (${sub.date}):`, error.message);
        }
      }

      if (year % 10 === 0) {
        console.log(`\n━━ ${year}년까지 완료 (총 ${totalCount}건 처리) ━━`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ 대체공휴일 생성 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`총 처리        : ${totalCount}건`);
    console.log(`추가 성공      : ${successCount}건`);
    console.log(`이미 존재      : ${skipCount}건`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 샘플 출력
    console.log('📅 2025년 대체공휴일 샘플:');
    const sample2025 = await Schedule.find({
      type: '공휴일',
      year: 2025,
      holidayType: 'substitute',
    }).sort({ date: 1 });

    sample2025.forEach(s => {
      console.log(`   ${s.date} - ${s.title}`);
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

generateSubstituteHolidays();
