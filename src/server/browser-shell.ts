import { fileURLToPath } from "node:url";

import { negotiateRepresentation } from "../protocol/negotiate.js";
import type { JsonSurfaceEnvelope } from "../protocol/surface.js";
import { renderSurfaceSnapshot } from "./surface-projection.js";

export interface BrowserShellOptions {
  title?: string;
  rootId?: string;
  moduleMode?: "cdn" | "local-dist";
  surfaceModuleSrc?: string;
  uiModuleSrc?: string;
  initialSurface?: JsonSurfaceEnvelope;
}

const DEFAULT_SURFACE_MODULE_SRC = "https://esm.sh/@mdanai/sdk/surface";
const DEFAULT_UI_MODULE_SRC = "https://esm.sh/@mdanai/sdk/ui";
export const LOCAL_BROWSER_SURFACE_MODULE_PATH = "/__mdan/surface.js";
export const LOCAL_BROWSER_UI_MODULE_PATH = "/__mdan/ui.js";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeScriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function renderBrowserShell(options: BrowserShellOptions = {}): string {
  const title = escapeHtml(options.title ?? "MDAN App");
  const rootId = options.rootId ?? "mdan-app";
  const surfaceModuleSrc =
    options.surfaceModuleSrc ??
    (options.moduleMode === "local-dist" ? LOCAL_BROWSER_SURFACE_MODULE_PATH : DEFAULT_SURFACE_MODULE_SRC);
  const uiModuleSrc =
    options.uiModuleSrc ??
    (options.moduleMode === "local-dist" ? LOCAL_BROWSER_UI_MODULE_PATH : DEFAULT_UI_MODULE_SRC);
  const initialSurface = options.initialSurface;
  const initialSurfaceScript = initialSurface
    ? `<script type="application/json" id="mdan-initial-surface">${escapeScriptJson(initialSurface)}</script>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
  </head>
  <body>
    <main id="${escapeHtml(rootId)}" data-mdan-browser-shell>${renderSurfaceSnapshot(initialSurface)}</main>
    ${initialSurfaceScript}
    <script type="module">
      import { createHeadlessHost } from ${JSON.stringify(surfaceModuleSrc)};
      import { mountMdanUi } from ${JSON.stringify(uiModuleSrc)};

      const root = document.getElementById(${JSON.stringify(rootId)});
      const initialSurfaceElement = document.getElementById("mdan-initial-surface");
      const initialSurface = initialSurfaceElement ? JSON.parse(initialSurfaceElement.textContent ?? "null") : undefined;
      const host = createHeadlessHost({
        initialSurface,
        initialRoute: window.location.pathname + window.location.search
      });
      const runtime = mountMdanUi({ root, host });
      runtime.mount();
      if (!initialSurface) {
        await host.sync();
      }
    </script>
  </body>
</html>`;
}

export function shouldServeBrowserShell(method: string, acceptHeader: string | null | undefined): boolean {
  return method === "GET" && negotiateRepresentation(acceptHeader ?? undefined) === "html";
}

export function resolveLocalBrowserModule(pathname: string, options: BrowserShellOptions | undefined): string | null {
  if (!options || options.moduleMode !== "local-dist") {
    return null;
  }
  if (pathname === LOCAL_BROWSER_SURFACE_MODULE_PATH) {
    return fileURLToPath(new URL("../../dist-browser/surface.js", import.meta.url));
  }
  if (pathname === LOCAL_BROWSER_UI_MODULE_PATH) {
    return fileURLToPath(new URL("../../dist-browser/ui.js", import.meta.url));
  }
  return null;
}
