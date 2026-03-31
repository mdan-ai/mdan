---
title: React Starter
---

# React Starter

This React starter keeps React as the host shell while MDSN continues to drive the page and block protocol.

<!-- mdsn:block main -->

```mdsn
BLOCK main {
  INPUT text required -> message
  GET "/list" -> refresh label:"Refresh"
  POST "/post" (message) -> submit label:"Submit"
}
```
