// 로컬에서 MongoDB Atlas에 직접 계약형태 텍스트 변경
const mongoose = require('mongoose');
require('dotenv').config();

async function migrateLocalDB() {
  try {
    console.log('🔧 프로덕션 MongoDB 연결 중...');

    // 프로덕션 MongoDB 연결 (MONGO_URI 사용)
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ MongoDB 연결 성공\n');

    // 연결 후 모델 정의
    const employeeSchema = new mongoose.Schema(
      {
        contractType: String,
      },
      { collection: 'employees', strict: false }
    );

    const Employee = mongoose.model('Employee', employeeSchema);

    console.log('🚀 계약형태 텍스트 변경 마이그레이션 시작...\n');

    const employees = await Employee.find({});
    console.log(`   총 ${employees.length}명의 직원 발견`);

    // '정규직' -> '정규'
    const result1 = await Employee.updateMany(
      { contractType: '정규직' },
      { $set: { contractType: '정규' } }
    );

    // '계약직' -> '계약'
    const result2 = await Employee.updateMany(
      { contractType: '계약직' },
      { $set: { contractType: '계약' } }
    );

    // '촉탁직' -> '촉탁'
    const result3 = await Employee.updateMany(
      { contractType: '촉탁직' },
      { $set: { contractType: '촉탁' } }
    );

    const totalUpdated =
      result1.modifiedCount + result2.modifiedCount + result3.modifiedCount;

    console.log(`\n✅ 마이그레이션 완료: ${totalUpdated}명 업데이트됨`);
    console.log(`   - 정규직 -> 정규: ${result1.modifiedCount}명`);
    console.log(`   - 계약직 -> 계약: ${result2.modifiedCount}명`);
    console.log(`   - 촉탁직 -> 촉탁: ${result3.modifiedCount}명`);

    await mongoose.disconnect();
    console.log('\n✅ MongoDB 연결 종료');
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error.message);
    process.exit(1);
  }
}

migrateLocalDB();
