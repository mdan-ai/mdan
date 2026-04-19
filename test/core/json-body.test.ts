import { describe, expect, it } from "vitest";

import { parseActionRequestBody } from "../../src/server/json-body.js";

describe("parseActionRequestBody", () => {
  it("parses structured action + input payload", () => {
    const parsed = parseActionRequestBody(
      JSON.stringify({
        action: {
          proof: "token",
          confirmed: true
        },
        input: {
          title: "Doc",
          count: 2,
          publish: false
        }
      })
    );

    expect(parsed).toEqual({
      action: {
        proof: "token",
        confirmed: true
      },
      input: {
        title: "Doc",
        count: 2,
        publish: false
      }
    });
  });

  it("preserves structured array and object action input values", () => {
    const parsed = parseActionRequestBody(
      JSON.stringify({
        action: {
          proof: "token"
        },
        input: {
          tags: ["a", "b"],
          settings: { mode: "fast" }
        }
      })
    );

    expect(parsed.input).toEqual({
      tags: ["a", "b"],
      settings: { mode: "fast" }
    });
  });

  it("falls back to flat object input when wrapper is absent", () => {
    const parsed = parseActionRequestBody(
      JSON.stringify({
        title: "Doc",
        count: 2
      })
    );

    expect(parsed).toEqual({
      action: null,
      input: {
        title: "Doc",
        count: 2
      }
    });
  });

  it("rejects invalid action metadata shape", () => {
    expect(() =>
      parseActionRequestBody(
        JSON.stringify({
          action: {
            proof: 123
          },
          input: {}
        })
      )
    ).toThrow(/action\.proof must be a string/);
  });
});
