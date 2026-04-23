# Guestbook

Read recent messages and add a new signed-in guestbook entry.

<!-- agent:begin id="guestbook_page_prompt" -->
## Purpose
Write and read authenticated guestbook messages.

## Context
This page is the authenticated guestbook surface for the current signed-in user.

## Rules
Only the current allowed actions may be used to refresh messages, submit a new message, or sign out.

## Result
The returned surface should show the current session state, the latest guestbook messages, and the next allowed authenticated actions.
<!-- agent:end -->

::: block{id="session_status" trust="untrusted"}

::: block{id="messages" actions="refresh_messages" trust="untrusted"}

::: block{id="composer" actions="submit_message" trust="trusted"}

::: block{id="session_actions" actions="logout" trust="trusted"}
