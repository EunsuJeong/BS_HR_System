/**
 * [2_관리자 모드] 2.11~2.12_시스템 관리 통합 모듈
 * - Constants → Hook → Util → Export
 * - UI 컴포넌트 제외, 지원 로직만 포함
 */

import { useCallback, useEffect, useRef, useState } from 'react';
// import * as CommonAIService from './CommonAIService'; // 병합됨: common_admin_ai
import * as CommonAIService from './common_admin_ai';

// ============================================================
// [2_관리자 모드] 2.12_시스템 관리 - CONSTANTS
// ============================================================

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
const FAIL_MSG = CommonAIService.FAIL_MSG;
const ALL_MODELS = CommonAIService.ALL_MODELS;
const ALLOW_MODEL_LIST = CommonAIService.ALLOW_MODEL_LIST;
const MODEL_DISPLAY_NAMES = CommonAIService.MODEL_DISPLAY_NAMES;

/**
 * AI 모델 타입 정의
 * CommonAIService에서 제공하는 AI 모델 타입 목록
 */
export const AI_MODEL_TYPES = CommonAIService.MODEL_TYPES;

/**
 * 지원되는 AI 모델 목록
 * 시스템에서 사용 가능한 AI 모델들의 정보
 */
export const AI_MODELS_LIST = [
  { id: 'gemini', name: 'Google Gemini', status: 'active' },
  { id: 'chatgpt', name: 'ChatGPT 4.0', status: 'active' },
  { id: 'gpt-4.1', name: 'GPT-4.1 Turbo', status: 'inactive' },
  { id: 'gpt-5', name: 'GPT-5', status: 'inactive' },
  { id: 'claude', name: 'Claude 3.5', status: 'inactive' },
];

// ============================================================
// [2_관리자 모드] 2.12_시스템 관리 - HOOKS
// ============================================================

/**
 * AI 모델 선택 및 상태 관리를 위한 커스텀 훅
 * @returns {Object} 모델 선택 관련 STATE 및 setter 함수들
 */
export const useModelSelection = () => {
  // *[2_관리자 모드] 2.12.10_선택 모델 타입*
  const [selectedModelType, setSelectedModelType] = useState(() => {
    return localStorage.getItem('selectedModelType') || '';
  });

  // *[2_관리자 모드] 2.12.11_모델 사용 상태*
  const [modelUsageStatus, setModelUsageStatus] = useState({
    chatgpt: false,
    claude: false,
    gemini: false,
  });

  // *[2_관리자 모드] 2.12.12_API 연결 상태*
  const [apiConnectionStatus, setApiConnectionStatus] = useState({
    chatgpt: 'unchecked',
    claude: 'unchecked',
    gemini: 'unchecked',
  });

  // *[2_관리자 모드] 2.12.13_동적 모델 목록*
  const [dynamicModelTypes, setDynamicModelTypes] = useState({
    chatgpt: [],
    claude: [],
    gemini: [],
  });

  return {
    selectedModelType,
    setSelectedModelType,
    modelUsageStatus,
    setModelUsageStatus,
    apiConnectionStatus,
    setApiConnectionStatus,
    dynamicModelTypes,
    setDynamicModelTypes,
  };
};

/**
 * 시스템 관리 및 AI 설정을 관리하는 커스텀 훅
 * @param {Function} devLog - 개발 로그 함수
 * @returns {Object} 시스템 관리 관련 STATE 및 함수들
 */
