// ===============================================
// 🔐 Self-Signed SSL 인증서 생성 스크립트
// ===============================================

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pem = require('pem');
const fs = require('fs');

const sslDir = path.join(__dirname, '../ssl');

// ssl 디렉토리 생성
if (!fs.existsSync(sslDir)) {
  fs.mkdirSync(sslDir, { recursive: true });
  console.log('✅ ssl 디렉토리 생성됨');
}

console.log('🔐 Self-Signed SSL 인증서 생성 중...\n');

const domain = process.env.DDNS_DOMAIN || 'busung-hr.iptime.org';

// 인증서 생성 옵션
const options = {
  commonName: domain,
  country: 'KR',
  state: 'Seoul',
  locality: 'Seoul',
  organization: 'BusungSteel',
  days: 365,
  selfSigned: true
};

// 인증서 생성
pem.createCertificate(options, (err, keys) => {
  if (err) {
    console.error('❌ SSL 인증서 생성 실패:', err.message);
    process.exit(1);
  }
  
  try {
    // 파일 저장
    fs.writeFileSync(path.join(sslDir, 'private.key'), keys.serviceKey);
    fs.writeFileSync(path.join(sslDir, 'certificate.crt'), keys.certificate);
    
    console.log('✅ SSL 인증서 생성 완료!');
    console.log(`📁 위치: ${sslDir}`);
    console.log('   - private.key');
    console.log('   - certificate.crt\n');
    console.log(`📍 도메인: ${domain}`);
    console.log(`📍 유효기간: 365일\n`);
    console.log('⚠️  주의: Self-signed 인증서는 브라우저에서 경고가 표시됩니다.');
    console.log('   Chrome: "고급" → "안전하지 않음으로 이동" 클릭');
    console.log('   Firefox: "고급" → "위험을 감수하고 계속" 클릭\n');
    console.log('💡 프로덕션 환경에서는 Let\'s Encrypt 인증서를 사용하세요.\n');
  } catch (error) {
    console.error('❌ 파일 저장 실패:', error.message);
    process.exit(1);
  }
});
