import { assertActionsContractEnvelope } from "../protocol/contracts.js";
import { validateAgentBlocks } from "../content/agent-blocks.js";
import { validateContentActionConsistency } from "./contracts.js";
import { negotiateRepresentation } from "../protocol/negotiate.js";
import { isJsonSurfaceEnvelope, type JsonSurfaceEnvelope } from "../protocol/surface.js";
import { validateSemanticSlots } from "../content/semantic-slots.js";

import {
  validateActionProofRequest,
  withActionProofs,
  withActionProofsForJsonEnvelope,
  resolveActionProofOptions,
  type ActionProofOptions,
  type ResolvedActionProofOptions
} from "./action-proofing.js";
import { resolveAutoActionResult, resolveAutoDependencies, type AutoDependencyOptions } from "./auto-dependencies.js";
import type { BrowserShellOptions } from "./browser-shell.js";
import { MdanRouter } from "./router.js";
import { fail } from "./result.js";
import { parseRequestInputs, type ParsedRequestAction } from "./request-inputs.js";
import { executeValidatedEnvelopeHandler } from "./runtime-handler-shared.js";
import { normalizeActionHandlerResult, normalizePageHandlerResult } from "./result-normalization.js";
import { createHtmlSurfaceResponse, createJsonSurfaceResponse, createPageResponse, createResponse } from "./response.js";
import { openAssetStream as openStoredAssetStream, readAsset as readStoredAsset, type MdanAssetStoreOptions } from "./assets.js";
import type {
  MdanActionResult,
  MdanHandler,
  MdanHandlerResultLike,
  MdanInputMap,
  MdanPageHandler,
  MdanPageHandlerResult,
  MdanRequest,
  MdanResponse,
  MdanSessionProvider,
  MdanSessionSnapshot
} from "./types.js";

export interface CreateMdanServerOptions {
  session?: MdanSessionProvider;
  validatePostRequest?: MdanPostInputValidator;
  actionProof?: ActionProofOptions;
  assets?: MdanAssetStoreOptions;
  autoDependencies?: AutoDependencyOptions;
  browserShell?: BrowserShellOptions;
  semanticSlots?: boolean | {
    requireOnPage?: boolean;
    requireOnBlock?: boolean;
  };
}

type ResolvedSemanticSlotOptions = {
  requireOnPage: boolean;
  requireOnBlock: boolean;
};

export interface PostInputValidationPolicy {
  blockName: string;
  operationTarget: string;
  declaredInputNames: string[];
  allowedInputNames: string[];
}

export interface PostInputValidationResult {
  ok: true;
}

export interface PostInputValidationFailure {
  ok: false;
  detail: string;
}

export interface PostInputValidationContext {
  request: MdanRequest;
  routePath: string;
  params: Record<string, string>;
  inputs: Record<string, unknown>;
  session: MdanSessionSnapshot | null;
}

export type MdanPostInputValidator = (
  context: PostInputValidationContext
) => PostInputValidationResult | PostInputValidationFailure | null | undefined;

export function validatePostInputs(
  inputs: Record<string, unknown>,
  policy: PostInputValidationPolicy
): PostInputValidationResult | PostInputValidationFailure {
  const receivedNames = Object.keys(inputs);
  if (receivedNames.length === 0) {
    return { ok: true };
  }

  const declared = new Set(policy.declaredInputNames);
  const allowed = new Set(policy.allowedInputNames);
  const undeclared = receivedNames.filter((name) => !declared.has(name));
  if (undeclared.length > 0) {
    return {
      ok: false,
      detail: `Block "${policy.blockName}" does not declare input(s): ${undeclared.join(", ")}.`
    };
  }

  const disallowed = receivedNames.filter((name) => !allowed.has(name));
  if (disallowed.length > 0) {
    const allowedList = policy.allowedInputNames.length > 0 ? policy.allowedInputNames.join(", ") : "(none)";
    return {
      ok: false,
      detail: `POST "${policy.operationTarget}" only accepts input(s): ${allowedList}. Rejected: ${disallowed.join(", ")}.`
    };
  }

  return { ok: true };
}

function getPathname(request: MdanRequest): string {
  return new URL(request.url).pathname;
}

function isSupportedWriteContentType(contentType: string | undefined): boolean {
  if (!contentType) {
    return false;
  }
  return contentType.includes("application/json");
}

