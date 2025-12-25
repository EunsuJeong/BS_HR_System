# GitHub Release v1.0.2 생성 가이드

파비콘(브라우저 아이콘)이 BS 로고로 업데이트된 새 버전입니다.

---

## 📋 Release 생성 단계

### 1단계: APK 다운로드

**GitHub Actions 페이지**:
```
https://github.com/EunsuJeong/BS_HR_System/actions
```

1. 최신 워크플로우 클릭 ("feat: Update favicon and theme color to BS logo")
2. 페이지 하단 **Artifacts** 섹션 찾기
3. **"bs-hr-system-debug"** 클릭하여 다운로드
4. ZIP 압축 해제 → `app-debug.apk` 파일 확인

---

### 2단계: Release 생성 페이지 접속

**바로 가기 링크**:
```
https://github.com/EunsuJeong/BS_HR_System/releases/new
```

---

### 3단계: Release 정보 입력

#### Tag 버전
```
v1.0.2
```

#### Release Title
```
부성스틸 HR 시스템 v1.0.2 - 파비콘 업데이트
```

#### Description (복사 붙여넣기)

```markdown
## 부성스틸 HR 시스템 v1.0.2

### 🎨 새로운 업데이트
- ✅ 브라우저 파비콘(탭 아이콘)을 BS 로고로 변경
- ✅ 테마 컬러를 BS 브랜드 컬러(검정)로 변경
- ✅ 여러 해상도의 파비콘 지원 (192x192, 512x512)

### 🔧 유지된 기능
- ✅ BS 로고 앱 아이콘 (v1.0.1)
- ✅ BS 로고 스플래시 화면 (v1.0.1)
- ✅ Railway 백엔드 연결 (https://bshrsystem-production.up.railway.app)
- ✅ 직원 관리 및 근태 관리
- ✅ AI 챗봇 및 추천 시스템
- ✅ 연차 관리 및 급여 관리
- ✅ 공지사항 및 일정 관리

### 📱 설치 방법
1. 아래 APK 파일 다운로드
2. Android 기기에서 설치
3. 관리자 계정으로 로그인

### 📊 변경사항
- 파비콘을 BS 로고로 완전히 교체
- 브라우저 탭에서 BS 로고 표시
- PWA 설치 시에도 BS 로고 적용

### 💾 시스템 요구사항
- Android 7.0 (API 24) 이상
- 인터넷 연결 필요
- 권장: Android 8.0 이상 (Adaptive 아이콘 지원)

### 📦 파일 정보
- 파일명: app-debug.apk
- 버전: 1.0.2
- 빌드 날짜: 2025-12-23
```

---

### 4단계: APK 파일 업로드

1. **"Attach binaries by dropping them here or selecting them"** 클릭
2. 다운로드한 `app-debug.apk` 파일 선택
3. 업로드 완료될 때까지 대기

---

### 5단계: Release 발행

**"Publish release"** 버튼 클릭

---

## ✅ 완료 후 확인사항

Release가 생성되면:

1. **다운로드 URL 확인**:
   ```
   https://github.com/EunsuJeong/BS_HR_System/releases/download/v1.0.2/app-debug.apk
   ```

2. **Release 페이지 확인**:
   ```
   https://github.com/EunsuJeong/BS_HR_System/releases
   ```

3. **QR 코드 업데이트**:
   - Release 생성 완료 후 알려주시면 QR 코드를 업데이트하겠습니다

---

## 🎯 다음 단계

Release 생성 완료 후:
1. 업데이트된 QR 코드 생성
2. 직원들에게 새 버전 배포 안내
3. 이전 버전은 유지 (v1.0.0, v1.0.1)

---

**Release 생성이 완료되면 알려주세요!**
QR 코드를 v1.0.2 버전으로 생성하겠습니다.
