import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getActor, getWorkspaceId, rowToUser } from "@/lib/api-auth";
import { getDatabase } from "@/lib/db";
import { notifyUsers } from "@/lib/notifications";
import { hasPermission } from "@/lib/permissions";
import { getTaskAccessContext } from "@/lib/task-access";
import type {
  ActivityEntry,
  TaskAttachment,
  TaskComment,
} from "@/lib/types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function toIso(value: string | Date | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

export async function GET(request: Request, context: RouteContext) {
  const sql = getDatabase();
  if (!sql) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  try {
    const actor = await getActor(request, sql);
    if (!actor) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const { id } = await context.params;
    const workspaceId = getWorkspaceId(request);
    const task = await getTaskAccessContext(sql, id, workspaceId, actor);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const [commentRows, attachmentRows, activityRows] = await Promise.all([
      sql`
        SELECT
          task_comments.id,
          task_comments.task_id,
          task_comments.body,
          task_comments.mention_ids,
          task_comments.edited_at,
          task_comments.created_at,
          users.id AS author_id,
          users.name AS author_name,
          users.email AS author_email,
          users.initials AS author_initials,
          users.tone AS author_tone,
          workspace_members.role AS author_role,
          workspace_members.active AS author_active
        FROM task_comments
        JOIN users ON users.id = task_comments.author_id
        JOIN workspace_members
          ON workspace_members.user_id = users.id
          AND workspace_members.workspace_id = ${workspaceId}
        WHERE task_comments.task_id = ${id}
        ORDER BY task_comments.created_at ASC
      `,
      sql`
        SELECT
          task_attachments.id,
          task_attachments.task_id,
          task_attachments.file_name,
          task_attachments.mime_type,
          task_attachments.file_size,
          task_attachments.created_at,
          users.id AS uploader_id,
          users.name AS uploader_name,
          users.email AS uploader_email,
          users.initials AS uploader_initials,
          users.tone AS uploader_tone,
          workspace_members.role AS uploader_role,
          workspace_members.active AS uploader_active
        FROM task_attachments
        JOIN users ON users.id = task_attachments.uploader_id
        JOIN workspace_members
          ON workspace_members.user_id = users.id
          AND workspace_members.workspace_id = ${workspaceId}
        WHERE task_attachments.task_id = ${id}
        ORDER BY task_attachments.created_at DESC
      `,
      sql`
        SELECT
          activity_logs.id,
          activity_logs.task_id,
          activity_logs.event_type,
          activity_logs.payload,
          activity_logs.created_at,
          users.id AS actor_id,
          users.name AS actor_name,
          users.email AS actor_email,
          users.initials AS actor_initials,
          users.tone AS actor_tone,
          workspace_members.role AS actor_role,
          workspace_members.active AS actor_active
        FROM activity_logs
        LEFT JOIN users ON users.id = activity_logs.actor_id
        LEFT JOIN workspace_members
          ON workspace_members.user_id = users.id
          AND workspace_members.workspace_id = ${workspaceId}
        WHERE activity_logs.task_id = ${id}
          AND activity_logs.workspace_id = ${workspaceId}
        ORDER BY activity_logs.created_at DESC
        LIMIT 50
      `,
    ]);

    const comments: TaskComment[] = commentRows.map((row) => ({
      id: String(row.id),
      taskId: String(row.task_id),
      body: String(row.body),
      mentionIds: Array.isArray(row.mention_ids)
        ? row.mention_ids.map(String)
        : [],
      editedAt: toIso(row.edited_at),
      createdAt: toIso(row.created_at) ?? new Date().toISOString(),
      author: rowToUser({
        id: String(row.author_id),
        name: String(row.author_name),
        email: String(row.author_email),
        initials: String(row.author_initials),
        tone: String(row.author_tone),
        role: row.author_role as never,
        active: Boolean(row.author_active),
      }),
    }));

    const attachments: TaskAttachment[] = attachmentRows.map((row) => ({
      id: String(row.id),
      taskId: String(row.task_id),
      fileName: String(row.file_name),
      mimeType: String(row.mime_type),
      fileSize: Number(row.file_size),
      createdAt: toIso(row.created_at) ?? new Date().toISOString(),
      uploader: rowToUser({
        id: String(row.uploader_id),
        name: String(row.uploader_name),
        email: String(row.uploader_email),
        initials: String(row.uploader_initials),
        tone: String(row.uploader_tone),
        role: row.uploader_role as never,
        active: Boolean(row.uploader_active),
      }),
    }));

    const activity: ActivityEntry[] = activityRows.map((row) => ({
      id: String(row.id),
      taskId: row.task_id ? String(row.task_id) : null,
      eventType: String(row.event_type),
      payload:
        row.payload && typeof row.payload === "object"
          ? (row.payload as Record<string, unknown>)
          : {},
      createdAt: toIso(row.created_at) ?? new Date().toISOString(),
      actor: row.actor_id
        ? rowToUser({
            id: String(row.actor_id),
            name: String(row.actor_name),
            email: String(row.actor_email),
            initials: String(row.actor_initials),
            tone: String(row.actor_tone),
            role: row.actor_role as never,
            active: Boolean(row.actor_active),
          })
        : null,
    }));

    return NextResponse.json({ comments, attachments, activity });
  } catch (error) {
    console.error("Unable to load task collaboration", error);
    return NextResponse.json(
      { error: "Unable to load task collaboration" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const sql = getDatabase();
  if (!sql) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  try {
    const actor = await getActor(request, sql);
    if (!actor) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (!hasPermission(actor, "commentTask")) {
      return NextResponse.json(
        { error: "Your role cannot comment on tasks" },
        { status: 403 },
      );
    }
    const { id } = await context.params;
    const workspaceId = getWorkspaceId(request);
    const task = await getTaskAccessContext(sql, id, workspaceId, actor);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    const payload = (await request.json()) as {
      body?: string;
      mentionIds?: string[];
    };
    const body = payload.body?.trim() ?? "";
    if (!body || body.length > 5000) {
      return NextResponse.json(
        { error: "Comment must contain between 1 and 5000 characters" },
        { status: 400 },
      );
    }

    const requestedMentions = Array.from(
      new Set((payload.mentionIds ?? []).map(String)),
    ).slice(0, 25);
    const mentionRows = requestedMentions.length
      ? await sql`
          SELECT workspace_members.user_id
          FROM workspace_members
          JOIN project_members
            ON project_members.user_id = workspace_members.user_id
            AND project_members.project_id = ${task.projectId}
          WHERE workspace_members.workspace_id = ${workspaceId}
            AND workspace_members.user_id = ANY(${requestedMentions}::text[])
            AND workspace_members.active = TRUE
        `
      : [];
    const mentionIds = mentionRows.map((row) => String(row.user_id));
    const commentId = randomUUID();
    await sql`
      INSERT INTO task_comments (
        id, task_id, author_id, body, mention_ids
      )
      VALUES (
        ${commentId}, ${id}, ${actor.id}, ${body}, ${mentionIds}
      )
    `;
    await sql`
      INSERT INTO activity_logs (
        workspace_id, project_id, task_id, actor_id, event_type, payload
      )
      VALUES (
        ${workspaceId}, ${task.projectId}, ${id}, ${actor.id},
        'task.commented',
        ${JSON.stringify({ preview: body.slice(0, 160) })}::jsonb
      )
    `;
    await notifyUsers(sql, {
      workspaceId,
      userIds: [...task.assigneeIds, ...mentionIds],
      actorId: actor.id,
      taskId: id,
      type: mentionIds.length ? "task.mentioned" : "task.commented",
      title: mentionIds.length
        ? `${actor.name} mentioned you`
        : `${actor.name} commented`,
      body: `${task.title}: ${body.slice(0, 180)}`,
    });

    const comment: TaskComment = {
      id: commentId,
      taskId: id,
      body,
      author: actor,
      mentionIds,
      editedAt: null,
      createdAt: new Date().toISOString(),
    };
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("Unable to add task comment", error);
    return NextResponse.json({ error: "Unable to add comment" }, { status: 500 });
  }
}
