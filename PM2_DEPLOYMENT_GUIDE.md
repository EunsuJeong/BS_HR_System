# 🚀 pm2 단독 운영 설정 완료

## ✅ 완료된 설정

### 1. pm2 서버 실행
- **프로세스명**: bs-hr
- **상태**: online
- **포트**: 5000
- **로컬 접속**: http://localhost:5000
- **외부 접속**: http://112.218.236.188:5000
- **데이터베이스**: MongoDB Atlas 연결됨

### 2. 자동 시작 설정
- **pm2-windows-startup**: 설치 완료
- **Windows 시작 프로그램**: 등록 완료
- **재부팅 시**: 자동으로 서버 시작

### 3. 환경 변수
- **.env 파일**: 로컬 PC 운영 설정 완료
- **IS_INTERNAL_SERVER**: true (self-ping 비활성화)
- **MongoDB**: Atlas 연결 설정됨

---

## ⚠️ 필수: Vercel 환경 변수 변경

프론트엔드(Vercel)가 pm2 로컬 서버를 사용하도록 환경 변수를 변경해야 합니다.

### 변경 방법:

1. **Vercel Dashboard 접속**
   - https://vercel.com 로그인
   - 프로젝트 선택 (bs-hr-system 또는 유사 이름)

2. **Settings → Environment Variables**
   - 좌측 메뉴에서 "Settings" 클릭
   - "Environment Variables" 탭 선택

3. **다음 환경 변수들을 찾아서 변경**:

```bash
# 기존 값 (Railway)
REACT_APP_API_BASE_URL=https://bs-hr-system-production.up.railway.app/api
REACT_APP_SERVER_URL=https://bs-hr-system-production.up.railway.app
REACT_APP_SOCKET_URL=https://bs-hr-system-production.up.railway.app

# 새로운 값 (pm2 로컬 서버)
REACT_APP_API_BASE_URL=http://112.218.236.188:5000/api
REACT_APP_SERVER_URL=http://112.218.236.188:5000
REACT_APP_SOCKET_URL=http://112.218.236.188:5000
```

4. **환경 적용 범위 선택**
   - ✅ Production
   - ✅ Preview
   - ✅ Development

5. **Save** 클릭

6. **자동 재배포 대기**
   - Vercel이 자동으로 재배포 시작
   - 2-3분 소요
   - Deployments 탭에서 진행 상황 확인

---

## 🔧 pm2 관리 명령어

### 기본 명령어
```bash
pm2 list              # 프로세스 목록 확인
pm2 logs bs-hr        # 서버 로그 확인
pm2 monit             # 실시간 모니터링
pm2 restart bs-hr     # 서버 재시작
pm2 stop bs-hr        # 서버 중지
pm2 start bs-hr       # 서버 시작
pm2 delete bs-hr      # 프로세스 삭제
```

### 유용한 명령어
```bash
pm2 logs bs-hr --lines 50     # 최근 50줄 로그
pm2 logs bs-hr --err          # 에러 로그만
pm2 flush                     # 로그 파일 초기화
pm2 save                      # 현재 프로세스 목록 저장
```

---

## 🌐 서버 접속 주소

### 사내망 (빠른 속도)
- 직원 PC에서 접속: `http://192.168.0.118:5000`
- 내부 IP 사용 (공유기 내부)

### 외부 접속
- 외부에서 접속: `http://112.218.236.188:5000`
- 공인 IP 사용
- 포트포워딩 필요 (이미 설정됨)

### Vercel 프론트엔드
- 배포 후 URL: `https://bs-hr-system.vercel.app`
- pm2 서버와 연결됨

---

## ⚙️ 서버 설정 파일

### .env 파일 (c:\BS_HR_System\.env)
```bash
NODE_ENV=production
PORT=5000
IS_INTERNAL_SERVER=true
JWT_SECRET=busung-hr-2024-super-secret-jwt-key-local-pc-deployment
MONGO_URI=mongodb://busungsteel:...@ac-lao1rwc-shard-00-00.kn5khqw.mongodb.net:27017/busung_hr?ssl=true&authSource=admin&retryWrites=true&w=majority
```

### pm2 프로세스
- **이름**: bs-hr
- **스크립트**: server/server.js
- **모드**: fork
- **재시작 횟수**: 자동 (에러 시 재시작)

---

## 🔍 문제 해결

### 서버가 실행되지 않을 때
```bash
pm2 list              # 상태 확인
pm2 logs bs-hr        # 에러 로그 확인
pm2 restart bs-hr     # 재시작 시도
```

### MongoDB 연결 실패
- MongoDB Atlas 클러스터 상태 확인
- Network Access에서 IP 허용 확인 (0.0.0.0/0)
- .env 파일의 MONGO_URI 확인

### 외부 접속 안 될 때
- 공유기 포트포워딩 확인 (5000번 포트)
- Windows 방화벽 확인
- 공인 IP 변경 확인 (DDNS 사용 권장)

### Vercel 배포 후에도 이전 서버 접속
- 브라우저 캐시 삭제 (Ctrl + Shift + Delete)
- Vercel 환경 변수 다시 확인
- Vercel 재배포 (Deployments → Redeploy)

---

## 📊 서버 상태 확인

### 서버 응답 테스트
```powershell
# PowerShell에서 실행
Invoke-WebRequest -Uri "http://localhost:5000" -Method GET
```

### API 테스트
```powershell
# 직원 데이터 조회
Invoke-RestMethod -Uri "http://localhost:5000/api/hr/employees" -Method GET

# 공지사항 조회
Invoke-RestMethod -Uri "http://localhost:5000/api/communication/notices" -Method GET
```

---

## ✅ 최종 체크리스트

- [x] pm2 서버 실행 중
- [x] Windows 시작 프로그램 등록
- [x] MongoDB Atlas 연결
- [x] 로컬 환경 변수 설정
- [ ] **Vercel 환경 변수 변경** ← 필수!
- [ ] Vercel 재배포 확인
- [ ] 프론트엔드에서 데이터 로딩 확인

---

## 🎉 완료!

pm2 단독 운영 설정이 완료되었습니다!

**Railway는 자동으로 sleep 모드로 전환되어 비용이 발생하지 않습니다.**

### 다음 단계:
1. ✅ Vercel 환경 변수 변경
2. ✅ Vercel 재배포 확인
3. ✅ 브라우저에서 프론트엔드 접속 테스트
4. ✅ 데이터 조회/입력 정상 동작 확인

---

**📝 이 문서는 나중에 참고할 수 있도록 보관하세요!**
