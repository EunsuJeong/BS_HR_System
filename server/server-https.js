// ===============================================
// 🔐 HTTPS 서버 설정 파일 (Self-Signed Certificate)
// ===============================================

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const routes = require('./routes');

// ================== 시간대 설정 ==================
process.env.TZ = 'Asia/Seoul';
console.log('🕐 시간대 설정:', process.env.TZ);
console.log('🕐 현재 서버 시간:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));

const app = express();

// ================== CORS 설정 ==================
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://bs-hr-system.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.match(/\.vercel\.app$/)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// ================== 미들웨어 설정 ==================
app.use(morgan('dev'));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../build')));

// ================== API 라우트 ==================
app.use('/api', routes);

// 기본 라우트
app.get('/', (req, res) =>
  res.send('부성스틸 AI 인사관리 서버 정상 동작 중 ✅ (HTTPS)')
);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: '부성스틸 AI 인사관리 서버 정상 동작 중 (HTTPS)',
    protocol: 'https',
  });
});

// ================== MongoDB 연결 ==================
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB 연결 성공'))
.catch((err) => console.error('❌ MongoDB 연결 실패:', err));

// ================== SSL 인증서 설정 ==================
const sslPath = path.join(__dirname, '../ssl');
let httpsOptions = null;

// SSL 인증서 파일 확인
const certPath = path.join(sslPath, 'certificate.crt');
const keyPath = path.join(sslPath, 'private.key');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  httpsOptions = {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
  };
  console.log('✅ SSL 인증서 로드 완료');
} else {
  console.log('⚠️  SSL 인증서 파일이 없습니다. Self-signed 인증서를 생성하세요.');
  console.log('   설치 방법: npm run generate-ssl');
}

// ================== 서버 시작 ==================
const HTTP_PORT = process.env.PORT || 5000;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;

// HTTP 서버 (HTTPS로 리다이렉트)
const httpServer = http.createServer((req, res) => {
  const host = req.headers.host.split(':')[0];
  res.writeHead(301, { Location: `https://${host}${req.url}` });
  res.end();
});

httpServer.listen(HTTP_PORT, () => {
  console.log(`🔓 HTTP Server running on port ${HTTP_PORT} (redirects to HTTPS)`);
});

// HTTPS 서버
if (httpsOptions) {
  const httpsServer = https.createServer(httpsOptions, app);
  
  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`🔐 HTTPS Server running on port ${HTTPS_PORT}`);
    console.log(`📍 https://${process.env.DDNS_DOMAIN || 'busung-hr.iptime.org'}`);
  });
} else {
  console.log('❌ HTTPS 서버를 시작할 수 없습니다. SSL 인증서를 생성해주세요.');
}
