import {
  basicMarkdownRenderer,
  type MdanMarkdownRenderer
} from "../content.js";
import {
  fieldSchemasFromJsonObjectSchema,
  normalizeInputValuesByFieldSchemas,
  resolveFieldFormat,
  resolveFieldKind,
  type FieldSchema,
  type JsonAction,
  type MdanBlock,
  type MdanConfirmationPolicy,
  type MdanHeadlessBlock,
  type MdanOperation,
  type MdanOperationStateEffect,
  type MdanPage,
  type MdanSubmitValue,
  type MdanSubmitValues
} from "../protocol.js";

export {
  basicMarkdownRenderer,
  fieldSchemasFromJsonObjectSchema,
  normalizeInputValuesByFieldSchemas,
  resolveFieldFormat,
  resolveFieldKind
};
export type {
  FieldSchema,
  JsonAction,
  MdanBlock,
  MdanConfirmationPolicy,
  MdanHeadlessBlock,
  MdanMarkdownRenderer,
  MdanOperation,
  MdanOperationStateEffect,
  MdanPage,
  MdanSubmitValue,
  MdanSubmitValues
};

export type UiActionBehavior = "page" | "region" | "submit" | "read";
export type UiActionVariant = "primary" | "secondary" | "quiet" | "danger";
export type UiDispatchMode = "visit" | "submit";

export function humanizeInputLabel(value: string, options: { titleCase?: boolean } = {}): string {
  const normalized = value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (options.titleCase) {
    return normalized.replace(/\b\w/g, (match) => match.toUpperCase());
  }

  return normalized;
}

function matchesLogoutSignaturePart(value: string | undefined): boolean {
  if (typeof value !== "string" || value.trim().length === 0) {
    return false;
  }

  const normalized = value.toLowerCase().replace(/[_/-]+/g, " ").trim();
  return /\blogout\b/.test(normalized) || /\blog\s+out\b/.test(normalized);
}

export function resolveActionBehavior(operation: MdanOperation): UiActionBehavior {
  const verb = typeof operation.verb === "string" ? operation.verb : null;
  if (verb === "read") {
    return "read";
  }

  const responseMode = operation.stateEffect?.responseMode;
  if (responseMode === "region") {
    return "region";
  }
  if (responseMode === "page" && (verb === "route" || operation.method === "GET")) {
    return "page";
  }
  if (responseMode === "page") {
    return "submit";
  }

  if (verb === "route" || operation.method === "GET") {
    return "page";
  }
  return "submit";
}

export function resolveActionVariant(operation: MdanOperation): UiActionVariant {
  const riskLevel = operation.guard?.riskLevel;
  if (riskLevel === "high" || riskLevel === "critical") {
    return "danger";
  }

  if (
    matchesLogoutSignaturePart(operation.name) ||
    matchesLogoutSignaturePart(operation.label) ||
    matchesLogoutSignaturePart(operation.target)
  ) {
    return "quiet";
  }

  const behavior = resolveActionBehavior(operation);
  if (behavior === "submit") {
    return "primary";
  }
  if (behavior === "page") {
    return "secondary";
  }
  return "quiet";
}

export function resolveDispatchMode(operation: MdanOperation, payload: MdanSubmitValues = {}): UiDispatchMode {
  const behavior = resolveActionBehavior(operation);
  if (operation.method === "GET" && behavior === "page" && Object.keys(payload).length === 0) {
    return "visit";
  }
  return "submit";
}
