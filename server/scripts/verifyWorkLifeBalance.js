const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const workLifeBalanceService = require('../services/workLifeBalanceService');
const WorkLifeBalanceStats = require('../models/hr/workLifeBalanceStats');

/**
 * 워라밸 지표 DB 저장 값 검증 스크립트
 * - DB에 저장된 값과 실시간 계산 값을 비교
 */

async function verifyWorkLifeBalance(year, month) {
  console.log('\n='.repeat(70));
  console.log(`📊 워라밸 지표 DB 검증 시작: ${year}년 ${month}월`);
  console.log('='.repeat(70));

  try {
    // 1. DB에서 저장된 값 조회
    console.log('\n[1단계] DB에서 저장된 값 조회 중...');
    const savedStats = await workLifeBalanceService.getWorkLifeBalance(
      year,
      month
    );

    if (!savedStats) {
      console.log(`❌ DB에 ${year}년 ${month}월 워라밸 지표가 없습니다.`);
      console.log('   먼저 계산을 수행해주세요.');
      return;
    }

    console.log('✅ DB 저장 값 조회 완료');
    console.log(`   - 계산 시간: ${savedStats.calculatedAt}`);
    console.log(`   - 직원 수: ${savedStats.employeeCount}명`);
    console.log(
      `   - 계산 소요 시간: ${savedStats.calculationDuration || 'N/A'}ms`
    );

    // 2. 실시간으로 다시 계산
    console.log('\n[2단계] 실시간으로 워라밸 지표 재계산 중...');
    const freshStats = await workLifeBalanceService.calculateWorkLifeBalance(
      year,
      month
    );

    console.log('✅ 실시간 계산 완료');

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
    const threshold = 0.01; // 오차 허용 범위 (0.01)

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
      console.log('   필요하면 /api/worklife/calculate API로 재계산하세요.');
    }
    console.log('='.repeat(70) + '\n');
  } catch (error) {
    console.error('\n❌ 검증 중 오류 발생:', error.message);
    console.error(error);
  }
}

/**
 * 모든 저장된 워라밸 지표 검증
 */
async function verifyAllWorkLifeBalance() {
  console.log('\n📊 전체 워라밸 지표 DB 검증 시작\n');

  try {
    const allStats = await WorkLifeBalanceStats.find().sort({
      year: -1,
      month: -1,
    });

    console.log(`총 ${allStats.length}개의 워라밸 지표가 DB에 저장되어 있습니다.\n`);

    for (const stats of allStats) {
      await verifyWorkLifeBalance(stats.year, stats.month);
      console.log('\n');
    }
  } catch (error) {
    console.error('❌ 전체 검증 중 오류 발생:', error.message);
  }
}

// 메인 실행
async function main() {
  try {
    // MongoDB 연결
    const dbUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/hr_system';
    await mongoose.connect(dbUri);
    console.log('✅ MongoDB 연결 성공');

    // 명령줄 인자로 특정 년월 지정 가능
    const args = process.argv.slice(2);

    if (args.length >= 2) {
      const year = parseInt(args[0]);
      const month = parseInt(args[1]);
      await verifyWorkLifeBalance(year, month);
    } else if (args[0] === 'all') {
      await verifyAllWorkLifeBalance();
    } else {
      // 현재 월 검증
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      await verifyWorkLifeBalance(year, month);
    }

    await mongoose.connection.close();
    console.log('✅ MongoDB 연결 종료');
  } catch (error) {
    console.error('❌ 실행 중 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  main();
}

module.exports = {
  verifyWorkLifeBalance,
  verifyAllWorkLifeBalance,
};
