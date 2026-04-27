import { type ReadableSurface } from "../core/surface/markdown.js";
import type { ReadableSurfaceValidationOptions } from "../core/surface/validation.js";
import { getReadableSurfaceViolation } from "../core/surface/validation.js";
import {
  createActionsContractViolationResult,
  createAgentBlocksViolationResult,
  createMarkdownErrorResultResponse
} from "./runtime-errors.js";
import type { MdanResponse } from "./types/transport.js";

export function createReadableSurfaceValidationResponse(
  surface: ReadableSurface,
  options: ReadableSurfaceValidationOptions
): MdanResponse | null {
  const violation = getReadableSurfaceViolation(surface, options);
  if (!violation) {
    return null;
  }

  return createMarkdownErrorResultResponse(
    violation.kind === "agent"
      ? createAgentBlocksViolationResult(violation.errors)
      : createActionsContractViolationResult(violation.detail)
  );
}

export { createMarkdownErrorResultResponse as createInvalidHandlerResultResponse } from "./runtime-errors.js";
