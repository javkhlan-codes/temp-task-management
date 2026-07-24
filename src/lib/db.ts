import { neon } from "@neondatabase/serverless";
import type { Task } from "./types";

type TaskRow = {
  id: string;
  title: string;
  project_id: string;
  project: string;
  group_name: string;
  status: Task["status"];
  priority: Task["priority"];
  assignee: Task["assignee"];
  assignees?: Task["assignees"];
  parent_id?: string | null;
  due_date: string | Date;
  tags: string[];
  progress: number;
  description: string;
  custom_fields: Task["customFields"];
  archived: boolean;
  archived_at: string | Date | null;
  created_at: string | Date;
};

export function getDatabase() {
  const connectionString = process.env.DATABASE_URL;
  return connectionString ? neon(connectionString) : null;
}

export function rowToTask(row: TaskRow): Task {
  const dueDate =
    row.due_date instanceof Date
      ? [
          row.due_date.getFullYear(),
          String(row.due_date.getMonth() + 1).padStart(2, "0"),
          String(row.due_date.getDate()).padStart(2, "0"),
        ].join("-")
      : String(row.due_date).slice(0, 10);
  const createdAt =
    row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at);

  return {
    id: row.id,
    title: row.title,
    projectId: row.project_id,
    project: row.project,
    group: row.group_name,
    status: row.status,
    priority: row.priority,
    assignee: row.assignee,
    assignees:
      Array.isArray(row.assignees) && row.assignees.length
        ? row.assignees
        : [row.assignee],
    parentId: row.parent_id ?? null,
    dueDate,
    tags: row.tags ?? [],
    progress: row.progress,
    description: row.description ?? "",
    customFields: row.custom_fields ?? {},
    archived: row.archived ?? false,
    archivedAt:
      row.archived_at instanceof Date
        ? row.archived_at.toISOString()
        : row.archived_at
          ? String(row.archived_at)
          : null,
    createdAt,
  };
}
