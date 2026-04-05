---
title: 应用结构
description: 使用 MDAN 构建真实应用或文档站时推荐的目录结构、路由模型与 action 组织方式。
---

# 应用结构

这页讲的是：如果你要用 MDAN 搭一个真实应用，代码、页面和交互最好怎么摆。

先说结论：MDAN 推荐把页面源、服务端逻辑和浏览器侧代码分开，但不要拆得太重。这样既容易理解，也不容易把一套很轻的应用做成两三套彼此分离的东西。

## 推荐结构

最小结构通常是：

- `app/*.md`：页面源
- `app/server.ts`：页面组合和 action handler
- `app/client.ts`：浏览器运行时与 UI 挂载
- `index.mjs`：本地运行时托管入口

可以把它理解成三层分工：

- `app/*.md` 负责定义页面内容和操作
- `app/server.ts` 负责把页面和实际业务状态接起来
- `app/client.ts` 负责浏览器里的后续交互

`index.mjs` 只是把这套应用托管起来，方便你在本地跑起来或部署到 Node / Bun 环境里。

## 先把职责分清

MDAN 里最容易写乱的地方，不是代码多少，而是职责混在一起。

比较顺的做法是：

- Markdown 只负责页面内容和操作定义
- `composePage()` 负责把运行时里的 block 内容组合进页面
- `createHostedApp({ pages, actions })` 负责把页面和操作注册成一个应用
- runtime adapter 里的 `createHost()` 负责把这个应用挂到 Node 或 Bun 环境
- `createHeadlessHost()` 负责浏览器里的后续更新

这样一来，页面、服务端和浏览器侧各自都只做一件事。

## 页面和操作怎么对应

MDAN 使用显式页面路由和显式 action 路径。

- 页面路由：`pages["/docs"] = () => composedPage`
- action 路径：每个 action 都显式声明 `target + methods + routePath + blockName`

这样页面和交互的关系会更稳定，不需要靠“页面当前长什么样”去反推操作应该绑到哪里。

真正写代码时，可以把它理解成：

- `routePath` 说明这个操作属于哪一页
- `blockName` 说明这个操作主要更新哪一块
- `target` 说明请求真正会发到哪个 HTTP 路径

这三者对得上，后面的行为通常就会比较稳。

## HTML 外壳放哪里

共享 HTML 外壳建议通过服务端包装实现：

- 用 `renderHtml` 生成全局外壳
- 或者在运行时托管入口里用 `transformHtml` 做最终注入

典型职责拆分：

- Markdown：内容和交互来源
- `renderHtml`：页头、导航、主题等全局外壳
- 浏览器运行时：页面和 block 的后续更新

也就是说，Markdown 里放的是应用本身，HTML 外壳只是把它包成一个更完整的网站或页面。

## 操作怎么组织

每个 action 都应显式声明：

- `target`
- `methods`
- `routePath`
- `blockName`
- `handler`

最常见的是两类：

### 读取 action（GET）

```ts
handler: ({ block }) => block()
```

### 写入 action（POST）

```ts
handler: ({ inputs, block }) => {
  // 更新领域状态
  return block();
}
```

如果只是刷新当前 block，就直接返回 `block()`。

如果写入之后还要带出新的状态、错误提示或下一步操作，也尽量让这些内容跟着返回的片段一起回去，不要把逻辑拆散到别处。

## 推荐实现顺序

1. 先确定路由列表和页面文件。
2. 为每个页面写好 Markdown，再实现 `renderPage()` 这类页面组合函数。
3. 把页面里的操作一一注册成显式 action。
4. 接好运行时入口、静态资源和 HTML 外壳。
5. 最后再挂浏览器运行时，验证局部更新和页面跳转。

## 常见坑

- 把示例外壳里的 import map 当成 SDK 公共 API
- 明明 block 片段就够了，却每次 action 都返回整页
- 把业务状态更新逻辑塞进 UI 层，而不是 action handler
- 页面里的操作定义改了，但服务端注册的 `target`、`routePath`、`blockName` 没一起改

## 相关文档

- [服务端接入](/zh/docs/server-integration)
- [自定义渲染](/zh/docs/custom-rendering)
- [Session Provider](/zh/docs/session-provider)
