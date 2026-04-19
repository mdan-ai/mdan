import type { FieldSchema } from "../protocol/input/types.js";
import type { MdanConfirmationPolicy, MdanOperation, MdanOperationStateEffect } from "../protocol/types.js";
import type { JsonAction } from "../protocol/surface.js";
import { fieldSchemasFromJsonObjectSchema } from "../protocol/input/field-schema.js";

type JsonObject = Record<string, unknown>;

const confirmationPolicies = new Set<MdanConfirmationPolicy>(["never", "always", "high-and-above"]);

function isRecord(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toInputNames(action: JsonAction): string[] {
  if (!isRecord(action.input_schema)) {
    return [];
  }
  const properties = isRecord(action.input_schema.properties) ? action.input_schema.properties : {};
  return Object.keys(properties);
}

function toMethod(action: JsonAction): "GET" | "POST" {
  const method = typeof action.transport?.method === "string" ? action.transport.method.toUpperCase() : "";
  if (method === "GET") {
    return "GET";
  }
  if (method === "POST") {
    return "POST";
  }
  const verb = typeof action.verb === "string" ? action.verb.toLowerCase() : "";
  if (verb === "navigate" || verb === "read") {
    return "GET";
  }
  return "POST";
}

function toConfirmationPolicy(value: unknown): MdanConfirmationPolicy | null {
  if (typeof value !== "string") {
    return null;
  }
  return confirmationPolicies.has(value as MdanConfirmationPolicy) ? (value as MdanConfirmationPolicy) : null;
}

function resolveConfirmationPolicy(action: JsonAction, defaultPolicy: MdanConfirmationPolicy): MdanConfirmationPolicy {
  return toConfirmationPolicy(action.security?.confirmation_policy) ?? defaultPolicy;
}

function toStateEffect(action: JsonAction): MdanOperationStateEffect | undefined {
  if (!isRecord(action.state_effect)) {
    return undefined;
  }

  const stateEffect: MdanOperationStateEffect = {};
  if (action.state_effect.response_mode === "page" || action.state_effect.response_mode === "region") {
    stateEffect.responseMode = action.state_effect.response_mode;
  }
  if (Array.isArray(action.state_effect.updated_regions)) {
    stateEffect.updatedRegions = action.state_effect.updated_regions.filter(
      (entry): entry is string => typeof entry === "string"
    );
  }
  return Object.keys(stateEffect).length > 0 ? stateEffect : undefined;
}

function toInputSchema(action: JsonAction): Record<string, unknown> | undefined {
  const schema = action.input_schema;
  if (!isRecord(schema)) {
    return undefined;
  }
  return schema;
}

export function toOperation(action: JsonAction, defaultPolicy: MdanConfirmationPolicy): MdanOperation | null {
  const id = typeof action.id === "string" ? action.id : "";
  const target = typeof action.target === "string" ? action.target : "";
  if (!id || !target) {
    return null;
  }

  const method = toMethod(action);
  const inputs = toInputNames(action);
  const label = typeof action.label === "string" ? action.label : undefined;
  const confirmationPolicy = resolveConfirmationPolicy(action, defaultPolicy);
  const stateEffect = toStateEffect(action);
  const inputSchema = toInputSchema(action);
  const auto = method === "GET" && action.auto === true;
  const guard =
    typeof action.guard?.risk_level === "string"
      ? { riskLevel: action.guard.risk_level }
      : undefined;
  const semantics = {
    ...(typeof action.verb === "string" ? { verb: action.verb } : {}),
    ...(stateEffect ? { stateEffect } : {}),
    ...(guard ? { guard } : {}),
    ...(inputSchema ? { inputSchema } : {}),
    ...(typeof action.action_id === "string" ? { actionId: action.action_id } : {}),
    ...(typeof action.action_proof === "string" ? { actionProof: action.action_proof } : {}),
    ...(typeof action.action_issued_at === "number" ? { actionIssuedAt: action.action_issued_at } : {}),
    ...(typeof action.submit_format === "string" ? { submitFormat: action.submit_format } : {}),
    ...(typeof action.requires_confirmation === "boolean"
      ? { requiresConfirmation: action.requires_confirmation }
      : {}),
    ...(isRecord(action.submit_example) ? { submitExample: action.submit_example } : {}),
    security: {
      confirmationPolicy
    }
  };

  if (method === "GET") {
    return {
      method,
      target,
      name: id,
      inputs,
      ...(auto ? { auto } : {}),
      ...(label ? { label } : {}),
      ...semantics
    };
  }

  return {
    method,
    target,
    name: id,
    inputs,
    ...(auto ? { auto } : {}),
    ...(label ? { label } : {}),
    ...semantics
  };
}

function fieldSchemaCompatibilitySignature(input: FieldSchema): string {
  return JSON.stringify({
    kind: input.kind,
    format: input.format,
    required: input.required,
    secret: input.secret,
    options: input.options ?? null
  });
}

export function blockInputsFromActions(actions: JsonAction[]): FieldSchema[] {
  const byName = new Map<string, FieldSchema>();

  for (const action of actions) {
    if (!isRecord(action.input_schema)) {
      continue;
    }
    for (const entry of fieldSchemasFromJsonObjectSchema(action.input_schema)) {
      const existing = byName.get(entry.name);
      if (!existing) {
        byName.set(entry.name, entry);
        continue;
      }
      if (fieldSchemaCompatibilitySignature(existing) !== fieldSchemaCompatibilitySignature(entry)) {
        continue;
      }
      byName.set(entry.name, {
        ...existing,
        required: existing.required || entry.required,
        description: existing.description ?? entry.description,
        defaultValue: existing.defaultValue ?? entry.defaultValue,
        constraints: existing.constraints ?? entry.constraints,
        rawSchema: existing.rawSchema ?? entry.rawSchema
      });
    }
  }

  return [...byName.values()];
}
