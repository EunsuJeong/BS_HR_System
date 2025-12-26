const sharp = require('sharp');
const fs = require('fs');

console.log('🎨 favicon.ico 생성 중...');
console.log('📁 원본: public/logo192.png');

// logo192.png를 여러 크기로 변환하여 favicon.ico 생성
async function generateFavicon() {
  try {
    // 16x16, 32x32, 48x48 크기로 생성
    const sizes = [16, 32, 48];
    const pngBuffers = [];

    for (const size of sizes) {
      const buffer = await sharp('public/logo192.png')
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toBuffer();
      pngBuffers.push(buffer);
      console.log(`✅ ${size}x${size} 생성 완료`);
    }

    // ICO 파일 헤더 생성
    const iconDir = Buffer.alloc(6);
    iconDir.writeUInt16LE(0, 0); // Reserved
    iconDir.writeUInt16LE(1, 2); // Type (1 = ICO)
    iconDir.writeUInt16LE(sizes.length, 4); // Number of images

    const iconDirEntries = [];
    let imageDataOffset = 6 + (16 * sizes.length);

    for (let i = 0; i < sizes.length; i++) {
      const entry = Buffer.alloc(16);
      const size = sizes[i];
      const imageData = pngBuffers[i];

      entry.writeUInt8(size === 256 ? 0 : size, 0); // Width
      entry.writeUInt8(size === 256 ? 0 : size, 1); // Height
      entry.writeUInt8(0, 2); // Color palette
      entry.writeUInt8(0, 3); // Reserved
      entry.writeUInt16LE(1, 4); // Color planes
      entry.writeUInt16LE(32, 6); // Bits per pixel
      entry.writeUInt32LE(imageData.length, 8); // Image data size
      entry.writeUInt32LE(imageDataOffset, 12); // Image data offset

      iconDirEntries.push(entry);
      imageDataOffset += imageData.length;
    }

    // 최종 ICO 파일 생성
    const icoBuffer = Buffer.concat([
      iconDir,
      ...iconDirEntries,
      ...pngBuffers
    ]);

    fs.writeFileSync('public/favicon.ico', icoBuffer);

    console.log('\n✅ favicon.ico 생성 완료!');
    console.log('📁 저장 위치: public/favicon.ico');
    console.log(`📊 파일 크기: ${(icoBuffer.length / 1024).toFixed(2)} KB`);
    console.log('🎯 포함된 크기: 16x16, 32x32, 48x48');

  } catch (error) {
    console.error('❌ favicon.ico 생성 실패:', error);
    process.exit(1);
  }
}

generateFavicon();
