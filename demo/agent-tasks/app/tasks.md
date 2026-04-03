# Tasks

This page lists tasks relevant to the current agent.

## Waiting for you

<!-- mdsn:block waiting_for_you -->

## In progress

<!-- mdsn:block in_progress -->

## Available

<!-- mdsn:block available -->

```mdsn
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
