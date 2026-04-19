import { describe, expect, it } from "vitest";

import { parseRequestInputs } from "../../src/server/request-inputs.js";

describe("parseRequestInputs", () => {
  it("normalizes flat no-js form values with embedded input schema metadata", () => {
    const parsed = parseRequestInputs(
      {
        method: "POST",
        url: "https://example.test/submit",
        headers: {
          accept: "application/json",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          enabled: "true",
          count: "4",
          settings: '{"mode":"fast"}',
          "mdan.input_schema": JSON.stringify({
            type: "object",
            required: ["count"],
            properties: {
              enabled: { type: "boolean" },
              count: { type: "integer" },
              settings: { type: "object" }
            },
            additionalProperties: false
          })
        }),
        cookies: {}
      }
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.parsed.inputs).toEqual({
      enabled: true,
      count: 4,
      settings: { mode: "fast" }
    });
    expect(parsed.parsed.inputsRaw).toEqual({
      enabled: "true",
      count: "4",
      settings: '{"mode":"fast"}'
    });
  });

  it("rejects invalid embedded input schema metadata", () => {
    const parsed = parseRequestInputs(
      {
        method: "POST",
        url: "https://example.test/submit",
        headers: {
          accept: "application/json",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          title: "hello",
          "mdan.input_schema": "{"
        }),
        cookies: {}
      }
    );

    expect(parsed).toEqual({
      ok: false,
      detail: "Invalid embedded input schema metadata."
    });
  });
});
