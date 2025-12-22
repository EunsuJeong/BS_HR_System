# 부성스틸 실제 규정 (코드 기반)

## 1. 근무시간 규정 (attendanceStatsCalculator.js Line 42-117)

### 주간 근무:
- 정규 근무시간: 09:00 ~ 18:00
- 점심시간: 12:00 ~ 13:00 (1시간, 근무시간에서 제외)
- 실제 근무시간: 8시간 (점심시간 제외)

### 조출 (Line 72-74):
- 09:00 이전 출근 시 조출 시간 인정
- 계산: (09:00 - 출근시간) / 60 시간

### 연장 근무 (Line 94-96):
- 18:00 이후 근무 시 연장 근무
- 계산: (퇴근시간 - 18:00) / 60 시간

### 심야 근무 (Line 98-104):
- 22:00 ~ 06:00 (다음날)
- 22:00 이후 근무 시 심야 근무 시간 인정
- 계산: (퇴근시간 - 22:00) / 60 시간

### 야간 근무 (시프트) (Line 105-114):
- 근무시간: 21:00 ~ 06:00 (다음날)
- 전체 근무시간이 심야 근무로 간주
- 기본 근무: 최대 9시간
- 9시간 초과 시 연장 근무로 인정

### 휴일 근무 (Line 54-59):
- 점심시간 1시간 제외
- 전체 근무시간이 휴일 근무 수당 적용

## 2. 출근 기준 (attendance.js Line 32-38)

- 기준 시간: 09:00
- 09:00 이전 출근 = 정상 (status: 'present')
- 09:00 이후 출근 = 지각 (status: 'late')

## 3. 연차 규정 (annualLeaveScheduler.js Line 47-58)

### 근속연수별 연차 개수:
- 1년 미만: 15일
- 1~3년: 15일
- 3~5년: 16일
- 5~7년: 17일
- 7~9년: 18일
- 9~11년: 19일
- 11~13년: 20일
- 13~15년: 21일
- 15~17년: 22일
- 17~19년: 23일
- 19~21년: 24일
- 21년 이상: 25일

### 연차 사용 차감 (Line 87-95):
- 연차: 1일 차감
- 반차(오전/오후): 0.5일 차감

### 연차 기간:
- 입사일 기준 1년 단위

## 4. 급여 관련 (payroll.js Line 40-141)

### 급여 항목 (실제 필드):
- 기본급 (basicPay)
- 연장수당 (overtimePay)
- 휴일근로수당 (holidayWorkPay)
- 야간근로수당 (nightWorkPay)
- 년차수당 (annualLeavePay)

### 공제 항목:
- 지각조퇴공제 (lateEarlyDeduction)
- 결근공제 (absentDeduction)
- 가불금과태료 (advanceDeduction)

### 기타 수당:
- 차량수당 (carAllowance)
- 교통비 (transportAllowance)
- 통신비 (phoneAllowance)
- 기타수당 (otherAllowance)
- 상여금 (bonus)

**주의: 급여 계산 배율은 코드에 명시되어 있지 않음. 데이터 구조만 존재.**

## 5. 실시간 알림 (annualLeaveScheduler.js Line 1-10)

- 연차 만료 알림: 매일 오전 8시 (cron 스케줄러)
- 출퇴근 알림: 실시간 (Socket.io) - attendance.js Line 54-63
- 급여 업로드: 실시간 (Socket.io) - payroll.js Line 167-177

## 6. 알림 종류 (notifications.js)

- 정기 알림: 반복 주기 설정 (특정일, 매일, 매주, 매월, 분기, 반기, 년)
- 실시간 알림: 즉시 발송 (즉시)
- 시스템 로그: 자동 생성 알림

## 7. 근태 상태 (attendanceStatsCalculator.js Line 165-181)

- 출근 (status === '출근'): workDays++
- 지각 (status === '지각'): workDays++, lateDays++
- 조퇴 (status === '조퇴'): workDays++, earlyLeaveDays++
- 결근 (status === '결근'): absentDays++
- 연차 (status === '연차'): annualLeaveDays++
- 반차(오전) (status === '반차(오전)'): workDays++, morningHalfDays++
- 반차(오후) (status === '반차(오후)'): workDays++, afternoonHalfDays++
