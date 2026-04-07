import { randomUUID } from "node:crypto";

import { composePageV2, markFragmentV2, type MdanBlock, type MdanFragment, type MdanInput } from "@mdanai/sdk/core";
import { createMdanServer, fail, signIn, signOut, type MdanResponse, type MdanSessionProvider, type MdanSessionSnapshot } from "@mdanai/sdk/server";

import { createTaskStore } from "./task-store.js";
import type { TaskRecord } from "./task-types.js";

export interface CreateAgentTasksServerOptions {
  overviewSource: string;
  newTaskSource: string;
  detailSource: string;
}

interface UserRecord {
  password: string;
}

type AgentSession = { sessionId: string; userId: string };

const loginSource = `# Sign In

Sign in to open your task queue.

<!-- mdan:block login -->

\`\`\`mdan
BLOCK login {
  INPUT nickname:text required
  INPUT password:text required secret
  POST login "/login" WITH nickname, password LABEL "Sign In"
  GET register "/register" LABEL "Create account"
}
\`\`\`
`;

const registerSource = `# Register

Create an agent identity for this demo.

<!-- mdan:block register -->

\`\`\`mdan
BLOCK register {
  INPUT nickname:text required
  INPUT password:text required secret
  POST register "/register" WITH nickname, password LABEL "Create account"
  GET login "/login" LABEL "Back to sign in"
}
\`\`\`
`;

function createMemorySessionProvider(users: Map<string, UserRecord>): MdanSessionProvider {
  const sessions = new Map<string, AgentSession>();

  return {
    async read(request) {
      const rawSessionId = request.cookies.mdan_session;
      const sessionId = rawSessionId ? decodeURIComponent(rawSessionId) : undefined;
      if (!sessionId) {
        return null;
      }

      const session = sessions.get(sessionId);
      if (!session || !users.has(session.userId)) {
        if (sessionId) {
          sessions.delete(sessionId);
        }
        return null;
      }

      return session;
    },
    async commit(mutation, response: MdanResponse) {
      if (mutation?.type === "sign-in" || mutation?.type === "refresh") {
        const next = mutation.session as Partial<AgentSession> & { userId: string };
        const session: AgentSession = {
          sessionId: typeof next.sessionId === "string" && next.sessionId.trim() ? next.sessionId : randomUUID(),
          userId: next.userId
        };
        sessions.set(session.sessionId, session);
        response.headers["set-cookie"] = `mdan_session=${encodeURIComponent(session.sessionId)}; Path=/; HttpOnly`;
      }
    },
    async clear(session, response) {
      const sessionId = session && typeof session.sessionId === "string" ? session.sessionId : null;
      if (sessionId) {
        sessions.delete(sessionId);
      }
      response.headers["set-cookie"] = "mdan_session=; Path=/; Max-Age=0";
    }
  };
}

function getSessionUserId(session: MdanSessionSnapshot | null): string | null {
  const userId = session && typeof session.userId === "string" ? session.userId : null;
  return userId && userId.trim() ? userId : null;
}

function parseLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);
}

function markdownList(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None";
}

function replaceTemplate(source: string, task: TaskRecord): string {
  return source
    .replaceAll("{{id}}", task.id)
    .replaceAll("{{title}}", task.title)
    .replaceAll("{{instruction}}", task.instruction)
    .replaceAll("{{constraints}}", markdownList(task.constraints))
    .replaceAll("{{acceptance_criteria}}", markdownList(task.acceptanceCriteria));
}

function renderRuntimeMarkdown(task: TaskRecord): string {
  switch (task.status) {
    case "open":
      return "Status: open\n\nReview the task and accept it if you will complete it.";
    case "claimed":
      return "Status: claimed\n\nComplete the task and submit a result.";
    case "submitted":
      return [
        "Status: submitted",
        "Review the submission and either complete the task or request revision.",
        "## Latest submission",
        task.latestSubmission?.result ?? "_No submission yet._"
      ].join("\n\n");
    case "needs_revision":
      return [
        "Status: needs_revision",
        "Revise the result based on the review note and resubmit.",
        "## Latest review note",
        task.latestReviewNote?.note ?? "_No review note yet._",
        "## Current submission",
        task.latestSubmission?.result ?? "_No submission yet._"
      ].join("\n\n");
    case "completed":
      return [
        "Status: completed",
        "This task is complete.",
        "## Final submission",
        task.latestSubmission?.result ?? "_No submission yet._"
      ].join("\n\n");
  }
}

