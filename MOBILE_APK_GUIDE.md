# 부성스틸 HR 시스템 - 모바일 APK 빌드 가이드

부성스틸 AI 인사관리 시스템을 Android 모바일 앱(APK)으로 빌드하고 배포하는 방법을 안내합니다.

---

## 목차

1. [프로젝트 구성](#1-프로젝트-구성)
2. [GitHub Actions를 통한 자동 빌드](#2-github-actions를-통한-자동-빌드)
3. [로컬에서 빌드 (Android Studio 필요)](#3-로컬에서-빌드)
4. [APK 다운로드 및 설치](#4-apk-다운로드-및-설치)
5. [QR 코드를 통한 배포](#5-qr-코드를-통한-배포)

---

## 1. 프로젝트 구성

### Capacitor 설정

프로젝트는 이미 Capacitor를 사용하여 모바일 앱으로 변환할 수 있도록 설정되어 있습니다.

**설정 파일**: `capacitor.config.ts`
```typescript
{
  appId: 'com.busungsteel.hr',
  appName: 'BS HR System',
  webDir: 'build'
}
```

### 주요 파일 구조

```
BS_MIN(1217)/
├── android/                  # Capacitor Android 프로젝트
│   ├── app/
│   │   └── build/
│   │       └── outputs/
│   │           └── apk/     # 빌드된 APK 위치
│   └── gradlew              # Gradle 빌드 도구
├── build/                   # React 프로덕션 빌드
├── .github/
│   └── workflows/
│       └── build-apk.yml    # GitHub Actions 워크플로우
└── capacitor.config.ts      # Capacitor 설정
```

---

## 2. GitHub Actions를 통한 자동 빌드

### 방법 1: 자동 빌드 (권장)

GitHub에 코드를 푸시하면 자동으로 APK가 빌드됩니다.

#### Step 2-1: 코드 푸시

```bash
git add .
git commit -m "Update mobile app"
git push origin main
```

#### Step 2-2: 빌드 확인

1. GitHub 리포지토리 접속:
   ```
   https://github.com/EunsuJeong/BS_HR_System
   ```

2. **Actions** 탭 클릭

3. 최신 워크플로우 실행 확인:
   ```
   "Build Android APK" 워크플로우가 실행 중...
   ```

4. 빌드 완료 대기 (약 5-10분)

#### Step 2-3: APK 다운로드

빌드가 완료되면:

1. 완료된 워크플로우 클릭
2. **Artifacts** 섹션 찾기
3. **bs-hr-system-debug** 다운로드
4. ZIP 파일 압축 해제
5. `app-debug.apk` 파일 확인

---

### 방법 2: 수동 빌드 트리거

GitHub에서 수동으로 빌드를 시작할 수 있습니다.

#### 수동 빌드 실행

1. GitHub 리포지토리 → **Actions** 탭
2. **"Build Android APK"** 워크플로우 선택
3. **"Run workflow"** 버튼 클릭
4. 브랜치 선택 (main)
5. **"Run workflow"** 확인

빌드가 시작되고 완료되면 Artifacts에서 APK를 다운로드할 수 있습니다.

---

## 3. 로컬에서 빌드

로컬에서 APK를 빌드하려면 Android Studio가 필요합니다.

### 사전 요구사항

- Node.js 18 이상
- Android Studio
- Java JDK 17

### Step 3-1: Android Studio 설치

1. **Android Studio 다운로드**:
   ```
   https://developer.android.com/studio
   ```

2. **설치 및 SDK 설정**:
   - Android Studio 실행
   - SDK Manager 열기 (Tools → SDK Manager)
   - Android 13 (API 33) 설치
   - Android SDK Build-Tools 설치

### Step 3-2: 환경 변수 설정

**Windows (PowerShell):**
```powershell
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\<사용자명>\AppData\Local\Android\Sdk', 'User')
```

**macOS/Linux:**
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

### Step 3-3: 프로젝트 빌드

```bash
# 의존성 설치
npm install

# React 앱 빌드
npm run build

# Capacitor 동기화
npx cap sync android

# APK 빌드
cd android
./gradlew assembleDebug
```

### Step 3-4: APK 위치 확인

빌드된 APK는 다음 위치에 생성됩니다:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 4. APK 다운로드 및 설치

### Android 기기에 설치

#### Step 4-1: 개발자 옵션 활성화

1. **설정** → **휴대전화 정보**
2. **빌드 번호**를 7번 탭
3. "개발자 모드가 활성화되었습니다" 메시지 확인

#### Step 4-2: 알 수 없는 출처 허용

1. **설정** → **보안** (또는 **개인정보 보호**)
2. **알 수 없는 출처에서 설치 허용** 활성화
   - 또는 **Chrome** 등 다운로드 앱에 설치 권한 부여

#### Step 4-3: APK 다운로드 및 설치

**방법 1: USB 연결**
1. PC와 Android 기기를 USB로 연결
2. APK 파일을 기기로 복사
3. 파일 관리자에서 APK 탭하여 설치

**방법 2: 다이렉트 다운로드**
1. GitHub Artifacts에서 APK를 웹 서버에 업로드
2. Android 기기에서 링크 접속
3. APK 다운로드 및 설치

**방법 3: Google Drive/Dropbox**
1. APK를 클라우드 스토리지에 업로드
2. Android 기기에서 다운로드
3. 설치

---

## 5. QR 코드를 통한 배포

### QR 코드 생성

APK를 쉽게 배포하기 위해 QR 코드를 생성할 수 있습니다.

#### Step 5-1: APK를 웹에 호스팅

**옵션 1: GitHub Releases**

1. GitHub 리포지토리에서 **Releases** 탭 클릭
2. **"Create a new release"** 클릭
3. 태그 생성 (예: v1.0.0)
4. APK 파일을 Releases에 업로드
5. **"Publish release"** 클릭
6. 생성된 APK 다운로드 링크 복사

**옵션 2: Firebase App Distribution**

```bash
npm install -g firebase-tools
firebase login
firebase appdistribution:distribute android/app/build/outputs/apk/debug/app-debug.apk \
    --app <FIREBASE_APP_ID> \
    --groups testers
```

**옵션 3: 임시 파일 공유**

- Google Drive
- Dropbox
- WeTransfer
- 또는 기타 파일 호스팅 서비스

#### Step 5-2: QR 코드 생성

**온라인 QR 코드 생성기:**

1. **QR Code Generator** 사용:
   ```
   https://www.qr-code-generator.com/
   ```

2. APK 다운로드 URL 입력
3. QR 코드 생성 및 다운로드
4. 이미지를 저장 (PNG/SVG)

**프로그래밍 방식:**

```bash
npm install qrcode-terminal
node -e "const qrcode = require('qrcode-terminal'); qrcode.generate('https://github.com/EunsuJeong/BS_HR_System/releases/download/v1.0.0/app-debug.apk', {small: true})"
```

#### Step 5-3: QR 코드 배포

QR 코드를 다음과 같이 활용할 수 있습니다:

- 이메일로 전송
- 사내 포털에 게시
- 인쇄하여 게시판에 부착
- Slack/Teams 등 메신저로 공유

**사용 방법:**

1. Android 기기에서 카메라 앱 열기
2. QR 코드를 스캔
3. 다운로드 링크 탭
4. APK 다운로드 및 설치

---

## 6. 프로덕션 APK 빌드

개발용 APK가 아닌 릴리즈용 APK를 빌드하려면:

### Step 6-1: 키스토어 생성

```bash
keytool -genkey -v -keystore bs-hr-release.keystore \
    -alias bs-hr-key -keyalg RSA -keysize 2048 -validity 10000
```

### Step 6-2: 서명 설정

`android/app/build.gradle` 파일에 서명 설정 추가:

```gradle
android {
    signingConfigs {
        release {
            storeFile file('../../bs-hr-release.keystore')
            storePassword 'your-keystore-password'
            keyAlias 'bs-hr-key'
            keyPassword 'your-key-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

### Step 6-3: 릴리즈 APK 빌드

```bash
cd android
./gradlew assembleRelease
```

릴리즈 APK 위치:
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## 7. 문제 해결

### 빌드 실패 시

**"SDK location not found" 에러:**
```bash
# local.properties 파일 생성 (android/ 디렉토리 내)
sdk.dir=C:\\Users\\<사용자명>\\AppData\\Local\\Android\\Sdk
```

**Gradle 빌드 실패:**
```bash
cd android
./gradlew clean
./gradlew assembleDebug --stacktrace
```

**Capacitor 동기화 오류:**
```bash
npm run build
npx cap sync android
```

### APK 설치 실패 시

- 이전 버전 제거 후 재설치
- 알 수 없는 출처 설치 허용 확인
- 저장 공간 확인
- APK 파일 손상 여부 확인 (다시 다운로드)

---

## 8. 유용한 명령어

### Capacitor 관련

```bash
# 버전 확인
npx cap --version

# Android 플랫폼 추가
npx cap add android

# 동기화
npx cap sync android

# Android Studio 열기
npx cap open android

# 플랫폼 제거 (재설정 필요 시)
npx cap rm android
```

### Gradle 관련

```bash
# 의존성 확인
./gradlew dependencies

# 빌드 캐시 삭제
./gradlew clean

# 디버그 APK 빌드
./gradlew assembleDebug

# 릴리즈 APK 빌드
./gradlew assembleRelease
```

---

## 9. 배포 체크리스트

### GitHub Actions 자동 빌드

- [ ] `.github/workflows/build-apk.yml` 파일 확인
- [ ] GitHub에 코드 푸시
- [ ] Actions 탭에서 빌드 상태 확인
- [ ] Artifacts에서 APK 다운로드
- [ ] APK 테스트 완료

### 수동 배포

- [ ] APK 빌드 완료
- [ ] 테스트 기기에서 APK 설치 테스트
- [ ] 릴리즈 노트 작성
- [ ] APK를 웹에 업로드 (GitHub Releases, Firebase 등)
- [ ] QR 코드 생성
- [ ] 배포 링크 및 QR 코드 공유

---

## 10. 추가 리소스

### 공식 문서

- **Capacitor**: https://capacitorjs.com/docs
- **Android 개발자 가이드**: https://developer.android.com/studio
- **GitHub Actions**: https://docs.github.com/actions

### 관련 파일

- **배포 가이드**: `RAILWAY_DEPLOYMENT.md`, `MONGODB_ATLAS_SETUP.md`
- **환경 변수**: `.env.example`
- **백업 가이드**: `BACKUP_GUIDE.md`

---

**부성스틸 HR 시스템 모바일 앱 배포 완료!**

QR 코드로 간편하게 앱을 배포하고, GitHub Actions로 자동 빌드를 활용하세요.
