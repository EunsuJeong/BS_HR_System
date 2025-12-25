const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════');
console.log('  직접 다운로드 링크 QR 코드 생성');
console.log('═══════════════════════════════════════════════════\n');

console.log('📋 APK 파일을 호스팅할 방법을 선택하세요:\n');
console.log('1. Google Drive');
console.log('   - APK 업로드 → 공유 → 링크 복사');
console.log('   - "링크가 있는 모든 사용자" 권한 설정\n');

console.log('2. Dropbox');
console.log('   - APK 업로드 → 공유 → 링크 복사');
console.log('   - dl=0을 dl=1로 변경 (직접 다운로드)\n');

console.log('3. WeTransfer');
console.log('   - wetransfer.com에서 파일 업로드');
console.log('   - 다운로드 링크 받기 (7일간 유효)\n');

console.log('4. GitHub Actions Artifacts (임시)');
console.log('   - 빌드마다 URL이 변경되므로 비추천\n');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('📥 APK 다운로드 URL을 입력하세요: ', (downloadUrl) => {

  if (!downloadUrl || !downloadUrl.startsWith('http')) {
    console.log('\n❌ 올바른 URL을 입력해주세요.');
    rl.close();
    return;
  }

  console.log(`\n✅ 다운로드 URL: ${downloadUrl}\n`);

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
  QRCode.toFile('bs-hr-direct-qr.png', downloadUrl, options, function(err) {
    if (err) {
      console.error('❌ QR 코드 생성 실패:', err);
      rl.close();
      return;
    }

    console.log('✅ QR 코드가 생성되었습니다!');
    console.log('📁 파일: bs-hr-direct-qr.png\n');
  });

  // SVG 파일
  QRCode.toFile('bs-hr-direct-qr.svg', downloadUrl, {
    ...options,
    type: 'svg'
  }, function(err) {
    if (!err) {
      console.log('✅ SVG 버전도 생성되었습니다!');
      console.log('📁 파일: bs-hr-direct-qr.svg\n');
    }
  });

  // 터미널 QR 코드
  QRCode.toString(downloadUrl, { type: 'terminal', small: true }, function(err, qrString) {
    if (!err) {
      console.log('📱 터미널 QR 코드:');
      console.log(qrString);
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
        .url-box {
            background: #f0f4ff;
            border-left: 4px solid #667eea;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            word-break: break-all;
            text-align: left;
        }
        .url-box strong { color: #667eea; }
        .url-box code {
            display: block;
            margin-top: 8px;
            padding: 10px;
            background: #e8eeff;
            border-radius: 4px;
            font-size: 13px;
            color: #555;
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
        .instructions ol { padding-left: 20px; }
        .instructions li { margin-bottom: 10px; }
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
        <p class="subtitle">모바일 앱 다운로드</p>

        <div class="qr-container">
            <img src="bs-hr-direct-qr.png" alt="QR Code" class="qr-code">
        </div>

        <div class="url-box">
            <strong>다운로드 URL:</strong>
            <code>${downloadUrl}</code>
        </div>

        <a href="${downloadUrl}" class="button">📥 직접 다운로드</a>
        <button class="button" onclick="window.print()">🖨️ 인쇄하기</button>

        <div class="instructions">
            <h3>📲 설치 방법</h3>
            <ol>
                <li><strong>QR 코드 스캔:</strong> Android 카메라로 위 QR 코드를 스캔하세요.</li>
                <li><strong>다운로드:</strong> 브라우저가 열리면 APK 다운로드를 승인하세요.</li>
                <li><strong>설치 권한:</strong> "알 수 없는 출처" 설치를 허용하세요.</li>
                <li><strong>앱 설치:</strong> APK 파일을 탭하여 설치하세요.</li>
                <li><strong>로그인:</strong> Railway 백엔드에 자동 연결됩니다.</li>
            </ol>
        </div>

        <div class="footer">
            <p>부성스틸 AI 인사관리 시스템 v1.0.0</p>
            <p>생성일: ${new Date().toLocaleDateString('ko-KR')}</p>
        </div>
    </div>
</body>
</html>`;

  fs.writeFileSync('bs-hr-direct-download.html', htmlContent);
  console.log('✅ 다운로드 페이지가 생성되었습니다!');
  console.log('📁 파일: bs-hr-direct-download.html\n');

  console.log('💡 사용 방법:');
  console.log('   1. bs-hr-direct-qr.png를 공유하거나 인쇄');
  console.log('   2. Android 기기에서 QR 코드 스캔');
  console.log('   3. APK 다운로드 및 설치\n');

  rl.close();
});
