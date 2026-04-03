import type { CreateTaskInput, TaskBuckets, TaskRecord } from "./task-types.js";

function nextTaskId(sequence: number): string {
  return `task-${sequence.toString(36)}`;
}

export function createTaskStore() {
  const tasks = new Map<string, TaskRecord>();
  let sequence = 1;

  function requireTask(id: string): TaskRecord {
    const task = tasks.get(id);
    if (!task) {
      throw new Error(`Unknown task "${id}".`);
    }
    return task;
  }

  function cloneTask(task: TaskRecord): TaskRecord {
    return {
      ...task,
      constraints: [...task.constraints],
      acceptanceCriteria: [...task.acceptanceCriteria],
      latestSubmission: task.latestSubmission ? { ...task.latestSubmission } : null,
      latestReviewNote: task.latestReviewNote ? { ...task.latestReviewNote } : null
    };
  }

  function save(task: TaskRecord): TaskRecord {
    tasks.set(task.id, task);
    return cloneTask(task);
  }

  return {
    create(input: CreateTaskInput): TaskRecord {
      const task: TaskRecord = {
        id: nextTaskId(sequence++),
        title: input.title,
        summary: input.summary,
        instruction: input.instruction,
        constraints: [...input.constraints],
        acceptanceCriteria: [...input.acceptanceCriteria],
        createdBy: input.createdBy,
        reviewerId: input.reviewerId,
        assigneeId: null,
        status: "open",
        latestSubmission: null,
        latestReviewNote: null
      };
      return save(task);
    },
    get(id: string): TaskRecord {
      return cloneTask(requireTask(id));
    },
    accept(id: string, actorId: string): TaskRecord {
      const task = requireTask(id);
      if (task.status !== "open") {
        throw new Error(`Task "${id}" is not open.`);
      }
      return save({
        ...task,
        status: "claimed",
        assigneeId: actorId,
        latestReviewNote: null
      });
    },
    submit(id: string, actorId: string, result: string): TaskRecord {
      const task = requireTask(id);
      if (task.status !== "claimed" && task.status !== "needs_revision") {
        throw new Error(`Task "${id}" cannot be submitted from state "${task.status}".`);
      }
      if (task.assigneeId && task.assigneeId !== actorId) {
        throw new Error(`Actor "${actorId}" is not the assignee for task "${id}".`);
      }
      return save({
        ...task,
        status: "submitted",
        latestSubmission: {
          result,
          submittedBy: actorId
        }
      });
    },
    requestRevision(id: string, actorId: string, note: string): TaskRecord {
      const task = requireTask(id);
      if (task.status !== "submitted") {
        throw new Error(`Task "${id}" is not awaiting review.`);
      }
      if (task.reviewerId !== actorId) {
        throw new Error(`Actor "${actorId}" is not the reviewer for task "${id}".`);
      }
      return save({
        ...task,
        status: "needs_revision",
        latestReviewNote: {
          note,
          reviewedBy: actorId
        }
      });
    },
    complete(id: string, actorId: string): TaskRecord {
      const task = requireTask(id);
      if (task.status !== "submitted") {
        throw new Error(`Task "${id}" is not awaiting review.`);
      }
      if (task.reviewerId !== actorId) {
        throw new Error(`Actor "${actorId}" is not the reviewer for task "${id}".`);
      }
      return save({
        ...task,
        status: "completed"
      });
    },
    listForAgent(agentId: string): TaskBuckets {
      const allTasks = [...tasks.values()].map(cloneTask);
      return {
        waitingForYou: allTasks.filter((task) => task.status === "submitted" && task.reviewerId === agentId),
        inProgress: allTasks.filter(
          (task) => (task.status === "claimed" || task.status === "needs_revision") && task.assigneeId === agentId
        ),
        available: allTasks.filter((task) => task.status === "open"),
        completed: allTasks.filter((task) => task.status === "completed")
      };
    }
  };
}
