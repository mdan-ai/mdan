import { describe, expect, it, vi } from "vitest";

import { resolveUiSnapshotView } from "../../src/frontend/model.js";
import {
  buildGetActionUrl,
  buildOperationPayload,
  createInputsByName,
  dispatchOperation,
  getInputValue,
  groupOperations,
  resolveDispatchAction,
  resolveFormEnctype,
  resolveInputDefaultValue,
  resolveRenderableInputs,
  shouldOmitEmptyInput
} from "../../src/surface/forms.js";

describe("frontend model helpers", () => {
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

  it("returns semantic defaults for missing form values", () => {
    expect(getInputValue({ name: "enabled", kind: "boolean", required: false, secret: false }, {})).toBe("false");
    expect(
      getInputValue({ name: "status", kind: "enum", options: ["draft", "published"], required: false, secret: false }, {})
    ).toBe("draft");
    expect(getInputValue({ name: "title", kind: "string", required: false, secret: false }, {})).toBe("");
  });

  it("omits optional GET defaults instead of preselecting them", () => {
    expect(getInputValue({ name: "enabled", kind: "boolean", required: false, secret: false }, {}, "GET")).toBe("");
    expect(
      getInputValue({ name: "status", kind: "enum", options: ["draft", "published"], required: false, secret: false }, {}, "GET")
    ).toBe("");
    expect(shouldOmitEmptyInput({ required: false }, "GET")).toBe(true);
    expect(shouldOmitEmptyInput({ required: true }, "GET")).toBe(false);
    expect(shouldOmitEmptyInput({ required: false }, "POST")).toBe(false);
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

  it("omits empty optional GET values from operation payload", () => {
    const inputsByName = createInputsByName([
      { name: "q", kind: "string", required: false, secret: false },
      { name: "status", kind: "enum", required: false, secret: false, options: ["draft", "published"] },
      { name: "required", kind: "string", required: true, secret: false }
    ]);

    const payload = buildOperationPayload(
      {
        method: "GET",
        target: "/search",
        name: "search",
        inputs: ["q", "status", "required"]
      },
      inputsByName,
      { required: "hello" }
    );

    expect(payload).toEqual({
      required: "hello"
    });
  });

  it("builds GET action URLs without corrupting existing query or hash", () => {
    expect(
      buildGetActionUrl(
        "/messages?tab=unread#list",
        { actionProof: "proof-token" },
        { q: "hello world", page: 2, filters: ["mine", "open"], enabled: true }
      )
    ).toBe("/messages?tab=unread&action.proof=proof-token&q=hello+world&page=2&filters=%5B%22mine%22%2C%22open%22%5D&enabled=true#list");
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

  it("resolves one shared ui snapshot view for operations and fields", () => {
    const view = resolveUiSnapshotView({
      status: "idle",
      route: "/search",
      markdown: "# Search",
      blocks: [
        {
          name: "main",
          markdown: "Search block",
          inputs: [
            { name: "q", kind: "string", required: false, secret: false, description: "Query text" },
            { name: "kind", kind: "enum", required: false, secret: false, options: ["all", "docs"] }
          ],
          operations: [
            {
              method: "GET",
              target: "/search",
              name: "search",
              label: "Search",
              inputs: ["q", "kind"],
              actionProof: "proof-token"
            } as any
          ]
        }
      ]
    }, () => ({ q: "mdan" }));

    expect(view.blocks[0]?.operations[0]).toMatchObject({
      formKey: "main:GET:/search:search",
      method: "GET",
      methodAttribute: "get",
      target: "/search",
      label: "Search",
      actionVariant: "secondary",
      actionBehavior: "page",
      hiddenFields: [{ name: "action.proof", value: "proof-token" }]
    });
    expect(view.blocks[0]?.operations[0]?.fields).toMatchObject([
      {
        name: "q",
        label: "Q",
        control: "input",
        inputType: "text",
        value: "mdan",
        description: "Query text"
      },
      {
        name: "kind",
        control: "select",
        inputType: null,
        omitEmpty: true
      }
    ]);
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

  it("encodes action presentation into resolved ui operations", () => {
    const view = resolveUiSnapshotView({
      status: "idle",
      markdown: "",
      blocks: [
        {
          name: "main",
          markdown: "",
          inputs: [{ name: "q", kind: "string", required: false, secret: false }],
          operations: [
            { method: "POST", target: "/danger/delete", name: "delete_all", inputs: [], guard: { riskLevel: "high" } } as any,
            { method: "POST", target: "/messages/refresh", name: "refresh_messages", inputs: [], stateEffect: { responseMode: "region" } } as any,
            { method: "POST", target: "/resources/query", name: "query_resources", inputs: ["q"], verb: "read" } as any
          ]
        }
      ]
    });

    expect(view.blocks[0]?.operations.map((operation) => ({
      name: operation.source.name,
      variant: operation.actionVariant,
      behavior: operation.actionBehavior
    }))).toEqual([
      { name: "delete_all", variant: "danger", behavior: "submit" },
      { name: "refresh_messages", variant: "quiet", behavior: "region" },
      { name: "query_resources", variant: "quiet", behavior: "read" }
    ]);
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

  it("encodes input control semantics into resolved ui fields", () => {
    const view = resolveUiSnapshotView({
      status: "idle",
      markdown: "",
      blocks: [
        {
          name: "main",
          markdown: "",
          inputs: [
            { name: "enabled", kind: "boolean", required: false, secret: false },
            { name: "attachment", kind: "asset", required: false, secret: false },
            { name: "body", kind: "string", format: "textarea", required: false, secret: false },
            { name: "password", kind: "string", format: "password", required: false, secret: true },
            { name: "score", kind: "number", required: false, secret: false }
          ],
          operations: [
            { method: "POST", target: "/submit", name: "submit", inputs: ["enabled", "attachment", "body", "password", "score"] } as any
          ]
        }
      ]
    });

    expect(view.blocks[0]?.operations[0]?.fields.map((field) => ({
      name: field.name,
      control: field.control,
      inputType: field.inputType
    }))).toEqual([
      { name: "enabled", control: "checkbox", inputType: null },
      { name: "attachment", control: "file", inputType: null },
      { name: "body", control: "textarea", inputType: null },
      { name: "password", control: "input", inputType: "password" },
      { name: "score", control: "input", inputType: "number" }
    ]);
  });

  it("resolves generic default input values", () => {
    expect(resolveInputDefaultValue({ kind: "enum", options: ["a", "b"] } as any)).toBe("a");
    expect(resolveInputDefaultValue({ kind: "boolean" } as any)).toBe("false");
    expect(resolveInputDefaultValue({ kind: "object" } as any)).toBe("{}");
    expect(resolveInputDefaultValue({ kind: "array" } as any)).toBe("[]");
    expect(resolveInputDefaultValue({ kind: "string" } as any)).toBe("");
  });

  it("renders structured inputs as JSON textareas in resolved ui fields", () => {
    const view = resolveUiSnapshotView({
      status: "idle",
      markdown: "",
      blocks: [
        {
          name: "main",
          markdown: "",
          inputs: [
            { name: "config", kind: "object", required: false, secret: false },
            { name: "tags", kind: "array", required: false, secret: false }
          ],
          operations: [
            { method: "POST", target: "/submit", name: "submit", inputs: ["config", "tags"] } as any
          ]
        }
      ]
    });

    expect(view.blocks[0]?.operations[0]?.fields.map((field) => ({
      name: field.name,
      control: field.control,
      inputType: field.inputType
    }))).toEqual([
      { name: "config", control: "textarea", inputType: null },
      { name: "tags", control: "textarea", inputType: null }
    ]);
  });
});
