const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 HR 시스템 실시간 동기화 시작...\n');

// WebSocket 서버 시작
console.log('📡 WebSocket 서버 시작 (포트 3001)...');
const serverProcess = spawn('node', ['server/index.js'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: ['inherit', 'pipe', 'pipe']
});

serverProcess.stdout.on('data', (data) => {
  console.log(`[서버] ${data.toString().trim()}`);
});

serverProcess.stderr.on('data', (data) => {
  console.error(`[서버 에러] ${data.toString().trim()}`);
});

// React 앱 시작 (포트 3002)
setTimeout(() => {
  console.log('\n💻 React 앱 시작 (포트 3002)...');
  const clientProcess = spawn('npm', ['start'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: '3002' },
    stdio: ['inherit', 'pipe', 'pipe']
  });

  clientProcess.stdout.on('data', (data) => {
    const message = data.toString().trim();
    if (message.includes('webpack')) {
      console.log(`[클라이언트] ${message}`);
    }
  });

  clientProcess.stderr.on('data', (data) => {
    console.error(`[클라이언트 에러] ${data.toString().trim()}`);
  });

  // 종료 처리
  process.on('SIGINT', () => {
    console.log('\n🛑 시스템 종료 중...');
    serverProcess.kill();
    clientProcess.kill();
    process.exit();
  });

}, 2000);

console.log('\n🔧 시스템 정보:');
console.log('- WebSocket 서버: http://localhost:3001');
console.log('- 상태 확인 API: http://localhost:3001/api/health');
console.log('- React 앱: http://localhost:3002');
console.log('- 실시간 동기화: 활성화됨');
console.log('\n✨ 준비 완료! Ctrl+C로 종료할 수 있습니다.\n');