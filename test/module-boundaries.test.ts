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
    const files = ["src/surface/headless.ts", "src/surface/protocol.ts"];
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

  it("keeps the server adapter shell independent from the default ui implementation", async () => {
    const source = await readSource("src/server/browser-shell.ts");

    expectSourceNotToImport(
      source,
      [
        /from\s+["'](?:\.\.\/)?ui(?:\/components|\/theme|\/mount|\/register|["'])/,
        /from\s+["']lit(?:\/|["'])/,
        /from\s+["']\.\/browser-shell-snapshot\.js["']/,
        /from\s+["']\.\.\/input(?:\/|["'])/,
        /from\s+["']\.\.\/content(?:\/|["'])/,
        /from\s+["']\.\.\/shared(?:\/|["'])/
      ],
      "src/server/browser-shell.ts"
    );
    expect(source).toContain("createHeadlessHost");
    expect(source).toContain("mountMdanUi");
    expect(source).toContain("renderInitialProjection");
  });

  it("keeps readable-surface projection behind the markdown gateway", async () => {
    expect(await pathExists("src/server/surface-projection.ts")).toBe(false);

    const files = [
      "src/server/browser-shell.ts",
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

  it("keeps readable-surface validation independent from runtime types", async () => {
    const source = await readSource("src/server/readable-surface-validation.ts");

    expectSourceNotToImport(
      source,
      [/from\s+["']\.\/runtime\.js["']/],
      "src/server/readable-surface-validation.ts"
    );
  });

  it("keeps runtime orchestration independent from readable-surface violation mapping details", async () => {
    const source = await readSource("src/server/runtime.ts");

    expectSourceNotToImport(
      source,
      [
        /from\s+["']\.\/readable-surface-validation\.js["']/
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

  it("keeps surface render semantics independent from runtime-specific layers", async () => {
    const source = await readSource("src/surface/render-semantics.ts");

    expectSourceNotToImport(
      source,
      [
        /from\s+["']\.\.\/surface(?:\/|["'])/,
        /from\s+["']\.\.\/ui(?:\/|["'])/,
        /from\s+["']\.\.\/server(?:\/|["'])/
      ],
      "src/surface/render-semantics.ts"
    );
  });

  it("keeps ui model code behind the surface presentation boundary", async () => {
    const files = ["src/ui/model.ts", "src/ui/mount.ts"];
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

  it("keeps ui surface imports funneled through src/ui/model.ts only", async () => {
    const files = ["src/ui/index.ts", "src/ui/mount.ts", "src/ui/register.ts", "src/ui/snapshot.ts"];

    for (const file of files) {
      expectSourceNotToImport(
        await readSource(file),
        [/from\s+["']\.\.\/surface(?:\/|["'])/],
        file
      );
    }

    const modelSource = await readSource("src/ui/model.ts");
    expect(modelSource).toMatch(/from\s+["']\.\.\/surface\/presentation\.js["']/);
    expect(modelSource).toMatch(/from\s+["']\.\.\/surface\/protocol\.js["']/);
    expect(modelSource).toMatch(/from\s+["']\.\.\/surface\/forms\.js["']/);
  });

  it("keeps the ui barrel focused on the default ui runtime entrypoints", async () => {
    const source = await readSource("src/ui/index.ts");

    expect(source).toContain('export * from "./register.js";');
    expect(source).toContain('export * from "./mount.js";');
    expect(source).not.toContain('export * from "./model.js";');
  });

  it("keeps surface content helpers behind the surface content gateway", async () => {
    const files = [
      "src/surface/adapter.ts",
      "src/surface/headless.ts",
      "src/surface/presentation.ts"
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
      "src/surface/presentation.ts",
      "src/surface/protocol.ts",
      "src/surface/render-semantics.ts",
      "src/surface/surface-actions.ts"
    ];

    for (const file of files) {
      expectSourceNotToImport(
        await readSource(file),
        [/from\s+["']\.\.\/protocol(?:\/|["'])/],
        file
      );
    }
  });

  it("keeps server public types independent from asset store implementation", async () => {
    const source = await readSource("src/server/types.ts");

    expectSourceNotToImport(
      source,
      [
        /from\s+["']\.\.\/core\/index\.js["']/,
        /from\s+["']\.\/assets\.js["']/,
        /from\s+["']\.\.\/bridge(?:\/|["'])/
      ],
      "src/server/types.ts"
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
      expect(source, `${file} should not import the server authoring barrel`).not.toMatch(
        /@mdanai\/sdk\/server|from\s+["']\.\.\/\.\.\/src\/server\/index\.js["']/
      );
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

  it("exposes the root app API while keeping protocol internals off separate public boundaries", async () => {
    const packageJson = JSON.parse(await readSource("package.json")) as { exports?: Record<string, unknown> };
    const indexSource = await readSource("src/index.ts");
    const appSource = await readSource("src/app/index.ts");
    const exportsMap = packageJson.exports ?? {};

    expect(Object.prototype.hasOwnProperty.call(exportsMap, "."), "root entry should publish the app API").toBe(true);
    expect(Object.prototype.hasOwnProperty.call(exportsMap, "./protocol"), "protocol remains an internal source boundary").toBe(false);
    expect(Object.prototype.hasOwnProperty.call(exportsMap, "./core"), "core remains an internal source boundary").toBe(false);
    expect(Object.prototype.hasOwnProperty.call(exportsMap, "./server")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(exportsMap, "./server/node")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(exportsMap, "./server/bun")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(exportsMap, "./surface")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(exportsMap, "./web")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(exportsMap, "./ui")).toBe(false);
    expect(indexSource, "root app API should not re-export createMdanServer directly").not.toMatch(/createMdanServer/);
    expect(indexSource, "root app API should not proxy the broad server barrel").not.toMatch(/\.\/server\/index\.js/);
    expect(indexSource, "root app API should not keep screen terminology").not.toMatch(/AppScreen|screen/);
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

    expect(nodeSource).toContain('from "./host-shared.js"');
    expect(bunSource).toContain('from "./host-shared.js"');
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
      "src/server/browser-shell.ts",
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

  it("keeps server content dependencies behind the markdown gateway", async () => {
    const files = [
      "src/server/browser-form-bridge.ts",
      "src/server/browser-shell.ts",
      "src/server/contracts.ts",
      "src/server/response.ts",
      "src/server/result-normalization.ts",
      "src/server/runtime.ts",
      "src/server/types.ts"
    ];

    for (const file of files) {
      expectSourceNotToImport(
        await readSource(file),
        [/from\s+["']\.\.\/content(?:\/|["'])/],
        file
      );
    }
  });

  it("keeps runtime-facing layers off the deprecated core source boundary", async () => {
    const files = [
      "src/server/runtime.ts",
      "src/server/action-proofing.ts",
      "src/server/request-inputs.ts",
      "src/server/response.ts",
      "src/surface/headless.ts",
      "src/surface/protocol.ts",
      "src/ui/mount.ts"
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

  it("keeps the default ui depending only on surface-facing core contracts", async () => {
    const files = ["src/ui/mount.ts"];

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
