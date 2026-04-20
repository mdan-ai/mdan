import { createHost } from "../../src/server/bun.js";

import { createWeatherMarkdownServer } from "./app.js";

const port = Number(process.env.PORT ?? "4327");
const server = createWeatherMarkdownServer();
const host = createHost(server, {
  browserShell: {
    title: "MDAN Weather Markdown"
  }
});

Bun.serve({
  port,
  fetch: host
});

console.log(`weather-markdown demo listening on http://127.0.0.1:${port}/weather`);