function hasRequestBody(request: MdanRequest): boolean {
  return typeof request.body === "string" && request.body.trim().length > 0;
}

function isBrowserFormAdaptedRequest(request: MdanRequest): boolean {
  return request.headers["x-mdan-browser-form"] === "true";
}

function createErrorFragment(title: string, detail?: string) {
  return {
    markdown: detail ? `## ${title}\n\n${detail}` : `## ${title}`,
    blocks: []
  };
}

function createStructuredErrorDetail(payload: Record<string, unknown>): string {
  return [
    "```json",
    JSON.stringify(payload, null, 2),
    "```"
  ].join("\n");
}

function createInternalServerErrorResult() {
  return fail({
    status: 500,
    fragment: createErrorFragment(
      "Internal Server Error",
      "The host hit an unexpected failure. Retry the previous action or refresh the page."
    )
  });
}

function createJsonOnlyContractErrorResult(detail: string): MdanActionResult {
  return fail({
    status: 500,
    fragment: createErrorFragment("JSON Contract Violation", detail)
  });
}

function createActionsContractViolationResult(detail: string): MdanActionResult {
  return fail({
    status: 500,
    fragment: createErrorFragment("Actions Contract Violation", detail)
  });
}

function assertEnvelopeContracts(envelope: JsonSurfaceEnvelope): void {
  assertActionsContractEnvelope(envelope);
  const consistencyViolations = validateContentActionConsistency(envelope);
  if (consistencyViolations.length === 0) {
    return;
  }
  const detail = consistencyViolations.map((entry) => `${entry.path}: ${entry.message}`).join("; ");
  throw new Error(`invalid actions contract: ${detail}`);
}

function createSemanticSlotsViolationResult(errors: string[]): MdanActionResult {
  return fail({
    status: 500,
    fragment: createErrorFragment("Semantic Slots Violation", errors.join("\n"))
  });
}

function createAgentBlocksViolationResult(errors: string[]): MdanActionResult {
  return fail({
    status: 500,
    fragment: createErrorFragment("Agent Blocks Violation", errors.join("\n"))
  });
}

function resolveSemanticSlotOptions(
  semanticSlots: CreateMdanServerOptions["semanticSlots"]
): ResolvedSemanticSlotOptions {
  if (semanticSlots === true) {
    return {
      requireOnPage: true,
      requireOnBlock: true
    };
  }

  if (!semanticSlots) {
    return {
      requireOnPage: false,
      requireOnBlock: false
    };
  }

  return {
    requireOnPage: semanticSlots.requireOnPage === true,
    requireOnBlock: semanticSlots.requireOnBlock === true
  };
}

function validateEnvelopePromptContracts(
  envelope: MdanPageHandlerResult,
  options: CreateMdanServerOptions
): { kind: "semantic" | "agent"; errors: string[] } | null {
  if (!envelope) {
    return null;
  }

  const agentBlockErrors = validateAgentBlocks(envelope.content);
  if (agentBlockErrors.length > 0) {
    return { kind: "agent", errors: agentBlockErrors.map((message) => `page: ${message}`) };
  }

  for (const [blockName, markdown] of Object.entries(envelope.view?.regions ?? {})) {
    const blockErrors = validateAgentBlocks(markdown);
    if (blockErrors.length > 0) {
      return {
        kind: "agent",
        errors: blockErrors.map((message) => `block "${blockName}": ${message}`)
      };
    }
  }

  const semanticSlotOptions = resolveSemanticSlotOptions(options.semanticSlots);

  if (semanticSlotOptions.requireOnPage) {
    const semanticSlotErrors = validateSemanticSlots(envelope.content);
    if (semanticSlotErrors.length > 0) {
      return { kind: "semantic", errors: semanticSlotErrors };
    }
  }

  if (semanticSlotOptions.requireOnBlock) {
    const errors: string[] = [];
    for (const [blockName, markdown] of Object.entries(envelope.view?.regions ?? {})) {
      const blockErrors = validateSemanticSlots(markdown, {
        requiredNames: ["Context", "Result"]
      });
      for (const message of blockErrors) {
        errors.push(`block "${blockName}": ${message}`);
      }
    }
    if (errors.length > 0) {
      return { kind: "semantic", errors };
    }
  }

  return null;
}

