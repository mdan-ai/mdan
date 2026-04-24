export const MDAN_PAGE_MANIFEST_VERSION = "mdan.page.v1";

export type MdanActionVerb = "route" | "read" | "write";
export type MdanActionMethod = "GET" | "POST";
export type MdanResponseMode = "page" | "region";
export type MdanConfirmationPolicy = "never" | "always" | "high-and-above";
export type MdanRiskLevel = "low" | "medium" | "high" | "critical";
export type MdanBlockTrust = "trusted" | "untrusted";

export type JsonObjectSchema = {
  type?: "object";
  required?: string[];
  properties?: Record<string, unknown>;
  additionalProperties?: boolean;
};

export type MdanActionManifest = {
  version?: typeof MDAN_PAGE_MANIFEST_VERSION;
  app_id?: string;
  state_id?: string;
  state_version?: number;
  blocks?: Record<string, JsonBlock>;
  regions?: Record<string, string>;
  actions?: Record<string, Omit<JsonAction, "id">>;
  security?: {
    default_confirmation_policy?: MdanConfirmationPolicy;
  };
};

export type JsonBlock = {
  trust?: MdanBlockTrust;
  actions?: string[];
  auto?: boolean;
};

export type JsonAction = {
  id?: string;
  label?: string;
  verb?: MdanActionVerb;
  target?: string;
  auto?: boolean;
  action_id?: string;
  action_proof?: string;
  action_issued_at?: number;
  submit_format?: string;
  requires_confirmation?: boolean;
  submit_example?: Record<string, unknown>;
  block?: string;
  state_effect?: {
    response_mode?: MdanResponseMode;
    updated_regions?: string[];
  };
  guard?: {
    risk_level?: MdanRiskLevel;
  };
  security?: {
    confirmation_policy?: MdanConfirmationPolicy;
  };
  transport?: {
    method?: MdanActionMethod;
  };
  input_schema?: JsonObjectSchema;
};
