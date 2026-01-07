const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');

// Prefer .env.production when present; fallback to .env
const envCandidates = [
  path.join(__dirname, '../.env.production'),
  path.join(__dirname, '../.env'),
];
const envPath = envCandidates.find((p) => {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
});
require('dotenv').config(envPath ? { path: envPath } : {});

// 스케줄러
const { startBackupScheduler } = require('./utils/backupScheduler');
const {
  startDataRetentionScheduler,
} = require('./utils/dataRetentionScheduler');
const {
  startAnnualLeaveExpiryScheduler,
} = require('./utils/annualLeaveScheduler');
const { startSelfPingScheduler } = require('./utils/selfPing');

const app = express();
const server = createServer(app);

// CORS 설정
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL,
      ...(process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
        : []),
    ].filter(Boolean),
    credentials: true,
  })
);

logger.info('realtime server cors configured', {
  origins: [
    process.env.FRONTEND_URL,
    ...(process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
      : []),
  ].filter(Boolean),
});

app.use(express.json());

// Socket.IO 설정
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL,
      ...(process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
        : []),
    ].filter(Boolean),
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// JWT 시크릿 키 (실제 환경에서는 환경변수로 관리)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error(
    '환경변수 JWT_SECRET이 설정되지 않았습니다 (.env.production).'
  );
}
logger.info('realtime server jwt configured', {
  jwtConfigured: Boolean(JWT_SECRET),
  nodeEnv: process.env.NODE_ENV,
});

