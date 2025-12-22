# 📚 데이터베이스 연결 및 사용 가이드

부성스틸 HR 시스템에 MongoDB 데이터베이스를 연결하는 방법입니다.

---

## 🎯 1. MongoDB 설치 옵션

### 옵션 A: 로컬 MongoDB 설치 (권장 - 개발환경)

1. **MongoDB Community Edition 다운로드**

   - https://www.mongodb.com/try/download/community
   - Windows용 MSI 파일 다운로드

2. **설치 진행**

   - "Complete" 설치 선택
   - "Install MongoDB as a Service" 체크
   - "Install MongoDB Compass" 체크 (GUI 도구)

3. **설치 확인**

   ```powershell
   mongod --version
   ```

4. **MongoDB 서비스 시작**
   ```powershell
   net start MongoDB
   ```

### 옵션 B: MongoDB Atlas (클라우드)

1. **MongoDB Atlas 가입**

   - https://www.mongodb.com/cloud/atlas/register
   - 무료 티어 선택 가능

2. **클러스터 생성**

   - Create Cluster → 무료 티어 선택
   - 리전 선택 (가까운 곳)

3. **데이터베이스 사용자 생성**

   - Database Access → Add New Database User
   - Username/Password 설정

4. **IP 화이트리스트 추가**

   - Network Access → Add IP Address
   - "Allow Access from Anywhere" (개발용)

5. **연결 문자열 복사**
   - Clusters → Connect → Connect your application
   - 연결 문자열 복사 후 `.env`에 저장

---

## ⚙️ 2. 환경 설정

### .env 파일 설정

프로젝트 루트의 `.env` 파일이 이미 생성되어 있습니다:

```env
# MongoDB 연결 URL
# 로컬 MongoDB 사용 시:
MONGODB_URI=mongodb://localhost:27017/hr_system

# MongoDB Atlas 사용 시:
# MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/hr_system?retryWrites=true&w=majority

# JWT 시크릿 키 (보안 강화를 위해 변경 권장)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2024
```

**Atlas 사용 시 예시:**

```env
MONGODB_URI=mongodb+srv://admin:MyPassword123@cluster0.abc123.mongodb.net/hr_system?retryWrites=true&w=majority
```

---

## 🚀 3. 서버 실행

### 터미널에서 실행

```powershell
npm start
```

### 성공 메시지 확인

```
✅ MongoDB Connected: localhost
📦 Database: hr_system
🚀 ==========================================
✅ 부성스틸 AI 통합 엔진 서버 실행 중
📡 포트: 5000
🌐 URL: http://localhost:5000
==========================================
```

---

## 📡 4. API 엔드포인트 사용법

### 직원 관리 API

#### 1. 모든 직원 조회

```http
GET http://localhost:5000/api/employees
```

**쿼리 파라미터:**

- `department`: 부서별 필터 (예: `?department=개발팀`)
- `status`: 상태별 필터 (예: `?status=active`)
- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 항목 수 (기본값: 50)

**예시:**

```http
GET http://localhost:5000/api/employees?department=개발팀&page=1&limit=20
```

#### 2. 특정 직원 조회

```http
GET http://localhost:5000/api/employees/EMP001
```

#### 3. 직원 등록

```http
POST http://localhost:5000/api/employees
Content-Type: application/json

{
  "employeeId": "EMP001",
  "name": "홍길동",
  "email": "hong@example.com",
  "password": "password123",
  "department": "개발팀",
  "position": "시니어 개발자",
  "rank": "과장",
  "hireDate": "2024-01-01",
  "phone": "010-1234-5678"
}
```

#### 4. 직원 정보 수정

```http
PUT http://localhost:5000/api/employees/EMP001
Content-Type: application/json

{
  "position": "수석 개발자",
  "rank": "차장"
}
```

#### 5. 직원 통계 조회

```http
GET http://localhost:5000/api/employees/stats/summary
```

---

### 출퇴근 관리 API

#### 1. 출근 등록

```http
POST http://localhost:5000/api/attendance/check-in
Content-Type: application/json

{
  "employeeId": "EMP001",
  "location": "본사"
}
```

#### 2. 퇴근 등록

```http
POST http://localhost:5000/api/attendance/check-out
Content-Type: application/json

{
  "employeeId": "EMP001",
  "location": "본사"
}
```

#### 3. 출퇴근 기록 조회

```http
GET http://localhost:5000/api/attendance/EMP001?startDate=2024-11-01&endDate=2024-11-30
```

#### 4. 출퇴근 통계

```http
GET http://localhost:5000/api/attendance/stats/EMP001?month=2024-11
```

---

## 🗄️ 5. 데이터 모델 구조

### Employee (직원)

```javascript
{
  employeeId: "EMP001",        // 사번 (고유)
  name: "홍길동",               // 이름
  email: "hong@example.com",   // 이메일 (고유)
  password: "해시된 비밀번호",  // 비밀번호
  department: "개발팀",         // 부서
  position: "시니어 개발자",    // 직급
  rank: "과장",                 // 직위
  hireDate: "2024-01-01",      // 입사일
  phone: "010-1234-5678",      // 연락처
  status: "active",            // 상태 (active/inactive/on_leave/terminated)
  role: "employee",            // 권한 (employee/manager/admin)
  annualLeave: {               // 연차 정보
    total: 15,
    used: 5,
    remaining: 10
  }
}
```

