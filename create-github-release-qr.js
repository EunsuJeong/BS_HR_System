const QRCode = require('qrcode');
const fs = require('fs');

console.log('═══════════════════════════════════════════════════');
console.log('  GitHub Release QR 코드 생성');
console.log('═══════════════════════════════════════════════════\n');

console.log('⚠️  먼저 GitHub Release를 생성해야 합니다!\n');

console.log('📋 GitHub Release 생성 방법:');
console.log('   1. https://github.com/EunsuJeong/BS_HR_System/releases/new');
console.log('   2. Tag: v1.0.0');
console.log('   3. Title: 부성스틸 HR 시스템 v1.0.0');
console.log('   4. GitHub Actions에서 다운로드한 app-debug.apk 업로드');
console.log('   5. "Publish release" 클릭\n');

console.log('📥 APK 다운로드 위치:');
console.log('   https://github.com/EunsuJeong/BS_HR_System/actions');
console.log('   → 최신 워크플로우 → Artifacts → bs-hr-system-debug\n');

// Release URL
const releaseUrl = 'https://github.com/EunsuJeong/BS_HR_System/releases/download/v1.0.0/app-debug.apk';

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

console.log('🔄 GitHub Release QR 코드 생성 중...\n');

// PNG 파일
QRCode.toFile('bs-hr-release-qr.png', releaseUrl, options, function(err) {
  if (err) {
    console.error('❌ QR 코드 생성 실패:', err);
    process.exit(1);
  }

  console.log('✅ QR 코드가 생성되었습니다!');
  console.log('📁 파일: bs-hr-release-qr.png');
  console.log(`🔗 URL: ${releaseUrl}\n`);
});

// SVG 파일
QRCode.toFile('bs-hr-release-qr.svg', releaseUrl, {
  ...options,
  type: 'svg'
}, function(err) {
  if (!err) {
    console.log('✅ SVG 버전도 생성되었습니다!');
    console.log('📁 파일: bs-hr-release-qr.svg\n');
  }
});

// HTML 페이지
const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>부성스틸 HR 시스템 - APK 다운로드</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 600px;
            width: 100%;
            padding: 40px;
            text-align: center;
        }
        .logo { font-size: 64px; margin-bottom: 20px; }
        h1 { color: #333; font-size: 28px; margin-bottom: 10px; }
        .subtitle { color: #666; font-size: 16px; margin-bottom: 30px; }
        .version {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 14px;
            margin-bottom: 20px;
        }
        .qr-container {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
        }
        .qr-code {
            max-width: 100%;
            height: auto;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        .info-box {
            background: #f0f4ff;
            border-left: 4px solid #667eea;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: left;
        }
        .info-box h3 {
            color: #667eea;
            margin-bottom: 10px;
            font-size: 18px;
        }
        .info-box p {
            color: #555;
            line-height: 1.6;
            margin-bottom: 10px;
        }
        .info-box code {
            background: #e8eeff;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 13px;
            color: #667eea;
        }
        .instructions {
            text-align: left;
            color: #555;
            line-height: 1.8;
        }
        .instructions h3 {
            color: #667eea;
            margin-bottom: 15px;
            font-size: 18px;
        }
        .instructions ol {
            padding-left: 20px;
        }
        .instructions li {
            margin-bottom: 10px;
        }
        .button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            margin: 10px 5px;
            text-decoration: none;
            display: inline-block;
        }
        .button:hover {
            opacity: 0.9;
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            color: #999;
            font-size: 14px;
        }
        @media print {
            body { background: white; }
            .button { display: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">📱</div>
        <h1>부성스틸 HR 시스템</h1>
        <div class="version">v1.0.0</div>
        <p class="subtitle">모바일 앱 다운로드</p>

        <div class="qr-container">
            <img src="bs-hr-release-qr.png" alt="QR Code" class="qr-code">
        </div>

        <div class="info-box">
            <h3>🔗 다운로드 정보</h3>
            <p><strong>버전:</strong> v1.0.0 (Railway 연결)</p>
            <p><strong>백엔드:</strong> <code>https://bshrsystem-production.up.railway.app</code></p>
            <p><strong>파일 크기:</strong> 약 800KB</p>
            <p><strong>최소 요구사항:</strong> Android 7.0 (API 24) 이상</p>
        </div>

        <a href="${releaseUrl}" class="button">📥 직접 다운로드</a>
        <button class="button" onclick="window.print()">🖨️ 인쇄하기</button>

        <div class="instructions">
            <h3>📲 설치 방법</h3>
            <ol>
                <li><strong>QR 코드 스캔:</strong> Android 카메라로 위 QR 코드를 스캔하세요.</li>
                <li><strong>다운로드:</strong> 브라우저가 열리면 APK 다운로드를 승인하세요.</li>
                <li><strong>설치 권한:</strong> "알 수 없는 출처" 설치를 허용하세요.</li>
                <li><strong>앱 설치:</strong> APK 파일을 탭하여 설치하세요.</li>
                <li><strong>로그인:</strong> 관리자 계정으로 로그인하세요.</li>
            </ol>
        </div>

        <div class="footer">
            <p>부성스틸 AI 인사관리 시스템 v1.0.0</p>
            <p>Railway 백엔드 연결 ✅ | 생성일: ${new Date().toLocaleDateString('ko-KR')}</p>
        </div>
    </div>
</body>
</html>`;

fs.writeFileSync('bs-hr-release-download.html', htmlContent);
console.log('✅ 다운로드 페이지가 생성되었습니다!');
console.log('📁 파일: bs-hr-release-download.html\n');

console.log('⚠️  중요: 이 QR 코드를 사용하기 전에 GitHub Release를 먼저 생성하세요!');
console.log('   Release가 없으면 QR 코드가 작동하지 않습니다.\n');
