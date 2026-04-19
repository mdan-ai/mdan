import { createServer, type Server } from "node:http";

import { createNodeHost } from "../../../src/server/node.js";
import { createMdanServer, type MdanRequest } from "../../../src/server/index.js";
import { adaptJsonEnvelopeToHeadlessSnapshot, type JsonSurfaceEnvelope } from "../../../src/surface/adapter.js";

export type AgentEvalAssumptionLevel = "A0" | "A1" | "A2" | "A3";

export type AgentEvalFailureCategory =
  | "discoverability_failure"
  | "interaction_failure"
  | "state_progression_failure"
  | "result_interpretation_failure"
  | "protocol_violation"
  | "environment_failure"
  | "agent_capability_limit";

export type AgentEvalOutcomeStatus = "PASS" | "PASS_WITH_ASSIST" | "REACHABLE_BUT_WEAK" | "FAIL";

export type AgentEvalCaseTier = "single-step" | "multi-step" | "cross-state";

export interface AgentEvalCaseOracleDefinition {
  business: string;
  ui: string;
  protocol: string;
}

export interface AgentEvalCaseInput {
  id: string;
  tier: AgentEvalCaseTier;
  title: string;
  goal: string;
  url: string;
  prompt: string;
  tags?: string[];
  assumptionLevels?: AgentEvalAssumptionLevel[];
  timeoutMs?: number;
  maxSteps?: number;
  oracle: AgentEvalCaseOracleDefinition;
}

export interface AgentEvalCase {
  id: string;
  tier: AgentEvalCaseTier;
  title: string;
  goal: string;
  url: string;
  prompt: string;
  tags: string[];
  assumptionLevels: AgentEvalAssumptionLevel[];
  timeoutMs: number;
  maxSteps: number;
  oracle: AgentEvalCaseOracleDefinition;
}

export interface AgentEvalOracleResult {
  passed: boolean;
  failureCategory?: AgentEvalFailureCategory;
  message?: string;
}

export interface AgentEvalOracleSet {
  business: AgentEvalOracleResult;
  ui: AgentEvalOracleResult;
  protocol: AgentEvalOracleResult;
}

export interface EvaluateAgentRunOutcomeInput {
  assumptionLevel: AgentEvalAssumptionLevel;
  oracle: AgentEvalOracleSet;
}

export interface AgentEvalRunOutcome {
  status: AgentEvalOutcomeStatus;
  failureCategory?: AgentEvalFailureCategory;
  assumptionLevelReached: AgentEvalAssumptionLevel;
}

export interface AgentEvalTraceMetadata {
  runId: string;
  caseId: string;
  fixtureId: string;
  agentId: string;
  assumptionLevel: AgentEvalAssumptionLevel;
  startedAt: string;
}

export interface AgentEvalObservationEvent {
  index: number;
  kind: "observation";
  at: string;
  url: string;
  contentSummary?: string;
  discoveredInputs?: string[];
  discoveredActions?: string[];
  discoveredErrors?: string[];
}

export interface AgentEvalSystemEvent {
  index: number;
  kind: "system";
  at: string;
  requestMethod: MdanRequest["method"];
  requestTarget: string;
  requestBodyShape?: string;
  responseKind: "page" | "region" | "stream" | "error";
  updatedRegions?: string[];
  stateChangeSummary?: string;
}

export type AgentEvalTraceEvent = AgentEvalObservationEvent | AgentEvalSystemEvent;

export type AgentEvalObservationEventInput = Omit<AgentEvalObservationEvent, "index">;

export type AgentEvalSystemEventInput = Omit<AgentEvalSystemEvent, "index">;

export type AgentEvalTraceEventInput = AgentEvalObservationEventInput | AgentEvalSystemEventInput;

export interface AgentEvalTrace {
  metadata: AgentEvalTraceMetadata;
  events: AgentEvalTraceEvent[];
}

export interface SubmitMessageFixture {
  id: "single-step/submit-message";
  case: AgentEvalCase;
  server: ReturnType<typeof createMdanServer>;
  seed(messages: string[]): void;
  reset(): void;
  getMessages(): string[];
}

export interface PreviewConfirmFixture {
  id: "multi-step/preview-confirm-message";
  case: AgentEvalCase;
  server: ReturnType<typeof createMdanServer>;
  seed(state: { draft?: string; messages?: string[] }): void;
  reset(): void;
  getDraft(): string | undefined;
  getMessages(): string[];
}

