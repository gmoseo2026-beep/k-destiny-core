const fs = require('fs');
const path = require('path');
const sharp = require(path.join(process.cwd(), 'node_modules', 'sharp'));

async function removeBg(inputPath, outputPath, options = {}) {
  const image = sharp(inputPath);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const outData = Buffer.alloc(width * height * 4);

  const getCornerPixel = (x, y) => {
    const idx = (y * width + x) * channels;
    return [data[idx], data[idx + 1], data[idx + 2]];
  };

  const corners = [
    getCornerPixel(5, 5),
    getCornerPixel(width - 5, 5),
    getCornerPixel(5, height - 5),
    getCornerPixel(width - 5, height - 5)
  ];

  const bgR = Math.round(corners.reduce((s, c) => s + c[0], 0) / 4);
  const bgG = Math.round(corners.reduce((s, c) => s + c[1], 0) / 4);
  const bgB = Math.round(corners.reduce((s, c) => s + c[2], 0) / 4);

  const threshold = options.threshold || 26;
  const feather = options.feather || 18;

  for (let i = 0; i < width * height; i++) {
    const srcIdx = i * channels;
    const dstIdx = i * 4;

    const r = data[srcIdx];
    const g = data[srcIdx + 1];
    const b = data[srcIdx + 2];

    const dist = Math.sqrt(
      Math.pow(r - bgR, 2) +
      Math.pow(g - bgG, 2) +
      Math.pow(b - bgB, 2)
    );

    let alpha = 255;
    if (dist <= threshold) {
      alpha = 0;
    } else if (dist < threshold + feather) {
      alpha = Math.round(((dist - threshold) / feather) * 255);
    }

    outData[dstIdx] = r;
    outData[dstIdx + 1] = g;
    outData[dstIdx + 2] = b;
    outData[dstIdx + 3] = alpha;
  }

  await sharp(outData, {
    raw: { width, height, channels: 4 }
  }).png().toFile(outputPath);
}

const inPath = 'C:\\Users\\gmose\\.gemini\\antigravity-ide\\brain\\e5fbbbf2-6b39-41f8-a472-1da1458ee05a\\white_3d_cat_1787815191990.jpg';
const outPath = path.join(process.cwd(), 'public', 'mascot', 'transparent', 'doogeun_cat_canon_white.png');

removeBg(inPath, outPath).then(() => console.log('Done!')).catch(console.error);
