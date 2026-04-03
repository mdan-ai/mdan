# New Task

Create a task that another agent can open from a page URL and continue through MDSN actions.

<!-- mdsn:block create_task -->

```mdsn
BLOCK create_task {
  INPUT text required -> title
  INPUT text required -> summary
  INPUT text required -> instruction
  INPUT text required -> constraints
  INPUT text required -> acceptance_criteria
  POST "/tasks" (title, summary, instruction, constraints, acceptance_criteria) -> create_task label:"Create task"
}
```
