const QRCode = require('qrcode');
const fs = require('fs');

console.log('═══════════════════════════════════════════════════');
console.log('  부성스틸 HR 시스템 v1.0.0 QR 코드 생성');
console.log('═══════════════════════════════════════════════════\n');

// v1.0.0 Release URL
const releaseUrl = 'https://github.com/EunsuJeong/BS_HR_System/releases/download/v1.0.0/app-debug.apk';

console.log('🔗 다운로드 URL:');
console.log(`   ${releaseUrl}\n`);
console.log('⚠️  이것은 v1.0.0 버전입니다 (BS 로고 미포함)\n');

// QR 코드 옵션
const options = {
  errorCorrectionLevel: 'H',
  type: 'image/png',
  quality: 0.95,
  margin: 4,
  width: 512,
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  }
};

console.log('🔄 QR 코드 생성 중...\n');

// PNG 파일
QRCode.toFile('bs-hr-v1.0.0-qr.png', releaseUrl, options, function(err) {
  if (err) {
    console.error('❌ QR 코드 생성 실패:', err);
    process.exit(1);
  }
  console.log('✅ PNG QR 코드 생성 완료!');
  console.log('📁 파일: bs-hr-v1.0.0-qr.png\n');
});

// 터미널 QR 코드
QRCode.toString(releaseUrl, { type: 'terminal', small: true }, function(err, qrString) {
  if (!err) {
    console.log('📱 터미널 QR 코드:');
    console.log(qrString);
  }
});

console.log('\n💡 참고: v1.0.0은 BS 로고가 없는 버전입니다.');
console.log('   BS 로고가 적용된 버전을 원하시면 v1.0.1 Release를 생성하세요.\n');
