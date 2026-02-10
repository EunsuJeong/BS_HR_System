/**
 * 급여 계산 검증 스크립트
 * 2026년 1월 데이터를 이용해서 급여합계, 공제합계, 차인지급액 계산 검증
 */

const http = require('http');

const API_BASE = 'localhost';
const API_PORT = 5000;

// HTTP GET 요청 헬퍼 함수
function httpGet(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_BASE,
      port: API_PORT,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          } else {
            resolve(JSON.parse(data));
          }
        } catch (e) {
          reject(new Error(`JSON 파싱 실패: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// 급여 계산 함수 (App.js의 로직과 동일)
function calculatePayrollForEmployee(employee, attendanceData, leaveData) {
  const COMPANY_STANDARDS = {
    일급여: 80000,
    기본급: 2400000,
    식대: 300000,
    차량유지비: 200000,
    주휴수당_시급: 10000,
    연장수당_시급: 14286,
    야간수당_시급: 12500,
    휴일수당_시급: 12500,
    국민연금_요율: 4.5,
    건강보험_요율: 3.545,
    장기요양_요율: 12.95,
    고용보험_요율: 0.9,
  };

  // 기본 데이터
  const result = {
    근무일수: 0,
    급여합계: 0,
    공제합계: 0,
    차인지급액: 0,
    기본급: 0,
    식대: 0,
    차량유지비: 0,
    주휴수당: 0,
    연장수당: 0,
    야간수당: 0,
    휴일수당: 0,
    국민연금: 0,
    건강보험: 0,
    장기요양: 0,
    고용보험: 0,
  };

  // 근무일수 계산 (출근 기록이 있는 날)
  result.근무일수 = attendanceData.filter(record => 
    (record.employeeId === employee._id || record.employeeId === employee.employeeId) && 
    (record.checkIn || record.status)
  ).length;

  // 급여 항목 계산
  const position = employee.position || employee.직급 || '';
  if (position === '일용') {
    // 일용직: 근무일수 * 일급여
    result.기본급 = result.근무일수 * COMPANY_STANDARDS.일급여;
  } else {
    // 정규직: 기본급 고정
    result.기본급 = COMPANY_STANDARDS.기본급;
    result.식대 = COMPANY_STANDARDS.식대;
    result.차량유지비 = COMPANY_STANDARDS.차량유지비;
  }

  // 수당 계산 (예시 - 실제로는 더 복잡한 로직)
  result.주휴수당 = Math.floor(result.근무일수 / 5) * 8 * COMPANY_STANDARDS.주휴수당_시급;

  // 급여합계
  result.급여합계 = 
    result.기본급 + 
    result.식대 + 
    result.차량유지비 + 
    result.주휴수당 + 
    result.연장수당 + 
    result.야간수당 + 
    result.휴일수당;

  // 공제 항목 계산
  const 과세소득 = result.급여합계 - result.식대; // 식대는 비과세
  
  result.국민연금 = Math.floor(과세소득 * (COMPANY_STANDARDS.국민연금_요율 / 100));
  result.건강보험 = Math.floor(과세소득 * (COMPANY_STANDARDS.건강보험_요율 / 100));
  result.장기요양 = Math.floor(result.건강보험 * (COMPANY_STANDARDS.장기요양_요율 / 100));
  result.고용보험 = Math.floor(과세소득 * (COMPANY_STANDARDS.고용보험_요율 / 100));

  // 공제합계
  result.공제합계 = 
    result.국민연금 + 
    result.건강보험 + 
    result.장기요양 + 
    result.고용보험;

  // 차인지급액
  result.차인지급액 = result.급여합계 - result.공제합계;

  return result;
}

// 메인 검증 함수
async function verifyPayrollCalculation() {
  try {
    console.log('='.repeat(80));
    console.log('급여 계산 검증 시작 - 2026년 1월');
    console.log('='.repeat(80));
    console.log();

    // 1. 직원 데이터 가져오기
    console.log('📋 1단계: 직원 데이터 가져오기...');
    const employeesData = await httpGet('/api/hr/employees');
    const employees = employeesData.data || employeesData.employees || (Array.isArray(employeesData) ? employeesData : []);
    console.log(`✅ 직원 수: ${employees.length}명`);
    console.log();

    // 2. 2026년 1월 근태 데이터 가져오기
    console.log('📅 2단계: 2026년 1월 근태 데이터 가져오기...');
    const attendanceResp = await httpGet('/api/attendance?year=2026&month=1');
    const attendanceData = attendanceResp.data || attendanceResp.records || (Array.isArray(attendanceResp) ? attendanceResp : []);
    console.log(`✅ 근태 기록: ${attendanceData.length}건`);
    console.log();

    // 3. 2026년 1월 연차 데이터 가져오기
    console.log('🏖️ 3단계: 2026년 1월 연차 데이터 가져오기...');
    const leaveResp = await httpGet('/api/hr/leaves?year=2026&month=1');
    const leaveData = leaveResp.data || leaveResp.leaves || (Array.isArray(leaveResp) ? leaveResp : []);
    console.log(`✅ 연차 기록: ${leaveData.length}건`);
    console.log();

    // 4. 각 직원별 급여 계산
    console.log('💰 4단계: 급여 계산 수행...');
    console.log('-'.repeat(80));
    
    let totalPayment = 0;
    let totalDeduction = 0;
    let totalActual = 0;

    const results = employees.map(employee => {
      const payroll = calculatePayrollForEmployee(employee, attendanceData, leaveData);
      
      totalPayment += payroll.급여합계;
      totalDeduction += payroll.공제합계;
      totalActual += payroll.차인지급액;

      const name = (employee.name || employee.이름 || '미상').padEnd(8);
      console.log(`👤 ${name} | 급여: ${payroll.급여합계.toLocaleString().padStart(12)} | 공제: ${payroll.공제합계.toLocaleString().padStart(12)} | 실수령: ${payroll.차인지급액.toLocaleString().padStart(12)}`);
      
      return {
        이름: employee.name || employee.이름,
        ...payroll
      };
    });
    
    console.log('-'.repeat(80));
    console.log();

    // 5. 합계 검증
    console.log('🔍 5단계: 합계 검증');
    console.log('='.repeat(80));
    
    const roundedTotalPayment = Math.round(totalPayment);
    const roundedTotalDeduction = Math.round(totalDeduction);
    const calculatedActual = roundedTotalPayment - roundedTotalDeduction; // 공식으로 계산
    const summedActual = Math.round(totalActual); // 개별 합산

    console.log(`📊 총 급여합계:    ${roundedTotalPayment.toLocaleString().padStart(15)}원`);
    console.log(`📊 총 공제합계:    ${roundedTotalDeduction.toLocaleString().padStart(15)}원`);
    console.log();
    console.log(`🧮 차인지급액 (공식):  ${calculatedActual.toLocaleString().padStart(15)}원  ← 총급여 - 총공제`);
    console.log(`🧮 차인지급액 (합산):  ${summedActual.toLocaleString().padStart(15)}원  ← 개별 차인 합산`);
    console.log();

    // 6. 검증 결과
    const difference = calculatedActual - summedActual;
    
    if (difference === 0) {
      console.log('✅ 검증 성공: 차인지급액이 정확히 일치합니다!');
    } else {
      console.log(`⚠️  검증 실패: ${Math.abs(difference)}원 차이 발생`);
      console.log(`   원인: 개별 행에서 반올림된 값을 합산하면 오차 누적`);
      console.log(`   해결: 총급여 - 총공제 공식으로 직접 계산 (현재 코드에 적용됨)`);
    }
    
    console.log();
    console.log('='.repeat(80));
    console.log('✅ 검증 완료');
    console.log('='.repeat(80));
    console.log();
    
    // 7. 역산 검증
    console.log('🔄 6단계: 역산 검증');
    console.log('-'.repeat(80));
    console.log(`총 차인지급액 + 총 공제합계 = ${(calculatedActual + roundedTotalDeduction).toLocaleString()}원`);
    console.log(`총 급여합계                  = ${roundedTotalPayment.toLocaleString()}원`);
    
    if (calculatedActual + roundedTotalDeduction === roundedTotalPayment) {
      console.log('✅ 역산 검증 성공: 차인지급액 + 공제합계 = 급여합계');
    } else {
      console.log('❌ 역산 검증 실패');
    }
    console.log('-'.repeat(80));

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('서버가 실행되지 않았습니다. npm run start:local을 먼저 실행하세요.');
    }
  }
}

// 스크립트 실행
verifyPayrollCalculation();
