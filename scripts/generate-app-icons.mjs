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
const sourcePath = path.join(assetsDir, "logo-source.png");
const paper = "#F9FAF7";
const ink = "#002828";

await Promise.all([
  mkdir(appDir, { recursive: true }),
  mkdir(iconsDir, { recursive: true }),
  mkdir(assetsDir, { recursive: true }),
]);

const trimmed = await sharp(sourcePath)
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer({ resolveWithObject: true });
const cropMargin = Math.round(
  Math.max(trimmed.info.width, trimmed.info.height) * 0.06
);
const cropSize =
  Math.max(trimmed.info.width, trimmed.info.height) + cropMargin * 2;
const horizontalSpace = cropSize - trimmed.info.width;
const verticalSpace = cropSize - trimmed.info.height;

const squaredMark = await sharp(trimmed.data)
  .extend({
    left: Math.floor(horizontalSpace / 2),
    right: Math.ceil(horizontalSpace / 2),
    top: Math.floor(verticalSpace / 2),
    bottom: Math.ceil(verticalSpace / 2),
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

const canonicalMark = await sharp(squaredMark)
  .resize(1024, 1024, { fit: "fill" })
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
    background = paper,
    markScale = 0.94,
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

const icon192 = await squareIcon(192);
const icon512 = await squareIcon(512);
const appleIcon = await squareIcon(180);
const maskableIcon = await squareIcon(512, { markScale: 0.76 });
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
    await squareIcon(1024, { markScale: 0.72, transparent: true })
  ),
  writeFile(
    path.join(assetsDir, "icon-background.png"),
    await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: paper,
      },
    })
      .png()
      .toBuffer()
  ),
  writeFile(path.join(assetsDir, "splash.png"), await splash(2732, 2732, paper)),
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
      const background = file.toLowerCase().includes("night") ? ink : paper;
      await writeFile(file, await splash(width, height, background));
      return;
    }

    if (name === "ic_launcher_background.png") {
      await sharp({
        create: { width, height, channels: 4, background: paper },
      })
        .png()
        .toFile(file);
      return;
    }

    if (name === "ic_launcher_foreground.png") {
      await writeFile(
        file,
        await squareIcon(width, { markScale: 0.72, transparent: true })
      );
      return;
    }

    await writeFile(file, await squareIcon(width));
  })
);

console.log(
  `Generated cropped web, PWA, favicon, splash, and Android artwork from ${path.relative(
    root,
    sourcePath
  )}.`
);
