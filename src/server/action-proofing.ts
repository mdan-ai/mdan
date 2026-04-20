import { randomBytes } from "node:crypto";

import {
  createActionProofToken,
  readActionProofClaims,
  verifyActionProofTokenWithClaims
} from "./action-proof.js";
import { normalizeInputValuesBySchema } from "../protocol/input/input-schema.js";
import type { MdanConfirmationPolicy, MdanOperation } from "../protocol/types.js";
import type { JsonAction } from "../protocol/surface.js";

import type { ParsedRequestAction } from "./request-inputs.js";
import type { MdanActionResult, MdanRequest } from "./types.js";

export interface ActionProofOptions {
  secret?: string;
  ttlSeconds?: number;
  disabled?: boolean;
}

export interface ResolvedActionProofOptions {
  secret: string;
  ttlSeconds?: number;
}

export type ActionProofRequestValidation =
  | {
      ok: true;
      inputs: Record<string, unknown>;
      inputsRaw: Record<string, unknown>;
    }
  | {
      ok: false;
      reason: "invalid-format";
      missing: string[];
    }
  | {
      ok: false;
      reason: "invalid-proof";
    }
  | {
      ok: false;
      reason: "invalid-payload";
    }
  | {
      ok: false;
      reason: "invalid-input-schema";
      errors: string[];
    }
  | {
      ok: false;
      reason: "confirmation-required";
    };

export function resolveActionProofOptions(actionProof?: ActionProofOptions): ResolvedActionProofOptions | null {
  if (actionProof?.disabled === true) {
    return null;
  }
  return {
    secret: actionProof?.secret ?? process.env.MDAN_ACTION_PROOF_SECRET ?? randomBytes(32).toString("base64url"),
    ...(typeof actionProof?.ttlSeconds === "number" ? { ttlSeconds: actionProof.ttlSeconds } : {})
  };
}

function getPathname(request: MdanRequest): string {
  return new URL(request.url).pathname;
}

function toUnixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

const allowedConfirmationPolicies = new Set<MdanConfirmationPolicy>(["never", "always", "high-and-above"]);

function getConfirmationPolicy(operation: MdanOperation): MdanConfirmationPolicy {
  const policy = operation.security?.confirmationPolicy;
  if (typeof policy !== "string" || !allowedConfirmationPolicies.has(policy as MdanConfirmationPolicy)) {
    return "never";
  }
  return policy as MdanConfirmationPolicy;
}

function getRiskLevel(operation: MdanOperation): string {
  return typeof operation.guard?.riskLevel === "string" ? operation.guard.riskLevel : "low";
}

function requiresActionConfirmation(operation: MdanOperation): boolean {
  const policy = getConfirmationPolicy(operation);
  if (policy === "always") {
    return true;
  }
  if (policy === "high-and-above") {
    const riskLevel = getRiskLevel(operation);
    return riskLevel === "high" || riskLevel === "critical";
  }
  return false;
}

function resolveActionId(operation: MdanOperation): string {
  return operation.name ?? `${operation.method}:${operation.target}`;
}

function buildSubmitInputTemplate(operation: MdanOperation): Record<string, string> {
  return Object.fromEntries(operation.inputs.map((name) => [name, `<${name}>`]));
}

function getOperationInputSchema(operation: MdanOperation): Record<string, unknown> {
  const schema = operation.inputSchema;
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return {
      type: "object",
      properties: {},
      required: []
    };
  }
  return schema as Record<string, unknown>;
}

function withActionProofsForOperation(operation: MdanOperation, actionProof: ResolvedActionProofOptions): MdanOperation {
  const actionId = resolveActionId(operation);
  const issuedAt = toUnixSeconds();
  const ttlSeconds = Math.max(1, actionProof.ttlSeconds ?? 600);
  const expiresAt = issuedAt + ttlSeconds;
  const confirmationRequired = requiresActionConfirmation(operation);
  const token = createActionProofToken(
    {
      actionId,
      method: operation.method,
      target: operation.target,
      inputNames: [...operation.inputs],
      inputSchema: getOperationInputSchema(operation),
      issuedAt,
      expiresAt,
      confirmationRequired
    },
    actionProof.secret
  );
  return {
    ...operation,
    actionId,
    actionProof: token,
    actionIssuedAt: issuedAt,
    submitFormat: "mdan-action-input-v1",
    requiresConfirmation: confirmationRequired,
    submitExample: {
      action: {
        proof: "<operation.actionProof>",
        ...(confirmationRequired ? { confirmed: true } : {})
      },
      input: buildSubmitInputTemplate(operation)
    }
  } as unknown as MdanOperation;
}

export function withActionProofs(result: MdanActionResult, actionProof: ResolvedActionProofOptions): MdanActionResult {
  if (result.page) {
    return {
      ...result,
      page: {
        ...result.page,
        blocks: result.page.blocks.map((block) => ({
          ...block,
          operations: block.operations.map((operation) => withActionProofsForOperation(operation, actionProof))
        }))
      }
    };
  }
  if (result.fragment) {
    return {
      ...result,
      fragment: {
        ...result.fragment,
        blocks: result.fragment.blocks.map((block) => ({
          ...block,
          operations: block.operations.map((operation) => withActionProofsForOperation(operation, actionProof))
        }))
      }
    };
  }
  return result;
}

function validateRequestActionProof(request: MdanRequest, actionProof: ResolvedActionProofOptions, token: string) {
  const claims = readActionProofClaims(token);
  if (!claims?.actionId) {
    return null;
  }
  return verifyActionProofTokenWithClaims({
    token,
    secret: actionProof.secret,
    expectedActionId: claims.actionId,
    expectedMethod: request.method,
    expectedTarget: getPathname(request)
  });
}

function hasOnlyAllowedInputNames(inputs: Record<string, unknown>, allowedInputNames: string[]): boolean {
  const allowed = new Set(allowedInputNames);
  return Object.keys(inputs).every((name) => allowed.has(name));
}

export function validateActionProofRequest(
  request: MdanRequest,
  actionProof: ResolvedActionProofOptions,
  requestAction: ParsedRequestAction | null,
  inputs: Record<string, unknown>,
  inputsRaw: Record<string, unknown>
): ActionProofRequestValidation {
  if (!requestAction) {
    return {
      ok: false,
      reason: "invalid-format",
      missing: ["action", "action.proof", "input"]
    };
  }

  const token = requestAction.proof;
  if (!token) {
    return {
      ok: false,
      reason: "invalid-format",
      missing: ["action.proof"]
    };
  }

  const claims = validateRequestActionProof(request, actionProof, token);
  if (!claims) {
    return {
      ok: false,
      reason: "invalid-proof"
    };
  }

  if (!hasOnlyAllowedInputNames(inputs, claims.inputNames)) {
    return {
      ok: false,
      reason: "invalid-payload"
    };
  }

  let normalizedInputs = inputs;
  let normalizedInputsRaw = inputsRaw;
  if (claims.inputSchema) {
    const normalized = normalizeInputValuesBySchema(inputs, claims.inputSchema);
    if (normalized.errors.length > 0) {
      return {
        ok: false,
        reason: "invalid-input-schema",
        errors: normalized.errors
      };
    }
    normalizedInputs = normalized.inputs;
    normalizedInputsRaw = normalized.inputsRaw;
  }

  if (claims.confirmationRequired === true && requestAction.confirmed !== true) {
    return {
      ok: false,
      reason: "confirmation-required"
    };
  }

  return {
    ok: true,
    inputs: normalizedInputs,
    inputsRaw: normalizedInputsRaw
  };
}
