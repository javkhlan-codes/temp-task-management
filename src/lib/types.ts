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
export const USER_ROLES = ["admin", "manager", "member", "viewer"] as const;

export type TaskStatus = (typeof STATUSES)[number];
export type TaskPriority = (typeof PRIORITIES)[number];
export type ViewMode = "list" | "board" | "calendar";
export type CustomColumnType = (typeof CUSTOM_COLUMN_TYPES)[number];
export type CustomFieldValue = string | number | boolean | string[] | null;
export type UserRole = (typeof USER_ROLES)[number];

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
