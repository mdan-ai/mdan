import { createServer, type Server } from "node:http";

import { extractSections, parseFrontmatter } from "../../../src/content/content-actions.js";
import { createMarkdownPage } from "../../../src/server/markdown-surface.js";
import { createNodeHost } from "../../../src/server/node.js";
import { createMdanServer, type MdanRequest } from "../../../src/server/index.js";

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

function submitMessagePage(messages: string[]) {
  const latest = messages[0];
  const main = latest
    ? `## Message submitted\n\nLatest message: ${latest}`
    : "No message has been submitted yet.";

  return createMarkdownPage({
    frontmatter: {
      title: "Submit Message",
      route: "/",
      app_id: "agent-eval-submit-message",
      state_id: `submit-message:${messages.length}`,
      state_version: messages.length + 1
    },
    markdown: `# Submit Message

Use this page to submit one message.

::: block{id="main"}`,
    blockContent: {
      main
    },
    blocks: [
      {
        name: "main",
        inputs: [],
        operations: [
          {
            method: "POST",
            name: "submit_message",
            label: "Submit message",
            verb: "write",
            target: "/messages",
            inputs: ["message"],
            stateEffect: {
              responseMode: "page"
            },
            inputSchema: {
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
            },
            security: {
              confirmationPolicy: "never"
            }
          }
        ]
      }
    ]
  });
}

