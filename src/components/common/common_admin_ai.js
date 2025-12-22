/**
 * [2_관리자 모드] 2.11_AI 챗봇 통합 모듈
 * - Hook → Service → Export
 * - AI 모델 관리, API 키 테스트, AI 응답 처리, 챗봇 권한 관리
 */

import { useState, useCallback, useEffect } from 'react';

const __DEV__ = process.env.NODE_ENV === 'development';
const devLog = (...args) => {
  if (__DEV__) console.log(...args);
};

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// ============================================================
// [2_관리자 모드] 2.11_AI 챗봇 - HOOKS
// ============================================================

/**
 * AI 추천사항 커스텀 훅
 * - AI 추천사항 자동 생성
 * - 추천사항 기록 관리
 * - 기록 다운로드
 */
export const useAIRecommendations = () => {
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [aiRecommendationHistory, setAiRecommendationHistory] = useState(() => {
    const saved = localStorage.getItem('aiRecommendationHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  /**
   * AI 추천사항 생성 함수
   */
  const generateAiRecommendations = useCallback(async () => {
    if (isAnalyzing) return;

    setIsAnalyzing(true);

    try {
      // 백엔드에서 MongoDB 데이터를 직접 조회하도록 변경
      // localStorage 사용 중단
      const response = await fetch(`${API_BASE_URL}/ai/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // 백엔드에서 DB를 직접 조회하도록 요청
          useDatabase: true,
        }),
      });

      if (!response.ok) {
        throw new Error('데이터 분석 불가');
      }

      const data = await response.json();

      if (data.status === 'success' && Array.isArray(data.recommendations)) {
        // 백엔드에서 받은 추천사항을 UI 형식으로 변환 (최대 4개)
        const formattedRecommendations = data.recommendations
          .slice(0, 4)
          .map((rec, index) => {
            const text = rec.trim();
            let content = text.replace(/^\d+\.\s*/, '');

            let category = '';
            let title = '';
            let description = '';

            const categoryMatch = content.match(/^\[([^\]]+)\]/);
            if (categoryMatch) {
              category = categoryMatch[1];
              content = content.replace(/^\[[^\]]+\]\s*/, '');
            }

            const lines = content
              .split('\n')
              .map((line) => line.trim())
              .filter((line) => line);
            if (lines.length > 0) {
              title = lines[0];
              description = lines.slice(1).join(' ').replace(/^-\s*/, '');
            }

            const categoryColors = {
              생산: 'blue',
              근태: 'green',
              안전: 'yellow',
              교육: 'blue',
              급여: 'green',
              품질: 'blue',
            };

            const color =
              categoryColors[category] ||
              ['blue', 'green', 'yellow'][index % 3];

            return {
              type: category || '추천',
              color: color,
              title: title || '데이터 분석 불가',
              description:
                description || '상세 분석 내용을 확인할 수 없습니다.',
            };
          });

        setAiRecommendations(formattedRecommendations);

        // 기록에 저장
        saveAiRecommendationToHistory(formattedRecommendations);
      } else {
        throw new Error('데이터 분석 불가');
      }
    } catch (error) {
      devLog('AI 추천사항 자동 생성 오류:', error);

      // 오류 시 기본 메시지 표시
      const errorRecommendations = [
        {
          type: '오류',
          color: 'red',
          title: '데이터 분석 불가',
          description: 'AI 서버 연결을 확인하세요.',
        },
        {
          type: '안내',
          color: 'yellow',
          title: '관리자 모드에서 AI 설정 확인',
          description: 'API Key가 올바르게 설정되어 있는지 확인하세요.',
        },
        {
          type: '정보',
          color: 'gray',
          title: '시스템 상태',
          description: 'HR 시스템은 정상 작동 중입니다.',
        },
      ];
      setAiRecommendations(errorRecommendations);
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing]);

  /**
   * AI 추천사항 기록 저장 함수
   */
  const saveAiRecommendationToHistory = useCallback((recommendations) => {
    const historyEntry = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      timestamp: new Date().toISOString(),
      title: `AI 추천사항 분석 (${recommendations.length}건)`,
      content: recommendations
        .map((rec) => `${rec.type}: ${rec.title} - ${rec.description}`)
        .join('\n'),
      recommendations: recommendations,
    };

    setAiRecommendationHistory((prev) => {
      const updatedHistory = [historyEntry, ...prev];
      localStorage.setItem(
        'aiRecommendationHistory',
        JSON.stringify(updatedHistory)
      );
      return updatedHistory;
    });
  }, []);

  /**
   * AI 추천사항 기록 다운로드 함수
   */
  const downloadAiHistory = useCallback(() => {
    if (aiRecommendationHistory.length === 0) {
      alert('다운로드할 기록이 없습니다.');
      return;
    }

    const csvContent = [
      ['날짜', '시간', '제목', '내용'].join(','),
      ...aiRecommendationHistory.map((entry) =>
        [
          entry.date,
          entry.time,
          `"${entry.title}"`,
          `"${entry.content.replace(/"/g, '""')}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `부성스틸(주)_AI_추천사항_기록_${
      new Date().toISOString().split('T')[0]
    }.csv`;
    link.click();
  }, [aiRecommendationHistory]);

  return {
    aiRecommendations,
    setAiRecommendations,
    aiRecommendationHistory,
    setAiRecommendationHistory,
    isAnalyzing,
    generateAiRecommendations,
    downloadAiHistory,
  };
};

/**
 * AI 설정(모델, 타입, 권한)을 관리하는 커스텀 훅
 * @param {Object} params - 파라미터 객체
 * @returns {Object} AI 설정 관리 함수들
 */
export const useAISettings = ({
  API_BASE_URL: API_BASE_URL_OVERRIDE,
  selectedAiModel,
  selectedModelType,
  setSelectedAiModel,
  setSelectedModelType,
  setModelUsageStatus,
  setAiConfig,
  setApiConnectionStatus,
  modelTypes,
  geminiApiKey,
  chatgptApiKey,
  claudeApiKey,
  chatbotPermissions,
  setChatbotPermissions,
  devLog: devLogOverride,
}) => {
  const baseUrl = API_BASE_URL_OVERRIDE || API_BASE_URL;
  const log = devLogOverride || devLog;

  // *[2_관리자 모드] 2.12_백엔드 AI 동기화*
  const syncAiConfigToBackend = async (provider, model, apiKey) => {
    try {
      const response = await fetch(`${baseUrl}/ai/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: provider || '',
          model: model || '',
          apiKey: apiKey || '',
        }),
      });

      if (response.ok) {
        const config = await response.json();
        setAiConfig(config);
        log('✅ AI 설정 백엔드 동기화 완료:', config);
        return true;
      } else {
        log('⚠️ AI 설정 백엔드 동기화 실패');
        return false;
      }
    } catch (error) {
      log('❌ AI 설정 백엔드 동기화 오류:', error);
      return false;
    }
  };

  // *[2_관리자 모드] 2.12_AI 모델 변경 처리*
  const handleModelChange = (model) => {
    setSelectedAiModel(model);
    localStorage.setItem('selectedAiModel', model);

    const newUsageStatus = {
      chatgpt: false,
      claude: false,
      gemini: false,
    };
    newUsageStatus[model] = true;
    setModelUsageStatus(newUsageStatus);

    localStorage.setItem('modelUsageStatus', JSON.stringify(newUsageStatus));
    localStorage.setItem('selectedAiModel', model);

    const defaultModelType = modelTypes[model]?.[0]?.id || '';
    setSelectedModelType(defaultModelType);
    localStorage.setItem('selectedModelType', defaultModelType);

    const apiKey =
      model === 'gemini'
        ? geminiApiKey
        : model === 'chatgpt'
        ? chatgptApiKey
        : claudeApiKey;
    syncAiConfigToBackend(
      model === 'chatgpt' ? 'openai' : model,
      defaultModelType,
      apiKey
    );
  };

  // *[2_관리자 모드] 2.12_AI 모델 타입 변경*
  const handleModelTypeChange = (modelType) => {
    setSelectedModelType(modelType);
    localStorage.setItem('selectedModelType', modelType);

    const provider = selectedAiModel === 'chatgpt' ? 'openai' : selectedAiModel;
    const apiKey =
      selectedAiModel === 'gemini'
        ? geminiApiKey
        : selectedAiModel === 'chatgpt'
        ? chatgptApiKey
        : claudeApiKey;
    syncAiConfigToBackend(provider, modelType, apiKey);
  };

  // *[2_관리자 모드] 2.11_챗봇 권한 변경*
  const handlePermissionChange = (permission, value) => {
    const newPermissions = { ...chatbotPermissions, [permission]: value };
    setChatbotPermissions(newPermissions);
    localStorage.setItem('chatbotPermissions', JSON.stringify(newPermissions));
  };

  // *[2_관리자 모드] 2.12_API 연결 테스트*
  const testApiConnection = async (model, apiKey) => {
    if (!apiKey) {
      setApiConnectionStatus((prev) => ({ ...prev, [model]: 'inactive' }));
      return;
    }

    setApiConnectionStatus((prev) => ({ ...prev, [model]: 'testing' }));

    try {
      let isValid = false;

      switch (model) {
        case 'chatgpt':
          const chatResponse = await fetch('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          isValid = chatResponse.ok;
          break;

        case 'claude':
          isValid = apiKey.startsWith('sk-ant-') && apiKey.length > 20;
          break;

        case 'gemini':
          const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
          );
          isValid = geminiResponse.ok;
          break;
      }

      setApiConnectionStatus((prev) => ({
        ...prev,
        [model]: isValid ? 'active' : 'inactive',
      }));

      if (isValid && model === selectedAiModel) {
        const provider = model === 'chatgpt' ? 'openai' : model;
        await syncAiConfigToBackend(provider, selectedModelType, apiKey);
      }
    } catch (error) {
      setApiConnectionStatus((prev) => ({ ...prev, [model]: 'inactive' }));
    }
  };

  return {
    syncAiConfigToBackend,
    handleModelChange,
    handleModelTypeChange,
    handlePermissionChange,
    testApiConnection,
  };
};

/**
 * 챗봇 권한을 관리하는 커스텀 훅
 * @returns {Object} 챗봇 권한 STATE 및 setter 함수
 */
export const useChatbotPermissions = () => {
  const [chatbotPermissions, setChatbotPermissions] = useState(() => {
    const saved = localStorage.getItem('chatbotPermissions');
    return saved
      ? JSON.parse(saved)
      : {
          read: true, // 읽기 권한 (관리자 전용 시스템)
          modify: true, // 수정 권한 (관리자 전용 시스템)
          download: true, // 다운로드 권한 (관리자 전용 시스템)
        };
  });

  // localStorage에 권한 변경사항 저장
  useEffect(() => {
    localStorage.setItem(
      'chatbotPermissions',
      JSON.stringify(chatbotPermissions)
    );
  }, [chatbotPermissions]);

  return {
    chatbotPermissions,
    setChatbotPermissions,
  };
};

// ============================================================
// [2_관리자 모드] 2.11_AI 챗봇 - SERVICES
// ============================================================

export const FAIL_MSG = '데이터 분석 불가';

/**
 * 전체 AI 모델 목록
 */
export const ALL_MODELS = [
  // OpenAI
  'gpt-5',
  'gpt-5-mini',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-4-turbo-preview',
  'gpt-4',
  'gpt-4-32k',
  'gpt-3.5-turbo',
  'gpt-3.5-turbo-16k',
  'gpt-3.5-turbo-instruct',
  // Google Gemini
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  // Anthropic Claude
  'claude-3-5-sonnet',
  'claude-3-5-opus',
  'claude-3-opus',
];

/**
 * 내부+외부 동시 접근 허용 모델
 */
export const ALLOW_MODEL_LIST = [
  'gpt-5',
  'gpt-4o',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'claude-3-5-sonnet',
  'claude-3-5-opus',
];

/**
 * 모델 표시명 매핑
 */
export const MODEL_DISPLAY_NAMES = {
  'gpt-5': 'GPT-5',
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o Mini',
  'gpt-4-turbo': 'GPT-4 Turbo',
  'gpt-4-turbo-preview': 'GPT-4 Turbo Preview',
  'gpt-4': 'GPT-4',
  'gpt-4-32k': 'GPT-4 32K',
  'gpt-3.5-turbo': 'GPT-3.5 Turbo',
  'gpt-3.5-turbo-16k': 'GPT-3.5 Turbo 16K',
  'gpt-3.5-turbo-instruct': 'GPT-3.5 Turbo Instruct',
  'gemini-1.5-pro': 'Gemini 1.5 Pro',
  'gemini-1.5-flash': 'Gemini 1.5 Flash',
  'gemini-1.5-flash-8b': 'Gemini 1.5 Flash-8B',
  'claude-3-5-sonnet': 'Claude 3.5 Sonnet',
  'claude-3-5-opus': 'Claude 3.5 Opus',
  'claude-3-opus': 'Claude 3 Opus',
};

/**
 * AI 모델 타입 정의
 */
export const MODEL_TYPES = {
  chatgpt: [
    { id: 'gpt-5', name: 'GPT-5' },
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo Preview' },
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-4-32k', name: 'GPT-4 32K' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    { id: 'gpt-3.5-turbo-16k', name: 'GPT-3.5 Turbo 16K' },
    { id: 'gpt-3.5-turbo-instruct', name: 'GPT-3.5 Turbo Instruct' },
  ],
  claude: [
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Latest)' },
    { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet (June)' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
    { id: 'claude-2.1', name: 'Claude 2.1' },
    { id: 'claude-2.0', name: 'Claude 2.0' },
    { id: 'claude-instant-1.2', name: 'Claude Instant 1.2' },
    { id: 'claude-instant-1.1', name: 'Claude Instant 1.1' },
  ],
  gemini: [
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)' },
    { id: 'gemini-1.5-pro-002', name: 'Gemini 1.5 Pro 002' },
    { id: 'gemini-1.5-pro-001', name: 'Gemini 1.5 Pro 001' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-pro-exp-0827', name: 'Gemini 1.5 Pro Experimental' },
    { id: 'gemini-1.5-flash-002', name: 'Gemini 1.5 Flash 002' },
    { id: 'gemini-1.5-flash-001', name: 'Gemini 1.5 Flash 001' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B' },
    { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro' },
    { id: 'gemini-1.0-pro-001', name: 'Gemini 1.0 Pro 001' },
    { id: 'gemini-1.0-pro-vision', name: 'Gemini 1.0 Pro Vision' },
    { id: 'gemini-pro', name: 'Gemini Pro (Legacy)' },
    { id: 'gemini-pro-vision', name: 'Gemini Pro Vision (Legacy)' },
  ],
};

/**
 * API 키 타입 감지
 */
export const detectApiKeyType = (apiKey) => {
  const trimmedKey = apiKey.trim();
  if (trimmedKey.startsWith('AIza')) return 'gemini';
  if (trimmedKey.startsWith('sk-') && !trimmedKey.startsWith('sk-ant'))
    return 'openai';
  if (trimmedKey.startsWith('sk-ant') || trimmedKey.startsWith('claude'))
    return 'claude';
  return null;
};

/**
 * Gemini API 키 테스트
 */
export const testGeminiApiKey = async (apiKey) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `Gemini API 키가 유효하지 않습니다. (HTTP ${response.status})`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      modelsCount: data.models?.length || 0,
    };
  } catch (error) {
    return {
      success: false,
      error: `Gemini API 연결 실패: ${error.message}`,
    };
  }
};

/**
 * ChatGPT API 키 테스트
 */
export const testChatGptApiKey = async (apiKey) => {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `ChatGPT API 키가 유효하지 않습니다. (HTTP ${response.status})`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      modelsCount: data.data?.length || 0,
    };
  } catch (error) {
    return {
      success: false,
      error: `ChatGPT API 연결 실패: ${error.message}`,
    };
  }
};

/**
 * Claude API 키 테스트
 */
export const testClaudeApiKey = async (apiKey) => {
  try {
    // Claude API는 직접 테스트가 제한적이므로 기본적인 형식 검증
    if (!apiKey.startsWith('sk-ant-') && !apiKey.startsWith('claude-api-')) {
      return {
        success: false,
        error:
          'Claude API 키 형식이 올바르지 않습니다. (sk-ant-로 시작해야 함)',
      };
    }

    // 실제 환경에서는 Claude API 엔드포인트로 테스트 요청
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Claude API 연결 실패: ${error.message}`,
    };
  }
};

/**
 * Gemini 모델 목록 가져오기
 */
export const fetchGeminiModels = async (apiKey) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      devLog(
        '⚠️ Gemini 모델 목록 동적 로드 실패, 하드코딩된 목록 사용',
        response.status
      );
      return MODEL_TYPES.gemini;
    }

    const data = await response.json();
    const models = (data.models || [])
      .filter((m) => m.name && m.name.includes('gemini'))
      .map((m) => ({
        id: m.name.replace('models/', ''),
        name: m.displayName || m.name.replace('models/', ''),
      }))
      .filter((m) => !m.id.includes('embedding'));

    devLog('✅ Gemini 모델 목록 동적 로드 성공:', models.length, '개');
    return models.length > 0 ? models : MODEL_TYPES.gemini;
  } catch (error) {
    devLog('⚠️ Gemini 모델 목록 동적 로드 실패, 하드코딩된 목록 사용:', error);
    return MODEL_TYPES.gemini;
  }
};

/**
 * ChatGPT 모델 목록 가져오기
 */
export const fetchChatGptModels = async (apiKey) => {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      devLog(
        '⚠️ ChatGPT 모델 목록 동적 로드 실패, 하드코딩된 목록 사용',
        response.status
      );
      return MODEL_TYPES.chatgpt;
    }

    const data = await response.json();
    const models = (data.data || [])
      .filter((m) => m.id && m.id.startsWith('gpt'))
      .map((m) => ({
        id: m.id,
        name: MODEL_DISPLAY_NAMES[m.id] || m.id,
      }))
      .sort((a, b) => {
        const order = ['gpt-5', 'gpt-4', 'gpt-3'];
        const getOrder = (id) =>
          order.findIndex((prefix) => id.startsWith(prefix));
        return getOrder(a.id) - getOrder(b.id);
      });

    devLog('✅ ChatGPT 모델 목록 동적 로드 성공:', models.length, '개');
    return models.length > 0 ? models : MODEL_TYPES.chatgpt;
  } catch (error) {
    devLog('⚠️ ChatGPT 모델 목록 동적 로드 실패, 하드코딩된 목록 사용:', error);
    return MODEL_TYPES.chatgpt;
  }
};

