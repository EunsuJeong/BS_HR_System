const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');

async function testWorkLifeDB() {
  try {
    // MongoDB 연결
    const mongoURI =
      process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/busung_hr';
    console.log('📡 MongoDB URI:', mongoURI.replace(/:[^:@]+@/, ':****@')); // 비밀번호 마스킹

    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB 연결 성공\n');

    // WorkLifeBalanceStats 모델 로드
    const { WorkLifeBalanceStats } = require('./server/models');

    // 1. 전체 데이터 수 확인
    const totalCount = await WorkLifeBalanceStats.countDocuments();
    console.log(`📊 WorkLifeBalanceStats 전체 데이터 수: ${totalCount}개\n`);

    // 2. 최근 데이터 5개 조회
    const recentData = await WorkLifeBalanceStats.find()
      .sort({ year: -1, month: -1 })
      .limit(5);

    if (recentData.length > 0) {
      console.log('📈 최근 워라밸 지표 데이터:');
      recentData.forEach((data, index) => {
        console.log(`\n${index + 1}. ${data.year}년 ${data.month}월`);
        console.log(`   - 평균 특근시간: ${data.averageOvertimeHours}시간`);
        console.log(`   - 연차 사용률: ${data.leaveUsageRate}%`);
        console.log(`   - 주52시간 위반율: ${data.weekly52HoursViolation}%`);
        console.log(`   - 스트레스 지수: ${data.stressIndex}점`);
      });
    } else {
      console.log('⚠️ 데이터가 없습니다.');
    }

    // 3. 2026년 1월 데이터 확인
    console.log('\n🔍 2026년 1월 데이터 조회 시도...');
    const jan2026 = await WorkLifeBalanceStats.findOne({
      year: 2026,
      month: 1,
    });

    if (jan2026) {
      console.log('✅ 2026년 1월 데이터 있음:');
      console.log(`   - 평균 특근시간: ${jan2026.averageOvertimeHours}시간`);
      console.log(`   - 연차 사용률: ${jan2026.leaveUsageRate}%`);
      console.log(`   - 주52시간 위반율: ${jan2026.weekly52HoursViolation}%`);
      console.log(`   - 스트레스 지수: ${jan2026.stressIndex}점`);
    } else {
      console.log('❌ 2026년 1월 데이터 없음');
    }

    await mongoose.connection.close();
    console.log('\n✅ 테스트 완료');
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

testWorkLifeDB();
