import { describe, expect, it } from "vitest";

import { createSubmitMessageFixture, runSubmitMessageFixtureProbe, serveAgentEvalFixture } from "./support/index.js";

describe("agent eval probe runner", () => {
  it("discovers the submit-message page surface and produces a passing A0 run", async () => {
    const fixture = createSubmitMessageFixture();

    const result = await runSubmitMessageFixtureProbe({
      fixture,
      runId: "probe-run-1",
      message: "hello from probe",
      startedAt: "2026-04-12T08:00:00.000Z"
    });

    expect(result.outcome).toEqual({
      status: "PASS",
      failureCategory: undefined,
      assumptionLevelReached: "A0"
    });
    expect(result.oracle).toEqual({
      business: { passed: true },
      ui: { passed: true },
      protocol: { passed: true }
    });
    expect(result.trace.metadata).toEqual({
      runId: "probe-run-1",
      caseId: "submit-message",
      fixtureId: "single-step/submit-message",
      agentId: "json-surface-probe",
      assumptionLevel: "A0",
      startedAt: "2026-04-12T08:00:00.000Z"
    });
    expect(result.trace.events.map((event) => event.kind)).toEqual(["observation", "system", "observation"]);
    expect(fixture.getMessages()).toEqual(["hello from probe"]);
  });

  it("can run the same probe against a real loopback URL", async () => {
    const fixture = createSubmitMessageFixture();
    const hosted = await serveAgentEvalFixture(fixture);

    try {
      const result = await runSubmitMessageFixtureProbe({
        fixture,
        runId: "probe-run-http",
        message: "hello from url",
        startedAt: "2026-04-12T08:05:00.000Z",
        baseUrl: hosted.baseUrl
      });

      expect(result.outcome.status).toBe("PASS");
      expect(result.trace.events[0]).toMatchObject({
        kind: "observation",
        url: hosted.baseUrl
      });
      expect(fixture.getMessages()).toEqual(["hello from url"]);
    } finally {
      await hosted.close();
    }
  });
});
