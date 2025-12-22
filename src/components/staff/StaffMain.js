import React from 'react';

/**
 * STAFF 직원 모드 - 상단 헤더 컴포넌트
 * 시스템 제목, 사용자 정보, 글씨 크기 조절, 언어 변경, 비밀번호 변경, 로그아웃 버튼 표시
 */
const StaffMain = ({
  currentUser,
  fontSize,
  handleFontSizeChange,
  getText,
  setShowLanguageSelection,
  setShowChangePasswordPopup,
  handleLogout,
  handleRefresh,
}) => {
  return (
    <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-6">
      <div className="flex justify-between items-center mb-2 gap-1">
        <h1 className="text-base sm:text-sm md:text-base font-bold text-indigo-800 flex-1 text-center whitespace-nowrap">
          {getText('부성스틸(주) 인사관리시스템', 'BS Steel HRM System')}
        </h1>
        <div className="flex justify-end">
          {/* ✅ 글씨 크기 선택 UI - 셀렉트 박스 */}
          <select
            id="fontSize"
            value={fontSize}
            onChange={(e) => handleFontSizeChange(e.target.value)}
            className="text-2xs px-1.5 py-1 border border-gray-300 rounded bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-500 flex-shrink-0"
          >
            <option value="small">작게</option>
            <option value="normal">보통</option>
            <option value="large">크게</option>
          </select>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <div className="flex-shrink-0">
          <h2 className="text-sm font-semibold whitespace-nowrap">
            <span className="text-gray-800">{currentUser.name}</span>
            <span className="text-2xs text-gray-400 font-normal">
              {getText('님', '')}
            </span>
          </h2>
        </div>
        <div className="flex space-x-2 items-center">
          <span className="text-gray-300">|</span>
          <button
            onClick={handleRefresh}
            className="text-xs text-green-600 hover:text-green-700 font-bold"
            title={getText('새로고침', 'Refresh')}
          >
            {getText('새로고침', 'Refresh')}
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => setShowLanguageSelection(true)}
            className="text-xs text-purple-600 hover:text-purple-600 font-bold"
          >
            {getText('언어변경', 'Language')}
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => setShowChangePasswordPopup(true)}
            className="text-xs text-blue-600 hover:text-blue-600 font-bold"
          >
            {getText('비밀번호 변경', 'Change Password')}
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={handleLogout}
            className="flex items-center text-xs text-red-600 hover:text-red-600 font-bold"
          >
            {getText('로그아웃', 'Logout')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffMain;