### Attendance (출퇴근)

```javascript
{
  employeeId: "EMP001",        // 사번
  date: "2024-11-15",          // 날짜
  checkIn: {                   // 출근 정보
    time: "2024-11-15T09:00:00",
    location: "본사",
    ipAddress: "192.168.1.100"
  },
  checkOut: {                  // 퇴근 정보
    time: "2024-11-15T18:00:00",
    location: "본사",
    ipAddress: "192.168.1.100"
  },
  workMinutes: 540,            // 근무 시간 (분)
  status: "present",           // 상태 (present/absent/late/half_day/leave)
  isLate: false                // 지각 여부
}
```

### Leave (휴가)

```javascript
{
  employeeId: "EMP001",        // 사번
  leaveType: "annual",         // 휴가 유형 (annual/sick/maternity/paternity/unpaid/other)
  startDate: "2024-11-20",     // 시작일
  endDate: "2024-11-22",       // 종료일
  days: 3,                     // 일수
  reason: "개인 사유",         // 사유
  status: "pending",           // 상태 (pending/approved/rejected/cancelled)
  approver: {                  // 승인자 정보
    id: "MGR001",
    name: "김부장",
    comment: "승인합니다",
    approvedAt: "2024-11-15T10:00:00"
  }
}
```

---

## 🔧 6. MongoDB Compass 사용 (GUI 도구)

### 연결 방법

1. MongoDB Compass 실행
2. Connection String 입력: `mongodb://localhost:27017`
3. Connect 클릭

### 데이터 확인

- 좌측에서 `hr_system` 데이터베이스 선택
- `employees`, `attendances`, `leaves` 컬렉션 확인
- 데이터 추가/수정/삭제 가능

---

## 🧪 7. 테스트 방법

### Postman 또는 REST Client 사용

1. **Postman 설치** (https://www.postman.com/downloads/)

2. **테스트 시나리오:**

   a. 직원 등록

   ```
   POST http://localhost:5000/api/employees
   ```

   b. 등록된 직원 확인

   ```
   GET http://localhost:5000/api/employees/EMP001
   ```

   c. 출근 등록

   ```
   POST http://localhost:5000/api/attendance/check-in
   ```

   d. 퇴근 등록

   ```
   POST http://localhost:5000/api/attendance/check-out
   ```

### VS Code REST Client 확장 사용

1. **REST Client 확장 설치**
2. **test.http 파일 생성**
3. **아래 내용 작성 후 실행**

```http
### 직원 등록
POST http://localhost:5000/api/employees
Content-Type: application/json

{
  "employeeId": "EMP001",
  "name": "테스트직원",
  "email": "test@example.com",
  "password": "password123",
  "department": "테스트팀",
  "position": "사원",
  "hireDate": "2024-11-15"
}

### 직원 조회
GET http://localhost:5000/api/employees/EMP001

### 출근 등록
POST http://localhost:5000/api/attendance/check-in
Content-Type: application/json

{
  "employeeId": "EMP001"
}
```

---

## 🐛 8. 트러블슈팅

### MongoDB 연결 실패

```
❌ MongoDB connection failed: connect ECONNREFUSED
```

**해결방법:**

1. MongoDB 서비스 실행 확인
   ```powershell
   net start MongoDB
   ```
2. `.env` 파일의 `MONGODB_URI` 확인
3. 방화벽 설정 확인

### 포트 충돌

```
Error: listen EADDRINUSE: address already in use :::5000
```

**해결방법:**

1. `.env`에서 다른 포트로 변경
   ```env
   PORT=5001
   ```
2. 또는 기존 프로세스 종료
   ```powershell
   netstat -ano | findstr :5000
   taskkill /PID <PID번호> /F
   ```

### 모델 에러

```
Error: Schema hasn't been registered for model
```

**해결방법:**

- 서버 재시작
- `node_modules` 삭제 후 `npm install` 재실행

---

## 📈 9. 다음 단계

### 추가 기능 구현 권장사항:

1. **인증/인가 시스템**

   - JWT 기반 로그인/로그아웃
   - 미들웨어를 통한 권한 검증

2. **휴가 관리 API**

   - 휴가 신청/승인/반려
   - 연차 자동 계산

3. **알림 시스템**

   - 출퇴근 알림
   - 휴가 승인 알림
   - Socket.io 통합

4. **대시보드 데이터**

   - 실시간 통계
   - 월별/연도별 리포트

5. **데이터 백업**
   - 자동 백업 스크립트
   - 복구 절차 마련

---

## 📞 지원

문제가 발생하면 다음을 확인하세요:

1. MongoDB 서비스 실행 상태
2. `.env` 파일 설정
3. 서버 로그 메시지
4. 네트워크 연결 상태

행운을 빕니다! 🚀
