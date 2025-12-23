const fs = require('fs');
const os = require('os');

console.log('═══════════════════════════════════════════════════');
console.log('  부성스틸 HR 시스템 - 로컬 네트워크 설정');
console.log('═══════════════════════════════════════════════════\n');

// 네트워크 인터페이스에서 IP 찾기
function getLocalIP() {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // IPv4, 내부 네트워크가 아닌 주소 찾기
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '192.168.0.XXX';
}

const localIP = getLocalIP();

console.log('🔍 로컬 IP 주소 확인...\n');
console.log(`📡 현재 PC의 IP 주소: ${localIP}\n`);

if (localIP === '192.168.0.XXX') {
  console.log('⚠️  IP 주소를 자동으로 찾을 수 없습니다.');
  console.log('   수동으로 확인하세요:');
  console.log('   Windows: ipconfig');
  console.log('   Mac/Linux: ifconfig\n');
}

const apiUrl = `http://${localIP}:5000/api`;

// .env.production 파일 생성
const envContent = `# 로컬 네트워크 테스트 환경 변수

# ⚠️ 주의: 이 설정은 같은 WiFi에 연결된 기기에서만 작동합니다!
# 프로덕션 배포 시에는 Railway URL을 사용하세요.

# 로컬 백엔드 API URL
REACT_APP_API_BASE_URL=${apiUrl}

# AI 통합 설정
REACT_APP_AI_PROVIDER=openai

# 프론트엔드 전용 API Key
# GitHub Actions에서 환경 변수로 주입됩니다
# REACT_APP_OPENAI_API_KEY는 빌드 시 설정됩니다

# 공휴일 API
REACT_APP_HOLIDAY_API_KEY=603c88ccf76cf95f2e1c8ffe7dfa6be2fd88feb4bd6e3000a0293c308885e111

# ESLint 설정
ESLINT_NO_DEV_ERRORS=true
DISABLE_ESLINT_PLUGIN=true
`;

fs.writeFileSync('.env.production', envContent);

console.log('✅ .env.production 파일이 생성되었습니다!\n');
console.log(`🔗 모바일 앱이 연결할 주소: ${apiUrl}\n`);

console.log('📋 다음 단계:');
console.log('   1. 로컬 서버 실행: npm start');
console.log('   2. PC와 모바일을 같은 WiFi에 연결');
console.log('   3. git add .env.production');
console.log('   4. git commit -m "feat: Configure local network API for testing"');
console.log('   5. git push origin main');
console.log('   6. GitHub Actions에서 새 APK 빌드');
console.log('   7. 새 APK 다운로드 및 설치\n');

console.log('⚠️  주의사항:');
console.log('   - PC와 모바일이 같은 WiFi에 연결되어 있어야 합니다');
console.log('   - 방화벽에서 5000 포트를 허용해야 할 수 있습니다');
console.log('   - PC가 꺼지면 앱이 작동하지 않습니다');
console.log('   - 프로덕션 배포에는 Railway URL을 사용하세요!\n');
