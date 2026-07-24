export const STATUSES = ["Not started", "Working on it", "In review", "Done"] as const;
export const PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;
export const CUSTOM_COLUMN_TYPES = [
  "text",
  "number",
  "date",
  "status",
  "person",
  "dropdown",
  "checkbox",
  "progress",
  "tags",
] as const;
export const USER_ROLES = [
  "admin",
  "manager",
  "member",
  "guest",
  "viewer",
] as const;

export type TaskStatus = (typeof STATUSES)[number];
export type TaskPriority = (typeof PRIORITIES)[number];
export type ViewMode = "list" | "board" | "calendar" | "timeline" | "dashboard";
export type CustomColumnType = (typeof CUSTOM_COLUMN_TYPES)[number];
export type CustomFieldValue = string | number | boolean | string[] | null;
export type UserRole = (typeof USER_ROLES)[number];
export type TaskRecurrence = "none" | "daily" | "weekly" | "monthly";

export const STATUS_LABELS: Record<TaskStatus, string> = {
  "Not started": "Эхлээгүй",
  "Working on it": "Хийгдэж байна",
  "In review": "Хяналтад",
  Done: "Дууссан",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  Low: "Бага",
  Medium: "Дунд",
  High: "Өндөр",
  Critical: "Нэн чухал",
};

export function groupLabel(group: string) {
  const labels: Record<string, string> = {
    "This week": "Энэ долоо хоног",
    Upcoming: "Удахгүй",
    Completed: "Дууссан",
  };
  return labels[group] ?? group;
}

export type CustomColumn = {
  id: string;
  projectId: string;
  name: string;
  type: CustomColumnType;
  options: string[];
  position: number;
  createdAt: string;
};

export type Person = {
  id: string;
  name: string;
  email: string;
  initials: string;
  tone: string;
  role: UserRole;
  active: boolean;
};

export type WorkspaceUser = Person;

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: UserRole;
  createdAt: string;
};

export type Project = {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  description: string;
  ownerId: string;
  memberIds: string[];
  archived: boolean;
  archivedAt: string | null;
  taskCount: number;
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  title: string;
  projectId: string;
  project: string;
  group: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: Person;
  assignees?: Person[];
  parentId?: string | null;
  dependencyIds?: string[];
  recurrence?: TaskRecurrence;
  dueDate: string;
  tags: string[];
  progress: number;
  description: string;
  customFields: Record<string, CustomFieldValue>;
  archived?: boolean;
  archivedAt?: string | null;
  createdAt: string;
};

export type TaskDraft = Omit<Task, "id" | "createdAt">;

export type TaskComment = {
  id: string;
  taskId: string;
  body: string;
  author: WorkspaceUser;
  mentionIds: string[];
  editedAt: string | null;
  createdAt: string;
};

export type TaskAttachment = {
  id: string;
  taskId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploader: WorkspaceUser;
  createdAt: string;
};

export type ActivityEntry = {
  id: string;
  taskId: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  actor: WorkspaceUser | null;
  createdAt: string;
};

export type WorkspaceNotification = {
  id: string;
  taskId: string | null;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  actor: WorkspaceUser | null;
};
