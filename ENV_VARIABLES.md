# 🔐 환경 변수 설정 가이드

배포 시 필요한 환경 변수들을 플랫폼별로 정리한 문서입니다.

---

## 📋 Railway 환경 변수 (백엔드)

Railway Dashboard → Variables 탭에서 다음 변수들을 추가하세요.

### 필수 환경 변수

```bash
# ==================== 데이터베이스 ====================
# MongoDB Atlas 연결 문자열
# MongoDB Atlas에서 복사한 후 <password>를 실제 비밀번호로 교체
MONGO_URI=mongodb+srv://admin:<password>@busung-hr.xxxxx.mongodb.net/busung_hr?retryWrites=true&w=majority

# ==================== 보안 ====================
# JWT 시크릿 키 (최소 32자 이상의 랜덤 문자열)
# 온라인 랜덤 생성기 사용 권장: https://randomkeygen.com/
JWT_SECRET=busung-hr-2024-super-secret-jwt-key-change-this-to-random-string-minimum-32-characters

# ==================== AI 설정 ====================
# OpenAI API 키 (https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# AI Provider 설정
AI_PROVIDER=openai

# AI 모델 선택 (gpt-4o-mini 권장 - 비용 효율적)
AI_MODEL=gpt-4o-mini

# ==================== CORS 설정 ====================
# Vercel 프론트엔드 URL (Vercel 배포 후 업데이트)
# 처음에는 localhost로, Vercel 배포 완료 후 실제 URL로 변경
FRONTEND_URL=http://localhost:3000
# 배포 후: FRONTEND_URL=https://bs-hr-system.vercel.app
```

### 선택적 환경 변수

```bash
# ==================== Google Gemini (선택사항) ====================
# Gemini를 사용하는 경우에만 추가
GEMINI_API_KEY=your-gemini-api-key-here
```

---

## 📋 Vercel 환경 변수 (프론트엔드)

Vercel Dashboard → Settings → Environment Variables에서 추가하세요.

### 필수 환경 변수

```bash
# ==================== 백엔드 연결 ====================
# Railway 백엔드 URL (Railway 배포 완료 후 복사)
REACT_APP_API_BASE_URL=https://bs-hr-system-production.up.railway.app/api
REACT_APP_SERVER_URL=https://bs-hr-system-production.up.railway.app

# ==================== AI 설정 ====================
# AI Provider 설정
REACT_APP_AI_PROVIDER=openai

# OpenAI API 키 (Railway와 동일한 키 사용)
REACT_APP_OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# ==================== 외부 API ====================
# 공휴일 API 키 (공공데이터포털)
# 기본값 사용 가능 (아래 키는 테스트용)
REACT_APP_HOLIDAY_API_KEY=603c88ccf76cf95f2e1c8ffe7dfa6be2fd88feb4bd6e3000a0293c308885e111

# ==================== 개발 환경 설정 ====================
# ESLint 에러를 경고로 변경 (빌드 실패 방지)
ESLINT_NO_DEV_ERRORS=true
DISABLE_ESLINT_PLUGIN=true
```

---

## 🔄 배포 순서별 환경 변수 설정

### 1단계: MongoDB Atlas 설정
```bash
# MongoDB Atlas에서 클러스터 생성 후 연결 문자열 복사
# 형식: mongodb+srv://<username>:<password>@cluster.xxxxx.mongodb.net/database_name
```

### 2단계: Railway 백엔드 배포
```bash
# Railway Variables에 추가:
MONGO_URI=mongodb+srv://...         # MongoDB Atlas 연결 문자열
JWT_SECRET=...                       # 강력한 랜덤 문자열 (32자 이상)
OPENAI_API_KEY=sk-proj-...          # OpenAI API 키
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
FRONTEND_URL=http://localhost:3000  # 임시 (Vercel 배포 후 업데이트)
```

### 3단계: Vercel 프론트엔드 배포
```bash
# Vercel Environment Variables에 추가:
REACT_APP_API_BASE_URL=https://[railway-url].railway.app/api
REACT_APP_SERVER_URL=https://[railway-url].railway.app
REACT_APP_AI_PROVIDER=openai
REACT_APP_OPENAI_API_KEY=sk-proj-...
REACT_APP_HOLIDAY_API_KEY=...
ESLINT_NO_DEV_ERRORS=true
DISABLE_ESLINT_PLUGIN=true
```