export function createSubmitMessageFixture(): SubmitMessageFixture {
  const messages: string[] = [];
  const server = createMdanServer();

  server.page("/", async () => submitMessagePage(messages));

  server.post("/messages", async ({ inputs }) => {
    const message = String(inputs.message ?? "").trim();
    if (message) {
      messages.unshift(message);
    }
    return {
      route: "/",
      page: submitMessagePage(messages)
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

function previewConfirmPage(state: { draft?: string; messages: string[] }) {
  const confirmed = state.messages[0];
  const main = confirmed
    ? `## Message confirmed\n\nLatest message: ${confirmed}`
    : state.draft
      ? `## Preview message\n\nDraft message: ${state.draft}\n\nConfirm this message to finish the task.`
      : "No draft has been previewed yet.";
  return createMarkdownPage({
    frontmatter: {
      title: "Preview Confirm Message",
      route: "/",
      app_id: "agent-eval-preview-confirm",
      state_id: `preview-confirm:${state.messages.length}:${state.draft ?? "none"}`,
      state_version: state.messages.length + (state.draft ? 1 : 0) + 1
    },
    markdown: `# Preview Confirm Message

Use this page to preview one message, then confirm it.

::: block{id="main"}`,
    blockContent: {
      main
    },
    blocks: [
      {
        name: "main",
        inputs: [],
        operations: [
          state.draft
            ? {
                method: "POST" as const,
                name: "confirm_message",
                label: "Confirm message",
                verb: "write",
                target: "/confirm",
                inputs: [],
                stateEffect: {
                  responseMode: "page"
                },
                inputSchema: {
                  type: "object",
                  required: [],
                  properties: {},
                  additionalProperties: false
                },
                security: {
                  confirmationPolicy: "never" as const
                }
              }
            : {
                method: "POST" as const,
                name: "preview_message",
                label: "Preview message",
                verb: "write",
                target: "/preview",
                inputs: ["message"],
                stateEffect: {
                  responseMode: "page"
                },
                inputSchema: {
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
                },
                security: {
                  confirmationPolicy: "never" as const
                }
              }
        ]
      }
    ]
  });
}

export function createPreviewConfirmFixture(): PreviewConfirmFixture {
  const state: { draft?: string; messages: string[] } = {
    messages: []
  };
  const server = createMdanServer();

  server.page("/", async () => previewConfirmPage(state));
  server.post("/preview", async ({ inputs }) => {
    const message = String(inputs.message ?? "").trim();
    if (message) {
      state.draft = message;
    }
    return {
      route: "/",
      page: previewConfirmPage(state)
    };
  });
  server.post("/confirm", async () => {
    if (state.draft) {
      state.messages.unshift(state.draft);
      state.draft = undefined;
    }
    return {
      route: "/",
      page: previewConfirmPage(state)
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

function listDetailPage(completedItems: Set<string>, route: "list" | "detail", itemId: string = "alpha") {
  const isCompleted = completedItems.has(itemId);
  const main =
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
  return createMarkdownPage({
    frontmatter: {
      title: "List Detail Complete",
      route: route === "list" ? "/" : `/items/${itemId}`,
      app_id: "agent-eval-list-detail-complete",
      state_id: `list-detail:${route}:${itemId}:${isCompleted ? "done" : "open"}`,
      state_version: completedItems.size + (route === "detail" ? 2 : 1)
    },
    markdown: `# List Detail Complete

Use this page to open the Alpha task from the list, then complete it on the detail page.

::: block{id="main"}
:::`,
    blockContent: {
      main
    },
    blocks: [
      {
        name: "main",
        inputs: [],
        operations: [
          route === "list"
            ? {
                method: "GET" as const,
                name: "open_alpha",
                label: "Open Alpha task",
                verb: "navigate",
                target: "/items/alpha",
                inputs: [],
                stateEffect: {
                  responseMode: "page"
                },
                inputSchema: {
                  type: "object",
                  required: [],
                  properties: {},
                  additionalProperties: false
                },
                security: {
                  confirmationPolicy: "never" as const
                }
              }
            : {
                method: "POST" as const,
                name: "complete_alpha",
                label: "Complete Alpha task",
                verb: "write",
                target: "/items/alpha/complete",
                inputs: [],
                stateEffect: {
                  responseMode: "page"
                },
                inputSchema: {
                  type: "object",
                  required: [],
                  properties: {},
                  additionalProperties: false
                },
                security: {
                  confirmationPolicy: "never" as const
                }
              }
        ]
      }
    ]
  });
}

export function createListDetailCompleteFixture(): ListDetailCompleteFixture {
  const completedItems = new Set<string>();
  const server = createMdanServer();

  server.page("/", async () => listDetailPage(completedItems, "list"));
  server.page("/items/:id", async ({ params }) => listDetailPage(completedItems, "detail", params.id));
  server.post("/items/:id/complete", async ({ params }) => {
    completedItems.add(params.id);
    return {
      route: `/items/${params.id}`,
      page: listDetailPage(completedItems, "detail", params.id)
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

type AgentMarkdownAction = {
  id?: unknown;
  label?: unknown;
  verb?: unknown;
  target?: unknown;
  transport?: {
    method?: unknown;
  };
  input_schema?: {
    properties?: unknown;
  };
  action_proof?: unknown;
};

type AgentMarkdownSurface = {
  content: string;
  route?: string;
  regions?: Record<string, string>;
  actions: {
    allowed_next_actions?: string[];
    actions?: AgentMarkdownAction[];
  };
};

function discoverAction(surface: AgentMarkdownSurface, index = 0): DiscoveredAction {
  const allowed = new Set(
    Array.isArray(surface.actions.allowed_next_actions)
      ? surface.actions.allowed_next_actions.filter((value): value is string => typeof value === "string")
      : []
  );
  const actions = (surface.actions.actions ?? []).filter((action) => {
    const id = typeof action.id === "string" ? action.id : "";
    return id.length > 0 && (allowed.size === 0 || allowed.has(id));
  });
  const action = actions[index];
  if (!action) {
    throw new Error("fixture did not expose a discoverable action");
  }

  const method =
    typeof action.transport?.method === "string"
      ? action.transport.method.toUpperCase() === "GET"
        ? "GET"
        : "POST"
      : typeof action.verb === "string" && ["navigate", "read"].includes(action.verb)
        ? "GET"
        : "POST";
  const inputs =
    action.input_schema?.properties && typeof action.input_schema.properties === "object"
      ? Object.keys(action.input_schema.properties as Record<string, unknown>)
      : [];

	  return {
	    method,
	    target: typeof action.target === "string" ? action.target : "",
	    inputs,
	    actions: [typeof action.label === "string" ? action.label : typeof action.id === "string" ? action.id : "action"],
	    ...(typeof action.action_proof === "string" ? { actionProof: action.action_proof } : {}),
	    content: surface.content
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

function parseMarkdownSurface(body: string): AgentMarkdownSurface | null {
  const executableMatch = body.match(/```mdan\n([\s\S]*?)\n```/);
  if (!executableMatch?.[1]) {
    return null;
  }

  try {
    const actions = JSON.parse(executableMatch[1]) as unknown;
    if (!actions || typeof actions !== "object" || Array.isArray(actions)) {
      return null;
    }
    const actionEnvelope = actions as AgentMarkdownSurface["actions"];
    const frontmatter = parseFrontmatter(body);
    const sections = extractSections(body);
    const regions = Object.fromEntries(sections.map((section) => [section.id, section.body]));
    return {
      content: body,
      ...(typeof frontmatter.route === "string" ? { route: frontmatter.route } : {}),
      ...(Object.keys(regions).length > 0 ? { regions } : {}),
      actions: actionEnvelope,
    };
  } catch {
    return null;
  }
}

function parseAgentReadableEnvelope(body: string): AgentMarkdownSurface | null {
  return parseMarkdownSurface(body);
}

function summarizeSurface(surface: AgentMarkdownSurface | null, fallbackBody: string): string {
  if (!surface) {
    return fallbackBody;
  }

  const regionSummary = Object.values(surface.regions ?? {})
    .filter((value) => typeof value === "string" && value.length > 0)
    .join("\n");

  return [surface.content, regionSummary].filter(Boolean).join("\n");
}

async function readAgentSurface(fixture: AgentEvalFixture, baseUrl: string, useHttp: boolean): Promise<AgentMarkdownSurface> {
  if (useHttp) {
    return fetch(baseUrl, { headers: { accept: "text/markdown" } }).then(async (response) => {
      const body = await response.text();
      const surface = parseAgentReadableEnvelope(body);
      if (!surface) {
        throw new Error("agent-eval probe could not parse the initial markdown response");
      }
      return surface;
    });
  }

  const body = String(
    (
      await fixture.server.handle({
        method: "GET",
        url: baseUrl,
        headers: { accept: "text/markdown" },
        cookies: {}
      })
    ).body
  );
  const surface = parseAgentReadableEnvelope(body);
  if (!surface) {
    throw new Error("agent-eval probe could not parse the initial markdown response");
  }
  return surface;
}

async function submitAgentAction(
  fixture: AgentEvalFixture,
  baseUrl: string,
  action: DiscoveredAction,
  body: Record<string, unknown>,
  useHttp: boolean
): Promise<{ status: number; body: string; surface: AgentMarkdownSurface | null }> {
  const requestBody = actionRequestBody(action, body);
  if (useHttp) {
    return fetch(new URL(action.target, baseUrl), {
      method: "POST",
      headers: {
        accept: "text/markdown",
        "content-type": "application/json"
      },
      body: JSON.stringify(requestBody)
    }).then(async (response) => {
      const responseBody = await response.text();
        return {
          status: response.status,
          body: responseBody,
          surface: parseAgentReadableEnvelope(responseBody)
        };
      });
  }

  const response = await fixture.server.handle({
	    method: "POST",
	    url: new URL(action.target, baseUrl).toString(),
    headers: {
      accept: "text/markdown",
      "content-type": "application/json"
    },
	    body: JSON.stringify(requestBody),
    cookies: {}
  });

  const responseBody = String(response.body);
  return {
    status: response.status,
    body: responseBody,
    surface: parseAgentReadableEnvelope(responseBody)
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
    agentId: "markdown-probe",
    assumptionLevel: "A0",
    startedAt: input.startedAt
  });

  const pageSurface = await readAgentSurface(input.fixture, baseUrl, Boolean(input.baseUrl));
  const discovered = discoverAction(pageSurface);

  trace = appendAgentEvalTraceEvent(trace, {
    kind: "observation",
    at: input.startedAt,
    url: baseUrl,
    contentSummary: pageSurface.content,
    discoveredInputs: discovered.inputs,
    discoveredActions: discovered.actions
  });

  const post = await submitAgentAction(input.fixture, baseUrl, discovered, { message: input.message }, Boolean(input.baseUrl));

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
    agentId: "markdown-probe",
    assumptionLevel: "A0",
    startedAt: input.startedAt
  });

  const initialSurface = await readAgentSurface(input.fixture, baseUrl, useHttp);
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

  const preview = await submitAgentAction(input.fixture, baseUrl, previewForm, { message: input.message }, useHttp);
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

  const confirmSurface = await readAgentSurface(input.fixture, baseUrl, useHttp);
  const confirmForm = discoverAction(confirmSurface);
  if (confirmForm.method !== "POST") {
    throw new Error("preview-confirm fixture did not expose a POST confirm form");
  }
  const confirm = await submitAgentAction(input.fixture, baseUrl, confirmForm, {}, useHttp);
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
    agentId: "markdown-probe",
    assumptionLevel: "A0",
    startedAt: input.startedAt
  });

  const listSurface = await readAgentSurface(input.fixture, baseUrl, useHttp);
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
    ? await fetch(new URL(openForm.target, baseUrl), { headers: { accept: "text/markdown" } }).then(async (response) => ({
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
              headers: { accept: "text/markdown" },
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

  const detailSurface = parseAgentReadableEnvelope(detailResponse.body);
  if (!detailSurface) {
    throw new Error("list-detail fixture detail response was not parseable as an agent-readable Markdown response");
  }
  const completeForm = discoverAction(detailSurface);
  if (completeForm.method !== "POST") {
    throw new Error("list-detail fixture did not expose a POST completion form");
  }
  const completeResponse = await submitAgentAction(input.fixture, baseUrl, completeForm, {}, useHttp);
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
