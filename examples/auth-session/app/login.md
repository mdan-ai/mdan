---
title: "Sign In"
---

# Sign In

Access your private vault with your existing account.

<!-- mdan:block login -->

```mdan
BLOCK login {
  INPUT text required -> nickname
  INPUT text required secret -> password
  POST "/login" (nickname, password) -> login label:"Sign In"
  GET "/register" -> register label:"Create account"
}
```
