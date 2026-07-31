import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const stage = path.join(root, ".capacitor-build");
const apiBase = process.env.MOBILE_API_BASE_URL?.trim().replace(/\/+$/, "");

if (!apiBase) {
  console.error(
    "MOBILE_API_BASE_URL is required. Set it to the deployed HTTPS website origin in .env.local."
  );
  process.exit(1);
}

let parsedApiBase;
try {
  parsedApiBase = new URL(apiBase);
} catch {
  console.error("MOBILE_API_BASE_URL must be a valid absolute URL.");
  process.exit(1);
}

if (parsedApiBase.protocol !== "https:") {
  console.error("MOBILE_API_BASE_URL must use HTTPS for a phone build.");
  process.exit(1);
}

if (!stage.startsWith(`${root}${path.sep}`)) {
  throw new Error("Refusing to prepare a mobile build outside the project.");
}

await rm(stage, { recursive: true, force: true });
await mkdir(stage, { recursive: true });

for (const directory of ["app", "components", "hooks", "lib", "public"]) {
  const source = path.join(root, directory);
  const destination = path.join(stage, directory);
  await cp(source, destination, {
    recursive: true,
    filter(sourcePath) {
      return ![
        path.join(root, "app", "api"),
        path.join(root, "app", "auth"),
      ].some((excludedPath) => sourcePath.startsWith(excludedPath));
    },
  });
}

for (const file of [
  "next-env.d.ts",
  "package.json",
  "postcss.config.mjs",
  "tsconfig.json",
]) {
  await cp(path.join(root, file), path.join(stage, file));
}

const stageTsconfigPath = path.join(stage, "tsconfig.json");
const stageTsconfig = JSON.parse(await readFile(stageTsconfigPath, "utf8"));
stageTsconfig.compilerOptions ??= {};
stageTsconfig.compilerOptions.incremental = false;
stageTsconfig.include = [
  "next-env.d.ts",
  "**/*.ts",
  "**/*.tsx",
  ".next/types/**/*.ts",
  "**/*.mts",
];
await writeFile(stageTsconfigPath, `${JSON.stringify(stageTsconfig, null, 2)}\n`);

await writeFile(
  path.join(stage, "next.config.mjs"),
  `const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default nextConfig;
`
);

const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
const result = spawnSync(process.execPath, [nextCli, "build", stage], {
  cwd: root,
  env: {
    ...process.env,
    NEXT_PUBLIC_API_BASE_URL: apiBase,
    NEXT_TELEMETRY_DISABLED: "1",
  },
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`Mobile web bundle created for ${parsedApiBase.origin}.`);
