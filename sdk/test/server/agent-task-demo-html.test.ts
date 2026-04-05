// @vitest-environment node

import http from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createHost } from "@mdanai/sdk/server/node";
import { createAgentTasksServer } from "../../../demo/agent-tasks/app/server.js";
import { transformAgentTasksHtml } from "../../../demo/agent-tasks/app/html-theme.js";

const servers = new Set<http.Server>();

afterEach(async () => {
  await Promise.all(
    [...servers].map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            servers.delete(server);
            resolve();
          });
        })
    )
  );
});

async function listen(listener: http.RequestListener): Promise<string> {
  const server = http.createServer(listener);
  servers.add(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected TCP server address.");
  }
  return `http://127.0.0.1:${address.port}`;
}

async function readSources() {
  const [overviewSource, newTaskSource, detailSource] = await Promise.all([
    readFile(join(process.cwd(), "demo", "agent-tasks", "app", "tasks.md"), "utf8"),
    readFile(join(process.cwd(), "demo", "agent-tasks", "app", "new-task.md"), "utf8"),
    readFile(join(process.cwd(), "demo", "agent-tasks", "app", "task-detail.md"), "utf8")
  ]);

  return { overviewSource, newTaskSource, detailSource };
}

describe("agent tasks demo html theme", () => {
  it("wraps login and tasks pages with the demo chrome and route-aware body attributes", async () => {
    const sources = await readSources();
    const server = createAgentTasksServer(sources);
    const baseUrl = await listen(createHost(server, { rootRedirect: "/tasks", transformHtml: transformAgentTasksHtml }));

    const loginHtml = await fetch(`${baseUrl}/login`, {
      headers: {
        accept: "text/html"
      }
    }).then((response) => response.text());

    expect(loginHtml).toContain('data-agent-demo-route="/login"');
    expect(loginHtml).toContain("MDAN Agent Tasks");
    expect(loginHtml).toContain("Agent Sign In");

    const register = await fetch(`${baseUrl}/register`, {
      method: "POST",
      headers: {
        accept: "text/html",
        "content-type": "text/markdown"
      },
      body: 'nickname: "agent-a", password: "pass-a"'
    });
    const cookie = register.headers.get("set-cookie");
    if (!cookie) {
      throw new Error("Expected session cookie.");
    }

    const tasksHtml = await fetch(`${baseUrl}/tasks`, {
      headers: {
        accept: "text/html",
        cookie
      }
    }).then((response) => response.text());

    expect(tasksHtml).toContain('data-agent-demo-route="/tasks"');
    expect(tasksHtml).toContain("Task Queue");
    expect(tasksHtml).toContain("agent-tasks-theme");
  });
});
