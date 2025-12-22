/**
 * 공휴일 데이터를 hr_system에서 busung_hr로 이동하는 스크립트
 *
 * 실행 방법: node server/scripts/move-holidays.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function moveHolidays() {
  try {
    // 소스 DB 연결 (hr_system)
    const sourceConnection = await mongoose
      .createConnection('mongodb://localhost:27017/hr_system')
      .asPromise();
    console.log('✅ 소스 DB 연결 성공 (hr_system)');

    // 타겟 DB 연결 (busung_hr)
    const targetConnection = await mongoose
      .createConnection(
        process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/busung_hr'
      )
      .asPromise();
    console.log('✅ 타겟 DB 연결 성공 (busung_hr)');

    // Holiday 스키마
    const holidaySchema = new mongoose.Schema({
      year: Number,
      date: String,
      name: String,
      type: String,
      isDeleted: Boolean,
      isCustom: Boolean,
      createdAt: Date,
      lastModified: Date,
    });

    const SourceHoliday = sourceConnection.model(
      'Holiday',
      holidaySchema,
      'holidays'
    );
    const TargetHoliday = targetConnection.model(
      'Holiday',
      holidaySchema,
      'holidays'
    );

    // 소스에서 데이터 읽기
    console.log('\n📖 hr_system에서 공휴일 데이터 읽는 중...');
    const holidays = await SourceHoliday.find({}).lean();
    console.log(`✅ ${holidays.length}건 발견`);

    if (holidays.length === 0) {
      console.log('⚠️ 이동할 데이터가 없습니다.');
      await sourceConnection.close();
      await targetConnection.close();
      return;
    }

    // 타겟 DB에 기존 데이터 확인
    const existingCount = await TargetHoliday.countDocuments();
    console.log(`\n📊 busung_hr의 기존 공휴일 데이터: ${existingCount}건`);

    if (existingCount > 0) {
      console.log('\n⚠️ busung_hr에 이미 공휴일 데이터가 존재합니다.');
      console.log('기존 데이터를 삭제하고 이동하시겠습니까? (Y/N)');

      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      return new Promise((resolve) => {
        readline.question('입력: ', async (answer) => {
          if (answer.toUpperCase() === 'Y') {
            console.log('\n🗑️ busung_hr의 기존 데이터 삭제 중...');
            await TargetHoliday.deleteMany({});
            console.log('✅ 삭제 완료\n');

            await performMove(
              SourceHoliday,
              TargetHoliday,
              holidays,
              sourceConnection,
              targetConnection
            );
          } else {
            console.log('\n❌ 작업 취소됨');
          }
          readline.close();
          await sourceConnection.close();
          await targetConnection.close();
          resolve();
        });
      });
    } else {
      await performMove(
        SourceHoliday,
        TargetHoliday,
        holidays,
        sourceConnection,
        targetConnection
      );
      await sourceConnection.close();
      await targetConnection.close();
    }
  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    throw error;
  }
}

async function performMove(
  SourceHoliday,
  TargetHoliday,
  holidays,
  sourceConnection,
  targetConnection
) {
  console.log('💾 busung_hr로 데이터 복사 중...');

  const bulkOps = holidays.map((holiday) => ({
    insertOne: {
      document: {
        year: holiday.year,
        date: holiday.date,
        name: holiday.name,
        type: holiday.type || 'solar',
        isDeleted: holiday.isDeleted || false,
        isCustom: holiday.isCustom || false,
        createdAt: holiday.createdAt || new Date(),
        lastModified: new Date(),
      },
    },
  }));

  const result = await TargetHoliday.bulkWrite(bulkOps);

  console.log('\n✅ 이동 완료!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 총 이동: ${result.insertedCount}건`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 연도별 통계
  const yearStats = await TargetHoliday.aggregate([
    { $match: { isDeleted: false } },
    { $group: { _id: '$year', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
    { $limit: 5 },
  ]);

  console.log('📈 busung_hr 연도별 공휴일 수 (샘플):');
  yearStats.forEach((stat) => {
    console.log(`   ${stat._id}년: ${stat.count}개`);
  });

  console.log('\n✨ 공휴일 데이터 이동 완료!');
  console.log('💡 hr_system의 데이터는 그대로 유지됩니다.');
  console.log('   (원하시면 MongoDB Compass에서 수동으로 삭제하세요)\n');
}

moveHolidays()
  .then(() => {
    console.log('👋 작업 완료\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
