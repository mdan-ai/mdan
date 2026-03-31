---
title: "Agent App"
---

# Agent App

Use this starter as the smallest end-to-end MDSN app.

<!-- mdsn:block main -->

```mdsn
BLOCK main {
  INPUT text required -> message
  GET "/list" -> refresh label:"Refresh"
  POST "/post" (message) -> submit label:"Submit"
}
```
