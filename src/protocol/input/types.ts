export type FieldKind = "string" | "number" | "integer" | "boolean" | "enum" | "asset" | "object" | "array";
export type FieldFormat = "password" | "textarea" | "binary";

export interface FieldSchema {
  name: string;
  kind: FieldKind;
  required: boolean;
  secret: boolean;
  format?: FieldFormat;
  options?: string[];
  description?: string;
  defaultValue?: string | number | boolean | null;
  constraints?: {
    minLength?: number;
    maxLength?: number;
    minimum?: number;
    maximum?: number;
    pattern?: string;
  };
  rawSchema?: Record<string, unknown>;
}
