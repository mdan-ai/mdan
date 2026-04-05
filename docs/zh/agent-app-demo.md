---
title: Agent App Demo 讲解
description: 从 guestbook、auth-session 一直到 agent-tasks demo，拆解 Agent 驱动的交互闭环。
---

# Agent App Demo 讲解

这篇文档讲的是：Agent 在 MDAN 应用里到底如何一步步继续交互，而不只是停留在抽象概念层面。

## 基本流程

在 MDAN 里，Agent 的循环不是“调一次 JSON API，再自己拼下一步”，而是：

1. 先读取页面返回的完整 Markdown。
2. 从当前内容里发现可以执行的操作。
3. 执行其中一个操作。
4. 读取返回的 Markdown 片段。
5. 用更新后的上下文继续下一步。

这套循环既适用于简单状态更新（guestbook），也适用于鉴权跳转（login/register/vault）。

## 示例 A：Guestbook

参考： [examples/guestbook/app/server.ts](../../examples/guestbook/app/server.ts)

服务端行为：

- `GET /` 返回整页 Markdown
- `GET /list` 返回 guestbook block 片段
- `POST /post` 追加消息并返回更新后的 guestbook block 片段

关键点是：读和写都尽量保持在 block 范围内，所以 Agent 面对的上下文会更小，也更稳定。

## 示例 B：Auth Session

参考： [examples/auth-session/app/server.ts](../../examples/auth-session/app/server.ts)

关键能力：

- 在 action 处理里做 session mutation（`signIn`、`signOut`）
- 用由服务端统一解析的 `auto` follow-up read 表达页面跳转

典型跳转：

- register 成功 -> 带 sign-in mutation 的 `auto GET` 跟进到 `/vault`
- login 成功 -> `auto GET` 跟进到 `/vault`
- logout -> 带 sign-out mutation 的 `auto GET` 跟进到 `/login`

这样 Agent 不需要自己猜下一步去哪，返回内容本身就已经给出了后续路径。

## 示例 C：Agent 任务交接

参考： [demo/agent-tasks/app/server.ts](../../demo/agent-tasks/app/server.ts)

消息走读： [demo/agent-tasks/README.md](../../demo/agent-tasks/README.md)

这个 demo 把同样的模式推到了多步委派流程里：

- `GET /tasks/new` 返回创建任务页面
- `POST /tasks` 创建任务，并返回稳定的任务详情页
- `GET /tasks/:id` 返回长期稳定的任务定义，以及当前运行时 block
- accept、submit、request revision、complete 这类后续写操作，只返回更新后的运行时 block 片段

这里最重要的模式是拆成两层：

- 页面 Markdown 里放稳定的任务上下文
- 运行时 block 里放当前步骤的继续交互

这样一个 Agent 可以创建任务，另一个 Agent 可以沿着同一个页面 URL 继续处理，reviewer 也可以回到同一页完成关闭或重新打开流程。

如果你想看仓库里最完整、最贴近 agent-to-agent 交接的可运行示例，就从这里开始。

## 面向 Agent 的错误策略

不要只返回不透明的错误。更好的做法是返回可执行的 Markdown 片段，并在里面给出下一步合法操作。

在 auth-session 里，未登录状态下对 vault 的写入会返回一个可恢复片段，其中包含 `GET "/login"` 操作。

## 校验清单

- Agent 能否从当前页面或片段里正确识别可执行操作、请求方法和输入结构。
- 失败场景是否仍返回“可恢复”的 Markdown 片段。
- session 变更操作是否同时返回明确的后续动作。
- 写操作是否返回更新后的 block Markdown，而不是陈旧内容。
- 任务交接页是否把长期稳定的任务上下文放在页面正文里，把下一步继续动作放在 block 片段里。

## 相关文档

- [HTTP 内容协商](/zh/docs/shared-interaction)
- [应用结构](/zh/docs/application-structure)
- [服务端接入](/zh/docs/server-integration)
