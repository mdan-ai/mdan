import { resolveMountedFile } from "./static-files.js";
import { extname } from "node:path";

export interface HostStaticMount {
  urlPrefix: string;
  directory: string;
}

export interface HostRoutingOptions {
  rootRedirect?: string;
  ignoreFavicon?: boolean;
  frontendEntry?: string;
  staticFiles?: Record<string, string>;
  staticMounts?: HostStaticMount[];
}

export type HostRequestPlan =
  | { kind: "redirect"; location: string }
  | { kind: "favicon" }
  | { kind: "static-candidates"; filePaths: string[] }
  | { kind: "runtime"; pathnameOverride?: string };

function stripMarkdownRouteSuffix(pathname: string): string | null {
  if (pathname === "/index.md") {
    return "/";
  }
  if (!pathname.endsWith(".md")) {
    return null;
  }
  const stripped = pathname.slice(0, -3);
  return stripped.length > 0 ? stripped : "/";
}

function shouldServeFrontendEntry(
  pathname: string,
  method: string,
  acceptHeader: string | null | undefined,
  options: HostRoutingOptions
): boolean {
  if (!options.frontendEntry || method !== "GET") {
    return false;
  }
  if (pathname === "/favicon.ico" || pathname.startsWith("/__mdan/")) {
    return false;
  }
  if (pathname.endsWith(".md")) {
    return false;
  }
  if (pathname !== "/" && extname(pathname) !== "") {
    return false;
  }
  const accept = (acceptHeader ?? "").toLowerCase();
  return accept.includes("text/html");
}

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

  if (shouldServeFrontendEntry(pathname, method, acceptHeader, options)) {
    return { kind: "static-candidates", filePaths: [options.frontendEntry!] };
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

  if (filePaths.length > 0) {
    return { kind: "static-candidates", filePaths };
  }

  const pathnameOverride = stripMarkdownRouteSuffix(pathname);
  return pathnameOverride ? { kind: "runtime", pathnameOverride } : { kind: "runtime" };
}
