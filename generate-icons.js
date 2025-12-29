const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Sharp 패키지 확인 및 설치
try {
  require.resolve('sharp');
} catch (e) {
  console.log('Installing sharp...');
  execSync('npm install sharp', { stdio: 'inherit' });
}

const sharp = require('sharp');

const sizes = {
  'mipmap-ldpi': 36,
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192
};

const roundSizes = {
  'mipmap-ldpi': 42,
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192
};

const sourceLogo = 'public/logo192.png';
const baseDir = 'android/app/src/main/res';

async function generateIcons() {
  console.log('Generating Android app icons from:', sourceLogo);

  // 일반 아이콘 생성
  for (const [folder, size] of Object.entries(sizes)) {
    const dir = path.join(baseDir, folder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const outputPath = path.join(dir, 'ic_launcher.png');
    await sharp(sourceLogo)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(outputPath);
    console.log(`Created: ${outputPath} (${size}x${size})`);
  }

  // 라운드 아이콘 생성
  for (const [folder, size] of Object.entries(roundSizes)) {
    const dir = path.join(baseDir, folder);
    const outputPath = path.join(dir, 'ic_launcher_round.png');

    await sharp(sourceLogo)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(outputPath);
    console.log(`Created: ${outputPath} (${size}x${size})`);
  }

  console.log('\n✓ All icons generated successfully!');
}

generateIcons().catch(console.error);
