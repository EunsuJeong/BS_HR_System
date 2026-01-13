# APK 빌드 및 GitHub Release 생성 가이드

## 사전 준비 완료 ✅

- ✅ React 앱 빌드 완료
- ✅ Capacitor 동기화 완료
- ✅ 빌드 파일이 `build/` 폴더에 준비됨
- ✅ Android 프로젝트가 `android/` 폴더에 준비됨

## 1단계: Android Studio에서 APK 빌드

### 1. Android Studio 열기

```bash
npx cap open android
```

또는 Android Studio를 직접 실행하고 프로젝트 열기:
- File > Open
- `C:\Users\Owner\Desktop\workingFolder\HR_Program\BS_JUNG(0107)\android` 선택

### 2. 프로젝트 Sync 확인

Android Studio가 열리면 자동으로 Gradle sync가 시작됩니다.
- 상단에 "Gradle Sync" 메시지가 표시되면 완료될 때까지 기다립니다.
- 오류가 발생하면 "Try Again" 클릭

### 3. APK 빌드

**메뉴에서:**
1. Build > Build Bundle(s) / APK(s) > Build APK(s) 클릭
2. 빌드가 완료되면 우측 하단에 알림 표시
3. "locate" 링크 클릭하여 APK 파일 위치 확인

**또는 터미널에서:**
```bash
cd android
./gradlew assembleRelease
```

### 4. APK 파일 찾기

빌드된 APK 파일 위치:
```
android/app/build/outputs/apk/release/app-release.apk
```

이 파일을 복사하여 접근하기 쉬운 위치에 저장하세요.

### 5. APK 파일 이름 변경 (선택사항)

```
app-release.apk → bs-hr-v1.1.0.apk
```

## 2단계: GitHub Release 생성

### 방법 1: GitHub CLI 사용 (권장)

```bash
# GitHub CLI 설치 확인
gh --version

# GitHub에 로그인 (최초 1회)
gh auth login

# Release 생성 및 APK 업로드
gh release create v1.1.0 ^
  android/app/build/outputs/apk/release/app-release.apk ^
  --title "부성스틸 HR 시스템 v1.1.0 - 자동 업데이트 기능 추가" ^
  --notes "## 주요 변경사항

- ✨ 앱 내 자동 업데이트 확인 기능 추가
- 📱 새 버전 출시 시 자동 알림 표시
- 🔄 원클릭 업데이트 지원
- 📊 사용자 버전 추적 기능 추가

## 설치 방법

1. 아래 APK 파일 다운로드
2. 파일 실행하여 설치
3. 기존 앱 위에 덮어쓰기 설치됩니다

## 중요 안내

⚠️ 이번 한 번만 수동으로 업데이트하시면, 다음 버전(v1.2.0)부터는 앱에서 자동으로 업데이트 알림이 표시됩니다!

## 기술 정보

- 버전: 1.1.0
- 빌드 날짜: $(date +%Y-%m-%d)
- 플랫폼: Android
- 최소 요구사항: Android 7.0 이상"
```

### 방법 2: GitHub 웹 인터페이스 사용

1. **GitHub 저장소로 이동**
   - https://github.com/EunsuJeong/BS_HR_System

2. **Releases 페이지로 이동**
   - 오른쪽 사이드바에서 "Releases" 클릭
   - 또는 직접 URL: https://github.com/EunsuJeong/BS_HR_System/releases

3. **"Draft a new release" 클릭**

4. **Release 정보 입력**

   **Choose a tag:** `v1.1.0`
   - "Create new tag: v1.1.0 on publish" 선택

   **Release title:** `부성스틸 HR 시스템 v1.1.0 - 자동 업데이트 기능 추가`

   **Description:**
   ```markdown
   ## 주요 변경사항

   - ✨ 앱 내 자동 업데이트 확인 기능 추가
   - 📱 새 버전 출시 시 자동 알림 표시
   - 🔄 원클릭 업데이트 지원
   - 📊 사용자 버전 추적 기능 추가

   ## 설치 방법

   1. 아래 APK 파일 다운로드
   2. 파일 실행하여 설치
   3. 기존 앱 위에 덮어쓰기 설치됩니다

   ## 중요 안내

   ⚠️ **이번 한 번만 수동으로 업데이트하시면, 다음 버전(v1.2.0)부터는 앱에서 자동으로 업데이트 알림이 표시됩니다!**

   ## 기술 정보

   - **버전:** 1.1.0
   - **빌드 날짜:** 2026-01-13
   - **플랫폼:** Android
   - **최소 요구사항:** Android 7.0 이상
   - **파일 크기:** 약 10-15MB

   ## 변경 로그

   ### 추가
   - 자동 업데이트 체크 기능
   - 사용자 버전 추적 시스템
   - 플랫폼 타입 감지 (APP/PWA/Domain)

   ### 개선
   - 로그인 시 버전 정보 자동 저장
   - GitHub Releases 연동

   ## 문제 해결

   설치 중 "알 수 없는 출처" 경고가 표시되면:
   1. 설정 > 보안
   2. "알 수 없는 출처 허용" 활성화
   3. 다시 설치 진행

   문의사항이 있으시면 관리자에게 연락 주세요.
   ```

