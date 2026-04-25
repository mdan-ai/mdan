import { MdanParseError } from "./errors.js";
import { normalizeInputValuesBySchema } from "../core/protocol.js";
import { parseActionRequestBody } from "./json-body.js";
import type { MdanRequest } from "./types/transport.js";

export interface ParsedRequestAction {
  proof?: string;
  confirmed: boolean;
}

export interface ParsedRequestInputs {
  inputs: Record<string, unknown>;
  inputsRaw: Record<string, unknown>;
  requestAction: ParsedRequestAction | null;
}

export type ParseRequestInputsResult =
  | {
      ok: true;
      parsed: ParsedRequestInputs;
    }
  | {
      ok: false;
      detail: string;
    };

const INPUT_SCHEMA_META_KEY = "mdan.input_schema";

function getInputs(request: MdanRequest): Record<string, string> {
  const url = new URL(request.url);
  return Object.fromEntries(url.searchParams.entries());
}

function stripInputMetaKeys(inputs: Record<string, unknown>): Record<string, unknown> {
  const next = { ...inputs };
  delete next[INPUT_SCHEMA_META_KEY];
  return next;
}

function stripActionMetaKeys(inputs: Record<string, unknown>): Record<string, unknown> {
  const next = { ...inputs };
  delete next["action.proof"];
  delete next["action.confirmed"];
  return next;
}

function extractActionMetaFromFlatInputs(
  inputs: Record<string, unknown>
): { action: ParsedRequestAction | null; input: Record<string, unknown> } {
  const proofValue = inputs["action.proof"];
  const confirmedValue = inputs["action.confirmed"];
  const proof = typeof proofValue === "string" ? proofValue : undefined;
  const confirmedRaw = typeof confirmedValue === "string" ? confirmedValue : undefined;
  if (proof === undefined && confirmedRaw === undefined) {
    return { action: null, input: inputs };
  }
  const confirmed = confirmedRaw === "true";
  return {
    action: {
      ...(proof ? { proof } : {}),
      confirmed
    },
    input: stripActionMetaKeys(inputs)
  };
}

function hasFlatActionMeta(inputs: Record<string, unknown>): boolean {
  return (
    "action.proof" in inputs ||
    "action.confirmed" in inputs
  );
}

function applyEmbeddedInputSchema(
  inputs: Record<string, unknown>
): {
  ok: true;
  inputs: Record<string, unknown>;
  inputsRaw: Record<string, unknown>;
} | {
  ok: false;
  detail: string;
} {
  const schemaValue = inputs[INPUT_SCHEMA_META_KEY];
  if (schemaValue === undefined) {
    return {
      ok: true,
      inputs,
      inputsRaw: inputs
    };
  }

  if (typeof schemaValue !== "string") {
    return {
      ok: false,
      detail: "Invalid embedded input schema metadata."
    };
  }

  let schema: unknown;
  try {
    schema = JSON.parse(schemaValue);
  } catch {
    return {
      ok: false,
      detail: "Invalid embedded input schema metadata."
    };
  }

  const stripped = stripInputMetaKeys(inputs);
  const normalized = normalizeInputValuesBySchema(stripped, schema);
  if (normalized.errors.length > 0) {
    return {
      ok: false,
      detail: normalized.errors.join("\n")
    };
  }

  return {
    ok: true,
    inputs: normalized.inputs,
    inputsRaw: normalized.inputsRaw
  };
}

export function parseRequestInputs(request: MdanRequest, options: { actionProofEnabled?: boolean } = {}): ParseRequestInputsResult {
  let inputs: Record<string, unknown>;
  let requestAction: ParsedRequestAction | null = null;
  try {
    if (request.method === "GET") {
      inputs = getInputs(request);
      if (options.actionProofEnabled === true) {
        const extracted = extractActionMetaFromFlatInputs(inputs);
        inputs = extracted.input;
        requestAction = extracted.action;
      }
    } else {
      const body = typeof request.body === "string" ? request.body.trim() : "";
      const parsed = parseActionRequestBody(body.length > 0 ? body : "{}");
      inputs = parsed.input;
      requestAction = parsed.action;
      if (hasFlatActionMeta(inputs)) {
        inputs = stripActionMetaKeys(inputs);
      }
    }
  } catch (error) {
    if (error instanceof MdanParseError) {
      return {
        ok: false,
        detail: error.message
      };
    }
    throw error;
  }

  const normalized = applyEmbeddedInputSchema(inputs);
  if (!normalized.ok) {
    return normalized;
  }

  return {
    ok: true,
    parsed: {
      inputs: normalized.inputs,
      inputsRaw: normalized.inputsRaw,
      requestAction
    }
  };
}
