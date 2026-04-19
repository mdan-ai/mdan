import { MdanParseError } from "./errors.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toInputValue(entry: unknown, path: string): unknown {
  if (typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean" || entry === null) {
    return entry;
  }
  if (Array.isArray(entry)) {
    return entry.map((item, index) => toInputValue(item, `${path}[${index}]`));
  }
  if (isRecord(entry)) {
    return toInputRecord(entry, path);
  }
  throw new MdanParseError(`Invalid JSON field "${path}".`);
}

function toInputRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new MdanParseError(`${path} must be an object.`);
  }
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    result[key] = toInputValue(entry, `${path}.${key}`);
  }
  return result;
}

export function parseJsonBody(body: string): Record<string, string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new MdanParseError("Invalid JSON body.");
  }

  return Object.fromEntries(
    Object.entries(toInputRecord(parsed, "body")).map(([key, value]) => [key, typeof value === "string" ? value : JSON.stringify(value)])
  );
}

export interface ParsedActionRequestBody {
  input: Record<string, unknown>;
  action: {
    proof?: string;
    confirmed: boolean;
  } | null;
}

export function parseActionRequestBody(body: string): ParsedActionRequestBody {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new MdanParseError("Invalid JSON body.");
  }
  if (!isRecord(parsed)) {
    throw new MdanParseError("JSON body must be an object.");
  }

  const structured = "input" in parsed || "action" in parsed;
  if (!structured) {
    return {
      input: toInputRecord(parsed, "body"),
      action: null
    };
  }

  const inputRaw = parsed.input ?? {};
  const input = toInputRecord(inputRaw, "input");
  const actionRaw = parsed.action;
  if (actionRaw === undefined || actionRaw === null) {
    return {
      input,
      action: null
    };
  }
  if (!isRecord(actionRaw)) {
    throw new MdanParseError("action must be an object.");
  }

  const proofRaw = actionRaw.proof;
  if (proofRaw !== undefined && typeof proofRaw !== "string") {
    throw new MdanParseError("action.proof must be a string.");
  }
  const confirmedRaw = actionRaw.confirmed;
  if (confirmedRaw !== undefined && typeof confirmedRaw !== "boolean") {
    throw new MdanParseError("action.confirmed must be a boolean.");
  }

  return {
    input,
    action: {
      ...(proofRaw ? { proof: proofRaw } : {}),
      confirmed: confirmedRaw === true
    }
  };
}

export function serializeJsonBody(value: unknown): string {
  return JSON.stringify(value);
}
