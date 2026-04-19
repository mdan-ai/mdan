# Register

Create a new account to start an authenticated guestbook session.

<!-- agent:begin id="register_page_prompt" -->
## Purpose
Create a new account for your guestbook session.

## Context
This page is the account-creation entry point for the authenticated guestbook flow.

## Rules
Users must register through the declared register action or navigate back to sign in through the declared page action.

## Result
The returned surface should either keep the user on this page with a registration status update or transition to the guestbook route.
<!-- agent:end -->

::: block{id="register_status" trust="untrusted"}
:::

::: block{id="register" actions="register,open_login" trust="trusted"}
:::
