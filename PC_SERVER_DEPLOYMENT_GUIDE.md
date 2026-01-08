# 🖥️ Windows PC + PM2 배포 가이드

브랜치: pc-server-no-railway (Railway 의존성 제거, 사내 서버 단독 운영)

부성스틸 AI 인사관리 시스템을 Windows 사내 PC에서 PM2를 사용해 운영하는 완벽한 가이드입니다.

---

## 📋 사전 준비

### 필수 설치 항목

- [ ] Node.js 18.x 이상 ([https://nodejs.org](https://nodejs.org))
- [ ] npm (Node.js 설치 시 자동 포함)
- [ ] Git (버전 관리용)
- [ ] PM2 (`npm install -g pm2`)

### 확인 사항

```bash
# 터미널에서 확인
node --version          # v18.x.x 이상
npm --version           # 9.x.x 이상
git --version           # 2.x.x 이상
pm2 --version           # 5.x.x 이상
```

---

## 🚀 배포 단계별 가이드

### Step 1: 프로젝트 클론 및 의존성 설치

```bash
# 프로젝트 클론 (또는 기존 폴더로 이동)
git clone https://github.com/EunsuJeong/BS_HR_System.git
cd BS_HR_System

# 의존성 설치
npm install

# PM2 글로벌 설치 (아직 안 했다면)
npm install -g pm2
```

---

### Step 2: 환경 변수 설정

```bash
# .env 파일 생성 (.env.example에서 복사)
cp .env.example .env

# 텍스트 에디터로 .env 파일 편집
# (Windows: 메모장, VSCode, Notepad++ 등)
```

#### .env 파일 예시 (Windows PC용)

```bash
# 환경 설정
NODE_ENV=production
PORT=5000
TZ=Asia/Seoul
IS_INTERNAL_SERVER=true      # self-ping 비활성화 (사내 PC는 항상 온라인)

# 데이터베이스 (MongoDB Atlas)
MONGO_URI=mongodb+srv://admin:비밀번호@cluster.mongodb.net/busung_hr
MONGODB_URI=mongodb+srv://admin:비밀번호@cluster.mongodb.net/busung_hr

# 인증
JWT_SECRET=최소32자이상의강력한랜덤문자열

# AI 설정
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-proj-your-key-here
GEMINI_API_KEY=your-gemini-key-here (선택)

# CORS 설정
FRONTEND_URL=http://localhost:3000

# 공휴일 API (선택)
HOLIDAY_API_KEY=your-key-here
```

**주의사항**:

- `MONGO_URI`의 비밀번호에 특수문자가 있으면 URL 인코딩 필요 (@→%40, :→%3A)
- `JWT_SECRET`은 최소 32자 이상의 강력한 랜덤 문자열 (온라인 생성 도구 사용: https://randomkeygen.com)
- `.env` 파일은 `.gitignore`에 포함되어 있으므로 Git에 커밋되지 않음
- **`IS_INTERNAL_SERVER=true`는 필수** (self-ping 비활성화)

---

### Step 3: PM2 시작

```bash
# PM2로 애플리케이션 시작
pm2 start pm2.config.js

# 또는 직접 실행
pm2 start ./server/server.js --name "bs-hr-backend" --instances max

# 상태 확인
pm2 list
pm2 status

# 로그 확인
pm2 logs bs-hr-backend

# 특정 프로세스 로그 실시간 모니터링
pm2 logs bs-hr-backend --lines 50 --follow
```

---

### Step 4: 자동 시작 설정 (선택사항 - 재부팅 시 자동 시작)

```bash
# Windows에서 PM2 자동 시작 설정
pm2 startup

# 설정 저장
pm2 save

# 확인
pm2 startup

# 재부팅 후 서비스 시작 확인
# (컴퓨터 재부팅 후)
pm2 list
```

**주의**: Windows 관리자 권한이 필요할 수 있습니다.

---

### Step 5: 백엔드 서버 테스트

```bash
# 헬스 체크
curl http://localhost:5000/api/health

# 또는 브라우저에서
# http://localhost:5000/api/health

# 응답 예시
{
  "status": "ok",
  "timestamp": "2026-01-07T...",
  "uptime": 123.456,
  "message": "부성스틸 AI 인사관리 서버 정상 동작 중"
}
```

---

### Step 6: 프론트엔드 설정 (Vercel)

Vercel 대시보드에서 다음 환경 변수를 Windows PC 서버로 변경:

```bash
# Railway 대신 Windows PC 서버 URL 사용
REACT_APP_API_BASE_URL=http://192.168.x.x:5000/api
REACT_APP_SERVER_URL=http://192.168.x.x:5000
# 또는 컴퓨터명 사용
# REACT_APP_API_BASE_URL=http://[컴퓨터명]:5000/api

# 나머지는 동일
REACT_APP_AI_PROVIDER=openai
REACT_APP_HOLIDAY_API_KEY=...
ESLINT_NO_DEV_ERRORS=true
DISABLE_ESLINT_PLUGIN=true
```

---

## 🔧 PM2 관리 명령어

### 기본 명령

| 명령                        | 설명                                  |
| --------------------------- | ------------------------------------- |
| `pm2 start pm2.config.js`   | 설정 파일로 시작                      |
| `pm2 list`                  | 실행 중인 프로세스 목록               |
| `pm2 stop bs-hr-backend`    | 프로세스 중지                         |
| `pm2 restart bs-hr-backend` | 프로세스 재시작                       |
| `pm2 reload bs-hr-backend`  | 무중단 재시작 (클러스터 모드)         |
| `pm2 delete bs-hr-backend`  | 프로세스 삭제                         |
| `pm2 logs bs-hr-backend`    | 로그 확인                             |
| `pm2 monit`                 | 모니터링 대시보드 (실시간 CPU/메모리) |
| `pm2 save`                  | 설정 저장                             |
| `pm2 startup`               | 자동 시작 설정                        |

### 로그 관리

```bash
# 실시간 로그 모니터링
pm2 logs bs-hr-backend --follow

# 최근 50줄 로그
pm2 logs bs-hr-backend --lines 50

# 에러 로그만
pm2 logs bs-hr-backend --err

# 로그 파일 위치
# ./logs/pm2-error.log      (에러)
# ./logs/pm2-out.log        (표준 출력)
# ./logs/pm2-combined.log   (병합)
```

---

## 🌐 방화벽 설정 (중요)

### Windows Defender 방화벽 개방

```powershell
# PowerShell(관리자)에서 실행

# 5000 포트 인바운드 규칙 추가
New-NetFirewallRule -DisplayName "BS HR System" `
  -Direction Inbound `
  -LocalPort 5000 `
  -Protocol TCP `
  -Action Allow

# 규칙 확인
Get-NetFirewallRule -DisplayName "BS HR System" | Get-NetFirewallPortFilter
```

### 또는 GUI를 통한 설정

1. **설정 > 개인 정보 및 보안 > Windows 방화벽**
2. **고급 설정** 클릭
3. **인바운드 규칙** > **새 규칙**
4. **포트** 선택 > **다음**
5. **TCP** 선택, **특정 로컬 포트**: `5000` 입력
6. **연결 허용** > **다음**
7. **프로필** 모두 선택 > **완료**

---

## 📊 실시간 모니터링

### PM2 모니터 대시보드

```bash
pm2 monit
```

터미널에서 실시간 CPU, 메모리, 로그 모니터링 가능

### 웹 기반 모니터링 (선택)

```bash
# PM2+ 클라우드 모니터링 (유료)
pm2 link

# 로컬 웹 대시보드 (무료 - PM2 5.3.0 이상)
pm2 web
# http://localhost:9615 에서 접속
```

---

## 🆘 문제 해결

### 포트 이미 사용 중

```bash
# 포트 5000을 사용 중인 프로세스 확인
netstat -ano | findstr :5000

# 프로세스 종료 (PID 찾아서)
taskkill /PID [PID번호] /F

# 또는 다른 포트 사용 (.env에서 PORT 변경)
```

### 서버 시작 안 됨

```bash
# 로그 확인
pm2 logs bs-hr-backend --err

# 일반적인 원인:
# 1. MONGO_URI 연결 실패 → MongoDB Atlas 연결 확인
# 2. PORT 이미 사용 중 → 다른 포트로 변경
# 3. 환경 변수 누락 → .env 파일 확인
# 4. Node.js 버전 → node --version 확인 (18.x 이상)
```

### 높은 메모리 사용

```bash
# PM2 메모리 자동 재시작 설정 (pm2.config.js에 이미 설정)
max_memory_restart: '500M'

# 수동 재시작
pm2 restart bs-hr-backend
```

### 에러: "Cannot find module"

```bash
# 의존성 재설치
npm install

# 캐시 초기화
npm cache clean --force

# 재시작
pm2 restart bs-hr-backend
```

---

## 📝 유지보수

### 정기 백업

```bash
# MongoDB 수동 백업
npm run backup

# 백업 파일 위치: ./backups/backup_[timestamp].json
```

### 로그 정리 (선택)

```bash
# 30일 이상 된 로그 삭제
Get-ChildItem ./logs -Filter "*.log" | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-30)} | Remove-Item
```

### 업데이트

```bash
# 최신 코드 풀
git pull origin main

# 의존성 업데이트
npm install

# 서버 재시작
pm2 restart bs-hr-backend
```

---

## 🔐 보안 권장사항

### 1. 환경 변수 보안

- [ ] `.env` 파일 권한 설정 (소유자만 읽을 수 있도록)
- [ ] 강력한 JWT_SECRET 사용 (최소 32자)
- [ ] 정기적으로 API 키 갱신

### 2. 방화벽 설정

- [ ] 필요한 포트(5000)만 개방
- [ ] 사내 IP 대역에서만 접근 제한 (선택)

### 3. MongoDB 보안

- [ ] 강력한 비밀번호 사용
- [ ] Network Access에서 IP 제한 (선택)

### 4. 정기 점검

- [ ] 로그 모니터링
- [ ] 성능 모니터링 (CPU, 메모리)
- [ ] 정기 백업

---

## 📌 Railway에서 이전했을 때 체크리스트

| 항목                    | 상태 | 비고                          |
| ----------------------- | ---- | ----------------------------- |
| IS_INTERNAL_SERVER=true | ✅   | .env 설정 필수                |
| .env 파일 생성          | ✅   | 실제 값으로 설정              |
| MongoDB 연결 확인       | ✅   | MONGO_URI 테스트              |
| PM2 시작됨              | ✅   | pm2 list 확인                 |
| 방화벽 개방됨           | ✅   | 포트 5000                     |
| 프론트엔드 URL 업데이트 | ✅   | Vercel REACT_APP_API_BASE_URL |
| 헬스 체크 성공          | ✅   | /api/health 응답              |

---

## 📞 자주 묻는 질문 (FAQ)

### Q1: 컴퓨터 재부팅 후 서비스가 자동으로 시작 안 됩니다

**A**: `pm2 startup` 및 `pm2 save`를 다시 실행하고, 관리자 권한으로 재부팅 후 확인하세요.

```bash
pm2 startup
pm2 save
# 컴퓨터 재부팅
```

### Q2: 포트 5000 외 다른 포트를 사용하고 싶습니다

**A**: `.env` 파일에서 `PORT` 값을 변경하고, pm2를 재시작한 후 방화벽 규칙도 수정하세요.

```bash
# .env 수정
PORT=8000

# PM2 재시작
pm2 restart bs-hr-backend

# 방화벽 규칙 추가 (위의 "방화벽 설정" 참조)
```

### Q3: CORS 에러가 발생합니다

**A**: `.env` 파일의 `FRONTEND_URL`이 실제 프론트엔드 주소와 일치하는지 확인하세요.

```bash
# .env 예시 (사내 네트워크)
FRONTEND_URL=http://192.168.x.x:3000

# 또는 컴퓨터명
FRONTEND_URL=http://[컴퓨터명]:3000
```

### Q4: MongoDB 연결이 안 됩니다

**A**: 다음을 확인하세요:

1. `MONGO_URI` 문법 확인
2. MongoDB Atlas 특수문자 인코딩 (@→%40, :→%3A)
3. MongoDB Atlas Network Access 설정 (IP 화이트리스트)
4. 인터넷 연결 확인

```bash
# 로그에서 에러 확인
pm2 logs bs-hr-backend --err
```

---

## 🎯 다음 단계

1. **개발/테스트**: 로컬에서 `npm start`로 테스트
2. **PM2 배포**: 이 가이드를 따라 Windows PC에 배포
3. **프론트엔드 연결**: Vercel 환경 변수 업데이트
4. **모니터링**: PM2 대시보드로 정기 점검

---

**성공적인 배포를 기원합니다! 🚀**

질문이나 문제가 있으면 로그를 먼저 확인하세요:

```bash
pm2 logs bs-hr-backend
```