function input(name: string, required = false, secret = false): MdanInput {
  return {
    name,
    type: "text",
    required,
    secret
  };
}

function renderRuntimeBlock(task: TaskRecord): MdanFragment {
  if (task.status === "claimed") {
    return markFragmentV2({
      markdown: renderRuntimeMarkdown(task),
      blocks: [
        {
          name: "runtime",
          inputs: [input("result", true)],
          operations: [
            {
              method: "POST",
              target: `/tasks/${task.id}/submit`,
              name: "submit",
              inputs: ["result"],
              label: "Submit result"
            }
          ]
        }
      ]
    });
  }

  if (task.status === "submitted") {
    return markFragmentV2({
      markdown: renderRuntimeMarkdown(task),
      blocks: [
        {
          name: "runtime",
          inputs: [input("note")],
          operations: [
            {
              method: "POST",
              target: `/tasks/${task.id}/request-revision`,
              name: "request_revision",
              inputs: ["note"],
              label: "Request revision"
            },
            {
              method: "POST",
              target: `/tasks/${task.id}/complete`,
              name: "complete",
              inputs: [],
              label: "Complete task"
            }
          ]
        }
      ]
    });
  }

  if (task.status === "needs_revision") {
    return markFragmentV2({
      markdown: renderRuntimeMarkdown(task),
      blocks: [
        {
          name: "runtime",
          inputs: [input("result", true)],
          operations: [
            {
              method: "POST",
              target: `/tasks/${task.id}/submit`,
              name: "submit",
              inputs: ["result"],
              label: "Resubmit result"
            }
          ]
        }
      ]
    });
  }

  if (task.status === "completed") {
    return markFragmentV2({
      markdown: renderRuntimeMarkdown(task),
      blocks: [
        {
          name: "runtime",
          inputs: [],
          operations: []
        }
      ]
    });
  }

  return markFragmentV2({
    markdown: renderRuntimeMarkdown(task),
    blocks: [
      {
        name: "runtime",
        inputs: [],
        operations: [
          {
            method: "POST",
            target: `/tasks/${task.id}/accept`,
            name: "accept",
            inputs: [],
            label: "Accept task"
          }
        ]
      }
    ]
  });
}

function renderOverviewSection(title: string, tasks: TaskRecord[]): string {
  if (tasks.length === 0) {
    return `No tasks in ${title.toLowerCase()}.`;
  }

  return tasks
    .map(
      (task) => `### ${task.title}

${task.summary}

Status: ${task.status}

Next step: ${task.status === "open" ? "accept task" : task.status === "submitted" ? "review submission" : task.status === "needs_revision" ? "revise and resubmit" : task.status === "claimed" ? "submit result" : "no action"}

\`\`\`mdan
BLOCK ${task.id.replace(/[^a-z0-9_]/gi, "_")} {
  GET open "/tasks/${task.id}" LABEL "Open task"
}
\`\`\``
    )
    .join("\n\n");
}

function renderCreateTaskBlockContent(): string {
  return [
    "Fill out the task definition and create a handoff page.",
    "## Suggested starter task",
    "- title: Implement sort_numbers",
    "- summary: Write a Rust sorting function.",
    "- instruction: Write a Rust function named sort_numbers that returns ascending order.",
    "- constraints: one bullet per line",
    "- acceptance criteria: one bullet per line",
    "- creator: current signed-in agent",
    "- reviewer: current signed-in agent"
  ].join("\n\n");
}

function renderAuthPage(source: string, blockName: "login" | "register", blockMarkdown: string) {
  return composePageV2(source, {
    blocks: {
      [blockName]: blockMarkdown
    },
    visibleBlocks: [blockName]
  });
}

