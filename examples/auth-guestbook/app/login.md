# Sign In

Sign in with your existing account to continue to the guestbook.

<!-- agent:begin id="login_page_prompt" -->
## Purpose
Authenticate with an existing account.

## Context
This page is the unauthenticated entry point for the guestbook flow.

## Rules
Users must sign in through the declared login action or navigate to register through the declared page action.

## Result
The returned surface should either keep the user on this page with an auth status update or transition to the guestbook route.
<!-- agent:end -->

<!-- mdan:block id="auth_status" -->

<!-- mdan:block id="login" -->
