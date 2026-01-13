# 기존 사용자 업데이트 전환 전략

## 문제 상황

기존에 배포된 앱(v1.0.0, v1.0.1, v1.0.2 등)에는 자동 업데이트 기능이 없습니다.
따라서 새로운 자동 업데이트 기능을 포함한 버전으로 전환하기 위한 전략이 필요합니다.

## 해결 방법

### 방법 1: 푸시 알림 활용 (권장)

이미 Firebase Cloud Messaging이 구현되어 있다면 가장 효과적인 방법입니다.

#### 구현 단계

1. **새 버전 배포 (v1.1.0 - 자동 업데이트 포함)**
   ```bash
   # Android 버전 업데이트
   # android/app/build.gradle
   versionCode 11
   versionName "1.1.0"
   ```

2. **푸시 알림 전송**
   - 제목: "새 버전 업데이트 안내"
   - 내용: "중요한 업데이트가 있습니다. 다운로드 링크를 확인해주세요."
   - 링크: GitHub Release 다운로드 URL 또는 QR코드 페이지

3. **다음 버전부터 자동 업데이트 작동**
   - v1.1.0 설치 후부터는 자동 업데이트 기능 활성화
   - v1.2.0부터는 앱 내에서 자동으로 업데이트 알림 표시

#### 푸시 알림 코드 예시

```javascript
// server/utils/sendUpdateNotification.js
const admin = require('firebase-admin');

async function sendUpdateNotification() {
  const message = {
    notification: {
      title: '🎉 새 버전 업데이트 (v1.1.0)',
      body: '자동 업데이트 기능이 추가되었습니다. 지금 업데이트하세요!'
    },
    data: {
      type: 'app_update',
      version: '1.1.0',
      downloadUrl: 'https://github.com/YOUR_REPO/releases/download/v1.1.0/app-release.apk'
    },
    topic: 'all_users' // 또는 특정 토큰 목록
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('✅ 업데이트 알림 전송 성공:', response);
  } catch (error) {
    console.error('❌ 알림 전송 실패:', error);
  }
}

module.exports = { sendUpdateNotification };
```

### 방법 2: 공지사항 활용

앱 내 공지사항 기능을 통해 안내합니다.

#### 구현 단계

1. **긴급 공지사항 작성**
   ```
   제목: [필수] 앱 업데이트 안내
   내용:
   안녕하세요, 부성스틸 HR 시스템입니다.

   새로운 자동 업데이트 기능이 추가된 v1.1.0 버전이 출시되었습니다.
   이번 업데이트 후부터는 앱 내에서 자동으로 업데이트를 확인할 수 있습니다.

   📥 다운로드 방법:
   1. 아래 링크 클릭
   2. APK 파일 다운로드
   3. 설치 진행

   [다운로드 링크] 또는 [QR 코드]

   ⚠️ 이번 한 번만 수동으로 업데이트하시면, 다음부터는 자동으로 업데이트됩니다!
   ```

2. **공지사항 상단 고정**
   - 중요도: 높음
   - 팝업으로 표시
   - 읽기 전까지 계속 표시

### 방법 3: 서버 강제 업데이트 체크 (임시)

기존 앱에서도 서버 API를 호출하고 있다면, 서버 응답에 업데이트 메시지를 포함시킬 수 있습니다.

#### 구현 코드

**서버 측 미들웨어 추가:**

```javascript
// server/middleware/versionCheck.js
const versionCheck = (req, res, next) => {
  const clientVersion = req.headers['app-version'] || '1.0.0';
  const minRequiredVersion = '1.1.0';

  if (compareVersions(clientVersion, minRequiredVersion) < 0) {
    // 헤더에 업데이트 필요 정보 추가
    res.set('X-Update-Required', 'true');
    res.set('X-Latest-Version', minRequiredVersion);
    res.set('X-Download-Url', 'https://github.com/YOUR_REPO/releases/download/v1.1.0/app-release.apk');
  }

  next();
};

function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }

  return 0;
}

module.exports = versionCheck;
```

**server/server.js에 추가:**

```javascript
const versionCheck = require('./middleware/versionCheck');

// 모든 API 요청에 적용
app.use('/api', versionCheck);
```

**클라이언트 측 API 클라이언트 수정:**

