---
title: Guestbook
---

# Guestbook

This React starter keeps React as the host shell while MDSN continues to drive the page and block protocol.

<!-- mdsn:block guestbook -->

```mdsn
BLOCK guestbook {
  INPUT text required -> message
  GET "/list" -> refresh label:"Refresh"
  POST "/post" (message) -> submit label:"Submit"
}
```
