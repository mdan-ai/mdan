import { describe, expect, it } from "vitest";

import { createTaskStore } from "../../../demo/agent-tasks/app/task-store.js";

describe("agent task store", () => {
  it("creates tasks and advances through the handoff workflow", () => {
    const store = createTaskStore();

    const task = store.create({
      title: "Implement sort_numbers",
      summary: "Write a Rust function that sorts integers in ascending order.",
      instruction: "Write a Rust function named sort_numbers.",
      constraints: ["Handle empty input", "Preserve duplicates"],
      acceptanceCriteria: ["Return ascending order", "Match the required function signature"],
      createdBy: "agent-a",
      reviewerId: "agent-a"
    });

    expect(task.status).toBe("open");

    const claimed = store.accept(task.id, "agent-b");
    expect(claimed.status).toBe("claimed");
    expect(claimed.assigneeId).toBe("agent-b");

    const submitted = store.submit(task.id, "agent-b", "fn sort_numbers(...) -> ...");
    expect(submitted.status).toBe("submitted");
    expect(submitted.latestSubmission?.result).toContain("sort_numbers");

    const revision = store.requestRevision(task.id, "agent-a", "Please handle duplicate values explicitly.");
    expect(revision.status).toBe("needs_revision");
    expect(revision.latestReviewNote?.note).toContain("duplicate");

    const resubmitted = store.submit(task.id, "agent-b", "fn sort_numbers(nums: Vec<i32>) -> Vec<i32> { nums }");
    expect(resubmitted.status).toBe("submitted");

    const completed = store.complete(task.id, "agent-a");
    expect(completed.status).toBe("completed");
  });

  it("buckets tasks by what the current agent should do next", () => {
    const store = createTaskStore();

    const available = store.create({
      title: "Available task",
      summary: "Open task",
      instruction: "Do the thing.",
      constraints: [],
      acceptanceCriteria: [],
      createdBy: "agent-a",
      reviewerId: "agent-a"
    });
    const inProgress = store.create({
      title: "Assigned task",
      summary: "Claimed task",
      instruction: "Do the second thing.",
      constraints: [],
      acceptanceCriteria: [],
      createdBy: "agent-a",
      reviewerId: "agent-a"
    });
    const awaitingReview = store.create({
      title: "Review task",
      summary: "Submitted task",
      instruction: "Review the work.",
      constraints: [],
      acceptanceCriteria: [],
      createdBy: "agent-a",
      reviewerId: "agent-a"
    });

    store.accept(inProgress.id, "agent-b");
    store.accept(awaitingReview.id, "agent-b");
    store.submit(awaitingReview.id, "agent-b", "result");

    const agentAView = store.listForAgent("agent-a");
    const agentBView = store.listForAgent("agent-b");

    expect(agentAView.available.map((task) => task.id)).toContain(available.id);
    expect(agentAView.waitingForYou.map((task) => task.id)).toContain(awaitingReview.id);
    expect(agentBView.inProgress.map((task) => task.id)).toContain(inProgress.id);
  });
});
