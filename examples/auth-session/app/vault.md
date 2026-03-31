---
title: "Vault"
---

# Vault

Private notes follow your session. Open `/login` to sign in if this page is locked.

<!-- mdsn:block session -->

<!-- mdsn:block vault -->

```mdsn
BLOCK session {
  POST "/vault/logout" () -> logout label:"Log Out"
}

BLOCK vault {
  INPUT text required -> message
  POST "/vault" (message) -> save label:"Save Note"
}
```