export interface ListDetailCompleteFixture {
  id: "cross-state/list-detail-complete";
  case: AgentEvalCase;
  server: ReturnType<typeof createMdanServer>;
  reset(): void;
  getCompletedItems(): string[];
}

export type AgentEvalFixture = SubmitMessageFixture | PreviewConfirmFixture | ListDetailCompleteFixture;

export interface HostedAgentEvalFixture {
  baseUrl: string;
  server: Server;
  close(): Promise<void>;
}

export interface VerifySubmitMessageFixtureRunInput {
  fixture: SubmitMessageFixture;
  expectedMessage: string;
  trace: AgentEvalTrace;
}

export async function serveAgentEvalFixture(fixture: AgentEvalFixture): Promise<HostedAgentEvalFixture> {
  const server = createServer(createNodeHost(fixture.server));

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    throw new Error("agent eval fixture did not bind to a TCP port");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}/`,
    server,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  };
}

export interface RunSubmitMessageFixtureProbeInput {
  fixture: SubmitMessageFixture;
  runId: string;
  message: string;
  startedAt: string;
  baseUrl?: string;
}

export interface VerifyPreviewConfirmFixtureRunInput {
  fixture: PreviewConfirmFixture;
  expectedMessage: string;
  trace: AgentEvalTrace;
}

export interface RunPreviewConfirmFixtureProbeInput {
  fixture: PreviewConfirmFixture;
  runId: string;
  message: string;
  startedAt: string;
  baseUrl?: string;
}

export interface VerifyListDetailCompleteFixtureRunInput {
  fixture: ListDetailCompleteFixture;
  itemId: string;
  trace: AgentEvalTrace;
}

export interface RunListDetailCompleteFixtureProbeInput {
  fixture: ListDetailCompleteFixture;
  runId: string;
  itemId: string;
  startedAt: string;
  baseUrl?: string;
}

export interface AgentEvalProbeRunResult {
  trace: AgentEvalTrace;
  oracle: AgentEvalOracleSet;
  outcome: AgentEvalRunOutcome;
}

export function defineAgentEvalCase(input: AgentEvalCaseInput): AgentEvalCase {
  return {
    ...input,
    tags: input.tags ?? [],
    assumptionLevels: input.assumptionLevels ?? ["A0"],
    timeoutMs: input.timeoutMs ?? 120000,
    maxSteps: input.maxSteps ?? 20
  };
}

export function validateAgentEvalCase(input: AgentEvalCaseInput): string[] {
  const errors: string[] = [];

  if (!input.id.trim()) errors.push("id is required");
  if (!input.goal.trim()) errors.push("goal is required");
  if (!input.url.trim()) errors.push("url is required");
  if (!input.prompt.trim()) errors.push("prompt is required");
  if (!input.oracle.business.trim()) errors.push("oracle.business is required");
  if (!input.oracle.ui.trim()) errors.push("oracle.ui is required");
  if (!input.oracle.protocol.trim()) errors.push("oracle.protocol is required");

  return errors;
}

export function evaluateAgentRunOutcome(input: EvaluateAgentRunOutcomeInput): AgentEvalRunOutcome {
  const failedOracle = [input.oracle.business, input.oracle.ui, input.oracle.protocol].find((result) => !result.passed);

  if (failedOracle) {
    return {
      status: "FAIL",
      failureCategory: failedOracle.failureCategory,
      assumptionLevelReached: input.assumptionLevel
    };
  }

  if (input.assumptionLevel === "A0") {
    return {
      status: "PASS",
      failureCategory: undefined,
      assumptionLevelReached: input.assumptionLevel
    };
  }

  if (input.assumptionLevel === "A1") {
    return {
      status: "PASS_WITH_ASSIST",
      failureCategory: undefined,
      assumptionLevelReached: input.assumptionLevel
    };
  }

  return {
    status: "REACHABLE_BUT_WEAK",
    failureCategory: undefined,
    assumptionLevelReached: input.assumptionLevel
  };
}

export function createAgentEvalTrace(metadata: AgentEvalTraceMetadata): AgentEvalTrace {
  return {
    metadata: { ...metadata },
    events: []
  };
}

export function appendAgentEvalTraceEvent(trace: AgentEvalTrace, event: AgentEvalTraceEventInput): AgentEvalTrace {
  const indexedEvent: AgentEvalTraceEvent =
    event.kind === "observation"
      ? {
          index: trace.events.length,
          ...event
        }
      : {
          index: trace.events.length,
          ...event
        };

  return {
    metadata: trace.metadata,
    events: [...trace.events, indexedEvent]
  };
}

function submitMessageEnvelope(messages: string[]): JsonSurfaceEnvelope {
  const latest = messages[0];
  const region = latest
    ? `## Message submitted\n\nLatest message: ${latest}`
    : "No message has been submitted yet.";

  return {
    content: [
      "---",
      'title: "Submit Message"',
      "---",
      "",
      "# Submit Message",
      "",
      "Use this page to submit one message.",
      "",
      '::: block{id="main" actions="submit_message"}',
      ":::"
    ].join("\n"),
    actions: {
      app_id: "agent-eval-submit-message",
      state_id: `submit-message:${messages.length}`,
      state_version: messages.length + 1,
      blocks: ["main"],
      actions: [
        {
          id: "submit_message",
          label: "Submit message",
          verb: "write",
          target: "/messages",
          transport: {
            method: "POST"
          },
          state_effect: {
            response_mode: "page"
          },
          input_schema: {
            type: "object",
            required: ["message"],
            properties: {
              message: {
                type: "string",
                minLength: 1,
                description: "The message text to submit."
              }
            },
            additionalProperties: false
          }
        }
      ],
      allowed_next_actions: ["submit_message"]
    },
    view: {
      route_path: "/",
      regions: {
        main: region
      }
    }
  };
}

