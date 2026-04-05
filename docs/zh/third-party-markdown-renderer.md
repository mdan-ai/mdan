---
title: 第三方渲染器
description: 使用统一 markdownRenderer 接口注入第三方 Markdown 渲染能力。
---

# 第三方渲染器

如果你不想使用内置的 Markdown 渲染方式，可以通过 `markdownRenderer` 注入你自己的渲染器。

通常推荐把同一份渲染器同时注入到：

- `@mdanai/sdk/server`
- `@mdanai/sdk/elements`

这样服务端输出的 HTML 和默认 UI 的呈现规则会保持一致。

典型场景是接入 `marked` 这类现成库，或者复用你现有项目里的 Markdown 渲染规则。
