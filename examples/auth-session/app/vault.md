---
title: "Vault"
---

# Vault

Private notes follow your session. Open `/login` to sign in if this page is locked.

<!-- mdan:block session -->

<!-- mdan:block vault -->

```mdan
BLOCK session {
  POST logout "/vault/logout" LABEL "Log Out"
}

BLOCK vault {
  INPUT message:text required
  POST save "/vault" WITH message LABEL "Save Note"
}
```
