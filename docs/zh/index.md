---
title: MDSN
description: MDSN 是什么，它解决什么问题，以及从哪里开始理解和使用它。
---

# MDSN

MDSN 是建立在 Markdown 之上的交互页面格式。

它想做的事情很直接：把页面内容、可执行操作和后续交互重新收回到同一个应用页面里。

在很多 AI 应用里，内容、工具、提示、JSON 接口和浏览器 UI 往往分散在不同层里，各自维护。  
MDSN 选择把这些重新组织回一页 Markdown 中。

**一页 Markdown，同时定义内容、操作和下一步交互。**

## MDSN 是什么

MDSN 更像一种应用表达方式，而不是一组分散的接口约定。

在 MDSN 里，页面本身就承载了内容、操作和后续交互：

- 页面内容写在 Markdown 里
- 可执行操作也定义在页面里
- 服务端返回的 Markdown 片段不仅是结果，也是下一步交互上下文
- 同一个 Web 应用既可以被浏览器访问，也可以被 Agent 直接通过 HTTP 交互

这让 MDSN 很适合用来构建 agent app、skills app，以及需要持续多步交互的页面型应用。

`@mdsnai/sdk` 是当前这套格式和相关 Host 行为的一份参考实现。

## 为什么这样设计

如果一个应用本身就要同时给 Agent 和人使用，继续拆成多套东西通常会越来越重：

- Agent 走一套工具或 JSON 接口
- 浏览器走另一套页面和交互模型
- 服务端还要额外维护提示词、状态和下一步动作的同步关系

MDSN 的做法，是让页面本身承担这层表达。这样一来：

- Agent 可以直接读取 Markdown，并继续执行下一步操作
- Agent 可以直接通过 HTTP 与同一个 Web 应用交互，用 `curl` 这类原生命令行工具就够了
- 这让 Agent 不必依赖无头浏览器去模拟人类操作页面
- 浏览器可以继续访问 HTML，而不需要另一套独立应用
- 服务端可以通过返回 Markdown 片段，持续驱动后续交互
- 应用更不容易在“页面、协议、工具、UI”之间逐渐漂移

## 工作方式

MDSN 的工作方式可以先概括成三步：

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

- 想先在 5 分钟内跑起来：看 [快速开始](/zh/docs/getting-started)
- 想理解页面、block 和更新方式：看 [理解 MDSN](/zh/docs/understanding-mdsn)
- 想理解为什么同一个应用可以同时服务 Agent 和浏览器：看 [HTTP 内容协商](/zh/docs/shared-interaction)
- 想开始搭真实应用：看 [应用结构](/zh/docs/application-structure)
- 想理解 SDK 边界：看 [SDK 概览](/zh/docs/sdk)

## 推荐阅读顺序

1. [快速开始](/zh/docs/getting-started)
2. [理解 MDSN](/zh/docs/understanding-mdsn)
3. [应用结构](/zh/docs/application-structure)
4. [SDK 概览](/zh/docs/sdk)