// 실시간 동기화 이벤트 타입 정의
const SYNC_EVENTS = {
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

// 연결된 사용자 저장소
const connectedUsers = new Map();
const roomSubscriptions = new Map();

// JWT 인증 미들웨어
io.use((socket, next) => {
  try {
    // 개발환경에서는 인증 건너뛰기 (실제 환경에서는 제거)
    if (process.env.NODE_ENV === 'development') {
      socket.userId = 'dev-user-' + Math.random().toString(36).substr(2, 9);
      socket.userRole = 'admin';
      return next();
    }

    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    socket.userRole = decoded.role;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

// 근태 데이터 업데이트 함수 (실제 DB 연동시 대체)
async function updateAttendanceData(data) {
  // 실제 구현에서는 MongoDB/PostgreSQL 등 DB 업데이트
  return {
    ...data,
    id: data.id || Date.now().toString(),
    version: (data.version || 0) + 1,
    modifiedAt: new Date(),
    success: true,
  };
}

// 충돌 감지 및 해결 로직
function detectConflict(localData, serverData) {
  if (!serverData) return { hasConflict: false, resolution: 'no_server_data' };

  if (
    localData.version &&
    serverData.version &&
    localData.version < serverData.version
  ) {
    return {
      hasConflict: true,
      resolution: 'server_wins',
      message: '다른 사용자가 수정한 데이터로 업데이트됩니다.',
      serverData,
      localData,
    };
  }

  if (localData.modifiedAt && serverData.modifiedAt) {
    const localTime = new Date(localData.modifiedAt);
    const serverTime = new Date(serverData.modifiedAt);

    if (Math.abs(localTime - serverTime) < 1000) {
      // 1초 이내 동시 수정
      return {
        hasConflict: true,
        resolution: 'user_choice_required',
        message: '동시에 수정된 데이터가 있습니다. 선택해주세요.',
        serverData,
        localData,
      };
    }
  }

  return { hasConflict: false, resolution: 'no_conflict' };
}

// Socket.IO 연결 처리
io.on('connection', (socket) => {
  logger.info('socket connected', {
    userId: socket.userId,
    role: socket.userRole,
    socketId: socket.id,
  });

  // 연결된 사용자 정보 저장
  connectedUsers.set(socket.userId, {
    socketId: socket.id,
    role: socket.userRole,
    connectedAt: new Date(),
  });

  // 모든 클라이언트에게 사용자 연결 알림
  socket.broadcast.emit(SYNC_EVENTS.USER_CONNECTED, {
    userId: socket.userId,
    role: socket.userRole,
    connectedAt: new Date(),
  });

  // 근태 데이터 구독
  socket.on(SYNC_EVENTS.ATTENDANCE_SUBSCRIBE, (data) => {
    try {
      const { year, month, department = 'all' } = data;
      const room = `attendance_${year}_${month}_${department}`;

      socket.join(room);

      // 구독 정보 저장
      if (!roomSubscriptions.has(room)) {
        roomSubscriptions.set(room, new Set());
      }
      roomSubscriptions.get(room).add(socket.userId);

      logger.info('room subscribed', { userId: socket.userId, room });

      // 구독 성공 응답
      socket.emit('attendance:subscribed', {
        room,
        subscribedAt: new Date(),
        subscriberCount: roomSubscriptions.get(room).size,
      });
    } catch (error) {
      console.error('구독 오류:', error);
      socket.emit('attendance:error', {
        message: '구독 중 오류가 발생했습니다.',
        error: error.message,
      });
    }
  });

  // 근태 데이터 구독 해제
  socket.on(SYNC_EVENTS.ATTENDANCE_UNSUBSCRIBE, (data) => {
    try {
      const { year, month, department = 'all' } = data;
      const room = `attendance_${year}_${month}_${department}`;

      socket.leave(room);

      // 구독 정보 제거
      if (roomSubscriptions.has(room)) {
        roomSubscriptions.get(room).delete(socket.userId);
        if (roomSubscriptions.get(room).size === 0) {
          roomSubscriptions.delete(room);
        }
      }

      logger.info('room unsubscribed', { userId: socket.userId, room });
    } catch (error) {
      console.error('구독 해제 오류:', error);
    }
  });

  // 근태 데이터 실시간 업데이트
  socket.on(SYNC_EVENTS.ATTENDANCE_UPDATE, async (data) => {
    try {
      logger.info('attendance update requested', { userId: socket.userId });

      // 충돌 감지 (실제 구현에서는 DB에서 현재 데이터 조회)
      const currentServerData = null; // DB에서 조회할 현재 데이터
      const conflict = detectConflict(data, currentServerData);

      if (conflict.hasConflict) {
        // 충돌 발생시 클라이언트에게 알림
        socket.emit(SYNC_EVENTS.CONFLICT_DETECTED, conflict);
        return;
      }

      // 데이터 업데이트
      const updatedRecord = await updateAttendanceData(data);

      // 같은 룸의 다른 사용자들에게 브로드캐스트
      const room = `attendance_${data.year || new Date().getFullYear()}_${
        data.month || new Date().getMonth() + 1
      }_${data.department || 'all'}`;

      const updatePayload = {
        ...updatedRecord,
        modifiedBy: socket.userId,
        modifiedByRole: socket.userRole,
        updateType: 'single_record',
      };

      // 본인에게는 성공 응답
      socket.emit('attendance:update_success', updatePayload);

      // 같은 룸의 다른 사용자들에게는 업데이트 알림
      socket.to(room).emit(SYNC_EVENTS.ATTENDANCE_UPDATED, updatePayload);

      logger.info('attendance update broadcasted', { room });
    } catch (error) {
      console.error('근태 데이터 업데이트 오류:', error);
      socket.emit('attendance:error', {
        message: '근태 데이터 업데이트 중 오류가 발생했습니다.',
        error: error.message,
        data,
      });
    }
  });

  // 대량 데이터 업데이트
  socket.on(SYNC_EVENTS.BULK_IMPORT, async (data) => {
    try {
      logger.info('bulk update requested', {
        userId: socket.userId,
        count: data.records?.length || 0,
      });

      const results = [];
      const room = `attendance_${data.year || new Date().getFullYear()}_${
        data.month || new Date().getMonth() + 1
      }_${data.department || 'all'}`;

      for (const record of data.records || []) {
        const updatedRecord = await updateAttendanceData({
          ...record,
          bulkImport: true,
          importedBy: socket.userId,
        });
        results.push(updatedRecord);
      }

      const bulkUpdatePayload = {
        records: results,
        modifiedBy: socket.userId,
        modifiedByRole: socket.userRole,
        updateType: 'bulk_import',
        importedAt: new Date(),
      };

      // 본인에게는 성공 응답
      socket.emit('bulk_import:success', bulkUpdatePayload);

      // 같은 룸의 다른 사용자들에게는 대량 업데이트 알림
      socket.to(room).emit('bulk_import:completed', bulkUpdatePayload);

      logger.info('bulk update broadcasted', { room });
    } catch (error) {
      console.error('대량 데이터 업데이트 오류:', error);
      socket.emit('bulk_import:error', {
        message: '대량 데이터 업데이트 중 오류가 발생했습니다.',
        error: error.message,
      });
    }
  });

  // 직원 상태 업데이트
  socket.on(SYNC_EVENTS.EMPLOYEE_STATUS, (data) => {
    try {
      logger.info('employee status update', { userId: socket.userId });

      // 모든 연결된 클라이언트에게 직원 상태 변경 알림
      io.emit(SYNC_EVENTS.EMPLOYEE_STATUS, {
        ...data,
        updatedBy: socket.userId,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('직원 상태 업데이트 오류:', error);
    }
  });

  // 연결 해제 처리
  socket.on('disconnect', () => {
    logger.info('socket disconnected', { userId: socket.userId });

    // 연결된 사용자 목록에서 제거
    connectedUsers.delete(socket.userId);

    // 모든 룸 구독에서 제거
    for (const [room, subscribers] of roomSubscriptions) {
      subscribers.delete(socket.userId);
      if (subscribers.size === 0) {
        roomSubscriptions.delete(room);
      }
    }

    // 다른 클라이언트들에게 연결 해제 알림
    socket.broadcast.emit(SYNC_EVENTS.USER_DISCONNECTED, {
      userId: socket.userId,
      disconnectedAt: new Date(),
    });
  });

  // 에러 처리
  socket.on('error', (error) => {
    logger.error('socket error', {
      userId: socket.userId,
      error: error.message,
    });
  });
});

// REST API 엔드포인트
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    connectedUsers: connectedUsers.size,
    activeRooms: roomSubscriptions.size,
  });
});

// 기본 헬스 체크 (서버 생존 여부 확인용)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/connected-users', (req, res) => {
  const users = Array.from(connectedUsers.entries()).map(([userId, data]) => ({
    userId,
    role: data.role,
    connectedAt: data.connectedAt,
  }));
  res.json(users);
});