function createActionProofViolationResult(): MdanActionResult {
  return fail({
    status: 400,
    fragment: createErrorFragment("Invalid Action Proof", "The action request proof is missing or invalid.")
  });
}

function createActionRequestFormatViolationResult(missing: string[]): MdanActionResult {
  const example = {
    action: {
      proof: "<proof token>",
      confirmed: true
    },
    input: {
      "<field>": "<value>"
    }
  };
  const detail = createStructuredErrorDetail({
    code: "invalid_action_request_format",
    expected_format: "mdan-action-input-v1",
    missing,
    message: "Request body must use action+input wrapper.",
    example
  });
  return fail({
    status: 400,
    fragment: createErrorFragment("Invalid Action Request Format", detail)
  });
}

function createActionConfirmationViolationResult(): MdanActionResult {
  return fail({
    status: 400,
    fragment: createErrorFragment(
      "Action Confirmation Required",
      'This action requires explicit confirmation. Submit with "action.confirmed": true.'
    )
  });
}

function createActionInputSchemaViolationResult(errors: string[]): MdanActionResult {
  return fail({
    status: 400,
    fragment: createErrorFragment(
      "Invalid Action Input",
      createStructuredErrorDetail({
        code: "invalid_action_input",
        errors
      })
    )
  });
}

function createHtmlPageOnlyResult(): MdanActionResult {
  return fail({
    status: 406,
    fragment: createErrorFragment(
      "Not Acceptable",
      "HTML responses are only available for page GET requests. Use application/json or text/markdown for action and fragment requests."
    )
  });
}

function createJsonActionOnlyResult(requestedRepresentation: "markdown" | "event-stream" | "html"): MdanActionResult {
  const requestedType =
    requestedRepresentation === "markdown"
      ? "text/markdown"
      : requestedRepresentation === "event-stream"
        ? "text/event-stream"
        : "text/html";
  return fail({
    status: 406,
    fragment: createErrorFragment(
      "Not Acceptable",
      `Action and block update requests must use Accept: application/json. ${requestedType} is only supported for page reads where applicable.`
    )
  });
}

type RequestRepresentation = "json" | "markdown" | "event-stream" | "html";
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

type ValidatedActionRequest =
  | {
      response: MdanResponse;
      inputs?: never;
      inputsRaw?: never;
    }
  | {
      response?: never;
      inputs: Record<string, unknown>;
      inputsRaw: Record<string, unknown>;
    };

function errorRepresentation(requested: RequestRepresentation): "json" | "markdown" {
  return requested === "json" ? "json" : "markdown";
}

function createInternalErrorResponseFor(representation: RequestRepresentation): MdanResponse {
  return createResponse(createInternalServerErrorResult(), errorRepresentation(representation));
}

function createJsonContractResponseFor(
  representation: RequestRepresentation,
  detail: string
): MdanResponse {
  return createResponse(createJsonOnlyContractErrorResult(detail), errorRepresentation(representation));
}

function createActionHandlerContext(
  context: RuntimeContext,
  request: MdanRequest,
  validatedRequest: Extract<ValidatedActionRequest, { inputs: Record<string, unknown>; inputsRaw: Record<string, unknown> }>,
  session: MdanSessionSnapshot | null,
  match: ActionMatch
) {
  return {
    request,
    inputs: validatedRequest.inputs as MdanInputMap,
    inputsRaw: validatedRequest.inputsRaw,
    session,
    params: match.params,
    readAsset(assetId: string) {
      return readStoredAsset(assetId, context.assetOptions);
    },
    openAssetStream(assetId: string) {
      return openStoredAssetStream(assetId, context.assetOptions);
    }
  };
}

function validateRuntimeEnvelope(
  envelope: JsonSurfaceEnvelope,
  context: RuntimeContext,
  representation: RequestRepresentation
): MdanResponse | null {
  const promptValidation = validateEnvelopePromptContracts(envelope, context.options);
  if (promptValidation) {
    return createResponse(
      promptValidation.kind === "agent"
        ? createAgentBlocksViolationResult(promptValidation.errors)
        : createSemanticSlotsViolationResult(promptValidation.errors),
      errorRepresentation(representation)
    );
  }
  try {
    assertEnvelopeContracts(envelope);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return createResponse(
      createActionsContractViolationResult(detail),
      errorRepresentation(representation)
    );
  }
  return null;
}

