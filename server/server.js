// ===============================================
// 🚀 부성스틸 AI 인사관리 시스템 - Express 서버
// ===============================================

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
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

// Socket.io CORS 설정
const socketAllowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  process.env.FRONTEND_URL,
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (
        socketAllowedOrigins.includes(origin) ||
        origin.match(/\.vercel\.app$/) ||
        origin.match(/^https?:\/\/localhost/)
      ) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy violation'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 5000;

// ================== 미들웨어 ==================
// CORS 설정 - 프로덕션 환경 고려
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  process.env.FRONTEND_URL, // Vercel 배포 URL
].filter(Boolean); // undefined 제거

app.use(
  cors({
    origin: function (origin, callback) {
      // 모바일 앱이나 Postman 등에서 origin이 없을 수 있음
      if (!origin) return callback(null, true);

      // 허용된 origin 또는 와일드카드 패턴 체크
      if (
        allowedOrigins.includes(origin) ||
        origin.match(/\.vercel\.app$/) || // Vercel 프리뷰 배포
        origin.match(/^https?:\/\/localhost/) // 로컬호스트 모든 포트
      ) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy violation'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
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

    // Self-ping 스케줄러 시작 (Railway sleep 방지 - 매일 오전 5시)
    startSelfPingScheduler();
  })
  .catch((err) => console.error('❌ MongoDB 연결 실패:', err));

// ================== 라우트 ==================
app.use('/api', routes);

// 기본 라우트
app.get('/', (req, res) =>
  res.send('부성스틸 AI 인사관리 서버 정상 동작 중 ✅')
);

// ================== Socket.io 연결 관리 ==================
io.on('connection', (socket) => {
  console.log('✅ 클라이언트 연결:', socket.id);

  socket.on('disconnect', () => {
    console.log('❌ 클라이언트 연결 해제:', socket.id);
  });
});

// ================== 서버 시작 ==================
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.io ready for real-time updates`);
});
