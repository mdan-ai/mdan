---
title: Guestbook
---

# Guestbook

A tiny shared wall for quick notes, feedback, and experiments while we shape the MDSN default experience.

<!-- mdsn:block guestbook -->

```mdsn
BLOCK guestbook {
  INPUT text required -> message
  GET "/list" -> refresh label:"Refresh"
  POST "/post" (message) -> submit label:"Submit"
}
```
