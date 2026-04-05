---
title: Guestbook
---

# Guestbook

Use this starter as the smallest end-to-end MDAN app on Express.

<!-- mdan:block guestbook -->

```mdan
BLOCK guestbook {
  INPUT text required -> message
  GET "/list" -> refresh label:"Refresh"
  POST "/post" (message) -> submit label:"Submit"
}
```
