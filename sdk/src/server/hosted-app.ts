import type { MdanComposedPage } from "../core/index.js";

import { block as createBlockResult } from "./result.js";
import { createMdanServer, type CreateMdanServerOptions } from "./runtime.js";
import type { MdanActionResult, MdanHandlerContext, MdanHandlerResult, MdanPageHandlerContext } from "./types.js";

export interface HostedPageContext extends MdanPageHandlerContext {
  routePath: string;
}

export interface HostedPageFactory {
  (context: HostedPageContext): MdanComposedPage;
}

export interface HostedActionContext extends MdanHandlerContext, HostedPageContext {
  routePath: string;
  blockName: string;
  page(routePath?: string): MdanComposedPage;
  pageResult(pageOrRoute?: string | MdanComposedPage, result?: Omit<MdanActionResult, "page" | "fragment">): MdanActionResult;
  block(result?: Omit<MdanActionResult, "fragment">): MdanActionResult;
}

export type HostedAction = (context: HostedActionContext) => Promise<MdanHandlerResult> | MdanHandlerResult;

export interface HostedActionDefinition {
  target: string;
  routePath: string;
  blockName: string;
  methods: Array<"GET" | "POST">;
  handler: HostedAction;
}

export interface CreateHostedAppOptions extends CreateMdanServerOptions {
  pages: Record<string, HostedPageFactory>;
  actions?: HostedActionDefinition[];
}

interface ActionBinding {
  routePath: string;
  blockName: string;
  method: "GET" | "POST";
  target: string;
  handler: HostedAction;
}

function createBindingKey(method: "GET" | "POST", target: string): string {
  return `${method}:${target}`;
}

function renderPage(factory: HostedPageFactory, context: HostedPageContext): MdanComposedPage {
  const page = factory(context);
  if (typeof page.fragment !== "function") {
    throw new Error(`Hosted page "${context.routePath}" must return a composed page created by composePage().`);
  }
  return page;
}

function buildBindings(
  pages: Record<string, HostedPageFactory>,
  actions: HostedActionDefinition[] | undefined
): Map<string, ActionBinding> {
  const bindings = new Map<string, ActionBinding>();

  for (const action of actions ?? []) {
    if (!pages[action.routePath]) {
      throw new Error(`Unknown hosted page route "${action.routePath}" for action "${action.target}".`);
    }
    if (action.methods.length === 0) {
      throw new Error(`Hosted action "${action.target}" must declare at least one method.`);
    }
    if (!action.blockName.trim()) {
      throw new Error(`Hosted action "${action.target}" must declare a non-empty blockName.`);
    }

    const uniqueMethods = new Set(action.methods);
    if (uniqueMethods.size !== action.methods.length) {
      throw new Error(`Hosted action "${action.target}" cannot declare duplicate methods.`);
    }

    for (const method of uniqueMethods) {
      if (method === "GET" && pages[action.target]) {
        throw new Error(`GET ${action.target} cannot share the same path as a hosted page route.`);
      }

      const key = createBindingKey(method, action.target);
      if (bindings.has(key)) {
        throw new Error(`${method} ${action.target} must bind to one stable block context.`);
      }

      bindings.set(key, {
        routePath: action.routePath,
        blockName: action.blockName,
        method,
        target: action.target,
        handler: action.handler
      });
    }
  }

  return bindings;
}

export function createHostedApp(options: CreateHostedAppOptions) {
  const server = createMdanServer(options);
  const bindings = buildBindings(options.pages, options.actions);

  for (const [routePath, factory] of Object.entries(options.pages)) {
    server.page(routePath, async (context) => renderPage(factory, { ...context, routePath }));
  }

  for (const binding of bindings.values()) {
    const register = binding.method === "GET" ? server.get.bind(server) : server.post.bind(server);
    register(binding.target, async (context) => {
      const routeFactory = options.pages[binding.routePath];
      if (!routeFactory) {
        throw new Error(`Missing hosted page renderer for "${binding.routePath}".`);
      }

      return binding.handler({
        ...context,
        routePath: binding.routePath,
        blockName: binding.blockName,
        page(routePath = binding.routePath) {
          const pageFactory = options.pages[routePath];
          if (!pageFactory) {
            throw new Error(`Unknown hosted page route "${routePath}".`);
          }
          return renderPage(pageFactory, {
            request: context.request,
            session: context.session,
            routePath
          });
        },
        pageResult(pageOrRoute = binding.routePath, result = {}) {
          const resolvedRoutePath = typeof pageOrRoute === "string" ? pageOrRoute : binding.routePath;
          const page =
            typeof pageOrRoute === "string"
              ? (() => {
                  const pageFactory = options.pages[pageOrRoute];
                  if (!pageFactory) {
                    throw new Error(`Unknown hosted page route "${pageOrRoute}".`);
                  }
                  return renderPage(pageFactory, {
                    request: context.request,
                    session: context.session,
                    routePath: pageOrRoute
                  });
                })()
              : pageOrRoute;
          return {
            status: 200,
            ...result,
            route: resolvedRoutePath,
            page
          };
        },
        block(result = {}) {
          return createBlockResult(
            renderPage(routeFactory, {
              request: context.request,
              session: context.session,
              routePath: binding.routePath
            }),
            binding.blockName,
            {
              ...result,
              route: binding.routePath
            }
          );
        }
      });
    });
  }

  return server;
}
