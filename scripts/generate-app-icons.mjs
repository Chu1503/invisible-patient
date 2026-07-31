import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const iconsDir = path.join(root, "public", "icons");
const assetsDir = path.join(root, "assets");

await Promise.all([
  mkdir(iconsDir, { recursive: true }),
  mkdir(assetsDir, { recursive: true }),
]);

function iconSvg(size, inset = 0) {
  const safe = inset || Math.round(size * 0.08);
  const radius = Math.round(size * 0.2);
  const center = size / 2;
  const ringRadius = size * 0.225;
  const ringWidth = size * 0.095;
  const dotRadius = size * 0.062;

  return Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${radius}" fill="#002828"/>
      <rect x="${safe}" y="${safe}" width="${size - safe * 2}" height="${size - safe * 2}" rx="${radius - safe / 3}" fill="#003333"/>
      <circle cx="${center}" cy="${center}" r="${ringRadius}" fill="none" stroke="#FFD84D" stroke-width="${ringWidth}"/>
      <circle cx="${center}" cy="${center}" r="${dotRadius}" fill="#F9FAF7"/>
    </svg>
  `);
}

async function writeIcon(size, destination, inset = 0) {
  await sharp(iconSvg(size, inset)).png().toFile(destination);
}

await Promise.all([
  writeIcon(192, path.join(iconsDir, "icon-192.png")),
  writeIcon(512, path.join(iconsDir, "icon-512.png")),
  writeIcon(512, path.join(iconsDir, "icon-maskable-512.png"), 90),
  writeIcon(180, path.join(iconsDir, "apple-touch-icon.png")),
  writeIcon(1024, path.join(assetsDir, "icon-only.png")),
  writeIcon(1024, path.join(assetsDir, "icon-foreground.png"), 100),
]);

await sharp({
  create: {
    width: 1024,
    height: 1024,
    channels: 4,
    background: "#002828",
  },
})
  .png()
  .toFile(path.join(assetsDir, "icon-background.png"));

await sharp({
  create: {
    width: 2732,
    height: 2732,
    channels: 4,
    background: "#F9FAF7",
  },
})
  .composite([
    {
      input: iconSvg(720, 72),
      left: Math.round((2732 - 720) / 2),
      top: Math.round((2732 - 720) / 2),
    },
  ])
  .png()
  .toFile(path.join(assetsDir, "splash.png"));

await sharp({
  create: {
    width: 2732,
    height: 2732,
    channels: 4,
    background: "#002828",
  },
})
  .composite([
    {
      input: iconSvg(720, 72),
      left: Math.round((2732 - 720) / 2),
      top: Math.round((2732 - 720) / 2),
    },
  ])
  .png()
  .toFile(path.join(assetsDir, "splash-dark.png"));

console.log("Generated PWA and native app artwork.");
