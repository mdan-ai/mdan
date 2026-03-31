---
title: 使用 Vue 自定义渲染
description: 以 @mdsnai/sdk/web 为运行时，Vue 完整接管 UI。
---

# 使用 Vue 自定义渲染

这页保留给旧链接。相关内容已经并入 [自定义渲染](/zh/docs/custom-rendering)。

如果你只关心 Vue 版本，可以直接看：

- [自定义渲染](/zh/docs/custom-rendering)
- [examples/vue-starter/app/client.ts](/Users/hencoo/projects/mdsn/examples/vue-starter/app/client.ts)

最核心的差别只有一层：在 Vue 里，你通常会在组件生命周期里管理 `host` 的创建、订阅和销毁，再把运行时状态映射到组件树里。

## 相关文档

- [Web 运行时](/zh/docs/web-runtime)
- [示例](/zh/docs/examples)
- [自定义渲染](/zh/docs/custom-rendering)
