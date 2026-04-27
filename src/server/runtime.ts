import { negotiateRepresentation } from "../core/protocol.js";

import {
  isProjectableReadableSurface,
  type ReadableSurface
} from "../core/surface/markdown.js";
import { withActionProofs, resolveActionProofOptions, type ActionProofOptions, type ResolvedActionProofOptions } from "./action-proofing.js";
import { validateActionRequest } from "./action-request-validation.js";
import { resolveAutoActionResult, resolveAutoDependencies, type AutoDependencyOptions } from "./auto-dependencies.js";
import { dispatchActionHandler, dispatchPageHandler } from "./handler-dispatch.js";
import { MdanRouter } from "./router.js";
import {
  createInvalidHandlerResultResponse,
  createReadableSurfaceValidationResponse
} from "./readable-surface-runtime.js";
import {
  normalizeActionHandlerResultLike,
  pageResultToActionResult,
  type NormalizedActionHandlerResult,
  type NormalizedPageResult
} from "./result-normalization.js";
import {
  createPageResponse,
  createResponse
} from "./response.js";
import {
  createErrorResponse,
  createInternalServerErrorResult,
  createInvalidActionHandlerResult,
  createInvalidPageHandlerResult,
  createMarkdownErrorResultResponse,
  createNotFoundResult
} from "./runtime-errors.js";
export {
  validatePostInputs,
  type MdanPostInputValidator,
  type PostInputValidationContext,
  type PostInputValidationFailure,
  type PostInputValidationPolicy,
  type PostInputValidationResult
} from "./post-input-validation.js";
import type { MdanAssetStoreOptions } from "./assets.js";
import type {
  MdanActionResult,
  MdanHandlerResult,
} from "./types/result.js";
import type {
  MdanBrowserBootstrapHandler,
  MdanBrowserBootstrapResult,
  MdanHandler,
  MdanPageHandler
} from "./types/handler.js";
import type { MdanSessionProvider, MdanSessionSnapshot } from "./types/session.js";
import {
  MDAN_BROWSER_BOOTSTRAP_INTENT_HEADER,
  MDAN_BROWSER_BOOTSTRAP_INTENT_VALUE,
  type MdanRequest,
  type MdanResponse
} from "./types/transport.js";

import type { MdanPostInputValidator } from "./post-input-validation.js";

export interface CreateMdanServerOptions {
  appId?: string;
  session?: MdanSessionProvider;
  validatePostRequest?: MdanPostInputValidator;
  actionProof?: ActionProofOptions;
  assets?: MdanAssetStoreOptions;
  auto?: AutoDependencyOptions;
  autoDependencies?: AutoDependencyOptions;
  browserBootstrap?: MdanBrowserBootstrapHandler;
}

function getPathname(request: MdanRequest): string {
  return new URL(request.url).pathname;
}

function mergeDefinedOptions<T extends object>(...sources: Array<T | undefined>): T {
  const merged: Record<string, unknown> = {};
  for (const source of sources) {
    if (!source) {
      continue;
    }
    for (const [key, value] of Object.entries(source)) {
      if (value !== undefined) {
        merged[key] = value;
      }
    }
  }
  return merged as T;
}

type RequestRepresentation = "markdown" | "event-stream";
type PageMatch = NonNullable<ReturnType<MdanRouter["resolvePage"]>>;
type ActionMatch = NonNullable<ReturnType<MdanRouter["resolve"]>>;

interface RuntimeContext {
  options: CreateMdanServerOptions;
  router: MdanRouter;
  sessionProvider?: MdanSessionProvider;
  assetOptions: MdanAssetStoreOptions;
  autoDependencyOptions: AutoDependencyOptions;
  actionProof: ResolvedActionProofOptions | null;
}

function createInternalErrorResponseFor(): MdanResponse {
  return createMarkdownErrorResultResponse(createInternalServerErrorResult());
}

function getHeaderValue(headers: MdanRequest["headers"], name: string): string | undefined {
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === name) {
      return value;
    }
  }
  return undefined;
}

