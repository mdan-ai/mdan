import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { scaffoldStarterProject } from "../src/scaffold.js";

const fixtureModuleUrl = new URL("../src/scaffold.ts", import.meta.url).href;
const tmpRoots: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "create-mdan-test-"));
  tmpRoots.push(dir);
  return dir;
}

async function readGenerated(root: string, path: string): Promise<string> {
  return readFile(join(root, path), "utf8");
}

describe("create-mdan scaffold", () => {
  afterEach(async () => {
    await Promise.all(tmpRoots.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("generates a node starter against the current app-first sdk public API", async () => {
    const root = await makeTempDir();
    const targetDir = join(root, "agent-app");

    await scaffoldStarterProject({
      targetDir,
      projectName: "agent-app",
      sdkVersion: "^0.7.0",
      runtime: "node"
    }, fixtureModuleUrl);

    const packageJson = await readGenerated(targetDir, "package.json");
    const indexSource = await readGenerated(targetDir, "index.mjs");
    const serverSource = await readGenerated(targetDir, "app/server.mjs");

    expect(packageJson).toContain('"name": "agent-app"');
    expect(packageJson).toContain('"@mdanai/sdk": "^0.7.0"');
    expect(indexSource).toContain('@mdanai/sdk/server/node');
    expect(indexSource).not.toContain("rootRedirect");
    expect(serverSource).toContain('@mdanai/sdk');
    expect(serverSource).not.toContain('@mdanai/sdk/server');
    expect(serverSource).not.toContain("createArtifactPage");
    expect(serverSource).toContain("const home = app.page");
    expect(serverSource).toContain("app.route(home.bind(messages));");
    expect(serverSource).not.toContain('app.route("/", {');
    expect(serverSource).toContain("return home.bind(messages).render()");
    expect(serverSource).toContain("actions.write(\"submit_message\"");
    expect(serverSource).toContain("fields.string({ required: true })");
    expect(serverSource).not.toContain('join(root, "actions", "main.json")');
    expect(`${indexSource}\n${serverSource}`).not.toMatch(/@mdanai\/sdk\/(?:core|web|elements)|createHostedApp/);
  });

  it("generates a bun starter with bun host import", async () => {
    const root = await makeTempDir();
    const targetDir = join(root, "bun-app");

    await scaffoldStarterProject({
      targetDir,
      projectName: "bun-app",
      sdkVersion: "^0.7.0",
      runtime: "bun"
    }, fixtureModuleUrl);

    const indexSource = await readGenerated(targetDir, "index.mjs");
    const packageJson = await readGenerated(targetDir, "package.json");

    expect(indexSource).toContain('@mdanai/sdk/server/bun');
    expect(indexSource).toContain("Bun.serve");
    expect(indexSource).not.toContain("rootRedirect");
    expect(packageJson).toContain('"start": "bun index.mjs"');
  });

  it("normalizes package names and app ids independently from display names", async () => {
    const root = await makeTempDir();
    const targetDir = join(root, "My \"Fancy\" App!");

    await scaffoldStarterProject({
      targetDir,
      sdkVersion: "^0.7.0",
      runtime: "node"
    }, fixtureModuleUrl);

    const packageJson = JSON.parse(await readGenerated(targetDir, "package.json")) as {
      name: string;
    };
    const indexSource = await readGenerated(targetDir, "index.mjs");
    const serverSource = await readGenerated(targetDir, "app/server.mjs");
    const pageSource = await readGenerated(targetDir, "app/index.md");

    expect(packageJson.name).toBe("my-fancy-app");
    expect(indexSource).toContain('const projectName = "My \\"Fancy\\" App!";');
    expect(serverSource).toContain('const appId = "my-fancy-app";');
    expect(serverSource).toContain('const projectName = "My \\"Fancy\\" App!";');
    expect(serverSource).toContain("appId,");
    expect(serverSource).not.toContain("app_id:");
    expect(serverSource).not.toContain("state_id:");
    expect(pageSource).toContain('# My "Fancy" App!');
  });

  it("rejects non-empty target directories", async () => {
    const root = await makeTempDir();
    const targetDir = join(root, "occupied");
    await mkdir(targetDir);
    await writeFile(join(targetDir, "README.md"), "already here", "utf8");

    await expect(scaffoldStarterProject({
      targetDir,
      sdkVersion: "^0.7.0",
      runtime: "node"
    }, fixtureModuleUrl)).rejects.toThrow(/must be empty/);
  });

  it("keeps template roots tied to the create-mdan source tree", () => {
    expect(fileURLToPath(new URL("../template/shared", fixtureModuleUrl))).toContain("create-mdan/template/shared");
  });
});
