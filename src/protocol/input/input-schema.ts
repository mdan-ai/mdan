import type { FieldSchema } from "./types.js";

type UnknownRecord = Record<string, unknown>;

export interface NormalizedInputValues {
  inputs: Record<string, unknown>;
  inputsRaw: Record<string, unknown>;
  errors: string[];
}

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function coerceNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return Number.NaN;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  return Number.NaN;
}

function coerceBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "on", "yes"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "off", "no"].includes(normalized)) {
      return false;
    }
  }
  return null;
}

function coerceStructured(value: unknown, expected: "object" | "array"): unknown {
  if (expected === "array" && Array.isArray(value)) {
    return value;
  }
  if (expected === "object" && isRecord(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return value;
  }
  try {
    const parsed = JSON.parse(value);
    return parsed;
  } catch {
    return value;
  }
}

function isAssetSchema(schema: UnknownRecord): boolean {
  return schema["x-mdan-input-kind"] === "asset" || schema.format === "binary";
}

function isAssetLikeValue(value: unknown): boolean {
  return isRecord(value) && value.kind === "asset" && typeof value.id === "string";
}

function coerceSchemaValue(value: unknown, schema: UnknownRecord): unknown {
  if (isAssetSchema(schema)) {
    return value;
  }
  const declaredType = schema.type;
  if (declaredType === "number") {
    const parsed = coerceNumber(value);
    return Number.isFinite(parsed) ? parsed : value;
  }
  if (declaredType === "integer") {
    const parsed = coerceNumber(value);
    return Number.isFinite(parsed) && Number.isInteger(parsed) ? parsed : value;
  }
  if (declaredType === "boolean") {
    return coerceBoolean(value) ?? value;
  }
  if (declaredType === "object") {
    const parsed = coerceStructured(value, "object");
    return isRecord(parsed) ? parsed : value;
  }
  if (declaredType === "array") {
    const parsed = coerceStructured(value, "array");
    return Array.isArray(parsed) ? parsed : value;
  }
  return value;
}

function coerceFieldSchemaValue(value: unknown, field: FieldSchema): unknown {
  if (field.kind === "asset") {
    return value;
  }
  if (field.kind === "number") {
    const parsed = coerceNumber(value);
    return Number.isFinite(parsed) ? parsed : value;
  }
  if (field.kind === "integer") {
    const parsed = coerceNumber(value);
    return Number.isFinite(parsed) && Number.isInteger(parsed) ? parsed : value;
  }
  if (field.kind === "boolean") {
    return coerceBoolean(value) ?? value;
  }
  if (field.kind === "object") {
    const parsed = coerceStructured(value, "object");
    return isRecord(parsed) ? parsed : value;
  }
  if (field.kind === "array") {
    const parsed = coerceStructured(value, "array");
    return Array.isArray(parsed) ? parsed : value;
  }
  return value;
}

function validateSchemaValue(fieldPath: string, value: unknown, schema: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(schema)) {
    return errors;
  }

  const declaredType = schema.type;
  if (isAssetSchema(schema)) {
    if (typeof value !== "string" && !isAssetLikeValue(value)) {
      errors.push(`${fieldPath} must be an asset`);
      return errors;
    }
  } else if (declaredType === "string") {
    if (typeof value !== "string") {
      errors.push(`${fieldPath} must be a string`);
      return errors;
    }
    if (Number.isInteger(schema.minLength) && value.length < (schema.minLength as number)) {
      errors.push(`${fieldPath} must be at least ${schema.minLength} characters`);
    }
    if (Number.isInteger(schema.maxLength) && value.length > (schema.maxLength as number)) {
      errors.push(`${fieldPath} must be at most ${schema.maxLength} characters`);
    }
  } else if (declaredType === "number") {
    const parsed = coerceNumber(value);
    if (!Number.isFinite(parsed)) {
      errors.push(`${fieldPath} must be a number`);
      return errors;
    }
    if (typeof schema.minimum === "number" && parsed < schema.minimum) {
      errors.push(`${fieldPath} must be >= ${schema.minimum}`);
    }
    if (typeof schema.maximum === "number" && parsed > schema.maximum) {
      errors.push(`${fieldPath} must be <= ${schema.maximum}`);
    }
  } else if (declaredType === "integer") {
    const parsed = coerceNumber(value);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      errors.push(`${fieldPath} must be an integer`);
      return errors;
    }
    if (typeof schema.minimum === "number" && parsed < schema.minimum) {
      errors.push(`${fieldPath} must be >= ${schema.minimum}`);
    }
    if (typeof schema.maximum === "number" && parsed > schema.maximum) {
      errors.push(`${fieldPath} must be <= ${schema.maximum}`);
    }
  } else if (declaredType === "boolean") {
    if (coerceBoolean(value) === null) {
      errors.push(`${fieldPath} must be a boolean`);
      return errors;
    }
  } else if (declaredType === "object") {
    const parsed = coerceStructured(value, "object");
    if (!isRecord(parsed)) {
      errors.push(`${fieldPath} must be an object`);
      return errors;
    }
  } else if (declaredType === "array") {
    const parsed = coerceStructured(value, "array");
    if (!Array.isArray(parsed)) {
      errors.push(`${fieldPath} must be an array`);
      return errors;
    }
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    const accepted = schema.enum;
    const matchesDirect = accepted.some((candidate: unknown) => Object.is(candidate, value));
    const matchesString =
      typeof value === "string" && accepted.some((candidate: unknown) => String(candidate) === value);
    if (!matchesDirect && !matchesString) {
      errors.push(`${fieldPath} must be one of: ${accepted.map((entry: unknown) => JSON.stringify(entry)).join(", ")}`);
    }
  }
  return errors;
}

export function normalizeInputValuesByFieldSchemas(
  payload: Record<string, unknown>,
  fields: FieldSchema[]
): Record<string, unknown> {
  const fieldsByName = new Map(fields.map((field) => [field.name, field]));
  const inputs: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(payload)) {
    const field = fieldsByName.get(name);
    inputs[name] = field ? coerceFieldSchemaValue(value, field) : value;
  }
  return inputs;
}

export function normalizeInputValuesBySchema(
  payload: Record<string, unknown>,
  schemaLike: unknown
): NormalizedInputValues {
  const errors: string[] = [];
  if (!isRecord(schemaLike)) {
    return { inputs: payload, inputsRaw: payload, errors };
  }

  const inputsRaw = { ...payload };
  const inputs: Record<string, unknown> = {};
  const required = new Set(
    Array.isArray(schemaLike.required)
      ? schemaLike.required.filter((value): value is string => typeof value === "string")
      : []
  );
  const properties = isRecord(schemaLike.properties) ? schemaLike.properties : {};

  for (const name of required) {
    if (!(name in payload)) {
      errors.push(`${name} is required`);
    }
  }

  for (const [name, value] of Object.entries(payload)) {
    const propertySchema = properties[name];
    if (propertySchema === undefined) {
      if (schemaLike.additionalProperties === false) {
        errors.push(`${name} is not allowed`);
      }
      inputs[name] = value;
      continue;
    }

    if (!isRecord(propertySchema)) {
      inputs[name] = value;
      continue;
    }

    const coerced = coerceSchemaValue(value, propertySchema);
    inputs[name] = coerced;
    errors.push(...validateSchemaValue(name, coerced, propertySchema));
  }

  return { inputs, inputsRaw, errors };
}

export function validateInputValuesBySchema(payload: Record<string, unknown>, schemaLike: unknown): string[] {
  return normalizeInputValuesBySchema(payload, schemaLike).errors;
}
