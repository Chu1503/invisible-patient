import { copyFile, mkdir, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
const npxCommand = isWindows ? "npx.cmd" : "npx";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
    ...options,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(npmCommand, ["run", "mobile:web"]);
run(npxCommand, ["cap", "sync", "android"]);

const gradleCommand = isWindows
  ? path.join(root, "android", "gradlew.bat")
  : path.join(root, "android", "gradlew");
run(gradleCommand, ["assembleDebug"], {
  cwd: path.join(root, "android"),
});

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
