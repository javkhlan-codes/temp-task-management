import { randomUUID } from "node:crypto";
import type { getDatabase } from "./db";

type SqlClient = NonNullable<ReturnType<typeof getDatabase>>;

export async function notifyUsers(
  sql: SqlClient,
  {
    workspaceId,
    userIds,
    actorId,
    taskId,
    type,
    title,
    body = "",
  }: {
    workspaceId: string;
    userIds: string[];
    actorId: string;
    taskId?: string | null;
    type: string;
    title: string;
    body?: string;
  },
) {
  const recipients = Array.from(new Set(userIds)).filter(
    (userId) => userId && userId !== actorId,
  );

  for (const userId of recipients) {
    await sql`
      INSERT INTO notifications (
        id, workspace_id, user_id, actor_id, task_id, type, title, body
      )
      SELECT
        ${randomUUID()}, ${workspaceId}, workspace_members.user_id,
        ${actorId}, ${taskId ?? null}, ${type}, ${title}, ${body}
      FROM workspace_members
      WHERE workspace_members.workspace_id = ${workspaceId}
        AND workspace_members.user_id = ${userId}
        AND workspace_members.active = TRUE
    `;
  }
}
