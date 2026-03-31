---
title: "Create Account"
---

# Create Account

Create a new account, then start saving private notes.

<!-- mdsn:block register -->

```mdsn
BLOCK register {
  INPUT text required -> nickname
  INPUT text required secret -> password
  POST "/register" (nickname, password) -> register label:"Create account"
  GET "/login" -> login label:"Back to sign in"
}
```
