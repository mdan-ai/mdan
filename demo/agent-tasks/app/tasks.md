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
  GET refresh_waiting "/tasks/waiting" LABEL "Refresh waiting"
}

BLOCK in_progress {
  GET refresh_in_progress "/tasks/in-progress" LABEL "Refresh in progress"
}

BLOCK available {
  GET refresh_available "/tasks/available" LABEL "Refresh available"
}
```
