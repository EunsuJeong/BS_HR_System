/**
 * MongoDB 마이그레이션 스크립트
 * 모든 직원에게 contractType 필드 추가 (기본값: 정규직)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Employee = require('../models/hr/employees');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hr_system';

async function addContractTypeField() {
  try {
    console.log('🔌 MongoDB 연결 중...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 연결 완료');

    console.log('\n📊 기존 직원 데이터 확인 중...');
    const employees = await Employee.find({});
    console.log(`   총 ${employees.length}명의 직원 발견`);

    console.log('\n🔧 contractType 필드 추가 중...');
    const result = await Employee.updateMany(
      { contractType: { $exists: false } }, // contractType이 없는 문서만
      { $set: { contractType: '정규직' } }  // 기본값으로 '정규직' 설정
    );

    console.log(`✅ 업데이트 완료: ${result.modifiedCount}명의 직원 데이터 수정됨`);

    // 결과 확인
    console.log('\n📋 업데이트 결과 확인:');
    const updatedEmployees = await Employee.find({}).limit(5);
    updatedEmployees.forEach((emp, idx) => {
      console.log(`   ${idx + 1}. ${emp.name} (${emp.employeeId}): ${emp.contractType}`);
    });

    if (employees.length > 5) {
      console.log(`   ... 외 ${employees.length - 5}명`);
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB 연결 종료');
    process.exit(0);
  }
}

// 스크립트 실행
console.log('='.repeat(60));
console.log('📝 계약형태 필드 추가 마이그레이션 스크립트');
console.log('='.repeat(60));
addContractTypeField();
