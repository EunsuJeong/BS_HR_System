const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

const backupDir = path.join(__dirname, '..', 'backups');

// 백업 폴더가 없으면 에러
if (!fs.existsSync(backupDir)) {
  console.error('❌ 백업 폴더가 없습니다.');
  console.log('💡 먼저 npm run backup을 실행하세요.');
  process.exit(1);
}

// 백업 파일 목록 가져오기
const backups = fs
  .readdirSync(backupDir)
  .filter((file) => file.endsWith('.json'))
  .sort()
  .reverse();

if (backups.length === 0) {
  console.error('❌ 백업 파일이 없습니다.');
  console.log('💡 먼저 npm run backup을 실행하세요.');
  process.exit(1);
}

console.log('📦 사용 가능한 백업 목록:');
backups.forEach((backup, index) => {
  const stats = fs.statSync(path.join(backupDir, backup));
  const size = (stats.size / 1024).toFixed(2);
  console.log(`   ${index + 1}. ${backup} (${size} KB)`);
});
console.log('');

// 명령줄 인수로 백업 번호가 제공된 경우
const backupNumber = process.argv[2];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const processRestore = async (answer) => {
  const index = parseInt(answer) - 1;

  if (isNaN(index) || index < 0 || index >= backups.length) {
    console.error('❌ 잘못된 선택입니다.');
    rl.close();
    process.exit(1);
  }

  const selectedBackup = backups[index];
  const restorePath = path.join(backupDir, selectedBackup);

  console.log('');
  console.log(`🔄 백업 복원 시작: ${selectedBackup}`);
  console.log(`📁 복원 파일: ${restorePath}`);
  console.log('⚠️  기존 데이터가 삭제되고 덮어쓰여집니다!');

  const executeRestore = async (confirm) => {
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ 복원이 취소되었습니다.');
      rl.close();
      process.exit(0);
    }

    try {
      // MongoDB 연결 (busung_hr 데이터베이스 사용)
      const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
      await mongoose.connect(mongoUri);
      console.log('✅ MongoDB 연결 성공');
      console.log(`📂 데이터베이스: ${mongoose.connection.db.databaseName}`);

      // 백업 데이터 로드
      const backupData = JSON.parse(fs.readFileSync(restorePath, 'utf8'));
      const db = mongoose.connection.db;

      for (const collName of Object.keys(backupData)) {
        console.log(`📥 복원 중: ${collName}...`);

        // 기존 컬렉션 삭제
        try {
          await db.collection(collName).drop();
        } catch (err) {
          // 컬렉션이 없을 수 있음 (무시)
        }

        // 데이터 삽입
        const data = backupData[collName];
        if (data && data.length > 0) {
          // _id를 ObjectId로 변환 (문자열인 경우 Mongoose가 인식 가능하도록)
          const convertedData = data.map((doc) => {
            const newDoc = { ...doc };
            if (
              newDoc._id &&
              typeof newDoc._id === 'string' &&
              /^[a-fA-F0-9]{24}$/.test(newDoc._id)
            ) {
              newDoc._id = new mongoose.Types.ObjectId(newDoc._id);
            }
            return newDoc;
          });
          await db.collection(collName).insertMany(convertedData);
          console.log(`   ✓ ${data.length}건 복원`);
        }
      }

      console.log('');
      console.log('✅ MongoDB 복원 완료!');
      console.log('🔄 서버를 재시작하세요: npm start');

      await mongoose.connection.close();
      rl.close();
      process.exit(0);
    } catch (error) {
      console.error('❌ 복원 실패:', error.message);
      await mongoose.connection.close();
      rl.close();
      process.exit(1);
    }
  };

  // 명령줄 인수로 'yes'가 제공된 경우 바로 실행
  if (process.argv[3] && process.argv[3].toLowerCase() === 'yes') {
    await executeRestore('yes');
  } else {
    rl.question('계속하시겠습니까? (yes/no): ', executeRestore);
  }
};

// 명령줄 인수가 제공된 경우 바로 실행
if (backupNumber) {
  processRestore(backupNumber);
} else {
  rl.question('복원할 백업 번호를 선택하세요 (최신: 1): ', processRestore);
}
