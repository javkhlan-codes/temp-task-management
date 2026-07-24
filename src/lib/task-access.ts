import type { getDatabase } from "./db";
import { canAccessEveryProject } from "./permissions";
import type { WorkspaceUser } from "./types";

type SqlClient = NonNullable<ReturnType<typeof getDatabase>>;

export type TaskAccessContext = {
  id: string;
  title: string;
  projectId: string;
  assigneeIds: string[];
};

export async function getTaskAccessContext(
  sql: SqlClient,
  taskId: string,
  workspaceId: string,
  actor: WorkspaceUser,
): Promise<TaskAccessContext | null> {
  const unrestricted = canAccessEveryProject(actor);
  const rows = await sql`
    SELECT
      tasks.id,
      tasks.title,
      tasks.project_id,
      COALESCE(
        ARRAY(
          SELECT task_assignees.user_id
          FROM task_assignees
          WHERE task_assignees.task_id = tasks.id
        ),
        ARRAY[]::text[]
      ) AS assignee_ids
    FROM tasks
    JOIN projects ON projects.id = tasks.project_id
    WHERE tasks.id = ${taskId}
      AND projects.workspace_id = ${workspaceId}
      AND (
        ${unrestricted}
        OR EXISTS (
          SELECT 1
          FROM project_members
          WHERE project_members.project_id = projects.id
            AND project_members.user_id = ${actor.id}
        )
      )
    LIMIT 1
  `;

  if (!rows.length) return null;
  return {
    id: String(rows[0].id),
    title: String(rows[0].title),
    projectId: String(rows[0].project_id),
    assigneeIds: Array.isArray(rows[0].assignee_ids)
      ? rows[0].assignee_ids.map(String)
      : [],
  };
}
