// ===============================================
// ⏰ BS HR System - 독립 스케줄러 프로세스
// 메인 서버(server.js)와 분리 실행 → 이벤트 루프 간섭 없음
// ===============================================

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

process.env.TZ = 'Asia/Seoul';
console.log('🕐 [스케줄러] 시간대:', process.env.TZ);
console.log('🕐 [스케줄러] 현재 시간:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));

const mongoose = require('mongoose');
const { startBackupScheduler } = require('./utils/backupScheduler');
const { startExcelBackupScheduler } = require('./utils/excelBackupScheduler');
const { startAnnualLeaveScheduler } = require('./utils/annualLeaveScheduler');

// io 미사용 (Socket.io 비활성화 상태)
const io = { emit: () => {}, on: () => {} };

const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/busung_hr';

mongoose
  .connect(mongoURI)
  .then(() => {
    console.log('✅ [스케줄러] MongoDB 연결 성공');

    startBackupScheduler();
    startExcelBackupScheduler();
    startAnnualLeaveScheduler(io);

    console.log('✅ [스케줄러] 모든 스케줄러 시작 완료');
    console.log('   - 연차 갱신: 매일 21:00 KST');
    console.log('   - JSON 백업: 매일 00:03 KST (보정 00:08)');
    console.log('   - Excel 백업: 매일 01:03 KST (보정 01:08)');
  })
  .catch((err) => {
    console.error('❌ [스케줄러] MongoDB 연결 실패:', err);
    process.exit(1);
  });

// 프로세스 유지 (스케줄러는 데몬으로 계속 실행)
process.on('SIGINT', async () => {
  console.log('🛑 [스케줄러] 종료 신호 수신, 정리 중...');
  await mongoose.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await mongoose.disconnect();
  process.exit(0);
});
