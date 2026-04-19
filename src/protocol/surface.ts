export type JsonSurfaceEnvelope = {
  content: string;
  actions: {
    app_id?: string;
    state_id?: string;
    state_version?: number;
    blocks?: string[];
    actions?: JsonAction[];
    allowed_next_actions?: string[];
    security?: {
      default_confirmation_policy?: unknown;
    };
  };
  view?: {
    route_path?: string;
    regions?: Record<string, string>;
  };
};

type JsonObject = Record<string, unknown>;

function isRecord(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isJsonSurfaceEnvelope(value: unknown): value is JsonSurfaceEnvelope {
  if (!isRecord(value)) {
    return false;
  }
  if (typeof value.content !== "string") {
    return false;
  }
  if (!isRecord(value.actions)) {
    return false;
  }
  return true;
}

export type JsonAction = {
  id?: unknown;
  label?: unknown;
  verb?: unknown;
  target?: unknown;
  auto?: unknown;
  action_id?: unknown;
  action_proof?: unknown;
  action_issued_at?: unknown;
  submit_format?: unknown;
  requires_confirmation?: unknown;
  submit_example?: unknown;
  state_effect?: {
    response_mode?: unknown;
    updated_regions?: unknown;
  };
  guard?: {
    risk_level?: unknown;
  };
  security?: {
    confirmation_policy?: unknown;
  };
  transport?: {
    method?: unknown;
  };
  input_schema?: {
    type?: unknown;
    required?: unknown;
    properties?: unknown;
    additionalProperties?: unknown;
  };
};
