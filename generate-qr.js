const QRCode = require('qrcode');
const fs = require('fs');

// APK 다운로드 URL 설정
// GitHub Release URL로 변경하세요
const apkUrl = 'https://github.com/EunsuJeong/BS_HR_System/releases/latest/download/app-debug.apk';

// QR 코드 생성 옵션
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

console.log('🔄 QR 코드 생성 중...');
console.log(`📱 APK URL: ${apkUrl}`);

// PNG 파일로 QR 코드 저장
QRCode.toFile('bs-hr-system-qr.png', apkUrl, options, function(err) {
  if (err) {
    console.error('❌ QR 코드 생성 실패:', err);
    process.exit(1);
  }

  console.log('✅ QR 코드가 성공적으로 생성되었습니다!');
  console.log('📁 파일 위치: bs-hr-system-qr.png');
  console.log('');
  console.log('📲 사용 방법:');
  console.log('1. Android 기기에서 카메라로 QR 코드 스캔');
  console.log('2. 다운로드 링크 탭');
  console.log('3. APK 설치');
});

// 터미널에 QR 코드 출력 (선택사항)
QRCode.toString(apkUrl, { type: 'terminal', small: true }, function(err, qrString) {
  if (!err) {
    console.log('');
    console.log('📱 터미널 QR 코드:');
    console.log(qrString);
  }
});

// SVG 파일도 생성 (벡터 이미지)
QRCode.toFile('bs-hr-system-qr.svg', apkUrl, {
  ...options,
  type: 'svg',
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  }
}, function(err) {
  if (!err) {
    console.log('✅ SVG QR 코드도 생성되었습니다!');
    console.log('📁 파일 위치: bs-hr-system-qr.svg');
  }
});

// HTML 파일 생성 (QR 코드 포함)
const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>부성스틸 HR 시스템 - APK 다운로드</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

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
            max-width: 500px;
            width: 100%;
            padding: 40px;
            text-align: center;
        }

        .logo {
            font-size: 64px;
            margin-bottom: 20px;
        }

        h1 {
            color: #333;
            font-size: 28px;
            margin-bottom: 10px;
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

        .download-url {
            background: #f0f4ff;
            border-left: 4px solid #667eea;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            word-break: break-all;
            text-align: left;
        }

        .download-url code {
            color: #667eea;
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

        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            color: #999;
            font-size: 14px;
        }

        .print-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 20px;
        }

        .print-button:hover {
            opacity: 0.9;
        }

        @media print {
            body {
                background: white;
            }
            .print-button {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">📱</div>
        <h1>부성스틸 HR 시스템</h1>
        <p class="subtitle">모바일 앱 다운로드</p>

        <div class="qr-container">
            <img src="bs-hr-system-qr.png" alt="QR Code" class="qr-code">
        </div>

        <div class="download-url">
            <strong>다운로드 URL:</strong><br>
            <code>${apkUrl}</code>
        </div>

        <div class="instructions">
            <h3>📲 설치 방법</h3>
            <ol>
                <li><strong>QR 코드 스캔:</strong> Android 기기의 카메라로 위 QR 코드를 스캔하세요.</li>
                <li><strong>다운로드:</strong> 브라우저가 열리면 APK 다운로드를 승인하세요.</li>
                <li><strong>설치 권한:</strong> "알 수 없는 출처" 설치를 허용하세요.</li>
                <li><strong>앱 설치:</strong> 다운로드된 APK를 탭하여 설치하세요.</li>
                <li><strong>실행:</strong> "BS HR System" 앱을 실행하세요.</li>
            </ol>
        </div>

        <button class="print-button" onclick="window.print()">🖨️ 인쇄하기</button>

        <div class="footer">
            <p>부성스틸 AI 인사관리 시스템 v1.0</p>
            <p>Generated: ${new Date().toLocaleDateString('ko-KR')}</p>
        </div>
    </div>
</body>
</html>`;

fs.writeFileSync('bs-hr-system-qr-download.html', htmlContent);
console.log('✅ 다운로드 페이지가 생성되었습니다!');
console.log('📁 파일 위치: bs-hr-system-qr-download.html');
console.log('');
console.log('💡 브라우저에서 열어서 QR 코드를 확인하거나 인쇄할 수 있습니다.');
