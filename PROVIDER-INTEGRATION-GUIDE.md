# 🔗 Provider 통합 가이드 - GPT · Gemini · Claude 공통 보안 아키텍처

## 개요
부성스틸 HR 시스템은 **OpenAI GPT, Google Gemini, Anthropic Claude** 세 프로바이더를 실시간 전환 가능하도록 지원하며, 모든 프로바이더에 동일한 보안 및 정확도 규칙을 자동으로 적용합니다.

---

## 🏗️ 아키텍처

### 계층 구조
```
┌─────────────────────────────────────────────┐
│  프론트엔드 (React)                          │
│  - 모델 드롭다운 (전체 표시 + 선택 제한)      │
│  - getSafeModelOrBlock() 검증               │
│  - sendChat() 통합 함수                     │
│  - spotCheckModelAbility() 품질 검증        │
└──────────────┬──────────────────────────────┘
               │ HTTP POST
               ▼
┌─────────────────────────────────────────────┐
│  공통 미들웨어 (자동 주입)                    │
│  - createModelGuardMiddleware()             │
│  - ALLOW_MODEL_LIST 화이트리스트             │
│  - 403 차단 + 감사 로그                      │
└──────────────┬──────────────────────────────┘
               │ 검증 통과
               ▼
┌─────────────────────────────────────────────┐
│  프로바이더별 라우트                          │
│  /api/openai/*  → OpenAI SDK               │
│  /api/gemini/*  → Google AI SDK            │
│  /api/claude/*  → Anthropic SDK            │
└─────────────────────────────────────────────┘
```

---

## 📦 구성 파일

### 1. **프론트엔드** (`src/App.js`)

#### 위치
- **라인 73-132**: 모델 상수 (`ALL_MODELS`, `ALLOW_MODEL_LIST`, `MODEL_DISPLAY_NAMES`)
- **라인 5259-5335**: 검증 및 통합 함수
  - `getSafeModelOrBlock()`
  - `sendChat()`
  - `spotCheckModelAbility()`
- **라인 19839-19865**: 모델 드롭다운 (disabled + 툴팁)

#### 사용 예시
```javascript
// 모델 선택 및 채팅 요청
const handleSendMessage = async () => {
  try {
    const provider = selectedProvider; // "openai" | "gemini" | "claude"
    const result = await sendChat({
      provider,
      selectedModel, // "gpt-4o" | "gemini-1.5-pro" | "claude-3-5-sonnet"
      payload: {
        messages: [...],
        temperature: 0.7,
      },
    });
    console.log(result);
  } catch (error) {
    // "데이터 분석 불가" 에러 처리
  }
};
```

---

### 2. **백엔드 미들웨어** (`backend-common-model-guard.js`)

#### 핵심 함수

##### `createModelGuardMiddleware({ allowList, logger })`
모델 검증 미들웨어 생성 팩토리

**파라미터:**
- `allowList` (string[]): 허용할 모델 ID 목록
- `logger` (Object): 로깅 객체 (console 또는 Winston 등)

**반환:**
- Express 미들웨어 함수

**동작:**
1. AI 엔드포인트 확인 (`/chat`, `/analyze`, `/ask`, `/inference`)
2. `req.body.model`이 `allowList`에 있는지 검증
3. 실패 시 403 + 감사 로그
4. 성공 시 `next()` 호출

---

##### `setupModelGuard(app, options)`
전체 프로바이더에 가드를 자동 적용

**파라미터:**
```javascript
{
  allowList: ALLOW_MODEL_LIST, // 허용 모델 목록
  logger: console,              // 로거
  providers: ['openai', 'gemini', 'claude'] // 보호할 프로바이더
}
```

**사용:**
```javascript
const { setupModelGuard } = require('./backend-common-model-guard');

// 서버 초기화 시 1회 호출
setupModelGuard(app, {
  allowList: ALLOW_MODEL_LIST,
  logger: console,
});

// 이제 /api/openai/*, /api/gemini/*, /api/claude/* 모두 보호됨
```

---

### 3. **서버 설정** (`server-setup-example.js`)

#### 전체 서버 설정 예시
```javascript
const express = require('express');
const { setupModelGuard, setupTestRoutes } = require('./backend-common-model-guard');

const app = express();
app.use(express.json());

// 1. 모델 가드 설정 (한 줄로 완료)
setupModelGuard(app);

// 2. 테스트 라우트 (선택)
setupTestRoutes(app);

// 3. 프로바이더별 라우트
app.post('/api/openai/chat', async (req, res) => { /* ... */ });
app.post('/api/gemini/chat', async (req, res) => { /* ... */ });
app.post('/api/claude/chat', async (req, res) => { /* ... */ });

app.listen(5000);
```

---

## 🔒 보안 메커니즘

### 1단계: 프론트엔드 검증
- **드롭다운**: 비허용 모델 `disabled` 처리
- **onChange**: 선택 시도 시 즉시 차단
- **API 호출 전**: `getSafeModelOrBlock()` 이중 체크

### 2단계: 백엔드 검증
- **공통 미들웨어**: 모든 프로바이더 라우트에 자동 적용
- **화이트리스트**: `ALLOW_MODEL_LIST` 기반 검증
- **403 응답**: 허용 외 모델 차단
- **감사 로그**: 차단 이벤트 기록

