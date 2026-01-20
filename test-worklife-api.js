const http = require('http');

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, data: data });
          }
        });
      })
      .on('error', reject);
  });
}

async function testAPIs() {
  console.log('🧪 API 테스트 시작...\n');

  try {
    // 1. 서버 상태 확인
    console.log('1️⃣ 서버 상태 확인:');
    const health = await httpGet('http://localhost:5000/api/health');
    console.log(`   ✅ 서버 정상: ${health.data.message}\n`);

    // 2. Employee API 테스트
    console.log('2️⃣ Employee API 테스트:');
    try {
      const empResponse = await httpGet(
        'http://localhost:5000/api/hr/employees'
      );
      console.log(`   ✅ 직원 수: ${empResponse.data.length}명\n`);
    } catch (err) {
      console.log(`   ❌ Employee API 오류: ${err.message}\n`);
    }

    // 3. WorkLifeBalance API 테스트 (2025년 12월)
    console.log('3️⃣ WorkLifeBalance API 테스트 (2025년 12월):');
    try {
      const wlbResponse = await httpGet(
        'http://localhost:5000/api/worklife/stats/2025/12'
      );
      if (wlbResponse.status === 200) {
        console.log('   ✅ 응답 성공:');
        console.log(JSON.stringify(wlbResponse.data, null, 2));
      } else {
        console.log(`   ❌ 오류 (${wlbResponse.status}):`, wlbResponse.data);
      }
    } catch (err) {
      console.log(`   ❌ 오류: ${err.message}`);
    }

    // 4. WorkLifeBalance API 테스트 (2026년 1월)
    console.log('\n4️⃣ WorkLifeBalance API 테스트 (2026년 1월):');
    try {
      const wlbResponse = await httpGet(
        'http://localhost:5000/api/worklife/stats/2026/1'
      );
      if (wlbResponse.status === 200) {
        console.log('   ✅ 응답 성공:');
        console.log(JSON.stringify(wlbResponse.data, null, 2));
      } else {
        console.log(`   ❌ 오류 (${wlbResponse.status}):`, wlbResponse.data);
      }
    } catch (err) {
      console.log(`   ❌ 오류: ${err.message}`);
    }

    // 5. Current Stats API 테스트
    console.log('\n5️⃣ Current Stats API 테스트:');
    try {
      const currentResponse = await httpGet(
        'http://localhost:5000/api/worklife/stats/current'
      );
      if (currentResponse.status === 200) {
        console.log('   ✅ 응답 성공:');
        console.log(JSON.stringify(currentResponse.data, null, 2));
      } else {
        console.log(
          `   ❌ 오류 (${currentResponse.status}):`,
          currentResponse.data
        );
      }
    } catch (err) {
      console.log(`   ❌ 오류: ${err.message}`);
    }
  } catch (error) {
    console.error('테스트 실패:', error.message);
  }
}

testAPIs();
