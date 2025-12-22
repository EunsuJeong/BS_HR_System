# 🚀 배포 체크리스트

부성스틸 AI 인사관리 시스템 배포를 위한 단계별 체크리스트입니다.

---

## 📋 사전 준비

### 필요한 계정
- [ ] GitHub 계정 (완료 ✅)
- [ ] MongoDB Atlas 계정 (https://www.mongodb.com/cloud/atlas)
- [ ] Railway 계정 (https://railway.app)
- [ ] Vercel 계정 (https://vercel.com)
- [ ] OpenAI API 키 (https://platform.openai.com/api-keys)

---

## 1️⃣ MongoDB Atlas 설정 (데이터베이스)

### Step 1: 클러스터 생성
- [ ] MongoDB Atlas 로그인
- [ ] "Create New Cluster" 클릭
- [ ] **Tier**: M0 (무료) 선택
- [ ] **Region**: Seoul (ap-northeast-2) 선택
- [ ] **Cluster Name**: `busung-hr` 입력
- [ ] "Create Cluster" 클릭

### Step 2: 데이터베이스 사용자 생성
- [ ] Security → Database Access 메뉴
- [ ] "Add New Database User" 클릭
- [ ] **Authentication Method**: Password 선택
- [ ] **Username**: `admin` (기억할 것!)
- [ ] **Password**: 강력한 비밀번호 입력 (기억할 것!)
- [ ] **Database User Privileges**: "Atlas admin" 선택
- [ ] "Add User" 클릭

### Step 3: 네트워크 접근 허용
- [ ] Security → Network Access 메뉴
- [ ] "Add IP Address" 클릭
- [ ] "Allow Access from Anywhere" 선택 (0.0.0.0/0)
- [ ] "Confirm" 클릭

### Step 4: 연결 문자열 복사
- [ ] Database → Connect 클릭
- [ ] "Drivers" 선택
- [ ] **Driver**: Node.js 선택
- [ ] **Version**: 4.1 이상 선택
- [ ] 연결 문자열 복사 (아래 형식):
```
mongodb+srv://admin:<password>@busung-hr.xxxxx.mongodb.net/busung_hr?retryWrites=true&w=majority
```
- [ ] `<password>`를 실제 비밀번호로 교체
- [ ] ✅ **이 문자열을 안전한 곳에 저장!**

---

## 2️⃣ Railway 백엔드 배포

### Step 1: 프로젝트 생성
- [ ] Railway 로그인 (https://railway.app)
- [ ] "New Project" 클릭
- [ ] "Deploy from GitHub repo" 선택
- [ ] GitHub 계정 연결 (권한 승인)
- [ ] `EunsuJeong/BS_HR_System` 리포지토리 선택
- [ ] Railway가 자동으로 배포 시작

### Step 2: 환경 변수 설정
- [ ] 프로젝트 → Variables 탭 클릭
- [ ] 다음 환경 변수들을 **하나씩** 추가:

#### 필수 환경 변수:
```bash
# 데이터베이스 (MongoDB Atlas에서 복사한 연결 문자열)
MONGO_URI=mongodb+srv://admin:<password>@busung-hr.xxxxx.mongodb.net/busung_hr?retryWrites=true&w=majority

# JWT 시크릿 (강력한 랜덤 문자열 - 아래 예시 참고)
JWT_SECRET=busung-hr-2024-super-secret-key-change-this-random-string-32chars-minimum

# OpenAI API 키
OPENAI_API_KEY=sk-proj-your-openai-api-key-here
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini

# 프론트엔드 URL (나중에 Vercel 배포 후 업데이트)
FRONTEND_URL=http://localhost:3000
```

#### 선택 환경 변수 (Gemini 사용 시):
```bash
GEMINI_API_KEY=your-gemini-api-key-here
```

- [ ] 모든 환경 변수 입력 완료
- [ ] Railway가 자동으로 재배포되는지 확인

### Step 3: 배포 URL 확인
- [ ] Deployments 탭에서 배포 완료 확인
- [ ] Settings → Domains에서 URL 확인
- [ ] URL 형식: `https://bs-hr-system-production.up.railway.app`
- [ ] ✅ **이 URL을 안전한 곳에 저장!**

### Step 4: 백엔드 테스트
- [ ] 브라우저에서 Railway URL 접속
- [ ] "부성스틸 AI 인사관리 서버 정상 동작 중 ✅" 메시지 확인

---

## 3️⃣ Vercel 프론트엔드 배포

### Step 1: 프로젝트 생성
- [ ] Vercel 로그인 (https://vercel.com)
- [ ] "Add New..." → "Project" 클릭
- [ ] "Import Git Repository" 클릭
- [ ] GitHub 계정 연결 (권한 승인)
- [ ] `EunsuJeong/BS_HR_System` 리포지토리 선택
- [ ] "Import" 클릭

### Step 2: 프로젝트 설정
- [ ] **Framework Preset**: Create React App (자동 감지)
- [ ] **Root Directory**: `./` (변경 안함)
- [ ] **Build Command**: `npm run build` (자동 설정)
- [ ] **Output Directory**: `build` (자동 설정)
- [ ] **Install Command**: `npm install` (자동 설정)

### Step 3: 환경 변수 설정
- [ ] "Environment Variables" 섹션 펼치기
- [ ] 다음 환경 변수들을 **하나씩** 추가:

```bash
# Railway 백엔드 URL (위에서 저장한 Railway URL 사용)
REACT_APP_API_BASE_URL=https://bs-hr-system-production.up.railway.app/api
REACT_APP_SERVER_URL=https://bs-hr-system-production.up.railway.app

# AI 설정 (Railway와 동일한 값 사용)
REACT_APP_AI_PROVIDER=openai
REACT_APP_OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# 공휴일 API (선택사항)
REACT_APP_HOLIDAY_API_KEY=603c88ccf76cf95f2e1c8ffe7dfa6be2fd88feb4bd6e3000a0293c308885e111

# 개발 환경 설정
ESLINT_NO_DEV_ERRORS=true
DISABLE_ESLINT_PLUGIN=true
```

- [ ] "Deploy" 클릭

### Step 4: 배포 URL 확인
- [ ] 배포 완료 대기 (3-5분 소요)
- [ ] 배포 완료 후 URL 확인
- [ ] URL 형식: `https://bs-hr-system.vercel.app`
- [ ] ✅ **이 URL을 안전한 곳에 저장!**

---

## 4️⃣ Railway 환경 변수 업데이트

### Vercel URL을 Railway에 추가
- [ ] Railway 대시보드로 돌아가기
- [ ] Variables 탭 클릭
- [ ] `FRONTEND_URL` 찾기
- [ ] 값을 Vercel URL로 업데이트:
```bash
FRONTEND_URL=https://bs-hr-system.vercel.app
```
- [ ] Railway가 자동으로 재배포되는지 확인

---

## 5️⃣ 최종 테스트

### 프론트엔드 테스트
- [ ] Vercel URL로 접속: `https://bs-hr-system.vercel.app`
- [ ] 로그인 페이지가 제대로 표시되는지 확인
- [ ] 브라우저 개발자 도구 (F12) → Console 탭 확인
- [ ] CORS 에러가 없는지 확인

### 백엔드 API 테스트
- [ ] 테스트 관리자 계정으로 로그인 시도
- [ ] 대시보드가 제대로 로드되는지 확인
- [ ] AI 챗봇 기능 테스트
- [ ] 공지사항 조회/작성 테스트

### 데이터베이스 확인
- [ ] MongoDB Atlas → Database → Collections
- [ ] 데이터가 제대로 저장되는지 확인

---

## 6️⃣ 보안 체크리스트

### 환경 변수 확인
- [ ] `.env` 파일이 Git에 커밋되지 않았는지 확인
- [ ] GitHub 리포지토리를 **Private**으로 설정했는지 확인
- [ ] JWT_SECRET이 강력한 랜덤 문자열인지 확인 (최소 32자)
- [ ] OpenAI API 키가 노출되지 않았는지 확인

### MongoDB Atlas 보안
- [ ] 데이터베이스 비밀번호가 강력한지 확인
- [ ] Network Access가 올바르게 설정되었는지 확인
- [ ] (선택) IP Whitelist를 Railway IP로 제한

### API 키 관리
- [ ] OpenAI API 사용량 모니터링 설정
- [ ] 월별 사용량 제한 설정 (예산 초과 방지)

---

## 7️⃣ 배포 완료 확인

### 모든 항목 체크
- [ ] MongoDB Atlas 클러스터 생성 및 연결 성공
- [ ] Railway 백엔드 배포 성공
- [ ] Vercel 프론트엔드 배포 성공
- [ ] 환경 변수 모두 설정 완료
- [ ] CORS 에러 없음
- [ ] 로그인 기능 정상 작동
- [ ] AI 챗봇 기능 정상 작동
- [ ] 데이터 저장/조회 정상 작동

---

## 📌 배포 완료 정보 기록

배포가 완료되면 아래 정보를 기록하세요:

```
✅ 배포 완료 일자: _______________

🌐 프론트엔드 URL (Vercel):
https://_______________

🔧 백엔드 URL (Railway):
https://_______________

💾 데이터베이스 (MongoDB Atlas):
Cluster: _______________
Database: busung_hr

🔑 관리자 계정:
ID: _______________
Password: _______________
```

---

## 🆘 문제 해결

### CORS 에러 발생 시
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```
✅ Railway Variables에서 `FRONTEND_URL`이 Vercel URL과 정확히 일치하는지 확인

### MongoDB 연결 실패 시
```
MongoServerError: bad auth : Authentication failed
```
✅ MongoDB Atlas 사용자 이름/비밀번호 확인
✅ Network Access에서 0.0.0.0/0 허용되어 있는지 확인

### 빌드 실패 시
✅ Vercel Deployments → 실패한 배포 클릭 → Build Logs 확인
✅ 환경 변수가 모두 설정되어 있는지 확인

### API 호출 404 에러 시
✅ `REACT_APP_API_BASE_URL`에 `/api`가 포함되어 있는지 확인
✅ Railway URL이 올바른지 확인

---

## 🎉 축하합니다!

모든 체크리스트를 완료하셨다면 배포가 성공적으로 완료된 것입니다!

📧 문의사항이 있으시면 DEPLOYMENT_GUIDE.md를 참고하세요.
