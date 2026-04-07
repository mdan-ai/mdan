---
title: MDAN
description: MDAN 是一种共享表示法，用来表达可交互页面，并让同一页面从同一份源在不同界面中都能同时对人类和 Agent 保持可读、可操作。
---

# MDAN

一页，同时面向人类和 Agent。

MDAN（Markdown Action Notation）是一种共享表示法，用来表达可交互页面，并让同一页面从同一份源在不同界面中都能同时对人类和 Agent 保持可读、可操作。

同一页面。同一动作。同一体验。

这意味着同一个应用可以同时服务浏览器和 Agent，而不需要把交互模型拆散到 Markdown、提示词、JSON API 和前端胶水代码里。

## MDAN 是什么

MDAN 把页面本身当成应用行为的基本单位。

在一份页面源里，你可以同时保留：

- 页面内容写在 Markdown 里
- 可执行操作也定义在页面里
- 服务端返回的 Markdown 片段不仅是结果，也是下一步交互上下文
- 同一个 Web 应用既可以被浏览器访问，也可以被 Agent 直接通过 HTTP 交互

这让 MDAN 很适合用来构建 agent app、skills app，以及需要持续多步交互的页面型应用。

`@mdanai/sdk` 是当前这套格式和相关 Host 行为的一份 TypeScript 参考实现。

## 它解决什么问题

如果一个应用本身就要同时给 Agent 和人使用，架构通常会很快分叉：

- Agent 走一套工具或 JSON 接口
- 浏览器走另一套页面和交互模型
- 服务端还要额外维护提示词、状态和下一步动作的同步关系

MDAN 的做法，是让页面本身承担这层表达。这样一来：

- Agent 可以直接读取 Markdown，并继续执行下一步操作
- Agent 可以直接通过 HTTP 与同一个 Web 应用交互，用 `curl` 这类原生命令行工具就够了
- 这让 Agent 不必依赖无头浏览器去模拟人类操作页面
- 浏览器可以继续访问 HTML，而不需要另一套独立应用
- 服务端可以通过返回 Markdown 片段，持续驱动后续交互
- 应用更不容易在“页面、协议、工具、UI”之间逐渐漂移

## 什么时候适合用 MDAN

当你满足下面这些条件时，MDAN 很合适：

- 同一个应用既要给人用，也要给 Agent 用
- 你的交互模型天然是页面型、多步式的
- 你希望内容和操作定义能放在一起，保持可读
- 你希望同一个服务端应用同时协商 Markdown 和 HTML

## 什么时候不适合

下面这些场景通常不必上 MDAN：

- 你只需要一个传统的浏览器 Web 应用
- 你的系统本质上只是一个 JSON API
- 你的 UI 严重依赖大型前端 SPA 状态模型
- 你根本不需要 Agent 可读的交互面

## 工作方式

MDAN 的工作方式可以先概括成三步：

1. 页面源用 Markdown 表达内容和操作
2. 交互发生后，服务端返回更新后的 Markdown 片段
3. Agent 或浏览器基于这个结果继续下一步

对 Agent 来说，通常读取的是 Markdown。  
对浏览器来说，通常读取的是 HTML。

也就是：

- `Accept: text/markdown` -> 返回 Markdown
- `Accept: text/html` -> 返回 HTML

变化的是返回形式，不是背后那套应用。

## 文档导览

### 开始

- 想先在 5 分钟内跑起来：看 [快速开始](/zh/docs/getting-started)
- 想先快速理解定义、适用场景和边界：看 [什么是 MDAN？](/zh/docs/what-is-mdan)
- 想理解 MDAN 和 MCP 的关系：看 [MDAN 与 MCP](/zh/docs/mdan-vs-mcp)

### 核心概念

- 想理解页面、block 和更新方式：看 [理解 MDAN](/zh/docs/understanding-mdan)
- 想理解为什么同一个应用可以同时服务人类和 Agent：看 [HTTP 内容协商](/zh/docs/shared-interaction)
- 想看 Agent 如何直接消费 MDAN：看 [Agent 直接消费](/zh/docs/agent-consumption)
- 想看一个真实的多步 agent app 流程：看 [Agent App Demo 讲解](/zh/docs/agent-app-demo)

### 用 MDAN 构建

- 想先判断该走哪条接入路线：看 [开发者路线图](/zh/docs/developer-paths)
- 想开始搭真实应用：看 [应用结构](/zh/docs/application-structure)
- 想把 MDAN 接进现有后端：看 [服务端接入](/zh/docs/server-integration)
- 想直接看仓库里的示例：看 [示例](/zh/docs/examples)

### 规范

- 想看公开的版本化规范入口：看 [规范 v1](https://mdan.ai/spec/v1)
- 想看仓库里的完整规范正文：看 [spec/spec.md](../spec/spec.md)
- 想看浏览器侧 Host Profile：看 [spec/browser-host.md](../spec/browser-host.md)

### SDK 参考

- 想理解 SDK 边界：看 [SDK 概览](/zh/docs/sdk)
- 想理解服务端托管方式：看 [服务端运行时](/zh/docs/server-runtime)
- 想理解浏览器侧如何继续交互：看 [Web 运行时](/zh/docs/web-runtime)
- 想查公开 API：看 [API 参考](/zh/docs/api-reference)

## 推荐阅读顺序

1. [快速开始](/zh/docs/getting-started)
2. [什么是 MDAN？](/zh/docs/what-is-mdan)
3. [理解 MDAN](/zh/docs/understanding-mdan)
4. [HTTP 内容协商](/zh/docs/shared-interaction)
5. [Agent 直接消费](/zh/docs/agent-consumption)
6. [开发者路线图](/zh/docs/developer-paths)
7. [应用结构](/zh/docs/application-structure)
8. [规范 v1](https://mdan.ai/spec/v1)
9. [SDK 概览](/zh/docs/sdk)
