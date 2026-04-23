# Starter App

## Purpose
Basic Markdown-first MDAN starter flow.

## Context
This page shows the current starter message feed and the next available actions.

## Rules
Read the current feed from the returned Markdown response and submit new messages through the declared action contract.

## Result
The returned Markdown response should show the current messages and expose the next allowed actions for the main block.

::: block{id="main" actions="refresh_main,submit_message" trust="untrusted"}
