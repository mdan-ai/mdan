import { adaptReadableSurfaceToHeadlessSnapshot } from "./adapter.js";
import type { ReadableSurface } from "./content.js";
import type { MdanOperation, MdanSubmitValues } from "../core/surface/presentation.js";

function serializeJsonBody(value: unknown): string {
  return JSON.stringify(value);
}

function hasFileValue(values: MdanSubmitValues): boolean {
  const hasFileCtor = typeof File !== "undefined";
  return hasFileCtor && Object.values(values).some((value) => value instanceof File);
}

function toFormValue(value: MdanSubmitValues[string]): string | File {
  if (typeof File !== "undefined" && value instanceof File) {
    return value;
  }
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
}

export function buildSubmitBody(
  operation: MdanOperation,
  values: MdanSubmitValues
): { body: string | FormData; multipart: boolean } {
  const actionProof = typeof operation.actionProof === "string" ? operation.actionProof : undefined;
  if (hasFileValue(values)) {
    const form = new FormData();
    if (actionProof) {
      form.set("action.proof", actionProof);
    }
    for (const [key, value] of Object.entries(values)) {
      form.set(key, toFormValue(value));
    }
    return { body: form, multipart: true };
  }

  if (!actionProof) {
    return { body: serializeJsonBody({ input: values }), multipart: false };
  }
  return {
    body: serializeJsonBody({
      action: {
        proof: actionProof
      },
      input: values
    }),
    multipart: false
  };
}

export function isResponseOk(response: unknown): boolean {
  const candidate = response as { ok?: unknown; status?: unknown };
  if (typeof candidate.ok === "boolean") {
    return candidate.ok;
  }
  if (typeof candidate.status === "number") {
    return candidate.status >= 200 && candidate.status < 300;
  }
  return true;
}

export function extractResponseErrorMessage(
  response: unknown,
  surface: ReadableSurface | null,
  fallbackContent: string
): string {
  const candidate = response as { status?: unknown; statusText?: unknown };
  const status = typeof candidate.status === "number" ? candidate.status : undefined;
  const statusText = typeof candidate.statusText === "string" ? candidate.statusText.trim() : "";
  const content = surface ? adaptReadableSurfaceToHeadlessSnapshot(surface).markdown : fallbackContent;
  const firstLine = content
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  const parts = [
    status !== undefined ? `HTTP ${status}` : "HTTP request failed",
    statusText || undefined,
    firstLine || undefined
  ].filter(Boolean);
  return parts.join(": ");
}
