import { describe, expect, it } from "vitest";

import * as protocol from "../../src/protocol/index.js";

describe("internal protocol entry", () => {
  it("keeps protocol helpers available for internal composition", () => {
    expect(protocol.assertActionsContractEnvelope).toBeTypeOf("function");
    expect(protocol.validateActionsContractEnvelope).toBeTypeOf("function");
    expect(protocol.fieldSchemaFromJsonSchema).toBeTypeOf("function");
    expect(protocol.fieldSchemasFromJsonObjectSchema).toBeTypeOf("function");
    expect(protocol.normalizeInputValuesBySchema).toBeTypeOf("function");
    expect(protocol.validateInputValuesBySchema).toBeTypeOf("function");
  });

  it("does not expose surface-facing adapter helpers or low-level internals", () => {
    expect("adaptJsonEnvelopeToHeadlessSnapshot" in protocol).toBe(false);
    expect("adaptJsonEnvelopeToHeadlessBootstrap" in protocol).toBe(false);
    expect("adaptJsonEnvelopeToMdanPage" in protocol).toBe(false);
    expect("isJsonSurfaceEnvelope" in protocol).toBe(false);
    expect("createActionProofToken" in protocol).toBe(false);
    expect("verifyActionProofToken" in protocol).toBe(false);
    expect("validateContentPair" in protocol).toBe(false);
    expect("parseFrontmatter" in protocol).toBe(false);
    expect("serializePage" in protocol).toBe(false);
    expect("negotiateRepresentation" in protocol).toBe(false);
  });
});

describe("@mdanai/sdk/core public authoring boundary", () => {
  it("does not define project-specific markdown authoring conventions", async () => {
    const core = await import("../../src/core/index.js");

    expect("extractSemanticSlots" in core).toBe(false);
    expect("validateSemanticSlots" in core).toBe(false);
    expect("validateMarkdownSemanticSlots" in core).toBe(false);
  });
});
