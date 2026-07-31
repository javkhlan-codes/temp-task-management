import type {
  Task,
  TaskPriority,
  TaskStatus,
  WorkspaceUser,
} from "@/lib/types";

export const statusSurfaceClasses: Record<TaskStatus, string> = {
  "Not started":
    "bg-status-not-started/18 text-status-not-started-foreground",
  "Working on it": "bg-status-working/16 text-status-working-foreground",
  "In review": "bg-status-review/14 text-status-review-foreground",
  Done: "bg-status-done/14 text-status-done-foreground",
};

export const statusDotClasses: Record<TaskStatus, string> = {
  "Not started": "bg-status-not-started",
  "Working on it": "bg-status-working",
  "In review": "bg-status-review",
  Done: "bg-status-done",
};

export const statusSolidClasses: Record<TaskStatus, string> = {
  "Not started": "border-status-not-started bg-status-not-started text-white",
  "Working on it": "border-status-working bg-status-working text-white",
  "In review": "border-status-review bg-status-review text-white",
  Done: "border-status-done bg-status-done text-white",
};

export const priorityTextClasses: Record<TaskPriority, string> = {
  Low: "text-muted-foreground",
  Medium: "text-[#397bd4]",
  High: "text-[#d7841e]",
  Critical: "text-[#e54c66]",
};

export const priorityDotClasses: Record<TaskPriority, string> = {
  Low: "bg-[#a1a5b1]",
  Medium: "bg-[#4d8ce0]",
  High: "bg-[#e99a2e]",
  Critical: "bg-danger",
};

export function taskAssignees(task: Task): WorkspaceUser[] {
  return task.assignees?.length ? task.assignees : [task.assignee];
}
