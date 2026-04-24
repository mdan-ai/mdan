import { validateMarkdownContentPair, type ReadableSurface } from "./markdown-surface.js";

export interface ServerContractViolation {
  path: string;
  message: string;
}

export function validateContentActionConsistency(surface: ReadableSurface): ServerContractViolation[] {
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
