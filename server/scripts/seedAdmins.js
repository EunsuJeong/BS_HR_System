/**
 * 기존 하드코딩된 관리자 데이터를 MongoDB에 저장하는 스크립트
 * 실행 방법: node server/scripts/seedAdmins.js
 */

const mongoose = require('mongoose');
const Admin = require('../models/hr/admins');

// MongoDB 연결
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/busung_hr';

const adminData = [
  {
    adminId: '관리자01',
    name: '관리자01',
    password: '0301',
    phone: '010-1234-5678',
    department: '대표',
    position: '대표',
    joinDate: new Date('2023-01-01'),
    status: '재직',
    address: '경기도 안산시',
  },
  {
    adminId: '관리자02',
    name: '관리자02',
    password: '0302',
    phone: '010-1234-5678',
    department: '영업팀',
    position: '부장',
    joinDate: new Date('2023-01-01'),
    status: '재직',
    address: '경기도 안산시',
  },
  {
    adminId: '관리자03',
    name: '관리자03',
    password: '0303',
    phone: '010-1234-5678',
    department: '관리팀',
    position: '이사',
    joinDate: new Date('2023-01-01'),
    status: '재직',
    address: '경기도 안산시',
  },
  {
    adminId: '관리자04',
    name: '관리자04',
    password: '0304',
    phone: '010-1234-5678',
    department: '관리팀',
    position: '이사',
    joinDate: new Date('2023-01-01'),
    status: '재직',
    address: '경기도 안산시',
  },
  {
    adminId: '관리자05',
    name: '관리자05',
    password: '0305',
    phone: '010-1234-5678',
    department: '관리팀',
    position: '이사',
    joinDate: new Date('2023-01-01'),
    status: '재직',
    address: '경기도 안산시',
  },
];

async function seedAdmins() {
  try {
    console.log('🔄 MongoDB 연결 중...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB 연결 성공!');

    // 기존 관리자 데이터 확인
    const existingCount = await Admin.countDocuments();
    console.log(`📊 기존 관리자 데이터 개수: ${existingCount}`);

    if (existingCount > 0) {
      console.log('⚠️  기존 관리자 데이터가 존재합니다.');
      console.log('🗑️  기존 데이터를 삭제하고 새로 저장하시겠습니까? (y/n)');

      // 일단 삭제하고 진행 (운영환경에서는 확인 필요)
      console.log('🗑️  기존 데이터 삭제 중...');
      await Admin.deleteMany({});
      console.log('✅ 기존 데이터 삭제 완료');
    }

    // 관리자 데이터 저장
    console.log('📝 관리자 데이터 저장 중...');
    const result = await Admin.insertMany(adminData);
    console.log(`✅ 관리자 ${result.length}명 저장 완료!`);

    // 저장된 데이터 확인
    const admins = await Admin.find({});
    console.log('\n📋 저장된 관리자 목록:');
    admins.forEach((admin, index) => {
      console.log(`  ${index + 1}. ${admin.name} (${admin.adminId}) - ${admin.department} ${admin.position}`);
    });

    console.log('\n✅ 관리자 데이터 시딩 완료!');
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB 연결 종료');
    process.exit(0);
  }
}

// 스크립트 실행
seedAdmins();
