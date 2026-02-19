const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

function pad2(value) {
  return String(value).padStart(2, '0');
}

const now = new Date();
const year = String(now.getFullYear());
const month = pad2(now.getMonth() + 1);
const day = pad2(now.getDate());

// 백업 디렉토리 생성 (년/월 단위)
const backupDir = path.join('D:/BS_HR_System/backups', year, month);
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// 파일명: YYYY_MM_DD.json
const backupFile = path.join(backupDir, `${year}_${month}_${day}.json`);

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
