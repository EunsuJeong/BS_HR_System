// 근태 업로드 직원 매칭 로직 테스트

// 테스트용 직원 데이터 (이종진씨 퇴사+재입사 시나리오)
const testEmployees = [
  {
    employeeId: '20240001',
    name: '이종진',
    status: '퇴사',
    joinDate: '2024-01-01',
    leaveDate: '2025-12-31',
  },
  {
    employeeId: '20260015',
    name: '이종진',
    status: '재직',
    joinDate: '2026-01-15',
  },
  {
    employeeId: '20250010',
    name: '홍길동',
    status: '재직',
    joinDate: '2025-06-01',
  },
];

// 수정된 findEmployee 로직
function findEmployee(employeeName, employees) {
  console.log(`\n🔍 직원 검색: "${employeeName}"`);

  // 1. 정확한 매칭 (재직자만)
  let employee = employees.find(
    (emp) => emp.name === employeeName && emp.status === '재직'
  );
  if (employee) {
    console.log(
      `  ✅ 정확한 매칭 (재직): ${employee.name} (${employee.employeeId})`
    );
    return employee;
  }

  // 2. 공백 제거 후 매칭 (재직자만)
  employee = employees.find(
    (emp) =>
      emp.name.replace(/\s/g, '') === employeeName.replace(/\s/g, '') &&
      emp.status === '재직'
  );
  if (employee) {
    console.log(
      `  ✅ 공백 제거 후 매칭 (재직): ${employee.name} (${employee.employeeId})`
    );
    return employee;
  }

  // 3. 부분 매칭 (재직자만)
  employee = employees.find(
    (emp) =>
      (emp.name.includes(employeeName) || employeeName.includes(emp.name)) &&
      emp.status === '재직'
  );
  if (employee) {
    console.log(
      `  ✅ 부분 매칭 (재직): ${employee.name} (${employee.employeeId})`
    );
    return employee;
  }

  // 재직자를 찾지 못한 경우
  console.log(`  ❌ 재직 중인 "${employeeName}" 직원을 찾을 수 없습니다.`);

  // 퇴사자가 있는지 확인 (디버깅용)
  const retiredEmployee = employees.find(
    (emp) => emp.name === employeeName && emp.status === '퇴사'
  );
  if (retiredEmployee) {
    console.log(
      `  ⚠️  퇴사자 존재: ${retiredEmployee.name} (${retiredEmployee.employeeId}) - 제외됨`
    );
  }

  return null;
}

// 수정 전 로직 (비교용)
function findEmployeeOld(employeeName, employees) {
  console.log(`\n🔍 [구버전] 직원 검색: "${employeeName}"`);

  // 정확한 매칭 (재직/퇴사 구분 없음)
  let employee = employees.find((emp) => emp.name === employeeName);
  if (employee) {
    console.log(
      `  ⚠️  매칭됨 (${employee.status}): ${employee.name} (${employee.employeeId})`
    );
    return employee;
  }

  return null;
}

// 테스트 실행
console.log('========================================');
console.log('📊 근태 업로드 직원 매칭 테스트');
console.log('========================================');

console.log('\n📋 테스트 직원 목록:');
testEmployees.forEach((emp) => {
  console.log(`  - ${emp.name} (${emp.employeeId}) - ${emp.status}`);
});

console.log('\n\n=== [테스트 1] 이종진씨 매칭 (구버전) ===');
const resultOld = findEmployeeOld('이종진', testEmployees);
if (resultOld) {
  console.log(`\n❌ 문제: 퇴사자 사번으로 매칭됨!`);
  console.log(
    `   → 2월 근태가 ${resultOld.employeeId} (퇴사)로 저장될 수 있음`
  );
}

console.log('\n\n=== [테스트 2] 이종진씨 매칭 (신버전 - 재직자 우선) ===');
const resultNew = findEmployee('이종진', testEmployees);
if (resultNew) {
  console.log(`\n✅ 성공: 재직자 사번으로 매칭됨!`);
  console.log(`   → 2월 근태가 ${resultNew.employeeId} (재직)로 저장됨`);
}

console.log('\n\n=== [테스트 3] 홍길동씨 매칭 (재직자만 있는 경우) ===');
const resultHong = findEmployee('홍길동', testEmployees);
if (resultHong) {
  console.log(
    `\n✅ 정상: ${resultHong.name} (${resultHong.employeeId}) - ${resultHong.status}`
  );
}

console.log('\n\n=== [테스트 4] 존재하지 않는 직원 ===');
const resultNone = findEmployee('김철수', testEmployees);
if (!resultNone) {
  console.log(`\n✅ 정상: 직원을 찾지 못함 (예상된 동작)`);
}

console.log('\n========================================');
console.log('✅ 테스트 완료!');
console.log('========================================\n');

// 2월 근태 업로드 시나리오 시뮬레이션
console.log('\n📅 2월 근태 업로드 시나리오:');
console.log('- 엑셀 데이터: 이종진, 2026-02-01, 09:00');
const uploadEmployee = findEmployee('이종진', testEmployees);
if (uploadEmployee) {
  console.log(
    `\n✅ 근태 저장 대상: employeeId=${uploadEmployee.employeeId} (${uploadEmployee.status})`
  );
  console.log(
    `   → DB 저장: { employeeId: "${uploadEmployee.employeeId}", date: "2026-02-01", checkIn: "09:00" }`
  );
  console.log(`\n🎯 결과: 이종진씨가 로그인하면 2월 근태가 정상 조회됩니다!`);
} else {
  console.log(`\n❌ 오류: 재직자를 찾을 수 없어 근태 업로드 불가`);
}
