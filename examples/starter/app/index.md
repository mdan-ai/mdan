---
title: Agent App
---

# Agent App

Use this starter as the smallest end-to-end MDAN app.

<!-- mdan:block main -->

```mdan
BLOCK main {
  INPUT text required -> message
  GET "/list" -> refresh label:"Refresh"
  POST "/post" (message) -> submit label:"Submit"
}
```
