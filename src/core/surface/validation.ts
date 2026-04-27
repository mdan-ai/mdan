import { assertActionsContractEnvelope } from "../protocol.js";
import {
  normalizeReadableSurface,
  validateMarkdownAgentBlocks,
  validateMarkdownContentPair,
  type ReadableSurface
} from "./markdown.js";

export interface ReadableSurfaceValidationOptions {
  appId?: string;
}

export interface SurfaceContractViolation {
  path: string;
  message: string;
}

export type ReadableSurfaceViolation =
  | {
      kind: "agent";
      errors: string[];
    }
  | {
      kind: "actions";
      detail: string;
    };

export function validateContentActionConsistency(surface: ReadableSurface): SurfaceContractViolation[] {
  const actionRoot = surface.actions.actions;
  const actions = actionRoot && typeof actionRoot === "object"
    ? Object.entries(actionRoot).map(([id, action]) => (
        action && typeof action === "object" && !Array.isArray(action)
          ? { id, ...action }
          : { id }
      ))
    : [];
  const actionIds = actions
    .map((action) => (typeof action?.id === "string" ? action.id : null))
    .filter((actionId): actionId is string => Boolean(actionId));
  return validateMarkdownContentPair(surface.markdown, actionIds);
}

function getReadableSurfacePromptViolation(
  surface: ReadableSurface
): Extract<ReadableSurfaceViolation, { kind: "agent" }> | null {
  const agentBlockErrors = validateMarkdownAgentBlocks(surface.markdown);
  if (agentBlockErrors.length > 0) {
    return { kind: "agent", errors: agentBlockErrors.map((message) => `page: ${message}`) };
  }

  for (const [blockName, markdown] of Object.entries(surface.regions ?? {})) {
    const blockErrors = validateMarkdownAgentBlocks(markdown);
    if (blockErrors.length > 0) {
      return {
        kind: "agent",
        errors: blockErrors.map((message) => `block "${blockName}": ${message}`)
      };
    }
  }

  return null;
}

export function getReadableSurfaceViolation(
  surface: ReadableSurface,
  options: ReadableSurfaceValidationOptions
): ReadableSurfaceViolation | null {
  const normalizedSurface = normalizeReadableSurface(surface, options.appId);
  const promptViolation = getReadableSurfacePromptViolation(surface);
  if (promptViolation) {
    return promptViolation;
  }

  try {
    assertActionsContractEnvelope({ actions: normalizedSurface.actions });
    const consistencyViolations = validateContentActionConsistency(normalizedSurface);
    if (consistencyViolations.length === 0) {
      return null;
    }
    return {
      kind: "actions",
      detail: consistencyViolations.map((entry) => `${entry.path}: ${entry.message}`).join("; ")
    };
  } catch (error) {
    return {
      kind: "actions",
      detail: error instanceof Error ? error.message : String(error)
    };
  }
}
