import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * COMMON 공통 - 로그인 및 언어선택 컴포넌트
 * 인증 흐름: 로그인 화면 → 언어 선택 화면 (직원만)
 */
const CommonLogin = ({
  currentUser,
  showLanguageSelection,
  loginError,
  showPassword,
  setShowPassword,
  handleLogin,
  handleLanguageSelect,
  rememberUserId,
  setRememberUserId,
  rememberPassword,
  setRememberPassword,
}) => {
  const [skipInFuture, setSkipInFuture] = useState(false);
  const [isAutoLogging, setIsAutoLogging] = useState(false);

  // 로그인 폼 로컬 state (App.js 전체 리렌더 방지)
  const [loginForm, setLoginForm] = useState({ id: '', password: '' });

  // 아이디/비밀번호 저장 기능: localStorage에서 초기값 로드 + 자동 로그인
  useEffect(() => {
    const savedId = localStorage.getItem('savedUserId');
    const savedPassword = localStorage.getItem('savedPassword');

    if (savedId) {
      setLoginForm((prev) => ({ ...prev, id: savedId }));
      setRememberUserId(true);
    }
    if (savedPassword) {
      setLoginForm((prev) => ({ ...prev, password: savedPassword }));
      setRememberPassword(true);
    }

    // 아이디 + 비밀번호 둘 다 저장된 경우 자동 로그인 시도
    // (수동 로그아웃 직후에는 skipAutoLogin 플래그로 재실행 방지)
    const skipAutoLogin = sessionStorage.getItem('skipAutoLogin');
    if (savedId && savedPassword && !skipAutoLogin) {
      setIsAutoLogging(true);
      handleLogin(
        { preventDefault: () => {} },
        { id: savedId, password: savedPassword }
      ).finally(() => {
        // handleLogin 내부의 stale closure(rememberUserId/rememberPassword=false)로 인해
        // localStorage가 지워지는 문제 방지 → 자동 로그인 후 저장값 복원
        localStorage.setItem('savedUserId', savedId);
        localStorage.setItem('savedPassword', savedPassword);
        setIsAutoLogging(false);
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 자동 로그인 진행 중 로딩 화면
  if (isAutoLogging) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">부성스틸(주)</h1>
          <p className="text-2xl text-indigo-600 font-semibold mb-8">AI 인사관리시스템</p>
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-base text-gray-500">자동 로그인 중...</p>
          </div>
        </div>
      </div>
    );
  }

  // 로그인 화면
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              부성스틸(주)
            </h1>
            <p className="text-2xl text-indigo-600 font-semibold">
              AI 인사관리시스템
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                아이디 (직원명)
              </label>
              <input
                type="text"
                value={loginForm.id}
                onChange={(e) =>
                  setLoginForm((prev) => ({ ...prev, id: e.target.value }))
                }
                onKeyPress={(e) => e.key === 'Enter' && handleLogin(e, loginForm)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="직원명을 입력하세요"
              />
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin(e, loginForm)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="첫 로그인 시 휴대폰 끝번호 4자리"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberUserId}
                  onChange={(e) => setRememberUserId(e.target.checked)}
                  className="mr-2 w-4 h-4 cursor-pointer"
                />
                <span className="text-sm text-gray-600">아이디 저장</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberPassword}
                  onChange={(e) => setRememberPassword(e.target.checked)}
                  className="mr-2 w-4 h-4 cursor-pointer"
                />
                <span className="text-sm text-gray-600">비밀번호 저장</span>
              </label>
            </div>

            {loginError && (
              <div className="text-red-500 text-sm text-center">
                {loginError}
              </div>
            )}

            <button
              onClick={(e) => handleLogin(e, loginForm)}
              className="w-full text-lg bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-medium"
            >
              로그인
            </button>

            <div className="text-center">
              <p className="text-base font-semibold text-gray-600">
                비밀번호는 관리팀에 문의 바랍니다.
              </p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 text-center">
              부성스틸 HR 관리 시스템(ver.2.2_260401)
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 언어 선택 화면
  if (showLanguageSelection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              부성스틸(주)
            </h1>
            <p className="text-2xl text-indigo-600 font-semibold mb-4">
              AI 인사관리시스템
            </p>
            <p className="text-gray-600">
              언어를 선택해주세요
              <br />
              Please select your language
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => handleLanguageSelect('ko', skipInFuture)}
              className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
            >
              <div className="text-left">
                <div className="text-2xl font-semibold text-gray-800">
                  한국어
                </div>
                <div className="text-base text-gray-600">Korean</div>
              </div>
            </button>

            <button
              onClick={() => handleLanguageSelect('en', skipInFuture)}
              className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
            >
              <div className="text-left">
                <div className="text-2xl font-semibold text-gray-800">
                  English
                </div>
                <div className="text-base text-gray-600">영어</div>
              </div>
            </button>

            <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={skipInFuture}
                onChange={(e) => setSkipInFuture(e.target.checked)}
                className="w-4 h-4 accent-indigo-600"
              />
              <span className="text-sm text-gray-600">
                이 언어만 보기
                <span className="text-xs text-gray-400 ml-1">
                  (이 화면이 다시 나타나지 않습니다)
                </span>
              </span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  // 두 조건 모두 아닐 때는 null 반환 (메인 화면으로 진행)
  return null;
};

export default CommonLogin;
