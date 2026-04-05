---
title: SDK 概览
description: MDAN SDK 的包结构、协议边界与推荐用法。
---

# SDK 概览

`@mdanai/sdk` 是 MDAN 的官方 SDK。

这页只回答三个问题：

- SDK 里有哪些包
- 每个包各自负责什么
- 一般应该从哪里开始看

如果只记一件事，可以记这个：

- `core` 处理 MDAN 页面和 Markdown
- `server` 把页面和操作组织成一个可运行的服务端应用
- `web` 负责浏览器里的后续交互
- `elements` 提供官方默认 UI

## 包结构

当前的发布方式是：**一个包 + 多子路径导出**。

- `@mdanai/sdk/core`
- `@mdanai/sdk/server`
- `@mdanai/sdk/web`
- `@mdanai/sdk/elements`

也可以从 `@mdanai/sdk` 根入口统一导入。

导入建议：

- 优先使用子路径导入来保持边界清晰，例如 `@mdanai/sdk/server`
- 只有在你明确想要单一导入面时，才使用 `@mdanai/sdk` 根入口
- 不要直接依赖 `dist/*` 之类的深层内部路径

## 这几个包分别做什么

- `core`
  解析页面、校验页面、处理 Markdown 请求体和序列化
- `server`
  负责页面路由、操作注册、内容协商和服务端托管
- `web`
  负责浏览器侧请求、局部更新和状态同步
- `elements`
  在 `web` 的基础上提供官方默认 UI

## 协议边界

协议边界始终是 Markdown：

- 页面路由返回完整页面 Markdown
- `BLOCK` 操作默认返回当前 block 的 Markdown 片段
- 浏览器侧先拿到 HTML，再由运行时接管后续更新

Agent 直接消费 Markdown，浏览器消费的是同一个应用生成出来的 HTML。

## 从哪里开始看

如果你是第一次接触这套 SDK，推荐这样看：

- 想先搭起应用：先看 [快速开始](/zh/docs/getting-started)
- 想知道项目怎么组织：看 [应用结构](/zh/docs/application-structure)
- 想看服务端能力：看 [服务端运行时](/zh/docs/server-runtime)
- 想看浏览器侧能力：看 [Web 运行时](/zh/docs/web-runtime)
- 想查具体 API：看 [API 参考](/zh/docs/api-reference)

## 公开入口

当前发布线是单包 + 子路径导出。历史上的多包名字不属于当前公开入口。

公开入口保留为：

- `@mdanai/sdk`
- `@mdanai/sdk/core`
- `@mdanai/sdk/server`
- `@mdanai/sdk/web`
- `@mdanai/sdk/elements`
