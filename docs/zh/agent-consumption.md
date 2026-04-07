---
title: Agent 直接消费
description: 说明 Agent 如何直接读取 MDAN 页面、执行动作，并从 Markdown 中继续多步交互。
---

# Agent 直接消费

MDAN 本来就是为了让 Agent 直接消费而设计的。

Agent 在使用 MDAN 应用之前，不需要先套一层无头浏览器、MCP 包装器，或者额外的运行时，才有办法继续一个可交互 Markdown 页面。

只要 Agent 能做到下面几件事：

- 读取 Markdown
- 识别 MDAN block 和 operation
- 发送普通 HTTP 请求
- 在请求之间保存 cookie

它就可以自己继续交互。

## Agent 在读取什么

Agent 通常会请求 Markdown：

```http
Accept: text/markdown; profile="https://mdan.ai/spec/v1"
```

这时服务端返回的是一个 Markdown 页面或片段，其中已经包含：

- 当前交互上下文
- 当前可见的 blocks
- 可填写的 inputs
- 下一步可执行的 operations

这个响应不只是内容，而是下一步交互面本身。

## Agent 在发送什么

对于写操作，Agent 发送的仍然是普通 HTTP 请求，并为目标 `POST` 提交一组具名输入字段。

MDAN 当前支持用这几种方式承载同一套字段语义：

- `application/x-www-form-urlencoded`
- `multipart/form-data`
- `text/markdown`

对 Agent 和 CLI 来说，最直接的通常还是 `text/markdown`：

```http
Content-Type: text/markdown
```

这里的请求体不是任意自然语言，而是 MDAN 的直写字段格式，例如：

```md
nickname: "Ada", password: "pass-1234"
```

另一个例子：

```md
message: "Private note from agent"
```

当前 TypeScript 参考实现会把 Markdown 形式序列化成逗号分隔的 key-value 对，同时在解析时兼容换行分隔形式。

如果提交字段不符合预期格式，或者与声明的输入不匹配，服务端可以返回一个可恢复的错误结果。

## 最小消费循环

一个简单的 Agent 消费循环通常是这样：

1. 用 `Accept: text/markdown` 去 `GET` 当前页面
2. 读取返回的 Markdown，并找出当前可执行操作
3. 选择下一步 operation
4. 发送对应的 `GET` 或 `POST`
5. 如果服务端设置了 session，就保存 cookie
6. 基于返回的页面或片段继续下一步

这已经足够支撑很多真实应用流程。

## 示例：Auth Session

在 `auth-session` 例子里，Agent 可以这样工作：

1. `GET /login`
2. 发现 `POST login "/login"` 和 `GET register "/register"`
3. 用下面的 body 执行 `POST /register`：

```md
nickname: "HttpAgent", password: "pass-1234"
```

4. 保存返回的 `mdan_session` cookie
5. 再执行 `POST /vault`：

```md
message: "Private note from agent"
```

6. 最后执行 `POST /vault/logout`

关键在于，每一次响应都已经把“下一步能做什么”告诉 Agent 了。

## 示例：Agent Tasks

在 `agent-tasks` demo 里，一个 Agent 可以创建任务，另一个 Agent 可以直接接手并继续推进，整个过程都通过 MDAN 页面完成。

流程大致是：

1. Agent A 注册并打开 `/tasks`
2. Agent A 通过 `POST /tasks` 创建任务
3. 返回页面里会出现：

```md
POST accept "/tasks/task-1/accept"
```

4. Agent B 直接发送 `POST /tasks/task-1/accept`
5. 返回结果里会出现：

```md
POST submit "/tasks/task-1/submit" WITH result
```

6. Agent B 提交结果
7. reviewer 会收到：
   `POST request_revision "/tasks/task-1/request-revision" WITH review_note` 和 `POST complete "/tasks/task-1/complete"`

这是一条直接通过 HTTP 完成的 handoff 流程，不需要浏览器自动化。

## Cookie 与 Session 状态

Agent 只需要像普通 HTTP 客户端一样保留 cookie。

这就足以支持下面这些流程：

- 注册后以同一个 Agent 身份继续
- 登录后打开受保护页面
- 把工作从一个 Agent 身份交给另一个 Agent 身份
- 对过期或无效 session 做干净的拒绝

也就是说，session 仍然留在普通 HTTP 语义里，不需要单独再发明一条 agent session 通道。

## 这说明了什么

直接消费很重要，因为它保证应用表面是统一的。

- 同一个应用可以同时服务浏览器和 Agent
- 同一套页面定义可以同时表达内容和动作
- 同一个服务端可以通过返回 Markdown 持续驱动后续交互
- Agent 不需要为了继续流程而先去模拟浏览器

这也是为什么 MDAN 更像一种 agent-native interaction surface，而不只是渲染格式。

## 相关文档

- [HTTP 内容协商](/zh/docs/shared-interaction)
- [理解 MDAN](/zh/docs/understanding-mdan)
- [Agent App Demo 讲解](/zh/docs/agent-app-demo)
- [规范 v1](https://mdan.ai/spec/v1)
