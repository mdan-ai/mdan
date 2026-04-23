import { describe, expect, it } from "vitest";

import { createStarterServer } from "../../examples/starter/app.js";

function extractActionProof(markdown: string, actionId: string): string {
  const match = markdown.match(/```mdan\n([\s\S]*?)\n```/);
  expect(match?.[1]).toBeTruthy();
  const executable = JSON.parse(String(match?.[1])) as {
    actions?: Array<{ id?: string; action_proof?: string }>;
  };
  const action = executable.actions?.find((entry) => entry.id === actionId);
  expect(action?.action_proof).toBeTypeOf("string");
  return String(action?.action_proof);
}

describe("starter markdown example", () => {
  it("renders and updates starter feed through markdown responses", async () => {
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
    expect(String(home.body)).toContain("```mdan");
    const proof = extractActionProof(String(home.body), "submit_message");

    const jsonHome = await server.handle({
      method: "GET",
      url: "https://example.test/",
      headers: { accept: "application/json" },
      cookies: {}
    });
    expect(jsonHome.status).toBe(406);
    expect(String(jsonHome.body)).toContain("## Not Acceptable");

    const post = await server.handle({
      method: "POST",
      url: "https://example.test/post",
      headers: {
        accept: "text/markdown",
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
    expect(String(post.body)).toContain("```mdan");
  });
});
