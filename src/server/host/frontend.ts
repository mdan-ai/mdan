import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import { projectReadableSurfaceToHtml } from "../../projection/html.js";

const FRONTEND_MODULE_SYMBOL = Symbol.for("mdan.frontend.module");

interface FrontendModuleCarrier {
  [FRONTEND_MODULE_SYMBOL]?: {
    exportName?: unknown;
    moduleUrl?: unknown;
  };
  title?: unknown;
}

export interface HostFrontendOptions {
  module?: string;
  exportName?: string;
  title?: string;
}

export type HostFrontendOption = boolean | string | HostFrontendOptions | object;

export interface NormalizedHostFrontendOptions {
  module?: string;
  exportName?: string;
  title?: string;
}

export interface FrontendEntryHtmlOptions {
  initialMarkdown?: string;
  projection?: "client" | "html";
}

const builtinEntryFilePath = fileURLToPath(new URL("../../../dist-browser/entry.js", import.meta.url));
const builtinFrontendFilePath = fileURLToPath(new URL("../../../dist-browser/frontend.js", import.meta.url));
const generatedFrontendDir = join(tmpdir(), "mdan-host-frontend");

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inlineScriptJson(value: string): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

function toBootOptions(options: FrontendEntryHtmlOptions): string {
  const entries: string[] = [];
  if (options.initialMarkdown) {
    entries.push(`initialMarkdown: ${inlineScriptJson(options.initialMarkdown)}`);
  }
  if (options.projection === "html") {
    entries.push('browserProjection: "html"');
  }
  return entries.length > 0 ? `{ ${entries.join(", ")} }` : "{}";
}

export function normalizeHostFrontendOption(
  frontend: HostFrontendOption | undefined
): NormalizedHostFrontendOptions | null {
  if (!frontend) {
    return null;
  }
  if (frontend === true) {
    return {};
  }
  if (typeof frontend === "string") {
    return { module: frontend };
  }
  const carrier = frontend as FrontendModuleCarrier;
  const taggedModule = carrier[FRONTEND_MODULE_SYMBOL];
  if (taggedModule && typeof taggedModule.moduleUrl === "string") {
    return {
      module: normalizeFrontendModulePath(taggedModule.moduleUrl),
      ...(typeof taggedModule.exportName === "string" ? { exportName: taggedModule.exportName } : {}),
      ...(typeof carrier.title === "string" ? { title: carrier.title } : {})
    };
  }
  return {
    ...(typeof (carrier as HostFrontendOptions).module === "string" ? { module: (carrier as HostFrontendOptions).module } : {}),
    ...(typeof (carrier as HostFrontendOptions).exportName === "string" ? { exportName: (carrier as HostFrontendOptions).exportName } : {}),
    ...(typeof carrier.title === "string" ? { title: carrier.title } : {})
  };
}

function normalizeFrontendModulePath(moduleUrl: string): string {
  return moduleUrl.startsWith("file:")
    ? fileURLToPath(moduleUrl)
    : moduleUrl;
}

export function getBuiltinFrontendStaticFile(pathname: string, frontend: HostFrontendOption | undefined): string | null {
  const normalized = normalizeHostFrontendOption(frontend);
  if (!normalized) {
    return null;
  }
  if (pathname === "/__mdan/entry.js") {
    return builtinEntryFilePath;
  }
  if (pathname === "/__mdan/frontend.js") {
    return builtinFrontendFilePath;
  }
  if (pathname === "/__mdan/module.js" && normalized.module) {
    return ensureBundledFrontendModule(normalized);
  }
  return null;
}

function ensureBundledFrontendModule(frontend: NormalizedHostFrontendOptions): string {
  const sourceModule = frontend.module;
  if (!sourceModule) {
    throw new Error("Expected a frontend module path when building /__mdan/module.js.");
  }

  const exportName = frontend.exportName?.trim() ? frontend.exportName.trim() : "default";
  const hash = createHash("sha256")
    .update(`${sourceModule}:${exportName}`)
    .digest("hex")
    .slice(0, 16);
  const wrapperPath = join(generatedFrontendDir, `${hash}.entry.mjs`);
  const bundlePath = join(generatedFrontendDir, `${hash}.bundle.js`);

  const wrapperSource = `export { ${exportName === "default" ? "default" : `${exportName} as default`} } from ${JSON.stringify(sourceModule)};\n`;

  const existingWrapper = readIfPresent(wrapperPath);
  const needsWrapperWrite = existingWrapper !== wrapperSource;
  if (needsWrapperWrite) {
    mkdirSync(dirname(wrapperPath), { recursive: true });
    writeFileSync(wrapperPath, wrapperSource, "utf8");
  }

  const build = spawnSync(
    "bun",
    [
      "build",
      "--target=browser",
      "--format=esm",
      "--outfile",
      bundlePath,
      wrapperPath
    ],
    {
      stdio: "pipe"
    }
  );

  if (build.status !== 0) {
    const stderr = build.stderr?.toString().trim();
    const stdout = build.stdout?.toString().trim();
    const details = stderr || stdout || "bun build failed";
    throw new Error(`Unable to build frontend module bundle for ${sourceModule}: ${details}`);
  }

  return bundlePath;
}

function readIfPresent(filePath: string): string | null {
  if (!existsSync(filePath)) {
    return null;
  }
  return readFileSync(filePath, "utf8");
}

export function renderBuiltinFrontendEntryHtml(frontend: HostFrontendOption | undefined, options: FrontendEntryHtmlOptions = {}): string {
  const normalized = normalizeHostFrontendOption(frontend);
  const projection =
    options.projection === "html" && options.initialMarkdown
      ? projectReadableSurfaceToHtml(options.initialMarkdown)
      : null;
  const title =
    projection?.metadata.title ??
    (normalized?.title?.trim() ? normalized.title.trim() : "MDAN Entry");
  const description = projection?.metadata.description;
  const bootOptions = toBootOptions(options);
  const rootHtml = projection?.bodyHtml ?? "";
  const script = normalized?.module
    ? `<script type="module">
import * as frontendModule from "/__mdan/module.js";

const frontend =
  ${normalized.exportName ? `frontendModule[${JSON.stringify(normalized.exportName)}] ??\n  ` : ""}\
  frontendModule.default ??
  frontendModule.frontend ??
  Object.values(frontendModule).find((value) => value && typeof value === "object" && typeof value.autoBoot === "function");

if (!frontend || typeof frontend.autoBoot !== "function") {
  throw new Error("Expected /__mdan/module.js to export a frontend object with autoBoot().");
}

frontend.autoBoot(${bootOptions});
</script>`
    : `<script type="module">
import { createFrontend } from "/__mdan/frontend.js";

createFrontend().autoBoot(${bootOptions});
</script>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    ${description ? `<meta name="description" content="${escapeHtml(description)}">` : ""}
    <style>
      html, body {
        margin: 0;
        padding: 0;
        min-height: 100%;
        background: #f8fafc;
        color: #0f172a;
        font: 16px/1.5 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      body {
        padding: 24px;
      }
    </style>
  </head>
  <body>
    <div data-mdan-ui-root>${rootHtml}</div>
    ${script}
  </body>
</html>`;
}
