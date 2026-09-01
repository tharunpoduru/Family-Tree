/**
 * Renders public/favicon.svg into the PNG app icons (192px for
 * apple-touch-icon / Add-to-Home-Screen, 512px for anything larger).
 * Run after changing the favicon: npm run icons
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const pub = resolve(dirname(fileURLToPath(import.meta.url)), '../public');
const svg = readFileSync(resolve(pub, 'favicon.svg'));

for (const size of [192, 512]) {
  await sharp(svg, { density: (72 * size) / 64 })
    .resize(size, size)
    .png()
    .toFile(resolve(pub, `icon-${size}.png`));
  console.log(`icon-${size}.png written`);
}
