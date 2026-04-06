---
title: Vue Starter
---

# Vue Starter

This Vue starter keeps Vue as the host shell while MDAN continues to drive page and block behavior.

<!-- mdan:block main -->

```mdan
BLOCK main {
  INPUT text required -> message
  GET "/list" -> refresh label:"Refresh"
  POST "/post" (message) -> submit label:"Submit"
}
```