export function createSubmitMessageFixture(): SubmitMessageFixture {
  const messages: string[] = [];
  const server = createMdanServer();

  server.page("/", async () => submitMessageEnvelope(messages));

  server.post("/messages", async ({ inputs }) => {
    const message = String(inputs.message ?? "").trim();
    if (message) {
      messages.unshift(message);
    }
    return {
      route: "/",
      ...submitMessageEnvelope(messages)
    };
  });

  return {
    id: "single-step/submit-message",
    case: defineAgentEvalCase({
      id: "submit-message",
      tier: "single-step",
      title: "Submit a message",
      goal: "Create a message through the page interaction.",
      url: "/",
      prompt: "Open the URL and submit the message: hello from test.",
      tags: ["single-step", "form", "create"],
      oracle: {
        business: "A message record exists with the submitted text.",
        ui: "The page shows the submitted message or a success confirmation.",
        protocol: "The agent used the page-exposed submit action."
      }
    }),
    server,
    seed(nextMessages: string[]) {
      messages.splice(0, messages.length, ...nextMessages);
    },
    reset() {
      messages.splice(0, messages.length);
    },
    getMessages() {
      return [...messages];
    }
  };
}

export function verifySubmitMessageFixtureRun(input: VerifySubmitMessageFixtureRunInput): AgentEvalOracleSet {
  const hasBusinessResult = input.fixture.getMessages().includes(input.expectedMessage);
  const hasUiEvidence = input.trace.events.some(
    (event) =>
      event.kind === "observation" &&
      typeof event.contentSummary === "string" &&
      event.contentSummary.includes(input.expectedMessage)
  );
  const hasProtocolEvidence = input.trace.events.some(
    (event) =>
      event.kind === "system" &&
      event.requestMethod === "POST" &&
      event.requestTarget === "/messages" &&
      event.responseKind === "page"
  );

  return {
    business: hasBusinessResult
      ? { passed: true }
      : {
          passed: false,
          failureCategory: "result_interpretation_failure",
          message: `Expected message was not persisted: ${input.expectedMessage}`
        },
    ui: hasUiEvidence
      ? { passed: true }
      : {
          passed: false,
          failureCategory: "result_interpretation_failure",
          message: `Trace does not show final UI evidence for message: ${input.expectedMessage}`
        },
    protocol: hasProtocolEvidence
      ? { passed: true }
      : {
          passed: false,
          failureCategory: "protocol_violation",
          message: "Trace does not show a page-exposed POST /messages action."
    }
  };
}

