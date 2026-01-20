const http = require('http');

/**
 * API를 통한 워라밸 지표 검증 스크립트
 * - DB에 저장된 값 조회 후 재계산하여 비교
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
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function verifyWorkLifeBalance(year, month) {
  console.log('\n' + '='.repeat(70));
  console.log(`📊 워라밸 지표 DB 검증: ${year}년 ${month}월`);
  console.log('='.repeat(70));

  try {
    // 1. DB에서 저장된 값 조회
    console.log('\n[1단계] DB에서 저장된 값 조회 중...');
    let savedStats;
    try {
      const response = await httpRequest(
        `${API_BASE_URL}/worklife/stats/${year}/${month}`
      );
      console.log('   응답 상태:', response.status);
      console.log('   응답 데이터:', JSON.stringify(response.data, null, 2));
      savedStats = response.data.data || response.data;
      console.log('✅ DB 저장 값 조회 완료');
      if (savedStats.calculatedAt) {
        console.log(`   - 계산 시간: ${savedStats.calculatedAt}`);
        console.log(`   - 직원 수: ${savedStats.employeeCount}명`);
        console.log(
          `   - 계산 소요 시간: ${savedStats.calculationDuration || 'N/A'}ms`
        );
      }
    } catch (error) {
      if (error.status === 404 || error.message.includes('404')) {
        console.log(`❌ DB에 ${year}년 ${month}월 워라밸 지표가 없습니다.`);
        console.log('   먼저 계산을 수행해주세요.');
        return;
      }
      throw error;
    }

    // 2. 실시간으로 다시 계산 (수동 트리거)
    console.log('\n[2단계] 실시간으로 워라밸 지표 재계산 중...');
    const calcResponse = await httpRequest(
      `${API_BASE_URL}/worklife/calculate`,
      'POST',
      { year, month }
    );
    const freshStats = calcResponse.data.data;
    console.log('✅ 실시간 계산 완료');
    console.log(
      `   - 계산 소요 시간: ${freshStats.calculationDuration || 'N/A'}ms`
    );

    // 3. 값 비교
    console.log('\n[3단계] DB 저장값 vs 실시간 계산값 비교');
    console.log('-'.repeat(70));

    const comparisons = [
      {
        name: '평균 특근시간',
        unit: '시간',
        saved: savedStats.averageOvertimeHours,
        fresh: freshStats.averageOvertimeHours,
        decimals: 2,
      },
      {
        name: '연차 사용률',
        unit: '%',
        saved: savedStats.leaveUsageRate,
        fresh: freshStats.leaveUsageRate,
        decimals: 2,
      },
      {
        name: '주52시간 위반율',
        unit: '%',
        saved: savedStats.weekly52HoursViolation,
        fresh: freshStats.weekly52HoursViolation,
        decimals: 2,
      },
      {
        name: '스트레스 지수',
        unit: '점',
        saved: savedStats.stressIndex,
        fresh: freshStats.stressIndex,
        decimals: 0,
      },
    ];

    let hasDifference = false;
    const threshold = 0.01; // 오차 허용 범위

    comparisons.forEach((comp) => {
      const diff = Math.abs(comp.saved - comp.fresh);
      const isMatch = diff < threshold;
      const symbol = isMatch ? '✅' : '⚠️';

      console.log(`\n${symbol} ${comp.name}`);
      console.log(
        `   DB 저장값:    ${comp.saved.toFixed(comp.decimals)}${comp.unit}`
      );
      console.log(
        `   실시간 계산값: ${comp.fresh.toFixed(comp.decimals)}${comp.unit}`
      );
      console.log(
        `   차이:         ${diff.toFixed(comp.decimals)}${comp.unit}`
      );

      if (!isMatch) {
        hasDifference = true;
      }
    });

    // 4. 상세 통계 비교
    console.log('\n[4단계] 상세 통계 비교');
    console.log('-'.repeat(70));

    // 평균 특근시간 상세
    console.log('\n📌 평균 특근시간 상세:');
    console.log(
      `   총 직원 수 (DB):   ${savedStats.details?.overtime?.totalEmployees || 0}명`
    );
    console.log(
      `   총 직원 수 (계산): ${freshStats.details?.overtime?.totalEmployees || 0}명`
    );
    console.log(
      `   총 특근시간 (DB):   ${(
        savedStats.details?.overtime?.totalOvertimeHours || 0
      ).toFixed(2)}시간`
    );
    console.log(
      `   총 특근시간 (계산): ${(
        freshStats.details?.overtime?.totalOvertimeHours || 0
      ).toFixed(2)}시간`
    );

    // 연차 사용률 상세
    console.log('\n📌 연차 사용률 상세:');
    console.log(
      `   총 직원 수 (DB):       ${savedStats.details?.leave?.totalEmployees || 0}명`
    );
    console.log(
      `   총 직원 수 (계산):     ${freshStats.details?.leave?.totalEmployees || 0}명`
    );
    console.log(
      `   사용 연차 (DB):       ${(
        savedStats.details?.leave?.totalUsedLeave || 0
      ).toFixed(2)}일`
    );
    console.log(
      `   사용 연차 (계산):     ${(
        freshStats.details?.leave?.totalUsedLeave || 0
      ).toFixed(2)}일`
    );
    console.log(
      `   가용 연차 (DB):       ${savedStats.details?.leave?.totalAvailableLeave || 0}일`
    );
    console.log(
      `   가용 연차 (계산):     ${freshStats.details?.leave?.totalAvailableLeave || 0}일`
    );

    // 주52시간 위반 상세
    console.log('\n📌 주52시간 위반 상세:');
    console.log(
      `   총 직원 수 (DB):       ${savedStats.details?.violations?.totalEmployees || 0}명`
    );
    console.log(
      `   총 직원 수 (계산):     ${freshStats.details?.violations?.totalEmployees || 0}명`
    );
    console.log(
      `   위반 직원 (DB):       ${savedStats.details?.violations?.violatedEmployees || 0}명`
    );
    console.log(
      `   위반 직원 (계산):     ${freshStats.details?.violations?.violatedEmployees || 0}명`
    );
    console.log(
      `   위반 횟수 (DB):       ${savedStats.details?.violations?.violationCount || 0}회`
    );
    console.log(
      `   위반 횟수 (계산):     ${freshStats.details?.violations?.violationCount || 0}회`
    );

    // 스트레스 지수 상세
    console.log('\n📌 스트레스 지수 상세:');
    console.log(
      `   총 직원 수 (DB):     ${savedStats.details?.stress?.totalEmployees || 0}명`
    );
    console.log(
      `   총 직원 수 (계산):   ${freshStats.details?.stress?.totalEmployees || 0}명`
    );
    console.log(
      `   고스트레스 (DB):     ${savedStats.details?.stress?.highStressCount || 0}명 (70점 이상)`
    );
    console.log(
      `   고스트레스 (계산):   ${freshStats.details?.stress?.highStressCount || 0}명 (70점 이상)`
    );
    console.log(
      `   중스트레스 (DB):     ${savedStats.details?.stress?.mediumStressCount || 0}명 (40-69점)`
    );
    console.log(
      `   중스트레스 (계산):   ${freshStats.details?.stress?.mediumStressCount || 0}명 (40-69점)`
    );
    console.log(
      `   저스트레스 (DB):     ${savedStats.details?.stress?.lowStressCount || 0}명 (40점 미만)`
    );
    console.log(
      `   저스트레스 (계산):   ${freshStats.details?.stress?.lowStressCount || 0}명 (40점 미만)`
    );

    // 5. 최종 결과
    console.log('\n' + '='.repeat(70));
    if (!hasDifference) {
      console.log('✅ 검증 완료: DB 저장값과 실시간 계산값이 일치합니다!');
    } else {
      console.log(
        '⚠️  경고: DB 저장값과 실시간 계산값에 차이가 있습니다.'
      );
      console.log('   데이터가 변경되었거나 계산 로직이 업데이트된 것 같습니다.');
    }
    console.log('='.repeat(70) + '\n');

    return { success: true, hasDifference };
  } catch (error) {
    console.error('\n❌ 검증 중 오류 발생:', error.message);
    if (error.status) {
      console.error('   응답 상태:', error.status);
      console.error('   응답 데이터:', error.data);
    }
    return { success: false, error: error.message };
  }
}

async function listAllStats() {
  console.log('\n📊 DB에 저장된 모든 워라밸 지표 조회\n');

  try {
    // 2025년 데이터 조회
    const response = await httpRequest(`${API_BASE_URL}/worklife/stats/2025`);
    const stats = response.data.data;

    console.log(`총 ${stats.length}개의 워라밸 지표가 저장되어 있습니다.\n`);

    stats.forEach((stat) => {
      console.log(
        `${stat.year}년 ${stat.month}월 - 계산 시간: ${new Date(
          stat.calculatedAt
        ).toLocaleString('ko-KR')}`
      );
    });

    return stats;
  } catch (error) {
    console.error('❌ 조회 실패:', error.message);
    return [];
  }
}

async function main() {
  const args = process.argv.slice(2);

  try {
    if (args[0] === 'list') {
      // 저장된 모든 지표 목록 조회
      await listAllStats();
    } else if (args.length >= 2) {
      // 특정 년월 검증
      const year = parseInt(args[0]);
      const month = parseInt(args[1]);
      await verifyWorkLifeBalance(year, month);
    } else {
      // 기본: 2025년 모든 월 검증
      console.log('📋 2025년 모든 워라밸 지표 검증 시작\n');

      const stats = await listAllStats();

      for (const stat of stats) {
        await verifyWorkLifeBalance(stat.year, stat.month);
        console.log('\n');
      }
    }
  } catch (error) {
    console.error('❌ 실행 중 오류 발생:', error.message);
    process.exit(1);
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  main();
}

module.exports = {
  verifyWorkLifeBalance,
  listAllStats,
};
