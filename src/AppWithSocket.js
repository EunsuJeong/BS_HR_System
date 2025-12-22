import React, { useState } from 'react';
import { SocketProvider } from './contexts/SocketContext';
import { useAttendanceSync } from './components/common/common_common';
import RealtimeStatus from './components/RealtimeStatus';
import ConflictResolutionModal from './components/ConflictResolutionModal';
import HRManagementSystem from './App';

// 실시간 동기화 래퍼 컴포넌트
const RealtimeSyncWrapper = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const {
    conflicts,
    resolveConflict,
    hasUnresolvedConflicts
  } = useAttendanceSync(currentYear, currentMonth);

  const [showConflictModal, setShowConflictModal] = useState(false);

  // 충돌이 발생하면 모달 표시
  React.useEffect(() => {
    if (hasUnresolvedConflicts && !showConflictModal) {
      setShowConflictModal(true);
    }
  }, [hasUnresolvedConflicts, showConflictModal]);

  return (
    <>
      <HRManagementSystem />
      <RealtimeStatus />
      {showConflictModal && conflicts.length > 0 && (
        <ConflictResolutionModal
          conflicts={conflicts}
          onResolve={resolveConflict}
          onClose={() => setShowConflictModal(false)}
        />
      )}
    </>
  );
};

// 실시간 동기화가 적용된 HR 시스템 래퍼
const AppWithSocket = () => {
  // 개발 환경에서는 토큰 없이 진행 (실제 환경에서는 인증 토큰 사용)
  const authToken = localStorage.getItem('hrAuthToken') || 'dev-token';

  return (
    <SocketProvider token={authToken}>
      <RealtimeSyncWrapper />
    </SocketProvider>
  );
};

export default AppWithSocket;