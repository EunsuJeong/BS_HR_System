import React, { useState, useRef } from 'react';
import {
  MessageSquare,
  AlertCircle,
  Settings,
  Download,
  Send,
  History,
} from 'lucide-react';
import { getActiveModel, checkApiKeyByModel } from '../common/common_admin_ai';

const AdminAIChatbot = ({
  modelUsageStatus,
  chatgptApiKey,
  claudeApiKey,
  geminiApiKey,
  chatbotPermissions,
  chatMessages,
  chatContainerRef,
  setActiveTab,
  handleSendMessage,
  generateDownloadFile,
}) => {
  // 채팅 입력 - 비제어 입력으로 메시지 목록 리렌더 완전 제거
  const chatInputRef = useRef(null);
  const getChatInput = () => chatInputRef.current?.value || '';

  const activeModel = getActiveModel(modelUsageStatus);
  const hasActiveModel = !!activeModel;
  const hasApiKey = checkApiKeyByModel(activeModel, {
    chatgptApiKey,
    claudeApiKey,
    geminiApiKey,
  });

  // 기록 모달 상태
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // 기록 조회 함수
  const handleShowHistory = async () => {
    setShowHistoryModal(true);
    setIsLoadingHistory(true);
    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiBaseUrl}/ai/logs?limit=100`);
      if (response.ok) {
        const logs = await response.json();
        setChatHistory(logs);
      } else {
        console.error('기록 조회 실패');
        setChatHistory([]);
      }
    } catch (error) {
      console.error('기록 조회 오류:', error);
      setChatHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6">
        {/* 헤더 및 상태 표시 */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">AI 챗봇</h2>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">활성 모델:</span>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    hasActiveModel
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {hasActiveModel ? activeModel.toUpperCase() : '없음'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">권한:</span>
                <div className="flex gap-1">
                  <span
                    className={`px-1 py-0.5 text-xs rounded ${
                      chatbotPermissions?.read
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    R
                  </span>
                  <span
                    className={`px-1 py-0.5 text-xs rounded ${
                      chatbotPermissions?.modify
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    M
                  </span>
                  <span
                    className={`px-1 py-0.5 text-xs rounded ${
                      chatbotPermissions?.download
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    D
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleShowHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 hover:bg-green-200 rounded-lg text-sm text-green-700"
            >
              <History className="w-4 h-4" />
              <span>기록</span>
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
            >
              <Settings className="w-4 h-4" />
              <span>설정</span>
            </button>
          </div>
        </div>

        {!hasActiveModel ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="mb-4">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                AI 모델이 선택되지 않았습니다
              </h3>
              <p className="text-gray-500 mb-6">
                시스템 관리에서 AI 모델을 선택하고 API 키를 설정해주세요.
              </p>
              <button
                onClick={() => setActiveTab('system')}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                시스템 관리로 이동
              </button>
            </div>
          </div>
        ) : !hasApiKey ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="mb-4">
                <AlertCircle className="w-16 h-16 text-orange-300 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                {activeModel.toUpperCase()} API 키가 필요합니다
              </h3>
              <p className="text-gray-500 mb-6">
                AI 챗봇을 사용하려면 {activeModel.toUpperCase()} API 키를
                설정해주세요.
              </p>
              <button
                onClick={() => setActiveTab('system')}
                className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                API 키 설정하기
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* 채팅 메시지 영역 */}
            <div
              ref={chatContainerRef}
              className="overflow-y-auto border border-gray-200 rounded-lg p-3 md:p-4 mb-3 bg-gray-50 space-y-4 max-h-[60vh] scroll-smooth"
            >
              {!chatMessages || chatMessages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">
                    AI 비서와 대화하세요
                  </h3>
                  <p className="text-gray-500 mb-4 text-sm">
                    회사 업무와 관련된 모든 질문을 자유롭게 물어보세요.
                  </p>
                  <div className="max-w-lg mx-auto">
                    <div className="bg-white rounded-lg p-3 border text-left">
                      <h4 className="font-medium text-gray-800 mb-2 text-sm">
                        예시 질문:
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                        <div>
                          <p className="font-medium text-blue-700 mb-1">
                            📊 회사 데이터:
                          </p>
                          <p>• "오늘 출근한 직원 수는?"</p>
                          <p>• "이달 연차 현황을 엑셀로 다운로드해줘"</p>
                          <p>• "부서별 성과 분석해줘"</p>
                        </div>
                        <div>
                          <p className="font-medium text-green-700 mb-1">
                            🌐 외부 정보:
                          </p>
                          <p>• "최신 노동법 변경사항 알려줘"</p>
                          <p>• "HR 트렌드 분석해줘"</p>
                          <p>• "급여 계산 공식 설명해줘"</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                (chatMessages || []).map((message, index) => (
                  <div
                    key={message.id || `msg-${index}`}
                    className={`flex ${
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-3xl px-3 py-2 md:px-4 md:py-3 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-blue-500 text-white'
                          : message.type === 'error'
                          ? 'bg-red-50 border border-red-200 text-red-800'
                          : message.type === 'system'
                          ? 'bg-green-50 border border-green-200 text-green-800'
                          : 'bg-white border border-gray-200 text-gray-800'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap">
                        {message.message || message.content}
                      </div>

                      {/* 다운로드 버튼 */}
                      {message.downloadData &&
                        message.downloadFilename &&
                        chatbotPermissions?.download && (
                          <div className="mt-3 space-y-2">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() =>
                                  generateDownloadFile(
                                    message.downloadData,
                                    message.downloadFilename,
                                    'excel'
                                  )
                                }
                                className="px-3 py-2 bg-green-500 text-white text-xs rounded hover:bg-green-600 flex items-center gap-2"
                              >
                                <Download className="w-3 h-3" />
                                Excel 다운로드
                              </button>
                              <button
                                onClick={() =>
                                  generateDownloadFile(
                                    message.downloadData,
                                    message.downloadFilename,
                                    'csv'
                                  )
                                }
                                className="px-3 py-2 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 flex items-center gap-2"
                              >
                                <Download className="w-3 h-3" />
                                CSV 다운로드
                              </button>
                            </div>
                            <div className="text-xs text-gray-500">
                              📊 총 {message.downloadData.length}건의 데이터
                            </div>
                          </div>
                        )}

                      <div className="text-xs opacity-70 mt-2">
                        {message.timestamp ?
                          (message.timestamp instanceof Date ?
                            message.timestamp.toLocaleTimeString() :
                            new Date(message.timestamp).toLocaleTimeString()) :
                          new Date().toLocaleTimeString()
                        }
                        {message.model && ` • ${message.model}`}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {false && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 px-4 py-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0.1s' }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0.2s' }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">
                        {activeModel.toUpperCase()}가 응답 중...
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 입력 영역 */}
            <div className="border-t pt-3">
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <span className="text-xs text-gray-600">권한:</span>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    chatbotPermissions?.read
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {chatbotPermissions?.read ? '읽기 가능' : '읽기 차단'}
                </span>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    chatbotPermissions?.modify
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {chatbotPermissions?.modify ? '수정 가능' : '수정 차단'}
                </span>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    chatbotPermissions?.download
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {chatbotPermissions?.download ? '다운로드 가능' : '다운로드 차단'}
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  ref={chatInputRef}
                  type="text"
                  defaultValue=""
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const val = getChatInput();
                      if (val.trim()) {
                        handleSendMessage(val);
                        if (chatInputRef.current) chatInputRef.current.value = '';
                      }
                    }
                  }}
                  placeholder="AI 비서에게 질문하세요..."
                  className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <button
                  onClick={() => {
                    const val = getChatInput();
                    if (val.trim()) {
                      handleSendMessage(val);
                      if (chatInputRef.current) chatInputRef.current.value = '';
                    }
                  }}
                  className="px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1.5 text-sm"
                >
                  {false ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>처리중</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>전송</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 기록 모달 */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-green-600" />
                <h2 className="text-base font-semibold text-gray-800">
                  AI 챗봇 대화 기록
                </h2>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="p-4 overflow-y-auto flex-1">
              {isLoadingHistory ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  <p className="mt-4 text-gray-600">기록을 불러오는 중...</p>
                </div>
              ) : chatHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">저장된 대화 기록이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {chatHistory.map((log, index) => (
                    <div
                      key={log._id || index}
                      className={`p-3 rounded-lg border ${
                        log.success
                          ? 'bg-white border-gray-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              log.success
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {log.success ? '✓ 성공' : '✗ 실패'}
                          </span>
                          {log.provider && (
                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                              {log.provider.toUpperCase()}
                            </span>
                          )}
                          {log.model && (
                            <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                              {log.model}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(log.createdAt).toLocaleString('ko-KR')}
                        </span>
                      </div>

                      {/* 질문 */}
                      {log.prompt && (
                        <div className="mb-2">
                          <div className="text-xs text-gray-600 font-medium mb-1">
                            질문:
                          </div>
                          <div className="bg-gray-50 p-2 rounded text-sm">
                            {log.prompt}
                          </div>
                        </div>
                      )}

                      {/* 답변 */}
                      {log.response && (
                        <div>
                          <div className="text-xs text-gray-600 font-medium mb-1">
                            답변:
                          </div>
                          <div className="bg-blue-50 p-2 rounded text-sm whitespace-pre-wrap">
                            {log.response.substring(0, 500)}
                            {log.response.length > 500 && '...'}
                          </div>
                        </div>
                      )}

                      {/* 오류 메시지 */}
                      {log.errorMessage && (
                        <div className="mt-2">
                          <div className="text-xs text-red-600 font-medium mb-1">
                            오류:
                          </div>
                          <div className="bg-red-50 p-2 rounded text-sm text-red-700">
                            {log.errorMessage}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 flex-shrink-0">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(AdminAIChatbot);
