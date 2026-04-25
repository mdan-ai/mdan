import type { MdanActionManifest, MdanPage } from "../core/protocol.js";
import { type ReadableSurface } from "../core/surface/markdown.js";
import { createMdanServer, type CreateMdanServerOptions } from "../server/runtime.js";
export { refreshSession, signIn, signOut } from "../server/session.js";
import type {
  MdanActionResult,
  MdanHandler,
  MdanHandlerContext,
  MdanInputMap,
  MdanPageResult,
  MdanPageHandler,
  MdanPageHandlerContext,
  MdanRequest,
  MdanResponse,
  MdanSessionProvider,
  MdanSessionSnapshot,
  MdanStreamResult
} from "../server/types/index.js";
export type { MdanSessionProvider, MdanSessionSnapshot } from "../server/types/index.js";

type AppTransportMethod = "GET" | "POST";
type AppInputSchemaProperty = Record<string, unknown>;

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

export interface CreateAppOptions extends Pick<CreateMdanServerOptions, "appId" | "session" | "actionProof"> {
  auto?: AppAutoOptions;
}

export interface AppInstance {
  page<TRenderArgs extends unknown[]>(path: string, config: AppPageConfig<TRenderArgs>): AppPageDefinition<TRenderArgs>;
  route(page: AppBoundPageDefinition): void;
  route(page: AppPageDefinition<[]>): void;
  route(path: string, handler: AppPageHandler): void;
  action<TInputs extends Record<string, unknown> = MdanInputMap>(
    path: string,
    options: { method?: AppTransportMethod },
    handler: AppActionHandler<TInputs>
  ): void;
  action<TInputs extends Record<string, unknown> = MdanInputMap>(path: string, handler: AppActionHandler<TInputs>): void;
  read<TInputs extends Record<string, unknown> = MdanInputMap>(path: string, handler: AppActionHandler<TInputs>): void;
  write<TInputs extends Record<string, unknown> = MdanInputMap>(path: string, handler: AppActionHandler<TInputs>): void;
  handle(request: MdanRequest): Promise<MdanResponse>;
}

export type AppPageHandler = (
  context: MdanPageHandlerContext
) => Promise<ReadableSurface | MdanPage | MdanPageResult | null> | ReadableSurface | MdanPage | MdanPageResult | null;

export type AppActionHandler<TInputs extends Record<string, unknown> = MdanInputMap> = (
  context: Omit<MdanHandlerContext, "inputs"> & { inputs: TInputs }
) => Promise<ReadableSurface | MdanActionResult | MdanStreamResult> | ReadableSurface | MdanActionResult | MdanStreamResult;

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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
    auto: options.auto
  });
  const registeredPageRoutes = new Set<string>();
  const registeredReadRoutes = new Set<string>();

  function assertNoGetRouteConflict(path: string, source: "route" | "read"): void {
    if (source === "read" && registeredPageRoutes.has(path)) {
      throw new Error(
        `[mdan-sdk] app.read cannot register "${path}" because app.route already owns this GET page route. Use app.route for page reads and keep app.read on a dedicated data endpoint.`
      );
    }
    if (source === "route" && registeredReadRoutes.has(path)) {
      throw new Error(
        `[mdan-sdk] app.route cannot register "${path}" because app.read/app.action(GET) already owns this GET endpoint. Use a dedicated app.read path for data reads.`
      );
    }
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

  return {
    page,
    route,
    action,
    read,
    write,
    async handle(request: MdanRequest): Promise<MdanResponse> {
      return await server.handle(request);
    }
  };
}
