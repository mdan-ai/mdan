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
  it("exposes only protocol, schema, and readable markdown primitives", async () => {
    const core = await import("../../src/core/index.js");

    expect(core.MDAN_PAGE_MANIFEST_VERSION).toBe("mdan.page.v1");
    expect(core.parseReadableSurface).toBeTypeOf("function");
    expect(core.createMarkdownPage).toBeTypeOf("function");
    expect(core.createMarkdownFragment).toBeTypeOf("function");
    expect(core.normalizeReadableSurface).toBeTypeOf("function");
    expect(core.assertActionsContractEnvelope).toBeTypeOf("function");
    expect(core.fieldSchemasFromJsonObjectSchema).toBeTypeOf("function");
    expect(core.normalizeInputValuesBySchema).toBeTypeOf("function");
  });

  it("keeps frontend, surface runtime, and form transport helpers out of core", async () => {
    const core = await import("../../src/core/index.js");

    expect("buildGetActionUrl" in core).toBe(false);
    expect("buildOperationPayload" in core).toBe(false);
    expect("groupOperations" in core).toBe(false);
    expect("resolveDispatchAction" in core).toBe(false);
    expect("resolveActionBehavior" in core).toBe(false);
    expect("resolveActionVariant" in core).toBe(false);
    expect("adaptReadableSurfaceToHeadlessSnapshot" in core).toBe(false);
    expect("stripReadablePageMarkdown" in core).toBe(false);
    expect("HeadlessSnapshotLike" in core).toBe(false);
  });

  it("does not define project-specific markdown authoring conventions", async () => {
    const core = await import("../../src/core/index.js");

    expect("extractSemanticSlots" in core).toBe(false);
    expect("validateSemanticSlots" in core).toBe(false);
    expect("validateMarkdownSemanticSlots" in core).toBe(false);
  });
});
