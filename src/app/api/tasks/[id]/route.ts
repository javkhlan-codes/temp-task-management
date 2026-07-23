import { NextResponse } from "next/server";
import { authorize, getActor, getWorkspaceId } from "@/lib/api-auth";
import { getDatabase } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import type { Task } from "@/lib/types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const sql = getDatabase();
  if (!sql) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  try {
    const { id } = await context.params;
    const task = (await request.json()) as Task;
    if (!task.title?.trim()) {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 });
    }
    const actor = await getActor(request, sql);
    if (!actor) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const workspaceId = getWorkspaceId(request);
    const existingRows = await sql`
      SELECT tasks.assignee, tasks.archived, tasks.project_id
      FROM tasks
      JOIN projects ON projects.id = tasks.project_id
      WHERE tasks.id = ${id} AND projects.workspace_id = ${workspaceId}
      LIMIT 1
    `;
    if (!existingRows.length) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    const existing = existingRows[0] as {
      assignee: Task["assignee"];
      archived: boolean;
      project_id: string;
    };
    const canEdit =
      hasPermission(actor, "editAnyTask") ||
      (hasPermission(actor, "editOwnTask") && existing.assignee.id === actor.id);
    if (!canEdit) {
      return NextResponse.json(
        { error: "You cannot edit this task" },
        { status: 403 },
      );
    }
    if (
      existing.archived !== Boolean(task.archived) &&
      !hasPermission(actor, "archiveTask")
    ) {
      return NextResponse.json(
        { error: "Your role cannot archive or restore tasks" },
        { status: 403 },
      );
    }
    if (
      existing.assignee.id !== task.assignee.id &&
      !hasPermission(actor, "assignTasks")
    ) {
      return NextResponse.json(
        { error: "Your role cannot reassign tasks" },
        { status: 403 },
      );
    }
    const projectRows = await sql`
      SELECT name
      FROM projects
      WHERE id = ${task.projectId}
        AND workspace_id = ${workspaceId}
        AND (${task.archived ?? false} OR archived = FALSE)
      LIMIT 1
    `;
    if (!projectRows.length) {
      return NextResponse.json(
        { error: "Target project not found in this workspace" },
        { status: 400 },
      );
    }
    const assigneeRows = await sql`
      SELECT 1
      FROM workspace_members
      WHERE workspace_id = ${workspaceId}
        AND user_id = ${task.assignee.id}
        AND active = TRUE
      LIMIT 1
    `;
    if (!assigneeRows.length) {
      return NextResponse.json(
        { error: "Assignee must be an active workspace member" },
        { status: 400 },
      );
    }

    const rows = await sql`
      UPDATE tasks
      SET
        title = ${task.title.trim()},
        project_id = ${task.projectId},
        project = ${String(projectRows[0].name)},
        group_name = ${task.group},
        status = ${task.status},
        priority = ${task.priority},
        assignee_id = ${task.assignee.id},
        assignee = ${JSON.stringify(task.assignee)}::jsonb,
        due_date = ${task.dueDate}::date,
        tags = ${task.tags},
        progress = ${task.progress},
        description = ${task.description},
        custom_fields = ${JSON.stringify(task.customFields ?? {})}::jsonb,
        archived = ${task.archived ?? false},
        archived_at = ${task.archivedAt ?? null}::timestamptz,
        archived_by = ${
          task.archived ? actor.id : null
        },
        updated_by = ${actor.id},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `;

    if (!rows.length) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    await sql`
      INSERT INTO activity_logs (
        workspace_id, project_id, task_id, actor_id, event_type, payload
      )
      VALUES (
        ${workspaceId}, ${task.projectId}, ${id}, ${actor.id},
        ${task.archived ? "task.archived" : "task.updated"},
        ${JSON.stringify({ title: task.title })}::jsonb
      )
    `;
    return NextResponse.json({ task });
  } catch (error) {
    console.error("Unable to update task", error);
    return NextResponse.json({ error: "Unable to update task" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const sql = getDatabase();
  if (!sql) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  try {
    const { id } = await context.params;
    const auth = await authorize(request, sql, "deleteTask");
    if (auth.response) return auth.response;
    const workspaceId = getWorkspaceId(request);
    const rows = await sql`
      DELETE FROM tasks
      USING projects
      WHERE tasks.id = ${id}
        AND projects.id = tasks.project_id
        AND projects.workspace_id = ${workspaceId}
      RETURNING tasks.id
    `;
    if (!rows.length) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to delete task", error);
    return NextResponse.json({ error: "Unable to delete task" }, { status: 500 });
  }
}
