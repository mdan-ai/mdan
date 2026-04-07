---
title: HTTP 内容协商
description: 说明一个 MDAN 应用如何基于同一套页面和动作定义，同时服务人类和 Agent。
---

# HTTP 内容协商

MDAN 用 HTTP 内容协商，让同一个应用可以基于同一套页面和动作定义，同时服务人类和 Agent。

核心规则很简单：

```http
Accept: text/markdown
```

返回 Markdown。

```http
Accept: text/html
```

返回 HTML。

## 为什么这样做

Agent 需要直接处理 Markdown。  
浏览器需要直接显示 HTML。

MDAN 不想因此拆成两套系统，所以选择让同一个结果按不同调用方返回不同形式。

## 常见请求

Agent 读取页面或调用 action 时，通常发送：

```http
Accept: text/markdown
```

浏览器访问页面或提交交互时，通常发送：

```http
Accept: text/html
```

写入时，应用底层仍然使用同一套字段语义，只是不同调用方会选择不同承载方式。

实践里通常是：

- 浏览器 Host 使用 `application/x-www-form-urlencoded`
- 文件上传使用 `multipart/form-data`
- Agent 和 CLI 工具更常用 `text/markdown`

这页真正想说明的只有一件事：

- 同一个应用可以给 Agent 返回 Markdown
- 同一个应用也可以给浏览器返回 HTML

也就是说，变化的是返回形式，不是应用本身。

这也是为什么 Agent 可以直接用 `curl` 这类原生命令行 HTTP 工具和同一个 Web 应用交互，而不需要先启动无头浏览器。

## 为什么这样做重要

这样做最重要的价值，是避免把同一个应用拆成两套东西。

- 不需要一套给 Agent 的协议，再单独维护一套给浏览器的接口
- 不需要在内容、交互和服务端行为之间来回同步两份定义
- Agent 和浏览器虽然看到的形式不同，但背后走的是同一个应用

这样应用会更简单，也更不容易漂移。

## 相关文档

- [理解 MDAN](/zh/docs/understanding-mdan)
- [应用结构](/zh/docs/application-structure)
- [服务端运行时](/zh/docs/server-runtime)
- [Agent App Demo 讲解](/zh/docs/agent-app-demo)
