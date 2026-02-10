# FBD_One 브랜치 로컬 배포 가이드

> **FBD_One**: Front-Backend-DB in One Computer  
> 하나의 PC에서 프론트엔드, 백엔드, 데이터베이스를 모두 실행하는 로컬 서버 배포 방식

---

## 📋 목차

1. [시스템 요구사항](#시스템-요구사항)
2. [사전 준비](#사전-준비)
3. [배포 단계](#배포-단계)
4. [외부 접속 설정](#외부-접속-설정)
5. [실행 및 확인](#실행-및-확인)
6. [문제 해결](#문제-해결)

---

## 🖥 시스템 요구사항

### 하드웨어
- **OS**: Windows 10/11 (64bit)
- **CPU**: Intel Core i5 이상 (4코어 이상 권장)
- **RAM**: 8GB 이상 (16GB 권장)
- **Storage**: SSD 20GB 이상 여유 공간
- **Network**: 고정 IP 또는 DDNS 설정 가능한 공유기

### 소프트웨어
- **Node.js**: 18.x 이상 (LTS 버전 권장)
- **MongoDB**: 6.0 이상 (Community Edition)
- **Git**: 최신 버전

---

## 📦 사전 준비

### 1. Node.js 설치

```powershell
# Node.js 버전 확인
node -v  # v18.x 이상

# npm 버전 확인
npm -v   # 9.x 이상
```

👉 [Node.js 다운로드](https://nodejs.org/)

### 2. MongoDB 설치

#### 방법 1: MongoDB Community Edition (권장)

1. [MongoDB 다운로드](https://www.mongodb.com/try/download/community)
2. 설치 시 "MongoDB Compass" 함께 설치 (GUI 관리 도구)
3. Windows 서비스로 자동 시작 설정

#### 방법 2: 프로젝트 내 스크립트 사용

```powershell
# MongoDB 자동 설치 및 실행
npm run start:mongodb
```

#### MongoDB 실행 확인

```powershell
# MongoDB 상태 확인 (PowerShell)
Get-Service MongoDB

# 또는 명령어로 확인
mongosh --eval "db.version()"
```

### 3. 프로젝트 클론 및 의존성 설치

```powershell
# Git 클론 (이미 있다면 생략)
git clone <repository-url>
cd BS_HR_System

# FBD_One 브랜치로 전환
git checkout FBD_One

# 의존성 설치
npm install
```

---

## 🚀 배포 단계

### 1. 환경 변수 설정

프로젝트 루트에 `.env` 파일이 이미 생성되어 있습니다.

**주요 설정 항목 확인**:

```env
# 데이터베이스 (로컬 MongoDB)
MONGO_URI=mongodb://127.0.0.1:27017/busung_hr

# 서버 포트
PORT=5000

# 로컬 서버 플래그
IS_INTERNAL_SERVER=true

# 외부 접속용 도메인 (ipTIME DDNS)
DDNS_DOMAIN=bssystem.iptime.org
FRONTEND_URL=http://bssystem.iptime.org:3000
BACKEND_URL=http://bssystem.iptime.org:5000

# React 앱 API URL
REACT_APP_API_BASE_URL=http://localhost:5000/api
```

### 2. MongoDB 데이터 복원 (선택사항)

기존 백업 데이터가 있다면 복원하세요.

```powershell
# MongoDB 백업 복원
npm run restore
```

### 3. 서버 실행

#### 개발 모드 (권장)

```powershell
# MongoDB + Backend + Frontend 동시 실행
npm start
```

실행 후:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **MongoDB**: mongodb://127.0.0.1:27017

#### 개별 실행

```powershell
# 방법 1: 각각 실행 (3개의 터미널 필요)
npm run start:mongodb  # 터미널 1
npm run server:dev     # 터미널 2
npm run start:frontend # 터미널 3

# 방법 2: PM2로 백그라운드 실행 (프로덕션)
npm install -g pm2
pm2 start pm2.config.js
pm2 save
pm2 startup
```

---

## 🌐 외부 접속 설정

외부에서 `http://bssystem.iptime.org:3000`으로 접속하려면 다음 설정이 필요합니다.

### 1. ipTIME 공유기 설정

#### A. DDNS 설정

1. 공유기 관리자 페이지 접속 (http://192.168.0.1)
2. **관리도구** → **고급 설정** → **특수기능** → **DDNS 설정**
3. 호스트 이름 등록: `bssystem` (전체 도메인: `bssystem.iptime.org`)
4. 등록 완료 후 상태 확인

#### B. 포트포워딩 설정

1. **관리도구** → **고급 설정** → **NAT/라우터 관리** → **포트포워드 설정**
2. 규칙 추가:

| 규칙 이름 | 외부 포트 | 내부 IP 주소 | 내부 포트 | 프로토콜 |
|----------|----------|-------------|----------|---------|
| HR_Frontend | 3000 | 192.168.0.XXX | 3000 | TCP |
| HR_Backend | 5000 | 192.168.0.XXX | 5000 | TCP |

> 💡 **내부 IP 주소 확인**:
> ```powershell
> ipconfig | Select-String "IPv4"
> ```

### 2. Windows 방화벽 설정

```powershell
# PowerShell 관리자 권한으로 실행
# Port 3000 허용 (Frontend)
New-NetFirewallRule -DisplayName "BS_HR_Frontend" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow

# Port 5000 허용 (Backend)
New-NetFirewallRule -DisplayName "BS_HR_Backend" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow
```

### 3. 고정 IP 할당 (권장)

1. 공유기 관리 페이지 → **고급 설정** → **내부 네트워크 관리** → **DHCP 서버 설정**
2. 서버 PC의 MAC 주소에 고정 IP 할당 (예: 192.168.0.100)

### 4. 환경 변수 수정 (외부 접속 활성화)

`.env` 파일에서 주석을 변경하여 외부 접속 URL로 전환:

```env
# 외부 접속용으로 변경
REACT_APP_API_BASE_URL=http://bssystem.iptime.org:5000/api
# REACT_APP_API_BASE_URL=http://localhost:5000/api  # 로컬 개발용 주석처리
```

> ⚠️ **주의**: 외부 접속용으로 변경 후에는 로컬 PC에서도 `bssystem.iptime.org`로 접속해야 합니다!

---

## ✅ 실행 및 확인

### 1. 서버 시작

```powershell
# 프로젝트 루트에서 실행
npm start
```

**콘솔 출력 확인**:
```
✅ MongoDB 연결 성공: busung_hr
🚀 서버 실행 중: http://localhost:5000
🌐 Frontend 실행 중: http://localhost:3000
```

### 2. 로컬 접속 테스트

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api/health

### 3. 외부 접속 테스트

- **Frontend**: http://bssystem.iptime.org:3000
- **Backend API**: http://bssystem.iptime.org:5000/api/health

### 4. 사내 네트워크 접속 테스트

- **Frontend**: http://192.168.0.XXX:3000
- **Backend API**: http://192.168.0.XXX:5000/api/health

---

## 🛠 문제 해결

### 1. MongoDB 연결 실패

**증상**: `MongoNetworkError: connect ECONNREFUSED 127.0.0.1:27017`

**해결**:
```powershell
# MongoDB 서비스 상태 확인
Get-Service MongoDB

# MongoDB 수동 시작
Start-Service MongoDB

# 또는 프로젝트 스크립트 사용
npm run start:mongodb
```

### 2. 포트 충돌

**증상**: `Error: listen EADDRINUSE: address already in use :::3000`

**해결**:
```powershell
# 포트 사용 프로세스 확인
netstat -ano | findstr :3000
netstat -ano | findstr :5000

# 프로세스 종료 (PID 확인 후)
taskkill /PID <PID> /F
```

### 3. CORS 에러

**증상**: `Access to fetch at 'http://...' from origin '...' has been blocked by CORS policy`

**해결**:
1. `.env` 파일에서 `FRONTEND_URL` 확인
2. `server/server.js`의 `allowedOrigins` 배열에 해당 origin 추가
3. 서버 재시작

### 4. 외부 접속 불가

**체크리스트**:
- [ ] 공유기 포트포워딩 설정 확인 (3000, 5000)
- [ ] Windows 방화벽 규칙 확인
- [ ] DDNS 도메인 등록 상태 확인 (http://iptime.org에서 확인)
- [ ] 내부 IP 고정 설정 확인
- [ ] 공인 IP 변경 여부 확인 (ISP에서 일시적 제공)

### 5. 데이터베이스 백업/복원

```powershell
# 백업 (로컬 MongoDB → JSON 파일)
npm run backup

# 복원 (JSON 파일 → MongoDB)
npm run restore
```

---

## 📊 시스템 모니터링

### 1. 서버 상태 확인

```powershell
# 실행 중인 Node.js 프로세스 확인
Get-Process node | Select-Object Id, ProcessName, CPU, WorkingSet

# MongoDB 상태 확인
Get-Service MongoDB
```

### 2. PM2 모니터링 (프로덕션)

```powershell
# PM2 대시보드
pm2 monit

# 로그 확인
pm2 logs

# 프로세스 상태
pm2 status
```

### 3. MongoDB 데이터 확인

- **MongoDB Compass** 사용 (GUI)
- 연결 URL: `mongodb://127.0.0.1:27017/busung_hr`

---

## 🔄 업데이트 방법

### 1. 코드 업데이트

```powershell
# Git pull
git pull origin FBD_One

# 의존성 재설치
npm install

# 서버 재시작
pm2 restart all  # PM2 사용 시
# 또는 npm start (개발 모드)
```

### 2. 데이터베이스 마이그레이션

```powershell
# 백업 먼저!
npm run backup

# 마이그레이션 스크립트 실행
node scripts/migrate-xxx.js
```

---

## 📚 추가 참고 자료

- [START_GUIDE.md](./START_GUIDE.md) - 시작 가이드
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - 클라우드 배포 가이드
- [PC_SERVER_DEPLOYMENT_GUIDE.md](./PC_SERVER_DEPLOYMENT_GUIDE.md) - PC 서버 상세 가이드
- [PM2_DEPLOYMENT_GUIDE.md](./PM2_DEPLOYMENT_GUIDE.md) - PM2 프로덕션 배포

---

## 🆘 지원

- GitHub Issues: [프로젝트 저장소](https://github.com/...)
- 담당자: 부성스틸 IT팀

---

**작성일**: 2026년 2월 9일  
**버전**: 1.0.0  
**브랜치**: FBD_One
