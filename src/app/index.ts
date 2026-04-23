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

type AppActionVerb = "route" | "read" | "write";
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

export interface AppActionDefinition<
  TInput extends AppFieldMap | undefined = AppFieldMap | undefined,
  TId extends string = string
> {
  id: TId;
  label: string;
  verb: AppActionVerb;
  target: string;
  auto?: boolean;
  transport?: {
    method?: AppTransportMethod;
  };
  input?: TInput;
}

type ActionInputForHandler<TAction extends AppActionDefinition> =
  TAction extends AppActionDefinition<infer TInput, string>
    ? TInput extends AppFieldMap
      ? InferAppInputs<TInput>
      : MdanInputMap
    : MdanInputMap;

type ActionId<TAction extends AppActionDefinition> =
  TAction extends AppActionDefinition<AppFieldMap | undefined, infer TId>
    ? TId
    : string;

export type BindActionHandlers<TActions extends readonly AppActionDefinition[]> = {
  [TAction in TActions[number] as ActionId<TAction>]?: AppActionHandler<ActionInputForHandler<TAction>>;
};

export interface AppPageConfig<
  TRenderArgs extends unknown[],
  TActions extends readonly AppActionDefinition[] = readonly AppActionDefinition[]
> {
  markdown: string;
  actions?: TActions;
  render: (...args: TRenderArgs) => Record<string, string>;
}

export interface AppBoundPageDefinition<TActions extends readonly AppActionDefinition[] = readonly AppActionDefinition[]> {
  path: string;
  render: () => ReadableSurface;
  [appActionDefinitionsSymbol]?: TActions;
}

export interface AppPageDefinition<
  TRenderArgs extends unknown[] = [],
  TActions extends readonly AppActionDefinition[] = readonly AppActionDefinition[]
