# 🏢 부성스틸 AI 인사관리 시스템

부성스틸의 직원 관리, 근태 관리, 급여 관리, AI 추천 시스템을 통합한 웹 기반 인사관리 시스템입니다.

[![React](https://img.shields.io/badge/React-19.1.1-61dafb?logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.18-47A248?logo=mongodb)](https://www.mongodb.com/)
[![Express](https://img.shields.io/badge/Express-5.1-000000?logo=express)](https://expressjs.com/)

---

## 📋 목차

- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [시작하기](#시작하기)
- [배포 가이드](#배포-가이드)
- [프로젝트 구조](#프로젝트-구조)
- [문서](#문서)

---

## ✨ 주요 기능

### 👨‍💼 직원 관리
- 직원 정보 등록 및 조회
- 부서/직급/직책 관리
- 직원 통계 및 대시보드

### ⏰ 근태 관리
- 출퇴근 기록 관리
- 교대 근무 스케줄 (주간/야간/잔업)
- 월별 근태 현황 및 통계
- 엑셀 업로드/다운로드

### 📅 연차 관리
- 연차 신청 및 승인 프로세스
- 연차 잔여 일수 자동 계산
- 연차 사용 내역 조회
- 만료 예정 연차 알림

### 💰 급여 관리
- 급여 정보 등록 및 조회
- 급여 명세서 생성
- 급여 내역 마스킹 처리 (보안)

### 🤖 AI 챗봇 & 추천 시스템
- OpenAI/Gemini 기반 AI 챗봇
- 인사 규정 기반 자동 추천
- 연차/근태 관련 AI 상담
- 대화 기록 저장 및 조회

### 📢 공지사항 & 알림
- 공지사항 작성 및 조회
- 예약 공지 기능
- 실시간 알림 (Socket.io)
- 파일 첨부 지원

### 📆 일정 관리
- 회사 일정 등록 및 조회
- 공휴일 자동 연동 (공공데이터 API)
- 캘린더 뷰

### 💬 건의사항
- 직원 건의사항 접수
- 건의사항 승인/반려 처리
- 건의사항 통계

---

## 🛠 기술 스택

### Frontend
- **React** 19.1.1
- **Tailwind CSS** 3.4.17
- **Lucide React** (아이콘)
- **Chart.js** (차트)
- **Socket.io Client** (실시간 통신)
- **XLSX** (엑셀 처리)

### Backend
- **Node.js** 18.x
- **Express** 5.1
- **MongoDB** 8.18 (Mongoose)
- **Socket.io** (실시간 통신)
- **JWT** (인증)
- **Multer** (파일 업로드)
- **Bcrypt** (비밀번호 암호화)

### AI/ML
- **OpenAI API** (GPT-4o-mini)
- **Google Gemini API** (선택사항)

### 배포
- **Frontend**: Vercel
- **Backend**: Railway
- **Database**: MongoDB Atlas

---

## 🚀 시작하기

### 사전 요구사항

- Node.js 18.x 이상
- MongoDB (로컬 또는 Atlas)
- npm 또는 yarn

### 설치

```bash
# 리포지토리 클론
git clone https://github.com/EunsuJeong/BS_HR_System.git
cd BS_HR_System

# 의존성 설치
npm install
```

### 환경 변수 설정

```bash
# .env 파일 생성
cp .env.example .env

# .env 파일 편집
# - MONGO_URI: MongoDB 연결 문자열
# - JWT_SECRET: JWT 시크릿 키
# - OPENAI_API_KEY: OpenAI API 키
# - 기타 필요한 환경 변수
```

### 로컬 실행

```bash
# 전체 시스템 실행 (MongoDB + 백엔드 + 프론트엔드)
npm start

# 프론트엔드만 실행
npm run start:frontend

# 백엔드만 실행
npm run server:dev
```

프론트엔드: http://localhost:3000
백엔드: http://localhost:5000

### 기본 관리자 계정

```
ID: admin
Password: admin123
```

---

## 📦 배포 가이드

### 빠른 배포

상세한 배포 가이드는 다음 문서를 참고하세요:

📖 **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - 단계별 배포 체크리스트
📖 **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - 상세 배포 가이드
📖 **[ENV_VARIABLES.md](./ENV_VARIABLES.md)** - 환경 변수 설정 가이드

### 배포 순서

1. **MongoDB Atlas** 설정
   - 클러스터 생성 (M0 무료)
   - 데이터베이스 사용자 생성
   - 연결 문자열 복사

2. **Railway** 백엔드 배포
   - GitHub 리포지토리 연결
   - 환경 변수 설정
   - 자동 배포

3. **Vercel** 프론트엔드 배포
   - GitHub 리포지토리 연결
   - 환경 변수 설정
   - 자동 배포

4. **CORS 설정 업데이트**
   - Railway의 `FRONTEND_URL`을 Vercel URL로 변경

---

## 📁 프로젝트 구조

```
BS_HR_System/
├── public/                 # 정적 파일
├── src/                    # React 프론트엔드
│   ├── api/               # API 클라이언트
│   ├── components/        # React 컴포넌트
│   │   ├── admin/        # 관리자 컴포넌트
│   │   ├── staff/        # 직원 컴포넌트
│   │   └── common/       # 공통 컴포넌트
│   ├── contexts/         # React Context
│   └── App.js            # 메인 앱
├── server/                # Express 백엔드
│   ├── models/           # Mongoose 모델
│   ├── routes/           # API 라우트
│   ├── utils/            # 유틸리티
│   └── server.js         # 서버 진입점
├── scripts/              # 유틸리티 스크립트
├── .env.example          # 환경 변수 템플릿
├── railway.json          # Railway 배포 설정
├── vercel.json           # Vercel 배포 설정
└── package.json          # 의존성
```

---

## 📚 문서

### 배포 관련
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - 배포 체크리스트
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - 배포 가이드
- [ENV_VARIABLES.md](./ENV_VARIABLES.md) - 환경 변수 가이드

### 운영 관련
- [START_GUIDE.md](./START_GUIDE.md) - 시작 가이드
- [BACKUP_GUIDE.md](./BACKUP_GUIDE.md) - 백업 가이드
- [DATABASE_GUIDE.md](./DATABASE_GUIDE.md) - 데이터베이스 가이드

### 개발 관련
- [PROVIDER-INTEGRATION-GUIDE.md](./PROVIDER-INTEGRATION-GUIDE.md) - AI Provider 통합 가이드
- [SECURITY-MODEL-POLICY.md](./SECURITY-MODEL-POLICY.md) - 보안 모델 정책

---

## 🔒 보안

- JWT 기반 인증
- bcrypt 비밀번호 암호화
- CORS 설정
- 환경 변수 기반 설정 관리
- 급여 정보 마스킹 처리

---

## 🤝 기여

이 프로젝트는 부성스틸 내부 시스템입니다.

---

## 📄 라이선스

This project is private and proprietary.

---

## 📧 문의

프로젝트 관련 문의사항은 이슈를 생성해주세요.

---

## 🙏 감사의 말

- [Create React App](https://create-react-app.dev/)
- [Express](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [OpenAI](https://openai.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**부성스틸 AI 인사관리 시스템** - Built with ❤️
