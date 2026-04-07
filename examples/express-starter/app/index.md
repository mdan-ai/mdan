---
title: Guestbook
---

# Guestbook

Use this starter as the smallest end-to-end MDAN app on Express.

<!-- mdan:block guestbook -->

```mdan
BLOCK guestbook {
  INPUT message:text required
  GET refresh "/list" LABEL "Refresh"
  POST submit "/post" WITH message LABEL "Submit"
}
```
