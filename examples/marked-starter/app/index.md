---
title: "Marked Starter"
---

# Marked Starter

A **shared** log rendered through a third-party Markdown engine.

<!-- mdan:block main -->

```mdan
BLOCK main {
  INPUT message:text required
  GET refresh "/list" LABEL "Refresh"
  POST submit "/post" WITH message LABEL "Submit"
}
```
