import { extname, resolve } from "node:path";

export function getStaticContentType(filePath: string): string {
  const extension = extname(filePath);
  return extension === ".js" || extension === ".mjs"
    ? "text/javascript"
    : extension === ".css"
      ? "text/css"
      : extension === ".map" || extension === ".json"
        ? "application/json"
        : extension === ".html"
          ? "text/html"
          : extension === ".svg"
            ? "image/svg+xml"
            : extension === ".txt"
              ? "text/plain"
              : "application/octet-stream";
}

export function resolveMountedFile(directory: string, urlPrefix: string, pathname: string): string | null {
  const normalizedPrefix =
    urlPrefix.length > 1 && urlPrefix.endsWith("/") ? urlPrefix.slice(0, -1) : urlPrefix;

  if (normalizedPrefix === "/") {
    const baseDirectory = resolve(directory);
    const target = resolve(baseDirectory, pathname.replace(/^\/+/, ""));
    if (target !== baseDirectory && !target.startsWith(`${baseDirectory}/`)) {
      return null;
    }
    return target;
  }

  if (pathname !== normalizedPrefix && !pathname.startsWith(`${normalizedPrefix}/`)) {
    return null;
  }

  const relativePath = pathname.slice(normalizedPrefix.length).replace(/^\/+/, "");
  const baseDirectory = resolve(directory);
  const target = resolve(baseDirectory, relativePath);
  if (target !== baseDirectory && !target.startsWith(`${baseDirectory}/`)) {
    return null;
  }
  return target;
}
