import { fileURLToPath } from "node:url";

import { negotiateRepresentation } from "../protocol/negotiate.js";
import type { MdanPage } from "../protocol/types.js";
import {
  renderInitialProjection,
  type ReadableSurface,
  type RenderSurfaceSnapshotOptions
} from "./artifact.js";

export interface BrowserShellOptions {
  title?: string;
  rootId?: string;
  moduleMode?: "cdn" | "local-dist";
  browserShellModuleSrc?: string;
  surfaceModuleSrc?: string;
  uiModuleSrc?: string;
  initialReadableSurface?: ReadableSurface;
  initialPage?: MdanPage;
  markdownRenderer?: RenderSurfaceSnapshotOptions["markdownRenderer"];
  hydrate?: boolean;
}

const DEFAULT_BROWSER_SHELL_MODULE_SRC = "https://esm.sh/@mdanai/sdk/dist-browser/browser-shell.js";
const DEFAULT_SURFACE_MODULE_SRC = "https://esm.sh/@mdanai/sdk/surface";
const DEFAULT_UI_MODULE_SRC = "https://esm.sh/@mdanai/sdk/dist-browser/ui.js";
export const LOCAL_BROWSER_SHELL_MODULE_PATH = "/__mdan/browser-shell.js";
export const LOCAL_BROWSER_SURFACE_MODULE_PATH = "/__mdan/surface.js";
export const LOCAL_BROWSER_UI_MODULE_PATH = "/__mdan/ui.js";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderBrowserShell(options: BrowserShellOptions = {}): string {
  const title = escapeHtml(options.title ?? "MDAN App");
  const rootId = options.rootId ?? "mdan-app";
  const initialReadableSurface = options.initialReadableSurface;
  const initialPage = options.initialPage;
  const shouldHydrate = options.hydrate !== false && !initialPage && !initialReadableSurface;
  const browserShellModuleSrc =
    options.browserShellModuleSrc ??
    (options.moduleMode === "local-dist" ? LOCAL_BROWSER_SHELL_MODULE_PATH : DEFAULT_BROWSER_SHELL_MODULE_SRC);
  const surfaceModuleSrc =
    options.surfaceModuleSrc ??
    (options.moduleMode === "local-dist" ? LOCAL_BROWSER_SURFACE_MODULE_PATH : DEFAULT_SURFACE_MODULE_SRC);
  const uiModuleSrc =
    options.uiModuleSrc ??
    (options.moduleMode === "local-dist" ? LOCAL_BROWSER_UI_MODULE_PATH : DEFAULT_UI_MODULE_SRC);
  const usesLegacySplitModules = Boolean(options.surfaceModuleSrc || options.uiModuleSrc);
  const clientRuntimeScript =
    !shouldHydrate
      ? ""
      : usesLegacySplitModules
        ? `    <script type="module">
      import { createHeadlessHost } from ${JSON.stringify(surfaceModuleSrc)};
      import { mountMdanUi } from ${JSON.stringify(uiModuleSrc)};

      const root = document.getElementById(${JSON.stringify(rootId)});
      const host = createHeadlessHost({
        initialRoute: window.location.pathname + window.location.search
      });
      const runtime = mountMdanUi({ root, host });
      runtime.mount();
      await host.sync();
    </script>`
        : `    <script type="module">
      import { bootstrapBrowserShell } from ${JSON.stringify(browserShellModuleSrc)};

      await bootstrapBrowserShell({
        root: document.getElementById(${JSON.stringify(rootId)}),
        initialRoute: window.location.pathname + window.location.search
      });
    </script>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
  </head>
  <body>
    <main id="${escapeHtml(rootId)}" data-mdan-browser-shell>${renderInitialProjection(initialPage, initialReadableSurface, {
      markdownRenderer: options.markdownRenderer
    })}</main>
${clientRuntimeScript}
  </body>
</html>`;
}

export function shouldServeBrowserShell(method: string, acceptHeader: string | null | undefined): boolean {
  return method === "GET" && typeof acceptHeader === "string" && negotiateRepresentation(acceptHeader) === "html";
}

export function resolveLocalBrowserModule(pathname: string, options: BrowserShellOptions | undefined): string | null {
  if (!options || options.moduleMode !== "local-dist") {
    return null;
  }
  if (pathname === LOCAL_BROWSER_SHELL_MODULE_PATH) {
    return fileURLToPath(new URL("../../dist-browser/browser-shell.js", import.meta.url));
  }
  if (pathname === LOCAL_BROWSER_SURFACE_MODULE_PATH) {
    return fileURLToPath(new URL("../../dist-browser/surface.js", import.meta.url));
  }
  if (pathname === LOCAL_BROWSER_UI_MODULE_PATH) {
    return fileURLToPath(new URL("../../dist-browser/ui.js", import.meta.url));
  }
  return null;
}