function authRecovery(message: string) {
  return fail({
    status: 401,
    fragment: markFragmentV2({
      markdown: `## ${message}\n\nOpen \`/login\` to continue.`,
      blocks: [
        {
          name: "recover",
          inputs: [],
          operations: [
            {
              method: "GET",
              target: "/login",
              name: "recover",
              inputs: [],
              label: "Open Sign In"
            }
          ]
        }
      ]
    })
  });
}

function taskRecovery(taskId: string, status: number, title: string, detail: string): MdanFragment {
  return markFragmentV2({
    markdown: `## ${title}\n\n${detail}`,
    blocks: [
      {
        name: "recover",
        inputs: [],
        operations: [
          {
            method: "GET",
            target: `/tasks/${taskId}`,
            name: "recover",
            inputs: [],
            label: "Open task"
          }
        ]
      }
    ]
  });
}

function recoverTaskError(taskId: string, error: unknown): { status: number; fragment: MdanFragment } {
  const message = error instanceof Error ? error.message : "Unknown task error.";
  if (message.includes("is not the reviewer")) {
    return {
      status: 403,
      fragment: taskRecovery(taskId, 403, "Only the reviewer can complete this task", "Return to the task page and wait for the assigned reviewer to continue.")
    };
  }
  if (message.includes("is not the assignee")) {
    return {
      status: 403,
      fragment: taskRecovery(taskId, 403, "Only the assignee can submit this task", "Return to the task page and wait for the assigned worker to continue.")
    };
  }
  if (message.includes("cannot be submitted") || message.includes("is not awaiting review") || message.includes("is not open")) {
    return {
      status: 409,
      fragment: taskRecovery(taskId, 409, "This action is no longer available", "Refresh the task page to see the current state before continuing.")
    };
  }
  if (message.includes("Unknown task")) {
    return {
      status: 404,
      fragment: taskRecovery(taskId, 404, "Task not found", "Open the task list and choose another task.")
    };
  }
  return {
    status: 500,
    fragment: taskRecovery(taskId, 500, "Internal Server Error", "Retry the task page or refresh before continuing.")
  };
}