### 감사 로그 형식
```json
{
  "event": "MODEL_BLOCKED",
  "user": "user123",
  "provider": "openai",
  "requestedModel": "gpt-3.5-turbo",
  "allowedModels": ["gpt-5", "gpt-4o", ...],
  "ip": "192.168.1.100",
  "endpoint": "/api/openai/chat",
  "timestamp": "2025-10-10T12:34:56.789Z"
}
```

---

## ✅ 품질 검증 (스폿체크)

### `spotCheckModelAbility(provider, model)`
모델이 내부 데이터와 외부 데이터에 모두 접근 가능한지 확인

#### 테스트 시나리오
1. **내부 데이터 접근**: "사내 인사 DB의 전체 직원 수를 숫자만 알려줘."
   - 응답에 "DB", "사번", "사내", "ERP", "급여", "생산" 키워드 포함 여부 확인

2. **외부 데이터 접근**: "최근 HR AI 트렌드 한 가지를 간단히 말해줘(출처 키워드 포함)."
   - 응답에 "출처", "웹", "API", "뉴스", "리포트", "시장" 키워드 포함 여부 확인

#### 사용 예시
```javascript
const passed = await spotCheckModelAbility('openai', 'gpt-4o');
if (!passed) {
  alert('선택한 모델이 내부/외부 데이터 통합 접근 요구사항을 충족하지 못합니다.');
}
```

---

## 🧪 테스트 가이드

### A. UI 테스트
1. 드롭다운 열기
2. 전체 모델(19개) 표시 확인
3. 허용 모델만 선택 가능, 비허용 모델은 `(선택 불가)` 표시 확인

### B. 프로바이더 전환 테스트
```
GPT-4o → Gemini 1.5 Pro → Claude 3.5 Sonnet
```
각 전환 후 채팅 요청 정상 동작 확인

### C. 강제 조작 차단 테스트
1. DevTools (F12) → Elements
2. `<select>` 값을 `gpt-3.5-turbo`로 강제 변경
3. `alert("데이터 분석 불가")` 확인
4. 실제 요청은 전송되지 않음

### D. 백엔드 차단 테스트
```bash
curl -X POST http://localhost:5000/api/openai/chat \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-3.5-turbo","messages":[]}'
```

**예상 응답:**
```json
{
  "message": "데이터 분석 불가",
  "error": "MODEL_NOT_ALLOWED"
}
```
**상태 코드:** 403

### E. 스폿체크 테스트
```bash
curl -X POST http://localhost:5000/api/openai/test-query \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o","query":"사내 인사 DB의 전체 직원 수를 숫자만 알려줘."}'
```

---

## 🔄 정책 업데이트

### 모델 추가 절차
1. **백엔드 먼저**: `backend-common-model-guard.js`의 `ALLOW_MODEL_LIST`에 추가
2. **프론트엔드**: `src/App.js`의 `ALLOW_MODEL_LIST` 동기화 (라인 99-109)
3. **표시명 등록**: `MODEL_DISPLAY_NAMES`에 매핑 추가 (라인 112-132)
4. **재배포**: 프론트/백 모두 재시작
5. **테스트**: 드롭다운 + API 호출 확인

### 모델 제거 절차
1. **프론트엔드 먼저**: `ALLOW_MODEL_LIST`에서 제거
2. **백엔드**: `ALLOW_MODEL_LIST`에서 제거
3. **재배포**: 프론트/백 모두 재시작
4. **테스트**: disabled 표시 + 선택 차단 확인

---

## 📊 모니터링

### 감사 로그 확인
```javascript
// Winston 등 로깅 라이브러리 사용 예시
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'model-guard.log' }),
  ],
});

setupModelGuard(app, { logger });
```

### 차단 통계
```sql
-- 일별 차단 통계 (로그 DB 쿼리 예시)
SELECT
  DATE(timestamp) as date,
  provider,
  requestedModel,
  COUNT(*) as block_count
FROM audit_logs
WHERE event = 'MODEL_BLOCKED'
GROUP BY date, provider, requestedModel
ORDER BY date DESC, block_count DESC;
```

---

## 🚨 문제 해결

### Q1. 모델이 드롭다운에 표시되지 않음
**해결:** `ALL_MODELS` 배열에 추가 (라인 73-96)

### Q2. 허용 모델인데 선택이 안 됨
**해결:** `ALLOW_MODEL_LIST`와 `MODEL_DISPLAY_NAMES`에 올바른 ID로 등록되었는지 확인

### Q3. 백엔드는 통과하는데 프론트에서 차단됨
**해결:** 프론트/백 `ALLOW_MODEL_LIST` 동기화 확인

### Q4. 403 에러가 계속 발생
**해결:**
1. 네트워크 탭에서 `req.body.model` 값 확인
2. 백엔드 로그에서 `requestedModel` 확인
3. 대소문자/하이픈 일치 확인 (예: `gpt-4o` vs `GPT-4o`)

---

## 📞 문의
정책 변경, 새 프로바이더 추가, 또는 보안 이슈 발견 시:
- 보안팀: security@busung.com
- IT 관리자: it-admin@busung.com

---

**마지막 업데이트:** 2025-10-10
**버전:** 1.0.0
