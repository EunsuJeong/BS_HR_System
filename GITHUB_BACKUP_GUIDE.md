# GitHub Actions 자동 백업 설정 가이드

## 📋 개요

MongoDB Atlas M0(무료) 버전은 자체 백업 기능이 없으므로, GitHub Actions를 사용하여 매일 자동으로 백업합니다.

- **실행 시간**: 매일 자정 00:00 (KST)
- **백업 저장소**: GitHub repository의 `backups/` 폴더
- **보관 기간**: 15일 (자동 삭제)

---

## 🔧 설정 방법

### 1단계: GitHub Secrets 설정

백업을 위해 MongoDB 연결 정보를 GitHub Secrets에 추가해야 합니다.

#### 1-1. GitHub Repository 이동
```
https://github.com/EunsuJeong/BS_HR_System
```

#### 1-2. Settings → Secrets and variables → Actions
1. Repository 페이지에서 **Settings** 클릭
2. 왼쪽 메뉴에서 **Secrets and variables** → **Actions** 클릭
3. **New repository secret** 버튼 클릭

#### 1-3. Secret 추가
- **Name**: `MONGO_URI`
- **Value**:
  ```
  mongodb+srv://busungsteel:AXHNEOz4zTzSplR5@busungsteel.kn5khqw.mongodb.net/busung_hr?retryWrites=true&w=majority&appName=busungsteel
  ```
- **Add secret** 클릭

---

### 2단계: GitHub에 코드 푸시

```bash
git add .
git commit -m "feat: Add GitHub Actions auto backup"
git push origin main
```

---

## ✅ 확인 방법

### 자동 백업 확인

1. GitHub Repository → **Actions** 탭
2. "MongoDB 자동 백업" workflow 확인
3. 매일 자정 이후 실행 기록 확인

### 수동 백업 실행

자동 백업 외에 수동으로 즉시 백업할 수 있습니다:

1. GitHub Repository → **Actions** 탭
2. 왼쪽에서 "MongoDB 자동 백업" 클릭
3. 오른쪽 **Run workflow** 버튼 클릭
4. **Run workflow** 확인 버튼 클릭

### 백업 파일 확인

백업이 성공하면 `backups/` 폴더에 파일이 커밋됩니다:
```
backups/
  └── backup_2025-12-24T00-00-00.json
```

---

## 📊 백업 세부사항

### 백업 파일 형식
```json
{
  "admins": [...],
  "employees": [...],
  "attendances": [...],
  "leaves": [...],
  "schedules": [...],
  "notices": [...],
  "aiRecommendations": [...]
}
```

### Cron 스케줄
```yaml
schedule:
  # 매일 자정 00:00 KST (UTC 15:00)
  - cron: '0 15 * * *'
```

### 자동 삭제
15일이 지난 백업 파일은 자동으로 삭제됩니다.

---

## 🔄 복원 방법

### 로컬 환경에서 복원
```bash
# 백업 파일 다운로드 (GitHub에서)
# 또는 git pull로 최신 백업 받기

# 복원 실행
npm run restore
```

복원 시 백업 파일 목록이 표시되며, 선택한 백업으로 복원됩니다.

---

## ❓ 문제 해결

### Actions가 실행되지 않을 때

1. **Repository Settings 확인**
   - Settings → Actions → General
   - "Allow all actions and reusable workflows" 선택
   - **Save** 클릭

2. **Secret 확인**
   - Settings → Secrets and variables → Actions
   - `MONGO_URI`가 제대로 설정되었는지 확인

### 백업 실패 시

1. Actions 탭에서 실패한 workflow 클릭
2. 에러 로그 확인
3. 주요 원인:
   - MongoDB 연결 실패 → `MONGO_URI` 확인
   - 권한 문제 → Repository Settings 확인

---

## 💡 장점

✅ **완전 무료**: GitHub Actions 무료 tier 사용
✅ **자동 실행**: PC 꺼져도 매일 자정 자동 백업
✅ **버전 관리**: Git history로 모든 백업 기록 추적
✅ **복원 간편**: 언제든지 이전 백업으로 복원 가능
✅ **보안**: GitHub Secrets로 안전하게 관리

---

## 📌 주의사항

⚠️ **Public Repository 경고**
- 현재 repository가 public이면 백업 파일도 공개됩니다
- 민감한 데이터가 있다면 repository를 **Private**으로 설정하세요

⚠️ **GitHub 저장 용량**
- 백업 파일 크기가 커지면 GitHub 용량 제한에 걸릴 수 있습니다
- 무료 계정: 1GB 제한
- 필요시 보관 기간을 7일로 단축하세요

---

## 🎯 다음 단계

1. ✅ GitHub Secrets 설정
2. ✅ 코드 푸시
3. ✅ Actions 탭에서 수동 백업 테스트
4. ✅ 백업 파일 확인
5. ✅ 복원 테스트 (선택사항)

설정이 완료되면 매일 자정마다 자동으로 백업됩니다! 🎉
