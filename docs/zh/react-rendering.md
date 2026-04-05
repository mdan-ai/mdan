---
title: 使用 React 自定义渲染
description: 以 @mdanai/sdk/web 为运行时，React 完整接管 UI。
---

# 使用 React 自定义渲染

这页保留给旧链接。相关内容已经并入 [自定义渲染](/zh/docs/custom-rendering)。

如果你只关心 React 版本，可以直接看：

- [自定义渲染](/zh/docs/custom-rendering)
- [examples/react-starter/app/client.tsx](/Users/hencoo/projects/mdsn/examples/react-starter/app/client.tsx)

最核心的差别只有一层：在 React 里，你通常会用 `useEffect` 管理 `host` 的创建、订阅和清理，再把运行时状态投影成组件状态。

## 相关文档

- [Web 运行时](/zh/docs/web-runtime)
- [示例](/zh/docs/examples)
- [自定义渲染](/zh/docs/custom-rendering)
