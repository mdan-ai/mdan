import { describe, expect, it } from "vitest";

import { createMarkdownPage } from "../../src/server/markdown-surface.js";
import { createMdanServer } from "../../src/server/index.js";
import { createSubmitMessageFixture, defineAgentEvalCase, runSubmitMessageFixtureProbe, serveAgentEvalFixture } from "./support/index.js";

function createMarkdownSubmitMessageFixture() {
  const messages: string[] = [];
  const server = createMdanServer();

  function pageMarkdown() {
    const latest = messages[0];
    const main = latest
      ? `## Message submitted\n\nLatest message: ${latest}`
      : "Use this page to submit one message.";

    return createMarkdownPage({
      frontmatter: {
        route: "/",
        app_id: "agent-eval-submit-message",
        state_id: `submit-message:${messages.length}`,
        state_version: messages.length + 1
      },
      markdown: `# Submit Message

Use this page to submit one message.

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
            {
              method: "POST",
              name: "submit_message",
              target: "/messages",
              inputs: ["message"],
              label: "Submit message",
              verb: "write",
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

  server.page("/", async () => pageMarkdown());
  server.post("/messages", async ({ inputs }) => {
    const message = String(inputs.message ?? "").trim();
    if (message) {
      messages.unshift(message);
    }
    return {
      route: "/",
      page: pageMarkdown()
    };
  });

  return {
    id: "single-step/submit-message" as const,
    case: defineAgentEvalCase({
      id: "submit-message",
      tier: "single-step",
      title: "Submit a message",
      goal: "Create a message through the page interaction.",
      url: "/",
      prompt: "Open the URL and submit the message: hello from probe.",
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
      agentId: "markdown-probe",
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

  it("can run the submit-message probe against an Markdown-native fixture", async () => {
    const fixture = createMarkdownSubmitMessageFixture();

    const result = await runSubmitMessageFixtureProbe({
      fixture,
      runId: "probe-run-markdown",
      message: "hello from markdown probe",
      startedAt: "2026-04-12T08:06:00.000Z"
    });

    expect(result.outcome.status).toBe("PASS");
    expect(fixture.getMessages()).toEqual(["hello from markdown probe"]);
  });
});
