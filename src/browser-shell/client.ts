import { createHeadlessHost } from "../surface/index.js";
import { mountMdanUi } from "../ui/mount.js";

export interface BrowserShellBootstrapOptions {
  formRendererExportName?: string;
  formRendererModuleSrc?: string;
  initialRoute?: string;
  root: Element | DocumentFragment | null;
}

export async function bootstrapBrowserShell(options: BrowserShellBootstrapOptions): Promise<void> {
  if (!options.root) {
    return;
  }

  let formRenderer;
  if (typeof options.formRendererModuleSrc === "string" && typeof options.formRendererExportName === "string") {
    const module = await import(/* @vite-ignore */ options.formRendererModuleSrc);
    formRenderer = module[options.formRendererExportName];
  }

  const host = createHeadlessHost({
    initialRoute: options.initialRoute ?? window.location.pathname + window.location.search
  });
  const runtime = mountMdanUi({ root: options.root, host, ...(formRenderer ? { formRenderer } : {}) });
  runtime.mount();
  await host.sync();
}
