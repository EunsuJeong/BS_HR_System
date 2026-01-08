// Railway 프로덕션 환경에서 contractType 마이그레이션 실행
const https = require('https');

const RAILWAY_URL = 'https://bshrsystem-production.up.railway.app';

async function runMigration() {
  console.log(
    '🚀 Railway 프로덕션 환경에서 contractType 마이그레이션 시작...\n'
  );

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'bshrsystem-production.up.railway.app',
      path: '/api/hr/migrate-contract-type',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          console.log('📥 서버 응답:', data);
          const responseData = JSON.parse(data);

          if (responseData.success) {
            console.log('✅ 마이그레이션 성공!');
            console.log(
              `   - 업데이트된 직원 수: ${responseData.updatedCount}명`
            );
            console.log(`   - 전체 직원 수: ${responseData.totalEmployees}명`);
            console.log(`   - 메시지: ${responseData.message}\n`);
            resolve(responseData);
          } else {
            console.error('❌ 마이그레이션 실패:', responseData.error);
            reject(new Error(responseData.error));
          }
        } catch (error) {
          console.error('❌ 응답 파싱 오류:', error.message);
          console.error('   응답 내용:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ 네트워크 오류:', error.message);
      console.error('\n💡 확인 사항:');
      console.error('   1. Railway 백엔드가 정상 동작 중인지 확인');
      console.error('   2. Railway URL이 올바른지 확인');
      console.error('   3. 인터넷 연결 상태 확인');
      reject(error);
    });

    req.end();
  });
}

runMigration().catch(console.error);