function isBrowserBootstrapRequest(request: MdanRequest): boolean {
  return getHeaderValue(request.headers, MDAN_BROWSER_BOOTSTRAP_INTENT_HEADER) === MDAN_BROWSER_BOOTSTRAP_INTENT_VALUE;
}

function stripBrowserBootstrapIntent(request: MdanRequest): MdanRequest {
  return {
    ...request,
    headers: Object.fromEntries(
      Object.entries(request.headers).filter(([key]) => key.toLowerCase() !== MDAN_BROWSER_BOOTSTRAP_INTENT_HEADER)
    )
  };
}

function isPageLike(value: unknown): value is NonNullable<MdanActionResult["page"]> {
  return Boolean(value && typeof value === "object" && "markdown" in value && "blocks" in value);
}

function isPageResultLike(value: unknown): value is {
  page: NonNullable<MdanActionResult["page"]>;
  route?: string;
  status?: number;
  headers?: Record<string, string>;
  session?: MdanActionResult["session"];
} {
  return Boolean(value && typeof value === "object" && "page" in value && isPageLike((value as { page?: unknown }).page));
}

type ExecutedHandler<T> =
  | {
      response: MdanResponse;
      value?: never;
    }
  | {
      response?: never;
      value: T;
    };

async function executeHandler<T>(run: () => Promise<T> | T): Promise<ExecutedHandler<T>> {
  try {
    return {
      value: await Promise.resolve(run())
    };
  } catch {
    return {
      response: createInternalErrorResponseFor()
    };
  }
}

function validateReadableSurfaceResult(result: unknown, context: RuntimeContext): MdanResponse | null {
  if (!isProjectableReadableSurface(result)) {
    return null;
  }
  return createReadableSurfaceValidationResponse(result, context.options);
}

function validateNormalizedSurfaceResult(
  context: RuntimeContext,
  surface: ReadableSurface | undefined,
  invalid: true | undefined,
  invalidResult: MdanActionResult
): MdanResponse | null {
  if (surface) {
    return validateReadableSurfaceResult(surface, context);
  }
  if (invalid) {
    return createInvalidHandlerResultResponse(invalidResult);
  }
  return null;
}

async function commitSessionMutation(
  context: RuntimeContext,
  session: MdanSessionSnapshot | null,
  response: MdanResponse,
  request: MdanRequest,
  mutation: MdanActionResult["session"] | null | undefined
): Promise<MdanResponse | null> {
  if (!context.sessionProvider) {
    return null;
  }
  try {
    if (mutation?.type === "sign-out") {
      await context.sessionProvider.clear(session, response, request);
    } else {
      await context.sessionProvider.commit(mutation ?? null, response);
    }
    return null;
  } catch {
    return createInternalErrorResponseFor();
  }
}

async function finalizeCommittedResponse(
  context: RuntimeContext,
  session: MdanSessionSnapshot | null,
  request: MdanRequest,
  response: MdanResponse,
  mutation: MdanActionResult["session"] | null | undefined
): Promise<MdanResponse> {
  const sessionError = await commitSessionMutation(
    context,
    session,
    response,
    request,
    mutation
  );
  return sessionError ?? response;
}

async function finalizeActionResponse(
  context: RuntimeContext,
  session: MdanSessionSnapshot | null,
  request: MdanRequest,
  representation: RequestRepresentation,
  result: MdanHandlerResult
): Promise<MdanResponse> {
  const signedResult =
    "stream" in result || !context.actionProof
      ? result
      : withActionProofs(result, context.actionProof);
  const response = createResponse(signedResult, representation);
  return await finalizeCommittedResponse(
    context,
    session,
    request,
    response,
    result.session
  );
}