function validateActionRequest(
  context: RuntimeContext,
  request: MdanRequest,
  representation: Exclude<RequestRepresentation, "html">,
  pathname: string,
  routePath: string,
  params: Record<string, string>,
  session: MdanSessionSnapshot | null
): ValidatedActionRequest {
  if (request.method === "POST" && representation !== "json") {
    return {
      response: createResponse(createJsonActionOnlyResult(representation), "markdown")
    };
  }

  if (request.method === "POST" && hasRequestBody(request) && !isSupportedWriteContentType(request.headers["content-type"])) {
    return {
      response: createResponse(
        fail({
          status: 415,
          route: pathname,
          fragment: createErrorFragment(
            "Unsupported Media Type",
            'POST requests must use Content-Type: "application/json".'
          )
        }),
        representation
      )
    };
  }

  const parsedInputs = parseRequestInputs(request, { actionProofEnabled: Boolean(context.actionProof) });
  if (!parsedInputs.ok) {
    return {
      response: createResponse(
        fail({
          status: 400,
          route: pathname,
          fragment: createErrorFragment("Invalid Request Body", parsedInputs.detail)
        }),
        representation
      )
    };
  }

  let { inputs, inputsRaw } = parsedInputs.parsed;
  const requestAction: ParsedRequestAction | null = parsedInputs.parsed.requestAction;

  if (context.actionProof && !isBrowserFormAdaptedRequest(request)) {
    const proofValidation = validateActionProofRequest(request, context.actionProof, requestAction, inputs, inputsRaw);
    if (!proofValidation.ok) {
      if (proofValidation.reason === "invalid-format") {
        return {
          response: createResponse(
            createActionRequestFormatViolationResult(proofValidation.missing),
            representation
          )
        };
      }
      if (proofValidation.reason === "invalid-proof") {
        return {
          response: createResponse(createActionProofViolationResult(), representation)
        };
      }
      if (proofValidation.reason === "invalid-payload") {
        return {
          response: createResponse(
            fail({
              status: 400,
              fragment: createErrorFragment("Invalid Action Payload", "Request contains undeclared action input fields.")
            }),
            representation
          )
        };
      }
      if (proofValidation.reason === "invalid-input-schema") {
        return {
          response: createResponse(
            createActionInputSchemaViolationResult(proofValidation.errors),
            representation
          )
        };
      }
      return {
        response: createResponse(createActionConfirmationViolationResult(), representation)
      };
    }
    inputs = proofValidation.inputs;
    inputsRaw = proofValidation.inputsRaw;
  }

  if (request.method === "POST" && context.options.validatePostRequest) {
    const validation = context.options.validatePostRequest({
      request,
      routePath,
      params,
      inputs: inputsRaw,
      session
    });
    if (validation && !validation.ok) {
      return {
        response: createResponse(
          fail({
            status: 400,
            fragment: createErrorFragment("Invalid Request Fields", validation.detail)
          }),
          representation
        )
      };
    }
  }

  return { inputs, inputsRaw };
}

async function commitSessionMutation(
  context: RuntimeContext,
  session: MdanSessionSnapshot | null,
  response: MdanResponse,
  request: MdanRequest,
  mutation: MdanActionResult["session"] | null | undefined,
  representation: RequestRepresentation
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
    return createInternalErrorResponseFor(representation);
  }
}

