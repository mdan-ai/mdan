import {
  validateActionProofRequest,
  type ResolvedActionProofOptions
} from "./action-proofing.js";
import { parseRequestInputs } from "./request-inputs.js";
import {
  createActionConfirmationViolationResult,
  createActionInputSchemaViolationResult,
  createActionRequestFormatViolationResult,
  createErrorResponse,
  createNonMarkdownActionOnlyResult
} from "./runtime-errors.js";
import type { MdanSessionSnapshot } from "./types/session.js";
import type { MdanRequest, MdanResponse } from "./types/transport.js";
import type { MdanPostInputValidator } from "./post-input-validation.js";

export type ValidatedActionRequest =
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

export interface ActionRequestValidationOptions {
  validatePostRequest?: MdanPostInputValidator;
  actionProof: ResolvedActionProofOptions | null;
}

function rejectActionRequest(response: MdanResponse): ValidatedActionRequest {
  return {
    response
  };
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

export function validateActionRequest(
  options: ActionRequestValidationOptions,
  request: MdanRequest,
  representation: "markdown" | "event-stream",
  pathname: string,
  routePath: string,
  params: Record<string, string>,
  session: MdanSessionSnapshot | null
): ValidatedActionRequest {
  if (request.method === "POST" && representation !== "markdown") {
    return rejectActionRequest(createErrorResponse("markdown", 406, "Not Acceptable", createNonMarkdownActionOnlyResult(representation).fragment?.markdown?.replace(/^## Not Acceptable\n\n?/, "")));
  }

  if (request.method === "POST" && hasRequestBody(request) && !isSupportedWriteContentType(request.headers["content-type"])) {
    return rejectActionRequest(
      createErrorResponse(
        representation,
        415,
        "Unsupported Media Type",
        'POST requests must use Content-Type: "application/json".',
        pathname
      )
    );
  }

  const parsedInputs = parseRequestInputs(request, { actionProofEnabled: Boolean(options.actionProof) });
  if (!parsedInputs.ok) {
    return rejectActionRequest(
      createErrorResponse(
        representation,
        400,
        "Invalid Request Body",
        parsedInputs.detail,
        pathname
      )
    );
  }

  let { inputs, inputsRaw } = parsedInputs.parsed;
  const requestAction = parsedInputs.parsed.requestAction;

  if (options.actionProof && !isBrowserFormAdaptedRequest(request)) {
    const proofValidation = validateActionProofRequest(request, options.actionProof, requestAction, inputs, inputsRaw);
    if (!proofValidation.ok) {
      if (proofValidation.reason === "invalid-format") {
        return rejectActionRequest(
          createErrorResponse(
            representation,
            400,
            "Invalid Action Request Format",
            createActionRequestFormatViolationResult(proofValidation.missing).fragment?.markdown.replace(/^## Invalid Action Request Format\n\n?/, "")
          )
        );
      }
      if (proofValidation.reason === "invalid-proof") {
        return rejectActionRequest(createErrorResponse(representation, 400, "Invalid Action Proof", "The action request proof is missing or invalid."));
      }
      if (proofValidation.reason === "invalid-payload") {
        return rejectActionRequest(
          createErrorResponse(
            representation,
            400,
            "Invalid Action Payload",
            "Request contains undeclared action input fields."
          )
        );
      }
      if (proofValidation.reason === "invalid-input-schema") {
        return rejectActionRequest(
          createErrorResponse(
            representation,
            400,
            "Invalid Action Input",
            createActionInputSchemaViolationResult(proofValidation.errors).fragment?.markdown.replace(/^## Invalid Action Input\n\n?/, "")
          )
        );
      }
      return rejectActionRequest(
        createErrorResponse(
          representation,
          400,
          "Action Confirmation Required",
          createActionConfirmationViolationResult().fragment?.markdown.replace(/^## Action Confirmation Required\n\n?/, "")
        )
      );
    }
    inputs = proofValidation.inputs;
    inputsRaw = proofValidation.inputsRaw;
  }

  if (request.method === "POST" && options.validatePostRequest) {
    const validation = options.validatePostRequest({
      request,
      routePath,
      params,
      inputs: inputsRaw,
      session
    });
    if (validation && !validation.ok) {
      return rejectActionRequest(
        createErrorResponse(
          representation,
          400,
          "Invalid Request Fields",
          validation.detail
        )
      );
    }
  }

  return { inputs, inputsRaw };
}
