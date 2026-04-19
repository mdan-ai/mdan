import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import {
  detectDefaultRuntime,
  formatNextSteps,
  formatUsage,
  parseCliArgs,
  runCli
} from "../src/cli.js";
import { toCompatibleSdkRange } from "../src/scaffold.js";

describe("create-mdan cli", () => {
  it("formats usage with npm and bun entrypoints", () => {
    expect(formatUsage()).toContain("npm create mdan@latest <project-name>");
    expect(formatUsage()).toContain("bunx create-mdan <project-name>");
  });

  it("defaults to node unless launched by bun", () => {
    expect(detectDefaultRuntime("npm/10 node/v22")).toBe("node");
    expect(detectDefaultRuntime("bun/1.2.0 npm/?")).toBe("bun");
  });

  it("parses explicit runtime options", () => {
    expect(parseCliArgs(["agent-app", "--runtime", "bun"]).runtime).toBe("bun");
    expect(parseCliArgs(["agent-app", "--runtime=node"], "bun/1.2.0").runtime).toBe("node");
  });

  it("rejects invalid runtime and extra args", () => {
    expect(() => parseCliArgs(["agent-app", "--runtime", "deno"])).toThrow(/"node" or "bun"/);
    expect(() => parseCliArgs(["one", "two"])).toThrow(/Unexpected extra argument/);
  });

  it("maps package versions to compatible sdk ranges", () => {
    expect(toCompatibleSdkRange("0.7.0")).toBe("^0.7.0");
    expect(toCompatibleSdkRange("0.7.0-beta.1")).toBe("^0.7.0");
    expect(() => toCompatibleSdkRange("latest")).toThrow(/Unsupported package version/);
  });

  it("formats next steps for selected runtime", () => {
    expect(formatNextSteps("/tmp/app", "node", "app")).toContain("npm install");
    expect(formatNextSteps("/tmp/app", "bun", "app")).toContain("bun install");
  });

  it("uses the target basename as the generated project name", async () => {
    const root = await mkdtemp(join(tmpdir(), "create-mdan-cli-"));
    try {
      const targetDir = join(root, "agent-app");
      const message = await runCli([targetDir, "--runtime", "node"], "0.7.0");
      const packageJson = await readFile(join(targetDir, "package.json"), "utf8");

      expect(message).toContain("Created MDAN node starter");
      expect(packageJson).toContain('"name": "agent-app"');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
