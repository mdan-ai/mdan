import { describe, expect, it } from "vitest";

import { fieldSchemaFromJsonSchema, fieldSchemasFromJsonObjectSchema } from "../../src/protocol/input/field-schema.js";

describe("FieldSchema JSON schema normalization", () => {
  it("normalizes JSON schema properties into the canonical input model", () => {
    const fields = fieldSchemasFromJsonObjectSchema({
      type: "object",
      required: ["title", "password", "status", "attachment"],
      properties: {
        title: {
          type: "string",
          description: "Document title",
          default: "draft",
          minLength: 3,
          maxLength: 120
        },
        password: { type: "string", format: "password" },
        status: { type: "string", enum: ["draft", "published"] },
        attachment: { type: "string", format: "binary" },
        count: { type: "integer", minimum: 1, maximum: 10 },
        enabled: { type: "boolean" }
      }
    });

    expect(fields).toEqual([
      expect.objectContaining({
        name: "title",
        kind: "string",
        format: "textarea",
        required: true,
        secret: false,
        description: "Document title",
        defaultValue: "draft",
        constraints: { minLength: 3, maxLength: 120 }
      }),
      expect.objectContaining({
        name: "password",
        kind: "string",
        format: "password",
        required: true,
        secret: true
      }),
      expect.objectContaining({
        name: "status",
        kind: "enum",
        required: true,
        secret: false,
        options: ["draft", "published"]
      }),
      expect.objectContaining({
        name: "attachment",
        kind: "asset",
        format: "binary",
        required: true,
        secret: false
      }),
      expect.objectContaining({
        name: "count",
        kind: "integer",
        required: false,
        constraints: { minimum: 1, maximum: 10 }
      }),
      expect.objectContaining({
        name: "enabled",
        kind: "boolean",
        required: false
      })
    ]);
  });

  it("normalizes a single field without requiring callers to duplicate schema heuristics", () => {
    expect(fieldSchemaFromJsonSchema("notes", { type: "string", maxLength: 200 }, new Set(["notes"]))).toMatchObject({
      name: "notes",
      kind: "string",
      format: "textarea",
      required: true,
      secret: false
    });
  });
});
