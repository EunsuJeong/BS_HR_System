# 사용자 앱 버전 추적 가이드

## 개요

로그인 시 사용자의 앱 버전 및 플랫폼 정보를 자동으로 DB에 저장하여 사용 현황을 추적할 수 있습니다.

## 작동 방식

### 버전 정보 구분

사용자가 어떤 방식으로 접속하는지에 따라 다음과 같이 저장됩니다:

| 접속 방식 | appVersion 값 | platformType | platform |
|-----------|---------------|--------------|----------|
| 안드로이드 앱 | 1.0.0, 1.1.0 등 실제 버전 | APP | android |
| iOS 앱 | 1.0.0, 1.1.0 등 실제 버전 | APP | ios |
| PWA (모바일 홈 화면) | PWA | PWA | web |
| 일반 웹 브라우저 | Domain | Domain | web |

### 로그인 시 자동 저장

사용자가 로그인할 때마다:
1. 클라이언트에서 현재 플랫폼 및 버전 정보를 감지
2. 로그인 API 요청에 버전 정보 포함
3. 서버에서 사용자 DB에 버전 정보 업데이트
4. 마지막 로그인 시간과 함께 기록

## DB 스키마

### Employee 모델

```javascript
{
  // 기존 필드들...

  // 앱 버전 정보
  appVersion: String,          // '1.0.0', 'PWA', 'Domain'
  platformType: String,        // 'APP', 'PWA', 'Domain'
  platform: String,            // 'web', 'ios', 'android'
  userAgent: String,           // 브라우저/앱 정보
  lastVersionUpdate: Date,     // 버전 정보 마지막 업데이트
  lastLogin: Date              // 마지막 로그인 시간
}
```

### Admin 모델

동일한 필드가 추가되어 관리자의 버전 정보도 추적됩니다.

## 사용 예시

### 1. MongoDB에서 버전별 사용자 조회

```javascript
// 앱 사용자 조회
db.employees.find({ platformType: "APP" })

// PWA 사용자 조회
db.employees.find({ platformType: "PWA" })

// 웹 브라우저 사용자 조회
db.employees.find({ platformType: "Domain" })

// 특정 버전 사용자 조회
db.employees.find({ appVersion: "1.0.0" })

// 최신 버전 미업데이트 사용자 조회
db.employees.find({
  platformType: "APP",
  appVersion: { $ne: "1.1.0" }
})
```

### 2. 버전별 통계 API 추가 (선택사항)

`server/routes/systemRoutes.js`에 추가:

```javascript
// ✅ 앱 버전 통계 조회
router.get('/version-stats', async (req, res) => {
  try {
    const Employee = require('../models/hr/employees');
    const Admin = require('../models/hr/admins');

    // 직원 통계
    const employeeStats = await Employee.aggregate([
      {
        $group: {
          _id: {
            platformType: '$platformType',
            appVersion: '$appVersion'
          },
          count: { $sum: 1 },
          lastAccess: { $max: '$lastLogin' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // 관리자 통계
    const adminStats = await Admin.aggregate([
      {
        $group: {
          _id: {
            platformType: '$platformType',
            appVersion: '$appVersion'
          },
          count: { $sum: 1 },
          lastAccess: { $max: '$lastLogin' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // 전체 통계
    const totalUsers = await Employee.countDocuments();
    const appUsers = await Employee.countDocuments({ platformType: 'APP' });
    const pwaUsers = await Employee.countDocuments({ platformType: 'PWA' });
    const webUsers = await Employee.countDocuments({ platformType: 'Domain' });

    console.log('✅ [GET /system/version-stats] 버전 통계 조회');

    res.json({
      success: true,
      summary: {
        total: totalUsers,
        app: appUsers,
        pwa: pwaUsers,
        web: webUsers,
        appPercentage: ((appUsers / totalUsers) * 100).toFixed(1),
        pwaPercentage: ((pwaUsers / totalUsers) * 100).toFixed(1),
        webPercentage: ((webUsers / totalUsers) * 100).toFixed(1)
      },
      employees: employeeStats,
      admins: adminStats
    });
  } catch (error) {
    console.error('❌ [GET /system/version-stats] 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

### 3. 관리자 대시보드에 통계 표시 (선택사항)

```javascript
// src/components/admin/AdminDashboard.js
const [versionStats, setVersionStats] = useState(null);