// 한국 공휴일 API 프록시 엔드포인트 (CORS 우회 및 다중 API 지원)
app.get('/api/holidays/:year', async (req, res) => {
  const { year } = req.params;
  const { source } = req.query;

  logger.info('holiday api request', { year, source });

  try {
    let holidayData = {};

    switch (source) {
      case '한국천문연구원': {
        // API 키가 없을 때는 백업 데이터 즉시 사용
        logger.info('holiday api fallback to backup', { year, source });
        holidayData = getDefaultHolidayData(year);
        break;
      }

      case 'Holiday API': {
        // API 키가 없을 때는 백업 데이터 즉시 사용
        logger.info('holiday api fallback to backup', { year, source });
        holidayData = getDefaultHolidayData(year);
        break;
      }

      case '법정공휴일 API': {
        // API 키가 없을 때는 백업 데이터 즉시 사용
        logger.info('holiday api fallback to backup', { year, source });
        holidayData = getDefaultHolidayData(year);
        break;
      }

      default: {
        // 기본 백업 데이터 제공
        holidayData = getDefaultHolidayData(year);
        break;
      }
    }

    logger.info('holiday api response', {
      year,
      count: Object.keys(holidayData).length,
    });
    res.json(holidayData);
  } catch (error) {
    logger.error('holiday api error', { year, source, error: error.message });

    // 오류 시 기본 데이터 제공
    const fallbackData = getDefaultHolidayData(year);
    // console.log(`📋 ${year}년 백업 공휴일 데이터 제공: ${Object.keys(fallbackData).length}개`);
    res.json(fallbackData);
  }
});

