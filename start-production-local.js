/**
 * 로컬에서 프로덕션 빌드 실행 스크립트
 * - build 폴더를 포트 3000에서 서빙
 * - 백엔드는 별도 실행 필요: npm run server:dev
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// 정적 파일 제공 (build 폴더)
app.use(express.static(path.join(__dirname, 'build')));

// SPA 라우팅 처리 (모든 요청을 index.html로)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n✅ 프로덕션 빌드 실행 중: http://localhost:${PORT}`);
  console.log(`📊 Performance 탭에서 INP 측정: 200ms 이하 예상\n`);
  console.log(`⚠️  백엔드 서버도 실행해야 합니다:`);
  console.log(`   새 터미널에서: npm run server:dev\n`);
});
