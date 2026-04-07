---
title: React Starter
---

# React Starter

This React starter keeps React as the host shell while MDAN continues to drive page and block behavior.

<!-- mdan:block main -->

```mdan
BLOCK main {
  INPUT message:text required
  GET refresh "/list" LABEL "Refresh"
  POST submit "/post" WITH message LABEL "Submit"
}
```
