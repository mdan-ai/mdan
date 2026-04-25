import type { MdanHandler, MdanPageHandler } from "./types/handler.js";

export interface MdanRouteMatch<THandler> {
  handler: THandler;
  params: Record<string, string>;
  routePath: string;
}

interface RegisteredRoute<THandler> {
  path: string;
  handler: THandler;
}

export function matchRoutePattern(pattern: string, pathname: string): Record<string, string> | null {
  if (pattern === pathname) {
    return {};
  }

  const patternSegments = pattern.split("/").filter(Boolean);
  const pathSegments = pathname.split("/").filter(Boolean);
  if (patternSegments.length !== pathSegments.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let index = 0; index < patternSegments.length; index += 1) {
    const patternSegment = patternSegments[index];
    const pathSegment = pathSegments[index];
    if (!patternSegment || !pathSegment) {
      return null;
    }

    if (patternSegment.startsWith(":")) {
      const key = patternSegment.slice(1).trim();
      if (!key) {
        return null;
      }
      try {
        params[key] = decodeURIComponent(pathSegment);
      } catch {
        return null;
      }
      continue;
    }

    if (patternSegment !== pathSegment) {
      return null;
    }
  }

  return params;
}

export class MdanRouter {
  private readonly getHandlers: RegisteredRoute<MdanHandler>[] = [];
  private readonly postHandlers: RegisteredRoute<MdanHandler>[] = [];
  private readonly pageHandlers: RegisteredRoute<MdanPageHandler>[] = [];

  get(path: string, handler: MdanHandler): void {
    this.getHandlers.push({ path, handler });
  }

  post(path: string, handler: MdanHandler): void {
    this.postHandlers.push({ path, handler });
  }

  page(path: string, handler: MdanPageHandler): void {
    this.pageHandlers.push({ path, handler });
  }

  resolve(method: "GET" | "POST", path: string): MdanRouteMatch<MdanHandler> | undefined {
    if (method === "GET") {
      return this.findMatch(this.getHandlers, path);
    }
    return this.findMatch(this.postHandlers, path);
  }

  resolvePage(path: string): MdanRouteMatch<MdanPageHandler> | undefined {
    return this.findMatch(this.pageHandlers, path);
  }

  private findMatch<THandler>(
    routes: RegisteredRoute<THandler>[],
    pathname: string
  ): MdanRouteMatch<THandler> | undefined {
    for (const route of routes) {
      const params = matchRoutePattern(route.path, pathname);
      if (!params) {
        continue;
      }

      return {
        handler: route.handler,
        params,
        routePath: route.path
      };
    }

    return undefined;
  }
}
