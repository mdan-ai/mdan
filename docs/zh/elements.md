---
title: Elements 组件
description: @mdsnai/sdk/elements 提供官方默认 UI。
---

# Elements 组件

`@mdsnai/sdk/elements` 提供 MDSN 的官方默认 UI，底层使用 Web Components。

它现在直接建立在浏览器运行时提供的初始状态之上，而不再只是给服务端输出的原始 HTML 套一层样式。

如果你不想自己接管 UI，这一层就是浏览器侧最直接的默认方案。

推荐主线是 `mountMdsnElements({ root, host, ... })`。`registerMdsnElements()` 只是更底层的注册器，通常只会在测试或特殊自定义接入里单独使用。

## 基本用法

```ts
import { mountMdsnElements } from "@mdsnai/sdk/elements";
import { createHeadlessHost } from "@mdsnai/sdk/web";
```

```ts
const host = createHeadlessHost({ root: document, fetchImpl: window.fetch });
mountMdsnElements({
  root: document,
  host
}).mount();
```

如果你想接第三方 Markdown 渲染器，也可以把同一个渲染器注入进来：

```ts
mountMdsnElements({
  root: document,
  host,
  markdownRenderer: {
    render(markdown) {
      return marked.parse(markdown);
    }
  }
}).mount();
```

如果你只想注册这些自定义元素，也仍然可以单独调用 `registerMdsnElements()`。

默认会注册这些自定义元素：

- `mdsn-page`
- `mdsn-block`
- `mdsn-form`
- `mdsn-field`
- `mdsn-action`
- `mdsn-error`

## 这个包适合什么场景

- 想要开箱可用的默认 UI
- 想使用仍然保持框架中立的 Web Components
- 想在同一套浏览器运行时之上接一层很薄的官方视图层

如果你只想要浏览器运行时，并计划自己渲染 UI，就使用 `@mdsnai/sdk/web` 而不接 `@mdsnai/sdk/elements`。
