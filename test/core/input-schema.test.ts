import { describe, expect, it } from "vitest";

import {
  normalizeInputValuesByFieldSchemas,
  normalizeInputValuesBySchema,
  validateInputValuesBySchema
} from "../../src/protocol/input/input-schema.js";

describe("validateInputValuesBySchema", () => {
  it("validates number, integer, boolean, and enum constraints", () => {
    const errors = validateInputValuesBySchema(
      {
        score: "4.2",
        count: "4.1",
        enabled: "yes",
        status: "pending"
      },
      {
        type: "object",
        required: ["score", "count", "enabled", "status"],
        additionalProperties: false,
        properties: {
          score: { type: "number", minimum: 5 },
          count: { type: "integer", minimum: 1 },
          enabled: { type: "boolean" },
          status: { type: "string", enum: ["ready", "done"] }
        }
      }
    );

    expect(errors).toContain("score must be >= 5");
    expect(errors).toContain("count must be an integer");
    expect(errors).toContain('status must be one of: "ready", "done"');
    expect(errors).not.toContain("enabled must be a boolean");
  });

  it("enforces required and additionalProperties=false", () => {
    const errors = validateInputValuesBySchema(
      {
        extra: "x"
      },
      {
        type: "object",
        required: ["title"],
        additionalProperties: false,
        properties: {
          title: { type: "string" }
        }
      }
    );

    expect(errors).toContain("title is required");
    expect(errors).toContain("extra is not allowed");
  });
});

describe("normalizeInputValuesBySchema", () => {
  it("returns typed inputs while preserving raw submitted values", () => {
    const result = normalizeInputValuesBySchema(
      {
        score: "4.2",
        count: "4",
        enabled: "yes",
        settings: '{"mode":"fast"}',
        tags: '["a","b"]',
        status: "ready",
        title: "Doc"
      },
      {
        type: "object",
        required: ["score", "count", "enabled", "settings", "tags", "status"],
        additionalProperties: false,
        properties: {
          score: { type: "number" },
          count: { type: "integer" },
          enabled: { type: "boolean" },
          settings: { type: "object" },
          tags: { type: "array" },
          status: { type: "string", enum: ["ready", "done"] },
          title: { type: "string" }
        }
      }
    );

    expect(result.errors).toEqual([]);
    expect(result.inputs).toEqual({
      score: 4.2,
      count: 4,
      enabled: true,
      settings: { mode: "fast" },
      tags: ["a", "b"],
      status: "ready",
      title: "Doc"
    });
    expect(result.inputsRaw).toEqual({
      score: "4.2",
      count: "4",
      enabled: "yes",
      settings: '{"mode":"fast"}',
      tags: '["a","b"]',
      status: "ready",
      title: "Doc"
    });
  });

  it("does not coerce invalid values into handler inputs", () => {
    const result = normalizeInputValuesBySchema(
      {
        count: "4.2",
        enabled: "maybe",
        settings: "not json"
      },
      {
        type: "object",
        required: ["count", "enabled", "settings"],
        properties: {
          count: { type: "integer" },
          enabled: { type: "boolean" },
          settings: { type: "object" }
        }
      }
    );

    expect(result.inputs).toEqual({
      count: "4.2",
      enabled: "maybe",
      settings: "not json"
    });
    expect(result.errors).toEqual([
      "count must be an integer",
      "enabled must be a boolean",
      "settings must be an object"
    ]);
  });
});

describe("normalizeInputValuesByFieldSchemas", () => {
  it("coerces submitted values using canonical FieldSchema kinds", () => {
    const result = normalizeInputValuesByFieldSchemas(
      {
        score: "4.2",
        count: "4",
        enabled: "true",
        settings: '{"mode":"fast"}',
        tags: '["a","b"]',
        status: "ready",
        title: "Doc"
      },
      [
        { name: "score", kind: "number", required: true, secret: false },
        { name: "count", kind: "integer", required: true, secret: false },
        { name: "enabled", kind: "boolean", required: true, secret: false },
        { name: "settings", kind: "object", required: false, secret: false },
        { name: "tags", kind: "array", required: false, secret: false },
        { name: "status", kind: "enum", required: true, secret: false, options: ["ready", "done"] },
        { name: "title", kind: "string", required: false, secret: false }
      ]
    );

    expect(result).toEqual({
      score: 4.2,
      count: 4,
      enabled: true,
      settings: { mode: "fast" },
      tags: ["a", "b"],
      status: "ready",
      title: "Doc"
    });
  });

  it("keeps invalid values raw instead of inventing lossy fallbacks", () => {
    const result = normalizeInputValuesByFieldSchemas(
      {
        count: "4.2",
        enabled: "maybe",
        settings: "not json",
        tags: "not json"
      },
      [
        { name: "count", kind: "integer", required: false, secret: false },
        { name: "enabled", kind: "boolean", required: false, secret: false },
        { name: "settings", kind: "object", required: false, secret: false },
        { name: "tags", kind: "array", required: false, secret: false }
      ]
    );

    expect(result).toEqual({
      count: "4.2",
      enabled: "maybe",
      settings: "not json",
      tags: "not json"
    });
  });
});
