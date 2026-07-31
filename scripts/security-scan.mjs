import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([
  ".git",
  ".next",
  "node_modules",
  "coverage",
  "out",
  "build",
]);
const ignoredPathPrefixes = [
  ".capacitor-build/",
  "android/app/src/main/assets/public/",
  "artifacts/",
];
const ignoredExtensions = new Set([
  ".ico",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".woff",
  ".woff2",
  ".pdf",
]);

const rules = [
  ["Anthropic API key", /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g],
  ["OpenAI-style API key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g],
  ["GitHub token", /\b(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}\b/g],
  ["AWS access key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{30,}\b/g],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g],
  ["Private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ["JWT", /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g],
  [
    "Hardcoded credential assignment",
    /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password)\b\s*[:=]\s*["'`](?!\s*(?:replace_|example|your_|<|\$\{))[^\n"'`]{8,}["'`]/gi,
  ],
];

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    if (ignoredDirectories.has(entry)) continue;
    const absolute = join(directory, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) files.push(...walk(absolute));
    else files.push(absolute);
  }
  return files;
}

const findings = [];
for (const file of walk(root)) {
  const relativePath = relative(root, file).replaceAll("\\", "/");
  if (ignoredPathPrefixes.some((prefix) => relativePath.startsWith(prefix))) {
    continue;
  }
  const extension = extname(file).toLowerCase();
  if (ignoredExtensions.has(extension)) continue;
  if (/^\.env(?:\.|$)/.test(relativePath) && relativePath !== ".env.example") {
    continue;
  }

  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  for (const [name, pattern] of rules) {
    pattern.lastIndex = 0;
    for (const match of content.matchAll(pattern)) {
      const line = content.slice(0, match.index).split("\n").length;
      findings.push(`${relativePath}:${line} ${name}`);
    }
  }
}

try {
  const trackedFiles = execFileSync(
    "git",
    [
      "-c",
      `safe.directory=${resolve(root).replaceAll("\\", "/")}`,
      "ls-files",
    ],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
  )
    .split(/\r?\n/)
    .filter(Boolean);

  for (const file of trackedFiles) {
    if (/^\.env(?:\.|$)/.test(file) && file !== ".env.example") {
      findings.push(`${file}:1 tracked environment file`);
    }
  }
} catch {
  // The content scan still runs when Git metadata is unavailable.
}

if (findings.length) {
  console.error("Potential secrets detected:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Secret scan passed. No hardcoded credentials were detected.");
