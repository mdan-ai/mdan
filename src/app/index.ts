import type { MdanActionManifest, MdanPage } from "../core/protocol.js";
import { type ReadableSurface } from "../core/surface/markdown.js";
import { createHost as createBunHost, type CreateBunHostOptions } from "../server/bun.js";
import { createHost as createNodeHost, type CreateNodeHostOptions } from "../server/node-runtime.js";
import { createMdanServer, type CreateMdanServerOptions } from "../server/runtime.js";
import { matchRoutePattern } from "../server/router.js";
export { refreshSession, signIn, signOut } from "../server/session.js";
import type {
  MdanActionResult,
  MdanBrowserBootstrapHandler,
  MdanHandler,
  MdanHandlerContext,
  MdanInputMap,
  MdanPageResult,
  MdanPageHandler,
  MdanPageHandlerContext,
  MdanRequest,
  MdanResponse,
  MdanSessionSnapshot,
  MdanStreamResult
} from "../server/types/index.js";
export type { MdanSessionProvider, MdanSessionSnapshot } from "../server/types/index.js";

type AppTransportMethod = "GET" | "POST";
type AppInputSchemaProperty = Record<string, unknown>;
const APP_JSON_RESPONSE_SYMBOL = Symbol("mdan.app.jsonResponse");

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

export type AppActionJsonManifest = MdanActionManifest;

export interface AppPageConfig<TRenderArgs extends unknown[]> {
  markdown: string;
  actionJson: AppActionJsonManifest;
  render: (...args: TRenderArgs) => Record<string, string>;
}

export interface AppBoundPageDefinition {
  path: string;
  render: () => ReadableSurface;
  actionJson: () => AppActionJsonManifest;
}

export interface AppPageDefinition<TRenderArgs extends unknown[] = []> {
  path: string;
  render: (...args: TRenderArgs) => ReadableSurface;
  bind: (...args: TRenderArgs) => AppBoundPageDefinition;
  actionJson: () => AppActionJsonManifest;
}

export interface AppAutoOptions {
  resolveRequest?: NonNullable<CreateMdanServerOptions["auto"]>["resolveRequest"];
  fallbackToStaticTarget?: NonNullable<CreateMdanServerOptions["auto"]>["fallbackToStaticTarget"];
}

export interface AppBrowserOptions {
  bootstrap?: MdanBrowserBootstrapHandler;
}

export interface CreateAppOptions extends Pick<CreateMdanServerOptions, "appId" | "session" | "actionProof"> {
  auto?: AppAutoOptions;
  browser?: AppBrowserOptions;
}

export interface AppInstance {
  page<TRenderArgs extends unknown[]>(path: string, config: AppPageConfig<TRenderArgs>): AppPageDefinition<TRenderArgs>;
  route(page: AppBoundPageDefinition): void;
  route(page: AppPageDefinition<[]>): void;
  route(path: string, handler: AppPageHandler): void;
  api<TBody = unknown>(method: AppTransportMethod, path: string, handler: AppApiHandler<TBody>): void;
  action<TInputs extends Record<string, unknown> = MdanInputMap>(
    path: string,
    options: { method?: AppTransportMethod },
    handler: AppActionHandler<TInputs>
  ): void;
  action<TInputs extends Record<string, unknown> = MdanInputMap>(path: string, handler: AppActionHandler<TInputs>): void;
  read<TInputs extends Record<string, unknown> = MdanInputMap>(path: string, handler: AppActionHandler<TInputs>): void;
  write<TInputs extends Record<string, unknown> = MdanInputMap>(path: string, handler: AppActionHandler<TInputs>): void;
  host(runtime: "bun", options?: CreateBunHostOptions): ReturnType<typeof createBunHost>;
  host(runtime: "node", options?: CreateNodeHostOptions): ReturnType<typeof createNodeHost>;
  handle(request: MdanRequest): Promise<MdanResponse>;
}

export type AppPageHandler = (
  context: MdanPageHandlerContext
) => Promise<ReadableSurface | MdanPage | MdanPageResult | null> | ReadableSurface | MdanPage | MdanPageResult | null;

