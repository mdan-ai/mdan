---
title: Web 运行时
description: @mdsnai/sdk/web 在浏览器侧的运行时模型。
---

# Web 运行时

`@mdsnai/sdk/web` 是浏览器侧运行时，本身不负责 UI 渲染。

它读取服务端写进 HTML 的初始状态，负责发请求、维护页面和 block 状态，并把这些状态暴露给任意渲染层。

如果你想理解这页，可以先抓住一句话：`web` 负责“交互怎么继续”，UI 要不要自己画，是另一件事。

## 基本用法

```ts
import { createHeadlessHost } from "@mdsnai/sdk/web";

const host = createHeadlessHost({ root: document, fetchImpl: window.fetch });
host.mount();

host.subscribe((snapshot) => {
  console.log(snapshot.route, snapshot.blocks);
});
```

这是浏览器侧推荐的主线路径：

- 默认 UI：`createHeadlessHost()` + `mountMdsnElements()`
- 框架 UI：`createHeadlessHost()` + Vue、React、Svelte 自己渲染

当框架接管 UI 时，推荐直接使用这组接口：

- `host.getSnapshot()`
- `host.subscribe(listener)`
- `host.submit(operation, values)`
- `host.visit(target)`

## 它真正负责什么

挂载后，这个运行时会：

- 从当前 HTML 页面读取初始状态
- 按正确的协议约定发送 `GET` 和 `POST` action
- 把返回的 block 片段合并进当前状态
- 当响应里明确给出下一页目标时加载新的页面状态
- 通过 `subscribe(listener)` 通知任意渲染层

也就是说，它负责的是交互过程本身，不是视觉呈现。

## 运行时状态

这套运行时暴露了一套很小的状态 API：

```ts
host.subscribe((snapshot) => {
  console.log(snapshot.status);
});
```

当前状态包括：

- `idle`
- `loading`
- `error`

## 和 `elements` 的关系

- 如果你想要官方默认 UI，就把 `createHeadlessHost()` 和 `mountMdsnElements()` 组合使用
- 如果你想自己用 Vue、React 或别的框架接管界面，就只保留 `createHeadlessHost()`

可以把它们理解成：`web` 负责跑，`elements` 负责显示。