/**
 * 사용 가능한 모델 목록 가져오기
 */
export const fetchAvailableModels = async (provider, apiKey) => {
  try {
    switch (provider) {
      case 'gemini':
        return await fetchGeminiModels(apiKey);
      case 'chatgpt':
        return await fetchChatGptModels(apiKey);
      case 'claude':
        return MODEL_TYPES.claude;
      default:
        devLog('⚠️ 알 수 없는 AI Provider:', provider);
        return [];
    }
  } catch (error) {
    devLog('❌ 모델 목록 로드 오류:', error);
    return [];
  }
};

/**
 * API 키 테스트 통합 함수
 */
export const testApiKey = async (provider, apiKey, logSystemEvent) => {
  if (!apiKey || apiKey.trim().length === 0) {
    return { success: false, error: 'API 키가 입력되지 않았습니다.' };
  }

  const testStart = Date.now();

  try {
    let testResult = { success: false, error: null };

    switch (provider) {
      case 'gemini':
        testResult = await testGeminiApiKey(apiKey);
        break;
      case 'chatgpt':
        testResult = await testChatGptApiKey(apiKey);
        break;
      case 'claude':
        testResult = await testClaudeApiKey(apiKey);
        break;
      default:
        throw new Error('지원하지 않는 API 제공자입니다.');
    }

    // API 키 테스트 성공 시 사용 가능한 모델 목록 로드
    if (testResult.success) {
      try {
        devLog(`🔄 ${provider} 모델 목록 로드 시작...`);
        const availableModels = await fetchAvailableModels(provider, apiKey);
        devLog(
          `✅ ${provider} 모델 목록 로드 완료:`,
          availableModels.length,
          '개'
        );
        testResult.modelsLoaded = availableModels.length;
        testResult.models = availableModels;
      } catch (modelError) {
        devLog(
          `⚠️ ${provider} 모델 목록 로드 실패, 하드코딩된 목록 사용:`,
          modelError.message
        );
      }
    }

    // 테스트 결과 로깅
    if (logSystemEvent) {
      logSystemEvent(
        'API_KEY_TEST',
        `${provider} API 키 테스트 ${testResult.success ? '성공' : '실패'}`,
        {
          provider,
          success: testResult.success,
          responseTime: Date.now() - testStart,
          modelsLoaded: testResult.modelsLoaded || 0,
          error: testResult.error,
        }
      );
    }

    return testResult;
  } catch (error) {
    if (logSystemEvent) {
      logSystemEvent(
        'API_KEY_TEST_ERROR',
        `${provider} API 키 테스트 중 시스템 오류`,
        {
          provider,
          error: error.message,
          responseTime: Date.now() - testStart,
        }
      );
    }

    return { success: false, error: `테스트 중 오류 발생: ${error.message}` };
  }
};

