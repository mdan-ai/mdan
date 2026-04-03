import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createAgentTasksServer } from "../../../demo/agent-tasks/app/server.js";

async function readSources(): Promise<{ overviewSource: string; newTaskSource: string; detailSource: string }> {
  const [overviewSource, newTaskSource, detailSource] = await Promise.all([
    readFile(join(process.cwd(), "demo", "agent-tasks", "app", "tasks.md"), "utf8"),
    readFile(join(process.cwd(), "demo", "agent-tasks", "app", "new-task.md"), "utf8"),
    readFile(join(process.cwd(), "demo", "agent-tasks", "app", "task-detail.md"), "utf8")
  ]);

  return { overviewSource, newTaskSource, detailSource };
}

function cookieValueFromSetCookie(setCookie: string | undefined): string {
  if (!setCookie) {
    throw new Error("Expected Set-Cookie header.");
  }
  return (setCookie.split(";", 1)[0] ?? "").replace(/^mdsn_session=/, "");
}

async function registerAgent(
  server: ReturnType<typeof createAgentTasksServer>,
  nickname: string,
  password: string
): Promise<{ cookie: string; body: string }> {
  const response = await server.handle({
    method: "POST",
    url: "https://example.test/register",
    headers: {
      accept: "text/markdown",
      "content-type": "text/markdown"
    },
    body: `nickname: "${nickname}", password: "${password}"`,
    cookies: {}
  });

  return {
    cookie: cookieValueFromSetCookie(response.headers["set-cookie"]),
    body: response.body as string
  };
}

