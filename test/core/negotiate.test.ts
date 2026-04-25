import { describe, expect, it } from "vitest";

import { negotiateRepresentation } from "../../src/protocol/negotiate.js";

describe("negotiateRepresentation", () => {
  it("returns event-stream when explicitly requested", () => {
    expect(negotiateRepresentation("text/event-stream")).toBe("event-stream");
    expect(negotiateRepresentation("text/event-stream, text/markdown;q=0.9")).toBe("event-stream");
  });

  it("prefers markdown when explicitly requested", () => {
    expect(negotiateRepresentation("text/markdown")).toBe("markdown");
    expect(negotiateRepresentation("text/markdown, application/json;q=0.9")).toBe("markdown");
    expect(negotiateRepresentation("application/json, text/markdown")).toBe("markdown");
  });

  it("returns markdown for wildcard and missing accept", () => {
    expect(negotiateRepresentation("*/*")).toBe("markdown");
    expect(negotiateRepresentation(undefined)).toBe("markdown");
    expect(negotiateRepresentation("text/markdown;q=0, text/*")).toBe("markdown");
  });

  it("treats application/json as unsupported for content negotiation", () => {
    expect(negotiateRepresentation("application/json")).toBe("not-acceptable");
  });

  it("honors q-weight preferences across supported representations", () => {
    expect(negotiateRepresentation("text/*;q=0.9, text/markdown;q=0.8")).toBe("markdown");
    expect(negotiateRepresentation("text/event-stream;q=0.4, text/markdown;q=0.8")).toBe("markdown");
  });
});
