const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const Employee = require('./server/models/hr/employees');

async function testAPIResponse() {
  try {
    console.log('🔄 MongoDB 연결 중...');
    const mongoURI = process.env.MONGO_URI;
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB 연결 성공\n');

    // 직접 컬렉션에서 조회
    const employeesCollection = mongoose.connection.db.collection('employees');
    const employee = await employeesCollection.findOne({ employeeId: 'BS-189' });

    if (!employee) {
      console.log('❌ 리노를 찾을 수 없습니다.');
      return;
    }

    console.log('📊 DB에서 조회한 원본 데이터:');
    console.log(JSON.stringify(employee, null, 2));

    console.log('\n📤 API에서 반환할 데이터 (매핑 후):');
    // 백엔드 코드와 동일하게 매핑
    employee.usedLeave = employee.leaveUsed || 0;
    console.log(JSON.stringify(employee, null, 2));

    console.log('\n🔍 필드 확인:');
    console.log('- leaveUsed:', employee.leaveUsed);
    console.log('- usedLeave:', employee.usedLeave);

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

testAPIResponse();
