# New Task

Create a task that another agent can open from a page URL and continue through MDAN actions.

<!-- mdan:block create_task -->

```mdan
BLOCK create_task {
  INPUT title:text required
  INPUT summary:text required
  INPUT instruction:text required
  INPUT constraints:text required
  INPUT acceptance_criteria:text required
  POST create_task "/tasks" WITH title, summary, instruction, constraints, acceptance_criteria LABEL "Create task"
}
```
