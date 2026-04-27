import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

async function expectRepoPath(path: string): Promise<void> {
  await expect(access(join(repoRoot, path)), path).resolves.toBeUndefined();
}

function extractRepoPaths(command: string): string[] {
  return command.split(/\s+/).filter((part) => /^(?:test|src|create-mdan\/test|create-mdan\/src)\/.+\.(?:ts|tsx|js|mjs)$/.test(part));
}

describe("package scripts", () => {
  it("exposes build/watch scripts and example dev runner commands", async () => {
    const packageJson = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    const scripts = packageJson.scripts ?? {};

    expect(scripts.clean).toBe("node scripts/clean-build-output.mjs");
    expect(scripts.build).toContain("npm run clean");
    expect(scripts.build).toContain("node scripts/build-browser-bundles.mjs");
    expect(scripts.build).toContain("bunx tsc -b tsconfig.json --force");
    expect(scripts.build).toContain("npm run build:create-mdan");
    expect(scripts["build:create-mdan"]).toBe("npm --prefix create-mdan run build");
    expect(scripts["build:browser"]).toBe("node scripts/build-browser-bundles.mjs");
    expect(scripts["build:browser:watch"]).toBe("node scripts/build-browser-bundles.mjs --watch");
    expect(scripts["build:watch"]).toBe("bunx tsc -p tsconfig.json --watch --preserveWatchOutput");
    expect(scripts["dev:starter"]).toContain("node scripts/run-example-dev.mjs");
    expect(scripts["dev:auth-guestbook"]).toContain("node scripts/run-example-dev.mjs");
  });

  it("keeps scripted test file references pointing at existing files", async () => {
    const packageJson = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    const scripts = packageJson.scripts ?? {};

    await Promise.all(extractRepoPaths(scripts["test:markdown-runtime"] ?? "").map(expectRepoPath));
  });

  it("cleans all generated package outputs before a full build", async () => {
    const cleaner = await readFile(join(repoRoot, "scripts/clean-build-output.mjs"), "utf8");

    expect(cleaner).toContain('"dist"');
    expect(cleaner).toContain('"dist-browser"');
    expect(cleaner).toContain('"create-mdan/dist"');
  });

  it("keeps default tests on the full maintained test suite", async () => {
    const packageJson = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    const scripts = packageJson.scripts ?? {};

    expect(scripts.test).toBe("npm run test:all");
    expect(scripts["test:all"]).toBe("bunx vitest run test create-mdan/test");
    expect(scripts["test:fast"]).toBe("bunx vitest run test/core test/frontend test/server test/surface create-mdan/test");
    expect(scripts["test:baseline"]).toBeUndefined();
    expect(scripts["test:tssdk-migrated"]).toBeUndefined();
  });

  it("keeps vitest coverage file references pointing at existing files", async () => {
    const config = await readFile(join(repoRoot, "vitest.coverage.config.ts"), "utf8");
    const paths = [...config.matchAll(/"((?:test|src|create-mdan\/test|create-mdan\/src)\/[^"]+\.(?:ts|tsx|js|mjs))"/g)].map((match) => match[1]!);

    await Promise.all(paths.map(expectRepoPath));
  });
});
