import { negotiateRepresentation } from "../protocol/negotiate.js";

import {
  isProjectableReadableSurface,
  type ReadableSurface
} from "./artifact.js";
import { withActionProofs, resolveActionProofOptions, type ActionProofOptions, type ResolvedActionProofOptions } from "./action-proofing.js";
import { validateActionRequest } from "./action-request-validation.js";
import { resolveAutoActionResult, resolveAutoDependencies, type AutoDependencyOptions } from "./auto-dependencies.js";
import type { BrowserShellOptions } from "./browser-shell.js";
import { dispatchActionHandler, dispatchPageHandler } from "./handler-dispatch.js";
import { MdanRouter } from "./router.js";
import {
  createInvalidHandlerResultResponse,
  createReadableSurfaceValidationResponse
} from "./readable-surface-runtime.js";
import {
  type NormalizedActionHandlerResult,
  type NormalizedPageResult
} from "./result-normalization.js";
import {
  createHtmlPageResponse,
  createHtmlSurfaceResponse,
  createPageResponse,
  createResponse
} from "./response.js";
import {
  createErrorResponse,
  createHtmlPageOnlyResult,
  createInternalServerErrorResult,
  createInvalidActionHandlerResult,
  createInvalidPageHandlerResult,
  createMarkdownErrorResultResponse,
  createNotFoundResult
} from "./runtime-errors.js";
import type { ReadableSurfaceSemanticSlotOptions } from "./readable-surface-options.js";
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
  MdanHandler,
  MdanHandlerResult,
  MdanPageHandler,
  MdanRequest,
  MdanResponse,
  MdanSessionProvider,
  MdanSessionSnapshot
} from "./types.js";

import type { MdanPostInputValidator } from "./post-input-validation.js";

export interface CreateMdanServerOptions {
  appId?: string;
  session?: MdanSessionProvider;
  validatePostRequest?: MdanPostInputValidator;
  actionProof?: ActionProofOptions;
  assets?: MdanAssetStoreOptions;
  autoDependencies?: AutoDependencyOptions;
  browserShell?: BrowserShellOptions;
  semanticSlots?: boolean | ReadableSurfaceSemanticSlotOptions;
}

function getPathname(request: MdanRequest): string {
  return new URL(request.url).pathname;
}

type RequestRepresentation = "markdown" | "event-stream" | "html";
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
  representation: Exclude<RequestRepresentation, "html">,
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

function createStaticBrowserShellOptions(context: RuntimeContext): BrowserShellOptions {
  return {
    ...context.options.browserShell,
    hydrate: false
  };
}

function createStaticHtmlPageReadResponse(
  context: RuntimeContext,
  normalizedPageResult: NormalizedPageResult
): MdanResponse | null {
  const browserShellOptions = createStaticBrowserShellOptions(context);
  const status = normalizedPageResult.status ?? 200;
  const headers = normalizedPageResult.headers;

  if (normalizedPageResult.surface && !context.actionProof) {
    return createHtmlSurfaceResponse(
      normalizedPageResult.surface,
      browserShellOptions,
      status,
      headers
    );
  }

  if (normalizedPageResult.page) {
    return createHtmlPageResponse(
      normalizedPageResult.page,
      browserShellOptions,
      status,
      headers
    );
  }

  return null;
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

  if (normalizedPageResult.page && representation === "html") {
    const htmlResponse = createStaticHtmlPageReadResponse(context, normalizedPageResult);
    if (htmlResponse) {
      return await finalizeCommittedResponse(
        context,
        session,
        request,
        htmlResponse,
        normalizedPageResult.session
      );
    }
    return createMarkdownErrorResultResponse(createInternalServerErrorResult());
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
  const autoDependencyOptions = options.autoDependencies ?? {};
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
      const negotiated = negotiateRepresentation(request.headers.accept);
      if (negotiated === "not-acceptable") {
        return createErrorResponse("markdown", 406, "Not Acceptable");
      }
      const representation = negotiated;

      const pathname = getPathname(request);
      const session = sessionProvider ? await sessionProvider.read(request) : null;

      if (request.method === "GET") {
        const pageMatch = router.resolvePage(pathname);
        if (pageMatch) {
          const pageResponse = await handlePageRequest(context, request, representation, pageMatch, session);
          if (pageResponse) {
            return await pageResponse;
          }
        }
      }

      if (representation === "html") {
        return createMarkdownErrorResultResponse(createHtmlPageOnlyResult());
      }

      const match = router.resolve(request.method, pathname);
      if (!match) {
        return createResponse(createNotFoundResult(pathname), representation);
      }
      return await handleActionRequest(
        context,
        request,
        representation,
        pathname,
        match,
        session
      );
    }
  };
}
