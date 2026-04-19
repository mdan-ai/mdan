import { describe, expect, it } from "vitest";

import { executeValidatedEnvelopeHandler } from "../../src/server/runtime-handler-shared.js";

describe("executeValidatedEnvelopeHandler", () => {
  it("maps thrown handler errors to an internal error response", async () => {
    const result = await executeValidatedEnvelopeHandler({
      execute: async () => {
        throw new Error("boom");
      },
      invalidContractDetail: "Handlers must return JSON surface envelopes.",
      createInternalErrorResponse: () => ({ kind: "internal-error" }),
      createInvalidContractResponse: (detail) => ({ kind: "invalid-contract", detail }),
      validateEnvelope: () => null,
      isEnvelope: (value): value is { content: string } => Boolean(value && typeof value === "object" && "content" in value)
    });

    expect(result).toEqual({
      response: { kind: "internal-error" }
    });
  });

  it("maps non-envelope results to a contract error response", async () => {
    const result = await executeValidatedEnvelopeHandler({
      execute: async () => ({ legacy: true }),
      invalidContractDetail: "Handlers must return JSON surface envelopes.",
      createInternalErrorResponse: () => ({ kind: "internal-error" }),
      createInvalidContractResponse: (detail) => ({ kind: "invalid-contract", detail }),
      validateEnvelope: () => null,
      isEnvelope: (value): value is { content: string } => Boolean(value && typeof value === "object" && "content" in value)
    });

    expect(result).toEqual({
      response: {
        kind: "invalid-contract",
        detail: "Handlers must return JSON surface envelopes."
      }
    });
  });

  it("returns validated envelope results unchanged", async () => {
    const envelope = { content: "# Demo" };
    const result = await executeValidatedEnvelopeHandler({
      execute: async () => envelope,
      invalidContractDetail: "Handlers must return JSON surface envelopes.",
      createInternalErrorResponse: () => ({ kind: "internal-error" }),
      createInvalidContractResponse: (detail) => ({ kind: "invalid-contract", detail }),
      validateEnvelope: () => null,
      isEnvelope: (value): value is typeof envelope => Boolean(value && typeof value === "object" && "content" in value)
    });

    expect(result).toEqual({
      result: envelope
    });
  });
});