```javascript
// src/api/client.js
apiClient.interceptors.response.use(
  (response) => {
    // 업데이트 필요 체크
    if (response.headers['x-update-required'] === 'true') {
      const latestVersion = response.headers['x-latest-version'];
      const downloadUrl = response.headers['x-download-url'];

      // 업데이트 알림 표시
      if (window.confirm(
        `새 버전(${latestVersion})이 출시되었습니다.\n` +
        '자동 업데이트 기능이 추가되었습니다.\n' +
        '지금 업데이트하시겠습니까?'
      )) {
        window.open(downloadUrl, '_blank');
      }
    }

    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);
```

### 방법 4: QR 코드 재배포

기존에 사용했던 QR 코드 페이지를 업데이트합니다.

#### 구현 단계

1. **QR 코드 페이지 업데이트**
   ```html
   <!-- bs-hr-v1.1.0-download.html -->
   <div class="update-notice">
     ⚠️ 기존 사용자는 새 버전으로 업데이트해주세요!

     v1.1.0부터 자동 업데이트 기능이 추가되었습니다.
     이번 한 번만 수동으로 업데이트하시면, 다음부터는 자동입니다!
   </div>
   ```

2. **기존 QR 코드 업데이트**
   ```bash
   node generate-qr-v1.1.0.js
   ```

3. **회사 게시판/이메일로 안내**
   - 새로운 QR 코드 스캔 안내
   - 자동 업데이트 기능 설명

## 권장 전환 프로세스

### 📅 타임라인

**Week 1: 준비**
- [ ] v1.1.0 개발 완료 (자동 업데이트 포함)
- [ ] GitHub Release 생성 및 APK 업로드
- [ ] QR 코드 생성
- [ ] 공지사항 작성

**Week 1-2: 안내**
- [ ] 푸시 알림 전송 (있는 경우)
- [ ] 공지사항 등록 (앱 내)
- [ ] 이메일/메신저로 전체 직원 안내
- [ ] 회사 게시판에 QR 코드 게시

**Week 2-4: 모니터링**
- [ ] 업데이트 현황 모니터링
- [ ] 미업데이트 사용자 개별 안내
- [ ] 문제 발생 시 지원

**Week 4+: 안정화**
- [ ] 대부분 사용자 v1.1.0 업데이트 완료
- [ ] v1.2.0부터 자동 업데이트 본격 활용

## 업데이트 현황 모니터링

서버에서 앱 버전별 사용자 수를 추적할 수 있습니다.

```javascript
// server/routes/systemRoutes.js
router.post('/track-version', async (req, res) => {
  const { userId, appVersion, platform } = req.body;

  // 버전별 사용자 통계 업데이트
  await VersionStats.updateOne(
    { version: appVersion },
    {
      $addToSet: { users: userId },
      $inc: { count: 1 },
      lastSeen: new Date()
    },
    { upsert: true }
  );

  res.json({ success: true });
});

router.get('/version-stats', async (req, res) => {
  const stats = await VersionStats.find().sort({ version: -1 });
  res.json({ success: true, stats });
});
```

## FAQ

### Q: 기존 사용자가 업데이트를 안 하면 어떻게 되나요?

A: 기존 앱은 계속 작동하지만, 자동 업데이트 기능은 사용할 수 없습니다. 중요한 보안 업데이트나 버그 수정이 있을 경우 수동으로 알려야 합니다.

### Q: 강제 업데이트를 할 수 있나요?

A: 서버 API에서 특정 버전 이하의 요청을 차단하고 업데이트 메시지를 반환할 수 있습니다. 하지만 사용자 경험을 고려하여 신중하게 사용해야 합니다.

### Q: 얼마나 많은 사용자가 업데이트해야 하나요?

A: 이상적으로는 80% 이상의 사용자가 업데이트하면 좋습니다. 나머지 20%는 개별 안내로 해결할 수 있습니다.

### Q: 업데이트 거부자는 어떻게 하나요?

A: 앱이 정상 작동하는 한 강제할 필요는 없습니다. 다만 다음 주요 업데이트 시 구 버전 지원을 중단할 수 있음을 사전에 공지하세요.

## 참고 자료

- 푸시 알림 구현: `src/firebase.js`
- 공지사항 관리: `src/components/admin/AdminNoticeManagement.js`
- QR 코드 생성: `generate-qr.js` 스크립트들
