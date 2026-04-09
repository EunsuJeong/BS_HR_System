// ===============================================
// 🚀 부성스틸 AI 인사관리 시스템 - Express 서버
// ===============================================

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const compression = require('compression');
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

const socketAllowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://bssystem.iptime.org:3000',
  'http://bssystem.iptime.org:5000',
  process.env.FRONTEND_URL,
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || origin === 'null') return callback(null, true);
      if (
        socketAllowedOrigins.includes(origin) ||
        origin.match(/\.vercel\.app$/) ||
        origin.match(/\.iptime\.org/) ||
        origin.match(/^https?:\/\/localhost/) ||
        origin.match(/^https?:\/\/192\.168\./) ||
        origin.match(/^https?:\/\/10\./)
      ) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy violation'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

const PORT = process.env.PORT || 5000;

// ================== 미들웨어 ==================
// CORS 설정 - 로컬 서버 배포 (FBD_One)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://bssystem.iptime.org:3000', // ipTIME DDNS 로컬 서버
  'http://bssystem.iptime.org:5000', // 백엔드 포트
  'https://bs-hr-system.vercel.app', // Vercel 프로덕션 URL (백업)
  process.env.FRONTEND_URL, // 환경변수로 설정된 URL
].filter(Boolean); // undefined 제거

// HTTP 응답 압축 (gzip) - 대용량 JSON 응답 크기 50~70% 감소
app.use(compression());

app.use(
  cors({
    origin: function (origin, callback) {
      // 모바일 앱, Postman, SSR 등에서 origin이 없거나 null일 수 있음
      if (!origin || origin === 'null') {
        return callback(null, true);
      }

      // 허용된 origin 또는 와일드카드 패턴 체크
      if (
        allowedOrigins.includes(origin) ||
        origin.match(/\.vercel\.app$/) || // Vercel 프리뷰 배포
        origin.match(/\.iptime\.org/) || // ipTIME DDNS 도메인
        origin.match(/^https?:\/\/localhost/) || // 로컬호스트 모든 포트
        origin.match(/^https?:\/\/192\.168\./) || // 사내 네트워크
        origin.match(/^https?:\/\/10\./) // 사내 네트워크 (추가)
      ) {
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
const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/busung_hr';
const { startSelfPingScheduler } = require('./utils/selfPing');
const { checkAndRunCatchupBackup } = require('./utils/backupScheduler');
const { checkAndRunCatchupExcelBackup } = require('./utils/excelBackupScheduler');

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

    // Self-ping 스케줄러 시작 (Railway sleep 방지 - 매일 오전 5시)
    startSelfPingScheduler();

    // 서버 재시작 시 당일 백업 누락 여부 보정 (Windows 작업 스케줄러 보완)
    checkAndRunCatchupBackup();
    checkAndRunCatchupExcelBackup();
  })
  .catch((err) => console.error('❌ MongoDB 연결 실패:', err));

// ================== 라우트 ==================
app.use('/api', routes);

// 연차 만료 체크 즉시 실행 엔드포인트 (갱신 누락 보정용)
app.post('/api/admin/annual-leave/check', async (req, res) => {
  try {
    const { checkAnnualLeaveExpiry } = require('./utils/annualLeaveScheduler');
    console.log('🔧 수동 연차 만료 체크 실행 요청');
    await checkAnnualLeaveExpiry(null);
    res.json({ success: true, message: '연차 만료 체크 완료' });
  } catch (err) {
    console.error('❌ 수동 연차 체크 오류:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// JSON 백업 즉시 실행 엔드포인트 (Windows 작업 스케줄러에서 호출)
app.post('/api/admin/backup/run', async (req, res) => {
  try {
    const { performBackup } = require('./utils/backupScheduler');
    console.log('🔧 수동 JSON 백업 실행 요청');
    const result = await performBackup();
    res.json({ success: result, message: result ? 'JSON 백업 완료' : 'JSON 백업 실패' });
  } catch (err) {
    console.error('❌ 수동 JSON 백업 오류:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 연차 갱신 즉시 실행 엔드포인트 (Windows 작업 스케줄러에서 호출)
app.post('/api/admin/annual-leave/renew', async (req, res) => {
  try {
    const { performAnnualRenewal } = require('./utils/annualLeaveScheduler');
    console.log('🔧 수동 연차 갱신 실행 요청');
    await performAnnualRenewal(null);
    res.json({ success: true, message: '연차 갱신 완료' });
  } catch (err) {
    console.error('❌ 수동 연차 갱신 오류:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Excel 백업 즉시 실행 엔드포인트 (Windows 작업 스케줄러에서 호출)
app.post('/api/admin/excel-backup/run', async (req, res) => {
  try {
    const { performDailyExcelBackup } = require('./utils/excelBackupScheduler');
    console.log('🔧 수동 Excel 백업 실행 요청');
    const result = await performDailyExcelBackup();
    res.json({ success: result, message: result ? 'Excel 백업 완료' : 'Excel 백업 실패' });
  } catch (err) {
    console.error('❌ 수동 Excel 백업 오류:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================== React 프로덕션 정적 파일 서빙 ==================
const buildPath = path.join(__dirname, '../build');
if (require('fs').existsSync(buildPath)) {
  app.use(express.static(buildPath));
  console.log('📦 React 빌드 파일 서빙 활성화:', buildPath);
} else {
  console.warn('⚠️ build/ 폴더 없음 - npm run build 필요');
}

// Health check 엔드포인트 (API 라우트보다 앞에 위치)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: '부성스틸 AI 인사관리 서버 정상 동작 중',
  });
});

// ================== Socket.io 연결 관리 (비활성화) ==================
/*
io.on('connection', (socket) => {
  console.log('✅ 클라이언트 연결:', socket.id);

  socket.on('disconnect', () => {
    console.log('❌ 클라이언트 연결 해제:', socket.id);
  });
});
*/

// SPA 라우팅: /api, /uploads 외 모든 경로 → index.html (Express 5.x 호환)
if (require('fs').existsSync(buildPath)) {
  app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// ================== 서버 시작 ==================
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  // console.log(`🔌 Socket.io ready for real-time updates`); // Socket.io 비활성화됨
});
