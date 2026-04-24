import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(new URL(".", import.meta.url)));

describe("package export boundary", () => {
  it("publishes the root app API but keeps protocol entrypoints internal", async () => {
    const packageJson = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8")) as {
      exports?: Record<string, unknown>;
    };
    const exportsMap = packageJson.exports ?? {};

    expect(Object.prototype.hasOwnProperty.call(exportsMap, ".")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(exportsMap, "./protocol")).toBe(false);
  });

  it("keeps browser shell runtime types off the root app export", async () => {
    const indexSource = await readFile(join(repoRoot, "src/index.ts"), "utf8");

    expect(indexSource).not.toMatch(/type\s+BrowserShellOptions/);
  });

  it("exposes explicit manifest types and version constant from the root app export", async () => {
    const indexSource = await readFile(join(repoRoot, "src/index.ts"), "utf8");

    expect(indexSource).toMatch(/MDAN_PAGE_MANIFEST_VERSION/);
    expect(indexSource).toMatch(/export type \{ UiFormRenderer \}/);
    expect(indexSource).toMatch(/type\s+MdanActionManifest/);
    expect(indexSource).toMatch(/type\s+JsonAction/);
    expect(indexSource).toMatch(/type\s+JsonBlock/);
    expect(indexSource).toMatch(/type\s+MdanActionVerb/);
    expect(indexSource).toMatch(/type\s+MdanActionMethod/);
    expect(indexSource).toMatch(/type\s+MdanConfirmationPolicy/);
  });

  it("keeps low-level server tuning knobs off createApp options", async () => {
    const appSource = await readFile(join(repoRoot, "src/app/index.ts"), "utf8");

    expect(appSource).not.toMatch(/CreateMdanServerOptions/);
    expect(appSource).not.toMatch(/type\s+BrowserShellOptions/);
    expect(appSource).not.toMatch(/server\/browser-shell/);
    expect(appSource).not.toMatch(/validatePostRequest/);
    expect(appSource).not.toMatch(/autoDependencies/);
    expect(appSource).not.toMatch(/semanticSlots/);
    expect(appSource).not.toMatch(/assets\?:/);
  });

  it("keeps low-value authoring types off the root app export", async () => {
    const indexSource = await readFile(join(repoRoot, "src/index.ts"), "utf8");

    expect(indexSource).not.toMatch(/AppActionDefinition/);
    expect(indexSource).not.toMatch(/AppFieldDefinition/);
    expect(indexSource).not.toMatch(/AppInstance/);
    expect(indexSource).not.toMatch(/AppPageHandler/);
    expect(indexSource).not.toMatch(/AppActionHandler/);
    expect(indexSource).not.toMatch(/AppPageConfig/);
    expect(indexSource).not.toMatch(/AppPageDefinition/);
  });

  it("keeps browser-shell implementation helpers off the server barrel", async () => {
    const serverIndexSource = await readFile(join(repoRoot, "src/server/index.ts"), "utf8");

    expect(serverIndexSource).not.toMatch(/renderBrowserShell/);
    expect(serverIndexSource).not.toMatch(/resolveLocalBrowserModule/);
    expect(serverIndexSource).not.toMatch(/shouldServeBrowserShell/);
    expect(serverIndexSource).not.toMatch(/LOCAL_BROWSER_SHELL_MODULE_PATH/);
    expect(serverIndexSource).not.toMatch(/LOCAL_BROWSER_SURFACE_MODULE_PATH/);
    expect(serverIndexSource).not.toMatch(/LOCAL_BROWSER_UI_MODULE_PATH/);
  });

  it("keeps body-normalization helpers off the server barrel", async () => {
    const serverIndexSource = await readFile(join(repoRoot, "src/server/index.ts"), "utf8");

    expect(serverIndexSource).not.toMatch(/normalizeMultipartBody/);
    expect(serverIndexSource).not.toMatch(/normalizeUrlEncodedBody/);
  });

  it("keeps low-level asset store helpers off the server barrel", async () => {
    const serverIndexSource = await readFile(join(repoRoot, "src/server/index.ts"), "utf8");

    expect(serverIndexSource).not.toMatch(/AssetCleanupResult/);
    expect(serverIndexSource).not.toMatch(/createLocalAssetHandle/);
    expect(serverIndexSource).not.toMatch(/getAssetHandle/);
    expect(serverIndexSource).not.toMatch(/MdanAssetStoreOptions/);
    expect(serverIndexSource).not.toMatch(/readAsset/);
    expect(serverIndexSource).not.toMatch(/openAssetStream/);
  });

  it("keeps runtime-tuning types off the server barrel", async () => {
    const serverIndexSource = await readFile(join(repoRoot, "src/server/index.ts"), "utf8");

    expect(serverIndexSource).not.toMatch(/BrowserShellOptions/);
    expect(serverIndexSource).not.toMatch(/AutoDependencyOptions/);
  });

  it("keeps lower-level handler and result types off the server barrel", async () => {
    const serverIndexSource = await readFile(join(repoRoot, "src/server/index.ts"), "utf8");

    expect(serverIndexSource).not.toMatch(/MdanHandlerContext/);
    expect(serverIndexSource).not.toMatch(/MdanHandlerResult/);
    expect(serverIndexSource).not.toMatch(/MdanInputMap/);
    expect(serverIndexSource).not.toMatch(/MdanInputValue/);
    expect(serverIndexSource).not.toMatch(/MdanPageHandlerContext/);
    expect(serverIndexSource).not.toMatch(/MdanPageResult/);
    expect(serverIndexSource).not.toMatch(/MdanSessionMutation/);
    expect(serverIndexSource).not.toMatch(/MdanStreamChunk/);
    expect(serverIndexSource).not.toMatch(/MdanStreamResult/);
  });

  it("keeps markdown surface helpers off the server barrel", async () => {
    const serverIndexSource = await readFile(join(repoRoot, "src/server/index.ts"), "utf8");

    expect(serverIndexSource).not.toMatch(/createMarkdownPage/);
    expect(serverIndexSource).not.toMatch(/createMarkdownFragment/);
    expect(serverIndexSource).not.toMatch(/createExecutableContent/);
  });

  it("keeps post-input validation detail types off the server barrel", async () => {
    const serverIndexSource = await readFile(join(repoRoot, "src/server/index.ts"), "utf8");

    expect(serverIndexSource).not.toMatch(/validatePostInputs/);
    expect(serverIndexSource).not.toMatch(/MdanPostInputValidator/);
    expect(serverIndexSource).not.toMatch(/PostInputValidationContext/);
    expect(serverIndexSource).not.toMatch(/PostInputValidationFailure/);
    expect(serverIndexSource).not.toMatch(/PostInputValidationPolicy/);
    expect(serverIndexSource).not.toMatch(/PostInputValidationResult/);
  });
});