export type AppActionHandler<TInputs extends Record<string, unknown> = MdanInputMap> = (
  context: Omit<MdanHandlerContext, "inputs"> & { inputs: TInputs }
) => Promise<ReadableSurface | MdanActionResult | MdanStreamResult> | ReadableSurface | MdanActionResult | MdanStreamResult;

export interface AppApiContext<TBody = unknown> {
  request: MdanRequest;
  params: Record<string, string>;
  query: Record<string, string>;
  body: TBody;
  session: MdanSessionSnapshot | null;
}

export interface AppJsonResponseOptions {
  status?: number;
  headers?: Record<string, string>;
}

export interface AppJsonResponse {
  readonly [APP_JSON_RESPONSE_SYMBOL]: true;
  body: unknown;
  status: number;
  headers: Record<string, string>;
}

interface AppJsonResponseLike {
  body: unknown;
  status?: number;
  headers?: Record<string, string>;
}

export type AppApiHandler<TBody = unknown> = (
  context: AppApiContext<TBody>
) => Promise<unknown> | unknown;

interface RegisteredApiRoute {
  method: AppTransportMethod;
  path: string;
  handler: AppApiHandler;
}

export function json(body: unknown, options: AppJsonResponseOptions = {}): AppJsonResponse {
  return {
    [APP_JSON_RESPONSE_SYMBOL]: true,
    body,
    status: options.status ?? 200,
    headers: options.headers ?? {}
  };
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isAppJsonResponse(value: unknown): value is AppJsonResponse {
  return Boolean(value && typeof value === "object" && (value as AppJsonResponse)[APP_JSON_RESPONSE_SYMBOL] === true);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isHeaderRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((header) => typeof header === "string");
}

function isAppJsonResponseLike(value: unknown): value is AppJsonResponseLike {
  if (!isRecord(value) || !Object.prototype.hasOwnProperty.call(value, "body")) {
    return false;
  }
  const hasStatus = typeof value.status === "number";
  const hasHeaders = isHeaderRecord(value.headers);
  return hasStatus || hasHeaders;
}

function serializeJsonResponse(result: unknown): MdanResponse {
  const response = isAppJsonResponse(result)
    ? result
    : isAppJsonResponseLike(result)
      ? json(result.body, { status: result.status, headers: result.headers })
      : json(result);
  return {
    status: response.status,
    headers: {
      ...response.headers,
      "content-type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(response.body ?? null)
  };
}

function createJsonErrorResponse(status: number, code: string, message: string): MdanResponse {
  return serializeJsonResponse(json({
    error: {
      code,
      message
    }
  }, { status }));
}

function getRequestUrl(request: MdanRequest): URL {
  return new URL(request.url);
}

function getRequestQuery(request: MdanRequest): Record<string, string> {
  return request.query ?? Object.fromEntries(getRequestUrl(request).searchParams.entries());
}

function parseApiBody(request: MdanRequest): { ok: true; body: unknown } | { ok: false; response: MdanResponse } {
  if (!request.body || request.body.trim().length === 0) {
    return { ok: true, body: undefined };
  }
  const contentType = request.headers["content-type"] ?? "";
  if (!contentType.includes("application/json")) {
    return {
      ok: false,
      response: createJsonErrorResponse(
        415,
        "unsupported_media_type",
        'JSON API requests with a body must use Content-Type: "application/json".'
      )
    };
  }
  try {
    return {
      ok: true,
      body: JSON.parse(request.body) as unknown
    };
  } catch {
    return {
      ok: false,
      response: createJsonErrorResponse(400, "invalid_json", "Request body must be valid JSON.")
    };
  }
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

function buildReadableSurface(
  path: string,
  markdown: string,
  regions: Record<string, string>,
  actionJson: AppActionJsonManifest
): ReadableSurface {
  return {
    markdown,
    route: path,
    regions,
    actions: cloneJson(actionJson)
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

export function createApp(options: CreateAppOptions = {}): AppInstance {
  const server = createMdanServer({
    ...options,
    auto: options.auto,
    browserBootstrap: options.browser?.bootstrap
  });
  const registeredPageRoutes = new Set<string>();
  const registeredReadRoutes = new Set<string>();
  const registeredApiGetRoutes = new Set<string>();
  const apiRoutes: RegisteredApiRoute[] = [];

  function assertNoGetRouteConflict(path: string, source: "route" | "read" | "api"): void {
    if (source === "read" && registeredPageRoutes.has(path)) {
      throw new Error(
        `[mdan-sdk] app.read cannot register "${path}" because app.route already owns this GET page route. Use app.route for page reads and keep app.read on a dedicated data endpoint.`
      );
    }
    if (source === "read" && registeredApiGetRoutes.has(path)) {
      throw new Error(
        `[mdan-sdk] app.read cannot register "${path}" because app.api(GET) already owns this JSON API endpoint. Keep MDAN read actions and JSON API endpoints separate.`
      );
    }
    if (source === "api" && registeredPageRoutes.has(path)) {
      throw new Error(
        `[mdan-sdk] app.api cannot register "${path}" because app.route already owns this GET page route. Keep JSON API endpoints on dedicated /api paths.`
      );
    }
    if (source === "route" && registeredReadRoutes.has(path)) {
      throw new Error(
        `[mdan-sdk] app.route cannot register "${path}" because app.read/app.action(GET) already owns this GET endpoint. Use a dedicated app.read path for data reads.`
      );
    }
    if (source === "route" && registeredApiGetRoutes.has(path)) {
      throw new Error(
        `[mdan-sdk] app.route cannot register "${path}" because app.api(GET) already owns this JSON API endpoint. Keep page routes and JSON API endpoints separate.`
      );
    }
  }

  function findApiRoute(request: MdanRequest): { route: RegisteredApiRoute; params: Record<string, string> } | null {
    const pathname = getRequestUrl(request).pathname;
    for (const route of apiRoutes) {
      if (route.method !== request.method) {
        continue;
      }
      const params = matchRoutePattern(route.path, pathname);
      if (!params) {
        continue;
      }
      return { route, params };
    }
    return null;
  }

  async function handleApiRequest(
    request: MdanRequest,
    route: RegisteredApiRoute,
    params: Record<string, string>
  ): Promise<MdanResponse> {
    const parsedBody = parseApiBody(request);
    if (!parsedBody.ok) {
      return parsedBody.response;
    }
    const result = await route.handler({
      request,
      params,
      query: getRequestQuery(request),
      body: parsedBody.body,
      session: options.session ? await options.session.read(request) : null
    });
    return serializeJsonResponse(result);
  }

  async function handle(request: MdanRequest): Promise<MdanResponse> {
    const apiMatch = findApiRoute(request);
    if (apiMatch) {
      return await handleApiRequest(request, apiMatch.route, apiMatch.params);
    }
    return await server.handle(request);
  }

  const page: AppInstance["page"] = <TRenderArgs extends unknown[]>(
    path: string,
    config: AppPageConfig<TRenderArgs>
  ): AppPageDefinition<TRenderArgs> => {
    const staticActionJson = cloneJson(config.actionJson);
    const actionJson = () => cloneJson(staticActionJson);
    return {
      path,
      actionJson,
      render: (...args: TRenderArgs) => buildReadableSurface(
        path,
        config.markdown,
        config.render(...args),
        staticActionJson
      ),
      bind: (...args: TRenderArgs) => ({
        path,
        actionJson,
        render: () => buildReadableSurface(
          path,
          config.markdown,
          config.render(...args),
          staticActionJson
        )
      }),
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
    registeredPageRoutes.add(pathOrPage.path);
    server.page(pathOrPage.path, async () => pathOrPage.render());
  }) as AppInstance["route"];

  const api: AppInstance["api"] = (method, path, handler) => {
    if (method === "GET") {
      assertNoGetRouteConflict(path, "api");
      registeredApiGetRoutes.add(path);
    }
    apiRoutes.push({ method, path, handler: handler as AppApiHandler });
  };

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
      registeredReadRoutes.add(path);
    }
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

  const host = ((
    runtime: "bun" | "node",
    options: CreateBunHostOptions | CreateNodeHostOptions = {}
  ) => {
    const handler = { handle };
    if (runtime === "bun") {
      return createBunHost(handler, options as CreateBunHostOptions);
    }
    return createNodeHost(handler, options as CreateNodeHostOptions);
  }) as AppInstance["host"];

  return {
    page,
    route,
    api,
    action,
    read,
    write,
    host,
    handle
  };
}
