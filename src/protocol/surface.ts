export type MdanActionManifest = {
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
  block?: unknown;
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
