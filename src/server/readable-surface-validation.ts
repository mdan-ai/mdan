import { assertActionsContractEnvelope } from "../protocol/contracts.js";

import {
  validateArtifactAgentBlocks,
  validateArtifactSemanticSlots,
  type ReadableSurface
} from "./artifact.js";
import { validateContentActionConsistency } from "./contracts.js";
import { normalizeReadableSurface } from "./readable-surface-normalization.js";
import type {
  ReadableSurfaceSemanticSlotOptions,
  ReadableSurfaceValidationOptions
} from "./readable-surface-options.js";

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

function getReadableSurfacePromptViolation(
  surface: ReadableSurface,
  options: ReadableSurfaceValidationOptions
): Extract<ReadableSurfaceViolation, { kind: "agent" | "semantic" }> | null {
  const agentBlockErrors = validateArtifactAgentBlocks(surface.markdown);
  if (agentBlockErrors.length > 0) {
    return { kind: "agent", errors: agentBlockErrors.map((message) => `page: ${message}`) };
  }

  for (const [blockName, markdown] of Object.entries(surface.regions ?? {})) {
    const blockErrors = validateArtifactAgentBlocks(markdown);
    if (blockErrors.length > 0) {
      return {
        kind: "agent",
        errors: blockErrors.map((message) => `block "${blockName}": ${message}`)
      };
    }
  }

  const semanticSlotOptions = resolveSemanticSlotOptions(options.semanticSlots);

  if (semanticSlotOptions.requireOnPage) {
    const semanticSlotErrors = validateArtifactSemanticSlots(surface.markdown);
    if (semanticSlotErrors.length > 0) {
      return { kind: "semantic", errors: semanticSlotErrors };
    }
  }

  if (semanticSlotOptions.requireOnBlock) {
    const errors: string[] = [];
    for (const [blockName, markdown] of Object.entries(surface.regions ?? {})) {
      const blockErrors = validateArtifactSemanticSlots(markdown, {
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
