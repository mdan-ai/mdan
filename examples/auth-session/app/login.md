---
title: "Sign In"
---

# Sign In

Access your private vault with your existing account.

<!-- mdan:block login -->

```mdan
BLOCK login {
  INPUT nickname:text required
  INPUT password:text required secret
  POST login "/login" WITH nickname, password LABEL "Sign In"
  GET register "/register" LABEL "Create account"
}
```