/**
 * 통합 AI 질의 함수
 */
export const fetchAIResponse = async (
  userQuery,
  companyData,
  aiConfig,
  API_BASE_URL_OVERRIDE
) => {
  const baseUrl = API_BASE_URL_OVERRIDE || API_BASE_URL;

  try {
    // AI Config 유효성 검증
    if (!aiConfig.apiKey || !aiConfig.provider) {
      devLog('⚠️ AI 설정이 완료되지 않았습니다.');
      return FAIL_MSG;
    }

    const response = await fetch(`${baseUrl}/ai/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiConfig.apiKey}`,
        'X-Provider': aiConfig.provider,
        'X-Model': aiConfig.model || '',
      },
      body: JSON.stringify({ query: userQuery, companyData }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      devLog('❌ AI 질의 실패:', errorData);
      return FAIL_MSG;
    }

    const data = await response.json();
    return data.response || FAIL_MSG;
  } catch (error) {
    devLog('❌ AI 질의 오류:', error);
    return FAIL_MSG;
  }
};

/**
 * AI 분석 API 호출 함수
 */
export const analyzeDataWithAI = async (
  summary,
  selectedModel,
  employees,
  getSafeModelOrBlock,
  API_BASE_URL_OVERRIDE
) => {
  const baseUrl = API_BASE_URL_OVERRIDE || API_BASE_URL;

  // 모델 검증 (허용 목록 확인)
  const safeModel = getSafeModelOrBlock(selectedModel);

  try {
    const response = await fetch(`${baseUrl}/ai/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: safeModel,
        prompt: summary,
        context: {
          회사명: '부성스틸',
          산업: '철강 제조',
          직원수: employees.length,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('데이터 분석 불가');
    }

    const result = await response.json();
    return result.analysis || '데이터 분석 불가';
  } catch (error) {
    devLog('AI 분석 에러:', error);
    throw error;
  }
};

/**
 * 모델 선택 검증 함수 (허용 목록 확인)
 */
export const getSafeModelOrBlock = (model) => {
  if (!ALLOW_MODEL_LIST.includes(model)) {
    throw new Error(FAIL_MSG);
  }
  return model;
};

/**
 * Provider 기반 통합 채팅 함수
 */
export const sendChat = async (
  { provider, selectedModel, payload },
  getSafeModelOrBlock,
  API_BASE_URL_OVERRIDE
) => {
  const baseUrl = API_BASE_URL_OVERRIDE || API_BASE_URL;
  const model = getSafeModelOrBlock(selectedModel);

  try {
    const res = await fetch(`${baseUrl}/${provider}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, ...payload }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: FAIL_MSG }));
      throw new Error(errorData?.message || FAIL_MSG);
    }

    return await res.json();
  } catch (error) {
    devLog('❌ 채팅 API 오류:', error);
    throw new Error(FAIL_MSG);
  }
};

