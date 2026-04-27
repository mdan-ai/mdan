import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(new URL(".", import.meta.url)));

describe("package export boundary", () => {
  it("publishes the root convenience API but keeps protocol entrypoints internal", async () => {
    const packageJson = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8")) as {
      exports?: Record<string, unknown>;
    };
    const exportsMap = packageJson.exports ?? {};

    expect(Object.prototype.hasOwnProperty.call(exportsMap, ".")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(exportsMap, "./core")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(exportsMap, "./protocol")).toBe(false);
  });

  it("publishes a convenience root export for app and frontend helpers", async () => {
    const indexSource = await readFile(join(repoRoot, "src/index.ts"), "utf8");

    expect(indexSource).toMatch(/createApp/);
    expect(indexSource).toMatch(/fields/);
    expect(indexSource).toMatch(/createFrontend/);
    expect(indexSource).toMatch(/defineFormRenderer/);
  });

  it("keeps protocol manifest types off the root convenience export", async () => {
    const indexSource = await readFile(join(repoRoot, "src/index.ts"), "utf8");

    expect(indexSource).not.toMatch(/MDAN_PAGE_MANIFEST_VERSION/);
    expect(indexSource).not.toMatch(/type\s+MdanActionManifest/);
    expect(indexSource).not.toMatch(/type\s+JsonAction/);
    expect(indexSource).not.toMatch(/type\s+JsonBlock/);
  });

  it("keeps markdown authoring convention helpers out of package exports", async () => {
    const indexSource = await readFile(join(repoRoot, "src/index.ts"), "utf8");
    const coreIndexSource = await readFile(join(repoRoot, "src/core/index.ts"), "utf8");
    const coreContentSource = await readFile(join(repoRoot, "src/core/content.ts"), "utf8");

    expect(indexSource).not.toMatch(/SemanticSlots|semanticSlots|semantic-slots/);
    expect(coreIndexSource).not.toMatch(/SemanticSlots|semanticSlots|semantic-slots/);
    expect(coreContentSource).not.toMatch(/SemanticSlots|semanticSlots|semantic-slots/);
  });

  it("keeps the app barrel available for explicit authoring imports", async () => {
    const packageJson = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8")) as {
      exports?: Record<string, unknown>;
    };
    const exportsMap = packageJson.exports ?? {};
    const appIndexSource = await readFile(join(repoRoot, "src/app/index.ts"), "utf8");
    const serverIndexSource = await readFile(join(repoRoot, "src/server/index.ts"), "utf8");

    expect(Object.prototype.hasOwnProperty.call(exportsMap, "./app")).toBe(true);
    expect(appIndexSource).toMatch(/createApp/);
    expect(appIndexSource).toMatch(/fields/);
    expect(appIndexSource).toMatch(/signIn/);
    expect(appIndexSource).toMatch(/signOut/);
    expect(appIndexSource).toMatch(/refreshSession/);
    expect(serverIndexSource).not.toMatch(/createApp/);
    expect(serverIndexSource).not.toMatch(/fields/);
    expect(serverIndexSource).not.toMatch(/getCookie/);
    expect(serverIndexSource).not.toMatch(/getHeader/);
    expect(serverIndexSource).not.toMatch(/getQueryParam/);
  });

  it("keeps low-value authoring types off the root convenience export", async () => {
    const indexSource = await readFile(join(repoRoot, "src/index.ts"), "utf8");

    expect(indexSource).not.toMatch(/AppActionDefinition/);
    expect(indexSource).not.toMatch(/AppFieldDefinition/);
    expect(indexSource).not.toMatch(/AppInstance/);
    expect(indexSource).not.toMatch(/AppPageHandler/);
    expect(indexSource).not.toMatch(/AppActionHandler/);
    expect(indexSource).not.toMatch(/AppPageConfig/);
    expect(indexSource).not.toMatch(/AppPageDefinition/);
  });

  it("publishes the frontend subpath for browser rendering helpers", async () => {
    const packageJson = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8")) as {
      exports?: Record<string, unknown>;
    };
    const exportsMap = packageJson.exports ?? {};

    expect(Object.prototype.hasOwnProperty.call(exportsMap, "./frontend")).toBe(true);
  });

  it("keeps legacy browser-entry implementation helpers off the server barrel", async () => {
    const serverIndexSource = await readFile(join(repoRoot, "src/server/index.ts"), "utf8");

    expect(serverIndexSource).not.toMatch(/renderBrowserShell/);
    expect(serverIndexSource).not.toMatch(/resolveLocalBrowserModule/);
    expect(serverIndexSource).not.toMatch(/shouldServeBrowserShell/);
    expect(serverIndexSource).not.toMatch(/LOCAL_BROWSER_SHELL_MODULE_PATH/);
    expect(serverIndexSource).not.toMatch(/LOCAL_BROWSER_SURFACE_MODULE_PATH/);
    expect(serverIndexSource).not.toMatch(/LOCAL_BROWSER_FRONTEND_MODULE_PATH/);
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
