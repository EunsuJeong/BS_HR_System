const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB 연결
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-management';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Employee = require('./server/models/Employee');

async function migrateUsedLeave() {
  try {
    console.log('🔄 usedLeave 데이터 마이그레이션 시작...');

    // 모든 직원 조회
    const employees = await Employee.find({});
    console.log(`📊 총 ${employees.length}명의 직원 데이터 발견`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const emp of employees) {
      // annualLeave.used 값이 있으면 usedLeave로 복사
      if (emp.annualLeave && emp.annualLeave.used !== undefined) {
        emp.usedLeave = emp.annualLeave.used;
        await emp.save();
        console.log(`✅ ${emp.name} (${emp.employeeId}): usedLeave = ${emp.usedLeave}`);
        updatedCount++;
      } else {
        // annualLeave.used 값이 없으면 0으로 설정
        emp.usedLeave = 0;
        await emp.save();
        console.log(`⚠️  ${emp.name} (${emp.employeeId}): annualLeave.used 없음, usedLeave = 0으로 설정`);
        skippedCount++;
      }
    }

    console.log('\n✅ 마이그레이션 완료!');
    console.log(`📊 업데이트: ${updatedCount}명`);
    console.log(`📊 기본값 설정: ${skippedCount}명`);
    console.log(`📊 총 처리: ${updatedCount + skippedCount}명`);

    process.exit(0);
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  }
}

// 스크립트 실행
migrateUsedLeave();
