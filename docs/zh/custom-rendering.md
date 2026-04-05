---
title: 自定义渲染
description: 在保留 MDAN 浏览器运行时的前提下，用 Vue 或 React 自己接管 UI。
---

# 自定义渲染

当你想保留 MDAN 的浏览器运行时，但希望由自己的框架完全接管 UI 时，就走这条路径。

## 共同原则

- `@mdanai/sdk/web` 负责请求生命周期、状态更新和协议行为
- 你的框架负责组件树、渲染、表单控件和视觉状态

也就是说：协议层保留，视图层由你自己接管。

## 生命周期模式

不管是 Vue 还是 React，都建议遵循同样的模式：

1. 在组件挂载生命周期里只创建一次 host。
2. 创建后立即订阅当前状态。
3. 再调用 `host.mount()`。
4. 在销毁阶段取消订阅并 `host.unmount()`。

这样可以避免重复订阅、陈旧的运行时实例和内存泄漏。

## 表单与操作模式

- `GET` 操作发送空 payload
- `POST` 操作只提交 operation 声明的 inputs
- 提交成功后清理对应字段

UI 应从当前状态和本地表单状态推导，而不是复制一套服务端假设。

## Vue 示例

参考：[examples/vue-starter/app/client.ts](../../examples/vue-starter/app/client.ts)

适合想让 Vue 接管组件树和视觉系统，但继续使用 MDAN 协议和运行时的场景。

## React 示例

参考：[examples/react-starter/app/client.tsx](../../examples/react-starter/app/client.tsx)

适合想让 React 接管状态投影和交互组件，但继续复用 MDAN 运行时的场景。

## 使用第三方 Markdown 渲染器

如果你不想使用内置的 Markdown 渲染方式，也可以把第三方渲染器接到这条路径里。

常见选择包括：

- `marked`
- `markdown-it`
- `remark`

对应示例有两类：

- [examples/vue-starter/app/client.ts](../../examples/vue-starter/app/client.ts)
  在 Vue 客户端里直接使用 `marked`
- [examples/react-starter/app/client.tsx](../../examples/react-starter/app/client.tsx)
  在 React 客户端里直接使用 `marked`

如果你希望服务端输出和默认 UI 也共用同一套规则，可以再看：

- [examples/marked-starter/app/server.ts](../../examples/marked-starter/app/server.ts)
- [examples/marked-starter/app/client.ts](../../examples/marked-starter/app/client.ts)

通常推荐把同一个渲染器同时注入到：

- `@mdanai/sdk/server`
- `@mdanai/sdk/elements`

这样服务端输出的 HTML 和默认 UI 的呈现规则会保持一致。

## 常见坑

- 每次渲染都重新创建 host
- 忘记在销毁阶段 `unmount`
- 直接修改运行时返回的状态对象
- 提交时使用了陈旧闭包里的表单状态

## 相关文档

- [Web 运行时](/zh/docs/web-runtime)
- [示例](/zh/docs/examples)
- [第三方渲染器](/zh/docs/third-party-markdown-renderer)
