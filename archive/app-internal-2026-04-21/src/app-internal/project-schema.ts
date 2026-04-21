import type { NormalizedActionInputField, NormalizedActionInputShape } from "./models.js";

export function projectInputSchema(input: NormalizedActionInputShape): Record<string, unknown> {
  const properties = Object.fromEntries(
    Object.entries(input).map(([name, field]) => [name, projectFieldSchema(field)])
  );
  const required = Object.entries(input)
    .filter(([, field]) => field.required)
    .map(([name]) => name);

  return {
    type: "object",
    ...(required.length > 0 ? { required } : {}),
    properties,
    additionalProperties: false
  };
}

function projectFieldSchema(field: NormalizedActionInputField): Record<string, unknown> {
  if (field.kind === "number") {
    return { type: "number" };
  }
  if (field.kind === "boolean") {
    return { type: "boolean" };
  }
  return { type: "string" };
}

