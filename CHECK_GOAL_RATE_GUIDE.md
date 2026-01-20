# 목표달성률 작동 확인 가이드

## 현재 계산 로직

### 위치
- 파일: `src/components/common/common_admin_dashboard.js`
- 함수: `calculateMonthlyRate` (3873번째 줄)
- 호출: `getGoalDataByYearUtil` (3736번째 줄)

### 계산 방식

1. **영업일 기준**
   - 주말(토요일, 일요일) 제외
   - 공휴일 제외
   - 연차/휴가자 제외

2. **일별 비율 계산**
   - 각 영업일마다 출근 대상 직원의 상태를 분석
   - 출근률 = 출근한 직원 / 출근 대상 직원
   - 지각률 = 지각한 직원 / 출근 대상 직원
   - 결근률 = 결근한 직원 / 출근 대상 직원

3. **월별 평균**
   - 일별 비율의 평균을 계산
   - 예: 20일간 출근률이 각각 95%, 90%, 100%... → 평균 계산

### 상태 판정 로직

```javascript
// 결근: 출근+퇴근 기록이 둘 다 없음
if (!checkIn && !checkOut) {
  status = '결근';
}

// 지각: 출근 시간 기준
if (checkIn) {
  const checkInMinutes = timeToMinutes(checkIn);

  if (workType === '주간' && checkInMinutes > 511) {  // 08:31 이후
    status = '지각';
  } else if (workType === '야간' && checkInMinutes > 1141) {  // 19:01 이후
    status = '지각';
  } else {
    status = '출근';
  }
}
```

## 브라우저에서 확인하는 방법

### 1. 관리자로 로그인

```
1. 앱/웹에서 관리자 계정으로 로그인
2. 대시보드로 이동
```

### 2. 브라우저 개발자 도구 열기

```
Chrome/Edge: F12 또는 Ctrl+Shift+I
```

### 3. Console 탭에서 확인

#### 3-1. yearlyGoalData 확인

```javascript
// React DevTools가 설치되어 있다면
$r.props.yearlyGoalData

// 또는 전역에서 확인 (AdminDashboard 컴포넌트 찾기)
// 대시보드가 렌더링된 후
```

#### 3-2. 현재 표시된 값 확인

대시보드에서 직접 확인:
```
이번달 목표달성률
├─ 출근률: XX%
├─ 지각률: XX%
├─ 결근률: XX%
└─ 퇴사율: XX%
```

#### 3-3. Network 탭에서 API 확인

```javascript
// Console에서 수동으로 API 호출
const year = new Date().getFullYear();
const month = new Date().getMonth() + 1;

fetch(`${process.env.REACT_APP_API_BASE_URL}/attendance/monthly/${year}/${month}`)
  .then(res => res.json())
  .then(data => {
    console.log('이번달 근태 데이터:', data);
    console.log('데이터 수:', data.data ? data.data.length : 0);
  });
```

### 4. 데이터 검증

#### 4-1. 근태 데이터 샘플 확인

```javascript
// Console에서
fetch(`${process.env.REACT_APP_API_BASE_URL}/attendance/monthly/2026/1`)
  .then(res => res.json())
  .then(data => {
    const records = data.data || data;
    console.log('총 기록 수:', records.length);

    // 샘플 10개 출력
    console.table(records.slice(0, 10).map(r => ({
      날짜: r.date,
      직원: r.employeeId,
      출근: r.checkIn || '-',
      퇴근: r.checkOut || '-'
    })));
  });
```

#### 4-2. 직원 수 확인

```javascript
// Console에서
fetch(`${process.env.REACT_APP_API_BASE_URL}/hr/employees`)
  .then(res => res.json())
  .then(data => {
    const employees = data.data || data;
    const active = employees.filter(e => e.status === '재직');
    console.log('전체 직원:', employees.length);
    console.log('재직 직원:', active.length);
  });
```

#### 4-3. 수동 계산

```javascript
// 이번달 영업일 수 계산
const now = new Date();
const year = now.getFullYear();
const month = now.getMonth();
const daysInMonth = new Date(year, month + 1, 0).getDate();

let workDays = 0;
for (let day = 1; day <= daysInMonth; day++) {
  const date = new Date(year, month, day);
  const dayOfWeek = date.getDay();
  if (dayOfWeek !== 0 && dayOfWeek !== 6) {  // 주말 제외
    workDays++;
  }
}

console.log(`${month + 1}월 영업일: ${workDays}일`);
```

## 문제 발생 시 체크리스트

### 1. 데이터가 없는 경우 (-)

**증상:** 출근률, 지각률, 결근률이 모두 `-`로 표시

**원인:**
- 근태 데이터가 DB에 없음
- API 호출 실패
- 월별 데이터 로딩 실패

**확인:**
```javascript
// Console에서
const year = new Date().getFullYear();
const month = new Date().getMonth() + 1;

fetch(`${process.env.REACT_APP_API_BASE_URL}/attendance/monthly/${year}/${month}`)
  .then(res => res.json())
  .then(data => {
    console.log('API 응답:', data);
    if (data.success && data.data.length === 0) {
      console.log('⚠️  이번달 근태 데이터가 없습니다!');
    }
  });
```

### 2. 비율이 이상한 경우

**증상:** 출근률 + 지각률 + 결근률 ≠ 100%

