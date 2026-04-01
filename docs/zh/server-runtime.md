---
title: 服务端运行时
description: @mdsnai/sdk/server 的职责、入口与常见集成方式。
---

# 服务端运行时

`@mdsnai/sdk/server` 是在服务端组织 MDSN 应用时的主入口。

它按 MDSN 页面里显式写出的 HTTP 路径注册和处理操作。

MDSN 现在官方支持 Node 和 Bun，而且两边用的是同一套服务端模型：

- 共享的应用逻辑放在 `@mdsnai/sdk/server`
- Node host 适配器放在 `@mdsnai/sdk/server/node`
- Bun host 适配器放在 `@mdsnai/sdk/server/bun`

变化的是最外层 host 适配器，不是页面和 action 的应用模型。

## 基本用法

```ts
import { composePage } from "@mdsnai/sdk/core";
import { createHostedApp } from "@mdsnai/sdk/server";

const server = createHostedApp({
  pages: {
    "/guestbook": pageHandler
  },
  actions: [
    {
      target: "/list",
      methods: ["GET"],
      routePath: "/guestbook",
      blockName: "guestbook",
      handler: listHandler
    },
    {
      target: "/post",
      methods: ["POST"],
      routePath: "/guestbook",
      blockName: "guestbook",
      handler: postHandler
    }
  ]
});
```

## Handler 形状

handler 会收到一个 context 对象，包含：

- 当前页面或操作的执行上下文
- 已解析的 inputs
- 框架无关的 request 元数据
- 当前 session 状态

如果你直接使用 `createHostedApp()`，action handler 还会拿到：

- `routePath`
- `blockName`
- `page()`
- `block()`

最常见的 block 操作可以直接写成：

```ts
const page = composePage(source, {
  blocks: {
    guestbook: "## 2 live messages\n\n- Welcome\n- Hello"
  }
});

const server = createHostedApp({
  pages: {
    "/guestbook": () => page
  },
  actions: [
    {
      target: "/list",
      methods: ["GET"],
      routePath: "/guestbook",
      blockName: "guestbook",
      handler: ({ block }) => block()
    }
  ]
});
```

运行时会把这个结果序列化成可直接返回的 Markdown 片段。

`createHostedApp()` 不会通过“先渲染一次页面再反推操作”来猜 action 绑定。`actions` 必须显式声明 `target / methods / routePath / blockName`，这样注册关系才稳定，不会被页面当前显示内容偷偷影响。

当你的应用天然就是“一组页面 + 一组 actions”时，优先用 `createHostedApp()`。只有在你需要完全手动控制时，再退到 `createMdsnServer()`。

## 请求桥接

如果你想完全自己接框架，适配层只需要把中立请求对象交给 `server.handle()`：

```ts
const response = await server.handle({
  method: "POST",
  url: "https://example.com/login",
  headers: {
    accept: "text/markdown",
    "content-type": "text/markdown"
  },
  body: 'nickname: "guest", message: "hello"',
  cookies: {}
});
```

返回对象包含：

- `status`
- `headers`
- `body`

如果你运行在 Node `http` 上，直接用 Node 适配器：

```ts
import { createHost } from "@mdsnai/sdk/server/node";

http.createServer(
  createHost(server, {
    rootRedirect: "/guestbook",
    transformHtml: injectEnhancement,
    staticFiles: {
      "/starter/client.js": join(exampleRoot, "dist", "client.js")
    },
    staticMounts: [{ urlPrefix: "/sdk/", directory: join(repoRoot, "sdk") }]
  })
);
```

如果你运行在 Bun 上，直接用 Bun 适配器：

```ts
import { createHost } from "@mdsnai/sdk/server/bun";

Bun.serve({
  port: 3000,
  fetch: createHost(server, {
    rootRedirect: "/guestbook",
    transformHtml: injectEnhancement
  })
});
```

## 运行时入口

页面和 action 逻辑继续使用共享服务端运行时：

```ts
import { createHostedApp } from "@mdsnai/sdk/server";
```

然后再选择与你部署环境一致的 host 适配器：

```ts
import { createHost } from "@mdsnai/sdk/server/node";
```

```ts
import { createHost } from "@mdsnai/sdk/server/bun";
```

## 内置职责

`@mdsnai/sdk/server` 已经负责：

- 按 target 做路由匹配
- 解析 GET query
- 解析 POST Markdown body
- 对非 Markdown 的直接 POST 写入返回 `415 Unsupported Media Type`
- 对格式错误的 Markdown body 返回可恢复的 `400`
- 通过 `@mdsnai/sdk/server/node` 托管 Node `http`
- 通过 `@mdsnai/sdk/server/bun` 托管 Bun
- 把 cookie 转发进 `request.cookies`
- 注入 session
- 协商 Markdown 与 HTML
- 序列化片段
- 为 stream read 协商 `text/event-stream`
- 提供 `404` 和 `406` 的回退响应

## 自定义 Markdown 渲染器

当浏览器走 HTML 链路时，`@mdsnai/sdk/server` 会负责把 Markdown 渲染成 HTML。这个能力支持注入：

```ts
const server = createHostedApp({
  markdownRenderer: {
    render(markdown) {
      return marked.parse(markdown);
    }
  },
  pages,
  actions
});
```

如果你同时使用默认 `@mdsnai/sdk/elements` UI，建议把同一个 `markdownRenderer` 对象也传给 `mountMdsnElements(...)`，这样服务端和默认 UI 的 Markdown 呈现会保持一致。

## 什么时候包一层适配器

如果你后面想接 Express、Hono 或 Next，建议围绕 `server.handle()` 做一层很薄的适配器，而不是分叉运行时逻辑。
