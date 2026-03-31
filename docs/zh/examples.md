---
title: 示例
description: 仓库内示例说明与适合查看的时机。
---

# 示例

这些示例都围绕同一套 MDSN 方式展开，只是各自回答的问题不同。

## 每个示例适合什么时候看

### [`examples/starter`](https://github.com/mdsn-ai/mdsn/tree/main/examples/starter)

最小起点。

如果你只想先看一条最短路径，就从这里开始。它基本对应脚手架生成出来的项目结构，也是理解后面其他示例的最好起点。

### [`examples/guestbook`](https://github.com/mdsn-ai/mdsn/tree/main/examples/guestbook)

最小的交互闭环。

适合用来理解整页读取、block 局部刷新，以及一次写入之后服务端如何返回下一步交互上下文。

### [`examples/auth-session`](https://github.com/mdsn-ai/mdsn/tree/main/examples/auth-session)

带 session 的多步交互。

适合看登录、注册、退出、页面跳转，以及错误场景下如何返回可恢复的后续操作。

### [`examples/vue-starter`](https://github.com/mdsn-ai/mdsn/tree/main/examples/vue-starter)

Vue 接管 UI 的版本。

适合想保留 MDSN 协议和浏览器运行时，但用 Vue 来渲染界面的场景。

### [`examples/react-starter`](https://github.com/mdsn-ai/mdsn/tree/main/examples/react-starter)

React 接管 UI 的版本。

适合想保留 MDSN 协议和浏览器运行时，但用 React 来渲染界面的场景。

### [`examples/express-starter`](https://github.com/mdsn-ai/mdsn/tree/main/examples/express-starter)

已有后端的接入方式。

适合看 Express 这类服务端如何把请求和响应适配到 MDSN 运行时。

### [`examples/marked-starter`](https://github.com/mdsn-ai/mdsn/tree/main/examples/marked-starter)

第三方 Markdown 渲染器集成。

适合看如何把 `marked` 这类现成渲染器接进服务端和默认 UI。

### [`examples/docs-starter`](https://github.com/mdsn-ai/mdsn/tree/main/examples/docs-starter)

文档站示例。

适合看基于 MDSN 组织一组内容页面、导航和文档外壳的方式。

## 查看建议

- 想先看最短路径：从 `examples/starter` 开始
- 想看 Agent 如何连续交互：看 `examples/guestbook` 和 `examples/auth-session`
- 想看 Vue 自定义 UI：看 `examples/vue-starter`
- 想看 React 自定义 UI：看 `examples/react-starter`
- 想看已有服务端接入：看 `examples/express-starter`
- 想看文档站怎么组织：看 `examples/docs-starter`
