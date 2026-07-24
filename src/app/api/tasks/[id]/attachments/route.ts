import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getActor, getWorkspaceId } from "@/lib/api-auth";
import { getDatabase } from "@/lib/db";
import { notifyUsers } from "@/lib/notifications";
import { hasPermission } from "@/lib/permissions";
import { getTaskAccessContext } from "@/lib/task-access";
import type { TaskAttachment } from "@/lib/types";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 3 * 1024 * 1024;

type RouteContext = {
  params: Promise<{ id: string }>;
};

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
    if (!hasPermission(actor, "uploadAttachment")) {
      return NextResponse.json(
        { error: "Your role cannot attach files" },
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
      fileName?: string;
      mimeType?: string;
      data?: string;
    };
    const fileName = (payload.fileName ?? "")
      .split(/[\\/]/)
      .pop()
      ?.trim()
      .slice(0, 240);
    const mimeType = (payload.mimeType || "application/octet-stream").slice(0, 160);
    const data = payload.data ?? "";
    if (!fileName || !data) {
      return NextResponse.json(
        { error: "File name and content are required" },
        { status: 400 },
      );
    }
    const content = Buffer.from(data, "base64");
    if (!content.length || content.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Attachments must be smaller than 3 MB" },
        { status: 413 },
      );
    }
    const attachmentId = randomUUID();
    await sql`
      INSERT INTO task_attachments (
        id, task_id, uploader_id, file_name, mime_type, file_size, content
      )
      VALUES (
        ${attachmentId}, ${id}, ${actor.id}, ${fileName}, ${mimeType},
        ${content.length}, DECODE(${content.toString("base64")}, 'base64')
      )
    `;
    await sql`
      INSERT INTO activity_logs (
        workspace_id, project_id, task_id, actor_id, event_type, payload
      )
      VALUES (
        ${workspaceId}, ${task.projectId}, ${id}, ${actor.id},
        'task.attachment_added',
        ${JSON.stringify({ fileName, fileSize: content.length })}::jsonb
      )
    `;
    await notifyUsers(sql, {
      workspaceId,
      userIds: task.assigneeIds,
      actorId: actor.id,
      taskId: id,
      type: "task.attachment_added",
      title: `${actor.name} attached a file`,
      body: `${task.title}: ${fileName}`,
    });

    const attachment: TaskAttachment = {
      id: attachmentId,
      taskId: id,
      fileName,
      mimeType,
      fileSize: content.length,
      uploader: actor,
      createdAt: new Date().toISOString(),
    };
    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    console.error("Unable to attach file", error);
    return NextResponse.json({ error: "Unable to attach file" }, { status: 500 });
  }
}
