const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');

async function testAllModels() {
  try {
    const mongoURI =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      'mongodb://127.0.0.1:27017/busung_hr';
    console.log(
      '연결 시도:',
      mongoURI.includes('mongodb+srv') ? 'MongoDB Atlas' : 'Local MongoDB'
    );

    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB 연결 성공\n');

    const {
      Employee,
      Attendance,
      WorkLifeBalanceStats,
    } = require('./server/models');

    // 1. Employee 컬렉션 테스트
    console.log('1️⃣ Employee 컬렉션 테스트:');
    const empCount = await Employee.countDocuments();
    console.log(`   전체 직원 수: ${empCount}개`);
    const sampleEmp = await Employee.findOne();
    if (sampleEmp) {
      console.log(
        `   샘플 데이터: ${sampleEmp.name} (${sampleEmp.employeeId})`
      );
    }

    // 2. Attendance 컬렉션 테스트
    console.log('\n2️⃣ Attendance 컬렉션 테스트:');
    const attCount = await Attendance.countDocuments();
    console.log(`   전체 근태 기록: ${attCount}개`);
    const sampleAtt = await Attendance.findOne({ year: 2026, month: 1 });
    if (sampleAtt) {
      console.log(
        `   2026년 1월 샘플: ${sampleAtt.employeeId} - ${sampleAtt.year}/${sampleAtt.month}/${sampleAtt.day}`
      );
    }

    // 3. WorkLifeBalanceStats 컬렉션 테스트
    console.log('\n3️⃣ WorkLifeBalanceStats 컬렉션 테스트:');
    const wlbCount = await WorkLifeBalanceStats.countDocuments();
    console.log(`   전체 워라밸 기록: ${wlbCount}개`);

    const allWlb = await WorkLifeBalanceStats.find()
      .sort({ year: -1, month: -1 })
      .limit(3);
    if (allWlb.length > 0) {
      console.log('   최근 데이터:');
      allWlb.forEach((w) => {
        console.log(
          `   - ${w.year}년 ${w.month}월: 특근 ${w.averageOvertimeHours}h, 연차 ${w.leaveUsageRate}%`
        );
      });
    } else {
      console.log('   ⚠️ 데이터 없음 - 계산 필요');
    }

    // 4. 컬렉션 이름 확인
    console.log('\n4️⃣ 실제 DB 컬렉션 목록:');
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    const collectionNames = collections.map((c) => c.name);
    console.log('   ', collectionNames.join(', '));

    const wlbCollectionExists = collectionNames.some(
      (name) =>
        name.toLowerCase().includes('worklife') ||
        name.toLowerCase().includes('balance')
    );
    console.log(
      `\n   WorkLifeBalance 컬렉션 존재: ${wlbCollectionExists ? '✅' : '❌'}`
    );

    await mongoose.connection.close();
    console.log('\n✅ 테스트 완료');
  } catch (error) {
    console.error('\n❌ 오류:', error.message);
    console.error('Stack:', error.stack);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

testAllModels();
