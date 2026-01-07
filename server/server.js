// ===============================================
// 🚀 부성스틸 AI 인사관리 시스템 - Express 서버
// ===============================================

const path = require('path');
const fs = require('fs');
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
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const routes = require('./routes');
const http = require('http');
const { Server } = require('socket.io');

// ================== 시간대 설정 ==================
// 한국 시간대(KST, UTC+9)로 설정
process.env.TZ = 'Asia/Seoul';
console.log('🕐 시간대 설정:', process.env.TZ);
console.log(
  '🕐 현재 서버 시간:',
  new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
);

const app = express();
const server = http.createServer(app);

// Socket.io CORS 설정 (환경변수 기반)
const socketAllowedOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
    : []),
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (socketAllowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy violation'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = Number(process.env.PORT);
if (!PORT) {
  console.error('❌ 환경변수 PORT가 설정되지 않았습니다 (.env.production).');
  process.exit(1);
}

// ================== 미들웨어 ==================
// CORS 설정 - 환경변수 기반
const allowedOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
    : []),
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // 모바일 앱, Postman, SSR 등에서 origin이 없거나 null일 수 있음
      if (!origin || origin === 'null') {
        return callback(null, true);
      }

      // 허용된 origin 또는 와일드카드 패턴 체크
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.error('❌ CORS policy violation - Rejected origin:', origin);
        console.error('📋 Allowed origins:', allowedOrigins);
        console.error('🔍 FRONTEND_URL:', process.env.FRONTEND_URL);
        callback(new Error('CORS policy violation'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
// app.use(morgan('dev')); // API 요청 로그 비활성화

// Socket.io 인스턴스를 app.locals에 저장하여 라우트에서 사용 가능하게 함
app.locals.io = io;

// 업로드된 파일 제공 (static)
app.use(
  '/uploads',
  express.static(require('path').join(__dirname, '../uploads'))
);

// ================== 예약 공지사항 자동 게시 함수 ==================
async function checkAndPublishScheduledNotices() {
  try {
    const { Notice } = require('./models');
    const now = new Date();

    const updateResult = await Notice.updateMany(
      {
        isScheduled: true,
        scheduledDateTime: { $lte: now },
        isPublished: false,
      },
      {
        $set: { isPublished: true },
      }
    );

    if (updateResult.modifiedCount > 0) {
      console.log(
        `📢 [${new Date().toLocaleString('ko-KR')}] ${
          updateResult.modifiedCount
        }개의 예약 공지사항을 자동 게시로 변경했습니다.`
      );

      // Socket.io로 모든 클라이언트에 알림
      io.emit('notice-published', {
        count: updateResult.modifiedCount,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('⚠️ 예약 공지사항 체크 중 오류:', err);
  }
}

// ================== DB 연결 ==================
const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!mongoURI) {
  console.error(
    '❌ 환경변수 MONGO_URI 또는 MONGODB_URI가 설정되지 않았습니다 (.env.production).'
  );
  process.exit(1);
}
// const { startBackupScheduler } = require('./utils/backupScheduler');
const { startAnnualLeaveScheduler } = require('./utils/annualLeaveScheduler');
const { startSelfPingScheduler } = require('./utils/selfPing');

mongoose
  .connect(mongoURI)
  .then(async () => {
    console.log('✅ MongoDB 연결 성공');

    // 서버 시작 시 즉시 체크
    await checkAndPublishScheduledNotices();
    console.log('📢 서버 시작: 예약 공지사항 초기 체크 완료');

    // 1분마다 주기적으로 체크 (60000ms = 1분)
    setInterval(checkAndPublishScheduledNotices, 60000);
    console.log('⏰ 예약 공지사항 자동 체크 시작 (1분마다)');

    // 백업 스케줄러 시작 (비활성화 - 수동 백업만 사용)
    // startBackupScheduler();

    // 연차 만료 알림 스케줄러 시작
    startAnnualLeaveScheduler(io);

    // Self-ping 스케줄러 시작 (환경변수에 따라 동작)
    startSelfPingScheduler();
  })
  .catch((err) => console.error('❌ MongoDB 연결 실패:', err));

// ================== 라우트 ==================
app.use('/api', routes);

// 기본 라우트
app.get('/', (req, res) =>
  res.send('부성스틸 AI 인사관리 서버 정상 동작 중 ✅')
);

// 헬스 체크 (서버 생존 여부 확인용)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Health check 엔드포인트
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: '부성스틸 AI 인사관리 서버 정상 동작 중',
  });
});

// ================== Socket.io 연결 관리 ==================
io.on('connection', (socket) => {
  console.log('✅ 클라이언트 연결:', socket.id);

  socket.on('disconnect', () => {
    console.log('❌ 클라이언트 연결 해제:', socket.id);
  });
});

// ================== 서버 시작 ==================
server.listen(PORT, () => {
  const publicUrl = process.env.SERVER_PUBLIC_URL || process.env.BACKEND_URL;
  if (publicUrl) {
    console.log(`🚀 Server running: ${publicUrl}`);
  } else {
    console.log(`🚀 Server running on port ${PORT}`);
  }
  console.log(`🔌 Socket.io ready for real-time updates`);
});

// ================== Graceful Shutdown (PM2 대응) ==================
function gracefulShutdown(signal) {
  console.log(`\n📴 Received ${signal}. Shutting down gracefully...`);

  // 더 이상 신규 요청을 받지 않도록 서버 닫기
  server.close(() => {
    console.log('✅ HTTP server closed');

    // MongoDB 연결 종료
    mongoose.connection
      .close()
      .then(() => {
        console.log('✅ MongoDB connection closed');
        process.exit(0);
      })
      .catch((err) => {
        console.error('❌ Error closing MongoDB connection:', err);
        process.exit(1);
      });
  });

  // 타임아웃 후 강제 종료 (PM2 등 신호 재전송 대비)
  setTimeout(() => {
    console.error('⏰ Shutdown timeout. Forcing exit.');
    process.exit(1);
  }, 10000).unref();
}

['SIGTERM', 'SIGINT'].forEach((signal) => {
  process.on(signal, () => gracefulShutdown(signal));
});