// ============================================================
// [2_관리자 모드] 2.11_AI 챗봇 - UTILS
// ============================================================

/**
 * 활성화된 AI 모델 찾기
 * @param {Object} modelUsageStatus - 모델 사용 상태 객체
 * @returns {string|undefined} 활성화된 모델명
 */
export const getActiveModel = (modelUsageStatus) => {
  return Object.keys(modelUsageStatus).find((key) => modelUsageStatus[key]);
};

/**
 * 모델별 API 키 존재 여부 확인
 * @param {string} activeModel - 활성화된 모델명
 * @param {Object} apiKeys - API 키 객체
 * @returns {boolean} API 키 존재 여부
 */
export const checkApiKeyByModel = (activeModel, apiKeys) => {
  const { chatgptApiKey, claudeApiKey, geminiApiKey } = apiKeys;

  if (!activeModel) return false;

  switch (activeModel) {
    case 'chatgpt':
      return !!chatgptApiKey;
    case 'claude':
      return !!claudeApiKey;
    case 'gemini':
      return !!geminiApiKey;
    default:
      return false;
  }
};

// ============================================================
// [2_관리자 모드] 2.11_AI 챗봇 - EXPORTS (update-only)
// ============================================================

// Hook exports
// - useAIRecommendations
// - useAISettings
// - useChatbotPermissions

// Util exports
// - getActiveModel
// - checkApiKeyByModel

// Service exports
// - FAIL_MSG
// - ALL_MODELS
// - ALLOW_MODEL_LIST
// - MODEL_DISPLAY_NAMES
// - MODEL_TYPES
// - detectApiKeyType
// - testGeminiApiKey
// - testChatGptApiKey
// - testClaudeApiKey
// - fetchGeminiModels
// - fetchChatGptModels
// - fetchAvailableModels
// - testApiKey
// - fetchAIResponse
// - analyzeDataWithAI
// - getSafeModelOrBlock
// - sendChat

export default {
  FAIL_MSG,
  ALL_MODELS,
  ALLOW_MODEL_LIST,
  MODEL_DISPLAY_NAMES,
  MODEL_TYPES,
  detectApiKeyType,
  testGeminiApiKey,
  testChatGptApiKey,
  testClaudeApiKey,
  fetchGeminiModels,
  fetchChatGptModels,
  fetchAvailableModels,
  testApiKey,
  fetchAIResponse,
  analyzeDataWithAI,
  getSafeModelOrBlock,
  sendChat,
};
