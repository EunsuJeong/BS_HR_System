# 📱 PWA 푸시 알림 설정 가이드

Socket.io 실시간 알림을 PWA 푸시 알림으로 전환했습니다!

---

## ✅ 완료된 작업

### 1. Service Worker 업그레이드 ✅

- [x] 푸시 알림 수신 리스너 추가
- [x] 알림 클릭 이벤트 핸들러 강화
- [x] 알림 타입별 URL 라우팅 추가

### 2. 백엔드 구현 ✅

- [x] MongoDB 푸시 구독 스키마 생성
- [x] 푸시 알림 컨트롤러 완성
- [x] API 라우트 등록 (`/api/push/*`)

### 3. 푸시 알림 추가된 이벤트 ✅

- [x] **연차 신청 시** → 관리자에게 알림
- [x] **연차 승인/반려 시** → 직원에게 알림
- [x] **공지사항 등록 시** → 전체 직원에게 알림

### 4. 프론트엔드 UI ✅

- [x] 푸시 알림 설정 컴포넌트 생성
- [x] 알림 권한 요청 기능
- [x] 구독 관리 기능

---

## 🚀 설정 방법

### **Step 1: web-push 패키지 설치**

```bash
npm install web-push
```

### **Step 2: VAPID 키 생성**

```bash
npx web-push generate-vapid-keys
```

출력 예시:

```
=======================================
Public Key:
BKxxx...your-public-key...xxx

Private Key:
xxx...your-private-key...xxx
=======================================
```

### **Step 3: 환경 변수 설정**

#### **로컬 개발 (`.env` 파일)**

```bash
# PWA 푸시 알림 설정
VAPID_PUBLIC_KEY=BKxxx...your-public-key...xxx
VAPID_PRIVATE_KEY=xxx...your-private-key...xxx
VAPID_SUBJECT=mailto:admin@buseongsteel.com
```

#### **Railway (프로덕션)**

Railway Dashboard → Variables 탭에 추가:

```bash
VAPID_PUBLIC_KEY=BKxxx...
VAPID_PRIVATE_KEY=xxx...
VAPID_SUBJECT=mailto:admin@buseongsteel.com
```

#### **Vercel (프론트엔드) - 변경 불필요**

기존 환경 변수 그대로 사용

---

## 🎯 사용 방법

### **1. 직원/관리자 대시보드에 알림 설정 추가**

[src/components/admin/AdminDashboard.js](src/components/admin/AdminDashboard.js) 또는 [src/components/staff/StaffDashboard.js](src/components/staff/StaffDashboard.js)에 추가:

```javascript
import PushNotificationSettings from '../common/PushNotificationSettings';
import { useAuth } from '../../contexts/AuthContext';

function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      {/* 기존 대시보드 내용 */}

      {/* ✅ PWA 푸시 알림 설정 추가 */}
      <div className="mt-6">
        <PushNotificationSettings
          employeeId={user.employeeId}
          employeeName={user.name}
        />
      </div>
    </div>
  );
}
```

### **2. 테스트**

1. **로컬 테스트**

   ```bash
   npm start
   ```

2. **대시보드 접속**

   - "🔔 알림 활성화" 버튼 클릭
   - 브라우저 권한 허용
   - "📢 테스트 알림 보내기" 클릭

3. **실제 알림 테스트**
   - 연차 신청 → 관리자에게 푸시 알림 발송
   - 연차 승인 → 직원에게 푸시 알림 발송
   - 공지사항 등록 → 전체 직원에게 푸시 알림 발송

---

## 📊 PWA 푸시 알림 vs Socket.io 비교

| 기능               | Socket.io (이전)      | PWA 푸시 알림 (현재)   |
| ------------------ | --------------------- | ---------------------- |
| **앱 실행 중**     | ✅ 가능               | ✅ 가능                |
| **앱 종료 시**     | ❌ 불가능             | ✅ **가능**            |
| **백그라운드**     | ❌ 불가능             | ✅ **가능**            |
| **OS 알림 트레이** | ❌ 없음               | ✅ **표시됨**          |
| **진동/소리**      | ⚠️ 제한적             | ✅ 완벽 지원           |
| **배터리 소모**    | 높음                  | **낮음**               |
| **서버 부하**      | 높음 (WebSocket 유지) | **낮음** (이벤트 기반) |

