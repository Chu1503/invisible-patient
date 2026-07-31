import { copyFile, mkdir, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const isWindows = process.platform === "win32";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
    ...options,
  });
  if (result.error) {
    console.error(result.error.message);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  throw new Error("Run this build through npm so the npm CLI can be located.");
}
run(process.execPath, [npmCli, "run", "mobile:web"]);
run(process.execPath, [
  path.join(root, "node_modules", "@capacitor", "cli", "dist", "index.js"),
  "sync",
  "android",
]);

const gradleCommand = isWindows
  ? path.join(root, "android", "gradlew.bat")
  : path.join(root, "android", "gradlew");
if (isWindows) {
  run("cmd.exe", ["/d", "/s", "/c", gradleCommand, "assembleDebug"], {
    cwd: path.join(root, "android"),
  });
} else {
  run(gradleCommand, ["assembleDebug"], {
    cwd: path.join(root, "android"),
  });
}

const source = path.join(
  root,
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "debug",
  "app-debug.apk"
);
await stat(source);

const artifacts = path.join(root, "artifacts");
await mkdir(artifacts, { recursive: true });
const destination = path.join(artifacts, "invisible-patient-debug.apk");
await copyFile(source, destination);
console.log(`APK created at ${destination}`);