useEffect(() => {
  const fetchVersionStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/system/version-stats`);
      const data = await response.json();
      if (data.success) {
        setVersionStats(data);
      }
    } catch (error) {
      console.error('버전 통계 조회 오류:', error);
    }
  };

  fetchVersionStats();
}, []);

// 렌더링
{versionStats && (
  <div className="bg-white p-6 rounded-lg shadow">
    <h3 className="text-lg font-bold mb-4">앱 사용 현황</h3>
    <div className="grid grid-cols-3 gap-4">
      <div>
        <p className="text-sm text-gray-600">모바일 앱</p>
        <p className="text-2xl font-bold">{versionStats.summary.app}명</p>
        <p className="text-xs text-gray-500">{versionStats.summary.appPercentage}%</p>
      </div>
      <div>
        <p className="text-sm text-gray-600">PWA</p>
        <p className="text-2xl font-bold">{versionStats.summary.pwa}명</p>
        <p className="text-xs text-gray-500">{versionStats.summary.pwaPercentage}%</p>
      </div>
      <div>
        <p className="text-sm text-gray-600">웹 브라우저</p>
        <p className="text-2xl font-bold">{versionStats.summary.web}명</p>
        <p className="text-xs text-gray-500">{versionStats.summary.webPercentage}%</p>
      </div>
    </div>

    <div className="mt-4">
      <h4 className="text-sm font-semibold mb-2">버전별 현황</h4>
      {versionStats.employees.map((stat, index) => (
        <div key={index} className="flex justify-between py-1 border-b">
          <span className="text-sm">
            {stat._id.platformType} - {stat._id.appVersion || 'N/A'}
          </span>
          <span className="text-sm font-semibold">{stat.count}명</span>
        </div>
      ))}
    </div>
  </div>
)}
```

## 실제 활용 사례

### 1. 업데이트 대상자 파악

```javascript
// 구버전 사용자 목록
db.employees.find({
  platformType: "APP",
  appVersion: { $lt: "1.1.0" }
}, {
  name: 1,
  department: 1,
  appVersion: 1,
  lastLogin: 1
})
```

### 2. 플랫폼별 공지사항 발송

```javascript
// PWA 사용자에게만 알림
const pwaUsers = await Employee.find({ platformType: 'PWA' });
// 푸시 알림 전송...

// 앱 사용자에게만 알림
const appUsers = await Employee.find({ platformType: 'APP' });
// 앱 내 알림 전송...
```

### 3. 미접속 사용자 파악

```javascript
// 30일 이상 미접속 사용자
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

db.employees.find({
  lastLogin: { $lt: thirtyDaysAgo }
}, {
  name: 1,
  department: 1,
  lastLogin: 1,
  platformType: 1
}).sort({ lastLogin: 1 })
```

### 4. 앱 전환율 분석

```javascript
// 도메인에서 앱으로 전환한 사용자 추적
// (platformType이 변경된 사용자)

// 현재 앱 사용자 중 이전에 Domain이었던 사용자
// (추가 구현 필요: 히스토리 로그)
```

## 주의사항

### 1. 개인정보 보호

- userAgent는 브라우저 정보를 포함하므로 민감한 정보는 아니지만, 필요 없으면 저장하지 않을 수 있습니다.
- 버전 정보는 통계 목적으로만 사용하세요.

### 2. 성능

- 로그인 시마다 DB에 쓰기가 발생하지만, 인덱스가 있으면 빠릅니다.
- 필요시 lastVersionUpdate를 체크하여 변경된 경우만 업데이트할 수 있습니다.

### 3. 데이터 정합성

- 로그인하지 않은 사용자는 버전 정보가 없습니다.
- 앱 업데이트 후 로그인해야 새 버전이 반영됩니다.

## 테스트

### 로컬 테스트

1. **웹 브라우저에서 로그인**
   ```
   예상: appVersion = "Domain", platformType = "Domain"
   ```

2. **안드로이드 앱에서 로그인**
   ```
   예상: appVersion = "1.0.0", platformType = "APP", platform = "android"
   ```

3. **PWA로 설치 후 로그인**
   ```
   예상: appVersion = "PWA", platformType = "PWA"
   ```

4. **MongoDB에서 확인**
   ```bash
   # MongoDB 쿼리
   db.employees.find({}, {
     name: 1,
     appVersion: 1,
     platformType: 1,
     platform: 1,
     lastLogin: 1
   }).pretty()
   ```

5. **서버 로그 확인**
   ```
   📱 [로그인] 홍길동 - 버전: 1.0.0, 플랫폼: APP
   📱 [로그인] 김철수 - 버전: Domain, 플랫폼: Domain
   ```

## 문제 해결

### versionInfo가 저장되지 않을 때

1. **클라이언트 확인**
   - 브라우저 콘솔에서 에러 확인
   - `getVersionInfo()` 함수가 정상 작동하는지 확인

2. **서버 확인**
   - 서버 로그에서 버전 정보가 출력되는지 확인
   - MongoDB에 필드가 추가되었는지 확인

3. **캐싱 문제**
   - 브라우저 캐시 삭제
   - 앱 재설치
   - 서버 재시작

### PWA가 Domain으로 인식될 때

PWA 감지 로직이 브라우저마다 다를 수 있습니다:

```javascript
// src/utils/appUpdate.js에서 개선
export const getPlatformType = () => {
  // 더 엄격한 PWA 감지
  const isPWA =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://') ||
    (window.matchMedia('(display-mode: fullscreen)').matches);

  if (isPWA) {
    return 'PWA';
  }

  if (Capacitor.isNativePlatform()) {
    return 'APP';
  }

  return 'Domain';
};
```

## 관련 파일

- `src/utils/appUpdate.js` - 버전 감지 로직
- `src/components/common/common_common.js` - 로그인 처리
- `server/models/hr/employees.js` - 직원 스키마
- `server/models/hr/admins.js` - 관리자 스키마
- `server/routes/hrRoutes.js` - 직원 로그인 API
- `server/routes/adminRoutes.js` - 관리자 로그인 API
