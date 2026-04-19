import { describe, expect, it } from "vitest";

import {
  createAgentEvalTrace,
  createListDetailCompleteFixture,
  runListDetailCompleteFixtureProbe,
  serveAgentEvalFixture,
  verifyListDetailCompleteFixtureRun
} from "./support/index.js";

describe("list-detail-complete agent eval fixture", () => {
  it("requires navigating from list to detail before completing the target item", async () => {
    const fixture = createListDetailCompleteFixture();

    expect(fixture.id).toBe("cross-state/list-detail-complete");
    expect(fixture.case.tier).toBe("cross-state");

    const list = await fixture.server.handle({
      method: "GET",
      url: "https://example.test/",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(list.status).toBe(200);
    expect(String(list.body)).toContain("Open Alpha task");
    expect(fixture.getCompletedItems()).toEqual([]);

    const detail = await fixture.server.handle({
      method: "GET",
      url: "https://example.test/items/alpha",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

	    expect(detail.status).toBe(200);
	    expect(String(detail.body)).toContain("Alpha task detail");

	    const detailJson = await fixture.server.handle({
	      method: "GET",
	      url: "https://example.test/items/alpha",
	      headers: { accept: "application/json" },
	      cookies: {}
	    });
	    const completeProof = JSON.parse(String(detailJson.body)).actions.actions[0].action_proof;

	    const complete = await fixture.server.handle({
      method: "POST",
      url: "https://example.test/items/alpha/complete",
      headers: {
        accept: "application/json",
        "content-type": "application/json"
      },
	      body: JSON.stringify({
	        action: {
	          proof: completeProof
	        },
	        input: {}
	      }),
      cookies: {}
    });

    expect(complete.status).toBe(200);
    expect(complete.headers["content-type"]).toBe("application/json");
    expect(String(complete.body)).toContain("Alpha task completed");
    expect(fixture.getCompletedItems()).toEqual(["alpha"]);
  });

  it("does not pass oracle when the item was opened but not completed", () => {
    const fixture = createListDetailCompleteFixture();

    expect(
      verifyListDetailCompleteFixtureRun({
        fixture,
        itemId: "alpha",
        trace: createAgentEvalTrace({
          runId: "detail-only",
          caseId: fixture.case.id,
          fixtureId: fixture.id,
          agentId: "json-surface-probe",
          assumptionLevel: "A0",
          startedAt: "2026-04-12T10:00:00.000Z"
        })
      }).business
    ).toEqual({
      passed: false,
      failureCategory: "state_progression_failure",
      message: "Expected item was not completed: alpha"
    });
  });

  it("runs a passing cross-state probe against a real loopback URL", async () => {
    const fixture = createListDetailCompleteFixture();
    const hosted = await serveAgentEvalFixture(fixture);

    try {
      const result = await runListDetailCompleteFixtureProbe({
        fixture,
        runId: "list-detail-probe",
        itemId: "alpha",
        startedAt: "2026-04-12T10:05:00.000Z",
        baseUrl: hosted.baseUrl
      });

      expect(result.outcome.status).toBe("PASS");
      expect(result.trace.events.map((event) => event.kind)).toEqual([
        "observation",
        "system",
        "observation",
        "system",
        "observation"
      ]);
      expect(fixture.getCompletedItems()).toEqual(["alpha"]);
    } finally {
      await hosted.close();
    }
  });
});
