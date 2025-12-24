const cron = require('node-cron');
const https = require('https');
const http = require('http');

const BACKEND_URL = process.env.RAILWAY_STATIC_URL
  || process.env.BACKEND_URL
  || 'http://localhost:5000';

/**
 * Self-ping to prevent Railway sleep
 */
function performSelfPing() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('⏭️  Self-ping 스킵 (개발 환경)');
    return;
  }

  const url = `${BACKEND_URL}/api/system/health`;
  const protocol = url.startsWith('https') ? https : http;

  protocol.get(url, (res) => {
    console.log(`✅ Self-ping 성공: ${res.statusCode}`);
  }).on('error', (err) => {
    console.error('❌ Self-ping 실패:', err.message);
  });
}

/**
 * Self-ping 스케줄러 시작
 */
function startSelfPingScheduler() {
  // 매일 오전 5시(KST)에 self-ping 실행
  cron.schedule('0 5 * * *', () => {
    console.log('\n========================================');
    console.log('⏰ Self-ping 시작 (Railway sleep 방지)');
    console.log('========================================');
    performSelfPing();
  }, {
    timezone: 'Asia/Seoul'
  });

  console.log('✅ Self-ping 스케줄러 시작됨 (매일 오전 5시 KST)');
}

module.exports = {
  startSelfPingScheduler,
  performSelfPing,
};
