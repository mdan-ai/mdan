import { fileURLToPath } from "node:url";

export interface HostFrontendOptions {
  module?: string;
  title?: string;
}

export type HostFrontendOption = boolean | string | HostFrontendOptions;

export interface NormalizedHostFrontendOptions {
  module?: string;
  title?: string;
}

const builtinEntryFilePath = fileURLToPath(new URL("../../../dist-browser/entry.js", import.meta.url));
const builtinFrontendFilePath = fileURLToPath(new URL("../../../dist-browser/frontend.js", import.meta.url));

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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
  return {
    ...(typeof frontend.module === "string" ? { module: frontend.module } : {}),
    ...(typeof frontend.title === "string" ? { title: frontend.title } : {})
  };
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
  if (pathname === "/__mdan/app-frontend.js" && normalized.module) {
    return normalized.module;
  }
  return null;
}

export function renderBuiltinFrontendEntryHtml(frontend: HostFrontendOption | undefined): string {
  const normalized = normalizeHostFrontendOption(frontend);
  const title = normalized?.title?.trim() ? normalized.title.trim() : "MDAN Entry";
  const script = normalized?.module
    ? `<script type="module">
import * as frontendModule from "/__mdan/app-frontend.js";

const frontend =
  frontendModule.default ??
  frontendModule.frontend ??
  Object.values(frontendModule).find((value) => value && typeof value === "object" && typeof value.autoBoot === "function");

if (!frontend || typeof frontend.autoBoot !== "function") {
  throw new Error("Expected /__mdan/app-frontend.js to export a frontend object with autoBoot().");
}

frontend.autoBoot();
</script>`
    : '<script type="module" src="/__mdan/entry.js"></script>';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
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
    <div data-mdan-ui-root></div>
    ${script}
  </body>
</html>`;
}
