type UnknownRecord = Record<string, unknown>;

export interface ContractViolation {
  path: string;
  message: string;
}

const allowedVerbSet = new Set(["route", "read", "write"]);
const allowedMethodSet = new Set(["GET", "POST"]);
const allowedResponseModeSet = new Set(["page", "region"]);
const allowedConfirmationPolicySet = new Set(["never", "always", "high-and-above"]);

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function pushViolation(list: ContractViolation[], path: string, message: string): void {
  list.push({ path, message });
}

function validateInputSchema(schema: unknown, path: string, violations: ContractViolation[]): void {
  if (!isRecord(schema)) {
    pushViolation(violations, path, "input_schema must be an object");
    return;
  }

  if (schema.required !== undefined) {
    if (!Array.isArray(schema.required) || schema.required.some((entry) => typeof entry !== "string")) {
      pushViolation(violations, `${path}.required`, "required must be an array of strings");
    }
  }

  if (schema.properties !== undefined && !isRecord(schema.properties)) {
    pushViolation(violations, `${path}.properties`, "properties must be an object");
  }
}

export function validateActionsContractEnvelope(envelope: unknown): ContractViolation[] {
  const violations: ContractViolation[] = [];
  if (!isRecord(envelope)) {
    pushViolation(violations, "root", "envelope must be an object");
    return violations;
  }

  const actionsRoot = envelope.actions;
  if (!isRecord(actionsRoot)) {
    pushViolation(violations, "actions", "actions must be an object");
    return violations;
  }

  if (typeof actionsRoot.app_id !== "string" || actionsRoot.app_id.trim().length === 0) {
    pushViolation(violations, "actions.app_id", "app_id is required and must be a non-empty string");
  }

  if (typeof actionsRoot.state_id !== "string" || actionsRoot.state_id.trim().length === 0) {
    pushViolation(violations, "actions.state_id", "state_id is required and must be a non-empty string");
  }

  if (typeof actionsRoot.state_version !== "number" || !Number.isFinite(actionsRoot.state_version)) {
    pushViolation(violations, "actions.state_version", "state_version is required and must be a finite number");
  }

  const actionsList = actionsRoot.actions;
  if (!Array.isArray(actionsList)) {
    pushViolation(violations, "actions.actions", "actions.actions must be an array");
    return violations;
  }

  const actionIds = new Set<string>();
  for (let index = 0; index < actionsList.length; index += 1) {
    const action = actionsList[index];
    const actionPath = `actions.actions[${index}]`;
    if (!isRecord(action)) {
      pushViolation(violations, actionPath, "action must be an object");
      continue;
    }

    const id = action.id;
    if (typeof id !== "string" || id.trim().length === 0) {
      pushViolation(violations, `${actionPath}.id`, "id is required and must be a non-empty string");
    } else {
      if (actionIds.has(id)) {
        pushViolation(violations, `${actionPath}.id`, `duplicate action id: "${id}"`);
      }
      actionIds.add(id);
    }

    const target = action.target;
    if (typeof target !== "string" || target.trim().length === 0) {
      pushViolation(violations, `${actionPath}.target`, "target is required and must be a non-empty string");
    }

    const verb = action.verb;
    if (verb !== undefined) {
      if (typeof verb !== "string" || !allowedVerbSet.has(verb)) {
        pushViolation(
          violations,
          `${actionPath}.verb`,
          `verb must be one of: ${[...allowedVerbSet].join(", ")}`
        );
      }
    }

    const transport = action.transport;
    if (transport !== undefined) {
      if (!isRecord(transport)) {
        pushViolation(violations, `${actionPath}.transport`, "transport must be an object");
      } else if (transport.method !== undefined) {
        const method = typeof transport.method === "string" ? transport.method.toUpperCase() : "";
        if (!allowedMethodSet.has(method)) {
          pushViolation(
            violations,
            `${actionPath}.transport.method`,
            `transport.method must be one of: ${[...allowedMethodSet].join(", ")}`
          );
        }
      }
    }

    const stateEffect = action.state_effect;
    if (stateEffect !== undefined) {
      if (!isRecord(stateEffect)) {
        pushViolation(violations, `${actionPath}.state_effect`, "state_effect must be an object");
      } else if (stateEffect.response_mode !== undefined) {
        const responseMode = stateEffect.response_mode;
        if (typeof responseMode !== "string" || !allowedResponseModeSet.has(responseMode)) {
          pushViolation(
            violations,
            `${actionPath}.state_effect.response_mode`,
            `state_effect.response_mode must be one of: ${[...allowedResponseModeSet].join(", ")}`
          );
        }
      }
    }

    if (action.input_schema !== undefined) {
      validateInputSchema(action.input_schema, `${actionPath}.input_schema`, violations);
    }

    if (action.security !== undefined) {
      if (!isRecord(action.security)) {
        pushViolation(violations, `${actionPath}.security`, "security must be an object");
      } else if (action.security.confirmation_policy !== undefined) {
        const policy = action.security.confirmation_policy;
        if (typeof policy !== "string" || !allowedConfirmationPolicySet.has(policy)) {
          pushViolation(
            violations,
            `${actionPath}.security.confirmation_policy`,
            `security.confirmation_policy must be one of: ${[...allowedConfirmationPolicySet].join(", ")}`
          );
        }
      }
    }
  }

  if (actionsRoot.security !== undefined) {
    if (!isRecord(actionsRoot.security)) {
      pushViolation(violations, "actions.security", "actions.security must be an object");
    } else if (actionsRoot.security.default_confirmation_policy !== undefined) {
      const policy = actionsRoot.security.default_confirmation_policy;
      if (typeof policy !== "string" || !allowedConfirmationPolicySet.has(policy)) {
        pushViolation(
          violations,
          "actions.security.default_confirmation_policy",
          `actions.security.default_confirmation_policy must be one of: ${[...allowedConfirmationPolicySet].join(", ")}`
        );
      }
    }
  }

  const allowedNextActions = actionsRoot.allowed_next_actions;
  if (allowedNextActions !== undefined) {
    if (!Array.isArray(allowedNextActions) || allowedNextActions.some((entry) => typeof entry !== "string")) {
      pushViolation(violations, "actions.allowed_next_actions", "allowed_next_actions must be an array of strings");
    } else {
      for (const actionId of allowedNextActions) {
        if (!actionIds.has(actionId)) {
          pushViolation(
            violations,
            "actions.allowed_next_actions",
            `unknown action id reference: "${actionId}"`
          );
        }
      }
    }
  }

  return violations;
}

export function assertActionsContractEnvelope(envelope: unknown): void {
  const violations = validateActionsContractEnvelope(envelope);
  if (violations.length === 0) {
    return;
  }
  const summary = violations.map((entry) => `${entry.path}: ${entry.message}`).join("; ");
  throw new Error(`invalid actions contract: ${summary}`);
}
