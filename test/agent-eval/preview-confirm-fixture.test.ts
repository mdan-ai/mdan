import { describe, expect, it } from "vitest";
import { adaptJsonEnvelopeToHeadlessSnapshot } from "../../src/surface/adapter.js";

import {
  createAgentEvalTrace,
  createPreviewConfirmFixture,
  runPreviewConfirmFixtureProbe,
  serveAgentEvalFixture,
  verifyPreviewConfirmFixtureRun
} from "./support/index.js";

describe("preview-confirm agent eval fixture", () => {
	  it("requires preview before confirmation and only persists after confirm", async () => {
	    const fixture = createPreviewConfirmFixture();

    expect(fixture.id).toBe("multi-step/preview-confirm-message");
    expect(fixture.case.tier).toBe("multi-step");

	    const initial = await fixture.server.handle({
	      method: "GET",
	      url: "https://example.test/",
	      headers: { accept: "application/json" },
	      cookies: {}
	    });
	    const previewProof = JSON.parse(String(initial.body)).actions.actions[0].action_proof;

	    const preview = await fixture.server.handle({
	      method: "POST",
	      url: "https://example.test/preview",
      headers: {
        accept: "application/json",
        "content-type": "application/json"
      },
	      body: JSON.stringify({
	        action: {
	          proof: previewProof
	        },
	        input: {
	          message: "hello multi-step"
	        }
	      }),
      cookies: {}
    });

    expect(preview.status).toBe(200);
    const previewSurface = JSON.parse(String(preview.body));
    expect(preview.headers["content-type"]).toBe("application/json");
    expect(previewSurface.view.regions.main).toContain("Preview message");
    expect(previewSurface.view.regions.main).toContain("hello multi-step");
    expect(fixture.getMessages()).toEqual([]);
    expect(fixture.getDraft()).toBe("hello multi-step");

	    const confirmProof = previewSurface.actions.actions[0].action_proof;
	    const confirm = await fixture.server.handle({
	      method: "POST",
	      url: "https://example.test/confirm",
      headers: {
        accept: "application/json",
        "content-type": "application/json"
      },
	      body: JSON.stringify({
	        action: {
	          proof: confirmProof
	        },
	        input: {}
	      }),
      cookies: {}
    });

    expect(confirm.status).toBe(200);
    const confirmSurface = JSON.parse(String(confirm.body));
    expect(confirm.headers["content-type"]).toBe("application/json");
    expect(confirmSurface.view.regions.main).toContain("Message confirmed");
    expect(adaptJsonEnvelopeToHeadlessSnapshot(confirmSurface).route).toBe("/");
    expect(fixture.getMessages()).toEqual(["hello multi-step"]);
    expect(fixture.getDraft()).toBeUndefined();
  });

  it("does not pass oracle with only a draft preview", () => {
    const fixture = createPreviewConfirmFixture();
    fixture.seed({ draft: "hello draft", messages: [] });

    expect(
      verifyPreviewConfirmFixtureRun({
        fixture,
        expectedMessage: "hello draft",
        trace: createAgentEvalTrace({
          runId: "draft-only",
          caseId: fixture.case.id,
          fixtureId: fixture.id,
          agentId: "json-surface-probe",
          assumptionLevel: "A0",
          startedAt: "2026-04-12T09:00:00.000Z"
        })
      }).business
    ).toEqual({
      passed: false,
      failureCategory: "state_progression_failure",
      message: "Expected confirmed message was not persisted: hello draft"
    });
  });

  it("runs a passing two-step probe against a real loopback URL", async () => {
    const fixture = createPreviewConfirmFixture();
    const hosted = await serveAgentEvalFixture(fixture);

    try {
      const result = await runPreviewConfirmFixtureProbe({
        fixture,
        runId: "preview-confirm-probe",
        message: "hello confirmed",
        startedAt: "2026-04-12T09:05:00.000Z",
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
      expect(fixture.getMessages()).toEqual(["hello confirmed"]);
    } finally {
      await hosted.close();
    }
  });
});
