import React from 'react';
import { Settings, Eye, EyeOff } from 'lucide-react';
import Select from 'react-select';
// import CommonAIService from '../common/CommonAIService'; // 병합됨: common_admin_ai
import CommonAIService from '../common/common_admin_ai';
import { AI_MODEL_TYPES, AI_MODELS_LIST } from '../common/common_admin_system';

const AdminSystemManagement = ({
  unifiedApiKey,
  setUnifiedApiKey,
  showUnifiedApiKey,
  setShowUnifiedApiKey,
  detectedProvider,
  availableModels,
  selectedUnifiedModel,
  setSelectedUnifiedModel,
  unifiedSaveMessage,
  chatbotPermissions,
  changePasswordForm,
  setChangePasswordForm,
  changePasswordError,
  changePasswordSuccess,
  showCurrentPassword,
  setShowCurrentPassword,
  showNewPassword,
  setShowNewPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  handleUnifiedAiSave,
  handlePermissionChange,
  handleChangePassword,
}) => {
  return (
    <div className="space-y-6">
      {/* 🆕 통합 AI 설정 (권장) */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-6 max-w-4xl mx-auto shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-500 text-white rounded-full p-2">
            <Settings className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-semibold text-gray-800">
            통합 AI 설정 (권장)
          </h3>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          API Key를 입력하면 자동으로 Provider를 감지하고 사용 가능한 모델
          목록을 표시합니다. 저장하면 AI 챗봇, AI 추천사항, 예측 기능 등 시스템
          전체에 즉시 반영됩니다.
        </p>

        <div className="space-y-4">
          {/* API Key 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔑 API Key 입력
            </label>
            <div className="relative">
              <input
                type={showUnifiedApiKey ? 'text' : 'password'}
                value={unifiedApiKey}
                onChange={(e) => setUnifiedApiKey(e.target.value)}
                placeholder="API Key를 입력하세요 (예: AIza..., sk-..., sk-ant-...)"
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button
                type="button"
                onClick={() => setShowUnifiedApiKey(!showUnifiedApiKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                {showUnifiedApiKey ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              💡 Tip: Gemini(AIza...), ChatGPT(sk-...), Claude(sk-ant-...) 중
              하나를 입력하세요
            </p>
          </div>

          {/* Provider 자동 표시 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🏢 Provider (자동 감지)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={
                  detectedProvider === 'gemini'
                    ? 'Google Gemini'
                    : detectedProvider === 'openai'
                    ? 'OpenAI ChatGPT'
                    : detectedProvider === 'claude'
                    ? 'Anthropic Claude'
                    : detectedProvider === 'unknown'
                    ? '⚠️ 인식 불가 (유효한 API Key를 입력하세요)'
                    : '대기 중...'
                }
                readOnly
                className={`flex-1 px-4 py-3 border rounded-lg text-sm font-medium ${
                  detectedProvider === 'gemini'
                    ? 'bg-blue-50 border-blue-300 text-blue-800'
                    : detectedProvider === 'openai'
                    ? 'bg-green-50 border-green-300 text-green-800'
                    : detectedProvider === 'claude'
                    ? 'bg-purple-50 border-purple-300 text-purple-800'
                    : detectedProvider === 'unknown'
                    ? 'bg-red-50 border-red-300 text-red-600'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              />
              {detectedProvider &&
                detectedProvider !== '' &&
                detectedProvider !== 'unknown' && (
                  <span className="text-green-500 text-2xl">✅</span>
                )}
            </div>
          </div>

          {/* 모델 선택 드롭다운 (react-select) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🎯 AI 모델 선택
            </label>
            <Select
              value={
                selectedUnifiedModel
                  ? {
                      value: selectedUnifiedModel,
                      label: selectedUnifiedModel,
                      isDisabled: false
                    }
                  : null
              }
              onChange={(option) => setSelectedUnifiedModel(option?.value || '')}
              options={availableModels.map((item) => {
                const modelName = typeof item === 'string' ? item : item.model;
                const isAvailable = typeof item === 'string' ? true : item.available;
                return {
                  value: modelName,
                  label: isAvailable ? modelName : `${modelName} (사용 불가)`,
                  isDisabled: !isAvailable,
                  available: isAvailable
                };
              })}
              placeholder={
                availableModels.length === 0
                  ? '먼저 유효한 API Key를 입력하세요'
                  : '🔍 모델 이름으로 검색... (예: claude, gpt-4, gemini)'
              }
              isSearchable={true}
              isClearable={true}
              isDisabled={availableModels.length === 0}
              isOptionDisabled={(option) => option.isDisabled}
              styles={{
                control: (base, state) => ({
                  ...base,
                  borderColor: state.isFocused ? '#3B82F6' : '#D1D5DB',
                  borderRadius: '0.5rem',
                  padding: '0.5rem',
                  boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.5)' : 'none',
                  '&:hover': {
                    borderColor: '#3B82F6',
                  },
                }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isDisabled
                    ? '#F9FAFB'
                    : state.isSelected
                    ? '#3B82F6'
                    : state.isFocused
                    ? '#DBEAFE'
                    : 'white',
                  color: state.isDisabled
                    ? '#9CA3AF'
                    : state.isSelected
                    ? 'white'
                    : '#1F2937',
                  cursor: state.isDisabled ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontStyle: state.isDisabled ? 'italic' : 'normal',
                }),
                placeholder: (base) => ({
                  ...base,
                  color: '#9CA3AF',
                  fontSize: '0.875rem',
                }),
                singleValue: (base) => ({
                  ...base,
                  color: '#1F2937',
                  fontSize: '0.875rem',
                }),
              }}
              noOptionsMessage={() => '검색 결과가 없습니다'}
            />
            {availableModels.length > 0 && (() => {
              const availableCount = availableModels.filter(item =>
                typeof item === 'string' ? true : item.available
              ).length;
              const unavailableCount = availableModels.length - availableCount;
              return (
                <p className="text-xs text-gray-500 mt-1">
                  ✅ 총 {availableModels.length}개 모델
                  {availableCount > 0 && ` (사용 가능: ${availableCount}개`}
                  {unavailableCount > 0 && `, 사용 불가: ${unavailableCount}개`}
                  {availableCount > 0 && ')'}
                </p>
              );
            })()}
          </div>

          {/* 저장 버튼 */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleUnifiedAiSave}
              disabled={
                !unifiedApiKey ||
                !detectedProvider ||
                !selectedUnifiedModel ||
                detectedProvider === 'unknown'
              }
              className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <span>💾</span>
              <span>저장 및 시스템 전체 반영</span>
            </button>
          </div>

          {/* 저장 메시지 */}
          {unifiedSaveMessage && (
            <div
              className={`p-4 rounded-lg text-sm font-medium ${
                unifiedSaveMessage.startsWith('✅')
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : unifiedSaveMessage.startsWith('⚠️')
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}
            >
              {unifiedSaveMessage}
            </div>
          )}
        </div>
      </div>

      {/* AI 챗봇 권한 관리 섹션 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-4xl mx-auto">
        <h3 className="text-2xl font-semibold text-gray-800 mb-6">
          AI 챗봇 권한 관리
        </h3>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 읽기 권한 */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-800">읽기 권한</h4>
                  <p className="text-sm text-gray-600">회사 정보 조회</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={chatbotPermissions?.read}
                    onChange={(e) =>
                      handlePermissionChange('read', e.target.checked)
                    }
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>• 직원 정보 조회</p>
                <p>• 근태 데이터 확인</p>
                <p>• 공지사항 조회</p>
                <p>• 통계 데이터 접근</p>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    chatbotPermissions?.read
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {chatbotPermissions?.read ? '허용' : '차단'}
                </span>
                <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                  실제 작동 중
                </span>
              </div>
            </div>

            {/* 수정 권한 */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-800">수정 권한</h4>
                  <p className="text-sm text-gray-600">데이터 변경</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={chatbotPermissions?.modify}
                    onChange={(e) =>
                      handlePermissionChange('modify', e.target.checked)
                    }
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                </label>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>• 직원 정보 자동 수정</p>
                <p>• 근태 데이터 자동 변경</p>
                <p>• 공지사항 자동 작성</p>
                <p>• 설정 값 자동 변경</p>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    chatbotPermissions?.modify
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {chatbotPermissions?.modify ? '허용' : '차단'}
                </span>
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                  현재 미사용
                </span>
              </div>
            </div>

            {/* 다운로드 권한 */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-800">다운로드 권한</h4>
                  <p className="text-sm text-gray-600">파일 생성/다운로드</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={chatbotPermissions?.download}
                    onChange={(e) =>
                      handlePermissionChange('download', e.target.checked)
                    }
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>• 엑셀 파일 생성</p>
                <p>• 이미지 생성</p>
                <p>• 표/차트 다운로드</p>
                <p>• PDF 보고서 생성</p>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    chatbotPermissions?.download
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {chatbotPermissions?.download ? '허용' : '차단'}
                </span>
                <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                  실제 작동 중
                </span>
              </div>
            </div>
          </div>

          {/* 권한 요약 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="font-semibold text-gray-800 mb-3">
              현재 권한 설정 요약
            </h5>
            <div className="flex flex-wrap gap-2 mb-3">
              <span
                className={`px-3 py-1 rounded-full text-sm ${
                  chatbotPermissions?.read
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                읽기 : {chatbotPermissions?.read ? '허용 ✓' : '차단 ✗'}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm ${
                  chatbotPermissions?.modify
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                수정 : {chatbotPermissions?.modify ? '허용 ✓' : '차단 ✗'}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm ${
                  chatbotPermissions?.download
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                다운로드 : {chatbotPermissions?.download ? '허용 ✓' : '차단 ✗'}
              </span>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <p>✅ <strong>읽기/수정/다운로드 권한:</strong> 실제 작동 중 (권한 꺼짐 시 차단됨)</p>
              <p>⚠️ 권한 변경 시 AI 챗봇의 응답과 기능이 즉시 반영됩니다.</p>
            </div>
          </div>

        </div>
      </div>


      {/* 관리자 비밀번호 변경 섹션 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-4xl mx-auto">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          관리자 비밀번호 변경
        </h3>
        <div className="space-y-4">
          {/* 현재 비밀번호 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              현재 비밀번호
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                placeholder="현재 비밀번호를 입력하세요"
                value={changePasswordForm.current}
                onChange={(e) =>
                  setChangePasswordForm((f) => ({
                    ...f,
                    current: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                {showCurrentPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* 새 비밀번호 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              새 비밀번호
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="새 비밀번호를 입력하세요 (최소 4자)"
                value={changePasswordForm.new}
                onChange={(e) =>
                  setChangePasswordForm((f) => ({
                    ...f,
                    new: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                {showNewPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* 새 비밀번호 확인 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              새 비밀번호 확인
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="새 비밀번호를 다시 입력하세요"
                value={changePasswordForm.confirm}
                onChange={(e) =>
                  setChangePasswordForm((f) => ({
                    ...f,
                    confirm: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {changePasswordError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {changePasswordError}
            </div>
          )}
          {changePasswordSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
              {changePasswordSuccess}
            </div>
          )}
          <button
            onClick={handleChangePassword}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-md hover:shadow-lg"
          >
            비밀번호 변경
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSystemManagement;
