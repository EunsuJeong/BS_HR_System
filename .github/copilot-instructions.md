# 부성스틸 AI 인사관리 시스템 - GitHub Copilot 가이드

이 문서는 GitHub Copilot이 프로젝트의 구조, 배포 방법, 개발 규칙을 이해하도록 돕습니다.

---

## 📋 프로젝트 개요

### 시스템 구성
- **Frontend**: React 19.1.1 + Tailwind CSS (Vercel 배포)
- **Backend**: Node.js 18.x + Express 5.1 (Railway 배포)
- **Database**: MongoDB Atlas (클라우드)
- **Mobile**: Capacitor Android (GitHub Actions APK 빌드)
- **AI**: OpenAI GPT-4o-mini / Google Gemini

### 주요 기능
- 직원/근태/연차/급여 관리
- AI 챗봇 및 인사 규정 기반 추천 시스템
- 실시간 알림 (Socket.io)
- 공지사항, 일정, 건의사항 관리

---

## 🚀 배포 방법

### 자동 배포 (CI/CD) - 권장 방법

**트리거**: `main` 브랜치에 push 시 자동 실행

```bash
# 배포 프로세스
git add .
git commit -m "메시지"
git push origin main
```

**GitHub Actions 워크플로우**:

1. **`.github/workflows/ci-deploy.yml`** (Frontend + Backend)
   - 테스트 실행 (`npm test`)
   - Frontend → Vercel 자동 배포
   - Backend → Railway 자동 배포

2. **`.github/workflows/mobile-build.yml`** (Android)
   - React 빌드 → Capacitor sync
   - Android APK 빌드 (Release)
   - GitHub Releases에 APK 업로드

### 수동 배포

```bash
# Frontend만 배포 (Vercel CLI)
npm run deploy:frontend          # 프로덕션
npm run deploy:frontend:preview  # 미리보기

# Backend는 Railway CLI 또는 대시보드에서 수동 배포
railway up
```

### 배포 시 주의사항

1. **환경 변수 확인**
   - Vercel: `REACT_APP_API_BASE_URL`, `REACT_APP_SOCKET_URL`
   - Railway: `MONGO_URI`, `PORT`, `OPENAI_API_KEY`, `FRONTEND_URL`
   - **보안:** OpenAI API 키는 **절대로** 프론트엔드에 노출하지 마세요. `OPENAI_API_KEY`는 백엔드(Railway)에만 보관하고, 프론트엔드는 백엔드를 통해 AI 기능을 호출해야 합니다.

2. **CORS 설정**
   - `server/server.js`에서 `FRONTEND_URL` 확인
   - Vercel 배포 URL로 업데이트 필요

3. **배포 전 체크리스트**
   - 로컬 테스트 완료 (`npm start`)
   - MongoDB Atlas 연결 확인
   - API 엔드포인트 테스트
   - 환경 변수 설정 확인

---

## 🏗 프로젝트 구조

```
BS_JUNG(0107)/
├── .github/
│   └── workflows/
│       ├── ci-deploy.yml       # Vercel/Railway 배포
│       ├── mobile-build.yml    # Android APK 빌드
│       └── build-apk.yml       # APK 빌드 (deprecated)
│
├── src/                        # React Frontend
│   ├── api/                   # API 클라이언트
│   ├── components/
│   │   ├── admin/            # 관리자 컴포넌트
│   │   ├── staff/            # 직원 컴포넌트
│   │   └── common/           # 공통 컴포넌트
│   ├── contexts/             # React Context (AuthContext 등)
│   └── App.js                # 메인 앱
│
├── server/                     # Express Backend
│   ├── models/                # Mongoose 스키마
│   ├── routes/                # API 라우트
│   ├── utils/                 # 유틸리티 (AI Provider 등)
│   └── server.js              # 서버 진입점
│
├── scripts/                    # 유틸리티 스크립트
│   ├── backup.js              # MongoDB 백업
│   └── restore.js             # MongoDB 복원
│
├── android/                    # Capacitor Android 프로젝트
├── capacitor.config.json       # Capacitor 설정
├── railway.json                # Railway 배포 설정
├── vercel.json                 # Vercel 배포 설정
└── package.json                # 의존성
```

---

## 🔧 개발 규칙

### 코드 스타일
- **Frontend**: React Hooks + Functional Components
- **Backend**: Express Router 패턴
- **상태 관리**: React Context API
- **스타일링**: Tailwind CSS (Utility-first)