function previewConfirmEnvelope(state: { draft?: string; messages: string[] }): JsonSurfaceEnvelope {
  const confirmed = state.messages[0];
  const block = confirmed
    ? `## Message confirmed\n\nLatest message: ${confirmed}`
    : state.draft
      ? `## Preview message\n\nDraft message: ${state.draft}\n\nConfirm this message to finish the task.`
      : "No draft has been previewed yet.";
  const action = state.draft
    ? {
        id: "confirm_message",
        label: "Confirm message",
        verb: "write",
        target: "/confirm",
        transport: {
          method: "POST"
        },
        state_effect: {
          response_mode: "page"
        },
        input_schema: {
          type: "object",
          required: [],
          properties: {},
          additionalProperties: false
        }
      }
    : {
        id: "preview_message",
        label: "Preview message",
        verb: "write",
        target: "/preview",
        transport: {
          method: "POST"
        },
        state_effect: {
          response_mode: "page"
        },
        input_schema: {
          type: "object",
          required: ["message"],
          properties: {
            message: {
              type: "string",
              minLength: 1,
              description: "The message text to preview before confirmation."
            }
          },
          additionalProperties: false
        }
      };

  return {
    content: [
      "---",
      'title: "Preview Confirm Message"',
      "---",
      "",
      "# Preview Confirm Message",
      "",
      "Use this page to preview one message, then confirm it.",
      "",
      '::: block{id="main" actions="' + action.id + '"}',
      ":::"
    ].join("\n"),
    actions: {
      app_id: "agent-eval-preview-confirm",
      state_id: `preview-confirm:${state.messages.length}:${state.draft ?? "none"}`,
      state_version: state.messages.length + (state.draft ? 1 : 0) + 1,
      blocks: ["main"],
      actions: [action],
      allowed_next_actions: [action.id]
    },
    view: {
      route_path: "/",
      regions: {
        main: block
      }
    }
  };
}

export function createPreviewConfirmFixture(): PreviewConfirmFixture {
  const state: { draft?: string; messages: string[] } = {
    messages: []
  };
  const server = createMdanServer();

  server.page("/", async () => previewConfirmEnvelope(state));
  server.post("/preview", async ({ inputs }) => {
    const message = String(inputs.message ?? "").trim();
    if (message) {
      state.draft = message;
    }
    return {
      route: "/",
      ...previewConfirmEnvelope(state)
    };
  });
  server.post("/confirm", async () => {
    if (state.draft) {
      state.messages.unshift(state.draft);
      state.draft = undefined;
    }
    return {
      route: "/",
      ...previewConfirmEnvelope(state)
    };
  });

  return {
    id: "multi-step/preview-confirm-message",
    case: defineAgentEvalCase({
      id: "preview-confirm-message",
      tier: "multi-step",
      title: "Preview and confirm a message",
      goal: "Preview a message first, then confirm it through the page interaction.",
      url: "/",
      prompt: "Open the URL, preview the message, then confirm it: hello from test.",
      tags: ["multi-step", "form", "confirmation"],
      oracle: {
        business: "A confirmed message record exists with the submitted text.",
        ui: "The page shows the confirmed message success state.",
        protocol: "The agent used the page-exposed preview and confirm actions in order."
      }
    }),
    server,
    seed(nextState) {
      state.messages.splice(0, state.messages.length, ...(nextState.messages ?? []));
      state.draft = nextState.draft;
    },
    reset() {
      state.messages.splice(0, state.messages.length);
      state.draft = undefined;
    },
    getDraft() {
      return state.draft;
    },
    getMessages() {
      return [...state.messages];
    }
  };
}

export function verifyPreviewConfirmFixtureRun(input: VerifyPreviewConfirmFixtureRunInput): AgentEvalOracleSet {
  const hasBusinessResult = input.fixture.getMessages().includes(input.expectedMessage);
  const hasUiEvidence = input.trace.events.some(
    (event) =>
      event.kind === "observation" &&
      typeof event.contentSummary === "string" &&
      event.contentSummary.includes("Message confirmed") &&
      event.contentSummary.includes(input.expectedMessage)
  );
  const systemTargets = input.trace.events
    .filter((event): event is AgentEvalSystemEvent => event.kind === "system")
    .map((event) => event.requestTarget);
  const hasProtocolEvidence = systemTargets.join(" > ") === "/preview > /confirm";

  return {
    business: hasBusinessResult
      ? { passed: true }
      : {
          passed: false,
          failureCategory: "state_progression_failure",
          message: `Expected confirmed message was not persisted: ${input.expectedMessage}`
        },
    ui: hasUiEvidence
      ? { passed: true }
      : {
          passed: false,
          failureCategory: "result_interpretation_failure",
          message: `Trace does not show confirmed UI evidence for message: ${input.expectedMessage}`
        },
    protocol: hasProtocolEvidence
      ? { passed: true }
      : {
          passed: false,
          failureCategory: "state_progression_failure",
          message: "Trace does not show preview followed by confirm."
        }
  };
}

