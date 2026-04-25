import type { MdanSessionSnapshot } from "./types/session.js";
import type { MdanRequest } from "./types/transport.js";

export interface PostInputValidationPolicy {
  blockName: string;
  operationTarget: string;
  declaredInputNames: string[];
  allowedInputNames: string[];
}

export interface PostInputValidationResult {
  ok: true;
}

export interface PostInputValidationFailure {
  ok: false;
  detail: string;
}

export interface PostInputValidationContext {
  request: MdanRequest;
  routePath: string;
  params: Record<string, string>;
  inputs: Record<string, unknown>;
  session: MdanSessionSnapshot | null;
}

export type MdanPostInputValidator = (
  context: PostInputValidationContext
) => PostInputValidationResult | PostInputValidationFailure | null | undefined;

export function validatePostInputs(
  inputs: Record<string, unknown>,
  policy: PostInputValidationPolicy
): PostInputValidationResult | PostInputValidationFailure {
  const receivedNames = Object.keys(inputs);
  if (receivedNames.length === 0) {
    return { ok: true };
  }

  const declared = new Set(policy.declaredInputNames);
  const allowed = new Set(policy.allowedInputNames);
  const undeclared = receivedNames.filter((name) => !declared.has(name));
  if (undeclared.length > 0) {
    return {
      ok: false,
      detail: `Block "${policy.blockName}" does not declare input(s): ${undeclared.join(", ")}.`
    };
  }

  const disallowed = receivedNames.filter((name) => !allowed.has(name));
  if (disallowed.length > 0) {
    const allowedList = policy.allowedInputNames.length > 0 ? policy.allowedInputNames.join(", ") : "(none)";
    return {
      ok: false,
      detail: `POST "${policy.operationTarget}" only accepts input(s): ${allowedList}. Rejected: ${disallowed.join(", ")}.`
    };
  }

  return { ok: true };
}
