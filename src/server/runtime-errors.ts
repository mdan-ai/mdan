import { createResponse } from "./response.js";
import { fail } from "./result.js";
import type { MdanActionResult, MdanResponse } from "./types.js";

function createErrorFragment(title: string, detail?: string) {
  return {
    markdown: detail ? `## ${title}\n\n${detail}` : `## ${title}`,
    blocks: []
  };
}

function createErrorResult(status: number, title: string, detail?: string): MdanActionResult {
  return fail({
    status,
    fragment: createErrorFragment(title, detail)
  });
}

function createStructuredErrorDetail(payload: Record<string, unknown>): string {
  return [
    "```json",
    JSON.stringify(payload, null, 2),
    "```"
  ].join("\n");
}

export function createErrorResponse(
  representation: "markdown" | "event-stream",
  status: number,
  title: string,
  detail?: string,
  route?: string
): MdanResponse {
  return createResponse(
    fail({
      status,
      ...(route ? { route } : {}),
      fragment: createErrorFragment(title, detail)
    }),
    representation
  );
}

export function createMarkdownErrorResultResponse(result: MdanActionResult): MdanResponse {
  return createResponse(result, "markdown");
}

export function createInternalServerErrorResult(): MdanActionResult {
  return createErrorResult(
    500,
    "Internal Server Error",
    "The host hit an unexpected failure. Retry the previous action or refresh the page."
  );
}

export function createActionProofViolationResult(): MdanActionResult {
  return createErrorResult(400, "Invalid Action Proof", "The action request proof is missing or invalid.");
}

export function createInvalidActionHandlerResult(): MdanActionResult {
  return createErrorResult(
    500,
    "Invalid Action Handler Result",
    "Action handlers must return a readable surface, an artifact-native action result, or a stream result."
  );
}

export function createInvalidPageHandlerResult(): MdanActionResult {
  return createErrorResult(
    500,
    "Invalid Page Handler Result",
    "Page handlers must return a readable surface or an artifact-native page result."
  );
}

export function createActionRequestFormatViolationResult(missing: string[]): MdanActionResult {
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
  return createErrorResult(400, "Invalid Action Request Format", detail);
}

export function createActionConfirmationViolationResult(): MdanActionResult {
  return createErrorResult(
    400,
    "Action Confirmation Required",
    'This action requires explicit confirmation. Submit with "action.confirmed": true.'
  );
}

export function createActionInputSchemaViolationResult(errors: string[]): MdanActionResult {
  return createErrorResult(
    400,
    "Invalid Action Input",
    createStructuredErrorDetail({
      code: "invalid_action_input",
      errors
    })
  );
}

export function createHtmlPageOnlyResult(): MdanActionResult {
  return createErrorResult(
    406,
    "Not Acceptable",
    "HTML responses are only available for page GET requests. Use text/markdown for page reads."
  );
}

export function createNonMarkdownActionOnlyResult(requestedRepresentation: "event-stream" | "html"): MdanActionResult {
  const requestedType =
    requestedRepresentation === "event-stream"
      ? "text/event-stream"
      : "text/html";
  return createErrorResult(
    406,
    "Not Acceptable",
    `${requestedType} is not available for action or block update requests. Use text/markdown.`
  );
}

export function createNotFoundResult(pathname: string): MdanActionResult {
  return fail({
    status: 404,
    route: pathname,
    fragment: {
      markdown: "## Not Found",
      blocks: []
    }
  });
}

export function createActionsContractViolationResult(detail: string): MdanActionResult {
  return createErrorResult(500, "Actions Contract Violation", detail);
}

export function createSemanticSlotsViolationResult(errors: string[]): MdanActionResult {
  return createErrorResult(500, "Semantic Slots Violation", errors.join("\n"));
}

export function createAgentBlocksViolationResult(errors: string[]): MdanActionResult {
  return createErrorResult(500, "Agent Blocks Violation", errors.join("\n"));
}
