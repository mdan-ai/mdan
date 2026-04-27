import { mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";

const isWatch = process.argv.includes("--watch");
const browserOutputDir = "dist-browser";

const outputs = [
  {
    entry: "src/surface/index.ts",
    outfile: "dist-browser/surface.js"
  },
  {
    entry: "src/frontend/bootstrap.ts",
    outfile: "dist-browser/entry.js"
  },
  {
    entry: "src/frontend/index.ts",
    outfile: "dist-browser/frontend.js"
  }
];

async function ensureDirectories() {
  await rm(resolve(browserOutputDir), { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  for (const output of outputs) {
    await mkdir(dirname(resolve(output.outfile)), { recursive: true });
  }
}

function runBuild(output) {
  return new Promise((resolvePromise, rejectPromise) => {
    const args = [
      "build",
      "--target=browser",
      "--format=esm",
      "--outfile",
      output.outfile,
      output.entry
    ];
    if (isWatch) {
      args.splice(1, 0, "--watch", "--no-clear-screen");
    }

    const child = spawn("bun", args, {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env
    });

    child.on("error", rejectPromise);

    if (isWatch) {
      resolvePromise(child);
      return;
    }

    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise(undefined);
        return;
      }
      rejectPromise(new Error(`Browser bundle build failed for ${output.entry} with code ${code ?? 1}`));
    });
  });
}

await ensureDirectories();

if (!isWatch) {
  for (const output of outputs) {
    await runBuild(output);
  }
  process.exit(0);
}

const children = [];

for (const output of outputs) {
  children.push(await runBuild(output));
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

for (const child of children) {
  child.on("exit", (code) => {
    if (typeof code === "number" && code !== 0) {
      shutdown(code);
    }
  });
}
