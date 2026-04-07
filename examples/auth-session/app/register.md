---
title: "Create Account"
---

# Create Account

Create a new account, then start saving private notes.

<!-- mdan:block register -->

```mdan
BLOCK register {
  INPUT nickname:text required
  INPUT password:text required secret
  POST register "/register" WITH nickname, password LABEL "Create account"
  GET login "/login" LABEL "Back to sign in"
}
```
