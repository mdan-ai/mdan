---
title: 服务端接入
description: 将 MDAN 运行时接入 Express、Hono、Fastify、Koa 或 Next 等现有后端。
---

# 服务端接入

这页适合已经有现成后端，需要把 MDAN 接进去的场景。

先说结论：接 MDAN 时，最重要的不是“怎么把每个细节都包起来”，而是只做一层很薄的 HTTP 适配，然后把真正的处理交给运行时。

## 集成边界

保持一个清晰边界：

- 框架层只做传输适配
- MDAN 运行时层负责路由、协商、body 语义和 action 执行

在实践里就是：把请求和响应适配到 `server.handle()`，不要在中间件或控制器里再重复实现一遍 MDAN 的逻辑。

## 一个典型接法

参考：[examples/express-starter/app/express-adapter.ts](/Users/hencoo/projects/mdsn/examples/express-starter/app/express-adapter.ts)

以 Express 为例，适配器真正要做的事情其实很少：

- 把 headers 归一化成小写键名映射
- 从框架 cookie map 或 `cookie` header 解析 cookie
- 把表单 body 归一化成 Markdown 请求体（`serializeMarkdownBody`）
- 运行时返回的 headers/body 原样透传

也就是说，适配器只是把框架世界翻译成运行时能理解的请求，再把运行时的结果翻译回框架响应。

## 应用侧怎么注册操作

参考：[examples/express-starter/app/server.ts](/Users/hencoo/projects/mdsn/examples/express-starter/app/server.ts)

应用侧的 action 注册应保持显式：

- `target`
- `methods`
- `routePath`
- `blockName`
- `handler`

不要根据页面当前显示状态去猜某个操作该绑定到哪里。页面里写了什么、服务端注册了什么，就让它们明确地一一对应。

## 需要保留的 HTTP 语义

- 直写请求媒体类型：`Content-Type: text/markdown`
- Markdown body 格式错误：`400`
- 不支持的直写媒体类型：`415`
- 不可接受的表示：`406`

这些规则不需要你在业务代码里反复处理，但适配层不能把它们弄丢。

## 适配器检查清单

- request URL 必须是包含 host 和 protocol 的绝对地址
- method、body、headers、cookies 只归一化一次
- 运行时返回的 `set-cookie` 必须保留
- 流式响应应增量转发，而不是先缓冲成 JSON

## 常见坑

- 把 `application/x-www-form-urlencoded` 当成运行时原生写入格式
- 覆盖运行时已经设置好的 `content-type`
- 丢失 `set-cookie` 透传
- 在适配层再做一套路由分发，最后和运行时的真实行为慢慢漂移

## 相关文档

- [HTTP 内容协商](/zh/docs/shared-interaction)
- [服务端运行时](/zh/docs/server-runtime)
- [应用结构](/zh/docs/application-structure)