// 기본 공휴일 데이터 (API 실패시 백업)
function getDefaultHolidayData(year) {
  const currentYear = parseInt(year);

  // 기본 고정 공휴일
  const defaultHolidays = {
    '01-01': '신정',
    '03-01': '삼일절',
    '05-05': '어린이날',
    '06-06': '현충일',
    '08-15': '광복절',
    '10-03': '개천절',
    '10-09': '한글날',
    '12-25': '성탄절',
  };

  // 연도별 특별 공휴일 및 대체공휴일 (검증된 데이터)
  const yearSpecificHolidays = {
    2023: {
      '01-21': '설날연휴',
      '01-22': '설날',
      '01-23': '설날연휴',
      '01-24': '대체공휴일',
      '05-27': '부처님오신날',
      '05-29': '대체공휴일',
      '09-28': '추석연휴',
      '09-29': '추석',
      '09-30': '추석연휴',
      '10-02': '대체공휴일',
    },
    2024: {
      '02-09': '설날연휴',
      '02-10': '설날',
      '02-11': '설날연휴',
      '02-12': '대체공휴일',
      '04-10': '국회의원선거일',
      '05-06': '대체공휴일',
      '05-15': '부처님오신날',
      '09-16': '추석연휴',
      '09-17': '추석',
      '09-18': '추석연휴',
    },
    2025: {
      '01-28': '설날연휴',
      '01-29': '설날',
      '01-30': '설날연휴',
      '03-03': '대체공휴일',
      '05-05': '어린이날/부처님오신날',
      '10-05': '추석연휴',
      '10-06': '추석',
      '10-07': '추석연휴',
    },
    2026: {
      '02-16': '설날연휴',
      '02-17': '설날',
      '02-18': '설날연휴',
      '05-24': '부처님오신날',
      '05-25': '대체공휴일',
      '09-24': '추석연휴',
      '09-25': '추석',
      '09-26': '추석연휴',
      '09-28': '대체공휴일',
    },
  };

  return {
    ...defaultHolidays,
    ...(yearSpecificHolidays[currentYear] || {}),
  };
}

// 서버 시작
const PORT = Number(process.env.PORT);
if (!PORT) {
  throw new Error('환경변수 PORT가 설정되지 않았습니다 (.env.production).');
}
logger.info('realtime server port configured', { port: PORT });
server.listen(PORT, () => {
  const publicUrl = process.env.SERVER_PUBLIC_URL || process.env.BACKEND_URL;
  if (publicUrl) {
    logger.info('realtime server running', { url: publicUrl });
    logger.info('realtime health endpoint', { url: `${publicUrl}/api/health` });
  } else {
    logger.info('realtime server running', { port: PORT });
  }
  logger.info('realtime schedulers active');

  // Graceful shutdown hooks (PM2 대응)
  function gracefulShutdown(signal) {
    logger.info('shutdown signal received', { signal });

    // 소켓 먼저 닫기
    io.close(() => {
      logger.info('socket.io server closed');
    });

    server.close(() => {
      logger.info('http server closed');
      process.exit(0);
    });

    // 타임아웃 후 강제 종료
    const shutdownTimeout = Number(process.env.SHUTDOWN_TIMEOUT_MS) || 10000;
    setTimeout(() => {
      logger.error('shutdown timeout forcing exit', { timeoutMs: shutdownTimeout });
      process.exit(1);
    }, shutdownTimeout).unref();
  }

  ['SIGTERM', 'SIGINT'].forEach((signal) => {
    process.on(signal, () => gracefulShutdown(signal));
  });

  // PM2 클러스터 모드에서 스케줄러는 첫 번째 인스턴스에서만 실행
  const instanceId = process.env.NODE_APP_INSTANCE || '0';
  if (instanceId === '0') {
    logger.info('schedulers initializing', { instanceId });
    startBackupScheduler(); // 자동 백업 비활성화됨 (GitHub Actions 사용)
    startDataRetentionScheduler();
    startAnnualLeaveExpiryScheduler();
    startSelfPingScheduler(); // Railway sleep 방지 (매일 오전 5시)
    logger.info('schedulers started');
  } else {
    logger.info('skipping schedulers on worker instance', { instanceId });
  }
});

module.exports = { app, server, io };
