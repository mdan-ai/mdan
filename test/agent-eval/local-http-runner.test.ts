import { describe, expect, it } from "vitest";

import { createSubmitMessageFixture, serveAgentEvalFixture } from "./support/index.js";

describe("agent eval local HTTP runner", () => {
  it("serves a fixture through a real loopback URL", async () => {
    const fixture = createSubmitMessageFixture();
    const hosted = await serveAgentEvalFixture(fixture);

    try {
      const page = await fetch(hosted.baseUrl, {
        headers: { accept: "application/json" }
      });
      const body = await page.text();

	      expect(page.status).toBe(200);
	      expect(hosted.baseUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
	      expect(body).toContain("# Submit Message");
	      const proof = JSON.parse(body).actions.actions[0].action_proof;

	      const post = await fetch(new URL("/messages", hosted.baseUrl), {
        method: "POST",
        headers: {
          accept: "application/json",
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
      expect(post.headers.get("content-type")).toBe("application/json");
      expect(postBody).toContain("hello over http");
      expect(fixture.getMessages()).toEqual(["hello over http"]);
    } finally {
      await hosted.close();
    }
  });
});