### 4단계: Railway FRONTEND_URL 업데이트
```bash
# Railway Variables에서 업데이트:
FRONTEND_URL=https://[vercel-url].vercel.app  # Vercel 실제 URL로 변경
```

---

## 🔑 API 키 발급 가이드

### OpenAI API 키 발급
1. https://platform.openai.com 접속
2. 로그인 후 API Keys 메뉴
3. "Create new secret key" 클릭
4. 키 이름 입력 (예: BS_HR_System)
5. 생성된 키 복사 (한 번만 표시됨!)
6. ✅ 안전한 곳에 보관

### Google Gemini API 키 발급 (선택사항)
1. https://makersuite.google.com/app/apikey 접속
2. "Create API key" 클릭
3. 프로젝트 선택 또는 새로 생성
4. 생성된 키 복사
5. ✅ 안전한 곳에 보관

### 공휴일 API 키 발급 (선택사항)
1. https://www.data.go.kr 접속
2. 회원가입 및 로그인
3. "특일 정보 조회" API 검색
4. 활용 신청
5. 발급된 키 복사
6. ✅ 안전한 곳에 보관

---

## ⚠️ 보안 주의사항

### 절대 하지 말아야 할 것
- ❌ `.env` 파일을 Git에 커밋하지 마세요
- ❌ API 키를 코드에 하드코딩하지 마세요
- ❌ API 키를 공개 저장소에 올리지 마세요
- ❌ API 키를 스크린샷으로 공유하지 마세요

### 반드시 해야 할 것
- ✅ `.env` 파일은 `.gitignore`에 포함되어 있는지 확인
- ✅ JWT_SECRET은 강력한 랜덤 문자열 사용 (32자 이상)
- ✅ API 키는 환경 변수로만 관리
- ✅ GitHub 리포지토리를 Private으로 설정
- ✅ OpenAI API 사용량 모니터링 및 한도 설정

---

## 📝 환경 변수 템플릿

### Railway 환경 변수 복사용 템플릿

```bash
MONGO_URI=
JWT_SECRET=
OPENAI_API_KEY=
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
FRONTEND_URL=
```

### Vercel 환경 변수 복사용 템플릿

```bash
REACT_APP_API_BASE_URL=
REACT_APP_SERVER_URL=
REACT_APP_AI_PROVIDER=openai
REACT_APP_OPENAI_API_KEY=
REACT_APP_HOLIDAY_API_KEY=
ESLINT_NO_DEV_ERRORS=true
DISABLE_ESLINT_PLUGIN=true
```

---

## 🔍 환경 변수 확인 방법

### Railway에서 확인
```bash
# Railway CLI 설치 후
railway variables

# 또는 Dashboard → Variables 탭에서 확인
```

### Vercel에서 확인
```bash
# Vercel CLI 설치 후
vercel env ls

# 또는 Dashboard → Settings → Environment Variables에서 확인
```

### 로컬에서 테스트
```bash
# .env 파일 생성
cp .env.example .env

# 필요한 값 입력 후 로컬 실행
npm start
```

---

## 🆘 문제 해결

### "환경 변수가 인식되지 않습니다"
- Vercel: 변수 이름이 `REACT_APP_`로 시작하는지 확인
- Railway: 변수 저장 후 재배포 되었는지 확인

### "CORS 에러 발생"
- Railway `FRONTEND_URL`이 Vercel URL과 정확히 일치하는지 확인
- URL 끝에 `/`가 없는지 확인

### "MongoDB 연결 실패"
- `MONGO_URI`에서 `<password>`를 실제 비밀번호로 교체했는지 확인
- 연결 문자열에 특수문자가 있으면 URL 인코딩 필요

---

## 📌 체크리스트

배포 전 환경 변수 설정 확인:

- [ ] MongoDB Atlas 연결 문자열 복사 완료
- [ ] JWT_SECRET 생성 완료 (32자 이상)
- [ ] OpenAI API 키 발급 완료
- [ ] Railway 환경 변수 모두 입력 완료
- [ ] Railway 배포 URL 확인 완료
- [ ] Vercel 환경 변수 모두 입력 완료
- [ ] Vercel 배포 URL 확인 완료
- [ ] Railway FRONTEND_URL을 Vercel URL로 업데이트 완료
- [ ] 전체 기능 테스트 완료

---

모든 환경 변수가 올바르게 설정되었다면 배포 준비가 완료되었습니다! 🎉
