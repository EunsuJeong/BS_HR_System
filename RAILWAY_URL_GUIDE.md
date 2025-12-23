# Railway 백엔드 URL 확인 가이드

모바일 앱에서 로그인이 안 되는 이유는 API URL이 `localhost`로 설정되어 있기 때문입니다.
Railway에 배포한 백엔드 URL로 변경해야 합니다.

---

## Railway URL 확인 방법

### Step 1: Railway 대시보드 접속

1. **Railway 로그인**:
   ```
   https://railway.app
   ```

2. **프로젝트 선택**:
   - "BS_HR_System" 또는 배포한 프로젝트 클릭

### Step 2: 배포 URL 확인

1. **Settings 탭 클릭**

2. **Domains 섹션 찾기**:
   ```
   Domains
   ├── Generated Domain
   │   └── https://bs-hr-system-production.up.railway.app
   │       또는
   │   └── https://bs-hr-system-production-xxxx.railway.app
   └── Custom Domain (선택사항)
   ```

3. **URL 복사**:
   - Generated Domain의 URL을 복사하세요
   - 예시: `https://bs-hr-system-production.up.railway.app`

---

## 모바일 앱에 Railway URL 적용

### 방법 1: .env.production 파일 수정 (권장)

1. **`.env.production` 파일 열기**

2. **Railway URL 입력**:
   ```bash
   # Railway URL로 변경
   REACT_APP_API_BASE_URL=https://bs-hr-system-production.up.railway.app/api
   ```

3. **저장**

### 방법 2: GitHub Actions 환경 변수 설정

`.github/workflows/build-apk.yml` 파일을 수정하여 빌드 시 환경 변수를 주입할 수도 있습니다.

---

## 로컬 네트워크에서 테스트 (임시)

Railway 배포 없이 로컬 서버로 테스트하려면:

### Step 1: 로컬 PC의 IP 주소 확인

**Windows**:
```powershell
ipconfig
```
결과에서 "IPv4 주소" 확인:
```
무선 LAN 어댑터 Wi-Fi:
   IPv4 주소 . . . . . . . . . : 192.168.0.123
```

**Mac/Linux**:
```bash
ifconfig
```

### Step 2: 로컬 서버 실행

```bash
npm start
```

서버가 `http://localhost:5000`에서 실행됩니다.

### Step 3: .env.production 수정

```bash
# 로컬 IP로 변경 (같은 WiFi에 연결된 기기만 접근 가능)
REACT_APP_API_BASE_URL=http://192.168.0.123:5000/api
```

⚠️ **주의**:
- PC와 모바일 기기가 같은 WiFi 네트워크에 연결되어 있어야 합니다
- 방화벽에서 5000 포트를 허용해야 할 수 있습니다
- 프로덕션 배포에는 적합하지 않습니다

---

## APK 재빌드 및 재배포

Railway URL을 `.env.production` 파일에 설정한 후:

### Step 1: 변경사항 커밋

```bash
git add .env.production
git commit -m "feat: Add production environment variables for mobile app"
git push origin main
```

### Step 2: GitHub Actions 자동 빌드 대기

- GitHub Actions가 자동으로 새 APK를 빌드합니다 (약 5분)
- https://github.com/EunsuJeong/BS_HR_System/actions

### Step 3: 새 APK 다운로드

1. 최신 워크플로우 클릭
2. Artifacts → "bs-hr-system-debug" 다운로드
3. 모바일 기기에 설치

---

## 테스트

새 APK를 설치한 후:

1. **앱 실행**
2. **로그인 시도**:
   - 관리자 계정으로 로그인 테스트
   - 네트워크 연결 확인

3. **문제 해결**:
   - 로그인 실패 시 → Railway 서버 상태 확인
   - "네트워크 오류" 시 → URL 설정 확인
   - CORS 오류 시 → Railway 환경 변수의 FRONTEND_URL 확인

---

## Railway 서버 상태 확인

Railway 서버가 정상 작동하는지 확인:

```bash
# 브라우저나 curl로 테스트
curl https://bs-hr-system-production.up.railway.app

# 정상 응답:
부성스틸 AI 인사관리 서버 정상 동작 중 ✅
```

---

## CORS 설정 확인

Railway 환경 변수에서 FRONTEND_URL이 올바르게 설정되어 있는지 확인:

**Railway 대시보드 → Variables 탭**:
```
FRONTEND_URL = https://your-vercel-app.vercel.app
또는
FRONTEND_URL = *  (모든 도메인 허용 - 개발용)
```

모바일 앱의 경우 CORS를 모든 출처에서 허용해야 할 수 있습니다.

---

## 문제 해결 체크리스트

- [ ] Railway 서버가 정상 실행 중인지 확인
- [ ] Railway URL을 `.env.production`에 올바르게 입력
- [ ] `.env.production` 파일을 커밋 및 푸시
- [ ] GitHub Actions에서 새 APK 빌드 완료
- [ ] 새 APK를 모바일에 설치 (이전 버전 제거 후)
- [ ] 같은 WiFi 네트워크에 연결 (로컬 IP 사용 시)
- [ ] Railway 환경 변수 FRONTEND_URL 확인

---

## 빠른 해결 방법

Railway URL이 확인되면 다음 명령어를 실행하세요:

```bash
# .env.production 파일 생성/수정 (Railway URL 입력)
echo "REACT_APP_API_BASE_URL=https://YOUR-RAILWAY-URL.railway.app/api" > .env.production

# 변경사항 커밋 및 푸시
git add .env.production
git commit -m "feat: Configure production API URL for mobile app"
git push origin main

# GitHub Actions 빌드 확인
# https://github.com/EunsuJeong/BS_HR_System/actions
```

---

**Railway URL을 확인하고 알려주시면, 바로 설정을 도와드리겠습니다!**