export function createAgentTasksServer(options: CreateAgentTasksServerOptions) {
  const users = new Map<string, UserRecord>();
  const store = createTaskStore();
  const sessionProvider = createMemorySessionProvider(users);
  const server = createMdanServer({ session: sessionProvider });

  function currentAgent(session: MdanSessionSnapshot | null): string | null {
    return getSessionUserId(session);
  }

  function renderTaskPage(task: TaskRecord) {
    const runtimeFragment = renderRuntimeBlock(task);
    const runtimeBlock = runtimeFragment.blocks[0];
    const page = composePageV2(replaceTemplate(options.detailSource, task), {
      blocks: {
        runtime: runtimeFragment.markdown
      },
      visibleBlocks: ["runtime"]
    });
    page.blocks = page.blocks.map((block): MdanBlock => (block.name === "runtime" && runtimeBlock ? runtimeBlock : block));
    return page;
  }

  function renderOverviewPage(agentId: string) {
    const buckets = store.listForAgent(agentId);
    const page = composePageV2(options.overviewSource, {
      blocks: {
        waiting_for_you: renderOverviewSection("Waiting for you", buckets.waitingForYou),
        in_progress: renderOverviewSection("In progress", buckets.inProgress),
        available: renderOverviewSection("Available", buckets.available)
      },
      visibleBlocks: ["waiting_for_you", "in_progress", "available"]
    });
    page.blocks = page.blocks.map((block) => {
      if (block.name === "waiting_for_you") {
        return {
          ...block,
          operations: block.operations.map((operation) => ({ ...operation, target: `/tasks/waiting?agent_id=${encodeURIComponent(agentId)}` }))
        };
      }
      if (block.name === "in_progress") {
        return {
          ...block,
          operations: block.operations.map((operation) => ({ ...operation, target: `/tasks/in-progress?agent_id=${encodeURIComponent(agentId)}` }))
        };
      }
      if (block.name === "available") {
        return {
          ...block,
          operations: block.operations.map((operation) => ({ ...operation, target: `/tasks/available?agent_id=${encodeURIComponent(agentId)}` }))
        };
      }
      return block;
    });
    return page;
  }

  function requireAgent(session: MdanSessionSnapshot | null, message: string): string | MdanFragment {
    const agentId = currentAgent(session);
    if (!agentId) {
      return authRecovery(message).fragment as MdanFragment;
    }
    return agentId;
  }

  function registerTaskRoutes(taskId: string) {
    const detailPath = `/tasks/${taskId}`;
    const runtimePath = `/tasks/${taskId}/runtime`;
    const acceptPath = `/tasks/${taskId}/accept`;
    const submitPath = `/tasks/${taskId}/submit`;
    const revisionPath = `/tasks/${taskId}/request-revision`;
    const completePath = `/tasks/${taskId}/complete`;

    server.get(detailPath, ({ session }) => {
      const agentId = requireAgent(session, "Sign in to open this task");
      if (typeof agentId !== "string") {
        return { fragment: agentId, route: detailPath, status: 401 };
      }
      return {
        page: renderTaskPage(store.get(taskId)),
        route: detailPath
      };
    });
    server.get(runtimePath, ({ session }) => {
      const agentId = requireAgent(session, "Sign in to continue this task");
      if (typeof agentId !== "string") {
        return { fragment: agentId, route: detailPath, status: 401 };
      }
      return { fragment: renderRuntimeBlock(store.get(taskId)), route: detailPath };
    });
    server.post(acceptPath, ({ session }) => {
      const agentId = requireAgent(session, "Sign in to accept this task");
      if (typeof agentId !== "string") {
        return { fragment: agentId, route: detailPath, status: 401 };
      }
      try {
        return { fragment: renderRuntimeBlock(store.accept(taskId, agentId)), route: detailPath };
      } catch (error) {
        const recovered = recoverTaskError(taskId, error);
        return { ...recovered, route: detailPath };
      }
    });
    server.post(submitPath, ({ session, inputs }) => {
      const agentId = requireAgent(session, "Sign in to submit this task");
      if (typeof agentId !== "string") {
        return { fragment: agentId, route: detailPath, status: 401 };
      }
      try {
        return { fragment: renderRuntimeBlock(store.submit(taskId, agentId, String(inputs.result ?? ""))), route: detailPath };
      } catch (error) {
        const recovered = recoverTaskError(taskId, error);
        return { ...recovered, route: detailPath };
      }
    });
    server.post(revisionPath, ({ session, inputs }) => {
      const agentId = requireAgent(session, "Sign in to review this task");
      if (typeof agentId !== "string") {
        return { fragment: agentId, route: detailPath, status: 401 };
      }
      try {
        return {
          fragment: renderRuntimeBlock(store.requestRevision(taskId, agentId, String(inputs.note ?? ""))),
          route: detailPath
        };
      } catch (error) {
        const recovered = recoverTaskError(taskId, error);
        return { ...recovered, route: detailPath };
      }
    });
    server.post(completePath, ({ session }) => {
      const agentId = requireAgent(session, "Sign in to complete this task");
      if (typeof agentId !== "string") {
        return { fragment: agentId, route: detailPath, status: 401 };
      }
      try {
        return { fragment: renderRuntimeBlock(store.complete(taskId, agentId)), route: detailPath };
      } catch (error) {
        const recovered = recoverTaskError(taskId, error);
        return { ...recovered, route: detailPath };
      }
    });
  }

  server.get("/login", ({ session }) => {
    const userId = currentAgent(session);
    if (userId) {
      return {
        page: renderOverviewPage(userId),
        route: "/tasks"
      };
    }
    return {
      page: renderAuthPage(loginSource, "login", "Sign in to open your task queue."),
      route: "/login"
    };
  });

  server.get("/register", ({ session }) => {
    const userId = currentAgent(session);
    if (userId) {
      return {
        page: renderOverviewPage(userId),
        route: "/tasks"
      };
    }
    return {
      page: renderAuthPage(registerSource, "register", "Create an agent identity for this demo."),
      route: "/register"
    };
  });

  server.post("/register", ({ inputs }) => {
    const nickname = String(inputs.nickname ?? "").trim();
    const password = String(inputs.password ?? "");
    if (!nickname || !password) {
      return {
        page: renderAuthPage(registerSource, "register", "Nickname and password are required."),
        route: "/register",
        status: 400
      };
    }
    if (users.has(nickname)) {
      return {
        page: renderAuthPage(registerSource, "register", `${nickname} already exists.`),
        route: "/register",
        status: 409
      };
    }
    users.set(nickname, { password });
    return {
      session: signIn({ userId: nickname }),
      page: renderOverviewPage(nickname),
      route: "/tasks"
    };
  });

  server.post("/login", ({ inputs }) => {
    const nickname = String(inputs.nickname ?? "").trim();
    const password = String(inputs.password ?? "");
    const user = users.get(nickname);
    if (!user || user.password !== password) {
      return {
        page: renderAuthPage(loginSource, "login", "Invalid credentials."),
        route: "/login",
        status: 401
      };
    }
    return {
      session: signIn({ userId: nickname }),
      page: renderOverviewPage(nickname),
      route: "/tasks"
    };
  });

  server.post("/logout", ({ session }) => {
    const userId = currentAgent(session);
    return {
      session: signOut(),
      page: renderAuthPage(loginSource, "login", userId ? `Signed out from ${userId}.` : "Signed out."),
      route: "/login"
    };
  });

  server.get("/tasks", ({ session }) => {
    const agentId = requireAgent(session, "Sign in to open your task queue");
    if (typeof agentId !== "string") {
      return { fragment: agentId, route: "/tasks", status: 401 };
    }
    return { page: renderOverviewPage(agentId), route: "/tasks" };
  });

  server.get("/tasks/new", ({ session }) => {
    const agentId = requireAgent(session, "Sign in to create tasks");
    if (typeof agentId !== "string") {
      return { fragment: agentId, route: "/tasks/new", status: 401 };
    }
    return {
      page: composePageV2(options.newTaskSource, {
        blocks: { create_task: renderCreateTaskBlockContent() },
        visibleBlocks: ["create_task"]
      }),
      route: "/tasks/new"
    };
  });

  server.get("/tasks/waiting", ({ session }) => {
    const agentId = requireAgent(session, "Sign in to open your task queue");
    if (typeof agentId !== "string") {
      return { fragment: agentId, route: "/tasks", status: 401 };
    }
    return { fragment: renderOverviewPage(agentId).fragment("waiting_for_you"), route: "/tasks" };
  });

  server.get("/tasks/in-progress", ({ session }) => {
    const agentId = requireAgent(session, "Sign in to open your task queue");
    if (typeof agentId !== "string") {
      return { fragment: agentId, route: "/tasks", status: 401 };
    }
    return { fragment: renderOverviewPage(agentId).fragment("in_progress"), route: "/tasks" };
  });

  server.get("/tasks/available", ({ session }) => {
    const agentId = requireAgent(session, "Sign in to open your task queue");
    if (typeof agentId !== "string") {
      return { fragment: agentId, route: "/tasks", status: 401 };
    }
    return { fragment: renderOverviewPage(agentId).fragment("available"), route: "/tasks" };
  });

  server.post("/tasks", ({ session, inputs }) => {
    const agentId = requireAgent(session, "Sign in to create tasks");
    if (typeof agentId !== "string") {
      return { fragment: agentId, route: "/tasks/new", status: 401 };
    }
    const task = store.create({
      title: String(inputs.title ?? "").trim(),
      summary: String(inputs.summary ?? "").trim(),
      instruction: String(inputs.instruction ?? "").trim(),
      constraints: parseLines(String(inputs.constraints ?? "")),
      acceptanceCriteria: parseLines(String(inputs.acceptance_criteria ?? "")),
      createdBy: agentId,
      reviewerId: agentId
    });
    registerTaskRoutes(task.id);
    return {
      page: renderTaskPage(task),
      route: `/tasks/${task.id}`
    };
  });

  return server;
}
