# 🚀 로컬 PC 백엔드 서버 배포 가이드

## 📋 개요

Railway 대신 Windows PC에서 백엔드 서버를 실행하는 가이드입니다.

---

## 🎯 배포 아키텍처

```
┌─────────────────┐
│  프론트엔드      │  Vercel (React)
│  Vercel         │  https://your-app.vercel.app
└────────┬────────┘
         │ API 요청
         ↓
┌─────────────────┐
│  백엔드         │  로컬 Windows PC (Node.js/Express)
│  Windows PC     │  http://192.168.0.100:5000
└────────┬────────┘
         │ DB 연결
         ↓
┌─────────────────┐
│  데이터베이스    │  MongoDB Atlas
│  MongoDB Atlas  │  mongodb+srv://...
└─────────────────┘
```

---

## 1️⃣ 사전 준비

### 필수 소프트웨어
- [x] Node.js 18.x 이상
- [x] npm
- [ ] PM2 (프로세스 관리 - 권장)

### PM2 설치
```bash
npm install -g pm2
```

---

## 2️⃣ 환경 변수 설정

### .env 파일 수정 (필수!)

프로젝트 루트의 `.env` 파일을 열고 다음 값들을 수정하세요:

```bash
# 1. MongoDB Atlas 연결 문자열 (Railway에서 사용하던 값)
MONGO_URI=mongodb+srv://admin:<password>@cluster.xxxxx.mongodb.net/busung_hr

# 2. Vercel 프론트엔드 URL
FRONTEND_URL=https://bs-hr-system.vercel.app

# 3. OpenAI API 키
OPENAI_API_KEY=sk-proj-your-api-key

# 4. 로컬 IP 주소 (ipconfig로 확인)
LOCAL_IP=192.168.0.100

# 5. 서버 URL
SERVER_URL=http://192.168.0.100:5000
```

### 로컬 IP 확인 방법

```bash
# Windows에서 IP 확인
ipconfig

# 예: 192.168.0.100 (이더넷 어댑터 IPv4 주소)
```

---

## 3️⃣ 백엔드 서버 실행

### 방법 1: 직접 실행 (개발/테스트용)

```bash
# 백엔드만 실행
npm run server:dev

# 또는
node server/server.js
```

### 방법 2: PM2로 실행 (프로덕션 권장)

```bash
# PM2로 서버 시작
pm2 start server/server.js --name bs-hr-backend

# 서버 상태 확인
pm2 status

# 로그 확인
pm2 logs bs-hr-backend

# 서버 재시작
pm2 restart bs-hr-backend

# 서버 중지
pm2 stop bs-hr-backend

# 부팅 시 자동 시작 설정
pm2 startup
pm2 save
```

### 방법 3: PM2 설정 파일 사용 (최적화)

```bash
# pm2.config.js 파일을 사용한 실행
pm2 start pm2.config.js

# 상태 확인
pm2 status

# 부팅 시 자동 시작
pm2 startup
pm2 save
```

---

## 4️⃣ Vercel 프론트엔드 환경 변수 업데이트

### Vercel Dashboard에서 설정

1. Vercel Dashboard → 프로젝트 선택
2. Settings → Environment Variables
3. 다음 변수를 **업데이트**:

```bash
# 로컬 PC 백엔드 URL
REACT_APP_API_BASE_URL=http://192.168.0.100:5000/api
REACT_APP_SERVER_URL=http://192.168.0.100:5000

# Socket.io URL (실시간 알림용)
REACT_APP_SOCKET_URL=http://192.168.0.100:5000
```

4. Save 클릭
5. Deployments → Redeploy (재배포)

---

## 5️⃣ 방화벽 설정

### Windows 방화벽 인바운드 규칙 추가

```powershell
# PowerShell 관리자 권한으로 실행
New-NetFirewallRule -DisplayName "BS HR Backend" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow
```