async function handlePageRequest(
  context: RuntimeContext,
  request: MdanRequest,
  representation: RequestRepresentation,
  pageMatch: PageMatch,
  session: MdanSessionSnapshot | null
): Promise<MdanResponse | null> {
  if (representation === "event-stream") {
    return createErrorResponse(
      "markdown",
      406,
      "Not Acceptable",
      "Page routes do not support text/event-stream."
    );
  }

  const executedPage = await executeHandler<NormalizedPageResult>(() =>
    dispatchPageHandler(
      pageMatch.handler,
      request,
      session,
      pageMatch.params,
      context.options.appId
    )
  );
  if (executedPage.response) {
    return executedPage.response;
  }
  const normalizedPageResult = executedPage.value;
  const normalizedPageValidation = validateNormalizedSurfaceResult(
    context,
    normalizedPageResult.surface,
    normalizedPageResult.invalid,
    createInvalidPageHandlerResult()
  );
  if (normalizedPageValidation) {
    return normalizedPageValidation;
  }

  const page = normalizedPageResult.page;
  if (!page) {
    return null;
  }

  const resolvedPage = await resolveAutoDependencies(
    page,
    request,
    session,
    context.router,
    context.assetOptions,
    context.autoDependencyOptions,
    context.options.appId
  );
  if (!resolvedPage.page) {
    return createMarkdownErrorResultResponse(createInternalServerErrorResult());
  }

  const response = createPageResponse(
    context.actionProof
      ? (withActionProofs({ page: resolvedPage.page }, context.actionProof).page ?? resolvedPage.page)
      : resolvedPage.page,
    resolvedPage.status ?? normalizedPageResult.status ?? 200,
    resolvedPage.headers ?? normalizedPageResult.headers
  );
  return await finalizeCommittedResponse(
    context,
    session,
    request,
    response,
    resolvedPage.session ?? normalizedPageResult.session
  );
}

function normalizeBrowserBootstrapResult(
  result: MdanBrowserBootstrapResult,
  fallbackRoute: string,
  fallbackAppId?: string
): NormalizedActionHandlerResult {
  if (!result) {
    return {};
  }

  if (isPageResultLike(result)) {
    const action = pageResultToActionResult(
      {
        page: result.page,
        route: result.route,
        status: result.status,
        headers: result.headers,
        session: result.session
      },
      fallbackRoute
    );
    return action ? { action } : {};
  }

  if (isPageLike(result)) {
    const action = pageResultToActionResult({ page: result }, fallbackRoute);
    return action ? { action } : {};
  }

  return normalizeActionHandlerResultLike(result, fallbackAppId);
}

async function handleBrowserBootstrapRequest(
  context: RuntimeContext,
  request: MdanRequest,
  representation: RequestRepresentation,
  pathname: string,
  session: MdanSessionSnapshot | null
): Promise<MdanResponse | null> {
  if (representation === "event-stream" || !context.options.browserBootstrap || !isBrowserBootstrapRequest(request)) {
    return null;
  }

  const executedBootstrap = await executeHandler<NormalizedActionHandlerResult>(() =>
    Promise.resolve(
      context.options.browserBootstrap!({
        request,
        session
      })
    ).then((result) =>
      normalizeBrowserBootstrapResult(
        result,
        pathname,
        context.options.appId
      )
    )
  );
  if (executedBootstrap.response) {
    return executedBootstrap.response;
  }

  const normalizedBootstrapResult = executedBootstrap.value;
  const normalizedBootstrapValidation = validateNormalizedSurfaceResult(
    context,
    normalizedBootstrapResult.surface,
    normalizedBootstrapResult.invalid,
    createInvalidActionHandlerResult()
  );
  if (normalizedBootstrapValidation) {
    return normalizedBootstrapValidation;
  }
  if (!normalizedBootstrapResult.action) {
    return null;
  }

  const autoSourceRequest = stripBrowserBootstrapIntent(request);
  const resolvedResult = normalizedBootstrapResult.action.page
    ? await resolveAutoDependencies(
        normalizedBootstrapResult.action.page,
        autoSourceRequest,
        session,
        context.router,
        context.assetOptions,
        context.autoDependencyOptions,
        context.options.appId
      )
    : await resolveAutoActionResult(
        normalizedBootstrapResult.action,
        autoSourceRequest,
        session,
        context.router,
        context.assetOptions,
        context.autoDependencyOptions,
        context.options.appId
      );

  return await finalizeActionResponse(
    context,
    session,
    request,
    representation,
    resolvedResult
  );
}

