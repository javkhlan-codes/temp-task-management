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
  | "deleteProject"
  | "commentTask"
  | "uploadAttachment";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Админ",
  manager: "Менежер",
  member: "Гишүүн",
  guest: "Зочин",
  viewer: "Ажиглагч",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: "Workspace, хэрэглэгч, тохиргоог бүрэн удирдана.",
  manager: "Таск, хуваарилалт, багана, архивыг удирдана.",
  member: "Таск үүсгэж, өөрт хуваарилагдсан ажлыг шинэчилнэ.",
  guest: "Зөвхөн хуваалцсан төсөлдөө хамтран ажиллана.",
  viewer: "Workspace-ийн мэдээллийг зөвхөн уншина.",
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
    "commentTask",
    "uploadAttachment",
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
    "commentTask",
    "uploadAttachment",
  ]),
  member: new Set([
    "createTask",
    "editOwnTask",
    "commentTask",
    "uploadAttachment",
  ]),
  guest: new Set(["commentTask", "uploadAttachment"]),
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
  return user.active && (canEditTask(user, task) || ["guest", "viewer"].includes(user.role));
}

export function canAccessEveryProject(user: WorkspaceUser): boolean {
  return user.role === "admin" || user.role === "manager";
}
