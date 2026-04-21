import React, { createContext, useContext, useMemo } from 'react';

/**
 * NavigationContext — 관리자 탭 내비게이션 전역 상태 (1차 도입)
 *
 * 포함 항목:
 *   activeTab      — 현재 활성 탭 ID (string)
 *   setActiveTab   — raw setter (localStorage 동기화 포함 handleTabChange는 App.js 유지)
 *
 * 제외 항목:
 *   handleTabChange — Auth 결합(permissions 체크) + saveStatsRef side effect 포함
 *                     → App.js 유지, AdminMain에 prop으로 전달
 */

const NavigationContext = createContext(null);

// ─────────────────────────────────────────────────────────────
// NavigationProvider
// ─────────────────────────────────────────────────────────────
export const NavigationProvider = ({ activeTab, setActiveTab, children }) => {
  const value = useMemo(
    () => ({ activeTab, setActiveTab }),
    [activeTab, setActiveTab]
    // setActiveTab은 useState setter → 항상 동일 참조이므로 deps는 안전
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

// ─────────────────────────────────────────────────────────────
// useNavigationContext
// ─────────────────────────────────────────────────────────────
export const useNavigationContext = () => {
  const ctx = useContext(NavigationContext);
  if (ctx === null) {
    throw new Error('useNavigationContext must be used within NavigationProvider');
  }
  return ctx;
};

export default NavigationContext;