> {
  path: string;
  render: (...args: TRenderArgs) => ReadableSurface;
  bind: (...args: TRenderArgs) => AppBoundPageDefinition<TActions>;
  [appActionDefinitionsSymbol]?: TActions;
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
  page<
    TRenderArgs extends unknown[],
    TActions extends readonly AppActionDefinition[] = readonly AppActionDefinition[]
  >(path: string, config: AppPageConfig<TRenderArgs, TActions>): AppPageDefinition<TRenderArgs, TActions>;
  route<TActions extends readonly AppActionDefinition[]>(page: AppBoundPageDefinition<TActions>): void;
  route<TActions extends readonly AppActionDefinition[]>(page: AppPageDefinition<[], TActions>): void;
  route(path: string, handler: AppPageHandler): void;
  bindActions<TActions extends readonly AppActionDefinition[]>(
    page: AppPageDefinition<unknown[], TActions> | AppBoundPageDefinition<TActions>,
    handlers: BindActionHandlers<TActions>
  ): void;
  action<TInputs extends MdanInputMap = MdanInputMap>(
    path: string,
    options: { method?: AppTransportMethod },
    handler: AppActionHandler<TInputs>
  ): void;
  action<TInputs extends MdanInputMap = MdanInputMap>(path: string, handler: AppActionHandler<TInputs>): void;
  read<TInputs extends MdanInputMap = MdanInputMap>(path: string, handler: AppActionHandler<TInputs>): void;
  write<TInputs extends MdanInputMap = MdanInputMap>(path: string, handler: AppActionHandler<TInputs>): void;
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

function compileInputSchema(input: AppFieldMap | undefined) {
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
  actionDefinitions: readonly AppActionDefinition[]
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
  route<const TId extends string, TInput extends AppFieldMap | undefined = undefined>(
    id: TId,
    options: Omit<AppActionDefinition<TInput, TId>, "id" | "verb">
  ): AppActionDefinition<TInput, TId> {
    return {
      id,
      verb: "route",
      ...options
    };
  },
  read<const TId extends string, TInput extends AppFieldMap | undefined = undefined>(
    id: TId,
    options: Omit<AppActionDefinition<TInput, TId>, "id" | "verb">
  ): AppActionDefinition<TInput, TId> {
    return {
      id,
      verb: "read",
      ...options
    };
  },
  write<const TId extends string, TInput extends AppFieldMap | undefined = undefined>(
    id: TId,
    options: Omit<AppActionDefinition<TInput, TId>, "id" | "verb">
  ): AppActionDefinition<TInput, TId> {
    return {
      id,
      verb: "write",
      ...options
    };
  },
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

  function registerDeclaredActionDefinitions(definitions: readonly AppActionDefinition[] | undefined): void {
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

  function assertNoGetRouteConflict(path: string, source: "route" | "read"): void {
    if (source === "read" && registeredPageRoutes.has(path)) {
      throw new Error(
        `[mdan-sdk] app.read cannot register "${path}" because app.route already owns this GET page route. Use app.route for page reads and keep app.read on a dedicated data endpoint.`
      );
    }
    if (source === "route" && (registeredActionMethodsByPath.get(path)?.has("GET") ?? false)) {
      throw new Error(
        `[mdan-sdk] app.route cannot register "${path}" because app.read/app.action(GET) already owns this GET endpoint. Use a dedicated app.read path for data reads.`
      );
    }
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

  const page: AppInstance["page"] = <
    TRenderArgs extends unknown[],
    TActions extends readonly AppActionDefinition[] = readonly AppActionDefinition[]
  >(
    path: string,
    config: AppPageConfig<TRenderArgs, TActions>
  ): AppPageDefinition<TRenderArgs, TActions> => {
    const actionDefinitions = (config.actions ?? []) as TActions;
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
      assertNoGetRouteConflict(pathOrPage, "route");
      registeredPageRoutes.add(pathOrPage);
      server.page(pathOrPage, handler as MdanPageHandler);
      return;
    }
    assertNoGetRouteConflict(pathOrPage.path, "route");
    registerDeclaredActionDefinitions(pathOrPage[appActionDefinitionsSymbol]);
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
    if (method === "GET") {
      assertNoGetRouteConflict(path, "read");
    }
    registerActionHandlerMethod(path, method);
    if (method === "GET") {
      server.get(path, handler as MdanHandler);
      return;
    }
    server.post(path, handler as MdanHandler);
  };

  const read: AppInstance["read"] = (path, handler) => {
    action(path, { method: "GET" }, handler);
  };

  const write: AppInstance["write"] = (path, handler) => {
    action(path, { method: "POST" }, handler);
  };

  const bindActions: AppInstance["bindActions"] = (
    page: AppPageDefinition<unknown[], readonly AppActionDefinition[]> | AppBoundPageDefinition<readonly AppActionDefinition[]>,
    handlers: BindActionHandlers<readonly AppActionDefinition[]>
  ): void => {
    const definitions = page[appActionDefinitionsSymbol] ?? [];
    const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));
    const bindableBuckets = new Map<string, string[]>();

    for (const definition of definitions) {
      const method = resolveTransportMethod(definition.verb, definition.transport?.method);
      if (method === "GET" && registeredPageRoutes.has(definition.target)) {
        continue;
      }
      const key = `${method}:${definition.target}`;
      const ids = bindableBuckets.get(key) ?? [];
      ids.push(definition.id);
      bindableBuckets.set(key, ids);
    }

    for (const [key, ids] of bindableBuckets.entries()) {
      if (ids.length > 1) {
        throw new Error(
          `[mdan-sdk] app.bindActions cannot disambiguate actions ${ids.map((id) => `"${id}"`).join(", ")} for route "${key}". Use app.action(...) explicitly for this route.`
        );
      }
    }

    for (const [id, handler] of Object.entries(handlers)) {
      const definition = definitionById.get(id);
      if (!definition) {
        console.warn(`[mdan-sdk] app.bindActions received unknown action id "${id}".`);
        continue;
      }
      const method = resolveTransportMethod(definition.verb, definition.transport?.method);
      if (method === "GET" && registeredPageRoutes.has(definition.target)) {
        console.warn(
          `[mdan-sdk] app.bindActions ignored handler for "${id}" because GET target "${definition.target}" is already served by app.route(...).`
        );
        continue;
      }
      action(definition.target, { method }, handler);
    }

    for (const definition of definitions) {
      const method = resolveTransportMethod(definition.verb, definition.transport?.method);
      if (method === "GET" && registeredPageRoutes.has(definition.target)) {
        continue;
      }
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
    read,
    write,
    async handle(request: MdanRequest): Promise<MdanResponse> {
      if (!validatedActionTransport) {
        validatedActionTransport = true;
        validateActionTransportConsistency();
      }
      return await server.handle(request);
    }
  };
}
