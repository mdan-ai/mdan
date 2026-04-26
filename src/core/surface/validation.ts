import { assertActionsContractEnvelope } from "../protocol.js";
import {
  normalizeReadableSurface,
  validateMarkdownAgentBlocks,
  validateMarkdownSemanticSlots,
  validateMarkdownContentPair,
  type ReadableSurface
} from "./markdown.js";

export interface ReadableSurfaceSemanticSlotOptions {
  requireOnPage?: boolean;
  requireOnBlock?: boolean;
}

export interface ReadableSurfaceValidationOptions {
  appId?: string;
  semanticSlots?: boolean | ReadableSurfaceSemanticSlotOptions;
}

const PAGE_SEMANTIC_SLOT_PROFILE = ["Purpose", "Context", "Rules", "Result"] as const;
const REGION_SEMANTIC_SLOT_PROFILE = ["Context", "Result"] as const;

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
      kind: "semantic";
      errors: string[];
    }
  | {
      kind: "actions";
      detail: string;
    };

type ResolvedSemanticSlotOptions = {
  requireOnPage: boolean;
  requireOnBlock: boolean;
};

function resolveSemanticSlotOptions(
  semanticSlots: ReadableSurfaceValidationOptions["semanticSlots"]
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
  surface: ReadableSurface,
  options: ReadableSurfaceValidationOptions
): Extract<ReadableSurfaceViolation, { kind: "agent" | "semantic" }> | null {
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

  const semanticSlotOptions = resolveSemanticSlotOptions(options.semanticSlots);

  if (semanticSlotOptions.requireOnPage) {
    const semanticSlotErrors = validateMarkdownSemanticSlots(surface.markdown, {
      requiredNames: [...PAGE_SEMANTIC_SLOT_PROFILE]
    });
    if (semanticSlotErrors.length > 0) {
      return { kind: "semantic", errors: semanticSlotErrors };
    }
  }

  if (semanticSlotOptions.requireOnBlock) {
    const errors: string[] = [];
    for (const [blockName, markdown] of Object.entries(surface.regions ?? {})) {
      const blockErrors = validateMarkdownSemanticSlots(markdown, {
        requiredNames: [...REGION_SEMANTIC_SLOT_PROFILE]
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

export function getReadableSurfaceViolation(
  surface: ReadableSurface,
  options: ReadableSurfaceValidationOptions
): ReadableSurfaceViolation | null {
  const normalizedSurface = normalizeReadableSurface(surface, options.appId);
  const promptViolation = getReadableSurfacePromptViolation(surface, options);
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
