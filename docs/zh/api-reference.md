---
title: API 参考
description: @mdsnai/sdk 各子路径公共 API 总览。
---

# API 参考

这份文档只覆盖当前 SDK 包根入口真正对外暴露的 API。

如果某个能力没有出现在这里，就不应该被当成公共 SDK 接口依赖。

这页更适合查入口和查名字，不负责展开讲原理或最佳实践。

## `@mdsnai/sdk/core`

这一组主要是协议和 Markdown 处理工具。

### `parsePage(source)`

解析 `.md` 页面源，返回页面对象。

### `composePage(source, { blocks })`

解析页面并附加运行时 block 内容，返回组合后的页面对象。

返回值还提供：

- `page.fragment(blockName)`

这是当前推荐的 block 片段提取方式。

### `validatePage(page)`

校验页面结构，包括：

- block 名称
- anchor 对齐
- input 引用
- 操作约束

### `parseMarkdownBody(body)`

解析 `POST` 请求体的 Markdown 形式。

### `serializeMarkdownBody(values)`

把字段序列化成标准 Markdown 请求体。

### `serializePage(page)`

把完整页面对象序列化成完整页面 Markdown。

### `serializeFragment(fragment)`

把 block 级片段序列化成 Markdown 片段。

### `MdsnMarkdownRenderer`

统一的 Markdown 渲染扩展接口。同一个渲染器可以同时注入给：

- `createMdsnServer({ markdownRenderer })`
- `createHostedApp({ markdownRenderer })`
- `mountMdsnElements({ markdownRenderer })`

### `negotiateRepresentation(acceptHeader)`

根据 `Accept` 协商：

- `event-stream`
- `markdown`
- `html`
- `not-acceptable`

显式包含 `text/markdown` 时优先返回 `markdown`。

## `@mdsnai/sdk/server`

这一组主要是服务端运行时和 Node 托管入口。

### `createHostedApp({ pages, actions, ...options })`

创建一个更紧凑的 Hosted App 入口。

每个 action 都要显式声明：

- `target`
- `methods`
- `routePath`
- `blockName`
- `handler`

每个 action 会自动拿到：

- `routePath`
- `blockName`
- `page()`
- `block()`

### `createMdsnServer(options?)`

创建服务端运行时。

常见可选项：

- `session`
- `renderHtml`
- `markdownRenderer`

创建后可注册：

- `server.page(path, handler)`
- `server.get(path, handler)`
- `server.post(path, handler)`
- `server.handle(request)`

### `block(page, blockName, result?)`

把 composed page 的某个 block 直接包装成成功 action result。

### `stream(asyncIterable, result?)`

把异步片段流包装成 `text/event-stream` 响应。

### `ok(result)`

构造成功 action result，适合完全手写片段的场景。

### `fail(result)`

构造失败 action result，适合需要显式返回 4xx/5xx 且仍返回 `md + mdsn` 片段的场景。

### `createNodeHost(server, options?)`

当前唯一推荐的 Node `http` 入口。

支持：

- `rootRedirect`
- `ignoreFavicon`
- `transformHtml`
- `staticFiles`
- `staticMounts`

### `signIn(session)`

创建登录 session mutation。

### `signOut()`

创建登出 session mutation。

### `refreshSession(session)`

创建续期 session mutation。

## `@mdsnai/sdk/web`

这一组主要是浏览器侧运行时。

### `createHeadlessHost({ root, fetchImpl })`

浏览器侧运行时的推荐入口。

返回对象提供：

- `host.getSnapshot()`
- `host.subscribe(listener)`
- `host.submit(operation, values)`
- `host.visit(target)`
- `host.mount()`
- `host.unmount()`

## `@mdsnai/sdk/elements`

这一组主要是默认 UI 和自定义元素注册器。

### `mountMdsnElements({ root, host, markdownRenderer? })`

默认 UI 的推荐入口。它会：

- 注册官方 Web Components
- 基于当前状态渲染默认的页面、block 和表单 UI

### `registerMdsnElements()`

会注册这些默认 Web Components：

- `mdsn-page`
- `mdsn-block`
- `mdsn-form`
- `mdsn-field`
- `mdsn-action`
- `mdsn-error`

## 不再推荐依赖的旧路径

这些能力可能仍存在于包内部文件里，但不应该再作为公共 SDK 边界依赖：

- `fragmentForBlock()` 包根调用
- `createNodeRequestListener()` 包根调用
- `renderHtmlDocument()` 包根调用
- `@mdsnai/sdk/elements/register` 子路径
