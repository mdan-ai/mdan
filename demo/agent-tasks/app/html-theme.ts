function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function detectRoute(html: string): string {
  const routeMatch = html.match(/"route":"([^"]+)"/);
  if (routeMatch?.[1]) {
    return routeMatch[1];
  }

  const markdownLinkMatch = html.match(/<link rel="alternate" type="text\/markdown" href="([^"]+)"/);
  if (markdownLinkMatch?.[1]) {
    return markdownLinkMatch[1];
  }

  return "/";
}

function routeTitle(route: string): string {
  if (route === "/login") {
    return "Agent Sign In";
  }
  if (route === "/register") {
    return "Register Agent";
  }
  if (route === "/tasks") {
    return "Task Queue";
  }
  if (route === "/tasks/new") {
    return "Create Task";
  }
  if (route.startsWith("/tasks/")) {
    return "Task Detail";
  }
  return "Agent Tasks";
}

function routeEyebrow(route: string): string {
  if (route === "/login" || route === "/register") {
    return "session";
  }
  if (route === "/tasks") {
    return "workbench";
  }
  if (route === "/tasks/new") {
    return "handoff";
  }
  if (route.startsWith("/tasks/")) {
    return "runtime";
  }
  return "demo";
}

export function transformAgentTasksHtml(html: string): string {
  const route = detectRoute(html);
  const title = routeTitle(route);
  const eyebrow = routeEyebrow(route);

  const chrome = `
    <div class="agent-demo-chrome" aria-hidden="true">
      <div class="agent-demo-badge">MDSN Agent Tasks</div>
      <div class="agent-demo-meta">
        <span class="agent-demo-eyebrow">${escapeHtml(eyebrow)}</span>
        <span class="agent-demo-route">${escapeHtml(route)}</span>
      </div>
      <div class="agent-demo-title">${escapeHtml(title)}</div>
    </div>`;

  const theme = `
    <style id="agent-tasks-theme">
      :root {
        color-scheme: light;
        --agent-bg: #f3efe7;
        --agent-paper: rgba(255, 251, 244, 0.92);
        --agent-ink: #1b1816;
        --agent-muted: #655f5a;
        --agent-line: rgba(83, 72, 60, 0.16);
        --agent-accent: #b6532f;
        --agent-accent-deep: #7f3419;
        --agent-accent-soft: rgba(182, 83, 47, 0.08);
      }
      body[data-agent-demo] {
        min-height: 100vh;
        padding: 24px 18px 40px;
        background:
          radial-gradient(circle at top left, rgba(182, 83, 47, 0.16), transparent 28%),
          radial-gradient(circle at top right, rgba(34, 88, 78, 0.12), transparent 26%),
          linear-gradient(180deg, #f7f3ec 0%, #eee7dc 100%);
        color: var(--agent-ink);
      }
      body[data-agent-demo] main[data-mdsn-root] {
        max-width: 980px;
        border-radius: 30px;
        border: 1px solid rgba(89, 78, 65, 0.14);
        background: linear-gradient(180deg, rgba(255, 252, 247, 0.96) 0%, rgba(249, 243, 234, 0.94) 100%);
        box-shadow: 0 28px 80px rgba(48, 35, 24, 0.11);
        padding: 24px;
      }
      body[data-agent-demo-route="/login"] main[data-mdsn-root],
      body[data-agent-demo-route="/register"] main[data-mdsn-root] {
        max-width: 640px;
      }
      .agent-demo-chrome {
        display: grid;
        gap: 8px;
        padding: 0 0 20px;
        margin-bottom: 20px;
        border-bottom: 1px solid var(--agent-line);
      }
      .agent-demo-badge {
        display: inline-flex;
        width: fit-content;
        align-items: center;
        border-radius: 999px;
        border: 1px solid rgba(127, 52, 25, 0.15);
        background: rgba(255, 248, 242, 0.92);
        color: var(--agent-accent-deep);
        padding: 7px 11px;
        font-size: 0.78rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-weight: 700;
      }
      .agent-demo-meta {
        display: flex;
        gap: 10px;
        align-items: center;
        color: var(--agent-muted);
        font-size: 0.9rem;
      }
      .agent-demo-eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-size: 0.72rem;
        color: var(--agent-accent-deep);
        font-weight: 700;
      }
      .agent-demo-route {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .agent-demo-title {
        font-size: clamp(1.8rem, 4vw, 3rem);
        line-height: 0.95;
        letter-spacing: -0.04em;
        font-weight: 700;
      }
      body[data-agent-demo] h1 {
        font-size: clamp(2.3rem, 5vw, 4.3rem);
        margin-bottom: 12px;
      }
      body[data-agent-demo] h2 {
        margin-top: 30px;
        margin-bottom: 14px;
        color: var(--agent-accent-deep);
      }
      body[data-agent-demo] p {
        max-width: 66ch;
        color: #4f4841;
      }
      body[data-agent-demo] mdsn-block {
        margin-top: 16px;
        padding: 22px;
        border-radius: 24px;
        border: 1px solid rgba(95, 78, 58, 0.14);
        background: linear-gradient(180deg, rgba(255, 253, 249, 0.98) 0%, rgba(249, 244, 236, 0.98) 100%);
        box-shadow: 0 16px 40px rgba(56, 39, 24, 0.06);
      }
      body[data-agent-demo] form {
        gap: 12px;
      }
      body[data-agent-demo] label {
        color: #5b534d;
      }
      body[data-agent-demo] input,
      body[data-agent-demo] select,
      body[data-agent-demo] textarea {
        border-radius: 16px;
        border: 1px solid rgba(97, 83, 67, 0.18);
        background: rgba(255, 252, 247, 0.94);
      }
      body[data-agent-demo] input:focus,
      body[data-agent-demo] select:focus,
      body[data-agent-demo] textarea:focus {
        outline: none;
        border-color: rgba(182, 83, 47, 0.4);
        box-shadow: 0 0 0 4px rgba(182, 83, 47, 0.1);
      }
      body[data-agent-demo] button {
        background: linear-gradient(180deg, #c8643d 0%, #8f3d1f 100%);
        box-shadow: 0 14px 30px rgba(127, 52, 25, 0.2);
      }
      body[data-agent-demo] button[data-mdsn-action-variant="secondary"] {
        color: var(--agent-accent-deep);
        background: rgba(255, 244, 238, 0.96);
        border: 1px solid rgba(127, 52, 25, 0.14);
      }
      body[data-agent-demo] button[data-mdsn-action-variant="quiet"] {
        background: rgba(242, 235, 226, 0.96);
      }
      body[data-agent-demo] ul {
        gap: 10px;
      }
      body[data-agent-demo] li {
        padding: 14px 16px 14px 44px;
        border-radius: 16px;
        background: rgba(255, 250, 243, 0.98);
        border-color: rgba(105, 89, 70, 0.12);
        box-shadow: none;
      }
      body[data-agent-demo] li::before {
        left: 16px;
        top: 16px;
        width: 12px;
        height: 12px;
        background: linear-gradient(180deg, #d47a57 0%, #944121 100%);
        box-shadow: 0 0 0 5px rgba(182, 83, 47, 0.1);
      }
      body[data-agent-demo-route="/tasks"] h2 + mdsn-block p:first-child,
      body[data-agent-demo-route="/tasks"] h2 + mdsn-block h3 {
        margin-top: 0;
      }
    </style>`;

  let next = html.replace("<body>", `<body data-agent-demo data-agent-demo-route="${escapeHtml(route)}">`);
  next = next.replace("</head>", `${theme}\n  </head>`);
  next = next.replace('<main data-mdsn-root>', `<main data-mdsn-root>${chrome}`);
  return next;
}
