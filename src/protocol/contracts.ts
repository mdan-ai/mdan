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

function actionEntriesFromRoot(actionsRoot: UnknownRecord, violations: ContractViolation[]) {
  const actionsValue = actionsRoot.actions;
  if (Array.isArray(actionsValue)) {
    pushViolation(violations, "actions.actions", "actions.actions must be an object keyed by action id");
    return null;
  }
  if (isRecord(actionsValue)) {
    return Object.entries(actionsValue).map(([id, action]) => ({
      action,
      idFromKey: id,
      path: `actions.actions.${id}`
    }));
  }
  pushViolation(violations, "actions.actions", "actions.actions must be an object keyed by action id");
  return null;
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

  const actionEntries = actionEntriesFromRoot(actionsRoot, violations);
  if (!actionEntries) {
    return violations;
  }

  const actionIds = new Set<string>();
  for (const entry of actionEntries) {
    const action = entry.action;
    const actionPath = entry.path;
    if (!isRecord(action)) {
      pushViolation(violations, actionPath, "action must be an object");
      continue;
    }

    const id = entry.idFromKey ?? action.id;
    if (typeof id !== "string" || id.trim().length === 0) {
      pushViolation(
        violations,
        entry.idFromKey === null ? `${actionPath}.id` : actionPath,
        "id is required and must be a non-empty string"
      );
    } else {
      if (actionIds.has(id)) {
        pushViolation(
          violations,
          entry.idFromKey === null ? `${actionPath}.id` : actionPath,
          `duplicate action id: "${id}"`
        );
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

  if (Array.isArray(actionsRoot.blocks)) {
    pushViolation(violations, "actions.blocks", "actions.blocks must be an object keyed by block id");
  } else if (isRecord(actionsRoot.blocks)) {
    for (const [blockId, block] of Object.entries(actionsRoot.blocks)) {
      const blockPath = `actions.blocks.${blockId}`;
      if (!isRecord(block)) {
        pushViolation(violations, blockPath, "block must be an object");
        continue;
      }
      if (block.actions !== undefined) {
        if (!Array.isArray(block.actions) || block.actions.some((entry) => typeof entry !== "string")) {
          pushViolation(violations, `${blockPath}.actions`, "block actions must be an array of strings");
          continue;
        }
        for (const actionId of block.actions) {
          if (!actionIds.has(actionId)) {
            pushViolation(violations, `${blockPath}.actions`, `unknown action id reference: "${actionId}"`);
          }
        }
      }
    }
  }

  const allowedNextActions = actionsRoot.allowed_next_actions;
  if (allowedNextActions !== undefined) {
    pushViolation(
      violations,
      "actions.allowed_next_actions",
      "allowed_next_actions is not supported; use blocks.<id>.actions"
    );
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
