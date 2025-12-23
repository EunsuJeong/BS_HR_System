# 🍃 MongoDB Atlas 클러스터 생성 가이드

부성스틸 AI 인사관리 시스템을 위한 MongoDB Atlas 설정을 단계별로 안내합니다.

---

## 📋 목차

1. [계정 생성/로그인](#1-계정-생성로그인)
2. [클러스터 생성](#2-클러스터-생성)
3. [데이터베이스 사용자 생성](#3-데이터베이스-사용자-생성)
4. [Network Access 설정](#4-network-access-설정)
5. [연결 문자열 복사](#5-연결-문자열-복사)
6. [연결 테스트](#6-연결-테스트)

---

## 1. 계정 생성/로그인

### Step 1-1: MongoDB Atlas 접속
```
https://www.mongodb.com/cloud/atlas
```

### Step 1-2: 계정 생성 (처음 사용하는 경우)
1. **"Try Free"** 버튼 클릭
2. 회원가입 방법 선택:
   - **Email로 가입** (권장)
   - 또는 Google 계정 연동

3. Email로 가입하는 경우:
   ```
   Email: your-email@example.com
   First Name: 이름
   Last Name: 성
   Password: 강력한 비밀번호 (8자 이상, 대소문자/숫자 포함)
   ```

4. **"Create your Atlas account"** 클릭

5. 이메일 인증:
   - 입력한 이메일로 인증 메일 전송됨
   - 이메일에서 **"Verify Email"** 클릭

### Step 1-3: 로그인
- 이미 계정이 있는 경우:
  - **"Sign In"** 클릭
  - Email과 Password 입력

---

## 2. 클러스터 생성

### Step 2-1: 프로젝트 생성 (처음 사용하는 경우)
1. 로그인 후 **"Build a Database"** 클릭

2. 프로젝트 정보 입력:
   ```
   Project Name: BS_HR_System
   ```

3. **"Next"** 클릭

### Step 2-2: 배포 타입 선택
여러 옵션이 표시됩니다:

```
┌─────────────────────────────────────────────┐
│ Shared (무료)        - M0 FREE             │ ← 이것 선택!
│ Dedicated          - M10 ~ M400           │
│ Serverless         - Pay as you go        │
└─────────────────────────────────────────────┘
```

**"M0 FREE"** 또는 **"Shared"** 선택
- 저장공간: 512MB
- RAM: Shared
- 비용: **무료**

**"Create"** 또는 **"Create Deployment"** 클릭

### Step 2-3: 클라우드 제공자 및 지역 선택

#### 클라우드 제공자:
```
☐ AWS       ← 권장
☐ Google Cloud
☐ Azure
```
**AWS** 선택 권장

#### 지역 (Region):
```
추천 순서:
1. Seoul (ap-northeast-2)           ← 가장 추천!
2. Tokyo (ap-northeast-1)
3. Singapore (ap-southeast-1)
```

**Seoul (ap-northeast-2)** 선택 (한국에서 가장 빠름)

### Step 2-4: 클러스터 이름 설정
```
Cluster Name: Cluster0         ← 기본값 사용 또는
              busung-hr        ← 원하는 이름으로 변경
```

### Step 2-5: 추가 설정 (선택사항)
- **Cluster Tier**: M0 Sandbox (무료) - 변경 불필요
- **Additional Settings**: 기본값 유지
- **Cluster Name**: 원하는 이름으로 변경 가능

### Step 2-6: 클러스터 생성 완료
**"Create Cluster"** 또는 **"Create Deployment"** 버튼 클릭

⏱️ 클러스터 생성 시간: **약 1-3분 소요**

생성 중 화면:
```
Creating your cluster...
Your cluster is being created. This may take a few minutes.
```

---

## 3. 데이터베이스 사용자 생성

클러스터 생성이 완료되면 보안 설정 화면이 나타납니다.

### Step 3-1: 사용자 인증 방법 선택
```
┌────────────────────────────────────────┐
│ Username and Password  ← 이것 선택!   │
│ Certificate                            │
│ AWS IAM                                │
└────────────────────────────────────────┘
```

### Step 3-2: 사용자 정보 입력
```
Username: admin                    ← 기억할 것!
Password: [자동 생성] 또는 직접 입력  ← 반드시 저장!
```

**중요**: 비밀번호를 꼭 안전한 곳에 저장하세요!

#### 비밀번호 생성 방법:
1. **"Autogenerate Secure Password"** 클릭 (권장)
   - 자동으로 강력한 비밀번호 생성
   - 복사 버튼으로 복사하여 저장

2. 또는 직접 입력:
   - 최소 8자 이상
   - 대문자, 소문자, 숫자 포함
   - 특수문자 사용 권장

### Step 3-3: 권한 설정
```
Built-in Role: Atlas admin  ← 선택
```

**"Create User"** 클릭

### Step 3-4: 생성된 정보 저장
```
✅ 저장할 정보:
Username: admin
Password: [생성된 비밀번호]
```

**메모장이나 안전한 곳에 저장!**

---

## 4. Network Access 설정

데이터베이스에 접근할 수 있는 IP 주소를 설정합니다.

### Step 4-1: IP Access List 추가
보안 설정 화면에서 계속 진행하거나,
왼쪽 메뉴 → **Security** → **Network Access** 클릭

### Step 4-2: IP 주소 추가
**"Add IP Address"** 버튼 클릭

### Step 4-3: 접근 허용 방법 선택

#### 옵션 1: 어디서나 접근 허용 (권장 - 개발 및 배포용)
```
┌────────────────────────────────────────┐
│ ✓ Allow Access from Anywhere          │
│   IP Address: 0.0.0.0/0                │
└────────────────────────────────────────┘
```
**"Allow Access from Anywhere"** 클릭
- Railway, Vercel 등 배포 플랫폼에서 접근 가능
- 개발 중에도 편리하게 사용 가능

#### 옵션 2: 현재 IP만 허용 (보안 강화)
```
┌────────────────────────────────────────┐
│ ✓ Add Current IP Address              │
│   IP Address: [자동 감지]              │
└────────────────────────────────────────┘
```
- 더 안전하지만 배포 시 추가 설정 필요
- Railway IP 주소를 별도로 추가해야 함

### Step 4-4: 설명 추가 (선택사항)
```
Description: Allow all (for development and deployment)
             또는
             Railway + Vercel + Development
```

### Step 4-5: 추가 완료
**"Confirm"** 또는 **"Add Entry"** 클릭

---

## 5. 연결 문자열 복사

### Step 5-1: Connect 버튼 클릭
1. 왼쪽 메뉴 → **Database** 클릭
2. 생성된 클러스터에서 **"Connect"** 버튼 클릭

### Step 5-2: 연결 방법 선택
```
┌────────────────────────────────────────┐
│ Drivers                ← 이것 선택!   │
│ MongoDB Compass                        │
│ MongoDB Shell                          │
└────────────────────────────────────────┘
```
**"Drivers"** 선택

### Step 5-3: 드라이버 버전 선택
```
Driver: Node.js
Version: 4.1 or later  ← 선택
```

### Step 5-4: 연결 문자열 복사
화면에 표시된 연결 문자열을 복사합니다:

```mongodb
mongodb+srv://admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

**중요 사항:**
1. `<password>` 부분을 실제 비밀번호로 교체해야 합니다
2. 데이터베이스 이름을 추가해야 합니다

### Step 5-5: 연결 문자열 수정
복사한 문자열을 다음과 같이 수정:

#### 수정 전:
```
mongodb+srv://admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

#### 수정 후:
```
mongodb+srv://admin:YOUR_ACTUAL_PASSWORD@cluster0.xxxxx.mongodb.net/busung_hr?retryWrites=true&w=majority
```

**변경 사항:**
1. `<password>` → 실제 비밀번호로 교체
2. `/?retryWrites` → `/busung_hr?retryWrites` (데이터베이스 이름 추가)

### Step 5-6: 최종 연결 문자열 저장
```
✅ Railway에 사용할 연결 문자열:
mongodb+srv://admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/busung_hr?retryWrites=true&w=majority

⚠️ 비밀번호에 특수문자가 있으면 URL 인코딩 필요:
@ → %40
: → %3A
/ → %2F
# → %23
? → %3F
```

---

## 6. 연결 테스트

### Step 6-1: 로컬에서 테스트 (선택사항)
```bash
# .env 파일에 연결 문자열 추가
echo "MONGO_URI=mongodb+srv://admin:PASSWORD@cluster0.xxxxx.mongodb.net/busung_hr?retryWrites=true&w=majority" >> .env

# 서버 실행 테스트
npm run server:dev
```

성공 메시지:
```
✅ MongoDB 연결 성공
```

### Step 6-2: MongoDB Compass로 테스트 (선택사항)
1. MongoDB Compass 다운로드:
   - https://www.mongodb.com/try/download/compass

2. 연결 문자열 붙여넣기

3. **"Connect"** 클릭

4. 연결 성공 확인

---

## 📋 완료 체크리스트

배포 전 확인사항:

- [ ] MongoDB Atlas 계정 생성/로그인 완료
- [ ] M0 무료 클러스터 생성 완료
- [ ] 지역: Seoul (ap-northeast-2) 선택
- [ ] 데이터베이스 사용자 생성 완료
  - Username: `admin` (또는 다른 이름)
  - Password: 저장 완료 ✅
- [ ] Network Access 설정 완료
  - 0.0.0.0/0 허용 (또는 특정 IP)
- [ ] 연결 문자열 복사 및 수정 완료
  - `<password>` → 실제 비밀번호로 교체 ✅
  - 데이터베이스 이름 `busung_hr` 추가 ✅
- [ ] 연결 문자열 안전한 곳에 저장 완료

---

## 🎯 다음 단계

MongoDB Atlas 설정이 완료되었으면:

1. **Railway 백엔드 배포**로 이동
   - 연결 문자열을 Railway 환경 변수에 추가

2. 환경 변수 이름:
   ```
   MONGO_URI=mongodb+srv://admin:PASSWORD@...
   ```

---

## 🆘 문제 해결

### "Authentication failed" 에러
- 비밀번호가 정확한지 확인
- 연결 문자열에서 `<password>` 제거했는지 확인
- 비밀번호에 특수문자가 있으면 URL 인코딩 필요

### "Network timeout" 에러
- Network Access에 IP가 추가되었는지 확인
- 0.0.0.0/0이 허용되어 있는지 확인

### "Database not found" 에러
- 연결 문자열에 `/busung_hr` 추가했는지 확인
- 데이터베이스는 첫 데이터 저장 시 자동 생성됨

### 클러스터가 보이지 않음
- 왼쪽 메뉴 → Database 클릭
- 프로젝트가 올바르게 선택되었는지 확인

---

## 💾 최종 확인 정보

배포 시 필요한 정보를 기록하세요:

```
✅ MongoDB Atlas 정보:

Cluster Name: __________________
Region: Seoul (ap-northeast-2)
Database Name: busung_hr

Username: __________________
Password: __________________

연결 문자열:
mongodb+srv://__________________.mongodb.net/busung_hr?retryWrites=true&w=majority
```

---

## 🎉 축하합니다!

MongoDB Atlas 클러스터 생성이 완료되었습니다!

다음 단계: **Railway 백엔드 배포**
- DEPLOYMENT_CHECKLIST.md의 "2️⃣ Railway 백엔드 배포" 섹션으로 이동
- 생성한 연결 문자열을 Railway 환경 변수에 추가
