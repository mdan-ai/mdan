---
title: 开发者路线图
description: 根据你的场景选择最合适的 MDAN 集成路径。
---

# 开发者路线图

这页用来帮你根据当前场景，快速选出更合适的接入路径。

## 路线 A：Hosted App + 默认 UI

使用：

- `@mdanai/sdk/server`
- `@mdanai/sdk/web`
- `@mdanai/sdk/elements`

适合想尽快做出可运行产品，并直接使用官方默认 UI 的场景。

参见：

- [快速开始](/zh/docs/getting-started)
- [应用结构](/zh/docs/application-structure)
- [Elements 组件](/zh/docs/elements)

## 路线 B：Hosted App + 自定义 UI

使用：

- `@mdanai/sdk/server`
- `@mdanai/sdk/web`
- Vue / React 等框架层

适合已经有自己的设计系统，但仍想保留 MDAN 运行时行为的场景。

参见：

- [自定义渲染](/zh/docs/custom-rendering)
- [示例](/zh/docs/examples)

## 路线 C：已有后端集成

使用：

- 通过 `createMdanServer()` 或 `createHostedApp()`
- 在适配层调用 `server.handle()`

适合已经有 Express、Hono、Next 等后端，需要受控集成方式的场景。

参见：

- [服务端接入](/zh/docs/server-integration)
- [服务端运行时](/zh/docs/server-runtime)

## 路线 D：只用协议工具

使用：

- `@mdanai/sdk/core`

适合只需要解析、校验、序列化这些协议工具的场景。

参见：

- [SDK 概览](/zh/docs/sdk)
- [API 参考](/zh/docs/api-reference)

## 选择清单

可以用这个快速判断：

- 想最快上线并直接用官方 UI：选路线 A。
- 想保留协议运行时，但自己掌控视觉系统：选路线 B。
- 想深度接入已有后端：选路线 C。
- 只需要解析器/序列化工具：选路线 D。

## 应避免的反模式

不要在前端框架层重复实现协议逻辑。协议和路由规则应保留在服务端和运行时层，UI 只负责根据当前状态渲染。
