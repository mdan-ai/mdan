import type { FieldFormat, FieldKind, FieldSchema } from "./types.js";

type JsonObject = Record<string, unknown>;

const TEXTAREA_MAX_LENGTH_HINT = 120;

function isRecord(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function resolveFieldKind(field: Pick<FieldSchema, "kind">): FieldKind {
  return field.kind;
}

export function resolveFieldFormat(
  field: Partial<Pick<FieldSchema, "format" | "secret">>
): FieldFormat | undefined {
  if (field.format) {
    return field.format;
  }
  if (field.secret) {
    return "password";
  }
  return undefined;
}

function resolveFieldKindFromJsonSchema(schema: JsonObject): FieldKind {
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return "enum";
  }
  if (schema["x-mdan-input-kind"] === "asset" || schema.format === "binary") {
    return "asset";
  }
  if (schema.type === "boolean") {
    return "boolean";
  }
  if (schema.type === "integer") {
    return "integer";
  }
  if (schema.type === "number") {
    return "number";
  }
  if (schema.type === "object") {
    return "object";
  }
  if (schema.type === "array") {
    return "array";
  }
  return "string";
}

function resolveFieldFormatFromJsonSchema(schema: JsonObject): FieldFormat | undefined {
  if (schema.format === "password") {
    return "password";
  }
  if (
    schema.format === "textarea" ||
    schema["ui:kind"] === "textarea" ||
    schema["x-ui-kind"] === "textarea" ||
    (typeof schema.maxLength === "number" && schema.maxLength >= TEXTAREA_MAX_LENGTH_HINT)
  ) {
    return "textarea";
  }
  if (schema.format === "binary") {
    return "binary";
  }
  return undefined;
}

function isSecretJsonSchemaField(schema: JsonObject): boolean {
  return schema.format === "password" || schema["x-secret"] === true || schema.secret === true;
}

function collectConstraints(schema: JsonObject): FieldSchema["constraints"] | undefined {
  const constraints: NonNullable<FieldSchema["constraints"]> = {};
  if (typeof schema.minLength === "number") {
    constraints.minLength = schema.minLength;
  }
  if (typeof schema.maxLength === "number") {
    constraints.maxLength = schema.maxLength;
  }
  if (typeof schema.minimum === "number") {
    constraints.minimum = schema.minimum;
  }
  if (typeof schema.maximum === "number") {
    constraints.maximum = schema.maximum;
  }
  if (typeof schema.pattern === "string") {
    constraints.pattern = schema.pattern;
  }
  return Object.keys(constraints).length > 0 ? constraints : undefined;
}

export function fieldSchemaFromJsonSchema(
  name: string,
  schemaLike: unknown,
  requiredNames: Set<string> = new Set()
): FieldSchema {
  const schema = isRecord(schemaLike) ? schemaLike : {};
  const enumOptions = Array.isArray(schema.enum)
    ? schema.enum.map((entry) => String(entry))
    : undefined;
  const constraints = collectConstraints(schema);
  const format = resolveFieldFormatFromJsonSchema(schema);
  const kind = resolveFieldKindFromJsonSchema(schema);
  return {
    name,
    kind,
    required: requiredNames.has(name),
    secret: isSecretJsonSchemaField(schema),
    ...(format ? { format } : {}),
    ...(enumOptions ? { options: enumOptions } : {}),
    ...(typeof schema.description === "string" ? { description: schema.description } : {}),
    ...("default" in schema ? { defaultValue: schema.default as FieldSchema["defaultValue"] } : {}),
    ...(constraints ? { constraints } : {}),
    rawSchema: schema
  };
}

export function fieldSchemasFromJsonObjectSchema(schemaLike: unknown): FieldSchema[] {
  const schema = isRecord(schemaLike) ? schemaLike : {};
  const requiredNames = new Set(
    Array.isArray(schema.required)
      ? schema.required.filter((entry): entry is string => typeof entry === "string")
      : []
  );
  const properties = isRecord(schema.properties) ? schema.properties : {};
  return Object.entries(properties).map(([name, propertySchema]) =>
    fieldSchemaFromJsonSchema(name, propertySchema, requiredNames)
  );
}
