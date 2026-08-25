const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF8AA1" />
      <stop offset="50%" stop-color="#FF5C77" />
      <stop offset="100%" stop-color="#6A2C70" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="#FFF6F1" />
  <path d="M256 410.5 l-24.7-22.5 C143.7 308.5 86 256.3 86 191 c0-53.2 41.5-95 95-95 c30.6 0 59.9 14.5 75 37.6 c15.1-23.1 44.4-37.6 75-37.6 c53.5 0 95 41.8 95 95 c0 65.3-57.7 117.5-145.3 197.5 L256 410.5z" fill="url(#grad)" />
</svg>
`;

async function main() {
  const appDir = path.join(__dirname, '..', 'app');
  
  // Write SVG
  fs.writeFileSync(path.join(appDir, 'icon.svg'), svg.trim());
  
  const buffer = Buffer.from(svg.trim());
  
  // Generate icon.png (512x512)
  await sharp(buffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(appDir, 'icon.png'));
    
  // Generate apple-icon.png (180x180)
  await sharp(buffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(appDir, 'apple-icon.png'));
    
  // Generate favicon.ico (32x32)
  // Sharp doesn't support .ico natively, but we can generate a 32x32 png and rename it (browsers support it)
  // Or we can just let Next.js use icon.svg/icon.png and delete favicon.ico
  fs.rmSync(path.join(appDir, 'favicon.ico'), { force: true });
  
  console.log('Icons generated successfully.');
}

main().catch(console.error);
