---
title: Guestbook
---

# Guestbook

Use this starter as the smallest end-to-end MDSN app on Express.

<!-- mdsn:block guestbook -->

```mdsn
BLOCK guestbook {
  INPUT text required -> message
  GET "/list" -> refresh label:"Refresh"
  POST "/post" (message) -> submit label:"Submit"
}
```
