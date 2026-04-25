import { basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { negotiateRepresentation } from "../protocol/negotiate.js";
import type { MdanPage } from "../protocol/types.js";
import { getDefinedFormRendererDefinition, type DefinedUiFormRenderer } from "../form-renderer.js";
import {
  renderInitialProjection,
  type ReadableSurface,
  type RenderSurfaceSnapshotOptions
} from "./markdown-surface.js";
import { resolveMountedFile } from "./static-files.js";

export interface BrowserShellOptions {
  title?: string;
  rootId?: string;
  moduleMode?: "cdn" | "local-dist";
  browserShellModuleSrc?: string;
  initialReadableSurface?: ReadableSurface;
  initialPage?: MdanPage;
  markdownRenderer?: RenderSurfaceSnapshotOptions["markdownRenderer"];
  formRenderer?: DefinedUiFormRenderer;
  hydrate?: boolean;
}

const DEFAULT_BROWSER_SHELL_MODULE_SRC = "https://esm.sh/@mdanai/sdk/dist-browser/browser-shell.js";
const DEFAULT_FORM_RENDERER_RUNTIME_MODULE_SRC = "https://esm.sh/@mdanai/sdk/dist-browser/form-renderer.js";
export const LOCAL_BROWSER_SHELL_MODULE_PATH = "/__mdan/browser-shell.js";
export const LOCAL_BROWSER_SURFACE_MODULE_PATH = "/__mdan/surface.js";
export const LOCAL_BROWSER_UI_MODULE_PATH = "/__mdan/ui.js";
export const LOCAL_BROWSER_FORM_RENDERER_RUNTIME_MODULE_PATH = "/__mdan/form-renderer.js";
export const LOCAL_BROWSER_APP_FORM_RENDERER_PREFIX = "/__mdan/app-form-renderer";

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
  const formRendererDefinition = resolveBrowserFormRenderer(options.formRenderer);
  const formRendererRuntimeModuleSrc =
    options.moduleMode === "local-dist"
      ? LOCAL_BROWSER_FORM_RENDERER_RUNTIME_MODULE_PATH
      : DEFAULT_FORM_RENDERER_RUNTIME_MODULE_SRC;
  const importMapScript = formRendererDefinition
    ? `    <script type="importmap">
      {
        "imports": {
          "@mdanai/sdk/form-renderer": ${JSON.stringify(formRendererRuntimeModuleSrc)}
        }
      }
    </script>`
    : "";
  const clientRuntimeScript =
    !shouldHydrate
      ? ""
      : `    <script type="module">
      import { bootstrapBrowserShell } from ${JSON.stringify(browserShellModuleSrc)};

      await bootstrapBrowserShell({
        root: document.getElementById(${JSON.stringify(rootId)}),
        initialRoute: window.location.pathname + window.location.search${
          formRendererDefinition
            ? `,
        formRendererModuleSrc: ${JSON.stringify(formRendererDefinition.moduleSrc)},
        formRendererExportName: ${JSON.stringify(formRendererDefinition.exportName)}`
            : ""
        }
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
      markdownRenderer: options.markdownRenderer,
      formRenderer: options.formRenderer
    })}</main>
${importMapScript}
${clientRuntimeScript}
  </body>
</html>`;
}

export function shouldServeBrowserShell(method: string, acceptHeader: string | null | undefined): boolean {
  return method === "GET" && typeof acceptHeader === "string" && negotiateRepresentation(acceptHeader) === "html";
}

export function resolveLocalBrowserModule(pathname: string, options: BrowserShellOptions | undefined): string | null {
  if (!options) {
    return null;
  }
  const formRendererDefinition = resolveBrowserFormRenderer(options.formRenderer);
  if (formRendererDefinition) {
    const resolvedRendererFile = resolveMountedFile(
      formRendererDefinition.directoryPath,
      LOCAL_BROWSER_APP_FORM_RENDERER_PREFIX,
      pathname
    );
    if (resolvedRendererFile) {
      return resolvedRendererFile;
    }
  }
  if (options.moduleMode !== "local-dist") {
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
  if (pathname === LOCAL_BROWSER_FORM_RENDERER_RUNTIME_MODULE_PATH) {
    return fileURLToPath(new URL("../../dist-browser/form-renderer.js", import.meta.url));
  }
  return null;
}

function resolveBrowserFormRenderer(formRenderer: DefinedUiFormRenderer | undefined): {
  directoryPath: string;
  exportName: string;
  moduleSrc: string;
} | null {
  const definition = getDefinedFormRendererDefinition(formRenderer);
  if (!definition) {
    return null;
  }
  const entryFilePath = fileURLToPath(definition.moduleUrl);
  return {
    directoryPath: dirname(entryFilePath),
    exportName: definition.exportName,
    moduleSrc: `${LOCAL_BROWSER_APP_FORM_RENDERER_PREFIX}/${basename(entryFilePath)}`
  };
}