function listDetailEnvelope(completedItems: Set<string>, route: "list" | "detail", itemId: string = "alpha"): JsonSurfaceEnvelope {
  const isCompleted = completedItems.has(itemId);
  const block =
    route === "list"
      ? [
          "## Task list",
          "",
          "- Alpha task: " + (isCompleted ? "completed" : "open"),
          "- Beta task: open",
          "",
          "Open Alpha task to review and complete it."
        ].join("\n")
      : [
          `## ${itemId === "alpha" ? "Alpha" : itemId} task detail`,
          "",
          isCompleted ? "Alpha task completed." : "Alpha task is ready to complete."
        ].join("\n");
  const action =
    route === "list"
      ? {
          id: "open_alpha",
          label: "Open Alpha task",
          verb: "navigate",
          target: "/items/alpha",
          transport: {
            method: "GET"
          },
          state_effect: {
            response_mode: "page"
          },
          input_schema: {
            type: "object",
            required: [],
            properties: {},
            additionalProperties: false
          }
        }
      : {
          id: "complete_alpha",
          label: "Complete Alpha task",
          verb: "write",
          target: "/items/alpha/complete",
          transport: {
            method: "POST"
          },
          state_effect: {
            response_mode: "page"
          },
          input_schema: {
            type: "object",
            required: [],
            properties: {},
            additionalProperties: false
          }
        };

  return {
    content: [
      "---",
      'title: "List Detail Complete"',
      "---",
      "",
      "# List Detail Complete",
      "",
      "Use this page to open the Alpha task from the list, then complete it on the detail page.",
      "",
      '::: block{id="main" actions="' + action.id + '"}',
      ":::"
    ].join("\n"),
    actions: {
      app_id: "agent-eval-list-detail-complete",
      state_id: `list-detail:${route}:${itemId}:${isCompleted ? "done" : "open"}`,
      state_version: completedItems.size + (route === "detail" ? 2 : 1),
      blocks: ["main"],
      actions: [action],
      allowed_next_actions: [action.id]
    },
    view: {
      route_path: route === "list" ? "/" : `/items/${itemId}`,
      regions: {
        main: block
      }
    }
  };
}

export function createListDetailCompleteFixture(): ListDetailCompleteFixture {
  const completedItems = new Set<string>();
  const server = createMdanServer();

  server.page("/", async () => listDetailEnvelope(completedItems, "list"));
  server.page("/items/:id", async ({ params }) => listDetailEnvelope(completedItems, "detail", params.id));
  server.post("/items/:id/complete", async ({ params }) => {
    completedItems.add(params.id);
    return {
      route: `/items/${params.id}`,
      ...listDetailEnvelope(completedItems, "detail", params.id)
    };
  });

  return {
    id: "cross-state/list-detail-complete",
    case: defineAgentEvalCase({
      id: "list-detail-complete",
      tier: "cross-state",
      title: "Open a list item and complete it",
      goal: "Open the Alpha task from the list, then complete it on the detail page.",
      url: "/",
      prompt: "Open the URL, open the Alpha task, then complete it.",
      tags: ["cross-state", "navigation", "completion"],
      oracle: {
        business: "The target item is marked completed.",
        ui: "The detail page shows the target item completed state.",
        protocol: "The agent used the page-exposed list navigation action before the completion action."
      }
    }),
    server,
    reset() {
      completedItems.clear();
    },
    getCompletedItems() {
      return [...completedItems];
    }
  };
}

