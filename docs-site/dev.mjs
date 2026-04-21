import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const docsSiteRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(docsSiteRoot);

function spawnChild(command, args, label) {
  const child = spawn(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      console.error(`[${label}] exited via signal ${signal}`);
      return;
    }
    if (code !== 0) {
      console.error(`[${label}] exited with code ${code}`);
    }
  });

  return child;
}

async function runInitialBuild() {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawnChild("bunx", ["tsc", "-p", "docs-site/tsconfig.json"], "docs-build");
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise(undefined);
        return;
      }
      rejectPromise(new Error(`Initial docs-site build failed with code ${code ?? 1}`));
    });
    child.on("error", rejectPromise);
  });
}

const children = new Set();

function registerChild(child) {
  children.add(child);
  child.on("exit", () => {
    children.delete(child);
  });
  return child;
}

function shutdown(code = 0) {
  for (const child of children) {
    child.kill("SIGTERM");
  }
  setTimeout(() => {
    for (const child of children) {
      child.kill("SIGKILL");
    }
    process.exit(code);
  }, 300).unref();
}

process.on("SIGINT", () => shutdown(130));
process.on("SIGTERM", () => shutdown(143));

try {
  await runInitialBuild();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const watch = registerChild(
  spawnChild("bunx", ["tsc", "-p", "docs-site/tsconfig.json", "--watch", "--preserveWatchOutput"], "docs-watch")
);
const server = registerChild(
  spawnChild("node", ["--watch", join(docsSiteRoot, "dist", "server.js")], "docs-server")
);

server.on("exit", (code) => {
  shutdown(typeof code === "number" ? code : 0);
});

watch.on("exit", (code) => {
  if (typeof code === "number" && code !== 0) {
    shutdown(code);
  }
});
