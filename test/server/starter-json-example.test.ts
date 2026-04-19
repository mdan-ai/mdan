import { describe, expect, it } from "vitest";

import { createStarterServer } from "../../examples/starter/app.js";

describe("starter json example", () => {
  it("renders and updates starter feed", async () => {
    const server = createStarterServer(["Booted"]);

    const home = await server.handle({
      method: "GET",
      url: "https://example.test/",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(home.status).toBe(200);
	    expect(String(home.body)).toContain("# Starter App");
	    expect(String(home.body)).toContain("Booted");

	    const jsonHome = await server.handle({
	      method: "GET",
	      url: "https://example.test/",
	      headers: { accept: "application/json" },
	      cookies: {}
	    });
	    const proof = JSON.parse(String(jsonHome.body)).actions.actions.find(
	      (action: { id?: string }) => action.id === "submit_message"
	    ).action_proof;

	    const post = await server.handle({
      method: "POST",
      url: "https://example.test/post",
      headers: {
        accept: "application/json",
        "content-type": "application/json"
      },
	      body: JSON.stringify({
	        action: {
	          proof
	        },
	        input: {
	          message: "From starter"
	        }
	      }),
      cookies: {}
    });

    expect(post.status).toBe(200);
    expect(String(post.body)).toContain("From starter");
  });
});
