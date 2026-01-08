// 삭제된 leaves 데이터 복구 스크립트
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function restoreDeletedLeaves() {
  try {
    // 가장 최근 백업 파일 찾기
    const backupDir = path.join(__dirname, 'backups');
    const files = fs
      .readdirSync(backupDir)
      .filter((f) => f.startsWith('deleted_leaves_'))
      .sort()
      .reverse();

    if (files.length === 0) {
      console.log('❌ 복구할 백업 파일이 없습니다.');
      return;
    }

    console.log('📁 백업 파일 목록:');
    files.forEach((file, index) => {
      console.log(`   [${index + 1}] ${file}`);
    });
    console.log('');

    // 가장 최근 파일 사용
    const latestFile = files[0];
    const backupFile = path.join(backupDir, latestFile);

    console.log(`🔄 복구할 파일: ${latestFile}\n`);

    // 백업 파일 읽기
    const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

    console.log(`📊 복구 정보:`);
    console.log(`   삭제 시간: ${backup.deletedAt}`);
    console.log(`   문서 수: ${backup.count}개`);
    console.log(`   조건: ${JSON.stringify(backup.query, null, 2)}`);
    console.log('');

    // MongoDB 연결
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB 연결 성공\n');

    const db = mongoose.connection.db;

    // 데이터 복구 (insertMany)
    console.log('🔄 데이터 복구 중...');
    const result = await db.collection('leaves').insertMany(backup.data);

    console.log('');
    console.log('✅ 복구 완료!');
    console.log(`   복구된 문서 수: ${result.insertedCount}개`);
    console.log('');

    await mongoose.connection.close();
    console.log('✅ MongoDB 연결 종료');
  } catch (error) {
    console.error('❌ 복구 실패:', error.message);
    if (error.code === 11000) {
      console.error('⚠️ 중복된 _id가 있습니다. 이미 복구되었을 수 있습니다.');
    }
    process.exit(1);
  }
}

restoreDeletedLeaves();
