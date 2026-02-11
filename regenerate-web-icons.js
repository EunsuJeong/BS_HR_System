/**
 * logo512.png를 기반으로 웹 아이콘 재생성
 * icon-48.webp, icon-72.webp, icon-96.webp 등을 생성
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// 고화질 원본 이미지 사용 (512x512)
const sourceImage = 'public/logo512.png';

const sizes = [48, 72, 96, 128, 192, 256, 512];
const outputDirs = ['public/icons', 'icons'];

async function regenerateIcons() {
  console.log('🎨 웹 아이콘 재생성 시작...');
  console.log(`📁 원본 이미지: ${sourceImage}\n`);

  if (!fs.existsSync(sourceImage)) {
    console.error(`❌ 원본 이미지를 찾을 수 없습니다: ${sourceImage}`);
    console.log('💡 public/logo192.png 파일이 있는지 확인하세요.');
    process.exit(1);
  }

  // 출력 디렉토리 생성
  for (const dir of outputDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 디렉토리 생성: ${dir}`);
    }
  }

  console.log('');

  // 각 크기별 아이콘 생성
  for (const size of sizes) {
    for (const dir of outputDirs) {
      const outputPath = path.join(dir, `icon-${size}.webp`);
      
      try {
        await sharp(sourceImage)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .webp({ quality: 90 })
          .toFile(outputPath);
        
        const stats = fs.statSync(outputPath);
        console.log(`✅ ${outputPath} (${size}x${size}, ${(stats.size / 1024).toFixed(2)} KB)`);
      } catch (error) {
        console.error(`❌ ${outputPath} 생성 실패:`, error.message);
      }
    }
  }

  console.log('\n✅ 모든 웹 아이콘 재생성 완료!');
  console.log('📊 생성된 크기: 48, 72, 96, 128, 192, 256, 512');
  console.log('📁 저장 위치: public/icons/, icons/');
}

regenerateIcons().catch(console.error);
