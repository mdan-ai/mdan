import { createAuthGuestbookServer } from "./app.js";

const port = Number(process.env.PORT ?? "4321");
const app = createAuthGuestbookServer();
const host = app.host("bun", {
  rootRedirect: "/login",
  frontend: true
});

Bun.serve({
  port,
  fetch: host
});

console.log(`auth-guestbook dev server listening on http://127.0.0.1:${port}`);
