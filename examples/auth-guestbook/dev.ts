import { createHost } from "@mdanai/sdk/server/bun";
import { createAuthGuestbookServer } from "./app.js";

const port = Number(process.env.PORT ?? "4321");
const server = createAuthGuestbookServer();
const host = createHost(server, {
  rootRedirect: "/login",
  browserShell: {
    title: "MDAN Auth Guestbook",
    moduleMode: "local-dist"
  }
});

Bun.serve({
  port,
  fetch: host
});

console.log(`auth-guestbook-json dev server listening on http://127.0.0.1:${port}`);
