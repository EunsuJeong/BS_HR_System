# 배포 체크리스트 & 설정 (Vercel / Railway / MongoDB Atlas / Mobile)

아래는 `main` 브랜치 기준으로 재배포할 때 참고할 설정 및 check-list입니다.

## 1) 공통 환경 변수 (모든 플랫폼에 설정 필요)
- `MONGO_URI` : MongoDB Atlas 연결 문자열 (권장: username/password 포함된 SRV URI)
- `ADMIN_API_KEY` : 관리자 전용 API 키 (서버에서 관리/검증용)
- `NODE_ENV` : production
- `SENTRY_DSN` (선택)

> 주의: 비밀 값은 각 플랫폼의 "Secrets" 또는 환경변수 설정 화면에 저장하세요.

## 2) 프론트엔드 (Vercel)
- Repository를 Vercel에 연결하고 `main` 브랜치에 푸시하면 자동으로 배포되도록 설정합니다.
- Vercel 환경변수에 `REACT_APP_API_URL` 또는 서버 URL (예: `https://api.example.com`)을 설정하세요.
- CI: `.github/workflows/ci-deploy.yml`가 PR/Push 시 테스트+배포 트리거를 담당합니다.
- 필요한 Secrets: `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_ORG_ID`.

## 3) 백엔드 (Railway)
- Railway 프로젝트에 저장소를 연결하거나 CLI를 사용해 배포합니다.
- Railway의 Project Settings > Variables에 `MONGO_URI`, `ADMIN_API_KEY` 등을 설정하세요.
- `server/server.js`는 `process.env.MONGO_URI`로 Mongo에 연결하도록 되어 있습니다.
- CI: `.github/workflows/ci-deploy.yml`의 `deploy-backend` job을 사용하려면 `RAILWAY_API_KEY`, `RAILWAY_PROJECT_ID` Secret이 필요합니다.

## 4) DB (MongoDB Atlas)
- Atlas에 cluster 생성 후 Network Access(Whitelist) 및 Database User를 추가하세요.
- `MONGO_URI`는 Atlas에서 발급된 SRV connection string 사용.

## 5) 모바일(Android, Capacitor) — GitHub Actions
- Workflow: `.github/workflows/mobile-build.yml` (push to main 또는 수동 트리거 가능)
- 필요한 Secrets:
  - `ANDROID_KEYSTORE_B64` : keystore 파일을 base64로 인코딩해서 저장
  - `KEYSTORE_PASSWORD` : keystore 비밀번호
  - `KEY_ALIAS` : 키 alias
  - `KEY_PASSWORD` : 키의 비밀번호
- 워크플로우는 APK를 빌드하여 Artifact로 업로드하고(선택적으로 Release에 첨부) 됩니다.

## 6) 배포 순서 제안
1. Atlas에 연결 문자열과 DB 사용자 확인 → `MONGO_URI` 복사
2. Railway 프로젝트 설정에 `MONGO_URI`/ `ADMIN_API_KEY` 등 환경변수 설정
3. Vercel 프로젝트 연결 및 `VERCEL_*` 환경변수 설정
4. GitHub Secrets 설정 (VERCEL_TOKEN, RAILWAY_API_KEY 등)
5. main에 PR을 머지 또는 직접 push하여 Workflow 실행

---

추가로 자동 Rollback/모니터링과 관련해 원하시면 Sentry/DNS/Health-check 설정 가이드를 추가할게요.