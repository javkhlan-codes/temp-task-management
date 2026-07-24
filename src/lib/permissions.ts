import type { Task, UserRole, WorkspaceUser } from "./types";

export type Permission =
  | "createTask"
  | "editAnyTask"
  | "editOwnTask"
  | "deleteTask"
  | "archiveTask"
  | "manageColumns"
  | "manageUsers"
  | "assignTasks"
  | "createProject"
  | "editProject"
  | "archiveProject"
  | "deleteProject";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Manager",
  member: "Member",
  viewer: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: "Full workspace, user, and configuration access.",
  manager: "Manages tasks, assignments, columns, and archives.",
  member: "Creates tasks and edits work assigned to them.",
  viewer: "Read-only access to workspace tasks.",
};

const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<Permission>> = {
  admin: new Set([
    "createTask",
    "editAnyTask",
    "editOwnTask",
    "deleteTask",
    "archiveTask",
    "manageColumns",
    "manageUsers",
    "assignTasks",
    "createProject",
    "editProject",
    "archiveProject",
    "deleteProject",
  ]),
  manager: new Set([
    "createTask",
    "editAnyTask",
    "editOwnTask",
    "archiveTask",
    "manageColumns",
    "assignTasks",
    "createProject",
    "editProject",
    "archiveProject",
  ]),
  member: new Set(["createTask", "editOwnTask"]),
  viewer: new Set(),
};

export function hasPermission(
  user: WorkspaceUser,
  permission: Permission,
): boolean {
  return user.active && ROLE_PERMISSIONS[user.role].has(permission);
}

export function canEditTask(user: WorkspaceUser, task: Task): boolean {
  const assignees = task.assignees?.length ? task.assignees : [task.assignee];
  return (
    hasPermission(user, "editAnyTask") ||
    (hasPermission(user, "editOwnTask") &&
      assignees.some((assignee) => assignee.id === user.id))
  );
}

export function canOpenTask(user: WorkspaceUser, task: Task): boolean {
  return canEditTask(user, task) || user.role === "viewer";
}
