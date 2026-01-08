// leaves 컬렉션만 백업하는 스크립트
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 백업 디렉토리 생성
const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// 현재 날짜/시간으로 백업 파일명 생성
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const backupFile = path.join(backupDir, `leaves_backup_${timestamp}.json`);

console.log('🔄 leaves 컬렉션 백업 시작...');
console.log(`📁 백업 파일: ${backupFile}`);

async function backupLeaves() {
  try {
    // MongoDB 연결
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB 연결 성공');
    console.log(`📂 데이터베이스: ${mongoose.connection.db.databaseName}`);

    const db = mongoose.connection.db;

    // leaves 컬렉션 백업
    console.log('📦 leaves 컬렉션 백업 중...');
    const leavesData = await db.collection('leaves').find({}).toArray();

    const backup = {
      collection: 'leaves',
      timestamp: new Date().toISOString(),
      count: leavesData.length,
      data: leavesData,
    };

    // JSON 파일로 저장
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2), 'utf8');

    console.log('');
    console.log('✅ leaves 컬렉션 백업 완료!');
    console.log(`📦 백업 파일: ${backupFile}`);
    console.log(`📊 총 문서 수: ${leavesData.length}`);
    console.log('');

    await mongoose.connection.close();
    console.log('✅ MongoDB 연결 종료');
  } catch (error) {
    console.error('❌ 백업 실패:', error.message);
    console.error(error);
    process.exit(1);
  }
}

backupLeaves();
