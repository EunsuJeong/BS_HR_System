# MongoDB 백업 및 복원 가이드

## 최초 사용 방법 (조광단 참고)

### 1. 백업하기 (원본 컴퓨터)

```bash
npm run backup
```

**실행 결과:**

- `backups/` 폴더에 `backup_YYYY-MM-DDTHH-MM-SS.json` 파일 생성
- 모든 MongoDB 컬렉션 데이터가 JSON 형식으로 저장됨

### 2. 백업 파일 복사

생성된 백업 파일을 다른 컴퓨터로 복사:

```
C:\Users\Owner\Desktop\업무용 간편화용 폴더\HR_Program\BS_Min\backups\backup_YYYY-MM-DDTHH-MM-SS.json
```

→ 다른 컴퓨터의 동일한 `backups/` 폴더에 복사

### 3. 복원하기 (대상 컴퓨터)

**필수 준비 사항:**

1. MongoDB 설치 및 실행 중
2. `.env` 파일 설정 완료
3. `npm install` 완료

**복원 명령어:**

```bash
npm run restore
```

**복원 과정:**

1. 사용 가능한 백업 파일 목록 표시
2. 복원할 백업 번호 선택 (최신: 1)
3. 확인 메시지 (yes 입력)
4. 데이터 복원 완료

### 4. 서버 재시작

```bash
npm start
```

## 백업에 포함되는 데이터

- **employees**: 직원 정보
- **notices**: 공지사항
- **suggestions**: 건의사항
- **leaverequests**: 연차 신청
- **overtimes**: 연장근무
- **payrolls**: 급여
- **admins**: 관리자
- **attendances**: 출근 기록
- **evaluations**: 평가

## 주의사항

⚠️ **복원 시 기존 데이터가 삭제됩니다!**

- 복원 전 현재 데이터를 백업하세요
- 복원 후 서버를 재시작해야 합니다

## 백업 파일 위치

```
C:\Users\Owner\Desktop\업무용 간편화용 폴더\HR_Program\BS_Min\backups\
```

## 문제 해결

### MongoDB 연결 실패

- MongoDB 서비스가 실행 중인지 확인
- `.env` 파일의 `MONGODB_URI` 확인

### 백업 파일이 없음

- `npm run backup`을 먼저 실행하세요

### 복원 실패

- 백업 파일이 손상되지 않았는지 확인
- MongoDB 버전 호환성 확인
