---
title: 什么是 MDAN？
description: 快速理解 MDAN 是什么、它如何工作，以及它为什么适合同时面向人和 Agent 的交互页面。
---

# 什么是 MDAN？

一页，同时面向人类和 Agent。

MDAN（Markdown Action Notation）是一种共享表示法，用来表达可交互页面，并让同一页面从同一份源在不同界面中都能同时对人类和 Agent 保持可读、可操作。

同一页面。同一动作。同一体验。

## 它的特别之处是什么

在很多 AI 应用里，页面内容、工具定义、后续动作和浏览器 UI 往往分散在不同层里。

MDAN 做的是把这些重新收回到一个既可读也可操作的页面型应用表面：

- Markdown 承载人和 Agent 共同阅读的内容
- 可执行操作和内容定义放在一起
- 服务端返回的 Markdown 片段可以直接成为下一步交互上下文
- 同一个应用可以给 Agent 协商 Markdown，也可以给浏览器协商 HTML

## 它适合谁

MDAN 很适合下面这些团队和项目：

- 构建 agent-facing app 的团队
- 既要浏览器入口，也要 Agent 入口的内部工具
- 需要持续多步交互的 workflow / skills app
- 希望页面源本身保持可读的文档型或表单型产品

## 什么时候适合用 MDAN

当你满足下面这些条件时，MDAN 很适合：

- 一个应用需要同时给人和 Agent 使用
- 你希望内容和操作定义放在一起，而不是拆成模板、提示词和 JSON API
- 你的交互模型天然是页面型、逐步推进的
- 你希望一个服务端应用同时输出 Markdown 和 HTML

## 什么时候不适合

下面这些场景通常不必上 MDAN：

- 你只做传统浏览器 Web 应用
- 你本质上只是在提供 JSON API
- 你的 UI 严重依赖大型前端单页应用状态
- 你不需要 Agent 可读的交互模型

## Node 和 Bun 支持

MDAN 现在官方支持 Node 和 Bun。

- 想走更成熟的 host 基线，选 Node
- 想直接用 Bun starter 和 Bun 工具链入口，选 Bun
- 两边的应用模型保持一致

## 从哪里开始

- [快速开始](/zh/docs/getting-started)
- [理解 MDAN](/zh/docs/understanding-mdan)
- [HTTP 内容协商](/zh/docs/shared-interaction)
- [SDK 概览](/zh/docs/sdk)
