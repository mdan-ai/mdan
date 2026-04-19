import { describe, expect, it } from "vitest";

import { appendAgentEvalTraceEvent, createAgentEvalTrace } from "./support/index.js";

describe("agent eval trace", () => {
  it("creates a run trace with stable metadata and no events", () => {
    expect(
      createAgentEvalTrace({
        runId: "run-1",
        caseId: "submit-message",
        fixtureId: "single-step/submit-message",
        agentId: "generic-web-agent",
        assumptionLevel: "A0",
        startedAt: "2026-04-12T07:15:00.000Z"
      })
    ).toEqual({
      metadata: {
        runId: "run-1",
        caseId: "submit-message",
        fixtureId: "single-step/submit-message",
        agentId: "generic-web-agent",
        assumptionLevel: "A0",
        startedAt: "2026-04-12T07:15:00.000Z"
      },
      events: []
    });
  });

  it("appends indexed events without mutating the previous trace", () => {
    const trace = createAgentEvalTrace({
      runId: "run-1",
      caseId: "submit-message",
      fixtureId: "single-step/submit-message",
      agentId: "generic-web-agent",
      assumptionLevel: "A0",
      startedAt: "2026-04-12T07:15:00.000Z"
    });

    const next = appendAgentEvalTraceEvent(trace, {
      kind: "observation",
      at: "2026-04-12T07:15:01.000Z",
      url: "https://example.test/messages",
      contentSummary: "A page with one message input and a submit action.",
      discoveredInputs: ["message"],
      discoveredActions: ["submit"]
    });

    expect(trace.events).toEqual([]);
    expect(next.events).toEqual([
      {
        index: 0,
        kind: "observation",
        at: "2026-04-12T07:15:01.000Z",
        url: "https://example.test/messages",
        contentSummary: "A page with one message input and a submit action.",
        discoveredInputs: ["message"],
        discoveredActions: ["submit"]
      }
    ]);
  });
});