5. **APK 파일 업로드**
   - "Attach binaries by dropping them here or selecting them" 영역에
   - `app-release.apk` 파일을 드래그 앤 드롭
   - 또는 클릭하여 파일 선택

6. **"Publish release" 클릭**

## 3단계: 다운로드 링크 확인

Release가 생성되면 다음 형식의 다운로드 링크가 자동 생성됩니다:

```
https://github.com/EunsuJeong/BS_HR_System/releases/download/v1.1.0/app-release.apk
```

이 링크를 복사하여 공지사항에 사용하세요.

## 4단계: 공지사항 작성

앱 또는 웹 시스템의 공지사항에 다음 내용으로 공지를 등록하세요:

```
제목: [필수] 앱 업데이트 안내 - 자동 업데이트 기능 추가

내용:

안녕하세요, 부성스틸 인사관리 시스템입니다.

새로운 자동 업데이트 기능이 추가된 v1.1.0 버전이 출시되었습니다.

📱 주요 변경사항:
• 앱 내 자동 업데이트 확인 기능
• 새 버전 출시 시 자동 알림
• 원클릭 업데이트 지원

⚠️ 중요 안내:
이번 한 번만 수동으로 업데이트하시면, 다음부터는 앱에서 자동으로 새 버전을 확인하고 알려드립니다!

📥 업데이트 방법:
1. 아래 링크 클릭
2. APK 다운로드
3. 설치 진행 (기존 앱 위에 덮어쓰기)

🔗 다운로드 링크:
https://github.com/EunsuJeong/BS_HR_System/releases/download/v1.1.0/app-release.apk

💡 설치 후:
앱 실행 → 버전 정보에서 v1.1.0 확인

문의: 관리자
```

## 5단계: 테스트

1. **다운로드 링크 테스트**
   - 링크를 브라우저에 붙여넣기
   - APK가 정상적으로 다운로드되는지 확인

2. **앱 설치 테스트**
   - APK 파일 실행
   - 기존 앱 위에 설치
   - 버전 번호 확인

3. **자동 업데이트 테스트**
   - 앱 실행
   - 24시간 후 또는 localStorage 삭제 후 재실행
   - 업데이트 알림이 표시되는지 확인

## 문제 해결

### APK 빌드 실패

**문제:** Android SDK를 찾을 수 없음
**해결:**
1. Android Studio 설치 확인
2. Android Studio > Tools > SDK Manager
3. Android SDK 설치 경로 확인
4. `android/local.properties` 파일 생성:
   ```
   sdk.dir=C:\\Users\\Owner\\AppData\\Local\\Android\\Sdk
   ```

### GitHub Release 실패

**문제:** gh 명령어를 찾을 수 없음
**해결:**
1. GitHub CLI 설치: https://cli.github.com/
2. 설치 후 터미널 재시작
3. `gh auth login` 실행

### 다운로드 링크 404 오류

**문제:** 링크를 클릭해도 파일을 찾을 수 없음
**해결:**
1. Release가 정상적으로 생성되었는지 확인
2. APK 파일이 Assets에 업로드되었는지 확인
3. 저장소가 Public인지 확인

## 다음 단계

1. ✅ APK 빌드 완료
2. ✅ GitHub Release 생성 완료
3. ✅ 공지사항 등록
4. 📊 사용자 업데이트 현황 모니터링
5. 🔄 v1.2.0 부터는 자동 업데이트 활성화

## 참고 자료

- [AUTO_UPDATE_GUIDE.md](./AUTO_UPDATE_GUIDE.md) - 자동 업데이트 전체 가이드
- [HOW_TO_GET_DOWNLOAD_LINK.md](./HOW_TO_GET_DOWNLOAD_LINK.md) - 다운로드 링크 생성
- [MIGRATION_STRATEGY.md](./MIGRATION_STRATEGY.md) - 기존 사용자 전환 전략
- [VERSION_TRACKING_GUIDE.md](./VERSION_TRACKING_GUIDE.md) - 버전 추적 활용