async function handlePageRequest(
  context: RuntimeContext,
  request: MdanRequest,
  representation: RequestRepresentation,
  pageMatch: PageMatch,
  session: MdanSessionSnapshot | null
): Promise<MdanResponse | null> {
  if (representation === "event-stream") {
    return createResponse(
      fail({
        status: 406,
        fragment: createErrorFragment("Not Acceptable", "Page routes do not support text/event-stream.")
      }),
      "markdown"
    );
  }

  const executedPage = await executeValidatedEnvelopeHandler<MdanPageHandlerResult, JsonSurfaceEnvelope, MdanResponse>({
    execute: () =>
      pageMatch.handler({
        request,
        session,
        params: pageMatch.params
      }),
    invalidContractDetail: "Page handlers must return JSON surface envelopes.",
    createInternalErrorResponse: () => createResponse(createInternalServerErrorResult(), errorRepresentation(representation)),
    createInvalidContractResponse: (detail) =>
      createJsonContractResponseFor(representation, detail),
    validateEnvelope: (envelope) => validateRuntimeEnvelope(envelope, context, representation),
    isEnvelope: isJsonSurfaceEnvelope,
    skipValidation: (result) => !result
  });
  if (executedPage.response) {
    return executedPage.response;
  }
  const pageResult = executedPage.result;

  const normalizedPageResult = normalizePageHandlerResult(pageResult);
  if (pageResult && representation === "html") {
    return createHtmlSurfaceResponse(
      context.actionProof ? withActionProofsForJsonEnvelope(pageResult, context.actionProof) : pageResult,
      context.options.browserShell,
      200
    );
  }
  if (pageResult && representation === "json") {
    return createJsonSurfaceResponse(
      context.actionProof ? withActionProofsForJsonEnvelope(pageResult, context.actionProof) : pageResult
    );
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
    context.autoDependencyOptions
  );
  const response = createPageResponse(
    context.actionProof
      ? (withActionProofs({ page: resolvedPage.page }, context.actionProof).page ?? resolvedPage.page)
      : resolvedPage.page
  );
  const sessionError = await commitSessionMutation(
    context,
    session,
    response,
    request,
    resolvedPage.session,
    representation
  );
  return sessionError ?? response;
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
  let handlerResult: MdanHandlerResultLike;
  try {
    handlerResult = await Promise.resolve(match.handler(createActionHandlerContext(context, request, validatedRequest, session, match)));
  } catch {
    return createInternalErrorResponseFor(representation);
  }

  let resultLike: MdanHandlerResultLike;
  if ("stream" in handlerResult) {
    resultLike = handlerResult;
  } else {
    const executedAction = await executeValidatedEnvelopeHandler<JsonSurfaceEnvelope, JsonSurfaceEnvelope, MdanResponse>({
      execute: async () => handlerResult,
      invalidContractDetail: "Action handlers must return JSON surface envelopes.",
      createInternalErrorResponse: () => createInternalErrorResponseFor(representation),
      createInvalidContractResponse: (detail) => createJsonContractResponseFor(representation, detail),
      validateEnvelope: (envelope) => validateRuntimeEnvelope(envelope, context, representation),
      isEnvelope: isJsonSurfaceEnvelope
    });
    if (executedAction.response) {
      return executedAction.response;
    }
    resultLike = executedAction.result;
  }

  if (!("stream" in resultLike) && representation === "json") {
    const normalizedResult = normalizeActionHandlerResult(resultLike);
    const response = createJsonSurfaceResponse(
      context.actionProof ? withActionProofsForJsonEnvelope(resultLike, context.actionProof) : resultLike,
      normalizedResult.status ?? 200,
      normalizedResult.headers
    );
    const sessionError = await commitSessionMutation(
      context,
      session,
      response,
      request,
      normalizedResult.session,
      representation
    );
    return sessionError ?? response;
  }

  const resolvedResult =
    "stream" in resultLike
      ? resultLike
      : await resolveAutoActionResult(
          normalizeActionHandlerResult(resultLike),
          request,
          session,
          context.router,
          context.assetOptions,
          context.autoDependencyOptions
        );
  const signedResult =
    "stream" in resolvedResult || !context.actionProof ? resolvedResult : withActionProofs(resolvedResult, context.actionProof);
  const response = createResponse(signedResult, representation);
  const sessionError = await commitSessionMutation(
    context,
    session,
    response,
    request,
    resolvedResult.session,
    representation
  );
  return sessionError ?? response;
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
        return createResponse(
          fail({
            status: 406,
            fragment: {
              markdown: "## Not Acceptable",
              blocks: []
            }
          }),
          "markdown"
        );
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
        return createResponse(createHtmlPageOnlyResult(), "markdown");
      }

      const match = router.resolve(request.method, pathname);
      if (!match) {
        return createResponse(
          fail({
            status: 404,
            route: pathname,
            fragment: {
              markdown: "## Not Found",
              blocks: []
            }
          }),
          representation
        );
      }
      return await handleActionRequest(
        context,
        request,
        representation as Exclude<RequestRepresentation, "html">,
        pathname,
        match,
        session
      );
    }
  };
}
