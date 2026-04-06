import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, "..");
const tscBin = join(repoRoot, "node_modules", "typescript", "bin", "tsc");

if (!existsSync(tscBin)) {
  console.error("Missing TypeScript compiler at node_modules/typescript/bin/tsc. Run npm install first.");
  process.exit(1);
}

const children = [];
let docsServer = null;
let restartTimer = null;
let pollTimer = null;
let lastFingerprint = "";

function startProcess(command, args, label) {
  const child = spawn(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env
  });

  children.push(child);

  child.on("exit", (code, signal) => {
    if (signal === "SIGTERM" || signal === "SIGINT") {
      return;
    }
    console.error(`${label} exited unexpectedly${code !== null ? ` with code ${code}` : ""}.`);
    shutdown(code ?? 1);
  });

  return child;
}

function startDocsServer() {
  docsServer = spawn(process.execPath, ["docs-site/dev.mjs"], {
    cwd: repoRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      HOST: process.env.HOST ?? "127.0.0.1",
      PORT: process.env.PORT ?? "4332",
      SITE_ORIGIN: process.env.SITE_ORIGIN ?? "http://127.0.0.1:4332"
    }
  });

  children.push(docsServer);

  docsServer.on("exit", (code, signal) => {
    if (signal === "SIGTERM" || signal === "SIGINT") {
      return;
    }
    console.error(`docs-site exited unexpectedly${code !== null ? ` with code ${code}` : ""}.`);
    shutdown(code ?? 1);
  });
}

function restartDocsServer() {
  if (restartTimer) {
    clearTimeout(restartTimer);
  }

  restartTimer = setTimeout(() => {
    restartTimer = null;

    if (!docsServer || docsServer.killed) {
      startDocsServer();
      return;
    }

    const current = docsServer;
    docsServer = null;
    current.once("exit", () => startDocsServer());
    current.kill("SIGTERM");
  }, 150);
}

function shutdown(exitCode = 0) {
  if (restartTimer) {
    clearTimeout(restartTimer);
  }
  if (pollTimer) {
    clearInterval(pollTimer);
  }
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
  process.exit(exitCode);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

async function fingerprintDirectory(rootDir) {
  if (!existsSync(rootDir)) {
    return "";
  }

  const entries = [];

  async function walk(currentDir, relativeDir = "") {
    const dirEntries = await readdir(currentDir, { withFileTypes: true });
    dirEntries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of dirEntries) {
      if (entry.name.startsWith(".")) {
        continue;
      }
      const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      const absolutePath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(absolutePath, relativePath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const details = await stat(absolutePath);
      entries.push(`${relativePath}:${details.mtimeMs}:${details.size}`);
    }
  }

  await walk(rootDir);
  return entries.join("|");
}

async function computeFingerprint() {
  const roots = ["docs", "docs-site/dist", "docs-site/public"];
  const snapshots = [];
  for (const relativePath of roots) {
    snapshots.push(`${relativePath}=>${await fingerprintDirectory(join(repoRoot, relativePath))}`);
  }
  return snapshots.join("||");
}

startProcess(process.execPath, [tscBin, "-b", "docs-site/tsconfig.json", "--watch", "--preserveWatchOutput"], "tsc");
startDocsServer();
lastFingerprint = await computeFingerprint();
pollTimer = setInterval(async () => {
  try {
    const nextFingerprint = await computeFingerprint();
    if (nextFingerprint !== lastFingerprint) {
      lastFingerprint = nextFingerprint;
      restartDocsServer();
    }
  } catch (error) {
    console.error("docs dev polling failed:", error);
    shutdown(1);
  }
}, 1000);
