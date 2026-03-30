---
title: Guestbook
---

# Guestbook

Use this starter as the smallest end-to-end MDSN app. Edit this page, change the block name if you want, and keep the server logic thin.

<!-- mdsn:block guestbook -->

```mdsn
BLOCK guestbook {
  INPUT text required -> message
  GET "/list" -> refresh label:"Refresh"
  POST "/post" (message) -> submit label:"Submit"
}
```
