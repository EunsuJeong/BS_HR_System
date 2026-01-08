// 삭제 대상 데이터만 별도 백업 후 삭제
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function deleteAndBackup() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB 연결 성공\n');

    const db = mongoose.connection.db;

    // 삭제 대상 조건
    const query = {
      type: '연차',
      startDate: new Date('2026-01-01T15:00:00.000Z'),
      status: '승인',
    };

    console.log('🔍 삭제 대상 조회 중...');
    const targetData = await db.collection('leaves').find(query).toArray();

    console.log(`📊 삭제 대상 데이터: ${targetData.length}개\n`);

    if (targetData.length === 0) {
      console.log('⚠️ 삭제할 데이터가 없습니다.');
      await mongoose.connection.close();
      return;
    }

    // 백업 파일 생성
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, -5);
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupFile = path.join(backupDir, `deleted_leaves_${timestamp}.json`);

    const backup = {
      deletedAt: new Date().toISOString(),
      query: {
        type: '연차',
        startDate: '2026-01-01T15:00:00.000Z',
        status: '승인',
      },
      count: targetData.length,
      data: targetData,
    };

    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2), 'utf8');
    console.log(`💾 삭제 대상 백업 완료: ${backupFile}\n`);

    // 삭제 실행
    console.log('🗑️  데이터 삭제 중...');
    const result = await db.collection('leaves').deleteMany(query);

    console.log('');
    console.log('✅ 삭제 완료!');
    console.log(`   삭제된 문서 수: ${result.deletedCount}개`);
    console.log(`   백업 파일: ${backupFile}`);
    console.log('');
    console.log('💡 복구 방법:');
    console.log('   node restore-deleted-leaves.js');

    await mongoose.connection.close();
    console.log('\n✅ MongoDB 연결 종료');
  } catch (error) {
    console.error('❌ 오류:', error.message);
    process.exit(1);
  }
}

deleteAndBackup();
