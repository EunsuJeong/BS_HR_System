# GitHub Release 다운로드 링크 얻는 방법

## 1단계: APK 빌드

```bash
# 프론트엔드 빌드
npm run build

# Capacitor 동기화
npx cap sync

# Android Studio 열기
npx cap open android
```

Android Studio에서:
1. **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)** 클릭
2. 빌드 완료 후 **locate** 클릭하여 APK 파일 위치 확인
3. 파일 경로: `android/app/build/outputs/apk/release/app-release.apk`

## 2단계: GitHub Release 생성

1. **GitHub 저장소로 이동**
   - https://github.com/사용자명/저장소명

2. **Releases 클릭**
   - 오른쪽 사이드바에서 "Releases" 클릭
   - 또는 URL: https://github.com/사용자명/저장소명/releases

3. **Create a new release 클릭**

4. **Release 정보 입력**
   ```
   Tag version: v1.1.0
   Release title: 부성스틸 HR 시스템 v1.1.0 - 자동 업데이트 기능 추가

   Description:
   ## 주요 변경사항
   - ✨ 자동 업데이트 확인 기능 추가
   - 📱 앱 내에서 새 버전 알림 표시
   - 🔄 원클릭 업데이트 지원

   ## 설치 방법
   1. 아래 APK 파일 다운로드
   2. 파일 실행하여 설치
   3. 기존 앱 위에 덮어쓰기 설치됩니다

   ## 다음 업데이트부터
   v1.2.0부터는 앱에서 자동으로 업데이트 알림이 표시됩니다!
   ```

5. **APK 파일 업로드**
   - "Attach binaries by dropping them here or selecting them" 영역에
   - `app-release.apk` 파일을 드래그 앤 드롭
   - 또는 클릭하여 파일 선택

6. **Publish release 클릭**

## 3단계: 다운로드 링크 복사

Release가 생성되면 자동으로 다운로드 링크가 생성됩니다.

**링크 형식:**
```
https://github.com/사용자명/저장소명/releases/download/v1.1.0/app-release.apk
```

**링크 찾는 방법:**
1. 생성된 Release 페이지로 이동
2. **Assets** 섹션에서 `app-release.apk` 파일 오른쪽 클릭
3. "링크 주소 복사" 선택

또는:

1. Assets에서 APK 파일명 클릭
2. 브라우저 주소창의 URL 복사

## 4단계: 공지사항에 링크 등록

복사한 링크를 공지사항 내용에 추가:

```
🔗 다운로드 링크:
https://github.com/사용자명/저장소명/releases/download/v1.1.0/app-release.apk
```

## 단축 URL 생성 (선택사항)

긴 GitHub URL을 짧게 만들고 싶다면:

**방법 1: bit.ly 사용**
1. https://bitly.com 접속
2. GitHub 다운로드 링크 입력
3. 짧은 링크 생성 (예: https://bit.ly/bs-hr-v110)

**방법 2: QR 코드 생성**
기존에 있던 스크립트 활용:

```bash
# generate-qr-v1.1.0.js 파일 생성 후
node generate-qr-v1.1.0.js
```

QR 코드 이미지를 공지사항에 첨부하면 모바일에서 쉽게 스캔 가능합니다.

## 예시: 실제 사용 예

**GitHub 저장소:** github.com/busungsteel/hr-system
**버전:** v1.1.0
**APK 파일명:** app-release.apk

**결과 링크:**
```
https://github.com/busungsteel/hr-system/releases/download/v1.1.0/app-release.apk
```

이 링크를 공지사항에 붙여넣으면:
- 사용자가 클릭 → APK 즉시 다운로드
- 모바일에서 클릭 → 바로 설치 가능

## 주의사항

1. **Public Repository**
   - 저장소가 Public이어야 누구나 다운로드 가능
   - Private 저장소는 권한이 있는 사용자만 다운로드 가능

2. **파일 크기 제한**
   - GitHub Release는 파일당 2GB까지 지원
   - APK는 보통 10-100MB 정도이므로 문제없음

3. **보안**
   - HTTPS를 통한 안전한 다운로드
   - GitHub의 신뢰할 수 있는 인프라 사용

4. **영구 링크**
   - Release를 삭제하지 않는 한 링크는 영구적으로 유효
   - 이전 버전의 링크도 계속 접근 가능

## 테스트

링크를 공지사항에 등록하기 전에 테스트하세요:

1. 복사한 링크를 브라우저에 붙여넣기
2. APK 다운로드가 시작되는지 확인
3. 모바일에서도 테스트 (가능하면)

## 문제 해결

**Q: 링크를 클릭해도 다운로드가 안 돼요**
- 저장소가 Public인지 확인
- Release가 정상적으로 생성되었는지 확인
- 파일명이 정확한지 확인 (대소문자 구분)

**Q: "404 Not Found" 오류가 나요**
- URL이 정확한지 확인
- Tag 버전이 맞는지 확인 (v1.1.0)
- 파일이 Assets에 제대로 업로드되었는지 확인

**Q: 다운로드는 되는데 설치가 안 돼요**
- APK가 제대로 서명되었는지 확인
- 기기의 "알 수 없는 출처" 설정 확인
- 기존 앱과 패키지명이 동일한지 확인