**원인:**
- 상태 판정 로직 오류
- 야간/주간 판정 오류
- 연차자 제외 로직 오류

**확인:**
```javascript
// 특정 날짜의 전체 직원 상태 확인
const testDate = '2026-01-13';

fetch(`${process.env.REACT_APP_API_BASE_URL}/attendance/monthly/2026/1`)
  .then(res => res.json())
  .then(data => {
    const dayRecords = data.data.filter(r => r.date === testDate);
    console.log(`${testDate} 출근 기록:`, dayRecords.length);

    // 출근 상태별 집계
    const stats = {
      출근: 0,
      지각: 0,
      결근: 0
    };

    dayRecords.forEach(r => {
      if (!r.checkIn && !r.checkOut) {
        stats.결근++;
      } else if (r.checkIn) {
        const [h, m] = r.checkIn.split(':').map(Number);
        const minutes = h * 60 + m;
        if (minutes > 511) {  // 08:31 이후
          stats.지각++;
        } else {
          stats.출근++;
        }
      } else {
        stats.출근++;
      }
    });

    console.table(stats);
  });
```

### 3. 공휴일이 포함된 경우

**증상:** 공휴일도 영업일로 계산됨

**확인:**
```javascript
// 공휴일 체크 함수 테스트
// src/components/common/common_common.js의 isHolidayDate 확인

// 예: 1월 1일이 공휴일로 판정되는지
console.log('1월 1일 공휴일?', isHolidayDate(2026, 1, 1));
```

### 4. 연차자가 결근으로 계산된 경우

**증상:** 연차를 낸 직원이 결근으로 집계됨

**확인:**
```javascript
// 승인된 연차 확인
fetch(`${process.env.REACT_APP_API_BASE_URL}/leaves`)
  .then(res => res.json())
  .then(data => {
    const approved = data.filter(l =>
      l.status === '승인' &&
      l.startDate.includes('2026-01')
    );
    console.log('1월 승인된 연차:', approved.length);
    console.table(approved.slice(0, 5).map(l => ({
      직원: l.employeeId,
      시작: l.startDate,
      종료: l.endDate,
      타입: l.leaveType
    })));
  });
```

## 정상 작동 확인 방법

### 1. 간단한 검증

대시보드에서 확인:
```
출근률 + 지각률 + 결근률 ≈ 100%
(오차 범위: ±1%)
```

### 2. 샘플 데이터로 검증

```javascript
// 오늘 날짜의 데이터 확인
const today = new Date();
const dateStr = today.toISOString().split('T')[0];

fetch(`${process.env.REACT_APP_API_BASE_URL}/attendance/monthly/${today.getFullYear()}/${today.getMonth() + 1}`)
  .then(res => res.json())
  .then(data => {
    const todayData = data.data.filter(r => r.date === dateStr);

    console.log(`오늘(${dateStr}) 출근 기록:`, todayData.length);

    // 수동 계산
    let 출근 = 0, 지각 = 0, 결근 = 0;

    todayData.forEach(r => {
      if (!r.checkIn && !r.checkOut) {
        결근++;
      } else if (r.checkIn) {
        const [h, m] = r.checkIn.split(':').map(Number);
        const minutes = h * 60 + m;
        if (minutes > 511) {
          지각++;
        } else {
          출근++;
        }
      } else {
        출근++;
      }
    });

    console.log('수동 계산 결과:');
    console.log(`출근: ${출근}명 (${((출근/todayData.length)*100).toFixed(1)}%)`);
    console.log(`지각: ${지각}명 (${((지각/todayData.length)*100).toFixed(1)}%)`);
    console.log(`결근: ${결근}명 (${((결근/todayData.length)*100).toFixed(1)}%)`);
  });
```

## 디버깅 모드 활성화

`src/components/common/common_admin_dashboard.js`에서:

```javascript
// 3873줄 calculateMonthlyRate 함수 시작 부분에 추가
function calculateMonthlyRate(...) {
  console.log(`📊 calculateMonthlyRate - ${year}년 ${month+1}월, metric: ${metric}`);

  // ... 기존 코드 ...

  // 4076줄 return 직전에 추가
  console.log(`결과: ${metric} = ${result.toFixed(1)}% (${dailyRates.length}일 평균)`);

  return result;
}
```

브라우저 Console에서 상세 로그 확인 가능

## 문제 해결 플로우

```
1. 대시보드에서 "-" 표시
   ↓
2. Console에서 API 응답 확인
   ├─ 데이터 없음 → 근태 입력 필요
   └─ 데이터 있음 → 3번으로
   ↓
3. yearlyGoalData 확인
   ├─ null/undefined → 로딩 실패
   └─ 값 있음 → 4번으로
   ↓
4. 수동 계산과 비교
   ├─ 차이 큼 → 로직 문제
   └─ 차이 작음 → 정상
```

## 관련 파일

- `src/components/admin/AdminDashboard.js` (532-580줄) - UI 표시
- `src/components/common/common_admin_dashboard.js` (3736-3877줄) - 데이터 조회
- `src/components/common/common_admin_dashboard.js` (3873-4077줄) - 계산 로직

## 다음 단계

1. 브라우저에서 위 방법으로 확인
2. 문제 발견 시 구체적인 증상과 함께 문의
3. 필요시 코드 수정