async function handleActionRequest(
  context: RuntimeContext,
  request: MdanRequest,
  representation: Exclude<RequestRepresentation, "html">,
  pathname: string,
  match: ActionMatch,
  session: MdanSessionSnapshot | null
): Promise<MdanResponse> {
  const validatedRequest = validateActionRequest(
    context,
    request,
    representation,
    pathname,
    match.routePath,
    match.params,
    session
  );
  if (validatedRequest.response) {
    return validatedRequest.response;
  }
  const executedAction = await executeHandler<NormalizedActionHandlerResult>(() =>
    dispatchActionHandler(
      match.handler,
      request,
      session,
      match.params,
      validatedRequest.inputs,
      validatedRequest.inputsRaw,
      context.assetOptions,
      context.options.appId
    )
  );
  if (executedAction.response) {
    return executedAction.response;
  }
  const normalizedHandlerResult: NormalizedActionHandlerResult = executedAction.value;
  const normalizedActionValidation = validateNormalizedSurfaceResult(
    context,
    normalizedHandlerResult.surface,
    normalizedHandlerResult.invalid,
    createInvalidActionHandlerResult()
  );
  if (normalizedActionValidation) {
    return normalizedActionValidation;
  }

  const resolvedResult =
    normalizedHandlerResult.stream
      ? normalizedHandlerResult.stream
      : await resolveAutoActionResult(
          normalizedHandlerResult.action!,
          request,
          session,
          context.router,
          context.assetOptions,
          context.autoDependencyOptions,
          context.options.appId
        );
  return await finalizeActionResponse(
    context,
    session,
    request,
    representation,
    resolvedResult
  );
}

export function createMdanServer(options: CreateMdanServerOptions = {}) {
  const router = new MdanRouter();
  const sessionProvider = options.session;
  const assetOptions = options.assets ?? {};
  if (options.auto && options.autoDependencies) {
    console.warn(
      "[mdan-sdk] createMdanServer received both options.auto and options.autoDependencies; merging them with options.auto taking precedence for overlapping fields."
    );
  }
  const autoDependencyOptions = mergeDefinedOptions<AutoDependencyOptions>(
    options.autoDependencies,
    options.auto
  );
  const actionProof = resolveActionProofOptions(options.actionProof);
  const context: RuntimeContext = {
    options,
    router,
    sessionProvider,
    assetOptions,
    autoDependencyOptions,
    actionProof
  };

  return {
    get(path: string, handler: MdanHandler): void {
      router.get(path, handler);
    },
    page(path: string, handler: MdanPageHandler): void {
      router.page(path, handler);
    },
    post(path: string, handler: MdanHandler): void {
      router.post(path, handler);
    },
    async handle(request: MdanRequest): Promise<MdanResponse> {
      const normalizedRequest: MdanRequest = {
        ...request,
        cookies: request.cookies ?? {}
      };
      const negotiated = negotiateRepresentation(normalizedRequest.headers.accept);
      if (negotiated === "not-acceptable") {
        return createErrorResponse("markdown", 406, "Not Acceptable");
      }
      const representation = negotiated;

      const pathname = getPathname(normalizedRequest);
      const session = sessionProvider ? await sessionProvider.read(normalizedRequest) : null;

      if (normalizedRequest.method === "GET") {
        const pageMatch = router.resolvePage(pathname);
        if (pageMatch) {
          const bootstrapResponse = await handleBrowserBootstrapRequest(
            context,
            normalizedRequest,
            representation,
            pathname,
            session
          );
          if (bootstrapResponse) {
            return bootstrapResponse;
          }

          const pageResponse = await handlePageRequest(context, normalizedRequest, representation, pageMatch, session);
          if (pageResponse) {
            return await pageResponse;
          }
        }
      }

      const match = router.resolve(normalizedRequest.method, pathname);
      if (!match) {
        return createResponse(createNotFoundResult(pathname), representation);
      }
      return await handleActionRequest(
        context,
        normalizedRequest,
        representation,
        pathname,
        match,
        session
      );
    }
  };
}
