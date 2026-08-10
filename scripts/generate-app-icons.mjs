import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const appDir = path.join(root, "app");
const iconsDir = path.join(root, "public", "icons");
const assetsDir = path.join(root, "assets");
const androidResDir = path.join(
  root,
  "android",
  "app",
  "src",
  "main",
  "res"
);
// This full-canvas master is generated at high resolution and includes its own
// dark green backdrop, yellow body, and local halo glow.
const sourcePath = path.join(assetsDir, "logo-master.png");
const ink = "#042A2F";
// Android adaptive icons are 108dp square, but only the centered 66dp safe
// zone is guaranteed not to be clipped by a launcher mask. Scaling this master
// to 92% keeps its ~58% tall artwork within ~53.4% of the full layer, or about
// 57.7dp, leaving roughly 4dp of reserve inside the official safe zone.
const adaptiveIconScale = 0.92;
const launcherIconScale = 0.96;
const adaptiveCanvasSizes = {
  ldpi: 81,
  mdpi: 108,
  hdpi: 162,
  xhdpi: 216,
  xxhdpi: 324,
  xxxhdpi: 432,
};

await Promise.all([
  mkdir(appDir, { recursive: true }),
  mkdir(iconsDir, { recursive: true }),
  mkdir(assetsDir, { recursive: true }),
]);

const canonicalMark = await sharp(sourcePath)
  .resize(1024, 1024, { fit: "cover", position: "centre" })
  .png()
  .toBuffer();

async function resizedMark(size) {
  return sharp(canonicalMark)
    .resize(size, size, { fit: "fill" })
    .png()
    .toBuffer();
}

async function squareIcon(size, options = {}) {
  const {
    background = ink,
    markScale = 1,
    transparent = false,
  } = options;
  const markSize = Math.max(1, Math.round(size * markScale));
  const offset = Math.round((size - markSize) / 2);

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: transparent
        ? { r: 0, g: 0, b: 0, alpha: 0 }
        : background,
    },
  })
    .composite([{ input: await resizedMark(markSize), left: offset, top: offset }])
    .png()
    .toBuffer();
}

async function splash(width, height, background) {
  const markSize = Math.max(1, Math.round(Math.min(width, height) * 0.36));
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background,
    },
  })
    .composite([
      {
        input: await resizedMark(markSize),
        left: Math.round((width - markSize) / 2),
        top: Math.round((height - markSize) / 2),
      },
    ])
    .png()
    .toBuffer();
}

function pngIco(png) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header[6] = 0;
  header[7] = 0;
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(header.length, 18);
  return Buffer.concat([header, png]);
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const location = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(location)));
    if (entry.isFile()) files.push(location);
  }
  return files;
}

function adaptiveCanvasSize(filePath, fallback) {
  const qualifier = path.basename(path.dirname(filePath)).match(/^mipmap-(.+)$/)?.[1];
  return (qualifier && adaptiveCanvasSizes[qualifier]) || fallback;
}

const icon192 = await squareIcon(192);
const icon512 = await squareIcon(512);
const appleIcon = await squareIcon(180);
const maskableIcon = await squareIcon(512);
const faviconPng = await squareIcon(256);

await Promise.all([
  writeFile(path.join(iconsDir, "icon-192.png"), icon192),
  writeFile(path.join(iconsDir, "icon-512.png"), icon512),
  writeFile(path.join(iconsDir, "icon-maskable-512.png"), maskableIcon),
  writeFile(path.join(iconsDir, "apple-touch-icon.png"), appleIcon),
  writeFile(path.join(appDir, "favicon.ico"), pngIco(faviconPng)),
  writeFile(
    path.join(root, "public", "invisible-patient-logo.png"),
    canonicalMark
  ),
  writeFile(path.join(assetsDir, "icon-only.png"), await squareIcon(1024)),
  writeFile(
    path.join(assetsDir, "icon-foreground.png"),
    await squareIcon(1024)
  ),
  writeFile(
    path.join(assetsDir, "icon-background.png"),
    await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: ink,
      },
    })
      .png()
      .toBuffer()
  ),
  writeFile(path.join(assetsDir, "splash.png"), await splash(2732, 2732, ink)),
  writeFile(
    path.join(assetsDir, "splash-dark.png"),
    await splash(2732, 2732, ink)
  ),
]);

const androidArtwork = (await walk(androidResDir)).filter((file) =>
  /(?:splash|ic_launcher(?:_background|_foreground|_round)?)\.png$/i.test(file)
);

await Promise.all(
  androidArtwork.map(async (file) => {
    const metadata = await sharp(file).metadata();
    const width = metadata.width;
    const height = metadata.height;
    if (!width || !height) return;

    const name = path.basename(file).toLowerCase();
    if (name === "splash.png") {
      await writeFile(file, await splash(width, height, ink));
      return;
    }

    if (name === "ic_launcher_background.png") {
      await sharp({
        create: { width, height, channels: 4, background: ink },
      })
        .png()
        .toFile(file);
      return;
    }

    if (name === "ic_launcher_foreground.png") {
      const canvas = adaptiveCanvasSize(file, width);
      await writeFile(
        file,
        await squareIcon(canvas, { markScale: adaptiveIconScale })
      );
      return;
    }

    await writeFile(file, await squareIcon(width, { markScale: launcherIconScale }));
  })
);

console.log(
  `Generated cropped web, PWA, favicon, splash, and Android artwork from ${path.relative(
    root,
    sourcePath
  )}.`
);
