import React from 'react';
import { useSocket } from '../contexts/SocketContext';
import { Wifi, WifiOff, Users, Clock, AlertCircle } from 'lucide-react';

const RealtimeStatus = () => {
  const {
    isConnected,
    connectedUsers,
    lastUpdateTime,
    connectionError
  } = useSocket();

  return (
    <div className="hidden fixed top-4 left-4 z-50">
      <div className={`
        flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-sm font-medium
        ${isConnected
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-red-50 text-red-700 border border-red-200'
        }
      `}>
        {isConnected ? (
          <>
            <Wifi className="w-4 h-4" />
            <span>실시간 연결됨</span>
            {connectedUsers.length > 0 && (
              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-green-300">
                <Users className="w-3 h-3" />
                <span className="text-xs">{connectedUsers.length}명 접속</span>
              </div>
            )}
            {lastUpdateTime && (
              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-green-300">
                <Clock className="w-3 h-3" />
                <span className="text-xs">
                  {lastUpdateTime.toLocaleTimeString()}
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>연결 끊어짐</span>
            {connectionError && (
              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-red-300">
                <AlertCircle className="w-3 h-3" />
                <span className="text-xs" title={connectionError}>
                  오류 발생
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RealtimeStatus;