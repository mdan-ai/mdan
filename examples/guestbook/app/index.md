---
title: "Guestbook"
---

# Guestbook

Leave a short message and refresh the block to see the latest entries.

<!-- mdan:block guestbook -->

```mdan
BLOCK guestbook {
  INPUT message:text required
  GET refresh "/list" LABEL "Refresh"
  POST submit "/post" WITH message LABEL "Submit"
}
```
