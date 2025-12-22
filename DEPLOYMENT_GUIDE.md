# 🚀 배포 가이드

부성스틸 AI 인사관리 시스템을 프로덕션 환경에 배포하는 가이드입니다.

## 📋 배포 아키텍처

```
┌─────────────────┐
│  프론트엔드      │  Vercel (React)
│  Vercel         │  https://your-app.vercel.app
└────────┬────────┘
         │ API 요청
         ↓
┌─────────────────┐
│  백엔드         │  Railway (Node.js/Express)
│  Railway        │  https://your-app.railway.app
└────────┬────────┘
         │ DB 연결
         ↓
┌─────────────────┐
│  데이터베이스    │  MongoDB Atlas
│  MongoDB Atlas  │  mongodb+srv://...
└─────────────────┘
```

---

## 1️⃣ MongoDB Atlas 설정

### 1.1 클러스터 생성
1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) 로그인
2. "Create New Cluster" 클릭
3. 무료 tier (M0) 선택
4. Region: Seoul (ap-northeast-2) 권장
5. Cluster Name: `busung-hr` 또는 원하는 이름

### 1.2 데이터베이스 사용자 생성
1. Security → Database Access
2. "Add New Database User" 클릭
3. Authentication Method: Password
4. Username과 Password 입력 (나중에 사용)
5. Database User Privileges: "Atlas admin" 선택

### 1.3 네트워크 접근 허용
1. Security → Network Access
2. "Add IP Address" 클릭
3. "Allow Access from Anywhere" 선택 (0.0.0.0/0)
   - 또는 Railway IP 범위만 허용 (보안 강화)

### 1.4 연결 문자열 확인
1. Database → Connect → Drivers
2. Driver: Node.js, Version: 4.1 이상
3. 연결 문자열 복사:
```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/busung_hr?retryWrites=true&w=majority
```

---

## 2️⃣ Railway 백엔드 배포

