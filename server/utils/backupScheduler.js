// ===============================================
// 🗄️ MongoDB 자동 백업 스케줄러
// ===============================================

const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// 백업 디렉토리 경로
const BACKUP_DIR = 'D:/BS_HR_System/backups';

// 백업 보관 기간 (일)
const BACKUP_RETENTION_DAYS = 15;

function pad2(value) {
  return String(value).padStart(2, '0');
}

/**
 * 백업 디렉토리 생성
 */
function ensureBackupDirectory() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log('📁 백업 디렉토리 생성:', BACKUP_DIR);
  }
}

/**
 * MongoDB 전체 백업 실행
 */
async function performBackup() {
  try {
    ensureBackupDirectory();

    const now = new Date();
    const year = String(now.getFullYear());
    const month = pad2(now.getMonth() + 1);
    const day = pad2(now.getDate());

    const monthlyDir = path.join(BACKUP_DIR, year, month);
    if (!fs.existsSync(monthlyDir)) {
      fs.mkdirSync(monthlyDir, { recursive: true });
    }

    const backupFileName = `${year}_${month}_${day}.json`;
    const backupFilePath = path.join(monthlyDir, backupFileName);

    console.log('🗄️ 백업 시작:', new Date().toLocaleString('ko-KR'));

    // 모든 컬렉션 가져오기
    const collections = await mongoose.connection.db.listCollections().toArray();
    const backupData = {};

    // 각 컬렉션의 데이터 백업
    for (const collection of collections) {
      const collectionName = collection.name;
      try {
        const data = await mongoose.connection.db
          .collection(collectionName)
          .find({})
          .toArray();
        backupData[collectionName] = data;
        console.log(`  ✅ ${collectionName}: ${data.length}건`);
      } catch (error) {
        console.error(`  ❌ ${collectionName} 백업 실패:`, error.message);
      }
    }

    // 백업 메타데이터 추가
    const backupMetadata = {
      timestamp: new Date().toISOString(),
      collections: Object.keys(backupData).length,
      totalDocuments: Object.values(backupData).reduce(
        (sum, arr) => sum + arr.length,
        0
      ),
    };

    const finalBackup = {
      metadata: backupMetadata,
      data: backupData,
    };

    // JSON 파일로 저장
    fs.writeFileSync(backupFilePath, JSON.stringify(finalBackup, null, 2));

    console.log('✅ 백업 완료:', backupFileName);
    console.log('📊 백업 정보:');
    console.log(`  - 컬렉션 수: ${backupMetadata.collections}`);
    console.log(`  - 총 문서 수: ${backupMetadata.totalDocuments}`);
    console.log(`  - 파일 크기: ${(fs.statSync(backupFilePath).size / 1024 / 1024).toFixed(2)} MB`);

    // 오래된 백업 파일 자동 삭제 비활성화
    // await deleteOldBackups();

    return true;
  } catch (error) {
    console.error('❌ 백업 실패:', error);
    return false;
  }
}

/**
 * 15일이 지난 백업 파일 자동 삭제
 */
async function deleteOldBackups() {
  // 자동 삭제 비활성화
  // try {
  //   const files = fs.readdirSync(BACKUP_DIR);
  //   const now = Date.now();
  //   const retentionPeriod = BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000; // 15일을 밀리초로 변환
  //
  //   let deletedCount = 0;
  //
  //   for (const file of files) {
  //     if (!file.startsWith('backup_') || !file.endsWith('.json')) {
  //       continue;
  //     }
  //
  //     const filePath = path.join(BACKUP_DIR, file);
  //     const stats = fs.statSync(filePath);
  //     const fileAge = now - stats.mtimeMs;
  //
  //     // 15일이 지난 파일 삭제
  //     if (fileAge > retentionPeriod) {
  //       fs.unlinkSync(filePath);
  //       deletedCount++;
  //       console.log(`🗑️ 오래된 백업 삭제: ${file}`);
  //     }
  //   }
  //
  //   if (deletedCount > 0) {
  //     console.log(`✅ ${deletedCount}개의 오래된 백업 파일 삭제 완료`);
  //   }
  // } catch (error) {
  //   console.error('❌ 오래된 백업 삭제 실패:', error);
  // }
}

/**
 * 백업 스케줄러 시작
 */
function startBackupScheduler() {
  // 매일 자정(00:00, KST) 자동 백업
  cron.schedule(
    '0 0 * * *',
    async () => {
      console.log('\n========================================');
      console.log('⏰ 예약된 백업 작업 시작 (매일 자정)');
      console.log('========================================');
      await performBackup();
    },
    {
      timezone: 'Asia/Seoul',
    }
  );

  console.log('✅ 자동 백업 스케줄러 시작됨 (매일 00:00 KST)');
  console.log('📁 백업 저장 경로:', BACKUP_DIR);
}

/**
 * 수동 백업 실행 (테스트용)
 */
async function manualBackup() {
  console.log('\n========================================');
  console.log('🔧 수동 백업 실행');
  console.log('========================================');
  return await performBackup();
}

module.exports = {
  startBackupScheduler,
  manualBackup,
  performBackup,
  deleteOldBackups,
};
