export type TaskStatus = "open" | "claimed" | "submitted" | "needs_revision" | "completed";

export interface TaskSubmission {
  result: string;
  submittedBy: string;
}

export interface TaskReviewNote {
  note: string;
  reviewedBy: string;
}

export interface TaskRecord {
  id: string;
  title: string;
  summary: string;
  instruction: string;
  constraints: string[];
  acceptanceCriteria: string[];
  createdBy: string;
  reviewerId: string;
  assigneeId: string | null;
  status: TaskStatus;
  latestSubmission: TaskSubmission | null;
  latestReviewNote: TaskReviewNote | null;
}

export interface CreateTaskInput {
  title: string;
  summary: string;
  instruction: string;
  constraints: string[];
  acceptanceCriteria: string[];
  createdBy: string;
  reviewerId: string;
}

export interface TaskBuckets {
  waitingForYou: TaskRecord[];
  inProgress: TaskRecord[];
  available: TaskRecord[];
  completed: TaskRecord[];
}