---

## 🔔 알림 발송 조건

### **현재 구현된 알림**

1. **연차 신청 시**

   ```
   제목: 📝 새 연차 신청
   내용: [직원명]님이 [연차종류] 연차를 신청했습니다.
   수신: 모든 관리자/직원
   ```

2. **연차 승인 시**

   ```
   제목: ✅ 연차 승인 완료
   내용: [연차종류] 연차가 승인되었습니다.
   수신: 신청한 직원
   알림: requireInteraction (확인 필요)
   ```

3. **연차 반려 시**

   ```
   제목: ❌ 연차 반려
   내용: [연차종류] 연차가 반려되었습니다.
   수신: 신청한 직원
   알림: requireInteraction (확인 필요)
   ```

4. **공지사항 등록 시**
   ```
   제목: 📢 새 공지사항 (중요: 🔴 중요 공지사항)
   내용: [공지사항 제목]
   수신: 전체 직원
   ```

---

## 🛠 추가 기능 구현 가능

### **급여 지급 알림 추가**

[server/routes/payroll.js](server/routes/payroll.js)에 추가:

```javascript
const {
  sendPushNotification,
} = require('../controllers/pushNotificationController');

// 급여 생성 시
await sendPushNotification(employeeId, {
  title: '💰 급여 지급 완료',
  body: `${yearMonth} 급여가 지급되었습니다.`,
  data: { type: 'payroll', url: '/staff/payroll' },
  requireInteraction: true,
});
```

### **건의사항 답변 알림**

### **일정 알림**

### **안전사고 알림**

---

## ⚠️ 주의사항

### **1. iOS 제한사항**

- ✅ Android: 완벽 지원
- ✅ PC: 완벽 지원
- ⚠️ iOS: "홈 화면에 추가"한 PWA만 지원

### **2. HTTPS 필수**

- ✅ Railway/Vercel: 자동 HTTPS 제공
- ✅ localhost: HTTP도 허용 (개발용)

### **3. 사용자 권한 필요**

- 사용자가 명시적으로 알림 권한을 허용해야 함
- 한 번 거부하면 브라우저 설정에서 수동으로 변경 필요

---

## 🐛 문제 해결

### **"VAPID 키가 설정되지 않았습니다" 오류**

```bash
# VAPID 키 생성
npx web-push generate-vapid-keys

# 환경 변수에 추가
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

### **알림이 표시되지 않음**

1. 브라우저 알림 권한 확인
2. HTTPS 사용 확인 (또는 localhost)
3. Service Worker 등록 확인 (F12 → Application → Service Workers)

### **알림이 중복으로 표시됨**

- `tag` 속성 사용으로 동일한 태그는 하나의 알림만 표시됨

---

## 🎉 배포

### **로컬 테스트**

```bash
npm install web-push
npx web-push generate-vapid-keys
# .env 파일에 키 추가
npm start
```

### **프로덕션 배포**

```bash
# Railway에 환경 변수 추가 후
git add .
git commit -m "feat: PWA 푸시 알림 추가"
git push origin main
```

Railway와 Vercel이 자동으로 배포합니다.

---

## ✅ 체크리스트

배포 전 확인 사항:

- [ ] `npm install web-push` 실행
- [ ] VAPID 키 생성 완료
- [ ] Railway 환경 변수 설정 완료
  - [ ] `VAPID_PUBLIC_KEY`
  - [ ] `VAPID_PRIVATE_KEY`
  - [ ] `VAPID_SUBJECT`
- [ ] Service Worker 업데이트 확인
- [ ] 테스트 알림 정상 작동 확인
- [ ] 실제 이벤트(연차 신청 등) 알림 테스트 완료

---

**이제 Socket.io 없이도 백그라운드에서 푸시 알림을 받을 수 있습니다!** 🎉