export function verifyListDetailCompleteFixtureRun(input: VerifyListDetailCompleteFixtureRunInput): AgentEvalOracleSet {
  const hasBusinessResult = input.fixture.getCompletedItems().includes(input.itemId);
  const hasUiEvidence = input.trace.events.some(
    (event) =>
      event.kind === "observation" &&
      typeof event.contentSummary === "string" &&
      event.contentSummary.includes("task completed")
  );
  const systemTargets = input.trace.events
    .filter((event): event is AgentEvalSystemEvent => event.kind === "system")
    .map((event) => event.requestTarget);
  const hasProtocolEvidence = systemTargets.join(" > ") === `/items/${input.itemId} > /items/${input.itemId}/complete`;

  return {
    business: hasBusinessResult
      ? { passed: true }
      : {
          passed: false,
          failureCategory: "state_progression_failure",
          message: `Expected item was not completed: ${input.itemId}`
        },
    ui: hasUiEvidence
      ? { passed: true }
      : {
          passed: false,
          failureCategory: "result_interpretation_failure",
          message: `Trace does not show completed UI evidence for item: ${input.itemId}`
        },
    protocol: hasProtocolEvidence
      ? { passed: true }
      : {
          passed: false,
          failureCategory: "state_progression_failure",
          message: `Trace does not show detail navigation followed by completion for item: ${input.itemId}`
        }
  };
}

type DiscoveredAction = {
  method: "GET" | "POST";
  target: string;
  inputs: string[];
  actions: string[];
  actionProof?: string;
  content: string;
};

function discoverAction(envelope: JsonSurfaceEnvelope, index = 0): DiscoveredAction {
  const snapshot = adaptJsonEnvelopeToHeadlessSnapshot(envelope);
  const block = snapshot.blocks.find((candidate) => candidate.operations.length > index);
  const operation = block?.operations[index];
  if (!block || !operation) {
    throw new Error("fixture did not expose a discoverable action");
  }

	  return {
	    method: operation.method,
	    target: operation.target,
	    inputs: operation.inputs.map((input) => input.name),
	    actions: [operation.label ?? operation.name],
	    ...(typeof operation.actionProof === "string" ? { actionProof: operation.actionProof } : {}),
	    content: envelope.content
	  };
	}

function actionRequestBody(action: DiscoveredAction, input: Record<string, unknown>): Record<string, unknown> {
  if (!action.actionProof) {
    return input;
  }
  return {
    action: {
      proof: action.actionProof
    },
    input
  };
}

function parseJsonSurfaceEnvelope(body: string): JsonSurfaceEnvelope | null {
  try {
    const parsed = JSON.parse(body) as unknown;
    if (parsed && typeof parsed === "object" && "content" in parsed && "actions" in parsed) {
      return parsed as JsonSurfaceEnvelope;
    }
  } catch {
    return null;
  }
  return null;
}

function summarizeSurface(surface: JsonSurfaceEnvelope | null, fallbackBody: string): string {
  if (!surface) {
    return fallbackBody;
  }

  const regionSummary = Object.values(surface.view?.regions ?? {})
    .filter((value) => typeof value === "string" && value.length > 0)
    .join("\n");

  return [surface.content, regionSummary].filter(Boolean).join("\n");
}

async function readJsonSurface(fixture: AgentEvalFixture, baseUrl: string, useHttp: boolean): Promise<JsonSurfaceEnvelope> {
  if (useHttp) {
    return fetch(baseUrl, { headers: { accept: "application/json" } }).then((response) => response.json());
  }

  return JSON.parse(
    String(
      (
        await fixture.server.handle({
          method: "GET",
          url: baseUrl,
          headers: { accept: "application/json" },
          cookies: {}
        })
      ).body
    )
  ) as JsonSurfaceEnvelope;
}

async function postJson(
  fixture: AgentEvalFixture,
  baseUrl: string,
  action: DiscoveredAction,
  body: Record<string, unknown>,
  useHttp: boolean
): Promise<{ status: number; body: string; surface: JsonSurfaceEnvelope | null }> {
  const requestBody = actionRequestBody(action, body);
  if (useHttp) {
    return fetch(new URL(action.target, baseUrl), {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json"
      },
      body: JSON.stringify(requestBody)
    }).then(async (response) => {
      const responseBody = await response.text();
        return {
          status: response.status,
          body: responseBody,
          surface: parseJsonSurfaceEnvelope(responseBody)
        };
      });
  }

	  const response = await fixture.server.handle({
	    method: "POST",
	    url: new URL(action.target, baseUrl).toString(),
    headers: {
      accept: "application/json",
      "content-type": "application/json"
    },
	    body: JSON.stringify(requestBody),
    cookies: {}
  });

  const responseBody = String(response.body);
  return {
    status: response.status,
    body: responseBody,
    surface: parseJsonSurfaceEnvelope(responseBody)
  };
}

