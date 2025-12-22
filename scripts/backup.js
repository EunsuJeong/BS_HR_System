const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 백업 디렉토리 생성
const backupDir = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// 현재 날짜/시간으로 백업 파일명 생성
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const backupFile = path.join(backupDir, `backup_${timestamp}.json`);

console.log('🔄 MongoDB 백업 시작...');
console.log(`📁 백업 파일: ${backupFile}`);

async function backupDatabase() {
  try {
    // MongoDB 연결 (busung_hr 데이터베이스 사용)
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB 연결 성공');
    console.log(`📂 데이터베이스: ${mongoose.connection.db.databaseName}`);

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    const backup = {};

    for (const collInfo of collections) {
      const collName = collInfo.name;
      console.log(`📦 백업 중: ${collName}...`);
      const data = await db.collection(collName).find({}).toArray();
      backup[collName] = data;
    }

    // JSON 파일로 저장
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2), 'utf8');

    console.log('');
    console.log('✅ MongoDB 백업 완료!');
    console.log(`📦 백업 파일: ${backupFile}`);
    console.log(`📊 컬렉션 수: ${collections.length}`);
    console.log('');
    console.log('💡 복원 방법:');
    console.log(`   npm run restore`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 백업 실패:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

backupDatabase();