### 2.1 Railway 프로젝트 생성
1. [Railway](https://railway.app) 로그인
2. "New Project" → "Deploy from GitHub repo" 선택
3. GitHub 저장소 연결 및 선택

### 2.2 환경 변수 설정
Railway Dashboard → Variables 탭에서 다음 환경 변수 설정:

```bash
# MongoDB Atlas 연결 (필수)
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/busung_hr

# JWT 시크릿 (필수 - 강력한 랜덤 문자열로 변경)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-RANDOM-STRING-HERE

# AI API 키 (필수)
OPENAI_API_KEY=sk-...your-openai-api-key...
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini

# Gemini 사용 시 (선택)
GEMINI_API_KEY=your-gemini-api-key

# 프론트엔드 URL (CORS 설정용)
FRONTEND_URL=https://your-app.vercel.app

# PORT는 Railway가 자동 설정 (설정 불필요)
```

### 2.3 배포 확인
1. Deploy 탭에서 배포 로그 확인
2. 성공 시 URL 생성: `https://your-app.railway.app`
3. 브라우저에서 접속하여 확인:
   - `https://your-app.railway.app` → "부성스틸 AI 인사관리 서버 정상 동작 중 ✅" 표시

### 2.4 Railway 설정 확인
- Settings → Build Command: `npm install` (자동)
- Settings → Start Command: `node server/server.js` (Procfile 사용)
- Settings → Root Directory: `/` (기본값)

---

## 3️⃣ Vercel 프론트엔드 배포

### 3.1 Vercel 프로젝트 생성
1. [Vercel](https://vercel.com) 로그인
2. "Add New..." → "Project" 선택
3. GitHub 저장소 Import

### 3.2 프로젝트 설정
- Framework Preset: **Create React App**
- Root Directory: `./` (변경 안함)
- Build Command: `npm run build`
- Output Directory: `build`
- Install Command: `npm install`

### 3.3 환경 변수 설정
Settings → Environment Variables에서 다음 변수 추가:

```bash
# Railway 백엔드 URL (필수)
REACT_APP_API_BASE_URL=https://your-app.railway.app/api
REACT_APP_SERVER_URL=https://your-app.railway.app

# AI 설정
REACT_APP_AI_PROVIDER=openai
REACT_APP_OPENAI_API_KEY=sk-...your-openai-api-key...

# 공휴일 API
REACT_APP_HOLIDAY_API_KEY=your-holiday-api-key

# 개발 환경 설정
ESLINT_NO_DEV_ERRORS=true
DISABLE_ESLINT_PLUGIN=true
```

### 3.4 배포 및 확인
1. Deploy 버튼 클릭
2. 빌드 로그 확인
3. 배포 완료 시 URL 생성: `https://your-app.vercel.app`
4. 브라우저에서 접속하여 확인

---

## 4️⃣ Railway 환경 변수 업데이트

Vercel 배포 후 Railway의 `FRONTEND_URL` 업데이트:

```bash
FRONTEND_URL=https://your-app.vercel.app
```

Railway는 자동으로 재배포됩니다.

---

## 5️⃣ 배포 후 확인 사항

### 5.1 백엔드 API 테스트
```bash
# 서버 상태 확인
curl https://your-app.railway.app

# API 테스트 (예: 공지사항 조회)
curl https://your-app.railway.app/api/notices
```

### 5.2 프론트엔드 기능 테스트
1. 로그인 기능
2. 대시보드 데이터 로딩
3. AI 챗봇 기능
4. 실시간 알림 (Socket.io)

### 5.3 CORS 확인
- 브라우저 개발자 도구 → Console에서 CORS 에러 확인
- 에러 발생 시: Railway 환경 변수 `FRONTEND_URL` 확인

---

## 6️⃣ 로컬 개발 환경

로컬에서 개발할 때는 `.env` 파일 사용:

```bash
# .env 파일 생성
cp .env.example .env

# 필요한 값 입력
# - MONGO_URI: 로컬 MongoDB 또는 Atlas
# - OPENAI_API_KEY 등
```

### 로컬 실행
```bash
# 전체 시스템 (MongoDB + 백엔드 + 프론트엔드)
npm start

# 프론트엔드만
npm run start:frontend

# 백엔드만
npm run server:dev
```

---

## 7️⃣ 업데이트 배포

### 코드 업데이트 시
1. GitHub에 푸시
2. Railway와 Vercel이 자동으로 재배포
3. 배포 로그 확인

### 환경 변수 변경 시
1. Railway/Vercel Dashboard에서 변경
2. 재배포 (자동 또는 수동)

---

## 8️⃣ 문제 해결

### 빌드 실패
- **Railway**: Deploy 탭 → Logs 확인
- **Vercel**: Deployments → 실패한 배포 클릭 → Build Logs 확인

### CORS 에러
```
Access to fetch at 'https://...' from origin 'https://...' has been blocked by CORS policy
```
→ Railway 환경 변수 `FRONTEND_URL` 확인

### MongoDB 연결 실패
```
MongoServerError: bad auth : Authentication failed
```
→ Atlas 사용자 이름/비밀번호 확인, Network Access 확인

### API 호출 404
→ `REACT_APP_API_BASE_URL`이 올바른 Railway URL인지 확인

---

## 9️⃣ 보안 권장 사항

1. **환경 변수 보안**
   - `.env` 파일 절대 Git에 커밋하지 않기
   - 강력한 `JWT_SECRET` 사용 (최소 32자 랜덤 문자열)

2. **MongoDB Atlas**
   - IP Whitelist 설정 (0.0.0.0/0 대신 Railway IP만 허용)
   - 강력한 데이터베이스 비밀번호 사용

3. **API 키 관리**
   - OpenAI API 키 사용량 모니터링
   - Rate limiting 설정 고려

4. **HTTPS**
   - Railway와 Vercel 모두 자동 HTTPS 제공
   - HTTP로 접근 시 HTTPS로 리다이렉트

---

## 🔟 유용한 명령어

```bash
# Vercel CLI 설치
npm install -g vercel

# Vercel 로컬 테스트
vercel dev

# Vercel 프로덕션 배포
vercel --prod

# Railway CLI 설치
npm install -g @railway/cli

# Railway 로그 확인
railway logs

# Railway 환경 변수 확인
railway variables
```

---

## 📞 지원

문제가 발생하면:
1. Railway/Vercel 배포 로그 확인
2. 브라우저 개발자 도구 Console 확인
3. `.env.example` 파일과 환경 변수 비교

---

## ✅ 배포 체크리스트

- [ ] MongoDB Atlas 클러스터 생성
- [ ] Atlas 데이터베이스 사용자 생성
- [ ] Atlas Network Access 설정
- [ ] Railway 프로젝트 생성
- [ ] Railway 환경 변수 설정
- [ ] Railway 배포 확인
- [ ] Vercel 프로젝트 생성
- [ ] Vercel 환경 변수 설정
- [ ] Vercel 배포 확인
- [ ] Railway FRONTEND_URL 업데이트
- [ ] 전체 기능 테스트 완료

배포가 완료되었습니다! 🎉
