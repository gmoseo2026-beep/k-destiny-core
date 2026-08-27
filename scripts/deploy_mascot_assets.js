const fs = require('fs');
const path = require('path');
const sharp = require(path.join(process.cwd(), 'node_modules', 'sharp'));

const brainDir = 'C:\\Users\\gmose\\.gemini\\antigravity-ide\\brain\\7b81483b-55f3-4027-8e19-c0097cd4e416';
const publicDir = path.join(process.cwd(), 'public');
const mascotDir = path.join(publicDir, 'mascot');
const transDir = path.join(mascotDir, 'transparent');
const iconsDir = path.join(publicDir, 'icons');

fs.mkdirSync(transDir, { recursive: true });
fs.mkdirSync(iconsDir, { recursive: true });

const images = {
  canon: path.join(brainDir, 'mascot_option_a_doogeun_cat_1787795249910.jpg'),
  simkoong: path.join(brainDir, 'cat_expr_simkoong_1787795793793.jpg'),
  flame: path.join(brainDir, 'cat_expr_flame_1787795812851.jpg'),
  flutter: path.join(brainDir, 'cat_expr_flutter_1787795831337.jpg'),
  cringe: path.join(brainDir, 'cat_expr_cringe_1787795871892.jpg'),
  hyunta: path.join(brainDir, 'cat_expr_hyunta_1787795891368.jpg'),
  factattack: path.join(brainDir, 'cat_expr_factattack_1787795910788.jpg'),
  coupleClean: path.join(brainDir, 'cat_couple_clean_notext_1787796774234.jpg')
};

async function removeDarkBackground(inputPath, outputPath, options = {}) {
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

async function run() {
  console.log('1. Processing transparent PNGs...');
  await removeDarkBackground(images.canon, path.join(transDir, 'doogeun_cat_canon.png'));
  await removeDarkBackground(images.simkoong, path.join(transDir, 'expr_1_simkoong.png'));
  await removeDarkBackground(images.flame, path.join(transDir, 'expr_2_flame.png'));
  await removeDarkBackground(images.flutter, path.join(transDir, 'expr_3_flutter.png'));
  await removeDarkBackground(images.cringe, path.join(transDir, 'expr_4_cringe.png'));
  await removeDarkBackground(images.hyunta, path.join(transDir, 'expr_5_hyunta.png'));
  await removeDarkBackground(images.factattack, path.join(transDir, 'expr_6_factattack.png'));
  
  // Clean couple cut (No text)
  await removeDarkBackground(images.coupleClean, path.join(transDir, 'couple_red_thread.png'), { threshold: 24, feather: 16 });
  
  // Also copy main mascots to public/mascot/ for direct standard usage
  const canonPng = path.join(transDir, 'doogeun_cat_canon.png');
  await sharp(canonPng).resize(256, 256).png().toFile(path.join(mascotDir, 'kongdak-mascot-256.png'));
  await sharp(canonPng).resize(512, 512).png().toFile(path.join(mascotDir, 'kongdak-mascot-512.png'));
  fs.copyFileSync(path.join(transDir, 'couple_red_thread.png'), path.join(mascotDir, 'couple_red_thread.png'));

  console.log('2. Generating icons and favicon in public/...');
  await sharp(canonPng).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192.png'));
  await sharp(canonPng).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512.png'));
  await sharp(canonPng).resize(180, 180).png().toFile(path.join(iconsDir, 'apple-touch-icon-180.png'));

  // Favicon ICO file
  const icoPng16 = await sharp(canonPng).resize(16, 16).png().toBuffer();
  const icoPng32 = await sharp(canonPng).resize(32, 32).png().toBuffer();
  const icoPng48 = await sharp(canonPng).resize(48, 48).png().toBuffer();

  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0);
  icoHeader.writeUInt16LE(1, 2);
  icoHeader.writeUInt16LE(3, 4);

  const entries = [
    { w: 16, h: 16, buf: icoPng16 },
    { w: 32, h: 32, buf: icoPng32 },
    { w: 48, h: 48, buf: icoPng48 }
  ];

  let offset = 6 + (16 * entries.length);
  const entryBuffers = [];
  for (const e of entries) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(e.w, 0);
    entry.writeUInt8(e.h, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(e.buf.length, 8);
    entry.writeUInt32LE(offset, 12);
    entryBuffers.push(entry);
    offset += e.buf.length;
  }

  const icoBuffer = Buffer.concat([icoHeader, ...entryBuffers, ...entries.map(e => e.buf)]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);

  console.log('3. Generating public/og-image.jpg (1200x630)...');
  const coupleBuffer = await sharp(images.coupleClean).resize(520, 520).toBuffer();
  const ogSvgOverlay = Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1E1624" />
          <stop offset="50%" stop-color="#2B2430" />
          <stop offset="100%" stop-color="#4A1F3D" />
        </linearGradient>
        <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#FF8AA1" />
          <stop offset="50%" stop-color="#FF5C77" />
          <stop offset="100%" stop-color="#FFC24B" />
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bgGrad)" />
      
      <!-- Brand Pill -->
      <rect x="80" y="110" width="130" height="40" rx="20" fill="rgba(255,92,119,0.15)" stroke="#FF5C77" stroke-width="1.5" />
      <text x="145" y="136" font-family="-apple-system, sans-serif" font-size="18" font-weight="bold" fill="#FF5C77" text-anchor="middle">콩닥 KONGDAK</text>
      
      <!-- Headline Copy -->
      <text x="80" y="240" font-family="-apple-system, 'Pretendard', sans-serif" font-size="56" font-weight="900" fill="#FFF6F1" letter-spacing="-1">우리, 얼마나</text>
      <text x="80" y="325" font-family="-apple-system, 'Pretendard', sans-serif" font-size="64" font-weight="900" fill="url(#textGrad)" letter-spacing="-1">잘 맞을까? ✨</text>
      
      <!-- Subcopy -->
      <text x="80" y="415" font-family="-apple-system, 'Pretendard', sans-serif" font-size="24" fill="#C7C2D0">생년월일로 30초 만에 보는 운명의 사주 궁합</text>
      
      <!-- Footer Badge -->
      <text x="80" y="520" font-family="-apple-system, sans-serif" font-size="20" font-weight="bold" fill="#FFC24B">kongdak.kr 💖</text>
    </svg>
  `);

  await sharp(ogSvgOverlay)
    .composite([
      { input: coupleBuffer, left: 630, top: 55 }
    ])
    .jpeg({ quality: 95 })
    .toFile(path.join(publicDir, 'og-image.jpg'));

  console.log('Mascot deployment complete!');
}

run().catch(err => {
  console.error('Error during mascot deployment:', err);
  process.exit(1);
});
