import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

// 실시간 동기화 이벤트 타입 정의
export const SYNC_EVENTS = {
  ATTENDANCE_UPDATE: 'attendance:update',
  ATTENDANCE_UPDATED: 'attendance:updated',
  ATTENDANCE_SUBSCRIBE: 'attendance:subscribe',
  ATTENDANCE_UNSUBSCRIBE: 'attendance:unsubscribe',
  EMPLOYEE_STATUS: 'employee:status',
  WORK_SCHEDULE: 'schedule:update',
  BULK_IMPORT: 'data:bulk_import',
  USER_CONNECTED: 'user:connected',
  USER_DISCONNECTED: 'user:disconnected',
  CONFLICT_DETECTED: 'conflict:detected',
};

export const SocketProvider = ({ children, token }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [connectionError, setConnectionError] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  // Socket 연결 설정
  useEffect(() => {
    // Socket 기능 비활성화 (서버에 Socket.io 미구현)
    return;

    const serverUrl =
      process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

    const socketInstance = io(serverUrl, {
      auth: { token: token || 'dev-token' },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    // 연결 성공
    socketInstance.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
    });

    // 연결 해제
    socketInstance.on('disconnect', (reason) => {
      setIsConnected(false);
    });

    // 연결 오류
    socketInstance.on('connect_error', (error) => {
      console.error('❌ 실시간 서버 연결 오류:', error);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    // 재연결
    socketInstance.on('reconnect', (attemptNumber) => {
      setIsConnected(true);
      setConnectionError(null);
    });

    // 사용자 연결/해제 이벤트
    socketInstance.on(SYNC_EVENTS.USER_CONNECTED, (data) => {
      setConnectedUsers((prev) => {
        const exists = prev.find((user) => user.userId === data.userId);
        if (exists) return prev;
        return [...prev, data];
      });
    });

    socketInstance.on(SYNC_EVENTS.USER_DISCONNECTED, (data) => {
      setConnectedUsers((prev) =>
        prev.filter((user) => user.userId !== data.userId)
      );
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token]);

  // 근태 데이터 구독
  const subscribeToAttendance = useCallback(
    (year, month, department = 'all') => {
      if (!socket || !isConnected) {
        console.warn('Socket이 연결되지 않음 - 구독 불가');
        return;
      }

      const subscriptionData = { year, month, department };
      socket.emit(SYNC_EVENTS.ATTENDANCE_SUBSCRIBE, subscriptionData);
    },
    [socket, isConnected]
  );

  // 근태 데이터 구독 해제
  const unsubscribeFromAttendance = useCallback(
    (year, month, department = 'all') => {
      if (!socket) return;

      const subscriptionData = { year, month, department };
      socket.emit(SYNC_EVENTS.ATTENDANCE_UNSUBSCRIBE, subscriptionData);
    },
    [socket]
  );

  // 근태 데이터 업데이트
  const updateAttendanceData = useCallback(
    (attendanceData) => {
      if (!socket || !isConnected) {
        console.warn('Socket이 연결되지 않음 - 업데이트 불가');
        return Promise.reject(new Error('Socket not connected'));
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('업데이트 시간 초과'));
        }, 10000);

        // 성공 응답 핸들러
        const onSuccess = (data) => {
          clearTimeout(timeout);
          socket.off('attendance:update_success', onSuccess);
          socket.off('attendance:error', onError);
          setLastUpdateTime(new Date());
          resolve(data);
        };

        // 오류 응답 핸들러
        const onError = (error) => {
          clearTimeout(timeout);
          socket.off('attendance:update_success', onSuccess);
          socket.off('attendance:error', onError);
          reject(new Error(error.message || '업데이트 실패'));
        };

        socket.once('attendance:update_success', onSuccess);
        socket.once('attendance:error', onError);

        socket.emit(SYNC_EVENTS.ATTENDANCE_UPDATE, attendanceData);
      });
    },
    [socket, isConnected]
  );

  // 대량 데이터 업데이트
  const bulkUpdateAttendance = useCallback(
    (records, year, month, department = 'all') => {
      if (!socket || !isConnected) {
        console.warn('Socket이 연결되지 않음 - 대량 업데이트 불가');
        return Promise.reject(new Error('Socket not connected'));
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('대량 업데이트 시간 초과'));
        }, 30000); // 30초

        const onSuccess = (data) => {
          clearTimeout(timeout);
          socket.off('bulk_import:success', onSuccess);
          socket.off('bulk_import:error', onError);
          setLastUpdateTime(new Date());
          resolve(data);
        };

        const onError = (error) => {
          clearTimeout(timeout);
          socket.off('bulk_import:success', onSuccess);
          socket.off('bulk_import:error', onError);
          reject(new Error(error.message || '대량 업데이트 실패'));
        };

        socket.once('bulk_import:success', onSuccess);
        socket.once('bulk_import:error', onError);

        const bulkData = { records, year, month, department };
        socket.emit(SYNC_EVENTS.BULK_IMPORT, bulkData);
      });
    },
    [socket, isConnected]
  );

  // 실시간 이벤트 리스너 등록
  const addEventListener = useCallback(
    (event, callback) => {
      if (!socket) return () => {};

      socket.on(event, callback);
      return () => socket.off(event, callback);
    },
    [socket]
  );

  // 실시간 이벤트 리스너 제거
  const removeEventListener = useCallback(
    (event, callback) => {
      if (!socket) return;
      socket.off(event, callback);
    },
    [socket]
  );

  // Context value
  const contextValue = {
    socket,
    isConnected,
    connectedUsers,
    connectionError,
    lastUpdateTime,

    // 구독 관리
    subscribeToAttendance,
    unsubscribeFromAttendance,

    // 데이터 업데이트
    updateAttendanceData,
    bulkUpdateAttendance,

    // 이벤트 관리
    addEventListener,
    removeEventListener,

    // 유틸리티
    SYNC_EVENTS,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};
