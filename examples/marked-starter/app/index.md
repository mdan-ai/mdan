---
title: "Marked Starter"
---

# Marked Starter

A **shared** log rendered through a third-party Markdown engine.

<!-- mdan:block main -->

```mdan
BLOCK main {
  INPUT text required -> message
  GET "/list" -> refresh label:"Refresh"
  POST "/post" (message) -> submit label:"Submit"
}
```
