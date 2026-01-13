# 안드로이드 자동 업데이트 기능 가이드

## 개요

이 앱은 GitHub Releases를 통해 자동으로 새 버전을 확인하고 업데이트하는 기능을 제공합니다.

## 작동 방식

1. 앱 실행 시 자동으로 서버에서 최신 버전 확인
2. 24시간마다 한 번씩 업데이트 체크
3. 새 버전이 있으면 사용자에게 알림 표시
4. 사용자가 "지금 업데이트" 선택 시 APK 다운로드 시작
5. 다운로드 완료 후 안드로이드가 자동으로 설치 안내

## 설정 방법

### 1. GitHub 저장소 설정

서버 코드에서 GitHub 저장소 정보를 업데이트해야 합니다.

**파일: `server/routes/systemRoutes.js`**

287번째 줄 근처의 다음 부분을 수정하세요:

```javascript
const options = {
  hostname: 'api.github.com',
  path: '/repos/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME/releases/latest',
  // ↑ 실제 GitHub 사용자명과 저장소 이름으로 변경하세요
  method: 'GET',
  headers: {
    'User-Agent': 'BS-HR-App',
    'Accept': 'application/vnd.github.v3+json'
  }
};
```

**예시:**
```javascript
path: '/repos/busungsteel/hr-system/releases/latest',
```

### 2. GitHub Release 생성하기

새 버전을 배포할 때:

1. **APK 빌드**
   ```bash
   npm run build
   npx cap copy android
   npx cap open android
   # Android Studio에서 APK 빌드 (Build > Build Bundle(s) / APK(s) > Build APK(s))
   ```

2. **GitHub Release 생성**
   - GitHub 저장소 > Releases > "Create a new release"
   - Tag version: `v1.0.1` (버전 형식: v + 버전번호)
   - Release title: `버전 1.0.1`
   - Description: 업데이트 내용 작성
   - APK 파일 업로드 (app-release.apk 또는 유사한 이름)
   - "Publish release" 클릭

### 3. 앱 버전 업데이트

새 버전을 배포할 때마다 `android/app/build.gradle` 파일을 업데이트하세요:

```gradle
defaultConfig {
    applicationId "com.busungsteel.hr"
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion rootProject.ext.targetSdkVersion
    versionCode 2          // ← 1씩 증가
    versionName "1.0.1"    // ← 버전 번호 업데이트
    ...
}
```

**중요:**
- `versionCode`는 숫자로 1씩 증가 (1, 2, 3, ...)
- `versionName`은 사람이 읽을 수 있는 버전 (1.0.0, 1.0.1, 1.1.0, ...)
- GitHub Release의 tag와 `versionName`이 일치해야 합니다 (v 접두사 제외)

### 4. 환경 변수 설정

`.env` 파일에 API URL이 설정되어 있는지 확인하세요:

```
REACT_APP_API_URL=https://your-server-url.railway.app
```

## 사용자 경험 흐름

1. **자동 체크**: 앱 실행 시 백그라운드에서 자동으로 업데이트 확인
2. **알림 표시**: 새 버전이 있으면 팝업 알림 표시
   - 현재 버전 / 최신 버전 표시
   - 파일 크기 표시
   - 업데이트 내용 표시
3. **사용자 선택**:
   - **지금 업데이트**: APK 다운로드 시작
   - **나중에**: 다음 실행 시 다시 확인
   - **건너뛰기**: 24시간 후에 다시 확인

## 테스트 방법

### 로컬 테스트

1. **서버 실행**
   ```bash
   npm run server
   ```

2. **프론트엔드 빌드 및 APK 생성**
   ```bash
   npm run build
   npx cap sync
   npx cap open android
   # Android Studio에서 APK 빌드
   ```

3. **GitHub Release 생성** (테스트용)
   - 테스트 버전 (예: v1.0.1-test) 생성
   - APK 업로드

4. **앱 설치 및 테스트**
   - 이전 버전 설치
   - 앱 실행하여 업데이트 알림 확인

## 주의사항

### 권한 관련

앱은 다음 권한을 요청합니다:
- `INTERNET`: 서버와 통신
- `WRITE_EXTERNAL_STORAGE`: APK 다운로드 (Android 9 이하)
- `READ_EXTERNAL_STORAGE`: 파일 읽기
- `REQUEST_INSTALL_PACKAGES`: APK 설치

Android 8.0 (API 26) 이상에서는 "알 수 없는 출처" 설정이 필요할 수 있습니다.

### 보안

- APK는 HTTPS를 통해 다운로드됩니다
- GitHub Releases는 신뢰할 수 있는 소스입니다
- 사용자가 명시적으로 업데이트를 승인해야 합니다

### 네트워크

- 업데이트 체크는 인터넷 연결이 필요합니다
- 실패 시 조용히 무시하며 다음 실행 시 재시도합니다
- APK 다운로드는 사용자의 데이터 요금이 부과될 수 있습니다

## 문제 해결

### "업데이트를 확인할 수 없습니다" 오류

1. 서버가 실행 중인지 확인
2. `.env` 파일의 `REACT_APP_API_URL` 확인
3. `server/routes/systemRoutes.js`의 GitHub 저장소 경로 확인
4. GitHub Release가 생성되었는지 확인

### APK 다운로드가 시작되지 않음

1. 인터넷 연결 확인
2. GitHub Release에 APK 파일이 업로드되었는지 확인
3. APK 파일명이 `.apk`로 끝나는지 확인

### 업데이트 알림이 표시되지 않음

1. 모바일 플랫폼인지 확인 (웹에서는 표시되지 않음)
2. 24시간이 지났는지 확인 (또는 localStorage의 `lastUpdateCheck` 삭제)
3. 현재 버전과 최신 버전이 다른지 확인

## 업데이트 주기 변경

업데이트 체크 주기를 변경하려면 `src/utils/appUpdate.js`의 `shouldShowUpdateAlert` 함수를 수정하세요:

```javascript
export const shouldShowUpdateAlert = (lastChecked) => {
  if (!lastChecked) return true;

  const now = Date.now();
  const hoursSinceLastCheck = (now - lastChecked) / (1000 * 60 * 60);

  // 24시간 -> 원하는 시간으로 변경 (예: 12시간)
  return hoursSinceLastCheck >= 24;
};
```

## 향후 개선 사항

- [ ] 백그라운드 다운로드 진행률 표시
- [ ] 강제 업데이트 옵션 (중요 보안 업데이트)
- [ ] 업데이트 히스토리 보기
- [ ] 자동 설치 (사용자 동의 후)
- [ ] 델타 업데이트 (변경된 부분만 다운로드)

## 참고 자료

- [Capacitor Documentation](https://capacitorjs.com/)
- [GitHub Releases API](https://docs.github.com/en/rest/releases/releases)
- [Android App Updates](https://developer.android.com/guide/playcore/in-app-updates)
