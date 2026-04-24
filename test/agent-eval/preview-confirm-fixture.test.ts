import { describe, expect, it } from "vitest";

import {
  createAgentEvalTrace,
  createPreviewConfirmFixture,
  runPreviewConfirmFixtureProbe,
  serveAgentEvalFixture,
  verifyPreviewConfirmFixtureRun
} from "./support/index.js";

function extractActionProof(markdown: string): string {
  const match = markdown.match(/```mdan\n([\s\S]*?)\n```/);
  expect(match?.[1]).toBeTruthy();
  const payload = JSON.parse(String(match?.[1])) as {
    actions?: Array<{ action_proof?: string }> | Record<string, { action_proof?: string }>;
  };
  const actions = Array.isArray(payload.actions) ? payload.actions : Object.values(payload.actions ?? {});
  expect(actions[0]?.action_proof).toBeTypeOf("string");
  return String(actions[0]?.action_proof);
}

describe("preview-confirm agent eval fixture", () => {
  it("requires preview before confirmation and only persists after confirm", async () => {
    const fixture = createPreviewConfirmFixture();

    expect(fixture.id).toBe("multi-step/preview-confirm-message");
    expect(fixture.case.tier).toBe("multi-step");

	    const initial = await fixture.server.handle({
	      method: "GET",
	      url: "https://example.test/",
	      headers: { accept: "text/markdown" },
	      cookies: {}
	    });
	    const previewProof = extractActionProof(String(initial.body));

	    const preview = await fixture.server.handle({
	      method: "POST",
	      url: "https://example.test/preview",
      headers: {
        accept: "text/markdown",
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
    expect(preview.headers["content-type"]).toContain("text/markdown");
    expect(String(preview.body)).toContain("Preview message");
    expect(String(preview.body)).toContain("hello multi-step");
    expect(fixture.getMessages()).toEqual([]);
    expect(fixture.getDraft()).toBe("hello multi-step");

	    const confirmProof = extractActionProof(String(preview.body));
	    const confirm = await fixture.server.handle({
	      method: "POST",
	      url: "https://example.test/confirm",
      headers: {
        accept: "text/markdown",
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
    expect(confirm.headers["content-type"]).toContain("text/markdown");
    expect(String(confirm.body)).toContain("Message confirmed");
    expect(fixture.getMessages()).toEqual(["hello multi-step"]);
    expect(fixture.getDraft()).toBeUndefined();
  });

  it("serves the preview-confirm page as an Markdown-native read instead of page JSON", async () => {
    const fixture = createPreviewConfirmFixture();

    const jsonPage = await fixture.server.handle({
      method: "GET",
      url: "https://example.test/",
      headers: { accept: "application/json" },
      cookies: {}
    });

    expect(jsonPage.status).toBe(406);
    expect(String(jsonPage.body)).toContain("## Not Acceptable");
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
          agentId: "markdown-probe",
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
