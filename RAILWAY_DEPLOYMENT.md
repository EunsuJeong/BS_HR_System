# 🚂 Railway 백엔드 배포 가이드

부성스틸 AI 인사관리 시스템의 Node.js/Express 백엔드를 Railway에 배포하는 방법을 안내합니다.

---

## 📋 목차

1. [사전 준비](#1-사전-준비)
2. [Railway 프로젝트 생성](#2-railway-프로젝트-생성)
3. [환경 변수 설정](#3-환경-변수-설정)
4. [배포 확인](#4-배포-확인)
5. [문제 해결](#5-문제-해결)

---

## 1. 사전 준비

### ✅ 필요한 것들

- [ ] GitHub 계정 (https://github.com/EunsuJeong/BS_HR_System)
- [ ] MongoDB Atlas 연결 문자열 (이미 생성 완료)
- [ ] OpenAI API 키 (https://platform.openai.com/api-keys)
- [ ] Railway 계정 (아직 없으면 생성 예정)

### 📝 준비해야 할 정보

다음 정보들을 메모장에 준비하세요:

```
1. MongoDB 연결 문자열:
   mongodb+srv://admin:비밀번호@cluster0.xxxxx.mongodb.net/busung_hr?retryWrites=true&w=majority

2. OpenAI API 키:
   sk-proj-...

3. JWT Secret (새로 생성):
   https://randomkeygen.com/ 에서 생성
   또는 아래 예시 사용
```

#### JWT Secret 생성 방법:

**옵션 1: 온라인 생성기 사용**
```
https://randomkeygen.com/
→ "CodeIgniter Encryption Keys" 섹션의 값 복사
```

**옵션 2: 직접 생성**
```
busung-hr-2024-super-secret-jwt-key-please-change-this-to-random-string-minimum-32-characters
```

**옵션 3: 터미널에서 생성**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 2. Railway 프로젝트 생성

### Step 2-1: Railway 접속 및 로그인

1. **Railway 웹사이트 접속**
   ```
   https://railway.app
   ```

2. **로그인 또는 회원가입**

   화면 우측 상단 **"Login"** 클릭

   ```
   ┌────────────────────────────────────┐
   │  Login with GitHub   ← 이것 클릭!  │
   │  Login with Email                  │
   └────────────────────────────────────┘
   ```

   **"Login with GitHub"** 선택 (권장)

3. **GitHub 권한 승인**
   - Railway가 GitHub 리포지토리에 접근 권한 요청
   - **"Authorize Railway"** 클릭

4. **로그인 완료**
   - Railway 대시보드로 이동

---

### Step 2-2: 새 프로젝트 생성

1. **"New Project" 버튼 클릭**

   대시보드에서 보라색 **"New Project"** 버튼 클릭

2. **배포 방법 선택**

   ```
   ┌─────────────────────────────────────────┐
   │ Deploy from GitHub repo  ← 이것 선택!  │
   │ Deploy from Template                    │
   │ Empty Project                           │
   └─────────────────────────────────────────┘
   ```

   **"Deploy from GitHub repo"** 선택

3. **GitHub 리포지토리 선택**

   리포지토리 목록이 표시됩니다:

   ```
   검색창에 "BS_HR_System" 입력

   또는 목록에서 찾기:
   ☐ EunsuJeong/BS_HR_System  ← 이것 선택!
   ```

   **"BS_HR_System"** 리포지토리 클릭

4. **"Deploy Now" 클릭**

   Railway가 자동으로 배포를 시작합니다.

---

### Step 2-3: 초기 배포 대기

배포가 시작되면 다음과 같은 화면이 표시됩니다:

```
┌──────────────────────────────────────┐
│  Building...                         │
│  ████████░░░░░░░░░░░░░ 60%          │
│                                      │
│  Running: npm install                │
└──────────────────────────────────────┘
```

⏱️ **초기 배포 시간**: 약 2-5분 소요

**주의**: 환경 변수가 없어서 아직 정상 작동하지 않습니다!
다음 단계에서 환경 변수를 설정해야 합니다.

---

## 3. 환경 변수 설정

### Step 3-1: Variables 탭으로 이동

1. 배포된 프로젝트 화면에서
2. 상단 탭 중 **"Variables"** 클릭

---

### Step 3-2: 환경 변수 추가

**"New Variable"** 버튼을 클릭하여 아래 변수들을 하나씩 추가합니다.

#### 필수 환경 변수 (7개)

---

#### ① MONGO_URI (MongoDB 연결)

```
Variable Name: MONGO_URI
Value: mongodb+srv://admin:비밀번호@cluster0.xxxxx.mongodb.net/busung_hr?retryWrites=true&w=majority
```

⚠️ **주의사항:**
- MongoDB Atlas에서 복사한 연결 문자열 사용
- `<password>`를 실제 비밀번호로 교체했는지 확인
- `/busung_hr` 데이터베이스 이름 포함되어 있는지 확인

**"Add"** 클릭

---

#### ② JWT_SECRET (인증 보안키)

```
Variable Name: JWT_SECRET
Value: busung-hr-2024-super-secret-jwt-key-please-change-this-to-random-string-minimum-32-characters
```

⚠️ **주의사항:**
- 최소 32자 이상의 랜덤 문자열
- 절대 공유하지 말 것
- 프로덕션에서는 반드시 강력한 랜덤 문자열 사용

**"Add"** 클릭

---

#### ③ OPENAI_API_KEY (AI 기능)

```
Variable Name: OPENAI_API_KEY
Value: sk-proj-your-openai-api-key-here
```

**OpenAI API 키 발급:**
1. https://platform.openai.com/api-keys 접속
2. "Create new secret key" 클릭
3. 이름 입력 (예: BS_HR_System)
4. 생성된 키 복사 (한 번만 표시됨!)

**"Add"** 클릭

---

#### ④ AI_PROVIDER (AI 제공자)

```
Variable Name: AI_PROVIDER
Value: openai
```

**"Add"** 클릭

---

#### ⑤ AI_MODEL (AI 모델)

```
Variable Name: AI_MODEL
Value: gpt-4o-mini
```

⚠️ **추천 모델:**
- `gpt-4o-mini`: 비용 효율적, 빠름 (권장)
- `gpt-4o`: 더 정확하지만 비용 높음
- `gpt-3.5-turbo`: 저렴하지만 성능 낮음

**"Add"** 클릭

---

#### ⑥ FRONTEND_URL (CORS 설정)

```
Variable Name: FRONTEND_URL
Value: http://localhost:3000
```

⚠️ **중요:**
- 처음에는 `http://localhost:3000`으로 설정
- Vercel 배포 완료 후 실제 URL로 변경 필요!
- 예: `https://bs-hr-system.vercel.app`

**"Add"** 클릭

---

#### ⑦ PORT (Railway 자동 설정)

Railway가 자동으로 설정하므로 **추가하지 않아도 됩니다**.

만약 추가하고 싶다면:
```
Variable Name: PORT
Value: 5000
```

---

### Step 3-3: 선택적 환경 변수

#### Gemini 사용 시 (선택사항)

```
Variable Name: GEMINI_API_KEY
Value: your-gemini-api-key-here
```

Google Gemini를 사용하려는 경우에만 추가

---

### Step 3-4: 환경 변수 확인

모든 환경 변수를 추가했으면 Variables 화면에서 확인:

```
✅ 추가된 환경 변수 목록:

MONGO_URI          mongodb+srv://admin:***@...
JWT_SECRET         ********************************
OPENAI_API_KEY     sk-proj-*********************
AI_PROVIDER        openai
AI_MODEL           gpt-4o-mini
FRONTEND_URL       http://localhost:3000

(선택) GEMINI_API_KEY     AI*********************
```

---

### Step 3-5: 재배포

환경 변수를 추가하면 Railway가 자동으로 재배포를 시작합니다.

```
┌──────────────────────────────────────┐
│  Redeploying...                      │
│  ████████████████████ 100%           │
│                                      │
│  ✅ Deployment successful            │
└──────────────────────────────────────┘
```

⏱️ **재배포 시간**: 약 1-2분

---

## 4. 배포 확인

### Step 4-1: 배포 URL 확인

1. **Settings 탭** 클릭
2. **Domains** 섹션으로 스크롤
3. 생성된 URL 확인

```
Generated Domain:
https://bs-hr-system-production.up.railway.app

또는

https://bs-hr-system-production-xxxx.railway.app
```

**"Copy"** 버튼으로 URL 복사

---

### Step 4-2: 배포 로그 확인

1. **Deployments 탭** 클릭
2. 최신 배포 클릭
3. 로그 확인

**성공적인 배포 로그:**
```
✅ MongoDB 연결 성공
🚀 Server running on http://localhost:5000
🔌 Socket.io ready for real-time updates
```

**에러가 있는 경우:**
```
❌ MongoDB 연결 실패: Authentication failed
→ MONGO_URI 확인 필요
```

---

### Step 4-3: 브라우저에서 테스트

1. 복사한 Railway URL을 브라우저에 붙여넣기
   ```
   https://bs-hr-system-production.up.railway.app
   ```

2. 다음 메시지가 표시되면 성공!
   ```
   부성스틸 AI 인사관리 서버 정상 동작 중 ✅
   ```

---

### Step 4-4: API 엔드포인트 테스트 (선택사항)

브라우저나 Postman에서 테스트:

```
GET https://bs-hr-system-production.up.railway.app/api/employees

응답 예시:
{
  "employees": [...],
  "total": 50
}
```

---

## 5. 문제 해결

### 🔴 "Application failed to respond" 에러

**원인:**
- 서버가 시작되지 않음
- PORT 환경 변수 문제

**해결:**
1. Deployments → 최신 배포 → Logs 확인
2. 에러 메시지 확인
3. 환경 변수 재확인

---

### 🔴 "MongoDB connection failed" 에러

**원인:**
- MONGO_URI가 잘못됨
- MongoDB Atlas Network Access 설정 문제

**해결:**
1. MONGO_URI 확인:
   - `<password>` 제거했는지 확인
   - 특수문자 URL 인코딩 확인
   - 데이터베이스 이름 `/busung_hr` 포함 확인

2. MongoDB Atlas 확인:
   - Network Access → 0.0.0.0/0 허용되어 있는지 확인

---

### 🔴 "Build failed" 에러

**원인:**
- npm install 실패
- package.json 문제

**해결:**
1. GitHub 리포지토리 확인
2. package.json 파일이 루트에 있는지 확인
3. Railway에서 "Redeploy" 시도

---

### 🔴 환경 변수가 적용되지 않음

**해결:**
1. Variables 탭에서 환경 변수 확인
2. 오타 확인 (대소문자 구분!)
3. 변경 후 자동 재배포 대기 (1-2분)

---

## 📋 배포 완료 체크리스트

- [ ] Railway 계정 생성 및 로그인 완료
- [ ] GitHub 리포지토리 연결 완료
- [ ] 환경 변수 7개 모두 추가 완료
  - [ ] MONGO_URI
  - [ ] JWT_SECRET
  - [ ] OPENAI_API_KEY
  - [ ] AI_PROVIDER
  - [ ] AI_MODEL
  - [ ] FRONTEND_URL
- [ ] 재배포 완료 (로그 확인)
- [ ] 배포 URL 복사 완료
- [ ] 브라우저 테스트 성공 ("서버 정상 동작 중" 메시지 확인)

---

## 🎯 다음 단계

Railway 백엔드 배포가 완료되었습니다! ✅

### 배포 URL 저장

```
Railway 백엔드 URL:
https://bs-hr-system-production.up.railway.app

⚠️ 이 URL을 복사하여 저장하세요!
Vercel 프론트엔드 배포 시 필요합니다.
```

### Vercel 프론트엔드 배포로 이동

1. **VERCEL_DEPLOYMENT.md** 파일 참고
2. 또는 **DEPLOYMENT_CHECKLIST.md**의 3단계로 이동

환경 변수에 사용할 URL:
```
REACT_APP_API_BASE_URL=https://[railway-url].railway.app/api
REACT_APP_SERVER_URL=https://[railway-url].railway.app
```

---

## 💡 유용한 팁

### Railway CLI 사용 (선택사항)

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 로그 실시간 확인
railway logs

# 환경 변수 확인
railway variables

# 재배포
railway up
```

### 배포 모니터링

1. **Metrics 탭**: CPU, 메모리 사용량 확인
2. **Deployments 탭**: 배포 히스토리 확인
3. **Logs 탭**: 실시간 로그 확인

### 비용 확인

Railway 무료 플랜:
- $5 크레딧/월 제공
- 초과 시 자동 중지 (또는 결제)

**Settings → Usage**에서 확인 가능

---

## 📞 도움이 필요하시면

- Railway 공식 문서: https://docs.railway.app
- 배포 체크리스트: DEPLOYMENT_CHECKLIST.md
- 환경 변수 가이드: ENV_VARIABLES.md

---

**Railway 백엔드 배포 완료!** 🎉
