import { access, readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

async function readSource(path: string): Promise<string> {
  return readFile(join(repoRoot, path), "utf8");
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(join(repoRoot, path));
    return true;
  } catch {
    return false;
  }
}

function expectSourceNotToImport(source: string, forbidden: RegExp[], path: string): void {
  for (const pattern of forbidden) {
    expect(source, `${path} must not import ${pattern}`).not.toMatch(pattern);
  }
}

describe("module boundaries", () => {
  it("keeps the surface runtime independent from optional UI and markdown rendering", async () => {
    const files = ["src/surface/headless.ts", "src/surface/contracts.ts"];
    const forbidden = [
      /from\s+["'](?:\.\.\/)?ui(?:\/|["'])/,
      /from\s+["']lit(?:\/|["'])/,
      /from\s+["']\.\.\/core\/index\.js["']/,
      /from\s+["']\.\.\/core\/markdown-renderer\.js["']/
    ];

    for (const file of files) {
      expectSourceNotToImport(await readSource(file), forbidden, relative(repoRoot, join(repoRoot, file)));
    }
  });

  it("keeps the headless runtime focused on orchestration instead of inline transport and snapshot helpers", async () => {
    const source = await readSource("src/surface/headless.ts");

    expect(source).toMatch(/from\s+["']\.\/snapshot\.js["']/);
    expect(source).toMatch(/from\s+["']\.\/transport\.js["']/);
    expect(source, "src/surface/headless.ts should not keep inline GET url encoding").not.toMatch(/function toGetUrl\(/);
    expect(source, "src/surface/headless.ts should not keep inline submit body construction").not.toMatch(/function buildSubmitBody\(/);
    expect(source, "src/surface/headless.ts should not keep inline snapshot patching").not.toMatch(/function patchSnapshotByRegions\(/);
    expect(source, "src/surface/headless.ts should not keep inline snapshot projection").not.toMatch(/function toSnapshot\(/);
  });

  it("does not keep a server browser-shell implementation after the markdown-only cut", async () => {
    expect(await pathExists("src/server/browser-shell.ts")).toBe(false);
    expect(await pathExists("src/server/browser-form-bridge.ts")).toBe(false);
  });

  it("keeps readable-surface projection behind the markdown gateway", async () => {
    expect(await pathExists("src/server/surface-projection.ts")).toBe(false);

    const files = [
      "src/server/result-normalization.ts",
      "src/server/response.ts",
      "src/server/runtime.ts"
    ];

    for (const file of files) {
      expectSourceNotToImport(
        await readSource(file),
        [/from\s+["']\.\/surface-projection\.js["']/],
        file
      );
    }
  });

  it("keeps core readable-surface validation independent from server runtime types", async () => {
    const source = await readSource("src/core/surface/validation.ts");

    expectSourceNotToImport(
      source,
      [/from\s+["']\.\.\/server(?:\/|["'])/, /from\s+["']\.\/runtime\.js["']/],
      "src/core/surface/validation.ts"
    );
  });

  it("keeps runtime orchestration independent from readable-surface violation mapping details", async () => {
    const source = await readSource("src/server/runtime.ts");

    expectSourceNotToImport(
      source,
      [
        /from\s+["']\.\/readable-surface-validation\.js["']/,
        /from\s+["']\.\/readable-surface-options\.js["']/
      ],
      "src/server/runtime.ts"
    );
  });

  it("keeps runtime orchestration independent from runtime error result factories", async () => {
    const source = await readSource("src/server/runtime.ts");

    expect(source, "runtime.ts should not define the runtime error result catalog inline").not.toMatch(
      /function createActionProofViolationResult\(|function createInvalidActionHandlerResult\(|function createInvalidPageHandlerResult\(/
    );
  });

  it("keeps runtime orchestration independent from action request validation details", async () => {
    const source = await readSource("src/server/runtime.ts");

    expect(source, "runtime.ts should not define action request validation inline").not.toMatch(
      /function validateActionRequest\(|function isSupportedWriteContentType\(|function hasRequestBody\(|function isBrowserFormAdaptedRequest\(/
    );
  });

  it("keeps adapter-shared as a compatibility barrel instead of a mixed implementation module", async () => {
    const source = await readSource("src/server/adapter-shared.ts");

    expectSourceNotToImport(
      source,
      [
        /from\s+["']node:path["']/,
        /from\s+["']node:url["']/,
        /from\s+["']\.\.\/core(?:\/|["'])/,
        /from\s+["']\.\/assets\.js["']/
      ],
      "src/server/adapter-shared.ts"
    );
  });

  it("keeps core surface presentation semantics independent from runtime-specific layers", async () => {
    const source = await readSource("src/core/surface/presentation.ts");

    expectSourceNotToImport(
      source,
      [
        /from\s+["']\.\.\/surface(?:\/|["'])/,
        /from\s+["']\.\.\/ui(?:\/|["'])/,
        /from\s+["']\.\.\/server(?:\/|["'])/
      ],
      "src/core/surface/presentation.ts"
    );
  });

  it("keeps core surface form semantics free of runtime environment types", async () => {
    const source = await readSource("src/core/surface/forms.ts");

    expect(source, "src/core/surface/forms.ts should not depend on browser-only File checks").not.toMatch(/\bFile\b/);
    expect(source, "src/core/surface/forms.ts should not depend on browser transport types").not.toMatch(/\bFormData\b|\bHeaders\b|\bRequest\b|\bResponse\b/);
    expect(source, "src/core/surface/forms.ts should not depend on global runtime objects").not.toMatch(/\bwindow\b|\bdocument\b|\bfetch\b/);
  });

  it("keeps frontend model code behind the surface presentation boundary", async () => {
    const files = ["src/frontend/model.ts", "src/frontend/mount.ts"];
    const forbidden = [
      /from\s+["']\.\.\/content(?:\/|["'])/,
      /from\s+["']\.\.\/protocol(?:\/|["'])/,
      /from\s+["']\.\.\/input(?:\/|["'])/,
      /from\s+["']\.\.\/shared(?:\/|["'])/
    ];

    for (const file of files) {
      expectSourceNotToImport(await readSource(file), forbidden, relative(repoRoot, join(repoRoot, file)));
    }
  });

  it("keeps frontend surface imports funneled through src/frontend/model.ts only", async () => {
    const files = ["src/frontend/index.ts", "src/frontend/mount.ts", "src/frontend/register.ts", "src/frontend/snapshot.ts"];

    for (const file of files) {
      expectSourceNotToImport(
        await readSource(file),
        [/from\s+["']\.\.\/surface(?:\/|["'])/],
        file
      );
    }

    const modelSource = await readSource("src/frontend/model.ts");
    expect(modelSource).toMatch(/from\s+["']\.\.\/core\/surface\/presentation\.js["']/);
    expect(modelSource).toMatch(/from\s+["']\.\.\/core\/surface\/forms\.js["']/);
    expect(modelSource).toMatch(/from\s+["']\.\/contracts\.js["']/);
  });

  it("keeps frontend runtime contracts local to the frontend layer", async () => {
    const files = ["src/frontend/contracts.ts", "src/frontend/model.ts", "src/frontend/mount.ts", "src/frontend/entry.ts"];

    for (const file of files) {
      expectSourceNotToImport(
        await readSource(file),
        [/from\s+["']\.\.\/surface\/protocol\.js["']/],
        file
      );
    }
  });

  it("keeps surface protocol types internal to the surface layer", async () => {
    const files = [
      "src/frontend/contracts.ts",
      "src/frontend/model.ts",
      "src/frontend/mount.ts",
      "src/frontend/entry.ts",
      "test/elements/headless-host-integration.test.ts"
    ];

    for (const file of files) {
      expectSourceNotToImport(
        await readSource(file),
        [/from\s+["'](?:\.\.\/)*src\/surface\/protocol\.js["']/, /from\s+["']\.\.\/surface\/protocol\.js["']/],
        file
      );
    }
  });

  it("keeps the frontend entry typed against frontend contracts instead of surface implementation signatures", async () => {
    const source = await readSource("src/frontend/entry.ts");

    expect(source).toMatch(/from\s+["']\.\/contracts\.js["']/);
    expect(source).not.toMatch(/createHost\?: typeof createHeadlessHost/);
  });

  it("keeps the frontend barrel focused on the default frontend runtime entrypoints", async () => {
    const source = await readSource("src/frontend/index.ts");

    expect(source).toContain('export { mountMdanUi } from "./mount.js";');
    expect(source).toContain('export { registerMdanUi } from "./register.js";');
    expect(source).not.toContain('from "./model.js"');
  });

  it("keeps surface content helpers behind the surface content gateway", async () => {
    const files = [
      "src/surface/adapter.ts",
      "src/surface/headless.ts",
      "src/surface/forms.ts"
    ];

    for (const file of files) {
      expectSourceNotToImport(
        await readSource(file),
        [/from\s+["']\.\.\/content(?:\/|["'])/],
        file
      );
    }
  });

  it("keeps surface protocol helpers behind the surface protocol model gateway", async () => {
    const files = [
      "src/surface/adapter.ts",
      "src/surface/headless.ts",
      "src/surface/forms.ts",
      "src/surface/contracts.ts"
    ];

    for (const file of files) {
      expectSourceNotToImport(
        await readSource(file),
        [/from\s+["']\.\.\/protocol(?:\/|["'])/],
        file
      );
    }
  });

  it("removes the old surface presentation barrels after the core split", async () => {
    expect(await pathExists("src/surface/presentation.ts")).toBe(false);
    expect(await pathExists("src/surface/render-semantics.ts")).toBe(false);
    expect(await pathExists("src/surface/protocol-model.ts")).toBe(false);
    expect(await pathExists("src/surface/protocol.ts")).toBe(false);
  });

  it("keeps server public types independent from asset store implementation", async () => {
    const source = await readSource("src/server/types/index.ts");

    expectSourceNotToImport(
      source,
      [
        /from\s+["']\.\.\/core\/index\.js["']/,
        /from\s+["']\.\/assets\.js["']/,
        /from\s+["']\.\.\/bridge(?:\/|["'])/
      ],
      "src/server/types/index.ts"
    );
  });

  it("keeps the app authoring layer dependent on narrow server modules instead of broad barrels", async () => {
    const source = await readSource("src/app/index.ts");

    expectSourceNotToImport(
      source,
      [
        /from\s+["']\.\.\/server\/index\.js["']/,
        /from\s+["']\.\.\/content(?:\/|["'])/
      ],
      "src/app/index.ts"
    );
  });

  it("keeps examples and starter templates on the app-first authoring path", async () => {
    const files = [
      "examples/starter/app.ts",
      "examples/docs-starter/app.ts",
      "examples/auth-guestbook/app.ts",
      "create-mdan/template/shared/app/server.mjs"
    ];

    for (const file of files) {
      const source = await readSource(file);
      if (file === "create-mdan/template/shared/app/server.mjs") {
        expect(source, `${file} should import the app authoring barrel`).toMatch(/@mdanai\/sdk\/app/);
      }
      expect(source, `${file} should not keep app.screen on the main authoring path`).not.toMatch(/app\.screen\(/);
    }
  });

  it("keeps JSON surface conversion in core instead of a separate bridge boundary", async () => {
    const packageJson = JSON.parse(await readSource("package.json")) as { exports?: Record<string, unknown> };
    const indexSource = await readSource("src/index.ts");

    expect(await pathExists("src/bridge"), "src/bridge should not be a separate source boundary").toBe(false);
    expect(await pathExists("dist/bridge"), "dist/bridge should not be shipped as a stale bridge boundary").toBe(false);
    expect(packageJson.exports ?? {}, "package exports should not expose a bridge subpath").not.toHaveProperty("./bridge");
    expect(indexSource, "top-level exports should not expose bridge").not.toMatch(/\.\/bridge(?:\/|["'])/);
  });

  it("keeps the reserved root empty while exposing only the intended low-level public boundaries", async () => {
    const packageJson = JSON.parse(await readSource("package.json")) as { exports?: Record<string, unknown> };
    const indexSource = await readSource("src/index.ts");
    const appSource = await readSource("src/app/index.ts");
    const exportsMap = packageJson.exports ?? {};

    expect(Object.prototype.hasOwnProperty.call(exportsMap, "."), "root entry should stay reserved").toBe(true);
    expect(Object.prototype.hasOwnProperty.call(exportsMap, "./app")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(exportsMap, "./protocol"), "protocol remains an internal source boundary").toBe(false);
    expect(Object.prototype.hasOwnProperty.call(exportsMap, "./core"), "core should be the shared low-level boundary").toBe(true);
    expect(Object.prototype.hasOwnProperty.call(exportsMap, "./server")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(exportsMap, "./server/node")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(exportsMap, "./server/bun")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(exportsMap, "./surface")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(exportsMap, "./web")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(exportsMap, "./ui")).toBe(false);
    expect(indexSource.trim(), "root entry should stay empty").toBe("export {};");
    expect(appSource, "app authoring layer should not keep screen terminology").not.toMatch(/AppScreen|screen\(/);
  });

  it("does not keep a stale browser compatibility source boundary", async () => {
    const packageJson = JSON.parse(await readSource("package.json")) as { exports?: Record<string, unknown> };

    expect(await pathExists("src/browser"), "src/browser should not remain as a stale compatibility layer").toBe(false);
    expect(await pathExists("dist/browser"), "dist/browser should not be emitted").toBe(false);
    expect(packageJson.exports ?? {}, "package exports should not expose a browser compatibility subpath").not.toHaveProperty("./browser");
  });

  it("does not keep a stale elements compatibility source boundary", async () => {
    const packageJson = JSON.parse(await readSource("package.json")) as { exports?: Record<string, unknown> };

    expect(await pathExists("src/elements"), "src/elements should not remain as a stale compatibility layer").toBe(false);
    expect(await pathExists("dist/elements"), "dist/elements should not be emitted").toBe(false);
    expect(await pathExists("dist-browser/elements.js"), "dist-browser/elements.js should not be emitted").toBe(false);
    expect(packageJson.exports ?? {}, "package exports should not expose a stale elements subpath").not.toHaveProperty("./elements");
  });

  it("does not keep a stale web compatibility boundary", async () => {
    expect(await pathExists("src/web"), "src/web should not remain as a stale compatibility boundary").toBe(false);
    expect(await pathExists("dist/web"), "dist/web should not be emitted").toBe(false);
  });

  it("does not keep a stale top-level input source boundary", async () => {
    expect(await pathExists("src/input"), "src/input should not remain as a separate top-level boundary").toBe(false);
    expect(await pathExists("dist/input"), "dist/input should not be emitted").toBe(false);
  });

  it("does not keep a stale shared source boundary", async () => {
    expect(await pathExists("src/shared"), "src/shared should not remain as a generic catch-all boundary").toBe(false);
    expect(await pathExists("dist/shared"), "dist/shared should not be emitted").toBe(false);
  });

  it("keeps runtime orchestration independent from response serialization details", async () => {
    const source = await readSource("src/server/runtime.ts");

    expectSourceNotToImport(
      source,
      [
        /parseActionRequestBody/,
        /MdanParseError/,
        /serializeFragment/,
        /serializePage/,
        /serializeSseMessage/,
        /from\s+["']\.\/content-type\.js["']/
      ],
      "src/server/runtime.ts"
    );
  });

  it("keeps runtime orchestration independent from action proof internals", async () => {
    const source = await readSource("src/server/runtime.ts");

    expectSourceNotToImport(
      source,
      [
        /createActionProofToken/,
        /readActionProofClaims/,
        /verifyActionProofTokenWithClaims/,
        /normalizeInputValuesBySchema/,
        /ActionProofClaims/
      ],
      "src/server/runtime.ts"
    );
  });

  it("keeps runtime orchestration independent from auto dependency internals", async () => {
    const source = await readSource("src/server/runtime.ts");

    expectSourceNotToImport(
      source,
      [
        /isAutoDependency/,
        /applyImplicitFragmentToPage/,
        /resolveAutoTarget/,
        /findAutoDependency/
      ],
      "src/server/runtime.ts"
    );
  });

  it("keeps server runtime page and action flows in focused private helpers", async () => {
    const source = await readSource("src/server/runtime.ts");

    expect(source).toContain("async function handlePageRequest(");
    expect(source).toContain("async function handleActionRequest(");
    expect(source).toMatch(/await handlePageRequest\(/);
    expect(source).toMatch(/return await handleActionRequest\(/);
  });

  it("keeps server implementation modules from depending on the core barrel", async () => {
    const files = [
      "src/server/runtime.ts",
      "src/server/action-proofing.ts",
      "src/server/auto-dependencies.ts",
      "src/server/request-inputs.ts",
      "src/server/response.ts"
    ];

    for (const file of files) {
      expectSourceNotToImport(
        await readSource(file),
        [/from\s+["']\.\.\/core\/index\.js["']/],
        file
      );
    }
  });

  it("keeps node and bun hosts sharing the same route-planning helper", async () => {
    const nodeSource = await readSource("src/server/node.ts");
    const bunSource = await readSource("src/server/bun.ts");

    expect(nodeSource).toContain('from "./host/shared.js"');
    expect(bunSource).toContain('from "./host/shared.js"');
    expect(nodeSource).toContain("planHostRequest(");
    expect(bunSource).toContain("planHostRequest(");
  });

  it("keeps bun static file responses streaming instead of buffering whole files", async () => {
    const source = await readSource("src/server/bun.ts");

    expectSourceNotToImport(source, [/readFile/], "src/server/bun.ts");
    expect(source).toContain("createReadStream");
  });

  it("keeps local asset uploads streaming instead of buffering whole files", async () => {
    const source = await readSource("src/server/assets.ts");

    expect(source).not.toContain(".arrayBuffer()");
    expect(source).toContain("createWriteStream");
    expect(source).toContain("pipeline(");
  });

  it("keeps server implementation modules from depending directly on surface projection internals", async () => {
    const files = [
      "src/server/result-normalization.ts",
      "src/server/action-proofing.ts"
    ];

    for (const file of files) {
      expectSourceNotToImport(
        await readSource(file),
        [/from\s+["']\.\.\/surface\/(?:adapter|snapshot)\.js["']/],
        file
      );
    }
  });

  it("keeps runtime-facing server modules from depending directly on readable-markdown helpers", async () => {
    const files = [
      "src/server/runtime.ts",
      "src/server/result-normalization.ts",
      "src/server/action-proofing.ts",
      "src/server/response.ts"
    ];

    for (const file of files) {
      expectSourceNotToImport(
        await readSource(file),
        [/from\s+["']\.\.\/content\/readable-markdown\.js["']/],
        file
      );
    }
  });

  it("keeps core markdown-surface utilities independent from frontend helpers", async () => {
    const source = await readSource("src/core/surface/markdown.ts");

    expectSourceNotToImport(
      source,
      [
        /from\s+["']\.\.\/frontend(?:\/|["'])/
      ],
      "src/core/surface/markdown.ts"
    );
  });

  it("keeps server content dependencies behind the markdown gateway", async () => {
    const files = [
      "src/server/response.ts",
      "src/server/result-normalization.ts",
      "src/server/runtime.ts",
      "src/server/types/index.ts"
    ];

    for (const file of files) {
      expectSourceNotToImport(
        await readSource(file),
        [/from\s+["']\.\.\/content(?:\/|["'])/],
        file
      );
    }
  });

  it("keeps frontend runtime layers off the internal core boundary", async () => {
    const files = [
      "src/frontend/mount.ts",
      "src/frontend/register.ts",
      "src/frontend/snapshot.ts"
    ];

    for (const file of files) {
      expectSourceNotToImport(
        await readSource(file),
        [/from\s+["']\.\.\/core(?:\/|["'])/],
        file
      );
    }
  });

  it("keeps the surface adapter focused on composition instead of action-mapping internals", async () => {
    const source = await readSource("src/surface/adapter.ts");

    expectSourceNotToImport(
      source,
      [/from\s+["']\.\.\/(?:input|protocol\/input)\/field-schema\.js["']/],
      "src/surface/adapter.ts"
    );
    expect(source, "src/surface/adapter.ts should delegate action mapping").not.toMatch(/function toOperation\(/);
    expect(source, "src/surface/adapter.ts should delegate field schema merging").not.toMatch(/function blockInputsFromActions\(/);
  });

  it("keeps the default frontend depending only on surface-facing core contracts", async () => {
    const files = ["src/frontend/mount.ts"];

    for (const file of files) {
      expectSourceNotToImport(
        await readSource(file),
        [
          /from\s+["']\.\.\/protocol(?:\/|["'])/,
          /from\s+["']\.\.\/content(?:\/|["'])/,
          /from\s+["']\.\.\/input(?:\/|["'])/,
          /from\s+["']\.\.\/shared\/render-semantics\.js["']/
        ],
        file
      );
    }
  });

  it("keeps protocol contracts independent from content validation helpers", async () => {
    const source = await readSource("src/protocol/contracts.ts");

    expectSourceNotToImport(
      source,
      [/from\s+["']\.\.\/content(?:\/|["'])/],
      "src/protocol/contracts.ts"
    );
  });

  it("keeps protocol page types from owning input schema definitions directly", async () => {
    const source = await readSource("src/protocol/types.ts");

    expect(source).not.toMatch(/export interface FieldSchema/);
    expect(source).not.toMatch(/export type FieldKind/);
    expect(source).not.toMatch(/export type FieldFormat/);
  });

  it("keeps protocol surface shape helpers independent from surface composition", async () => {
    const source = await readSource("src/protocol/surface.ts");

    expectSourceNotToImport(
      source,
      [/from\s+["']\.\.\/surface(?:\/|["'])/],
      "src/protocol/surface.ts"
    );
    expect(source).not.toContain("JsonSurfaceEnvelope");
  });
});
