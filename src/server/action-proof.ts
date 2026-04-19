import { createHmac, timingSafeEqual } from "node:crypto";

export interface ActionProofClaims {
  actionId: string;
  method: "GET" | "POST";
  target: string;
  inputNames: string[];
  inputSchema?: Record<string, unknown>;
  issuedAt: number;
  expiresAt: number;
  confirmationRequired?: boolean;
}

export interface VerifyActionProofInput {
  token: string;
  secret: string;
  nowUnixSeconds?: number;
  expectedActionId: string;
  expectedMethod: "GET" | "POST";
  expectedTarget: string;
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function stableClaimsJson(claims: ActionProofClaims): string {
  return JSON.stringify({
    actionId: claims.actionId,
    method: claims.method,
    target: claims.target,
    inputNames: claims.inputNames,
    inputSchema: claims.inputSchema ?? { type: "object", properties: {}, required: [] },
    issuedAt: claims.issuedAt,
    expiresAt: claims.expiresAt,
    confirmationRequired: claims.confirmationRequired === true
  });
}

function signPayload(payloadBase64Url: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadBase64Url).digest("base64url");
}

function parseClaims(payloadBase64Url: string): ActionProofClaims | null {
  let parsed: ActionProofClaims;
  try {
    parsed = JSON.parse(fromBase64Url(payloadBase64Url)) as ActionProofClaims;
  } catch {
    return null;
  }
  if (
    typeof parsed.actionId !== "string" ||
    typeof parsed.target !== "string" ||
    (parsed.method !== "GET" && parsed.method !== "POST")
  ) {
    return null;
  }
  if (!Array.isArray(parsed.inputNames) || parsed.inputNames.some((entry) => typeof entry !== "string")) {
    return null;
  }
  if (parsed.inputSchema !== undefined && (parsed.inputSchema === null || typeof parsed.inputSchema !== "object" || Array.isArray(parsed.inputSchema))) {
    return null;
  }
  if (
    parsed.confirmationRequired !== undefined &&
    typeof parsed.confirmationRequired !== "boolean"
  ) {
    return null;
  }
  if (typeof parsed.issuedAt !== "number" || typeof parsed.expiresAt !== "number") {
    return null;
  }
  return parsed;
}

export function createActionProofToken(claims: ActionProofClaims, secret: string): string {
  const payload = toBase64Url(stableClaimsJson(claims));
  const signature = signPayload(payload, secret);
  return `${payload}.${signature}`;
}

export function verifyActionProofToken(input: VerifyActionProofInput): boolean {
  const [payload, signature] = input.token.split(".");
  if (!payload || !signature) {
    return false;
  }

  const expectedSignature = signPayload(payload, input.secret);
  const givenBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  if (givenBuffer.length !== expectedBuffer.length) {
    return false;
  }
  if (!timingSafeEqual(givenBuffer, expectedBuffer)) {
    return false;
  }

  const parsed = parseClaims(payload);
  if (!parsed) {
    return false;
  }

  if (
    parsed.actionId !== input.expectedActionId ||
    parsed.method !== input.expectedMethod ||
    parsed.target !== input.expectedTarget
  ) {
    return false;
  }

  const now = input.nowUnixSeconds ?? Math.floor(Date.now() / 1000);
  if (parsed.issuedAt > now || parsed.expiresAt < now) {
    return false;
  }

  return true;
}

export function verifyActionProofTokenWithClaims(
  input: VerifyActionProofInput
): ActionProofClaims | null {
  const [payload] = input.token.split(".");
  if (!verifyActionProofToken(input) || !payload) {
    return null;
  }
  return parseClaims(payload);
}

export function readActionProofClaims(token: string): ActionProofClaims | null {
  const [payload] = token.split(".");
  if (!payload) {
    return null;
  }
  return parseClaims(payload);
}