또는 수동 설정:
1. Windows 방화벽 → 고급 설정
2. 인바운드 규칙 → 새 규칙
3. 포트 → TCP → 5000
4. 연결 허용 → 완료

---

## 6️⃣ 테스트

### 백엔드 API 테스트

```bash
# 로컬에서 테스트
curl http://localhost:5000

# 사내 네트워크에서 테스트
curl http://192.168.0.100:5000

# API 엔드포인트 테스트
curl http://192.168.0.100:5000/api/notices
```

### 프론트엔드에서 테스트
1. Vercel URL 접속
2. 로그인 기능 테스트
3. 대시보드 데이터 로딩 확인
4. 브라우저 개발자 도구 → Network 탭에서 API 호출 확인

---

## 7️⃣ 서버 모니터링

### PM2 모니터링

```bash
# 실시간 모니터링
pm2 monit

# 상태 확인
pm2 status

# 로그 확인
pm2 logs

# 리소스 사용량 확인
pm2 status
```

---

## 8️⃣ 문제 해결

### 서버가 시작되지 않음

```bash
# 포트 5000이 사용 중인지 확인
netstat -ano | findstr :5000

# 프로세스 종료 (PID 확인 후)
taskkill /PID <PID> /F
```

### CORS 에러 발생

- `.env` 파일의 `FRONTEND_URL`이 Vercel URL과 정확히 일치하는지 확인
- 서버 재시작: `pm2 restart bs-hr-backend`

### MongoDB 연결 실패

- MongoDB Atlas Network Access에서 현재 IP 추가
- 또는 "Allow Access from Anywhere" (0.0.0.0/0) 설정

---

## 9️⃣ 보안 권장 사항

1. **고정 IP 사용**
   - 가능하면 사내 PC에 고정 IP 할당
   - 공유기 설정에서 DHCP 예약

2. **HTTPS 설정** (선택사항)
   - Nginx 리버스 프록시 + Let's Encrypt
   - 또는 Cloudflare Tunnel 사용

3. **API 키 보안**
   - `.env` 파일 권한 제한
   - 백업 시 API 키 제외

4. **정기 백업**
   ```bash
   npm run backup
   ```

---

## 🔟 Railway 제거

Railway를 더 이상 사용하지 않으므로:

1. Railway Dashboard → 프로젝트 삭제
2. GitHub Actions 워크플로우에서 Railway 배포 제거
3. `railway.json` 파일 삭제 (선택)

---

## ✅ 체크리스트

- [ ] Node.js 18.x 이상 설치 확인
- [ ] PM2 설치 완료
- [ ] `.env` 파일 설정 완료
- [ ] MongoDB Atlas 연결 문자열 확인
- [ ] 로컬 IP 주소 확인 (ipconfig)
- [ ] 백엔드 서버 실행 성공
- [ ] 방화벽 인바운드 규칙 추가
- [ ] Vercel 환경 변수 업데이트
- [ ] Vercel 재배포 완료
- [ ] API 호출 테스트 성공
- [ ] PM2 자동 시작 설정 완료

---

## 📌 유용한 명령어

```bash
# 서버 시작
pm2 start server/server.js --name bs-hr-backend

# 서버 중지
pm2 stop bs-hr-backend

# 서버 재시작
pm2 restart bs-hr-backend

# 로그 확인
pm2 logs bs-hr-backend

# 부팅 시 자동 시작
pm2 startup
pm2 save

# PM2 삭제
pm2 delete bs-hr-backend

# 모든 프로세스 중지
pm2 stop all

# PM2 초기화
pm2 kill
```

---

## 🎉 완료!

이제 Railway 없이 로컬 PC에서 백엔드 서버를 운영할 수 있습니다!

**서버 접근 URL:**
- 로컬: http://localhost:5000
- 사내 네트워크: http://192.168.0.100:5000

**프론트엔드 URL:**
- Vercel: https://bs-hr-system.vercel.app

문의사항이 있으면 언제든지 질문하세요! 😊
