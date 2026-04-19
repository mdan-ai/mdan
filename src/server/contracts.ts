import { validateContentPair } from "../content/content-actions.js";
import type { JsonSurfaceEnvelope } from "../protocol/surface.js";

export interface ServerContractViolation {
  path: string;
  message: string;
}

export function validateContentActionConsistency(envelope: JsonSurfaceEnvelope): ServerContractViolation[] {
  const actions = Array.isArray(envelope.actions.actions) ? envelope.actions.actions : [];
  const actionIds = actions
    .map((action) => (typeof action?.id === "string" ? action.id : null))
    .filter((actionId): actionId is string => Boolean(actionId));
  return validateContentPair(envelope.content, actionIds);
}
