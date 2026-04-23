import type { MdanPage } from "../protocol/types.js";
import { type ReadableSurface } from "../server/markdown-surface.js";
import { type ActionProofOptions } from "../server/action-proofing.js";
import { createMdanServer } from "../server/runtime.js";
import type {
  MdanActionResult,
  MdanHandler,
  MdanHandlerContext,
  MdanPageResult,
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
const appActionDefinitionsSymbol = Symbol("mdan.app.action-definitions");

export interface AppFieldDefinition {
  required?: boolean;
  schema: AppInputSchemaProperty;
}

export type AppFieldMap = Record<string, AppFieldDefinition>;

type RequiredFieldKeys<TFields extends AppFieldMap> = {
  [K in keyof TFields]: TFields[K]["required"] extends true ? K : never;
}[keyof TFields];

type OptionalFieldKeys<TFields extends AppFieldMap> = Exclude<keyof TFields, RequiredFieldKeys<TFields>>;

type SchemaPrimitiveFromType<TType> =
  TType extends "string" ? string :
  TType extends "number" ? number :
  TType extends "integer" ? number :
  TType extends "boolean" ? boolean :
  unknown;

type SchemaValue<TSchema> =
  TSchema extends { enum: readonly (infer TEnum)[] } ? TEnum :
  TSchema extends { type: "array"; items: infer TItemSchema } ? SchemaValue<TItemSchema>[] :
  TSchema extends { type: "object"; properties: infer TProps; required?: readonly (infer TRequired)[] }
    ? TProps extends Record<string, unknown>
      ? (
          { [K in Extract<TRequired, keyof TProps>]-?: SchemaValue<TProps[K]> } &
          { [K in Exclude<keyof TProps, Extract<TRequired, keyof TProps>>]?: SchemaValue<TProps[K]> }
        )
      : Record<string, unknown>
    : TSchema extends { type: infer TType }
      ? SchemaPrimitiveFromType<TType>
      : unknown;

type FieldValue<TField extends AppFieldDefinition> = SchemaValue<TField["schema"]>;

export type InferAppInputs<TFields extends AppFieldMap> =
  { [K in RequiredFieldKeys<TFields>]: FieldValue<TFields[K]> } &
  { [K in OptionalFieldKeys<TFields>]?: FieldValue<TFields[K]> };

export interface AppActionDefinition {
  id: string;
  label: string;
  verb: AppActionVerb;
  target: string;
  auto?: boolean;
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

type AppPageWithActionDefinitions<TRenderArgs extends unknown[] = []> = AppPageDefinition<TRenderArgs> & {
  [appActionDefinitionsSymbol]?: AppActionDefinition[];
};

type AppBoundPageWithActionDefinitions = AppBoundPageDefinition & {
  [appActionDefinitionsSymbol]?: AppActionDefinition[];
};

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
  bindActions(
    page: AppPageDefinition<unknown[]> | AppBoundPageDefinition,
    handlers: Record<string, AppActionHandler>
  ): void;
  action<TInputs extends MdanInputMap = MdanInputMap>(
    path: string,
    options: { method?: AppTransportMethod },
    handler: AppActionHandler<TInputs>
  ): void;
  action<TInputs extends MdanInputMap = MdanInputMap>(path: string, handler: AppActionHandler<TInputs>): void;
  handle(request: MdanRequest): Promise<MdanResponse>;
}

export type AppPageHandler = (
  context: MdanPageHandlerContext
) => Promise<ReadableSurface | MdanPage | MdanPageResult | null> | ReadableSurface | MdanPage | MdanPageResult | null;

export type AppActionHandler<TInputs extends MdanInputMap = MdanInputMap> = (
  context: Omit<MdanHandlerContext, "inputs"> & { inputs: TInputs }
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

function compileObjectFieldSchema(shape: AppFieldMap): AppInputSchemaProperty {
  const properties = Object.fromEntries(
    Object.entries(shape).map(([name, definition]) => [name, cloneJson(definition.schema)])
  );
  const required = Object.entries(shape)
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
  const method = resolveTransportMethod(action.verb, action.transport?.method);
  return {
    id: action.id,
    label: action.label,
    verb: action.verb,
    target: action.target,
    ...(method === "GET" && action.auto === true ? { auto: true } : {}),
    transport: {
      method
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
  string(
    options: {
      required?: boolean;
      password?: boolean;
      minLength?: number;
      maxLength?: number;
      pattern?: string;
    } = {}
  ): AppFieldDefinition {
    return {
      required: options.required,
      schema: {
        type: "string",
        ...(options.password ? { format: "password" } : {}),
        ...(typeof options.minLength === "number" ? { minLength: options.minLength } : {}),
        ...(typeof options.maxLength === "number" ? { maxLength: options.maxLength } : {}),
        ...(typeof options.pattern === "string" ? { pattern: options.pattern } : {})
      }
    };
  },
  number(options: { required?: boolean; min?: number; max?: number } = {}): AppFieldDefinition {
    return {
      required: options.required,
      schema: {
        type: "number",
        ...(typeof options.min === "number" ? { minimum: options.min } : {}),
        ...(typeof options.max === "number" ? { maximum: options.max } : {})
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
  },
  enum<const TValues extends readonly string[]>(
    values: TValues,
    options: { required?: boolean; description?: string } = {}
  ): AppFieldDefinition {
    return {
      required: options.required,
      schema: {
        type: "string",
        enum: [...values],
        ...(typeof options.description === "string" ? { description: options.description } : {})
      }
    };
  },
  date(options: { required?: boolean; description?: string } = {}): AppFieldDefinition {
    return {
      required: options.required,
      schema: {
        type: "string",
        format: "date",
        ...(typeof options.description === "string" ? { description: options.description } : {})
      }
    };
  },
  datetime(options: { required?: boolean; description?: string } = {}): AppFieldDefinition {
    return {
      required: options.required,
      schema: {
        type: "string",
        format: "date-time",
        ...(typeof options.description === "string" ? { description: options.description } : {})
      }
    };
  },
  array(
    item: AppFieldDefinition,
    options: { required?: boolean; minItems?: number; maxItems?: number } = {}
  ): AppFieldDefinition {
    return {
      required: options.required,
      schema: {
        type: "array",
        items: cloneJson(item.schema),
        ...(typeof options.minItems === "number" ? { minItems: options.minItems } : {}),
        ...(typeof options.maxItems === "number" ? { maxItems: options.maxItems } : {})
      }
    };
  },
  object(shape: AppFieldMap, options: { required?: boolean } = {}): AppFieldDefinition {
    return {
      required: options.required,
      schema: compileObjectFieldSchema(shape)
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
  const declaredActionMethodsByPath = new Map<string, Set<AppTransportMethod>>();
  const registeredActionMethodsByPath = new Map<string, Set<AppTransportMethod>>();
  const registeredPageRoutes = new Set<string>();
  let validatedActionTransport = false;

  function registerDeclaredActionDefinitions(definitions: AppActionDefinition[] | undefined): void {
    for (const definition of definitions ?? []) {
      const method = resolveTransportMethod(definition.verb, definition.transport?.method);
      const methods = declaredActionMethodsByPath.get(definition.target) ?? new Set<AppTransportMethod>();
      methods.add(method);
      declaredActionMethodsByPath.set(definition.target, methods);
    }
  }

  function registerActionHandlerMethod(path: string, method: AppTransportMethod): void {
    const methods = registeredActionMethodsByPath.get(path) ?? new Set<AppTransportMethod>();
    methods.add(method);
    registeredActionMethodsByPath.set(path, methods);
  }

  function validateActionTransportConsistency(): void {
    for (const [path, declaredMethods] of declaredActionMethodsByPath.entries()) {
      const registeredMethods = registeredActionMethodsByPath.get(path) ?? new Set<AppTransportMethod>();
      for (const method of declaredMethods) {
        if (method === "GET" && registeredPageRoutes.has(path)) {
          continue;
        }
        if (!registeredMethods.has(method)) {
          console.warn(
            `[mdan-sdk] Action transport mismatch on "${path}": declared ${method} action but no matching app.action handler is registered.`
          );
        }
      }
      for (const method of registeredMethods) {
        if (!declaredMethods.has(method)) {
          console.warn(
            `[mdan-sdk] Action transport mismatch on "${path}": app.action registered ${method} handler, but no page action declares that method for this target.`
          );
        }
      }
    }
  }

  const page: AppInstance["page"] = <TRenderArgs extends unknown[]>(
    path: string,
    config: AppPageConfig<TRenderArgs>
  ): AppPageDefinition<TRenderArgs> => {
    const actionDefinitions = config.actions ?? [];
    return {
      path,
      render: (...args: TRenderArgs) => buildReadableSurface(
        path,
        config.markdown,
        config.render(...args),
        actionDefinitions
      ),
      bind: (...args: TRenderArgs) => ({
        path,
        render: () => buildReadableSurface(
          path,
          config.markdown,
          config.render(...args),
          actionDefinitions
        ),
        [appActionDefinitionsSymbol]: actionDefinitions
      }),
      [appActionDefinitionsSymbol]: actionDefinitions
    };
  };

  const route = ((pathOrPage: string | AppBoundPageDefinition | AppPageDefinition<[]>, handler?: AppPageHandler) => {
    if (typeof pathOrPage === "string") {
      registeredPageRoutes.add(pathOrPage);
      server.page(pathOrPage, handler as MdanPageHandler);
      return;
    }
    registerDeclaredActionDefinitions(
      (pathOrPage as AppPageWithActionDefinitions | AppBoundPageWithActionDefinitions)[appActionDefinitionsSymbol]
    );
    registeredPageRoutes.add(pathOrPage.path);
    server.page(pathOrPage.path, async () => pathOrPage.render());
  }) as AppInstance["route"];

  const action: AppInstance["action"] = (
    path: string,
    optionsOrHandler: { method?: AppTransportMethod } | AppActionHandler,
    maybeHandler?: AppActionHandler
  ): void => {
    const hasOptions = typeof optionsOrHandler !== "function";
    const method = hasOptions ? optionsOrHandler.method ?? "POST" : "POST";
    const handler = hasOptions ? maybeHandler : optionsOrHandler;
    if (!handler) {
      throw new Error("app.action requires a handler");
    }
    registerActionHandlerMethod(path, method);
    if (method === "GET") {
      server.get(path, handler as MdanHandler);
      return;
    }
    server.post(path, handler as MdanHandler);
  };

  const bindActions: AppInstance["bindActions"] = (
    page: AppPageDefinition<unknown[]> | AppBoundPageDefinition,
    handlers: Record<string, AppActionHandler>
  ): void => {
    const definitions =
      (page as AppPageWithActionDefinitions | AppBoundPageWithActionDefinitions)[appActionDefinitionsSymbol] ?? [];
    const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));

    for (const [id, handler] of Object.entries(handlers)) {
      const definition = definitionById.get(id);
      if (!definition) {
        console.warn(`[mdan-sdk] app.bindActions received unknown action id "${id}".`);
        continue;
      }
      const method = resolveTransportMethod(definition.verb, definition.transport?.method);
      action(definition.target, { method }, handler);
    }

    for (const definition of definitions) {
      if (!(definition.id in handlers)) {
        console.warn(`[mdan-sdk] app.bindActions missing handler for declared action "${definition.id}".`);
      }
    }
  };

  return {
    page,
    route,
    bindActions,
    action,
    async handle(request: MdanRequest): Promise<MdanResponse> {
      if (!validatedActionTransport) {
        validatedActionTransport = true;
        validateActionTransportConsistency();
      }
      return await server.handle(request);
    }
  };
}
