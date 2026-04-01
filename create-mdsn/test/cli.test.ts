import { describe, expect, it } from "vitest";

import { detectDefaultRuntime, formatNextSteps, formatUsage, parseCliArgs } from "../src/cli.js";

describe("create-mdsn cli messaging", () => {
  it("shows runtime-aware create usage", () => {
    expect(formatUsage()).toContain("npm create mdsn@latest <project-name>");
    expect(formatUsage()).toContain("-- --runtime bun");
    expect(formatUsage()).toContain("bunx create-mdsn <project-name>");
    expect(formatUsage()).toContain("--runtime node");
  });

  it("shows node next steps", () => {
    const lines = formatNextSteps("agent-app", "node");

    expect(lines).toContain("Created MDSN node starter in agent-app");
    expect(lines).toContain("  npm install");
    expect(lines).toContain("  npm start");
    expect(lines).not.toContain("bun install");
  });

  it("shows bun next steps", () => {
    const lines = formatNextSteps("agent-app", "bun");

    expect(lines).toContain("Created MDSN bun starter in agent-app");
    expect(lines).toContain("  bun install");
    expect(lines).toContain("  bun start");
    expect(lines).not.toContain("npm install");
  });

  it("defaults runtime from the invoking package manager", () => {
    expect(detectDefaultRuntime("bun/1.3.11")).toBe("bun");
    expect(detectDefaultRuntime("npm/11.6.2 node/v24.0.0 darwin arm64")).toBe("node");
  });

  it("parses explicit runtime overrides", () => {
    expect(parseCliArgs(["agent-app"], "bun/1.3.11")).toEqual({
      targetArg: "agent-app",
      runtime: "bun",
      showHelp: false
    });
    expect(parseCliArgs(["agent-app", "--runtime", "node"], "bun/1.3.11")).toEqual({
      targetArg: "agent-app",
      runtime: "node",
      showHelp: false
    });
    expect(parseCliArgs(["agent-app", "--runtime=bun"], "npm/11.6.2")).toEqual({
      targetArg: "agent-app",
      runtime: "bun",
      showHelp: false
    });
    expect(parseCliArgs(["agent-app", "--", "--runtime", "bun"], "npm/11.6.2")).toEqual({
      targetArg: "agent-app",
      runtime: "bun",
      showHelp: false
    });
  });
});
