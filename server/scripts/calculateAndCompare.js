const http = require('http');

/**
 * 워라밸 지표 계산 및 비교 스크립트
 * - API를 통해 재계산을 수행하고 결과를 출력
 */

const API_BASE_URL = 'http://localhost:5000/api';

// HTTP 요청 헬퍼 함수
function httpRequest(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 120000, // 2분 타임아웃
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            data: JSON.parse(data),
          };
          resolve(response);
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${data.substring(0, 100)}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function calculateAndShow(year, month) {
  console.log('\n' + '='.repeat(70));
  console.log(`📊 워라밸 지표 계산: ${year}년 ${month}월`);
  console.log('='.repeat(70));

  try {
    console.log('\n실시간으로 워라밸 지표 계산 중...');
    console.log('(최대 2분 소요될 수 있습니다)');

    const startTime = Date.now();
    const response = await httpRequest(
      `${API_BASE_URL}/worklife/calculate`,
      'POST',
      { year, month }
    );
    const duration = Date.now() - startTime;

    if (response.status === 200 && response.data.success) {
      const stats = response.data.data;

      console.log(`\n✅ 계산 완료! (소요 시간: ${duration}ms)`);
      console.log('\n' + '-'.repeat(70));
      console.log('📈 워라밸 지표 결과');
      console.log('-'.repeat(70));

      console.log(
        `\n1️⃣  평균 특근시간: ${stats.averageOvertimeHours.toFixed(2)}시간`
      );
      if (stats.details?.overtime) {
        console.log(
          `    - 총 직원 수: ${stats.details.overtime.totalEmployees}명`
        );
        console.log(
          `    - 총 특근시간: ${stats.details.overtime.totalOvertimeHours.toFixed(2)}시간`
        );
      }

      console.log(
        `\n2️⃣  연차 사용률: ${stats.leaveUsageRate.toFixed(2)}%`
      );
      if (stats.details?.leave) {
        console.log(
          `    - 총 직원 수: ${stats.details.leave.totalEmployees}명`
        );
        console.log(
          `    - 사용 연차: ${stats.details.leave.totalUsedLeave.toFixed(2)}일`
        );
        console.log(
          `    - 가용 연차: ${stats.details.leave.totalAvailableLeave}일`
        );
      }

      console.log(
        `\n3️⃣  주52시간 위반율: ${stats.weekly52HoursViolation.toFixed(2)}%`
      );
      if (stats.details?.violations) {
        console.log(
          `    - 총 직원 수: ${stats.details.violations.totalEmployees}명`
        );
        console.log(
          `    - 위반 직원: ${stats.details.violations.violatedEmployees}명`
        );
        console.log(
          `    - 위반 횟수: ${stats.details.violations.violationCount}회`
        );
      }

      console.log(`\n4️⃣  스트레스 지수: ${stats.stressIndex}점`);
      if (stats.details?.stress) {
        console.log(
          `    - 총 직원 수: ${stats.details.stress.totalEmployees}명`
        );
        console.log(
          `    - 고스트레스 (70점 이상): ${stats.details.stress.highStressCount}명`
        );
        console.log(
          `    - 중스트레스 (40-69점): ${stats.details.stress.mediumStressCount}명`
        );
        console.log(
          `    - 저스트레스 (40점 미만): ${stats.details.stress.lowStressCount}명`
        );
      }

      console.log('\n' + '-'.repeat(70));
      console.log('📝 메타 정보');
      console.log('-'.repeat(70));
      console.log(`계산 시간: ${stats.calculatedAt}`);
      console.log(`직원 수: ${stats.employeeCount}명`);
      console.log(
        `계산 소요 시간: ${stats.calculationDuration || duration}ms`
      );

      console.log('\n' + '='.repeat(70));
      console.log('✅ 워라밸 지표가 DB에 저장되었습니다!');
      console.log('대시보드에서 확인 가능합니다.');
      console.log('='.repeat(70) + '\n');
    } else {
      console.error('\n❌ 계산 실패');
      console.error('응답:', JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    console.error('서버가 실행 중인지 확인하세요.');
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length >= 2) {
    const year = parseInt(args[0]);
    const month = parseInt(args[1]);
    await calculateAndShow(year, month);
  } else {
    // 현재 월 계산
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    console.log(`\n💡 년도와 월을 지정하지 않았습니다.`);
    console.log(`   현재 월(${year}년 ${month}월)을 계산합니다.\n`);
    await calculateAndShow(year, month);
  }
}

if (require.main === module) {
  main();
}

module.exports = { calculateAndShow };
