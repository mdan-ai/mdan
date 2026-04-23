import { describe, expect, it, vi } from "vitest";

import {
  buildOperationPayload,
  createInputsByName,
  dispatchOperation,
  getFormKey,
  getInputValue,
  groupOperations,
  resolveDispatchAction,
  resolveFormEnctype,
  resolveActionPresentation,
  resolveActionCapabilities,
  resolveInputCapabilities,
  resolveInputDefaultValue,
  resolveRenderableInputs
} from "../../src/ui/model.js";

describe("elements model helpers", () => {
  it("groups operations by method", () => {
    const groups = groupOperations([
      { method: "GET", target: "/read", name: "read", inputs: [] },
      { method: "POST", target: "/write", name: "write", inputs: [] }
    ]);

    expect(groups.getOperations).toHaveLength(1);
    expect(groups.postOperations).toHaveLength(1);
    expect(groups.getOperations[0]?.target).toBe("/read");
    expect(groups.postOperations[0]?.target).toBe("/write");
  });

  it("resolves renderable inputs in operation order and skips missing names", () => {
    const inputsByName = createInputsByName([
      { name: "message", kind: "string", format: "textarea", required: true, secret: false },
      { name: "password", kind: "string", format: "password", required: true, secret: true }
    ]);

    const resolved = resolveRenderableInputs(
      {
        method: "POST",
        target: "/submit",
        name: "submit",
        inputs: ["password", "missing", "message"]
      },
      inputsByName
    );

    expect(resolved.map((entry) => entry.name)).toEqual(["password", "message"]);
  });

  it("resolves multipart enctype when any asset input exists", () => {
    expect(resolveFormEnctype([{ name: "file", kind: "asset", required: false, secret: false }])).toBe(
      "multipart/form-data"
    );
    expect(resolveFormEnctype([{ name: "title", kind: "string", required: false, secret: false }])).toBe(
      "application/x-www-form-urlencoded"
    );
  });

  it("builds stable form keys from block + operation identity", () => {
    expect(getFormKey("editor", { method: "POST", target: "/resources", name: "create" })).toBe(
      "editor:POST:/resources:create"
    );
  });

  it("returns semantic defaults for missing form values", () => {
    expect(getInputValue({ name: "enabled", kind: "boolean", required: false, secret: false }, {})).toBe("false");
    expect(
      getInputValue({ name: "status", kind: "enum", options: ["draft", "published"], required: false, secret: false }, {})
    ).toBe("draft");
    expect(getInputValue({ name: "title", kind: "string", required: false, secret: false }, {})).toBe("");
  });

  it("prefers schema defaultValue when provided", () => {
    expect(
      getInputValue(
        { name: "title", kind: "string", required: false, secret: false, defaultValue: "hello" } as any,
        {}
      )
    ).toBe("hello");
  });

  it("builds operation payload in operation input order with missing fallback", () => {
    const inputsByName = createInputsByName([
      { name: "title", kind: "string", required: false, secret: false },
      { name: "enabled", kind: "boolean", required: false, secret: false },
      { name: "status", kind: "enum", required: false, secret: false, options: ["draft", "published"] }
    ]);

    const payload = buildOperationPayload(
      {
        method: "POST",
        target: "/submit",
        name: "submit",
        inputs: ["enabled", "missing", "status", "title"]
      },
      inputsByName,
      { title: "Hello" }
    );

    expect(payload).toEqual({
      enabled: false,
      missing: "",
      status: "draft",
      title: "Hello"
    });
  });

  it("normalizes operation payload values from FieldSchema kinds", () => {
    const inputsByName = createInputsByName([
      { name: "score", kind: "number", required: true, secret: false },
      { name: "count", kind: "integer", required: true, secret: false },
      { name: "enabled", kind: "boolean", required: false, secret: false },
      { name: "settings", kind: "object", required: false, secret: false },
      { name: "tags", kind: "array", required: false, secret: false },
      { name: "title", kind: "string", required: false, secret: false }
    ]);

    const payload = buildOperationPayload(
      {
        method: "POST",
        target: "/submit",
        name: "submit",
        inputs: ["score", "count", "enabled", "settings", "tags", "title"]
      },
      inputsByName,
      {
        score: "4.2",
        count: "4",
        enabled: "true",
        settings: '{"mode":"fast"}',
        tags: '["a","b"]',
        title: "Doc"
      }
    );

    expect(payload).toEqual({
      score: 4.2,
      count: 4,
      enabled: true,
      settings: { mode: "fast" },
      tags: ["a", "b"],
      title: "Doc"
    });
  });

  it("keeps File values for asset inputs", () => {
    const file = new File(["hello"], "hello.txt", { type: "text/plain" });
    const inputsByName = createInputsByName([
      { name: "attachment", kind: "asset", required: true, secret: false }
    ]);

    const payload = buildOperationPayload(
      {
        method: "POST",
        target: "/upload",
        name: "upload",
        inputs: ["attachment"]
      },
      inputsByName,
      { attachment: file } as any
    );

    expect(payload.attachment).toBe(file);
  });

  it("resolves input capabilities from canonical field kind", () => {
    expect(resolveInputCapabilities({ kind: "enum", secret: false } as any)).toEqual({
      control: "select",
      inputType: null,
      valueChannel: "value"
    });
    expect(resolveInputCapabilities({ kind: "integer", secret: false } as any)).toEqual({
      control: "input",
      inputType: "number",
      valueChannel: "value"
    });
    expect(resolveInputCapabilities({ kind: "asset", secret: false } as any)).toEqual({
      control: "file",
      inputType: null,
      valueChannel: "file"
    });
  });

  it("routes GET without payload to visit action", () => {
    const action = resolveDispatchAction(
      { method: "GET", target: "/resources/new", name: "open_create_form", inputs: [], verb: "route" } as any,
      {}
    );
    expect(action).toEqual({ kind: "visit", target: "/resources/new" });
  });

  it("routes GET with payload to submit action", () => {
    const action = resolveDispatchAction(
      { method: "GET", target: "/search", name: "search", inputs: ["q"], verb: "route" } as any,
      { q: "mdan" }
    );
    expect(action).toEqual({
      kind: "submit",
      operation: { method: "GET", target: "/search", name: "search", inputs: ["q"], verb: "route" },
      payload: { q: "mdan" }
    });
  });

  it("routes POST to submit action", () => {
    const action = resolveDispatchAction(
      { method: "POST", target: "/resources", name: "create_resource", inputs: ["title"] } as any,
      { title: "Doc" }
    );
    expect(action).toEqual({
      kind: "submit",
      operation: { method: "POST", target: "/resources", name: "create_resource", inputs: ["title"] },
      payload: { title: "Doc" }
    });
  });

  it("resolves action presentation for risk and behavior semantics", () => {
    expect(
      resolveActionPresentation(
        {
          method: "POST",
          target: "/danger/delete",
          name: "delete_all",
          inputs: [],
          guard: { riskLevel: "high" }
        } as any
      )
    ).toEqual({ variant: "danger", behavior: "submit" });

    expect(
      resolveActionPresentation(
        {
          method: "POST",
          target: "/danger/purge",
          name: "purge_all",
          inputs: [],
          guard: { riskLevel: "critical" }
        } as any
      )
    ).toEqual({ variant: "danger", behavior: "submit" });

    expect(
      resolveActionPresentation(
        {
          method: "POST",
          target: "/messages/refresh",
          name: "refresh_messages",
          inputs: [],
          stateEffect: { responseMode: "region" }
        } as any
      )
    ).toEqual({ variant: "quiet", behavior: "region" });

    expect(
      resolveActionPresentation(
        {
          method: "POST",
          target: "/resources/query",
          name: "query_resources",
          inputs: ["q"],
          verb: "read"
        } as any
      )
    ).toEqual({ variant: "quiet", behavior: "read" });
  });

  it("executes visit dispatch against host", async () => {
    const host = {
      submit: async () => {},
      visit: async () => {}
    };
    const submitSpy = vi.spyOn(host, "submit");
    const visitSpy = vi.spyOn(host, "visit");

    await dispatchOperation(
      host,
      { method: "GET", target: "/resources/new", name: "open_create_form", inputs: [], verb: "route" } as any,
      {}
    );

    expect(visitSpy).toHaveBeenCalledWith("/resources/new");
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it("executes submit dispatch against host", async () => {
    const host = {
      submit: async () => {},
      visit: async () => {}
    };
    const submitSpy = vi.spyOn(host, "submit");
    const visitSpy = vi.spyOn(host, "visit");

    await dispatchOperation(
      host,
      { method: "POST", target: "/resources", name: "create_resource", inputs: ["title"] } as any,
      { title: "Doc" }
    );

    expect(submitSpy).toHaveBeenCalledWith(
      { method: "POST", target: "/resources", name: "create_resource", inputs: ["title"] },
      { title: "Doc" }
    );
    expect(visitSpy).not.toHaveBeenCalled();
  });

  it("extracts generic action capabilities from json semantics", () => {
    expect(
      resolveActionCapabilities(
        {
          method: "POST",
          target: "/resources/rebuild",
          name: "rebuild_index",
          inputs: ["scope"],
          guard: { riskLevel: "high" },
          stateEffect: { responseMode: "region", updatedRegions: ["summary", "status"] }
        } as any
      )
    ).toEqual({
      method: "POST",
      target: "/resources/rebuild",
      hasInputs: true,
      acceptsStream: false,
      dispatchWhenEmptyPayload: "submit",
      presentation: { variant: "danger", behavior: "region" },
      responseMode: "region",
      updatedRegions: ["summary", "status"]
    });
  });

  it("falls back to unknown response mode when semantics are unsupported", () => {
    expect(
      resolveActionCapabilities(
        {
          method: "POST",
          target: "/resources/rebuild",
          name: "rebuild_index",
          inputs: [],
          stateEffect: { responseMode: "full" }
        } as any
      )
    ).toEqual({
      method: "POST",
      target: "/resources/rebuild",
      hasInputs: false,
      acceptsStream: false,
      dispatchWhenEmptyPayload: "submit",
      presentation: { variant: "primary", behavior: "submit" },
      responseMode: "unknown",
      updatedRegions: []
    });
  });

  it("normalizes missing and empty updated regions to the same capability shape", () => {
    expect(
      resolveActionCapabilities(
        {
          method: "POST",
          target: "/resources/rebuild",
          name: "rebuild_index",
          inputs: [],
          stateEffect: { responseMode: "region" }
        } as any
      ).updatedRegions
    ).toEqual([]);

    expect(
      resolveActionCapabilities(
        {
          method: "POST",
          target: "/resources/rebuild",
          name: "rebuild_index",
          inputs: [],
          stateEffect: { responseMode: "region", updatedRegions: [] }
        } as any
      ).updatedRegions
    ).toEqual([]);
  });

  it("resolves generic input capabilities by schema type", () => {
    expect(resolveInputCapabilities({ kind: "boolean", secret: false } as any)).toEqual({
      control: "checkbox",
      inputType: null,
      valueChannel: "checked"
    });
    expect(resolveInputCapabilities({ kind: "asset", secret: false } as any)).toEqual({
      control: "file",
      inputType: null,
      valueChannel: "file"
    });
    expect(resolveInputCapabilities({ kind: "string", format: "textarea", secret: false } as any)).toEqual({
      control: "textarea",
      inputType: null,
      valueChannel: "value"
    });
    expect(resolveInputCapabilities({ kind: "string", format: "password", secret: true } as any)).toEqual({
      control: "input",
      inputType: "password",
      valueChannel: "value"
    });
    expect(resolveInputCapabilities({ kind: "number", secret: false } as any)).toEqual({
      control: "input",
      inputType: "number",
      valueChannel: "value"
    });
  });

  it("resolves generic default input values", () => {
    expect(resolveInputDefaultValue({ kind: "enum", options: ["a", "b"] } as any)).toBe("a");
    expect(resolveInputDefaultValue({ kind: "boolean" } as any)).toBe("false");
    expect(resolveInputDefaultValue({ kind: "object" } as any)).toBe("{}");
    expect(resolveInputDefaultValue({ kind: "array" } as any)).toBe("[]");
    expect(resolveInputDefaultValue({ kind: "string" } as any)).toBe("");
  });

  it("renders structured inputs as JSON textareas", () => {
    expect(resolveInputCapabilities({ kind: "object", secret: false } as any)).toEqual({
      control: "textarea",
      inputType: null,
      valueChannel: "value"
    });
    expect(resolveInputCapabilities({ kind: "array", secret: false } as any)).toEqual({
      control: "textarea",
      inputType: null,
      valueChannel: "value"
    });
  });
});
