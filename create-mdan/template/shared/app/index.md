---
title: "Agent App"
---

# Agent App

Use this starter as the smallest end-to-end MDAN app.

<!-- mdan:block main -->

```mdan
BLOCK main {
  INPUT message:text required
  GET refresh "/list" LABEL "Refresh"
  POST submit "/post" WITH message LABEL "Submit"
}
```
