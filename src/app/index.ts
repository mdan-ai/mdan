import { type ReadableSurface } from "../server/artifact.js";
import { type ActionProofOptions } from "../server/action-proofing.js";
import { createMdanServer } from "../server/runtime.js";
import type {
  MdanActionResult,
  MdanHandler,
  MdanHandlerContext,
  MdanPageHandler,
  MdanPageHandlerContext,
  MdanRequest,
  MdanResponse,
  MdanSessionProvider,
  MdanStreamResult
} from "../server/types.js";

type AppActionVerb = "read" | "write" | "navigate";
type AppTransportMethod = "GET" | "POST";
type AppInputSchemaProperty = Record<string, unknown>;

export interface AppFieldDefinition {
  required?: boolean;
  schema: AppInputSchemaProperty;
}

export interface AppActionDefinition {
  id: string;
  label: string;
  verb: AppActionVerb;
  target: string;
  transport?: {
    method?: AppTransportMethod;
  };
  input?: Record<string, AppFieldDefinition>;
}

export interface AppPageConfig<TRenderArgs extends unknown[]> {
  markdown: string;
  actions?: AppActionDefinition[];
  render: (...args: TRenderArgs) => Record<string, string>;
}

export interface AppBoundPageDefinition {
  path: string;
  render: () => ReadableSurface;
}

export interface AppPageDefinition<TRenderArgs extends unknown[] = []> {
  path: string;
  render: (...args: TRenderArgs) => ReadableSurface;
  bind: (...args: TRenderArgs) => AppBoundPageDefinition;
}

export interface AppMarkdownRenderContext {
  kind: "page" | "block";
  route?: string;
  blockName?: string;
}

export interface AppMarkdownRenderer {
  render(markdown: string, context?: AppMarkdownRenderContext): string;
}

export interface AppBrowserShellOptions {
  title?: string;
  moduleMode?: "cdn" | "local-dist";
}

export interface CreateAppOptions {
  appId?: string;
  session?: MdanSessionProvider;
  actionProof?: ActionProofOptions;
  browserShell?: AppBrowserShellOptions;
  rendering?: {
    markdown?: AppMarkdownRenderer;
  };
}

export interface AppInstance {
  page<TRenderArgs extends unknown[]>(path: string, config: AppPageConfig<TRenderArgs>): AppPageDefinition<TRenderArgs>;
  route(page: AppBoundPageDefinition): void;
  route(page: AppPageDefinition<[]>): void;
  route(path: string, handler: AppPageHandler): void;
  action(path: string, handler: AppActionHandler): void;
  handle(request: MdanRequest): Promise<MdanResponse>;
}

export type AppPageHandler = (
  context: MdanPageHandlerContext
) => Promise<ReadableSurface | null> | ReadableSurface | null;

export type AppActionHandler = (
  context: MdanHandlerContext
) => Promise<ReadableSurface | MdanActionResult | MdanStreamResult> | ReadableSurface | MdanActionResult | MdanStreamResult;

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function resolveTransportMethod(verb: AppActionVerb, method: AppTransportMethod | undefined): AppTransportMethod {
  if (method) {
    return method;
  }
  return verb === "write" ? "POST" : "GET";
}

function compileInputSchema(input: Record<string, AppFieldDefinition> | undefined) {
  const properties = Object.fromEntries(
    Object.entries(input ?? {}).map(([name, definition]) => [name, cloneJson(definition.schema)])
  );
  const required = Object.entries(input ?? {})
    .filter(([, definition]) => definition.required)
    .map(([name]) => name);

  return {
    type: "object",
    ...(required.length > 0 ? { required } : {}),
    properties,
    additionalProperties: false
  };
}

function compileAction(action: AppActionDefinition) {
  return {
    id: action.id,
    label: action.label,
    verb: action.verb,
    target: action.target,
    transport: {
      method: resolveTransportMethod(action.verb, action.transport?.method)
    },
    input_schema: compileInputSchema(action.input)
  };
}

function buildReadableSurface(
  path: string,
  markdown: string,
  regions: Record<string, string>,
  actionDefinitions: AppActionDefinition[]
): ReadableSurface {
  const compiledActions = actionDefinitions.map((action) => compileAction(action));
  return {
    markdown,
    route: path,
    regions,
    actions: {
      blocks: Object.keys(regions),
      actions: cloneJson(compiledActions),
      allowed_next_actions: actionDefinitions.map((action) => action.id)
    }
  };
}

export const fields = {
  string(options: { required?: boolean; password?: boolean } = {}): AppFieldDefinition {
    return {
      required: options.required,
      schema: {
        type: "string",
        ...(options.password ? { format: "password" } : {})
      }
    };
  },
  number(options: { required?: boolean } = {}): AppFieldDefinition {
    return {
      required: options.required,
      schema: {
        type: "number"
      }
    };
  },
  boolean(options: { required?: boolean } = {}): AppFieldDefinition {
    return {
      required: options.required,
      schema: {
        type: "boolean"
      }
    };
  }
};

export const actions = {
  read(id: string, options: Omit<AppActionDefinition, "id" | "verb">): AppActionDefinition {
    return {
      id,
      verb: "read",
      ...options
    };
  },
  write(id: string, options: Omit<AppActionDefinition, "id" | "verb">): AppActionDefinition {
    return {
      id,
      verb: "write",
      ...options
    };
  },
  navigate(id: string, options: Omit<AppActionDefinition, "id" | "verb">): AppActionDefinition {
    return {
      id,
      verb: "navigate",
      ...options
    };
  }
};

export function createApp(options: CreateAppOptions = {}): AppInstance {
  const { rendering, ...serverOptions } = options;
  const server = createMdanServer({
    ...serverOptions,
    browserShell: {
      ...serverOptions.browserShell,
      ...(rendering?.markdown ? { markdownRenderer: rendering.markdown } : {})
    }
  });
  const page: AppInstance["page"] = <TRenderArgs extends unknown[]>(
    path: string,
    config: AppPageConfig<TRenderArgs>
  ): AppPageDefinition<TRenderArgs> => ({
    path,
    render: (...args: TRenderArgs) => buildReadableSurface(
      path,
      config.markdown,
      config.render(...args),
      config.actions ?? []
      ),
    bind: (...args: TRenderArgs) => ({
      path,
      render: () => buildReadableSurface(
        path,
        config.markdown,
        config.render(...args),
        config.actions ?? []
      )
    })
  });

  const route = ((pathOrPage: string | AppBoundPageDefinition | AppPageDefinition<[]>, handler?: AppPageHandler) => {
    if (typeof pathOrPage === "string") {
      server.page(pathOrPage, handler as MdanPageHandler);
      return;
    }
    server.page(pathOrPage.path, async () => pathOrPage.render());
  }) as AppInstance["route"];

  return {
    page,
    route,
    action(path: string, handler: AppActionHandler): void {
      server.post(path, handler as MdanHandler);
    },
    handle: server.handle
  };
}
