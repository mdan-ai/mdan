import { describe, expect, it } from "vitest";

import { parseSseMessages, serializeSseMessage, drainSseBuffer } from "../../src/server/sse.js";
import {
  humanizeInputLabel,
  resolveDispatchMode,
  resolveActionBehavior,
  resolveActionVariant
} from "../../src/surface/render-semantics.js";

describe("SSE helpers", () => {
  it("serializes message into data-prefixed lines", () => {
    const out = serializeSseMessage("line1\nline2");
    expect(out).toBe("data: line1\ndata: line2\n\n");
  });

  it("normalizes CRLF during serialization", () => {
    const out = serializeSseMessage("a\r\nb");
    expect(out).toBe("data: a\ndata: b\n\n");
  });

  it("parses multiple events and ignores empty chunks", () => {
    const messages = parseSseMessages("data: one\n\n\n\ndata: two\n\n");
    expect(messages).toEqual(["one", "two"]);
  });

  it("supports multi-line data fields", () => {
    const messages = parseSseMessages("data: one\ndata: two\n\n");
    expect(messages).toEqual(["one\ntwo"]);
  });

  it("drains complete messages and leaves remainder", () => {
    const seen: string[] = [];
    const remainder = drainSseBuffer("data: first\n\ndata: second", (msg) => seen.push(msg));

    expect(seen).toEqual(["first"]);
    expect(remainder).toBe("data: second");
  });

  it("drains CRLF input buffers", () => {
    const seen: string[] = [];
    const remainder = drainSseBuffer("data: first\r\n\r\ndata: second\r\n\r\n", (msg) => seen.push(msg));

    expect(seen).toEqual(["first", "second"]);
    expect(remainder).toBe("");
  });
});

describe("render semantics", () => {
  it.each([
    ["user_name", "user name"],
    ["open-register", "open register"],
    ["  padded   words  ", "padded words"]
  ])("humanizes label %s -> %s", (input, expected) => {
    expect(humanizeInputLabel(input)).toBe(expected);
  });

  it("supports title-case humanization", () => {
    expect(humanizeInputLabel("open_register", { titleCase: true })).toBe("Open Register");
  });

  it("classifies logout actions as quiet", () => {
    expect(
      resolveActionVariant({ method: "POST", target: "/logout", name: "logout_user", inputs: [] })
    ).toBe("quiet");
  });

  it("does not classify lookalike names as logout actions", () => {
    expect(
      resolveActionVariant({
        method: "POST",
        target: "/reports/build",
        name: "catalog_outbound_sync",
        label: "Build Catalog",
        inputs: []
      } as any)
    ).toBe("primary");
  });

  it("does not classify substring matches as logout actions", () => {
    expect(
      resolveActionVariant({
        method: "POST",
        target: "/session/prelogout-check",
        name: "prelogout_check",
        label: "Prelogout Check",
        inputs: []
      } as any)
    ).toBe("primary");
  });

  it("classifies GET actions as secondary", () => {
    expect(
      resolveActionVariant({ method: "GET", target: "/back", name: "go_back", inputs: [] })
    ).toBe("secondary");
  });

  it("classifies non-GET/non-logout actions as primary", () => {
    expect(
      resolveActionVariant({ method: "POST", target: "/submit", name: "submit", inputs: [] })
    ).toBe("primary");
  });

  it("classifies high risk actions as danger", () => {
    expect(
      resolveActionVariant({
        method: "POST",
        target: "/transfer",
        name: "transfer",
        inputs: [],
        guard: { riskLevel: "high" }
      } as any)
    ).toBe("danger");
  });

  it("classifies critical risk actions as danger", () => {
    expect(
      resolveActionVariant({
        method: "POST",
        target: "/transfer",
        name: "transfer",
        inputs: [],
        guard: { riskLevel: "critical" }
      } as any)
    ).toBe("danger");
  });

  it("resolves action behavior from semantic hints", () => {
    expect(resolveActionBehavior({ method: "GET", target: "/next", inputs: [] } as any)).toBe("page");
    expect(
      resolveActionBehavior({
        method: "POST",
        target: "/resources/query",
        name: "query_resources",
        inputs: ["q"],
        verb: "read"
      } as any)
    ).toBe("read");
    expect(
      resolveActionBehavior({
        method: "GET",
        target: "/messages/refresh",
        name: "refresh_messages",
        inputs: [],
        stateEffect: { responseMode: "region" }
      } as any)
    ).toBe("region");
    expect(
      resolveActionBehavior({
        method: "POST",
        target: "/save",
        inputs: [],
        stateEffect: { responseMode: "region" }
      } as any)
    ).toBe("region");
    expect(
      resolveActionBehavior({
        method: "POST",
        target: "/save",
        inputs: [],
        stateEffect: { responseMode: "page" }
      } as any)
    ).toBe("submit");
    expect(
      resolveActionBehavior({
        method: "POST",
        target: "/save",
        inputs: [],
        stateEffect: { responseMode: "full" }
      } as any)
    ).toBe("submit");
    expect(resolveActionBehavior({ method: "POST", target: "/save", inputs: [] } as any)).toBe("submit");
  });

  it("resolves dispatch mode for page navigation actions", () => {
    expect(
      resolveDispatchMode({ method: "GET", target: "/next", inputs: [], verb: "navigate" } as any, {})
    ).toBe("visit");
    expect(
      resolveDispatchMode({ method: "GET", target: "/next", inputs: [], verb: "navigate" } as any, { q: "x" })
    ).toBe("submit");
    expect(
      resolveDispatchMode(
        {
          method: "GET",
          target: "/search",
          inputs: ["q"],
          verb: "navigate",
          stateEffect: { responseMode: "page" }
        } as any,
        { q: "mdan" }
      )
    ).toBe("submit");
  });

  it("resolves dispatch mode for non-page actions", () => {
    expect(
      resolveDispatchMode(
        {
          method: "POST",
          target: "/messages/refresh",
          inputs: [],
          stateEffect: { responseMode: "region" }
        } as any,
        {}
      )
    ).toBe("submit");
  });
});
