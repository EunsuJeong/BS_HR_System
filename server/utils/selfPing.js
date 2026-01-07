const cron = require('node-cron');
const https = require('https');
const http = require('http');

const BACKEND_URL = process.env.BACKEND_URL;

/**
 * Self-ping to prevent Railway sleep
 * Windows PC + PM2: IS_INTERNAL_SERVER=true 시 비활성화 (항상 온라인)
 */
function performSelfPing() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('⏭️  Self-ping 스킵 (개발 환경)');
    return;
  }

  // Windows PC 사내 서버(IS_INTERNAL_SERVER=true)에서는 self-ping 불필요
  // Railway에서는 이 환경변수가 없으므로 self-ping 계속 작동
  if (process.env.IS_INTERNAL_SERVER === 'true') {
    console.log('⏭️  Self-ping 스킵 (사내 PC 서버 - 항상 온라인)');
    return;
  }

  if (!BACKEND_URL) {
    console.log('⏭️  Self-ping 스킵 (BACKEND_URL 미설정)');
    return;
  }
  const url = `${BACKEND_URL}/api/system/health`;
  const protocol = url.startsWith('https') ? https : http;

  protocol
    .get(url, (res) => {
      console.log(`✅ Self-ping 성공: ${res.statusCode}`);
    })
    .on('error', (err) => {
      console.error('❌ Self-ping 실패:', err.message);
    });
}

/**
 * Self-ping 스케줄러 시작
 */
function startSelfPingScheduler() {
  // 사내 PC 서버에서는 스케줄러 비활성화
  if (process.env.IS_INTERNAL_SERVER === 'true') {
    console.log('⏭️  Self-ping 스케줄러 비활성화 (사내 PC 서버)');
    return;
  }
  // 매일 오전 5시(KST)에 self-ping 실행
  cron.schedule(
    '0 5 * * *',
    () => {
      console.log('\n========================================');
      console.log('⏰ Self-ping 시작');
      console.log('========================================');
      performSelfPing();
    },
    {
      timezone: 'Asia/Seoul',
    }
  );

  console.log('✅ Self-ping 스케줄러 시작됨 (매일 오전 5시 KST)');
}

module.exports = {
  startSelfPingScheduler,
  performSelfPing,
};
