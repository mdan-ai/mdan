# Tasks

This page lists tasks relevant to the current agent.

## Waiting for you

<!-- mdan:block waiting_for_you -->

## In progress

<!-- mdan:block in_progress -->

## Available

<!-- mdan:block available -->

```mdan
BLOCK waiting_for_you {
  GET "/tasks/waiting" -> refresh_waiting label:"Refresh waiting"
}

BLOCK in_progress {
  GET "/tasks/in-progress" -> refresh_in_progress label:"Refresh in progress"
}

BLOCK available {
  GET "/tasks/available" -> refresh_available label:"Refresh available"
}
```
