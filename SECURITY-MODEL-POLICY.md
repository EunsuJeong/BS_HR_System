# 🔒 AI 모델 보안 정책

## 개요
부성스틸 HR 시스템은 **내부 데이터(DB/ERP/인사/생산) + 외부 데이터(Web/API) 동시 접근**이 필요한 AI 분석 기능을 제공합니다.

보안 정책상 허용된 모델만 실제 사용 가능하도록 이중 가드를 적용합니다.

---

## 허용 모델 목록

### ✅ 허용된 모델 (내부+외부 동시 접근 가능)

#### OpenAI
- **GPT-5** (`gpt-5`)
- **GPT-4o** (`gpt-4o`)

#### Google Gemini
- **Gemini 1.5 Pro** (`gemini-1.5-pro`)
- **Gemini 1.5 Flash** (`gemini-1.5-flash`)

#### Anthropic Claude
- **Claude 3.5 Sonnet** (`claude-3-5-sonnet`)
- **Claude 3.5 Opus** (`claude-3-5-opus`)

---

### ⚠️ 제한된 모델 (드롭다운 표시되나 선택 불가)

#### OpenAI
- GPT-4o Mini, GPT-4 Turbo, GPT-4, GPT-3.5 Turbo 등

#### Google Gemini
- Gemini 1.5 Flash-8B

#### Anthropic Claude
- Claude 3 Opus

> **이유**: 회사 보안정책상 내부·외부 데이터 동시 접근 권한이 부여되지 않은 모델

---

## 보안 메커니즘

### 1단계: 프론트엔드 가드
- **드롭다운**: 비허용 모델은 `disabled` 상태로 표시
- **툴팁**: 선택 불가 사유 표시
- **onChange 검증**: 선택 시도 시 `alert("데이터 분석 불가")` 차단
- **API 호출 전 검증**: `getSafeModelOrBlock()` 함수로 이중 체크

### 2단계: 백엔드 가드
- **미들웨어**: 모든 AI API 요청에서 모델 검증
- **403 응답**: 허용되지 않은 모델 요청 차단
- **감사 로그**: 차단된 요청 기록 (userId, model, timestamp)

---

## 구현 위치

### 프론트엔드 (`src/App.js`)
```javascript
// 라인 73-132: 모델 목록 정의
const ALL_MODELS = [...];
const ALLOW_MODEL_LIST = [...];
const MODEL_DISPLAY_NAMES = {...};

// 라인 5259-5266: 검증 함수
const getSafeModelOrBlock = (model) => {...};

// 라인 19839-19865: 드롭다운 렌더링
<select onChange={(e) => {...}}>
  <option disabled={!opt.allowed} title={...}>
    {opt.allowed ? opt.name : `${opt.name} (선택 불가)`}
  </option>
</select>

// 라인 2963: API 호출 전 검증
const safeModel = getSafeModelOrBlock(selectedModel);
```

### 백엔드 (`backend-model-guard-middleware.js`)
```javascript
const ALLOW_MODEL_LIST = [...];

function modelGuardMiddleware(req, res, next) {
  if (!ALLOW_MODEL_LIST.includes(req.body?.model)) {
    return res.status(403).json({ message: "데이터 분석 불가" });
  }
  next();
}
```

---

## 정책 업데이트 절차

### 모델 추가 시
1. **백엔드 먼저**: `ALLOW_MODEL_LIST`에 모델 ID 추가
2. **프론트엔드**: `src/App.js` 라인 99-109에 모델 ID 추가
3. **표시명 등록**: `MODEL_DISPLAY_NAMES`에 매핑 추가 (라인 112-132)
4. **테스트**: 드롭다운 노출 + 선택 가능 + API 호출 성공 확인

### 모델 제거 시
1. **프론트엔드 먼저**: `ALLOW_MODEL_LIST`에서 제거
2. **백엔드**: 미들웨어 `ALLOW_MODEL_LIST`에서 제거
3. **테스트**: 드롭다운에서 disabled 표시 + 선택 차단 확인

---

## 테스트 체크리스트

- [ ] 드롭다운에 모든 모델 표시 (허용 + 비허용)
- [ ] 허용 모델은 선택 가능
- [ ] 비허용 모델은 `(선택 불가)` 표시 + disabled
- [ ] DevTools로 값 강제 변경 시 alert 차단
- [ ] 백엔드에 비허용 모델 요청 시 403 응답
- [ ] 허용 모델로 정상 분석 가능
- [ ] 에러 문구 일관성: "데이터 분석 불가"

---

## 감사 로그 예시

```json
{
  "timestamp": "2025-10-10T12:34:56.789Z",
  "event": "MODEL_BLOCKED",
  "userId": "user123",
  "requestedModel": "gpt-3.5-turbo",
  "allowedModels": ["gpt-5", "gpt-4o", ...],
  "ip": "192.168.1.100",
  "endpoint": "/api/ai/analyze"
}
```

---

## 문의
정책 변경이 필요한 경우 보안팀 및 IT 관리자에게 문의하세요.