### API 엔드포인트 규칙
```javascript
// 표준 CRUD 패턴
GET    /api/employees          // 목록 조회
GET    /api/employees/:id      // 단일 조회
POST   /api/employees          // 생성
PUT    /api/employees/:id      // 수정
DELETE /api/employees/:id      // 삭제
```

### 인증
- JWT 토큰 기반 (`localStorage`에 저장)
- `AuthContext`로 전역 상태 관리
- Protected Routes: `/admin/*` (관리자), `/staff/*` (직원)

### 환경 변수
- 로컬: `.env` 파일 (`.env.example` 참고)
- 프로덕션: Vercel/Railway 대시보드에서 설정
- 절대 `.env` 파일을 커밋하지 말 것

---

## 🛠 자주 사용하는 명령어

### 로컬 개발
```bash
npm start                    # 전체 시스템 (MongoDB + Backend + Frontend)
npm run start:frontend       # Frontend만 (port 3000)
npm run server:dev          # Backend만 (port 5000)
```

### 배포
```bash
npm run deploy:frontend              # Vercel 프로덕션 배포
npm run deploy:frontend:preview      # Vercel 미리보기
```

### 유틸리티
```bash
npm run backup                       # MongoDB 백업
npm run restore                      # MongoDB 복원
npm run cleanup:schedules            # 유령 스케줄 정리
```

### Git 워크플로우
```bash
# 기능 개발
git checkout -b feature/new-feature
git commit -m "feat: 새로운 기능 추가"
git push origin feature/new-feature

# main 브랜치로 merge 시 자동 배포
git checkout main
git merge feature/new-feature
git push origin main  # → GitHub Actions 트리거
```

---

## 🤖 AI 챗봇 관련

### AI Provider 설정
- 기본: OpenAI GPT-4o-mini
- 대체: Google Gemini (환경 변수로 전환 가능)
- 설정 파일: `server/utils/aiProviders.js`

### AI 추천 시스템
- 연차 신청 시 자동 추천 제공
- 근태 데이터 기반 인사이트
- 인사 규정 기반 답변

---

## 🔐 보안 주의사항

1. **비밀번호**: bcrypt로 암호화 (salt rounds: 10)
2. **JWT**: 시크릿 키는 환경 변수로 관리
3. **급여 정보**: 마스킹 처리 (일반 직원은 본인 정보만 조회)
4. **CORS**: 프로덕션에서는 특정 도메인만 허용
5. **API 키**: 절대 클라이언트에 노출하지 말 것

---

## 📝 커밋 메시지 규칙

```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 추가/수정
chore: 빌드/배포 설정 변경
ci: CI/CD 설정 변경
```

---

## 📚 참고 문서

- [DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md) - 배포 체크리스트
- [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) - 상세 배포 가이드
- [ENV_VARIABLES.md](../ENV_VARIABLES.md) - 환경 변수 가이드
- [START_GUIDE.md](../START_GUIDE.md) - 시작 가이드

---

## ⚠️ 재배포가 필요한 경우

### Frontend 재배포 (Vercel)
- React 컴포넌트 수정
- 환경 변수 변경 (REACT_APP_*)
- UI/UX 변경

**방법**: `main` 브랜치에 push → 자동 배포

### Backend 재배포 (Railway)
- API 엔드포인트 수정
- 서버 로직 변경
- 환경 변수 변경 (MONGODB_URI, OPENAI_API_KEY 등)

**방법**: `main` 브랜치에 push → 자동 배포

### Mobile 재빌드 (Android)
- Capacitor 설정 변경
- 네이티브 기능 추가

**방법**: `main` 브랜치에 push → GitHub Actions에서 APK 자동 빌드

---

## 🎯 Copilot 사용 팁

### 효과적인 프롬프트 예시

```
// ❌ 나쁜 예
"연차 관리 기능 만들어줘"

// ✅ 좋은 예
"@workspace 연차 신청 API 엔드포인트를 만들어줘.
- 라우트: POST /api/leave-requests
- 요청 본문: { employeeId, leaveType, startDate, endDate, reason }
- 검증: 연차 잔여일수 확인
- 응답: 생성된 연차 신청 객체 반환
- 기존 패턴: server/routes/ 폴더의 다른 라우트 참고"
```

### 프로젝트 컨텍스트 활용
```
@workspace 현재 프로젝트의 배포 구조를 설명해줘
@workspace 연차 관리 API는 어디에 있어?
@workspace MongoDB 스키마 구조를 알려줘
```

---

**이 파일은 GitHub Copilot이 자동으로 참조합니다. 프로젝트 규칙이 변경되면 이 문서도 업데이트하세요.**
