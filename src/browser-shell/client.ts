import { createHeadlessHost } from "../surface/index.js";
import { mountMdanUi } from "../ui/mount.js";

export interface BrowserShellBootstrapOptions {
  initialRoute?: string;
  root: Element | DocumentFragment | null;
}

export async function bootstrapBrowserShell(options: BrowserShellBootstrapOptions): Promise<void> {
  if (!options.root) {
    return;
  }

  const host = createHeadlessHost({
    initialRoute: options.initialRoute ?? window.location.pathname + window.location.search
  });
  const runtime = mountMdanUi({ root: options.root, host });
  runtime.mount();
  await host.sync();
}
