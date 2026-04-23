import { validateMarkdownContentPair, type ReadableSurface } from "./markdown-surface.js";

export interface ServerContractViolation {
  path: string;
  message: string;
}

export function validateContentActionConsistency(surface: ReadableSurface): ServerContractViolation[] {
  const actions = Array.isArray(surface.actions.actions) ? surface.actions.actions : [];
  const actionIds = actions
    .map((action) => (typeof action?.id === "string" ? action.id : null))
    .filter((actionId): actionId is string => Boolean(actionId));
  return validateMarkdownContentPair(surface.markdown, actionIds);
}
