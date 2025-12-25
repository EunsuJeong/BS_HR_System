const QRCode = require('qrcode');
const fs = require('fs');

console.log('═══════════════════════════════════════════════════');
console.log('  부성스틸 HR 시스템 v1.0.2 QR 코드 생성');
console.log('═══════════════════════════════════════════════════\n');

// v1.0.2 Release URL
const releaseUrl = 'https://github.com/EunsuJeong/BS_HR_System/releases/download/v1.0.2/app-debug.apk';

console.log('🔗 다운로드 URL:');
console.log(`   ${releaseUrl}\n`);
console.log('✨ v1.0.2: 파비콘(브라우저 아이콘) BS 로고 적용\n');

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
QRCode.toFile('bs-hr-v1.0.2-qr.png', releaseUrl, options, function(err) {
  if (err) {
    console.error('❌ QR 코드 생성 실패:', err);
    process.exit(1);
  }

  console.log('✅ PNG QR 코드 생성 완료!');
  console.log('📁 파일: bs-hr-v1.0.2-qr.png\n');
});

// SVG 파일
QRCode.toFile('bs-hr-v1.0.2-qr.svg', releaseUrl, {
  ...options,
  type: 'svg'
}, function(err) {
  if (!err) {
    console.log('✅ SVG QR 코드 생성 완료!');
    console.log('📁 파일: bs-hr-v1.0.2-qr.svg\n');
  }
});

// 터미널 QR 코드
QRCode.toString(releaseUrl, { type: 'terminal', small: true }, function(err, qrString) {
  if (!err) {
    console.log('📱 터미널 QR 코드:');
    console.log(qrString);
  }
});

// HTML 다운로드 페이지
const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>부성스틸 HR 시스템 v1.0.2 - APK 다운로드</title>
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
        .logo {
            width: 120px;
            height: 120px;
            margin: 0 auto 20px;
            background: #000;
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            color: #FFD700;
            font-weight: bold;
        }
        h1 {
            color: #333;
            font-size: 28px;
            margin-bottom: 10px;
        }
        .version {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 14px;
            margin-bottom: 10px;
            font-weight: 600;
        }
        .new-badge {
            display: inline-block;
            background: #ff6b6b;
            color: white;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 12px;
            margin-left: 5px;
            font-weight: 600;
        }
        .subtitle {
            color: #666;
            font-size: 16px;
            margin-bottom: 30px;
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
        .features {
            background: #f0f4ff;
            border-left: 4px solid #667eea;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: left;
        }
        .features h3 {
            color: #667eea;
            margin-bottom: 15px;
            font-size: 18px;
        }
        .features ul {
            list-style: none;
            padding: 0;
        }
        .features li {
            padding: 8px 0;
            color: #555;
            display: flex;
            align-items: center;
        }
        .features li:before {
            content: "✅";
            margin-right: 10px;
        }
        .info-box {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: left;
        }
        .info-box strong {
            color: #856404;
        }
        .info-box p {
            color: #856404;
            margin-top: 5px;
            font-size: 14px;
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
            transition: all 0.3s;
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
        <div class="logo">BS</div>
        <h1>부성스틸 HR 시스템</h1>
        <div class="version">v1.0.2 <span class="new-badge">UPDATE</span></div>
        <p class="subtitle">모바일 앱 다운로드</p>

        <div class="qr-container">
            <img src="bs-hr-v1.0.2-qr.png" alt="QR Code v1.0.2" class="qr-code">
        </div>

        <div class="features">
            <h3>🎨 v1.0.2 업데이트</h3>
            <ul>
                <li>브라우저 파비콘(탭 아이콘) BS 로고 적용</li>
                <li>테마 컬러를 BS 브랜드 컬러로 변경</li>
                <li>여러 해상도의 파비콘 지원</li>
                <li>PWA 설치 시 BS 로고 표시</li>
            </ul>
        </div>

        <div class="info-box">
            <strong>📱 업데이트 방법</strong>
            <p>이전 버전을 제거하고 새 APK를 설치하세요.</p>
        </div>

        <a href="${releaseUrl}" class="button">📥 직접 다운로드</a>
        <button class="button" onclick="window.print()">🖨️ 인쇄하기</button>

        <div class="instructions">
            <h3>📲 설치 방법</h3>
            <ol>
                <li><strong>QR 코드 스캔:</strong> Android 카메라로 위 QR 코드를 스캔하세요.</li>
                <li><strong>이전 버전 제거:</strong> 기존 앱을 완전히 제거하세요.</li>
                <li><strong>다운로드:</strong> 브라우저가 열리면 APK 다운로드를 승인하세요.</li>
                <li><strong>설치:</strong> APK 파일을 탭하여 설치하세요.</li>
                <li><strong>로그인:</strong> Railway 백엔드에 자동 연결됩니다.</li>
            </ol>
        </div>

        <div class="footer">
            <p>부성스틸 AI 인사관리 시스템 v1.0.2</p>
            <p>파비콘 업데이트 | 생성일: ${new Date().toLocaleDateString('ko-KR')}</p>
            <p>Railway 백엔드: https://bshrsystem-production.up.railway.app</p>
        </div>
    </div>
</body>
</html>`;

fs.writeFileSync('bs-hr-v1.0.2-download.html', htmlContent);
console.log('✅ 다운로드 페이지 생성 완료!');
console.log('📁 파일: bs-hr-v1.0.2-download.html\n');

console.log('💡 사용 방법:');
console.log('   1. bs-hr-v1.0.2-qr.png를 공유하거나 인쇄');
console.log('   2. Android 기기에서 QR 코드 스캔');
console.log('   3. v1.0.2 APK 다운로드 및 설치\n');

console.log('🎉 v1.0.2 QR 코드 생성 완료!');
