// ===============================================
// 🧪 Self-Ping 테스트 스크립트
// ===============================================

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const https = require('https');
const http = require('http');

// 테스트할 URL (로컬 또는 Railway)
const BACKEND_URL = process.env.RAILWAY_STATIC_URL
  || process.env.BACKEND_URL
  || 'http://localhost:5000';

console.log('\n========================================');
console.log('🧪 Self-Ping 테스트');
console.log('========================================');
console.log(`📍 대상 URL: ${BACKEND_URL}`);
console.log(`🌍 환경: ${process.env.NODE_ENV || 'development'}`);
console.log('========================================\n');

/**
 * Self-ping 실행 (테스트용 - 환경 체크 없음)
 */
function testSelfPing() {
  return new Promise((resolve, reject) => {
    const url = `${BACKEND_URL}/api/system/health`;
    const protocol = url.startsWith('https') ? https : http;

    console.log(`🔄 Self-ping 시작: ${url}`);
    const startTime = Date.now();

    const req = protocol.get(url, (res) => {
      const duration = Date.now() - startTime;

      console.log(`✅ Self-ping 성공!`);
      console.log(`   - 상태 코드: ${res.statusCode}`);
      console.log(`   - 응답 시간: ${duration}ms`);

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`   - DB 상태: ${response.database || 'N/A'}`);
          console.log(`   - 서버 시간: ${response.timestamp || 'N/A'}`);
          console.log('\n📊 응답 데이터:');
          console.log(JSON.stringify(response, null, 2));
          resolve(response);
        } catch (e) {
          console.log(`   - 응답 데이터: ${data}`);
          resolve(data);
        }
      });
    });

    req.on('error', (err) => {
      console.error(`❌ Self-ping 실패!`);
      console.error(`   - 에러: ${err.message}`);
      console.error(`   - 코드: ${err.code}`);
      reject(err);
    });

    req.setTimeout(30000, () => {
      console.error(`❌ Self-ping 타임아웃 (30초 초과)`);
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// 테스트 실행
console.log('⏳ 테스트 시작...\n');

testSelfPing()
  .then(() => {
    console.log('\n========================================');
    console.log('✅ Self-Ping 테스트 성공!');
    console.log('========================================');
    process.exit(0);
  })
  .catch((err) => {
    console.log('\n========================================');
    console.log('❌ Self-Ping 테스트 실패!');
    console.log('========================================');
    console.error('에러 상세:', err);
    process.exit(1);
  });
