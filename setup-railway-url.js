const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('═══════════════════════════════════════════════════');
console.log('  부성스틸 HR 시스템 - Railway URL 설정');
console.log('═══════════════════════════════════════════════════\n');

console.log('📌 Railway 대시보드에서 URL을 확인하세요:');
console.log('   1. https://railway.com 접속');
console.log('   2. 프로젝트 선택');
console.log('   3. Settings → Domains 에서 URL 복사\n');

rl.question('🔗 Railway URL을 입력하세요 (예: https://bs-hr-system-production.up.railway.app): ', (railwayUrl) => {

  if (!railwayUrl || !railwayUrl.startsWith('http')) {
    console.log('\n❌ 올바른 URL을 입력해주세요.');
    rl.close();
    return;
  }

  // URL 끝의 슬래시 제거
  railwayUrl = railwayUrl.replace(/\/$/, '');

  console.log(`\n✅ Railway URL: ${railwayUrl}`);

  // .env.production 파일 생성
  const envContent = `# 프로덕션 환경 변수 (모바일 앱 빌드용)

# Railway 백엔드 API URL
REACT_APP_API_BASE_URL=${railwayUrl}/api

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

  console.log('📋 다음 단계:');
  console.log('   1. git add .env.production');
  console.log('   2. git commit -m "feat: Configure production API URL for mobile"');
  console.log('   3. git push origin main');
  console.log('   4. GitHub Actions에서 새 APK 빌드 (약 5분)');
  console.log('   5. 새 APK 다운로드 및 설치\n');

  console.log(`🌐 Railway 서버 테스트:`);
  console.log(`   브라우저에서 접속: ${railwayUrl}\n`);

  rl.close();
});
