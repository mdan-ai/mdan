import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { cleanBuildArtifacts } from "../../scripts/clean-build-artifacts.mjs";

describe("cleanBuildArtifacts", () => {
  it("removes generated dist directories and keeps unrelated files", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "mdan-clean-build-"));

    await mkdir(join(rootDir, "sdk", "dist", "core"), { recursive: true });
    await mkdir(join(rootDir, "create-mdan", "dist"), { recursive: true });
    await mkdir(join(rootDir, "examples", "starter", "dist"), { recursive: true });
    await mkdir(join(rootDir, "demo", "agent-tasks", "dist"), { recursive: true });
    await mkdir(join(rootDir, "docs-site", "dist"), { recursive: true });
    await writeFile(join(rootDir, "sdk", "dist", "core", "stale.js"), "stale", "utf8");
    await writeFile(join(rootDir, "sdk", "tsconfig.tsbuildinfo"), "stale", "utf8");
    await writeFile(join(rootDir, "create-mdan", "tsconfig.tsbuildinfo"), "stale", "utf8");
    await writeFile(join(rootDir, "README.md"), "keep me", "utf8");

    await cleanBuildArtifacts(rootDir);

    await expect(stat(join(rootDir, "sdk", "dist"))).rejects.toThrow();
    await expect(stat(join(rootDir, "create-mdan", "dist"))).rejects.toThrow();
    await expect(stat(join(rootDir, "examples", "starter", "dist"))).rejects.toThrow();
    await expect(stat(join(rootDir, "demo", "agent-tasks", "dist"))).rejects.toThrow();
    await expect(stat(join(rootDir, "docs-site", "dist"))).rejects.toThrow();
    await expect(stat(join(rootDir, "sdk", "tsconfig.tsbuildinfo"))).rejects.toThrow();
    await expect(stat(join(rootDir, "create-mdan", "tsconfig.tsbuildinfo"))).rejects.toThrow();
    await expect(stat(join(rootDir, "README.md"))).resolves.toBeDefined();

    await rm(rootDir, { recursive: true, force: true });
  });
});
