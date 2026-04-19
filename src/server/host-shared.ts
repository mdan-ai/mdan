import type { BrowserShellOptions } from "./browser-shell.js";
import { resolveLocalBrowserModule, shouldServeBrowserShell } from "./browser-shell.js";
import { resolveMountedFile } from "./static-files.js";

export interface HostStaticMount {
  urlPrefix: string;
  directory: string;
}

export interface HostRoutingOptions {
  rootRedirect?: string;
  ignoreFavicon?: boolean;
  staticFiles?: Record<string, string>;
  staticMounts?: HostStaticMount[];
  browserShell?: BrowserShellOptions;
}

export type HostRequestPlan =
  | { kind: "redirect"; location: string }
  | { kind: "favicon" }
  | { kind: "local-browser-module"; filePath: string }
  | { kind: "browser-shell" }
  | { kind: "static-candidates"; filePaths: string[] }
  | { kind: "runtime" };

export function planHostRequest(
  pathname: string,
  method: string,
  acceptHeader: string | null | undefined,
  options: HostRoutingOptions
): HostRequestPlan {
  if (options.rootRedirect && pathname === "/") {
    return { kind: "redirect", location: options.rootRedirect };
  }

  if (options.ignoreFavicon !== false && pathname === "/favicon.ico") {
    return { kind: "favicon" };
  }

  const localBrowserModule = resolveLocalBrowserModule(pathname, options.browserShell);
  if (localBrowserModule) {
    return { kind: "local-browser-module", filePath: localBrowserModule };
  }

  if (options.browserShell && shouldServeBrowserShell(method, acceptHeader)) {
    return { kind: "browser-shell" };
  }

  const filePaths: string[] = [];
  const staticFile = options.staticFiles?.[pathname];
  if (staticFile) {
    filePaths.push(staticFile);
  }
  for (const mount of options.staticMounts ?? []) {
    const target = resolveMountedFile(mount.directory, mount.urlPrefix, pathname);
    if (target) {
      filePaths.push(target);
    }
  }

  return filePaths.length > 0 ? { kind: "static-candidates", filePaths } : { kind: "runtime" };
}
