import { describe, expect, it } from "vitest";

import { createSubmitMessageFixture, serveAgentEvalFixture } from "./support/index.js";

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

describe("agent eval local HTTP runner", () => {
  it("serves a fixture through a real loopback URL", async () => {
    const fixture = createSubmitMessageFixture();
    const hosted = await serveAgentEvalFixture(fixture);

    try {
      const page = await fetch(hosted.baseUrl, {
        headers: { accept: "text/markdown" }
      });
      const body = await page.text();

	      expect(page.status).toBe(200);
	      expect(hosted.baseUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
      expect(page.headers.get("content-type")).toContain("text/markdown");
	      expect(body).toContain("# Submit Message");
	      const proof = extractActionProof(body);

	      const post = await fetch(new URL("/messages", hosted.baseUrl), {
        method: "POST",
        headers: {
          accept: "text/markdown",
          "content-type": "application/json"
        },
	        body: JSON.stringify({
	          action: {
	            proof
	          },
	          input: {
	            message: "hello over http"
	          }
	        })
	      });

      expect(post.status).toBe(200);
      const postBody = await post.text();
      expect(post.headers.get("content-type")).toContain("text/markdown");
      expect(postBody).toContain("hello over http");
      expect(fixture.getMessages()).toEqual(["hello over http"]);
    } finally {
      await hosted.close();
    }
  });
});