export async function runSubmitMessageFixtureProbe(
  input: RunSubmitMessageFixtureProbeInput
): Promise<AgentEvalProbeRunResult> {
  const baseUrl = input.baseUrl ?? "https://example.test/";
  let trace = createAgentEvalTrace({
    runId: input.runId,
    caseId: input.fixture.case.id,
    fixtureId: input.fixture.id,
    agentId: "json-surface-probe",
    assumptionLevel: "A0",
    startedAt: input.startedAt
  });

  const pageSurface = await readJsonSurface(input.fixture, baseUrl, Boolean(input.baseUrl));
  const discovered = discoverAction(pageSurface);

  trace = appendAgentEvalTraceEvent(trace, {
    kind: "observation",
    at: input.startedAt,
    url: baseUrl,
    contentSummary: pageSurface.content,
    discoveredInputs: discovered.inputs,
    discoveredActions: discovered.actions
  });

  const post = await postJson(input.fixture, baseUrl, discovered, { message: input.message }, Boolean(input.baseUrl));

  trace = appendAgentEvalTraceEvent(trace, {
    kind: "system",
    at: input.startedAt,
    requestMethod: discovered.method,
    requestTarget: discovered.target,
    requestBodyShape: "json:{message}",
    responseKind: post.status >= 400 ? "error" : "page",
    stateChangeSummary: `Created message: ${input.message}`
  });

  trace = appendAgentEvalTraceEvent(trace, {
    kind: "observation",
    at: input.startedAt,
    url: baseUrl,
    contentSummary: summarizeSurface(post.surface, post.body)
  });

  const oracle = verifySubmitMessageFixtureRun({
    fixture: input.fixture,
    expectedMessage: input.message,
    trace
  });

  return {
    trace,
    oracle,
    outcome: evaluateAgentRunOutcome({
      assumptionLevel: "A0",
      oracle
    })
  };
}

export async function runPreviewConfirmFixtureProbe(
  input: RunPreviewConfirmFixtureProbeInput
): Promise<AgentEvalProbeRunResult> {
  const baseUrl = input.baseUrl ?? "https://example.test/";
  const useHttp = Boolean(input.baseUrl);
  let trace = createAgentEvalTrace({
    runId: input.runId,
    caseId: input.fixture.case.id,
    fixtureId: input.fixture.id,
    agentId: "json-surface-probe",
    assumptionLevel: "A0",
    startedAt: input.startedAt
  });

  const initialSurface = await readJsonSurface(input.fixture, baseUrl, useHttp);
  const previewForm = discoverAction(initialSurface);
  if (previewForm.method !== "POST") {
    throw new Error("preview-confirm fixture did not expose a POST preview form");
  }
  trace = appendAgentEvalTraceEvent(trace, {
    kind: "observation",
    at: input.startedAt,
    url: baseUrl,
    contentSummary: initialSurface.content,
    discoveredInputs: previewForm.inputs,
    discoveredActions: previewForm.actions
  });

  const preview = await postJson(input.fixture, baseUrl, previewForm, { message: input.message }, useHttp);
  trace = appendAgentEvalTraceEvent(trace, {
    kind: "system",
    at: input.startedAt,
    requestMethod: previewForm.method,
    requestTarget: previewForm.target,
    requestBodyShape: "json:{message}",
    responseKind: preview.status >= 400 ? "error" : "page",
    stateChangeSummary: `Previewed message: ${input.message}`
  });

  trace = appendAgentEvalTraceEvent(trace, {
    kind: "observation",
    at: input.startedAt,
    url: baseUrl,
    contentSummary: summarizeSurface(preview.surface, preview.body)
  });

  const confirmSurface = await readJsonSurface(input.fixture, baseUrl, useHttp);
  const confirmForm = discoverAction(confirmSurface);
  if (confirmForm.method !== "POST") {
    throw new Error("preview-confirm fixture did not expose a POST confirm form");
  }
  const confirm = await postJson(input.fixture, baseUrl, confirmForm, {}, useHttp);
  trace = appendAgentEvalTraceEvent(trace, {
    kind: "system",
    at: input.startedAt,
    requestMethod: confirmForm.method,
    requestTarget: confirmForm.target,
    requestBodyShape: "json:{}",
    responseKind: confirm.status >= 400 ? "error" : "page",
    stateChangeSummary: `Confirmed message: ${input.message}`
  });

  trace = appendAgentEvalTraceEvent(trace, {
    kind: "observation",
    at: input.startedAt,
    url: baseUrl,
    contentSummary: summarizeSurface(confirm.surface, confirm.body)
  });

  const oracle = verifyPreviewConfirmFixtureRun({
    fixture: input.fixture,
    expectedMessage: input.message,
    trace
  });

  return {
    trace,
    oracle,
    outcome: evaluateAgentRunOutcome({
      assumptionLevel: "A0",
      oracle
    })
  };
}