describe("agent task handoff demo", () => {
  it("requires authentication before opening task pages", async () => {
    const sources = await readSources();
    const server = createAgentTasksServer(sources);

    const overview = await server.handle({
      method: "GET",
      url: "https://example.test/tasks",
      headers: { accept: "text/markdown" },
      cookies: {}
    });

    expect(overview.status).toBe(401);
    expect(overview.body).toContain("Sign in to open your task queue");
    expect(overview.body).toContain('GET "/login" -> recover');
  });

  it("creates, accepts, submits, revises, and completes tasks using the logged-in session identity", async () => {
    const sources = await readSources();
    const server = createAgentTasksServer(sources);

    const registerA = await server.handle({
      method: "POST",
      url: "https://example.test/register",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'nickname: "agent-a", password: "pass-a"',
      cookies: {}
    });

    const agentACookie = registerA.headers["set-cookie"]?.split(";", 1)[0] ?? "";
    expect(registerA.body).toContain("# Tasks");

    const registerB = await server.handle({
      method: "POST",
      url: "https://example.test/register",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'nickname: "agent-b", password: "pass-b"',
      cookies: {}
    });

    const agentBCookie = registerB.headers["set-cookie"]?.split(";", 1)[0] ?? "";
    expect(registerB.body).toContain("# Tasks");

    const created = await server.handle({
      method: "POST",
      url: "https://example.test/tasks",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: [
        'title: "Implement session_sort"',
        'summary: "Write a Rust sorting function."',
        'instruction: "Write a Rust function named session_sort."',
        'constraints: "- Handle empty input"',
        'acceptance_criteria: "- Return ascending order"'
      ].join(", "),
      cookies: {
        mdsn_session: agentACookie.replace(/^mdsn_session=/, "")
      }
    });

    expect(created.body).toContain("Implement session_sort");
    expect(created.body).toContain('/accept" () -> accept');
    expect(created.body).not.toContain("actor_id");

    const taskIdMatch = created.body.match(/POST "\/tasks\/([^/]+)\/accept"/);
    expect(taskIdMatch?.[1]).toBeTruthy();
    const taskId = taskIdMatch?.[1] ?? "";

    const accepted = await server.handle({
      method: "POST",
      url: `https://example.test/tasks/${taskId}/accept`,
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: "",
      cookies: {
        mdsn_session: agentBCookie.replace(/^mdsn_session=/, "")
      }
    });

    expect(accepted.body).toContain("Complete the task and submit a result.");
    expect(accepted.body).not.toContain("actor_id");

    const submitted = await server.handle({
      method: "POST",
      url: `https://example.test/tasks/${taskId}/submit`,
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'result: "fn session_sort(nums: Vec<i32>) -> Vec<i32> { nums }"',
      cookies: {
        mdsn_session: agentBCookie.replace(/^mdsn_session=/, "")
      }
    });

    expect(submitted.body).toContain("Review the submission and either complete the task or request revision.");
    expect(submitted.body).not.toContain("actor_id");

    const revision = await server.handle({
      method: "POST",
      url: `https://example.test/tasks/${taskId}/request-revision`,
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'note: "Please sort the values before returning."',
      cookies: {
        mdsn_session: agentACookie.replace(/^mdsn_session=/, "")
      }
    });

    expect(revision.body).toContain("Status: needs_revision");

    const resubmitted = await server.handle({
      method: "POST",
      url: `https://example.test/tasks/${taskId}/submit`,
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'result: "fn session_sort(nums: Vec<i32>) -> Vec<i32> { let mut nums = nums; nums.sort(); nums }"',
      cookies: {
        mdsn_session: agentBCookie.replace(/^mdsn_session=/, "")
      }
    });

    expect(resubmitted.body).toContain("let mut nums = nums;");

    const completed = await server.handle({
      method: "POST",
      url: `https://example.test/tasks/${taskId}/complete`,
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: "",
      cookies: {
        mdsn_session: agentACookie.replace(/^mdsn_session=/, "")
      }
    });

    expect(completed.body).toContain("This task is complete.");
  });

  it("returns a recoverable fragment when a non-reviewer tries to complete a task", async () => {
    const sources = await readSources();
    const server = createAgentTasksServer(sources);
    const { cookie: agentACookie } = await registerAgent(server, "agent-a", "pass-a");
    const { cookie: agentBCookie } = await registerAgent(server, "agent-b", "pass-b");

    const created = await server.handle({
      method: "POST",
      url: "https://example.test/tasks",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: [
        'title: "Implement reviewer_check"',
        'summary: "Write a Rust helper."',
        'instruction: "Write a Rust function named reviewer_check."',
        'constraints: "- Handle empty input"',
        'acceptance_criteria: "- Return ascending order"'
      ].join(", "),
      cookies: {
        mdsn_session: agentACookie
      }
    });

    const taskIdMatch = created.body.match(/POST "\/tasks\/([^/]+)\/accept"/);
    expect(taskIdMatch?.[1]).toBeTruthy();
    const taskId = taskIdMatch?.[1] ?? "";

    await server.handle({
      method: "POST",
      url: `https://example.test/tasks/${taskId}/accept`,
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: "",
      cookies: {
        mdsn_session: agentBCookie
      }
    });

    await server.handle({
      method: "POST",
      url: `https://example.test/tasks/${taskId}/submit`,
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'result: "pub fn reviewer_check(nums: Vec<i32>) -> Vec<i32> { nums }"',
      cookies: {
        mdsn_session: agentBCookie
      }
    });

    const forbidden = await server.handle({
      method: "POST",
      url: `https://example.test/tasks/${taskId}/complete`,
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: "",
      cookies: {
        mdsn_session: agentBCookie
      }
    });

    expect(forbidden.status).toBe(403);
    expect(forbidden.body).toContain("Only the reviewer can complete this task");
    expect(forbidden.body).toContain(`GET "/tasks/${taskId}" -> recover`);
  });

  it("renders the overview page as a task work queue", async () => {
    const sources = await readSources();
    const server = createAgentTasksServer(sources);
    const { cookie } = await registerAgent(server, "agent-a", "pass-a");

    await server.handle({
      method: "POST",
      url: "https://example.test/tasks",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: [
        'title: "Implement binary_search"',
        'summary: "Write a Rust binary search function."',
        'instruction: "Write a Rust function named binary_search."',
        'constraints: "- Return -1 when the value is missing"',
        'acceptance_criteria: "- Match the required function signature"',
        'creator_id: "agent-a"',
        'reviewer_id: "agent-a"'
      ].join(", "),
      cookies: {
        mdsn_session: cookie
      }
    });

    const overview = await server.handle({
      method: "GET",
      url: "https://example.test/tasks",
      headers: { accept: "text/markdown" },
      cookies: {
        mdsn_session: cookie
      }
    });

    expect(overview.body).toContain("# Tasks");
    expect(overview.body).toContain("## Waiting for you");
    expect(overview.body).toContain("## In progress");
    expect(overview.body).toContain("## Available");
    expect(overview.body).toContain("Implement binary_search");
    expect(overview.body).toContain('GET "/tasks/task-1" -> open');
  });

  it("shows agent-specific buckets on the overview page", async () => {
    const sources = await readSources();
    const server = createAgentTasksServer(sources);
    const { cookie: agentACookie } = await registerAgent(server, "agent-a", "pass-a");
    const { cookie: agentBCookie } = await registerAgent(server, "agent-b", "pass-b");

    await server.handle({
      method: "POST",
      url: "https://example.test/tasks",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: [
        'title: "Implement merge_sort"',
        'summary: "Write a Rust merge sort function."',
        'instruction: "Write a Rust function named merge_sort."',
        'constraints: "- Handle empty input"',
        'acceptance_criteria: "- Return ascending order"',
        'creator_id: "agent-a"',
        'reviewer_id: "agent-a"'
      ].join(", "),
      cookies: {
        mdsn_session: agentACookie
      }
    });

    await server.handle({
      method: "POST",
      url: "https://example.test/tasks/task-1/accept",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'actor_id: "agent-b"',
      cookies: {
        mdsn_session: agentBCookie
      }
    });

    const agentBOverview = await server.handle({
      method: "GET",
      url: "https://example.test/tasks?agent_id=agent-b",
      headers: { accept: "text/markdown" },
      cookies: {
        mdsn_session: agentBCookie
      }
    });

    expect(agentBOverview.body).toContain("## In progress");
    expect(agentBOverview.body).toContain("Implement merge_sort");
    expect(agentBOverview.body).toContain("Next step: submit result");
    expect(agentBOverview.body).not.toContain("No tasks in in progress.");
  });

  it("renders the task detail page with stable task context and a runtime block", async () => {
    const sources = await readSources();
    const server = createAgentTasksServer(sources);
    const { cookie } = await registerAgent(server, "agent-a", "pass-a");

    await server.handle({
      method: "POST",
      url: "https://example.test/tasks",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: [
        'title: "Implement palindrome"',
        'summary: "Write a palindrome checker."',
        'instruction: "Write a Rust function named is_palindrome."',
        'constraints: "- Ignore empty input"',
        'acceptance_criteria: "- Return true for mirrored strings"',
        'creator_id: "agent-a"',
        'reviewer_id: "agent-a"'
      ].join(", "),
      cookies: {
        mdsn_session: cookie
      }
    });

    const detail = await server.handle({
      method: "GET",
      url: "https://example.test/tasks/task-1",
      headers: { accept: "text/markdown" },
      cookies: {
        mdsn_session: cookie
      }
    });

    expect(detail.body).toContain("# Implement palindrome");
    expect(detail.body).toContain("## Instruction");
    expect(detail.body).toContain("Write a Rust function named is_palindrome.");
    expect(detail.body).toContain("## Acceptance Criteria");
    expect(detail.body).toContain("Review the task and accept it if you will complete it.");
    expect(detail.body).toContain('POST "/tasks/task-1/accept" () -> accept');
  });

  it("shows a starter template on the task creation page", async () => {
    const sources = await readSources();
    const server = createAgentTasksServer(sources);
    const { cookie } = await registerAgent(server, "agent-a", "pass-a");

    const newTaskPage = await server.handle({
      method: "GET",
      url: "https://example.test/tasks/new",
      headers: { accept: "text/markdown" },
      cookies: {
        mdsn_session: cookie
      }
    });

    expect(newTaskPage.body).toContain("Suggested starter task");
    expect(newTaskPage.body).toContain("Implement sort_numbers");
    expect(newTaskPage.body).toContain("current signed-in agent");
  });

  it("supports the core create -> accept -> submit -> complete flow", async () => {
    const sources = await readSources();
    const server = createAgentTasksServer(sources);
    const { cookie: agentACookie } = await registerAgent(server, "agent-a", "pass-a");
    const { cookie: agentBCookie } = await registerAgent(server, "agent-b", "pass-b");

    const newTaskPage = await server.handle({
      method: "GET",
      url: "https://example.test/tasks/new",
      headers: { accept: "text/markdown" },
      cookies: {
        mdsn_session: agentACookie
      }
    });

    expect(newTaskPage.body).toContain("# New Task");
    expect(newTaskPage.body).toContain('POST "/tasks" (title, summary, instruction, constraints, acceptance_criteria) -> create_task');

    const created = await server.handle({
      method: "POST",
      url: "https://example.test/tasks",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: [
        'title: "Implement sort_numbers"',
        'summary: "Write a Rust sorting function."',
        'instruction: "Write a Rust function named sort_numbers."',
        'constraints: "- Handle empty input\\n- Preserve duplicates"',
        'acceptance_criteria: "- Return ascending order\\n- Match the required function signature"'
      ].join(", "),
      cookies: {
        mdsn_session: agentACookie
      }
    });

    expect(created.body).toContain("Implement sort_numbers");
    expect(created.body).toContain('POST "/tasks/');
    expect(created.body).toContain('/accept" () -> accept');

    const taskIdMatch = created.body.match(/POST "\/tasks\/([^/]+)\/accept"/);
    expect(taskIdMatch?.[1]).toBeTruthy();
    const taskId = taskIdMatch?.[1] ?? "";

    const accepted = await server.handle({
      method: "POST",
      url: `https://example.test/tasks/${taskId}/accept`,
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: "",
      cookies: {
        mdsn_session: agentBCookie
      }
    });

    expect(accepted.body).toContain("Complete the task and submit a result.");
    expect(accepted.body).toContain('POST "/tasks/');
    expect(accepted.body).toContain('/submit" (result) -> submit');

    const submitted = await server.handle({
      method: "POST",
      url: `https://example.test/tasks/${taskId}/submit`,
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'result: "fn sort_numbers(nums: Vec<i32>) -> Vec<i32> { nums }"',
      cookies: {
        mdsn_session: agentBCookie
      }
    });

    expect(submitted.body).toContain("Review the submission and either complete the task or request revision.");
    expect(submitted.body).toContain("sort_numbers");
    expect(submitted.body).toContain('/complete" () -> complete');

    const completed = await server.handle({
      method: "POST",
      url: `https://example.test/tasks/${taskId}/complete`,
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: "",
      cookies: {
        mdsn_session: agentACookie
      }
    });

    expect(completed.body).toContain("This task is complete.");
    expect(completed.body).toContain("sort_numbers");
  });

  it("supports the revision loop before completion", async () => {
    const sources = await readSources();
    const server = createAgentTasksServer(sources);
    const { cookie: agentACookie } = await registerAgent(server, "agent-a", "pass-a");
    const { cookie: agentBCookie } = await registerAgent(server, "agent-b", "pass-b");

    const created = await server.handle({
      method: "POST",
      url: "https://example.test/tasks",
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: [
        'title: "Implement dedupe"',
        'summary: "Write a Rust dedupe function."',
        'instruction: "Write a Rust function named dedupe."',
        'constraints: "- Preserve original order"',
        'acceptance_criteria: "- Remove duplicates"'
      ].join(", "),
      cookies: {
        mdsn_session: agentACookie
      }
    });

    const taskIdMatch = created.body.match(/POST "\/tasks\/([^/]+)\/accept"/);
    expect(taskIdMatch?.[1]).toBeTruthy();
    const taskId = taskIdMatch?.[1] ?? "";

    await server.handle({
      method: "POST",
      url: `https://example.test/tasks/${taskId}/accept`,
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: "",
      cookies: {
        mdsn_session: agentBCookie
      }
    });

    await server.handle({
      method: "POST",
      url: `https://example.test/tasks/${taskId}/submit`,
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'result: "fn dedupe(nums: Vec<i32>) -> Vec<i32> { nums }"',
      cookies: {
        mdsn_session: agentBCookie
      }
    });

    const revision = await server.handle({
      method: "POST",
      url: `https://example.test/tasks/${taskId}/request-revision`,
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'note: "Please actually remove duplicates."',
      cookies: {
        mdsn_session: agentACookie
      }
    });

    expect(revision.body).toContain("Status: needs_revision");
    expect(revision.body).toContain("Please actually remove duplicates.");
    expect(revision.body).toContain('/submit" (result) -> submit');

    const resubmitted = await server.handle({
      method: "POST",
      url: `https://example.test/tasks/${taskId}/submit`,
      headers: {
        accept: "text/markdown",
        "content-type": "text/markdown"
      },
      body: 'result: "fn dedupe(nums: Vec<i32>) -> Vec<i32> { let mut out = Vec::new(); for value in nums { if !out.contains(&value) { out.push(value); } } out }"',
      cookies: {
        mdsn_session: agentBCookie
      }
    });

    expect(resubmitted.body).toContain("Status: submitted");
    expect(resubmitted.body).toContain("let mut out = Vec::new()");
  });

  it("preserves the current agent identity in overview refresh actions", async () => {
    const sources = await readSources();
    const server = createAgentTasksServer(sources);
    const { cookie } = await registerAgent(server, "agent-b", "pass-b");

    const overview = await server.handle({
      method: "GET",
      url: "https://example.test/tasks?agent_id=agent-b",
      headers: { accept: "text/markdown" },
      cookies: {
        mdsn_session: cookie
      }
    });

    expect(overview.body).toContain('GET "/tasks/waiting?agent_id=agent-b" -> refresh_waiting');
    expect(overview.body).toContain('GET "/tasks/in-progress?agent_id=agent-b" -> refresh_in_progress');
    expect(overview.body).toContain('GET "/tasks/available?agent_id=agent-b" -> refresh_available');
  });
});
