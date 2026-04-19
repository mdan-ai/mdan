import { describe, expect, it } from "vitest";

import {
  appendAgentEvalTraceEvent,
  createAgentEvalTrace,
  createSubmitMessageFixture,
  verifySubmitMessageFixtureRun
} from "./support/index.js";

describe("submit message agent eval fixture", () => {
  it("defines a resettable single-step case", () => {
    const fixture = createSubmitMessageFixture();

    expect(fixture.id).toBe("single-step/submit-message");
    expect(fixture.case.id).toBe("submit-message");
    expect(fixture.case.tier).toBe("single-step");
    expect(fixture.case.assumptionLevels).toEqual(["A0"]);

    fixture.seed(["Existing"]);
    expect(fixture.getMessages()).toEqual(["Existing"]);
    fixture.reset();
    expect(fixture.getMessages()).toEqual([]);
  });

  it("serves a page with one clear message action and persists submissions", async () => {
    const fixture = createSubmitMessageFixture();

    const page = await fixture.server.handle({
      method: "GET",
      url: "https://example.test/",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(page.status).toBe(200);
    expect(String(page.body)).toContain("# Submit Message");
	    expect(String(page.body)).toContain("Use this page to submit one message.");
	    expect(String(page.body)).toContain("<!-- mdan:block main -->");

	    const jsonPage = await fixture.server.handle({
	      method: "GET",
	      url: "https://example.test/",
	      headers: { accept: "application/json" },
	      cookies: {}
	    });
	    const proof = JSON.parse(String(jsonPage.body)).actions.actions[0].action_proof;

	    const post = await fixture.server.handle({
      method: "POST",
      url: "https://example.test/messages",
      headers: {
        accept: "application/json",
        "content-type": "application/json"
      },
	      body: JSON.stringify({
	        action: {
	          proof
	        },
	        input: {
	          message: "hello from test"
	        }
	      }),
      cookies: {}
    });

    expect(post.status).toBe(200);
    expect(post.headers["content-type"]).toBe("application/json");
    expect(String(post.body)).toContain("Message submitted");
    expect(String(post.body)).toContain("hello from test");
    expect(fixture.getMessages()).toEqual(["hello from test"]);
  });

  it("verifies business, UI, and protocol evidence from a completed run", () => {
    const fixture = createSubmitMessageFixture();
    fixture.seed(["hello from test"]);

    const trace = appendAgentEvalTraceEvent(
      appendAgentEvalTraceEvent(
        createAgentEvalTrace({
          runId: "run-1",
          caseId: fixture.case.id,
          fixtureId: fixture.id,
          agentId: "generic-web-agent",
          assumptionLevel: "A0",
          startedAt: "2026-04-12T07:30:00.000Z"
        }),
        {
          kind: "system",
          at: "2026-04-12T07:30:02.000Z",
          requestMethod: "POST",
          requestTarget: "/messages",
          responseKind: "page",
          stateChangeSummary: "Created message: hello from test"
        }
      ),
      {
        kind: "observation",
        at: "2026-04-12T07:30:03.000Z",
        url: "https://example.test/",
        contentSummary: "Message submitted: hello from test"
      }
    );

    expect(
      verifySubmitMessageFixtureRun({
        fixture,
        expectedMessage: "hello from test",
        trace
      })
    ).toEqual({
      business: { passed: true },
      ui: { passed: true },
      protocol: { passed: true }
    });
  });
});