export async function runListDetailCompleteFixtureProbe(
  input: RunListDetailCompleteFixtureProbeInput
): Promise<AgentEvalProbeRunResult> {
  const baseUrl = input.baseUrl ?? "https://example.test/";
  const useHttp = Boolean(input.baseUrl);
  let trace = createAgentEvalTrace({
    runId: input.runId,
    caseId: input.fixture.case.id,
    fixtureId: input.fixture.id,
    agentId: "json-surface-probe",
    assumptionLevel: "A0",
    startedAt: input.startedAt
  });

  const listSurface = await readJsonSurface(input.fixture, baseUrl, useHttp);
  const openForm = discoverAction(listSurface);
  trace = appendAgentEvalTraceEvent(trace, {
    kind: "observation",
    at: input.startedAt,
    url: baseUrl,
    contentSummary: listSurface.content,
    discoveredInputs: openForm.inputs,
    discoveredActions: openForm.actions
  });

  const detailResponse = useHttp
    ? await fetch(new URL(openForm.target, baseUrl), { headers: { accept: "application/json" } }).then(async (response) => ({
        status: response.status,
        body: await response.text()
      }))
    : {
        status: 200,
        body: String(
          (
            await input.fixture.server.handle({
              method: "GET",
              url: new URL(openForm.target, baseUrl).toString(),
              headers: { accept: "application/json" },
              cookies: {}
            })
          ).body
        )
      };

  trace = appendAgentEvalTraceEvent(trace, {
    kind: "system",
    at: input.startedAt,
    requestMethod: "GET",
    requestTarget: openForm.target,
    responseKind: detailResponse.status >= 400 ? "error" : "page",
    stateChangeSummary: `Opened item detail: ${input.itemId}`
  });

  trace = appendAgentEvalTraceEvent(trace, {
    kind: "observation",
    at: input.startedAt,
    url: new URL(openForm.target, baseUrl).toString(),
    contentSummary: detailResponse.body
  });

  const completeForm = discoverAction(JSON.parse(detailResponse.body) as JsonSurfaceEnvelope);
  if (completeForm.method !== "POST") {
    throw new Error("list-detail fixture did not expose a POST completion form");
  }
  const completeResponse = await postJson(input.fixture, baseUrl, completeForm, {}, useHttp);
  trace = appendAgentEvalTraceEvent(trace, {
    kind: "system",
    at: input.startedAt,
    requestMethod: completeForm.method,
    requestTarget: completeForm.target,
    requestBodyShape: "json:{}",
    responseKind: completeResponse.status >= 400 ? "error" : "page",
    stateChangeSummary: `Completed item: ${input.itemId}`
  });

  trace = appendAgentEvalTraceEvent(trace, {
    kind: "observation",
    at: input.startedAt,
    url: new URL(openForm.target, baseUrl).toString(),
    contentSummary: summarizeSurface(completeResponse.surface, completeResponse.body)
  });

  const oracle = verifyListDetailCompleteFixtureRun({
    fixture: input.fixture,
    itemId: input.itemId,
    trace
  });

  return {
    trace,
    oracle,
    outcome: evaluateAgentRunOutcome({
      assumptionLevel: "A0",
      oracle
    })
  };
}
