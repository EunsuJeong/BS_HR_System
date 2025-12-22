import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * COMMON 공통 - 로그인 및 언어선택 컴포넌트
 * 인증 흐름: 로그인 화면 → 언어 선택 화면 (직원만)
 */
const CommonLogin = ({
  currentUser,
  showLanguageSelection,
  loginForm,
  setLoginForm,
  loginError,
  showPassword,
  setShowPassword,
  handleLogin,
  handleLanguageSelect,
}) => {
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
                onKeyPress={(e) => e.key === 'Enter' && handleLogin(e)}
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
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin(e)}
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

            {loginError && (
              <div className="text-red-500 text-sm text-center">
                {loginError}
              </div>
            )}

            <button
              onClick={handleLogin}
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
              부성스틸 HR 관리 시스템 (ver.1.0)
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
              onClick={() => handleLanguageSelect('ko')}
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
              onClick={() => handleLanguageSelect('en')}
              className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
            >
              <div className="text-left">
                <div className="text-2xl font-semibold text-gray-800">
                  English
                </div>
                <div className="text-base text-gray-600">영어</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 두 조건 모두 아닐 때는 null 반환 (메인 화면으로 진행)
  return null;
};

export default CommonLogin;