export const useSystemManagement = (devLog = console.log) => {
  // *[2_관리자 모드] 2.12_시스템 관리 STATE*
  const [geminiApiKey, setGeminiApiKey] = useState(
    process.env.REACT_APP_GEMINI_API_KEY || ''
  );
  const [chatgptApiKey, setChatgptApiKey] = useState(
    process.env.REACT_APP_OPENAI_API_KEY || ''
  );
  const [claudeApiKey, setClaudeApiKey] = useState(
    process.env.REACT_APP_ANTHROPIC_API_KEY || ''
  );

  // *[2_관리자 모드] 2.12.1_AI 모델 선택*
  const [selectedAiModel, setSelectedAiModel] = useState('gemini');

  // *[2_관리자 모드] 2.12.2_통합 AI Config*
  const [aiConfig, setAiConfig] = useState({
    provider: '',
    model: '',
    apiKey: '',
  });

  // *[2_관리자 모드] 2.12.3_AI 설정 UI*
  const [unifiedApiKey, setUnifiedApiKey] = useState('');
  const [detectedProvider, setDetectedProvider] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedUnifiedModel, setSelectedUnifiedModel] = useState('');
  const [unifiedSaveMessage, setUnifiedSaveMessage] = useState('');
  const [showUnifiedApiKey, setShowUnifiedApiKey] = useState(false);

  // *[1_공통] AI 어시스턴트*
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const aiMessagesEndRef = useRef(null);

  // *[2_관리자 모드] 2.1_AI 분석*
  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = localStorage.getItem('selectedAIModel');
    return saved || 'gpt-4o';
  });
  const [modelOptions, setModelOptions] = useState(
    ALL_MODELS.map((m) => ({
      id: m,
      name: MODEL_DISPLAY_NAMES[m] || m,
      allowed: ALLOW_MODEL_LIST.includes(m),
    }))
  );
  const [aiRecommendation, setAiRecommendation] = useState('');

  // *[2_관리자 모드] 2.12.4_Provider 자동 감지*
  const detectProviderFromKey = useCallback((key) => {
    if (!key || key.trim().length === 0) return '';
    const detected = CommonAIService.detectApiKeyType(key);
    return detected || 'unknown';
  }, []);

  // *[2_관리자 모드] 2.12.5_AI Config 로드 useEffect*
  useEffect(() => {
    const loadUnifiedAiConfig = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/ai/config`);
        if (response.ok) {
          const data = await response.json();
          if (data.provider && data.model && data.apiKey) {
            setUnifiedApiKey(data.apiKey);
            setDetectedProvider(data.provider);
            setSelectedUnifiedModel(data.model);
            devLog('✅ 통합 AI 설정 로드 완료:', {
              provider: data.provider,
              model: data.model,
            });
          }
        }
      } catch (error) {
        devLog('⚠️ 통합 AI 설정 로드 실패:', error);
      }
    };

    loadUnifiedAiConfig();
  }, [devLog]);

  // *[2_관리자 모드] 2.12.6_API Key 자동 감지 및 실제 사용 가능한 모델 조회*
  useEffect(() => {
    const loadModelsForProvider = async () => {
      const provider = detectProviderFromKey(unifiedApiKey);
      setDetectedProvider(provider);

      if (provider && provider !== 'unknown' && provider !== '' && unifiedApiKey.trim().length > 10) {
        try {
          devLog(`🔍 [API 키 검증] Provider: ${provider}, 실제 사용 가능한 모델 조회 중...`);

          // ✅ 실제 사용 가능한 모델 목록 조회 (API 키 검증 포함)
          const response = await fetch(
            `${API_BASE_URL}/ai/validate-and-get-models`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                provider: provider,
                apiKey: unifiedApiKey
              })
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.models) {
              setAvailableModels(data.models);
              devLog(`✅ ${provider} 실제 사용 가능한 모델 ${data.models.length}개 조회 완료:`, data.models);

              // 첫 번째 모델 자동 선택
              if (data.models.length > 0 && !selectedUnifiedModel) {
                setSelectedUnifiedModel(data.models[0]);
                devLog(`✅ 기본 모델 자동 선택: ${data.models[0]}`);
              }
            } else {
              setAvailableModels([]);
              devLog('⚠️ 사용 가능한 모델이 없습니다.');
            }
          } else {
            const errorData = await response.json();
            devLog('❌ API 키 검증 실패:', errorData.error);
            setAvailableModels([]);
            setDetectedProvider('unknown');
          }
        } catch (error) {
          devLog('❌ 모델 목록 로드 실패:', error);
          setAvailableModels([]);
          setDetectedProvider('unknown');
        }
      } else {
        setAvailableModels([]);
        setSelectedUnifiedModel('');
      }
    };

    // API 키가 최소 길이 이상일 때만 호출
    if (unifiedApiKey && unifiedApiKey.trim().length > 10) {
      // 디바운싱: 500ms 대기 후 실행 (사용자가 입력을 멈추면 실행)
      const timeoutId = setTimeout(() => {
        loadModelsForProvider();
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [unifiedApiKey, detectProviderFromKey, devLog]);

  // *[2_관리자 모드] 2.12.7_AI 설정 저장*
  const handleUnifiedAiSave = useCallback(async () => {
    setUnifiedSaveMessage('');

    if (!unifiedApiKey || !detectedProvider || !selectedUnifiedModel) {
      setUnifiedSaveMessage(
        '⚠️ API Key, Provider, 모델을 모두 입력/선택하세요.'
      );
      return;
    }

    if (detectedProvider === 'unknown') {
      setUnifiedSaveMessage('❌ 유효하지 않은 API Key 형식입니다.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/ai/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: detectedProvider,
          model: selectedUnifiedModel,
          apiKey: unifiedApiKey,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiConfig(data);
        setUnifiedSaveMessage(
          '✅ AI 설정이 성공적으로 저장되었습니다. 시스템 전체에 반영됩니다.'
        );
        devLog('✅ 통합 AI 설정 저장 완료:', data);

        setTimeout(() => setUnifiedSaveMessage(''), 3000);
      } else {
        const errorData = await response.json();
        setUnifiedSaveMessage(
          `❌ 저장 실패: ${errorData.error || '알 수 없는 오류'}`
        );
      }
    } catch (error) {
      devLog('❌ AI 설정 저장 오류:', error);
      setUnifiedSaveMessage(
        '❌ 서버 연결 실패. 백엔드 서버가 실행 중인지 확인하세요.'
      );
    }
  }, [unifiedApiKey, detectedProvider, selectedUnifiedModel, devLog]);

  // *[2_관리자 모드] 2.12.8_AI Config 재로드 useEffect*
  useEffect(() => {
    const loadAiConfig = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/ai/config`);
        if (response.ok) {
          const config = await response.json();
          setAiConfig(config);

          setUnifiedApiKey(config.apiKey || '');
          setDetectedProvider(config.provider || '');
          setSelectedUnifiedModel(config.model || '');
          devLog('✅ AI 통합 설정 로드 완료:', config);
        } else {
          devLog('⚠️ AI 설정 로드 실패, 기본값 사용');
          setAiConfig({ provider: '', model: '', apiKey: '' });
        }
      } catch (error) {
        devLog('❌ AI 설정 로드 오류:', error);
        setAiConfig({ provider: '', model: '', apiKey: '' });
      }
    };
    loadAiConfig();
  }, [devLog]);

  // *[2_관리자 모드] 2.1_서버 모델 로드*
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/system/available-models`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data?.models) && data.models.length) {
          const allModelsSet = new Set([...ALL_MODELS, ...data.models]);
          const merged = Array.from(allModelsSet).map((m) => ({
            id: m,
            name: MODEL_DISPLAY_NAMES[m] || m,
            allowed: ALLOW_MODEL_LIST.includes(m),
          }));
          setModelOptions(merged);
          setSelectedModel((prev) => {
            const allowedModels = merged.filter((x) => x.allowed);
            if (allowedModels.some((x) => x.id === prev)) return prev;
            return allowedModels.length > 0 ? allowedModels[0].id : 'gpt-4o';
          });
        }
      } catch (err) {
        devLog('모델 목록 로드 실패:', err);
      }
    })();
  }, [devLog]);

  // *[2_관리자 모드] 2.11_AI 메시지 자동 스크롤*
  useEffect(() => {
    if (aiMessagesEndRef.current && aiMessages.length > 0) {
      aiMessagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
      devLog('🔄 AI 채팅 자동 스크롤 실행 - 메시지 수:', aiMessages.length);
    }
  }, [aiMessages, devLog]);

  // *[2_관리자 모드] 2.12_모델 선택 검증*
  const getSafeModelOrBlock = useCallback((model) => {
    try {
      return CommonAIService.getSafeModelOrBlock(model);
    } catch (error) {
      alert(FAIL_MSG);
      throw error;
    }
  }, []);

  // *[2_관리자 모드] 2.12_API Key 저장*
  const saveKey = useCallback(async (keyType, keyValue) => {
    if (!keyValue?.trim()) {
      alert('API Key를 입력해주세요.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/system/update-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyType, keyValue }),
      });
      if (!res.ok) throw new Error('SAVE_FAIL');

      if (keyType === 'OPENAI_API_KEY') setChatgptApiKey('');
      if (keyType === 'ANTHROPIC_API_KEY') setClaudeApiKey('');
      if (keyType === 'GEMINI_API_KEY') setGeminiApiKey('');

      alert('API Key가 저장되었습니다.');
    } catch (error) {
      devLog('API Key 저장 실패:', error);
      alert(FAIL_MSG);
    }
  }, [devLog]);

  return {
    geminiApiKey,
    setGeminiApiKey,
    chatgptApiKey,
    setChatgptApiKey,
    claudeApiKey,
    setClaudeApiKey,
    selectedAiModel,
    setSelectedAiModel,
    aiConfig,
    setAiConfig,
    unifiedApiKey,
    setUnifiedApiKey,
    detectedProvider,
    setDetectedProvider,
    availableModels,
    setAvailableModels,
    selectedUnifiedModel,
    setSelectedUnifiedModel,
    unifiedSaveMessage,
    setUnifiedSaveMessage,
    showUnifiedApiKey,
    setShowUnifiedApiKey,
    detectProviderFromKey,
    handleUnifiedAiSave,
    // AI 어시스턴트
    aiMessages,
    setAiMessages,
    aiInput,
    setAiInput,
    aiMessagesEndRef,
    // AI 분석
    selectedModel,
    setSelectedModel,
    modelOptions,
    setModelOptions,
    aiRecommendation,
    setAiRecommendation,
    // AI 함수
    getSafeModelOrBlock,
    saveKey,
  };
};

/**
 * 시스템 상태 관리 Hook
 * - 시스템 각 컴포넌트(DB, API, AI 모델 등)의 상태 관리
 * - 권한 검증 및 작업 실행 관리
 * - 시스템 알림 및 보안 로그 모달 관리
 */
export const useSystemStatus = ({
  checkUserPermission,
  showUserNotification,
  logSystemEvent,
}) => {
  // *[2_관리자 모드] 2.12_시스템 관리 - 시스템 상태*
  const [systemStatus, setSystemStatus] = useState({
    database: {
      status: 'checking',
      message: 'DB 연결 상태 확인 중...',
      color: '#FFA726',
    },
    externalAPIs: {
      status: 'checking',
      message: 'API 연결 확인 중...',
      color: '#FFA726',
    },
    aiModels: {
      status: 'checking',
      message: 'AI 모델 상태 확인 중...',
      color: '#FFA726',
    },
    permissions: {
      status: 'active',
      message: '권한 시스템 활성',
      color: '#4CAF50',
    },
    logs: { status: 'active', message: '로그 시스템 활성', color: '#4CAF50' },
  });

  // *[2_관리자 모드] 2.12_시스템 관리 - 상태 설정*
  const statusConfig = {
    active: { icon: '✅', color: '#4CAF50', bgColor: '#E8F5E8' },
    warning: { icon: '⚠️', color: '#FF9800', bgColor: '#FFF3E0' },
    error: { icon: '❌', color: '#F44336', bgColor: '#FFEBEE' },
    checking: { icon: '🔄', color: '#2196F3', bgColor: '#E3F2FD' },
    inactive: { icon: '⭕', color: '#9E9E9E', bgColor: '#F5F5F5' },
    processing: { icon: '⏳', color: '#9C27B0', bgColor: '#F3E5F5' },
    success: { icon: '🎉', color: '#4CAF50', bgColor: '#E8F5E8' },
    blocked: { icon: '🚫', color: '#F44336', bgColor: '#FFEBEE' },
  };

  // *[2_관리자 모드] 2.12_시스템 관리 - 시스템 상태 업데이트*
  const updateSystemStatus = (
    component,
    status,
    message,
    priority = 'INFO'
  ) => {
    const config = statusConfig[status] || statusConfig['checking'];

    setSystemStatus((prev) => ({
      ...prev,
      [component]: {
        status,
        message,
        color: config.color,
        bgColor: config.bgColor,
        icon: config.icon,
        lastUpdated: new Date().toISOString(),
      },
    }));

    logSystemEvent(
      'SYSTEM_STATUS_CHANGE',
      `${component} 상태 변경: ${status}`,
      {
        component,
        status,
        message,
        previousStatus: systemStatus[component]?.status,
      },
      priority
    );
  };

  const [notifications, setNotifications] = useState([]);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionModalData, setPermissionModalData] = useState(null);

  // *[2_관리자 모드] 2.12_시스템 관리 - 권한 거부 모달 표시*
  const showPermissionDeniedModal = (action, reason) => {
    setPermissionModalData({ action, reason });
    setShowPermissionModal(true);
  };

  // *[2_관리자 모드] 2.12_시스템 관리 - 권한 검증 후 작업 실행*
  const executeWithPermissionCheck = async (
    action,
    callback,
    targetData = null
  ) => {
    const permissionCheck = checkUserPermission(action, targetData);

    if (!permissionCheck.allowed) {
      showPermissionDeniedModal(action, permissionCheck.reason);
      showUserNotification('error', '접근 거부', permissionCheck.reason);
      return false;
    }

    try {
      updateSystemStatus('processing', 'processing', `${action} 실행 중...`);
      const result = await callback();
      updateSystemStatus('processing', 'success', `${action} 완료`);
      showUserNotification(
        'success',
        '작업 완료',
        `${action}이(가) 성공적으로 완료되었습니다.`
      );
      return result;
    } catch (error) {
      updateSystemStatus(
        'processing',
        'error',
        `${action} 실패: ${error.message}`
      );
      showUserNotification(
        'error',
        '작업 실패',
        `${action} 중 오류가 발생했습니다: ${error.message}`
      );
      logSystemEvent(
        'EXECUTION_ERROR',
        `${action} 실행 실패`,
        { error: error.message },
        'HIGH'
      );
      return false;
    }
  };

  return {
    systemStatus,
    setSystemStatus,
    statusConfig,
    updateSystemStatus,
    notifications,
    setNotifications,
    showPermissionModal,
    setShowPermissionModal,
    permissionModalData,
    setPermissionModalData,
    showPermissionDeniedModal,
    executeWithPermissionCheck,
  };
};


// ============================================================
// [2_관리자 모드] 2.11~2.12_시스템 관리 - UTILS
// ============================================================

/**
 * 시스템 이벤트를 로깅하고 저장하는 함수
 * @param {string} type - 이벤트 타입 (DB_CONNECTION, API_ERROR, AUTH_FAILURE, NETWORK_ERROR, DATA_ACCESS, MODEL_CHANGE 등)
 * @param {string} message - 로그 메시지
 * @param {Object} details - 상세 정보 객체
 * @param {string} priority - 우선순위 (LOW, INFO, WARNING, HIGH, CRITICAL)
 * @param {Object} currentUser - 현재 사용자 객체
 * @param {Function} devLog - 개발 로그 함수
 * @param {Function} triggerAdminNotification - 관리자 알림 트리거 함수
 * @returns {Object} 생성된 로그 엔트리
 */
export const logSystemEvent = (
  type,
  message,
  details = {},
  priority = 'INFO',
  currentUser = null,
  devLog = console.log,
  triggerAdminNotification = null
) => {
  const timestamp = new Date().toISOString();
  const userId = currentUser?.id || 'anonymous';
  const userRole = currentUser?.role || 'guest';

  const logEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp,
    type, // 'DB_CONNECTION', 'API_ERROR', 'AUTH_FAILURE', 'NETWORK_ERROR', 'DATA_ACCESS', 'MODEL_CHANGE' 등
    message,
    details,
    userId,
    userInfo: currentUser?.name || '알 수 없음',
    userRole,
    sessionId: Date.now().toString(),
    priority, // 'LOW', 'INFO', 'WARNING', 'HIGH', 'CRITICAL'
    status: details.success ? 'SUCCESS' : 'FAILURE',
    ipAddress: '192.168.1.100', // 실제 환경에서는 클라이언트 IP 수집
    userAgent: navigator.userAgent.substring(0, 100),
  };

  const logColors = {
    LOW: 'color: #888;',
    INFO: 'color: #2196F3;',
    WARNING: 'color: #FF9800;',
    HIGH: 'color: #FF5722;',
    CRITICAL: 'color: #F44336; font-weight: bold;',
  };
  devLog(
    `%c[${priority}][${type}] ${timestamp}: ${message}`,
    logColors[priority] || '',
    details
  );

  try {
    // TODO: 시스템 로그를 MongoDB SystemLog 컬렉션에 저장
    // 백엔드 API: POST /api/system/logs
    // localStorage 사용 중단 - DB로 이동 필요
  } catch (logError) {
    devLog('로그 저장 실패:', logError);
  }

  if (priority === 'HIGH' || priority === 'CRITICAL') {
    if (triggerAdminNotification) {
      triggerAdminNotification(logEntry);
    }
  }

  return logEntry;
};

/**
 * 현재 활성화된 AI API Key를 반환하는 함수
 * @param {string} unifiedApiKey - 통합 API Key
 * @param {string} geminiApiKey - Gemini API Key
 * @param {string} chatgptApiKey - ChatGPT API Key
 * @param {string} claudeApiKey - Claude API Key
 * @returns {string} 활성화된 API Key
 */
export const getActiveAiKey = (
  unifiedApiKey,
  geminiApiKey,
  chatgptApiKey,
  claudeApiKey
) => {
  if (unifiedApiKey) {
    return unifiedApiKey;
  }

  return geminiApiKey || chatgptApiKey || claudeApiKey || '';
};

/**
 * 현재 활성화된 AI Provider를 반환하는 함수
 * @param {string} detectedProvider - 자동 감지된 Provider
 * @param {string} geminiApiKey - Gemini API Key
 * @param {string} chatgptApiKey - ChatGPT API Key
 * @param {string} claudeApiKey - Claude API Key
 * @param {string} selectedAiModel - 선택된 AI 모델
 * @returns {string} 활성화된 Provider 이름
 */
export const getActiveProvider = (
  detectedProvider,
  geminiApiKey,
  chatgptApiKey,
  claudeApiKey,
  selectedAiModel
) => {
  if (detectedProvider) {
    return detectedProvider;
  }

  const envProvider = process.env.REACT_APP_AI_PROVIDER;
  if (envProvider) return envProvider;

  if (geminiApiKey) return 'gemini';
  if (chatgptApiKey) return 'openai';
  if (claudeApiKey) return 'claude';

  return selectedAiModel || 'gemini';
};

// ============================================================
// [2_관리자 모드] 2.11~2.12_시스템 관리 - EXPORTS (update-only)
// ============================================================

/**
 * EXPORTS:
 *
 * [Constants]
 * - AI_MODEL_TYPES: AI 모델 타입 정의
 * - AI_MODELS_LIST: 지원되는 AI 모델 목록
 *
 * [Hooks]
 * - useModelSelection: AI 모델 선택 및 상태 관리 Hook
 * - useSystemManagement: 시스템 관리 및 AI 설정 Hook
 * - useSystemStatus: 시스템 상태 관리 Hook
 *
 * [Utils]
 * - logSystemEvent: 시스템 이벤트 로깅 함수
 * - getActiveAiKey: 활성 AI API 키 조회 함수
 * - getActiveProvider: 활성 AI 프로바이더 조회 함수
 */
