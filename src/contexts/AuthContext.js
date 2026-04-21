import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

/**
 * AuthContext — 인증 전역 상태 (1차 도입)
 *
 * 포함 항목:
 *   currentUser      — 로그인된 사용자 객체 (null = 미인증)
 *   setCurrentUser   — 직접 세터 (employees 동기화 useEffect, useAuth 로그인 핸들러 공용)
 *   isLoggedIn       — !!currentUser 파생값
 *   logout           — Auth 관련 정리만 수행
 *                      (비Auth 정리 — activeTab 초기화, showNoticePopup 등 — 은 App.js handleLogout이 담당)
 *
 * 제외 항목 (이번 단계):
 *   loginError, showPassword, rememberUserId, rememberPassword — App.js 로컬 유지
 *   handleLogin, handleChangePassword — useAuth 내부 유지 (비Auth 상태 10개 이상 참조)
 *   employees 동기화 useEffect — App.js 유지 (employees/leaveRequests 의존)
 */

const AuthContext = createContext(null);

// ─────────────────────────────────────────────────────────────
// AuthProvider
// ─────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  // session restore: F5 새로고침 시 유지, 창 닫기 시 sessionStorage가 사라지므로 로그아웃
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const isLoggedIn = !!currentUser;

  /**
   * Auth 관련 정리만 수행.
   * activeTab 초기화, showNoticePopup, localStorage['activeTab'] 등
   * 비Auth 상태 정리는 App.js handleLogout이 이 함수를 호출한 뒤 이어서 처리한다.
   */
  const logout = useCallback(() => {
    setCurrentUser(null);
    sessionStorage.removeItem('currentUser');
    // 수동 로그아웃 후 자동 로그인 재실행 방지 (탭 닫으면 세션 소멸)
    sessionStorage.setItem('skipAutoLogin', 'true');
  }, []);

  const value = useMemo(
    () => ({ currentUser, setCurrentUser, isLoggedIn, logout }),
    [currentUser, isLoggedIn, logout]
    // setCurrentUser는 useState setter → 항상 동일 참조이므로 deps 불필요
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ─────────────────────────────────────────────────────────────
// useAuthContext
// ─────────────────────────────────────────────────────────────
export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return ctx;
};

export default AuthContext;
