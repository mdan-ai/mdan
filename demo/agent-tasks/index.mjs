import http from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createHost } from "@mdanai/sdk/server/node";

import { transformAgentTasksHtml } from "./dist/html-theme.js";
import { listenWithFallback } from "./dist/start-server.js";
import { createAgentTasksServer } from "./dist/server.js";

const port = Number(process.env.PORT || 4324);
const demoRoot = fileURLToPath(new URL("./", import.meta.url));
const tasksSourcePath = join(demoRoot, "app", "tasks.md");
const newTaskSourcePath = join(demoRoot, "app", "new-task.md");
const detailSourcePath = join(demoRoot, "app", "task-detail.md");

const [overviewSource, newTaskSource, detailSource] = await Promise.all([
  readFile(tasksSourcePath, "utf8"),
  readFile(newTaskSourcePath, "utf8"),
  readFile(detailSourcePath, "utf8")
]);

const mdan = createAgentTasksServer({ overviewSource, newTaskSource, detailSource });
const server = http.createServer(
  createHost(mdan, {
    rootRedirect: "/tasks",
    transformHtml: transformAgentTasksHtml
  })
);
const { port: boundPort } = await listenWithFallback(server, "127.0.0.1", port);

console.log(`Agent tasks demo running at http://127.0.0.1:${boundPort}/tasks`);
